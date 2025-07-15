#include <SerialComm.h>
#include <Stepper.h>
#include <Servo.h>

//——————————————————————
// CONFIGURATION
//——————————————————————

const int STEPPER_PIN1 = 8;
const int STEPPER_PIN2 = 10;
const int STEPPER_PIN3 = 9;
const int STEPPER_PIN4 = 11;
const int STEPS_PER_REV   = 2048;
const int SERVO_PIN       = 3;

const int SERVO_MIN_US    =  500;
const int SERVO_MID_US    = 1500;
const int SERVO_MAX_US    = 2500;

const float STEPPER_MAX_RPM =  15.0;
const float STEPPER_MIN_RPM = -15.0;

const unsigned long COMMAND_TIMEOUT = 500;

//——————————————————————
// GLOBALS
//——————————————————————

SerialComm comm;
Stepper   stepper(STEPS_PER_REV, STEPPER_PIN1, STEPPER_PIN3, STEPPER_PIN2, STEPPER_PIN4);
Servo     servo;

float   lastSpeedCmd    = 0.0;
float   lastServoCmd    = 0.0;
unsigned long lastCmdTime    = 0;
unsigned long lastStepMicros = 0;

//——————————————————————
// UTILITY: linear map for floats
//——————————————————————

float fmap(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

//——————————————————————
// SETUP
//——————————————————————

void setup() {
  comm.Begin(9600);
  stepper.setSpeed(0);
  servo.attach(SERVO_PIN);
  servo.writeMicroseconds(SERVO_MID_US);
  lastCmdTime    = millis();
  lastStepMicros = micros();
}

//——————————————————————
// MAIN LOOP
//——————————————————————

void loop() {
  // 1) Read any incoming messages
  std::vector<String> msgs = comm.ReadMessages();
  for (String &msg : msgs) {
    msg.trim();
    int sep = msg.indexOf(';');
    if (sep > 0) {
      float spd = msg.substring(0, sep).toFloat();
      float pos = msg.substring(sep + 1).toFloat();
      lastSpeedCmd = constrain(spd, -1.0, 1.0);
      lastServoCmd = constrain(pos, -1.0, 1.0);
      lastCmdTime  = millis();
    }
  }

  // 2) Timeout check
  bool active = (millis() - lastCmdTime) < COMMAND_TIMEOUT;
  float speedVal = active ? lastSpeedCmd : 0.0;
  float servoVal = active ? lastServoCmd : 0.0;

  // 3) Update servo
  int pulse = (servoVal < 0)
    ? fmap(servoVal, -1.0, 0.0, SERVO_MIN_US,  SERVO_MID_US)
    : fmap(servoVal,  0.0, 1.0, SERVO_MID_US,  SERVO_MAX_US);
  servo.writeMicroseconds(pulse);

  // 4) Update stepper via timed micro‑stepping
  float targetRPM = fmap(speedVal, -1.0, 1.0, STEPPER_MIN_RPM, STEPPER_MAX_RPM);
  unsigned long interval = (targetRPM != 0.0)
    ? (unsigned long)(60e6 / (fabs(targetRPM) * STEPS_PER_REV))
    : 0xFFFFFFFFUL;          // <-- replaced ULONG_MAX

  unsigned long us = micros();
  if (targetRPM != 0.0 && (us - lastStepMicros >= interval)) {
    int dir = (targetRPM > 0) ? 1 : -1;
    stepper.step(dir);
    lastStepMicros = us;
  }
}
