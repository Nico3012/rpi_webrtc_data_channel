package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"service-worker/routing"
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
			w.Header().Set("Content-Type", "application/javascript")
			w.Header().Set("Service-Worker-Allowed", "/")
			http.ServeFile(w, r, "sw.js")
		case "/api/script.js":
			w.Header().Set("Content-Type", "application/javascript")
			http.ServeFile(w, r, "script.js")
		case "/api/pathnames.json":
			servePathnamesJSON(w)
		case "/api/hash/current.json":
			serveHashJSON(w)
		case "/api/hash/latest.json":
			serveHashJSON(w)
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

func servePathnamesJSON(w http.ResponseWriter) {
	arr, _ := routing.ListRoutes("public", false)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(arr)
}

func serveHashJSON(w http.ResponseWriter) {
	hash, err := routing.HashDirectory(".")
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(fmt.Sprintf("%d", hash))
}
