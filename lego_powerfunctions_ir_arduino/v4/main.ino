#include <LegoIr.h>

LegoIr pf;

void setup() {
  pf.begin(3, 0);  // IR LED pin 3, channel 0 - 3 (in order to change the channel, just execute this line again)
}

void loop() {
  pf.combo_pwm(0x4, 0x4);
}
