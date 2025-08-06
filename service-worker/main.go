package main

import (
	"bytes"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"
)

// addCacheControlNoCache is a middleware that adds Cache-Control: no-cache header to every response
func addCacheControlNoCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

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
	mux := http.NewServeMux()

	// replace this with own implementation similar to service worker (maybe)
	mux.Handle("/", addCacheControlNoCache(http.FileServer(http.Dir("public"))))

	// Serve 403 for all other /api/ routes
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "Forbidden", http.StatusForbidden)
	})

	// Serve script.js at /api/files/script.js
	mux.HandleFunc("/api/files/script.js", func(w http.ResponseWriter, r *http.Request) {
		f, err := os.Open("script.js")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()
		w.Header().Set("Content-Type", "application/javascript")
		w.WriteHeader(http.StatusOK)
		io.Copy(w, f)
	})

	// Serve sw.js as a template with PATHNAMES replaced
	mux.HandleFunc("/api/files/sw.js", func(w http.ResponseWriter, r *http.Request) {
		paths, err := getPublicFiles("public")
		if err != nil {
			http.Error(w, "Failed to list public files", http.StatusInternalServerError)
			return
		}

		tmplContent, err := os.ReadFile("sw.js")
		if err != nil {
			http.Error(w, "Service worker not found", http.StatusNotFound)
			return
		}

		// Prepare the list of public files for the template
		var quotedPaths []string
		for _, p := range paths {
			// If the path ends with "/index.html", replace it with "/"
			if strings.HasSuffix(p, "/index.html") {
				p = strings.TrimSuffix(p, "index.html")
			}
			quotedPaths = append(quotedPaths, "'"+p+"'")
		}
		pathnames := strings.Join(quotedPaths, ",\n    ")

		// Read update.html from disk
		updateHtmlBytes, err := os.ReadFile("update.html")
		updateHtml := ""
		if err == nil {
			updateHtml = string(updateHtmlBytes)
			// Escape backticks for JS template literal safety
			updateHtml = strings.ReplaceAll(updateHtml, "`", "\\u0060")
		} else {
			updateHtml = "<!DOCTYPE html><html><body><h1>Update page not found</h1></body></html>"
		}

		tmpl, err := template.New("sw.js").Delims("[[", "]]").Parse(string(tmplContent))
		if err != nil {
			http.Error(w, "Template parse error", http.StatusInternalServerError)
			return
		}

		var buf bytes.Buffer
		err = tmpl.Execute(&buf, map[string]string{
			"Pathnames":  pathnames,
			"UpdateHTML": updateHtml,
		})
		if err != nil {
			http.Error(w, "Template exec error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/javascript")
		w.Header().Set("Service-Worker-Allowed", "/") // because we register it at "/" level but the endpoint isnt the root scope
		w.WriteHeader(http.StatusOK)
		w.Write(buf.Bytes())
	})

	log.Fatalln(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", mux))
}
