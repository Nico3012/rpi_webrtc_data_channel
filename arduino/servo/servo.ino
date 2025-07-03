#include <Servo.h>

// Configuration
const int SERVO_PIN = 9;
const int MIN_DUTY_CYCLE = 500; // microseconds (1ms)
const int MAX_DUTY_CYCLE = 2500; // microseconds (2ms)

Servo myServo;

void setup() {
  myServo.attach(SERVO_PIN, MIN_DUTY_CYCLE, MAX_DUTY_CYCLE);
}

void loop() {
  // Move from 0% to 100% in 10% steps
  for (int pos = 0; pos <= 100; pos += 10) {
    myServo.writeMicroseconds(map(pos, 0, 100, MIN_DUTY_CYCLE, MAX_DUTY_CYCLE));
    delay(500);
  }
  
  // Move from 100% back to 0% in 10% steps
  for (int pos = 100; pos >= 0; pos -= 10) {
    myServo.writeMicroseconds(map(pos, 0, 100, MIN_DUTY_CYCLE, MAX_DUTY_CYCLE));
    delay(500);
  }
  
  // Wait for 2 seconds at the end
  delay(2000);
}
