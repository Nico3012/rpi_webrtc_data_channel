package main

import (
	"log"
	"service-worker/cacheserver"
)

func main() {
	// log.Fatalln(cacheserver.StartSecureServer(":8443", "cert.pem", "cert_key.pem", ".", "public"))
	log.Fatalln(cacheserver.StartServer(":8080", ".", "public"))
}
