package main

import (
	"log"
	"net/http"
)

func main() {
	go startSecureServer()
	go startUnsecureServer()
	select {}
}

func startSecureServer() {
	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir("secure"))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fs.ServeHTTP(w, r)
	})

	log.Fatal(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", mux))
}

func startUnsecureServer() {
	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir("unsecure"))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fs.ServeHTTP(w, r)
	})

	log.Fatal(http.ListenAndServe(":8081", mux))
}
