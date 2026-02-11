package main

import "net/http"

func main() {
	mux := http.NewServeMux()

	fileServer := http.FileServer(http.Dir("public"))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fileServer.ServeHTTP(w, r)
	})

	http.ListenAndServeTLS(":443", "cert.pem", "cert_key.pem", mux)
}
