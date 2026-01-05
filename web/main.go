package main

import (
	"log"
	"os"

	"github.com/Nico3012/rpi_webrtc_data_channel/web/internal/cacheserver"
)

func main() {
	if os.Getenv("PRODUCTION_MODE") == "1" {
		log.Fatalln(cacheserver.StartServer(":80", ".", "public"))
	} else {
		log.Fatalln(cacheserver.StartSecureServer(":8443", "cert.pem", "cert_key.pem", ".", "public"))
	}
}
