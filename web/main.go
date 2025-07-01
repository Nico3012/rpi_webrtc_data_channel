package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("Starting web server on :8443")
	fileServer := http.FileServer(http.Dir("public"))

	log.Fatalln(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", fileServer))
}
