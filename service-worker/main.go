package main

import (
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	mux := http.NewServeMux()
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
