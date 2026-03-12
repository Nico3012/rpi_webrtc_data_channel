#include <IRremote.hpp>

#define IR_SEND_PIN 3

#define CH1 ((uint8_t)0)
#define BLUE ((uint8_t)1)

#define PWM_FLT ((uint8_t)0)
#define PWM_FWD2 ((uint8_t)2)
#define PWM_FWD4 ((uint8_t)4)

#define PF_MODE_SINGLE_OUTPUT ((uint8_t)4)

void setup() {
  IrSender.begin(IR_SEND_PIN);
}

void loop() {

  IrSender.sendLegoPowerFunctions(CH1, (BLUE << 4) | PWM_FWD2, PF_MODE_SINGLE_OUTPUT);
  delay(4000);

  IrSender.sendLegoPowerFunctions(CH1, (BLUE << 4) | PWM_FWD4, PF_MODE_SINGLE_OUTPUT);
  delay(4000);

  IrSender.sendLegoPowerFunctions(CH1, (BLUE << 4) | PWM_FLT, PF_MODE_SINGLE_OUTPUT);
  delay(8000);
}