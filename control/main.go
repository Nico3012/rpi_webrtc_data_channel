package main

import (
	"log"

	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin connected to the servo signal wire (change this to your actual pin)
	ServoPin = 18

	// PWM constants for 9g servo
	PWMFrequency  = 50   // 50Hz (20ms period)
	MinPulseWidth = 500  // 1ms in microseconds (minimum position) | 1000 beim Racecopter Flightcontroller | 500 beim Elegoo Servo 9g
	MaxPulseWidth = 2500 // 2ms in microseconds (maximum position) | 2000 beim Racecopter Flightcontroller | 2500 beim Elegoo Servo 9g

	// Servo position (0.0 = min, 1.0 = max)
	Position = 0.5
)

func main() {
	// Open and map memory to access gpio
	if err := rpio.Open(); err != nil {
		log.Fatalf("Failed to open rpio: %v", err)
	}
	defer rpio.Close()

	// Set up the servo pin
	pin := rpio.Pin(ServoPin)
	pin.Output()
	pin.Mode(rpio.Pwm)
	pin.Freq(PWMFrequency * 1024)

	// Calculate pulse width based on position
	pulseWidth := MinPulseWidth + Position*(MaxPulseWidth-MinPulseWidth)

	pwmPeriodMicros := (1.0 / float64(PWMFrequency)) * 1000000.0
	dutyCycle := uint32((pulseWidth / pwmPeriodMicros) * 1024)

	// Set PWM duty cycle
	pin.DutyCycle(dutyCycle, 1024)
}
