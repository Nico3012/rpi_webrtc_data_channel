package main

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"rpi-webrtc/sense"
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

	// init sensor
	sensor, err := sense.New()
	if err != nil {
		log.Fatalf("Failed to initialize sensor: %v", err)
	}
	defer sensor.Close()

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

	for {
		if server.IsConnected() {
			pitch, roll, err := sensor.Read()
			if err != nil {
				log.Fatalf("Failed to read sensor: %v", err)
			}

			err = server.SendData(fmt.Sprintf("%.2f;%.2f", pitch, roll))
			if err != nil {
				log.Fatalf("Failed to send data: %v", err)
			}
		}

		time.Sleep(10 * time.Millisecond)
	}
}
