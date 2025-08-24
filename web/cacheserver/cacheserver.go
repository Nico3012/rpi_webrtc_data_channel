package cacheserver

import (
	"embed"
	"encoding/json"
	"fmt"
	"net/http"
	"service-worker/cacheserver/internal/routing"
)

//go:embed script.js sw.js
var apiFS embed.FS

// rootDir is the path to the entire code (backend and frontend), that is used to check for updates
// publicDir is the path to the frontend code, that must be cached and served by the service worker
func StartServer(addr, rootDir, publicDir string) error {
	handler := createNewHandler(rootDir, publicDir)

	return http.ListenAndServe(addr, handler)
}

// rootDir is the path to the entire code (backend and frontend), that is used to check for updates
// publicDir is the path to the frontend code, that must be cached and served by the service worker
func StartSecureServer(addr, certFile, keyFile, rootDir, publicDir string) error {
	handler := createNewHandler(rootDir, publicDir)

	return http.ListenAndServeTLS(addr, certFile, keyFile, handler)
}

func createNewHandler(rootDir, publicDir string) http.Handler {
	mux := http.NewServeMux()

	// Serve static files from publicDir at root with Cache-Control: no-store
	fileServer := http.FileServer(http.Dir(publicDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	// Custom 404 for /api/ (except specific endpoints)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		switch r.URL.Path {
		case "/api/sw.js":
			w.Header().Set("Content-Type", "application/javascript")
			w.Header().Set("Service-Worker-Allowed", "/")
			http.ServeFileFS(w, r, apiFS, "sw.js")
		case "/api/script.js":
			w.Header().Set("Content-Type", "application/javascript")
			http.ServeFileFS(w, r, apiFS, "script.js")
		case "/api/pathnames.json":
			servePathnamesJSON(w, publicDir)
		case "/api/hash/current.json":
			serveHashJSON(w, rootDir)
		case "/api/hash/latest.json":
			serveHashJSON(w, rootDir)
		default:
			http.NotFound(w, r)
		}
	})

	return mux
}

func servePathnamesJSON(w http.ResponseWriter, publicDir string) {
	arr, _ := routing.ListRoutes(publicDir, false)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(arr)
}

func serveHashJSON(w http.ResponseWriter, rootDir string) {
	hash, err := routing.HashDirectory(rootDir)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(fmt.Sprintf("%d", hash))
}
