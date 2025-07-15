package main

import (
	"fmt"
	"log"
	"rpi-webrtc/serialcomm"
	"time"
)

func main() {
	// init web connection with both video and audio enabled
	// server := webrtcserver.New("8080", "webrtcserver/public", true, true)

	// // web message callback
	// server.InitReadDataCallback(func(message string) {
	// 	log.Printf("Received message: %s\n", message)

	// 	// You could handle specific commands here
	// 	// For example, if message == "video:off" { server.EnableVideo(false) }
	// })

	// i := 0

	// for {
	// 	// Send some data to the client periodically
	// 	if server.IsConnected() {
	// 		err := server.SendData(fmt.Sprintf("%d;%d", i, i*i))
	// 		if err != nil {
	// 			log.Println(err)
	// 		}
	// 		i++
	// 	}

	// 	time.Sleep(2000 * time.Millisecond)
	// }

	port, err := serialcomm.NewAuto(9600)
	if err != nil {
		log.Fatal(err)
	}

	port.InitDataCallback(func(s string) {
		log.Printf("Received from arduino: %s\n", s)
	})

	i := 0

	for {
		port.SendData(fmt.Sprintf("%d", i))

		i++

		time.Sleep(2000 * time.Millisecond)
	}
}
