package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin connected to the servo signal wire (change this to your actual pin)
	ServoPin = 18

	// PWM constants for 9g servo
	PWMFrequency  = 50   // 50Hz (20ms period)
	MinPulseWidth = 500  // 1ms in microseconds (minimum position) | 1000 beim Racecopter Flightcontroller | 500 beim Elegoo Servo 9g
	MaxPulseWidth = 2500 // 2ms in microseconds (maximum position) | 2000 beim Racecopter Flightcontroller | 2500 beim Elegoo Servo 9g
)

func setServoPosition(pin rpio.Pin, position float64) {
	// Clamp position between 0.0 and 1.0
	if position < 0.0 {
		position = 0.0
	} else if position > 1.0 {
		position = 1.0
	}

	// Calculate pulse width based on position
	pulseWidth := float64(MinPulseWidth) + position*(float64(MaxPulseWidth)-float64(MinPulseWidth))

	pwmPeriodMicros := (1.0 / float64(PWMFrequency)) * 1000000.0
	dutyCycle := uint32((pulseWidth / pwmPeriodMicros) * 1024)

	// Set PWM duty cycle
	pin.DutyCycle(dutyCycle, 1024)
}

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

	// Initialize servo to center position
	setServoPosition(pin, 0.5)

	fmt.Println("Servo control program started.")
	fmt.Println("Enter position values between 0.0 (min) and 1.0 (max).")
	fmt.Println("Type 'quit' or 'exit' to stop the program.")

	scanner := bufio.NewScanner(os.Stdin)

	for {
		fmt.Print("Enter position: ")

		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())

		// Check for exit commands
		if strings.ToLower(input) == "quit" || strings.ToLower(input) == "exit" {
			fmt.Println("Exiting servo control program.")
			break
		}

		// Parse position value
		position, err := strconv.ParseFloat(input, 64)
		if err != nil {
			fmt.Printf("Invalid input '%s'. Please enter a number between 0.0 and 1.0.\n", input)
			continue
		}

		// Validate position range
		if position < 0.0 || position > 1.0 {
			fmt.Printf("Position %.2f is out of range. Please enter a value between 0.0 and 1.0.\n", position)
			continue
		}

		// Set servo position
		setServoPosition(pin, position)
		fmt.Printf("Servo position set to %.2f\n", position)
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Error reading input: %v", err)
	}
}
