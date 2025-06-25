package main

import (
	"fmt"
	"log"
	"time"

	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin 18 (same as Python example)
	servoPin = 18

	// PWM parameters matching the Python example
	minPulseWidth = 600 * time.Microsecond  // 0.0006 seconds
	maxPulseWidth = 2300 * time.Microsecond // 0.0023 seconds

	// Standard servo PWM frequency
	pwmFrequency = 50 // 50Hz = 20ms period
	pwmPeriod    = time.Second / pwmFrequency
)

type AngularServo struct {
	pin           rpio.Pin
	minPulseWidth time.Duration
	maxPulseWidth time.Duration
}

func NewAngularServo(pinNum int, minPulse, maxPulse time.Duration) (*AngularServo, error) {
	// Open GPIO memory for access
	if err := rpio.Open(); err != nil {
		return nil, fmt.Errorf("failed to open GPIO: %v", err)
	}

	// Create pin
	pin := rpio.Pin(pinNum)

	// Set pin as output
	pin.Output()

	return &AngularServo{
		pin:           pin,
		minPulseWidth: minPulse,
		maxPulseWidth: maxPulse,
	}, nil
}

func (s *AngularServo) SetAngle(angle float64) error {
	// Clamp angle to -90 to 90 degrees
	if angle < -90 {
		angle = -90
	} else if angle > 90 {
		angle = 90
	}

	// Convert angle to pulse width
	// -90° = minPulseWidth, 90° = maxPulseWidth
	angleRatio := (angle + 90) / 180 // Convert to 0-1 range
	pulseWidth := s.minPulseWidth + time.Duration(float64(s.maxPulseWidth-s.minPulseWidth)*angleRatio)

	// Generate PWM signal
	// For simplicity, we'll generate a few PWM cycles
	for i := 0; i < 10; i++ {
		// Set pin high for pulse duration
		s.pin.High()
		time.Sleep(pulseWidth)

		// Set pin low for remainder of period
		s.pin.Low()
		time.Sleep(pwmPeriod - pulseWidth)
	}

	return nil
}

func (s *AngularServo) Close() {
	rpio.Close()
}

func main() {
	fmt.Println("Starting servo control program...")

	// Create servo instance
	servo, err := NewAngularServo(servoPin, minPulseWidth, maxPulseWidth)
	if err != nil {
		log.Fatalf("Failed to create servo: %v", err)
	}
	defer servo.Close()

	fmt.Println("Servo initialized. Starting movement cycle...")

	// Main control loop (equivalent to Python while True)
	for {
		fmt.Println("Moving to 90 degrees")
		if err := servo.SetAngle(90); err != nil {
			log.Printf("Error setting angle to 90: %v", err)
		}
		time.Sleep(2 * time.Second)

		fmt.Println("Moving to 0 degrees")
		if err := servo.SetAngle(0); err != nil {
			log.Printf("Error setting angle to 0: %v", err)
		}
		time.Sleep(2 * time.Second)

		fmt.Println("Moving to -90 degrees")
		if err := servo.SetAngle(-90); err != nil {
			log.Printf("Error setting angle to -90: %v", err)
		}
		time.Sleep(2 * time.Second)
	}
}
