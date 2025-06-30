package main

import (
	"log"
	"net/http"
)

// noCacheHandler wraps a handler to add modern cache-busting headers
func noCacheHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent any browser caching - always fetch latest
		w.Header().Set("Cache-Control", "no-store")

		h.ServeHTTP(w, r)
	})
}

func main() {
	log.Println("Starting web server on :8443")
	fileServer := http.FileServer(http.Dir("public"))
	handler := noCacheHandler(fileServer)

	// log.Fatalln(http.ListenAndServe(":8443", handler))
	log.Fatalln(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", handler))
}
