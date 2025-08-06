package main

import (
	"bytes"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"
)

// getPublicFiles walks the given root directory and returns
// a slice of URL‐style paths ("/foo/bar.js") for all files it finds.
func getPublicFiles(root string) ([]string, error) {
	var files []string

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		// skip directories
		if d.IsDir() {
			return nil
		}
		// make the path relative to the root, and force forward‐slashes
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		files = append(files, "/"+strings.ReplaceAll(rel, string(filepath.Separator), "/"))
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

func main() {
	paths, err := getPublicFiles("public")
	if err != nil {
		log.Fatal(err)
	}

	log.Println(paths)

	mux := http.NewServeMux()

	// Serve sw.js as a template with PATHNAMES replaced
	mux.HandleFunc("/sw.js", func(w http.ResponseWriter, r *http.Request) {
		tmplPath := "sw.js"
		tmplContent, err := os.ReadFile(tmplPath)
		if err != nil {
			http.Error(w, "Service worker not found", http.StatusNotFound)
			return
		}

		// Prepare the list of public files for the template
		var quotedPaths []string
		for _, p := range paths {
			quotedPaths = append(quotedPaths, "'"+p+"'")
		}
		pathnames := strings.Join(quotedPaths, ",\n    ")

		tmpl, err := template.New("sw.js").Delims("[[", "]]").Parse(string(tmplContent))
		if err != nil {
			http.Error(w, "Template parse error", http.StatusInternalServerError)
			return
		}

		var buf bytes.Buffer
		err = tmpl.Execute(&buf, map[string]string{"Pathnames": pathnames})
		if err != nil {
			http.Error(w, "Template exec error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/javascript")
		w.WriteHeader(http.StatusOK)
		w.Write(buf.Bytes())
	})
	// Use a catch-all path variable to allow slashes in pathname
	mux.HandleFunc("/api/cache/{pathname...}", func(w http.ResponseWriter, r *http.Request) {
		pathname := r.PathValue("pathname")
		if pathname == "" {
			http.Error(w, "Missing file path", http.StatusBadRequest)
			return
		}
		// Prevent directory traversal
		if strings.Contains(pathname, "..") {
			http.Error(w, "Invalid path", http.StatusBadRequest)
			return
		}
		// Build the file path
		filePath := filepath.Join("public", filepath.FromSlash(pathname))
		// Open the file
		f, err := os.Open(filePath)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()
		// Check if it's a directory
		stat, err := f.Stat()
		if err != nil || stat.IsDir() {
			http.NotFound(w, r)
			return
		}
		// Detect mime type
		mimeType := mime.TypeByExtension(filepath.Ext(filePath))
		if mimeType == "" {
			// Fallback: try to sniff from content
			buf := make([]byte, 512)
			n, _ := f.Read(buf)
			mimeType = http.DetectContentType(buf[:n])
			f.Seek(0, io.SeekStart)
		}
		w.Header().Set("Content-Type", mimeType)
		w.WriteHeader(http.StatusOK)
		io.Copy(w, f)
	})

	http.ListenAndServe(":8080", mux)
}
