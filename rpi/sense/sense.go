package sense

import (
	"math"
	"time"

	"periph.io/x/conn/v3/i2c"
	"periph.io/x/conn/v3/i2c/i2creg"
	"periph.io/x/host/v3"
)

// Sensor interface defines the methods for reading orientation data
type Sensor interface {
	Read() (float64, float64, error) // Returns pitch, roll, error
	Close() error
}

// MPU6050 implements the Sensor interface for the MPU6050 accelerometer
type MPU6050 struct {
	dev    *i2c.Dev
	buffer []byte // Reuse buffer to avoid allocations
}

// New creates a new MPU6050 sensor instance and initializes the connection
func New() (Sensor, error) {
	// Initialize periph.io
	if _, err := host.Init(); err != nil {
		return nil, err
	}

	// Open I2C bus
	bus, err := i2creg.Open("")
	if err != nil {
		return nil, err
	}

	// Create I2C device (MPU6050 address 0x68)
	dev := &i2c.Dev{Addr: 0x68, Bus: bus}

	// Wake up the MPU6050 (it starts in sleep mode)
	if err := dev.Tx([]byte{0x6B, 0x00}, nil); err != nil {
		return nil, err
	}

	// Let sensor stabilize
	time.Sleep(100 * time.Millisecond)

	return &MPU6050{
		dev:    dev,
		buffer: make([]byte, 6), // Pre-allocate buffer for readings
	}, nil
}

// Read reads the current orientation data from the sensor
func (m *MPU6050) Read() (float64, float64, error) {
	// Read 6 bytes of accelerometer data starting from register 0x3B
	if err := m.dev.Tx([]byte{0x3B}, m.buffer); err != nil {
		return 0, 0, err
	}

	// Convert raw data to acceleration values (±2g range, 16384 LSB/g)
	accelX := float64(int16(m.buffer[0])<<8|int16(m.buffer[1])) / 16384.0
	accelY := float64(int16(m.buffer[2])<<8|int16(m.buffer[3])) / 16384.0
	accelZ := float64(int16(m.buffer[4])<<8|int16(m.buffer[5])) / 16384.0

	// Calculate pitch and roll in degrees
	pitch := math.Atan2(accelY, math.Sqrt(accelX*accelX+accelZ*accelZ)) * 180.0 / math.Pi
	roll := math.Atan2(-accelX, math.Sqrt(accelY*accelY+accelZ*accelZ)) * 180.0 / math.Pi

	return pitch, roll, nil
}

// Close closes the sensor connection
func (m *MPU6050) Close() error {
	// The periph.io library handles cleanup automatically
	return nil
}
