package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
)

//go:embed public
var embedFS embed.FS // embed all static files into the binary

func main() {
	mux := http.NewServeMux()

	// Serve static files from embedded `public` directory
	publicFS, err := fs.Sub(embedFS, "public")
	if err != nil {
		log.Fatalln("failed to create sub from filesystem with public directory")
	}

	fileServer := http.FileServerFS(publicFS)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	log.Fatalln(http.ListenAndServe(":80", mux))
}
