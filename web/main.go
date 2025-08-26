package main

import (
	"log"

	"github.com/Nico3012/rpi_webrtc_data_channel/web/internal/cacheserver"
)

func main() {
	log.Fatalln(cacheserver.StartSecureServer(":8443", "cert.pem", "cert_key.pem", ".", "public"))
	// log.Fatalln(cacheserver.StartServer(":8080", ".", "public"))
}
