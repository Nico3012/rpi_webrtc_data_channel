# GY-512 (MPU6050) Pitch and Roll Reader for Raspberry Pi 4B

This Go program reads pitch and roll angles from a GY-512 module (based on MPU6050 accelerometer/gyroscope) using I2C communication on a Raspberry Pi 4B.

## Hardware Requirements

- Raspberry Pi 4B
- GY-512 module (MPU6050-based accelerometer/gyroscope)
- Jumper wires for connections

## Wiring Instructions

Connect the GY-512 module to your Raspberry Pi 4B as follows:

| GY-512 Pin | Raspberry Pi 4B Pin | Description |
|------------|---------------------|-------------|
| VCC        | Pin 1 (3.3V) or Pin 2 (5V) | Power supply (recommend 3.3V) |
| GND        | Pin 6 (Ground)      | Ground connection |
| SCL        | Pin 5 (GPIO 3)      | I2C Clock line |
| SDA        | Pin 3 (GPIO 2)      | I2C Data line |
| XDA        | Not connected       | Auxiliary I2C data (optional) |
| XCL        | Not connected       | Auxiliary I2C clock (optional) |
| AD0        | GND                 | I2C address select (connect to GND for 0x68) |
| INT        | Not connected       | Interrupt pin (optional) |

### Pin Layout Reference

```
Raspberry Pi 4B GPIO Pins (looking at the board from above):
    3.3V  [1]  [2]  5V
SDA/GPIO2 [3]  [4]  5V
SCL/GPIO3 [5]  [6]  GND
    GPIO4 [7]  [8]  GPIO14 (TXD)
      GND [9]  [10] GPIO15 (RXD)
...
```

## Software Setup

### Prerequisites

1. **Enable I2C on Raspberry Pi:**
   ```bash
   sudo raspi-config
   ```
   Navigate to: `Interfacing Options` → `I2C` → `Yes`

2. **Install I2C tools (optional, for testing):**
   ```bash
   sudo apt-get update
   sudo apt-get install i2c-tools
   ```

3. **Test I2C connection:**
   ```bash
   sudo i2cdetect -y 1
   ```
   You should see address 0x68 if the GY-512 is connected properly.

### Building and Running

1. **Build the program:**
   ```bash
   go build -o mpu6050-reader main.go
   ```

2. **Run the program:**
   ```bash
   sudo ./mpu6050-reader
   ```
   
   **Note:** The program requires root privileges to access I2C hardware.

## Program Features

- Reads raw accelerometer and gyroscope data from MPU6050
- Calculates pitch and roll angles from accelerometer data
- Displays real-time data including:
  - Pitch angle (degrees)
  - Roll angle (degrees)
  - Accelerometer values (X, Y, Z in g)
  - Gyroscope values (X, Y, Z in degrees/second)
- Updates at 10 Hz (10 times per second)

## Understanding the Output

- **Pitch**: Rotation around the X-axis (forward/backward tilt)
- **Roll**: Rotation around the Y-axis (left/right tilt)
- **Accelerometer**: Measures gravitational acceleration (±2g range)
- **Gyroscope**: Measures angular velocity (±250°/s range)

## Troubleshooting

1. **"Permission denied" error:**
   - Run with `sudo` to access I2C hardware

2. **"Failed to open I2C bus" error:**
   - Ensure I2C is enabled via `raspi-config`
   - Check wiring connections
   - Verify the module is working with `sudo i2cdetect -y 1`

3. **No device detected at 0x68:**
   - Check all wiring connections
   - Ensure GY-512 module has power (LED should be on)
   - Try connecting AD0 to 3.3V (changes address to 0x69)

4. **Erratic readings:**
   - Ensure stable power supply
   - Check for loose connections
   - Place the sensor on a stable surface during initialization

## Technical Details

- **I2C Bus**: Uses I2C bus 1 (GPIO 2 & 3)
- **Device Address**: 0x68 (when AD0 is connected to GND)
- **Accelerometer Scale**: ±2g (16384 LSB/g)
- **Gyroscope Scale**: ±250°/s (131 LSB/°/s)
- **Update Rate**: 100ms (10 Hz)

## License

This project is open source. Feel free to modify and use as needed.
