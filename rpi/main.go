package main

import (
	"log"
	"strconv"

	"rpi-webrtc/servo"
	"rpi-webrtc/webrtcserver"
)

func main() {
	// init web connection
	server := webrtcserver.New("8080", "webrtcserver/public")

	// init servo
	servoController, err := servo.New(18, 50, 500, 2500)
	if err != nil {
		log.Fatalf("Failed to initialize servo: %v", err)
	}
	defer servoController.Close()

	// web message callback
	server.InitReadDataCallback(func(message string) {
		position, err := strconv.ParseFloat(message, 64)
		if err != nil {
			log.Fatalf("Failed to parse float: %v", err)
		}

		err = servoController.Write(position)
		if err != nil {
			log.Fatalf("Failed to write servo position: %v", err)
		}
	})

	// Keep the main function running
	select {}
}
