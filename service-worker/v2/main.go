package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"service-worker/routing"
	"time"
)

func main() {
	mux := http.NewServeMux()

	// Serve static files from "public" at root with Cache-Control: no-store
	fileServer := http.FileServer(http.Dir("public"))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	// Custom 404 for /api/ (except specific endpoints)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		switch r.URL.Path {
		case "/api/sw.js":
			serveFile(w, "sw.js", "application/javascript")
		case "/api/script.js":
			serveFile(w, "script.js", "application/javascript")
		case "/api/pathnames.json":
			servePathnamesJSON(w)
		default:
			http.NotFound(w, r)
		}
	})

	log.Println("Serving on :8443")
	err := http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", mux)
	if err != nil {
		log.Fatal(err)
	}
}

func serveFile(w http.ResponseWriter, path string, contentType string) {
	f, err := os.Open(path)
	if err != nil {
		http.NotFound(w, nil)
		return
	}
	defer f.Close()
	info, err := f.Stat()
	var modTime time.Time
	if err == nil {
		modTime = info.ModTime()
	}
	w.Header().Set("Content-Type", contentType)
	http.ServeContent(w, nil, filepath.Base(path), modTime, f)
}

func servePathnamesJSON(w http.ResponseWriter) {
	arr, _ := routing.ListRoutes("public", false)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(arr)
}
