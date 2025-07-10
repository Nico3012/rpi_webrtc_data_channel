package main

import (
	"fmt"
	"log"
	"time"

	"rpi-webrtc/webrtcvideoserver"
)

func main() {
	// init web connection
	server := webrtcvideoserver.New("8080", "webrtcvideoserver/public")

	// Enable video streaming
	server.EnableVideo(true)

	// web message callback
	server.InitReadDataCallback(func(message string) {
		log.Printf("Received message: %s\n", message)

		// You could handle specific commands here
		// For example, if message == "video:off" { server.EnableVideo(false) }
	})

	i := 0

	for {
		// Send some data to the client periodically
		if server.IsConnected() {
			err := server.SendData(fmt.Sprintf("%d;%d", i, i*i))
			if err != nil {
				log.Println(err)
			}
			i++
		}

		time.Sleep(2000 * time.Millisecond)
	}
}
