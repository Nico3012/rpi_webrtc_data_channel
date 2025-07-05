package main

import (
	"fmt"
	"log"
	"time"

	"rpi-webrtc/webrtcserver"
)

func main() {
	// init web connection
	server := webrtcserver.New("8080", "webrtcserver/public")

	// web message callback
	server.InitReadDataCallback(func(message string) {
		log.Printf("Nico msg: %s\n", message)
	})

	i := 0

	for {
		err := server.SendData(fmt.Sprintf("%d;%d", i, i*i))
		if err != nil {
			log.Println(err)
		}

		i++

		time.Sleep(2000 * time.Millisecond)
	}
}
