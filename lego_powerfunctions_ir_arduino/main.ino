#include <legopowerfunctions.h>

LEGOPowerFunctions lego(13);

void setup() {
  // nothing needed here
}

void loop() {
  // PWM_FWD7 is full speed (1-7)
  // PWM_FLT is stop (strom weg (ausrollen))
  // PWM_REV7 is full reverse speed (1-7)
  lego.SingleOutput(0, PWM_FWD4, BLUE, CH1); // stufe 4/7 forwärts
  delay(4000);
  lego.SingleOutput(0, PWM_FWD2, BLUE, CH1); // stufe 4/7 forwärts
  delay(4000);
  lego.SingleOutput(0, PWM_FLT, BLUE, CH1); // strom weg -> ausrollen
  delay(2000);
}
