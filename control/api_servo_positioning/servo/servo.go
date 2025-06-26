package servo

import (
	"errors"

	"github.com/stianeikeland/go-rpio/v4"
)

var ErrServoNotInitialized = errors.New("servo not initialized")

// ServoController interface defines the methods for controlling a servo
type ServoController interface {
	Write(position float64) error
	Close() error
}

// servo implements the ServoController interface
type servo struct {
	pin           rpio.Pin
	servoPin      uint8
	pwmFrequency  int
	minPulseWidth int
	maxPulseWidth int
	initialized   bool
}

// New creates a new servo controller with the given parameters
func New(servoPin uint8, pwmFrequency int, minPulseWidth int, maxPulseWidth int) (ServoController, error) {
	// Open and map memory to access gpio
	if err := rpio.Open(); err != nil {
		return nil, err
	}

	// Set up the servo pin
	pin := rpio.Pin(servoPin)
	pin.Output()
	pin.Mode(rpio.Pwm)
	pin.Freq(pwmFrequency * 1024)

	s := &servo{
		pin:           pin,
		servoPin:      servoPin,
		pwmFrequency:  pwmFrequency,
		minPulseWidth: minPulseWidth,
		maxPulseWidth: maxPulseWidth,
		initialized:   true,
	}

	// Initialize servo to center position
	if err := s.Write(0.5); err != nil {
		rpio.Close()
		return nil, err
	}

	return s, nil
}

// Write sets the servo position (0.0 to 1.0)
func (s *servo) Write(position float64) error {
	if !s.initialized {
		return ErrServoNotInitialized
	}

	// Clamp position between 0.0 and 1.0
	if position < 0.0 {
		position = 0.0
	} else if position > 1.0 {
		position = 1.0
	}

	// Calculate pulse width based on position
	pulseWidth := float64(s.minPulseWidth) + position*(float64(s.maxPulseWidth)-float64(s.minPulseWidth))

	pwmPeriodMicros := (1.0 / float64(s.pwmFrequency)) * 1000000.0
	dutyCycle := uint32((pulseWidth / pwmPeriodMicros) * 1024)

	// Set PWM duty cycle
	s.pin.DutyCycle(dutyCycle, 1024)

	return nil
}

// Close closes the servo controller and releases resources
func (s *servo) Close() error {
	if s.initialized {
		s.initialized = false
		rpio.Close()
	}
	return nil
}
