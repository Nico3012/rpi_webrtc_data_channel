package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("Starting web server on :8443")
	// log.Fatalln(http.ListenAndServe(":8443", http.FileServer(http.Dir("public"))))
	log.Fatalln(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", http.FileServer(http.Dir("public"))))
}
