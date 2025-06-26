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

const (
	// MPU6050 I2C address
	MPU6050_ADDR = 0x68

	// MPU6050 register addresses
	PWR_MGMT_1   = 0x6B
	ACCEL_XOUT_H = 0x3B
	ACCEL_XOUT_L = 0x3C
	ACCEL_YOUT_H = 0x3D
	ACCEL_YOUT_L = 0x3E
	ACCEL_ZOUT_H = 0x3F
	ACCEL_ZOUT_L = 0x40
	GYRO_XOUT_H  = 0x43
	GYRO_XOUT_L  = 0x44
	GYRO_YOUT_H  = 0x45
	GYRO_YOUT_L  = 0x46
	GYRO_ZOUT_H  = 0x47
	GYRO_ZOUT_L  = 0x48

	// Sensitivity scale factors
	ACCEL_SCALE = 16384.0 // for ±2g range
	GYRO_SCALE  = 131.0   // for ±250°/s range
)

type MPU6050 struct {
	dev *i2c.Dev
}

type SensorData struct {
	AccelX, AccelY, AccelZ float64
	GyroX, GyroY, GyroZ    float64
	Pitch, Roll            float64
}

func NewMPU6050() (*MPU6050, error) {
	// Initialize periph.io
	if _, err := host.Init(); err != nil {
		return nil, fmt.Errorf("failed to initialize periph.io: %v", err)
	}

	// Open I2C bus
	bus, err := i2creg.Open("")
	if err != nil {
		return nil, fmt.Errorf("failed to open I2C bus: %v", err)
	}

	// Create I2C device
	dev := &i2c.Dev{Addr: MPU6050_ADDR, Bus: bus}

	mpu := &MPU6050{dev: dev}

	// Initialize the MPU6050
	err = mpu.initialize()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MPU6050: %v", err)
	}

	return mpu, nil
}

func (mpu *MPU6050) initialize() error {
	// Wake up the MPU6050 (it starts in sleep mode)
	err := mpu.writeRegister(PWR_MGMT_1, 0x00)
	if err != nil {
		return fmt.Errorf("failed to wake up MPU6050: %v", err)
	}

	// Small delay to let the sensor stabilize
	time.Sleep(100 * time.Millisecond)

	return nil
}

func (mpu *MPU6050) writeRegister(reg, value byte) error {
	data := []byte{reg, value}
	return mpu.dev.Tx(data, nil)
}

func (mpu *MPU6050) readRegister(reg byte) (byte, error) {
	// Write register address, then read data
	data := make([]byte, 1)
	err := mpu.dev.Tx([]byte{reg}, data)
	if err != nil {
		return 0, err
	}
	return data[0], nil
}

func (mpu *MPU6050) readWord(reg byte) (int16, error) {
	// Read 2 bytes starting from the register
	data := make([]byte, 2)
	err := mpu.dev.Tx([]byte{reg}, data)
	if err != nil {
		return 0, err
	}

	// Combine high and low bytes (MPU6050 uses big-endian)
	value := int16(data[0])<<8 | int16(data[1])
	return value, nil
}

func (mpu *MPU6050) ReadSensorData() (*SensorData, error) {
	// Read accelerometer data
	accelX, err := mpu.readWord(ACCEL_XOUT_H)
	if err != nil {
		return nil, fmt.Errorf("failed to read accel X: %v", err)
	}

	accelY, err := mpu.readWord(ACCEL_YOUT_H)
	if err != nil {
		return nil, fmt.Errorf("failed to read accel Y: %v", err)
	}

	accelZ, err := mpu.readWord(ACCEL_ZOUT_H)
	if err != nil {
		return nil, fmt.Errorf("failed to read accel Z: %v", err)
	}

	// Read gyroscope data
	gyroX, err := mpu.readWord(GYRO_XOUT_H)
	if err != nil {
		return nil, fmt.Errorf("failed to read gyro X: %v", err)
	}

	gyroY, err := mpu.readWord(GYRO_YOUT_H)
	if err != nil {
		return nil, fmt.Errorf("failed to read gyro Y: %v", err)
	}

	gyroZ, err := mpu.readWord(GYRO_ZOUT_H)
	if err != nil {
		return nil, fmt.Errorf("failed to read gyro Z: %v", err)
	}

	// Convert to g and degrees/second
	accelXG := float64(accelX) / ACCEL_SCALE
	accelYG := float64(accelY) / ACCEL_SCALE
	accelZG := float64(accelZ) / ACCEL_SCALE

	gyroXDPS := float64(gyroX) / GYRO_SCALE
	gyroYDPS := float64(gyroY) / GYRO_SCALE
	gyroZDPS := float64(gyroZ) / GYRO_SCALE

	// Calculate pitch and roll from accelerometer data
	pitch := math.Atan2(accelYG, math.Sqrt(accelXG*accelXG+accelZG*accelZG)) * 180.0 / math.Pi
	roll := math.Atan2(-accelXG, math.Sqrt(accelYG*accelYG+accelZG*accelZG)) * 180.0 / math.Pi

	return &SensorData{
		AccelX: accelXG,
		AccelY: accelYG,
		AccelZ: accelZG,
		GyroX:  gyroXDPS,
		GyroY:  gyroYDPS,
		GyroZ:  gyroZDPS,
		Pitch:  pitch,
		Roll:   roll,
	}, nil
}

func main() {
	fmt.Println("Starting MPU6050 sensor reading...")

	// Initialize the MPU6050
	mpu, err := NewMPU6050()
	if err != nil {
		log.Fatalf("Failed to initialize MPU6050: %v", err)
	}

	fmt.Println("MPU6050 initialized successfully!")
	fmt.Println("Reading pitch and roll angles... (Press Ctrl+C to stop)")

	// Continuously read sensor data
	for {
		data, err := mpu.ReadSensorData()
		if err != nil {
			log.Printf("Error reading sensor data: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		// Print the data
		fmt.Printf("\r")
		fmt.Printf("Pitch: %6.2f°  Roll: %6.2f°  ", data.Pitch, data.Roll)
		fmt.Printf("Accel: X=%6.3fg Y=%6.3fg Z=%6.3fg  ", data.AccelX, data.AccelY, data.AccelZ)
		fmt.Printf("Gyro: X=%7.2f°/s Y=%7.2f°/s Z=%7.2f°/s", data.GyroX, data.GyroY, data.GyroZ)

		time.Sleep(100 * time.Millisecond) // 10 Hz update rate
	}
}
