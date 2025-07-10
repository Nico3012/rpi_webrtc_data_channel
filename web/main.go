package main

import (
	"log"
	"net/http"
)

// addCacheControlNoCache is a middleware that adds Cache-Control: no-cache header to every response
func addCacheControlNoCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func main() {
	log.Println("Starting web server on :8443")
	fileServer := http.FileServer(http.Dir("public"))

	// Wrap the file server with our cache control middleware
	handler := addCacheControlNoCache(fileServer)

	log.Fatalln(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", handler))
}
