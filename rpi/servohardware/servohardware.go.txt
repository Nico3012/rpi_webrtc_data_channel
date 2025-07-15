package servohardware

import (
	"errors"
	"time"

	"periph.io/x/conn/v3/gpio"
	"periph.io/x/conn/v3/gpio/gpioreg"
	"periph.io/x/conn/v3/physic"
	"periph.io/x/host/v3"
)

var ErrServoNotInitialized = errors.New("servo not initialized")

// ServoController interface defines the methods for controlling a servo
type ServoController interface {
	Write(position float64) error
	Close() error
}

// servo implements the ServoController interface
type servo struct {
	pin           gpio.PinIO
	servoPin      string
	pwmFrequency  physic.Frequency
	minPulseWidth time.Duration
	maxPulseWidth time.Duration
	initialized   bool
}

// New creates a new servo controller with the given parameters
// servoPin: GPIO pin name (e.g., "GPIO18" for hardware PWM)
// pwmFrequency: PWM frequency in Hz (typically 50Hz for servos)
// minPulseWidth: minimum pulse width in microseconds (typically 1000)
// maxPulseWidth: maximum pulse width in microseconds (typically 2000)
func New(servoPin string, pwmFrequency int, minPulseWidth int, maxPulseWidth int) (ServoController, error) {
	// Initialize periph.io host
	if _, err := host.Init(); err != nil {
		return nil, err
	}

	// Get the pin by name
	pin := gpioreg.ByName(servoPin)
	if pin == nil {
		return nil, errors.New("failed to find pin " + servoPin)
	}

	s := &servo{
		pin:           pin,
		servoPin:      servoPin,
		pwmFrequency:  physic.Frequency(pwmFrequency) * physic.Hertz,
		minPulseWidth: time.Duration(minPulseWidth) * time.Microsecond,
		maxPulseWidth: time.Duration(maxPulseWidth) * time.Microsecond,
		initialized:   true,
	}

	// Initialize servo to center position
	if err := s.Write(0.5); err != nil {
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
	pulseWidth := s.minPulseWidth + time.Duration(float64(s.maxPulseWidth-s.minPulseWidth)*position)

	// Calculate duty cycle for hardware PWM
	period := time.Second / time.Duration(s.pwmFrequency/physic.Hertz)
	duty := gpio.Duty(float64(pulseWidth) / float64(period) * float64(gpio.DutyMax))

	// Set PWM on the pin
	if err := s.pin.PWM(duty, s.pwmFrequency); err != nil {
		return err
	}

	return nil
}

// Close closes the servo controller and releases resources
func (s *servo) Close() error {
	if s.initialized {
		s.initialized = false
		// Stop PWM by setting duty cycle to 0
		s.pin.PWM(0, s.pwmFrequency)
	}
	return nil
}
