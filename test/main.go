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
	log.Fatal(http.ListenAndServeTLS(":8443", "cert.pem", "cert_key.pem", http.FileServer(http.Dir("secure"))))
}

func startUnsecureServer() {
	log.Fatal(http.ListenAndServe(":8081", http.FileServer(http.Dir("unsecure"))))
}
