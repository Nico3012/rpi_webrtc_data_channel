#include "Arduino.h"

// Simple Servo/ESC PWM Demo for Arduino R4 Minima
// Demonstrates precise PWM control with smooth sweep from 0% to 100%

// Servo control pin
const uint8_t SERVO_PIN = 9;

// PWM frequency configuration
const uint16_t PWM_FREQUENCY_HZ = 200;  // Configurable frequency (typically 50Hz for servos)
const uint32_t PWM_PERIOD_US = 1000000UL / PWM_FREQUENCY_HZ;  // Period in microseconds

// Servo timing constants (microseconds)
const uint16_t SERVO_MIN_PULSE = 1000;  // 0% position (0.5ms)
const uint16_t SERVO_MAX_PULSE = 2000;  // 100% position (2.5ms)

// Current servo position (0-100%)
uint8_t servoPosition = 0;
bool sweepUp = true;

// Function to convert position percentage to pulse width
uint16_t positionToPulseWidth(uint8_t position_percent) {
  return SERVO_MIN_PULSE + ((SERVO_MAX_PULSE - SERVO_MIN_PULSE) * position_percent) / 100;
}

// Function to send PWM signal to servo
void setServoPosition(uint8_t pin, uint8_t position_percent) {
  uint16_t pulse_width = positionToPulseWidth(position_percent);
  
  // Generate PWM signal: HIGH for pulse_width, then LOW
  digitalWrite(pin, HIGH);
  delayMicroseconds(pulse_width);
  digitalWrite(pin, LOW);
}

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  while (!Serial);
  Serial.println("Simple Servo PWM Demo - Arduino R4 Minima");
  Serial.println("Sweeping servo from 0% to 100% and back");
  
  // Set servo pin as output
  pinMode(SERVO_PIN, OUTPUT);
  digitalWrite(SERVO_PIN, LOW);
  
  Serial.print("Servo connected to pin: ");
  Serial.println(SERVO_PIN);
  Serial.print("PWM Frequency: ");
  Serial.print(PWM_FREQUENCY_HZ);
  Serial.println(" Hz");
  Serial.print("PWM Period: ");
  Serial.print(PWM_PERIOD_US);
  Serial.println(" μs");
  Serial.println("Starting sweep in 2 seconds...");
  delay(2000);
}

void loop() {
  static unsigned long lastUpdate = 0;
  
  // Update servo position based on configured frequency
  uint32_t updateInterval = PWM_PERIOD_US / 1000;  // Convert to milliseconds
  if (millis() - lastUpdate >= updateInterval) {
    lastUpdate = millis();
    
    // Sweep logic: 0% -> 100% -> 0%
    if (sweepUp) {
      servoPosition += 1;  // Increase by 1% each step
      if (servoPosition >= 100) {
        servoPosition = 100;
        sweepUp = false;  // Start going down
        Serial.println("Reached 100% - sweeping down");
      }
    } else {
      servoPosition -= 1;  // Decrease by 1% each step
      if (servoPosition <= 0) {
        servoPosition = 0;
        sweepUp = true;   // Start going up
        Serial.println("Reached 0% - sweeping up");
      }
    }
    
    // Send PWM signal to servo
    setServoPosition(SERVO_PIN, servoPosition);
    
    // Print position every 10 steps
    static uint8_t printCounter = 0;
    if (printCounter++ >= 10) {
      printCounter = 0;
      Serial.print("Position: ");
      Serial.print(servoPosition);
      Serial.print("% | Pulse: ");
      Serial.print(positionToPulseWidth(servoPosition));
      Serial.println("μs");
    }
  }
  
  // Calculate remaining time for LOW period
  uint16_t pulse_width = positionToPulseWidth(servoPosition);
  uint32_t low_time = PWM_PERIOD_US - pulse_width;
  
  // Ensure we don't exceed maximum delay
  if (low_time > 16383) {  // delayMicroseconds max reliable value
    delay(low_time / 1000);  // Use delay() for large values
    delayMicroseconds(low_time % 1000);
  } else {
    delayMicroseconds(low_time);
  }
}

/*
  Simple Servo PWM Demo for Arduino R4 Minima
  
  This demo shows how to generate precise PWM signals for servo/ESC control.
  
  How it works:
  1. Generates configurable frequency PWM signal (default 50Hz)
  2. Pulse width varies from 500μs (0%) to 2500μs (100%)
  3. Smoothly sweeps from 0% to 100% and back
  
  Configuration:
  - Change PWM_FREQUENCY_HZ to adjust frequency (e.g., 50Hz for servos, 400Hz for ESCs)
  - PWM period is automatically calculated: 1,000,000μs / frequency
  - Update interval and LOW time are dynamically calculated
  
  Key concepts:
  - digitalWrite(pin, HIGH) + delayMicroseconds() + digitalWrite(pin, LOW)
  - Creates precise pulse widths needed for servo control
  - Frequency determines how often pulses are sent
  
  Connections:
  - Servo signal wire to pin 9
  - Servo power (red) to 5V or external power
  - Servo ground (black/brown) to GND
  
  Serial Monitor Output:
  - Shows current frequency and period settings
  - Shows current position percentage
  - Shows pulse width in microseconds
  - Updates every 10 PWM cycles for easy reading
*/
