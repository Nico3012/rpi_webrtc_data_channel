package main

import (
	"fmt"
	"time"

	"rpi-webrtc/webrtcserver"
)

func main() {
	// Create a new WebRTC server instance on port 8080 with public directory
	server := webrtcserver.New("8080", "public")

	// Set up a callback function to handle incoming messages
	server.InitReadDataCallback(func(message string) {
		fmt.Printf("📨 Received from web client: %s\n", message)

		// Echo the message back with a prefix
		response := fmt.Sprintf("Echo: %s", message)
		if err := server.SendData(response); err != nil {
			fmt.Printf("❌ Error sending response: %v\n", err)
		}
	})

	// Start a goroutine to send periodic data
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		counter := 0
		for range ticker.C {
			if server.IsConnected() {
				counter++
				message := fmt.Sprintf("🥧 RPI periodic message #%d - %s", counter, time.Now().Format("15:04:05"))
				if err := server.SendData(message); err != nil {
					fmt.Printf("❌ Error sending periodic message: %v\n", err)
				}
			}
		}
	}()

	// Start the server (this blocks until the server stops)
	fmt.Println("🚀 WebRTC Server started...")

	// Keep the main function running
	select {}
}
