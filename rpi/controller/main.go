package main

// set LIST_PORTS=true

// set VID=2341 # can also be empty, then output is logged to console
// set PID=0069 # can also be empty, then output is logged to console
// set VIDEO_MODE=windows-privat # can also be empty, then dummy video is used
// set AUDIO_MODE=windows-privat # can also be empty, then dummy audio is used

import (
	"fmt"
	"log"
	"os"

	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/controller/internal/serialcomm"
	"github.com/Nico3012/rpi_webrtc_data_channel/rpi/controller/internal/webrtcserver"
)

func main() {
	if os.Getenv("LIST_PORTS") == "true" {
		ports, err := serialcomm.GetPorts()
		if err != nil {
			log.Fatalf("Error getting ports: %v", err)
		}
		fmt.Println("Available serial ports:")
		for _, port := range ports {
			fmt.Printf("Name: %s, VID: %s, PID: %s, Product: %s, Serial: %s, IsUSB: %t\n",
				port.Name, port.VID, port.PID, port.Product, port.SerialNumber, port.IsUSB)
		}
		return
	}

	server := webrtcserver.New("8080", true, true)

	vid := os.Getenv("VID")
	pid := os.Getenv("PID")
	if vid != "" && pid != "" {
		port, err := serialcomm.NewByVIDPID(vid, pid, 9600)
		if err != nil {
			log.Fatalf("Error opening serial port: %v", err)
		}
		defer port.Close()

		// Route messages from server to serial port
		server.OnMessage(func(msg string) {
			err := port.SendData(msg)
			if err != nil {
				log.Printf("Error sending to serial: %v", err)
			}
		})

		// Route messages from serial port to server
		port.SetDataCallback(func(msg string) {
			err := server.SendData(msg)
			if err != nil {
				log.Printf("Error sending to server: %v", err)
			}
		})
	}

	select {}
}
