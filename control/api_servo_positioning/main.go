package main

import (
	"log"
	"time"

	"control/servo"
)

func main() {
	// Create new servo controller
	servoController, err := servo.New(18, 50, 500, 2500)
	if err != nil {
		log.Fatalf("Failed to initialize servo: %v", err)
	}
	defer servoController.Close()

	// Move from 0.0 to 1.0 in 0.1 steps
	for position := 0.0; position <= 1.0; position += 0.1 {
		if err := servoController.Write(position); err != nil {
			log.Printf("Error setting position %.1f: %v", position, err)
			continue
		}
		time.Sleep(1 * time.Second)
	}

	time.Sleep(2 * time.Second)

	// Move from 1.0 to 0.0 in 0.1 steps
	for position := 1.0; position >= 0.0; position -= 0.1 {
		if err := servoController.Write(position); err != nil {
			log.Printf("Error setting position %.1f: %v", position, err)
			continue
		}
		time.Sleep(1 * time.Second)
	}
}
