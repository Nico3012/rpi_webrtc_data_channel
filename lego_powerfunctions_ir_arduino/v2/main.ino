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

/////////////////////////////////////////////////////////////////////////////////////////////////////////

void sendSinglePWM(IRsend &ir, uint8_t channel, uint8_t port, uint8_t pwm) {
    // Telegramm bauen: (Port << 4) | PWM
    uint8_t tCommand = ((port & 0x1) << 4) | (pwm & 0xF);

    // Timeout Mode = 3, Single Output Telegramm
    ir.sendLegoPowerFunctions(channel, tCommand, 3, false); // void sendLegoPowerFunctions (uint8_t aChannel, uint8_t tCommand, uint8_t aMode, bool aDoSend5Times=true)
}

void sendComboPWM(IRsend &ir, uint8_t channel, uint8_t bluePWM, uint8_t redPWM) {
    // Nibble1 = 0x4 | channel
    uint8_t nib1 = 0x4 | (channel & 0x3);
    // Nibble2 = Blue PWM
    uint8_t nib2 = bluePWM & 0xF;
    // Nibble3 = Red PWM
    uint8_t nib3 = redPWM & 0xF;
    // Nibble4 = Parity = nib1 ^ nib2 ^ nib3 ^ 0xF
    uint8_t nib4 = 0xF ^ (nib1 ^ nib2 ^ nib3);

    // RawData = 16 Bit: nib1||nib2||nib3||nib4
    uint16_t rawData = (nib1 << 12) | (nib2 << 8) | (nib3 << 4) | nib4;

    // Senden über IRremote (Es wird immer im Timeout mode gesendet)
    ir.sendLegoPowerFunctions(rawData, channel, false); // void sendLegoPowerFunctions (uint16_t aRawData, uint8_t aChannel, bool aDoSend5Times=true)
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

void setup() {
  irsend.begin(3); // arduino pin 3
}

void loop() {
  sendSinglePWM(irsend, CH1, BLUE, PWM_FWD2);
  sendSinglePWM(irsend, CH1, RED, PWM_REV4);
  sendComboPWM(irsend, CH2, PWM_FWD2, PWM_REV2);
  delay(100); // wait 100ms and then send again
}
