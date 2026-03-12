#include <IRremote.hpp>

/////////////////////////////////////////////////////////////////////////////////////////////////////////

// channels
#define CH1 0x0
#define CH2 0x1
#define CH3 0x2
#define CH4 0x3

// ports
#define RED 0x0
#define BLUE 0x1

// pwm steps
#define PWM_FLT 0x0
#define PWM_FWD1 0x1
#define PWM_FWD2 0x2
#define PWM_FWD3 0x3
#define PWM_FWD4 0x4
#define PWM_FWD5 0x5
#define PWM_FWD6 0x6
#define PWM_FWD7 0x7
//#define PWM_BRK 0x8 - should not be used, because it may cause physical damage to the engine
#define PWM_REV7 0x9
#define PWM_REV6 0xA
#define PWM_REV5 0xB
#define PWM_REV4 0xC
#define PWM_REV3 0xD
#define PWM_REV2 0xE
#define PWM_REV1 0xf

/////////////////////////////////////////////////////////////////////////////////////////////////////////

IRsend irsend;

void setup() {
  irsend.begin(3); // arduino pin 3
}

void loop() {
  // 3 = TIMEOUT
  irsend.sendLegoPowerFunctions(CH1, (BLUE << 4) | PWM_FWD4, 3, false);
  delay(100); // wait 100ms and then send again
}
