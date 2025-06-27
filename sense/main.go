package main

import (
	"fmt"
	"log"
	"math"
	"time"

	"periph.io/x/conn/v3/i2c"
	"periph.io/x/conn/v3/i2c/i2creg"
	"periph.io/x/host/v3"
)

func main() {
	// Initialize periph.io
	if _, err := host.Init(); err != nil {
		log.Fatalf("Failed to initialize periph.io: %v", err)
	}

	// Open I2C bus
	bus, err := i2creg.Open("")
	if err != nil {
		log.Fatalf("Failed to open I2C bus: %v", err)
	}

	// Create I2C device (MPU6050 address 0x68)
	dev := &i2c.Dev{Addr: 0x68, Bus: bus}

	// Wake up the MPU6050 (it starts in sleep mode)
	if err := dev.Tx([]byte{0x6B, 0x00}, nil); err != nil {
		log.Fatalf("Failed to wake up MPU6050: %v", err)
	}

	time.Sleep(100 * time.Millisecond) // Let sensor stabilize

	// Take two measurements with 1 second delay
	for i := 0; i < 2; i++ {
		// Read 6 bytes of accelerometer data starting from register 0x3B
		data := make([]byte, 6)
		if err := dev.Tx([]byte{0x3B}, data); err != nil {
			log.Fatalf("Failed to read accelerometer: %v", err)
		}

		// Convert raw data to acceleration values (±2g range, 16384 LSB/g)
		accelX := float64(int16(data[0])<<8|int16(data[1])) / 16384.0
		accelY := float64(int16(data[2])<<8|int16(data[3])) / 16384.0
		accelZ := float64(int16(data[4])<<8|int16(data[5])) / 16384.0

		// Calculate pitch and roll in degrees
		pitch := math.Atan2(accelY, math.Sqrt(accelX*accelX+accelZ*accelZ)) * 180.0 / math.Pi
		roll := math.Atan2(-accelX, math.Sqrt(accelY*accelY+accelZ*accelZ)) * 180.0 / math.Pi

		fmt.Printf("Measurement %d - Pitch: %6.2f°, Roll: %6.2f°\n", i+1, pitch, roll)

		// Wait 1 second before next measurement (skip for last measurement)
		if i < 1 {
			time.Sleep(1 * time.Second)
		}
	}
}
