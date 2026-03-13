#include <LegoIr.h>

/////////////////////////////////////////////////////////////////////////////////////////////////////////

// Struktur für Pin und Channel Konfiguration
struct PfConfig {
    int pin;
    int channel;
};

// Hardcoded Array mit Konfigurationen (Pin, Channel)
PfConfig configs[] = {
    {3, 0},  // Pin 3, Channel 0
    {5, 1}   // Pin 4, Channel 1
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////

void sendComboPWM(LegoIr &pf, uint8_t bluePWM, uint8_t redPWM)
{
    pf.combo_pwm(bluePWM, redPWM);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

// internal helper array
uint8_t pwmValues[15] = {
    PWM_REV7, PWM_REV6, PWM_REV5, PWM_REV4, PWM_REV3, PWM_REV2, PWM_REV1,
    PWM_FLT,
    PWM_FWD1, PWM_FWD2, PWM_FWD3, PWM_FWD4, PWM_FWD5, PWM_FWD6, PWM_FWD7
};

// internal helper function
uint8_t calculatePWM(float value)
{
    int strength = round(value * 7.0f);
    if (strength < -7) strength = -7;
    if (strength > 7) strength = 7;
    int index = strength + 7;
    return pwmValues[index];
}

// blueValue, redValue are element of [-1, 1]
void sendComboPWMFloat(LegoIr &pf, float blueValue, float redValue)
{
    uint8_t bluePWM = calculatePWM(blueValue);
    uint8_t redPWM = calculatePWM(redValue);
    sendComboPWM(pf, bluePWM, redPWM);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

// Anzahl der Kanäle basierend auf Array-Größe
const int numChannels = sizeof(configs) / sizeof(configs[0]);

// Array von LegoIr Objekten
LegoIr pf[numChannels];

void setup()
{
    Serial.begin(9600);
    for (int i = 0; i < numChannels; i++) {
        pf[i].begin(configs[i].pin, configs[i].channel);
    }
}

void loop()
{
    if (Serial.available())
    {
        String input = Serial.readStringUntil('\n');
        input.trim(); // Entfernt \r falls vorhanden, für Kompatibilität mit Arduino IDE Serial Monitor

        if (input.startsWith("COMBO "))
        {
            // Parse COMBO command: COMBO <channel> <blueValue> <redValue>
            int firstSpace = input.indexOf(' ', 6); // Nach "COMBO "
            if (firstSpace != -1)
            {
                int secondSpace = input.indexOf(' ', firstSpace + 1);
                if (secondSpace != -1)
                {
                    int thirdSpace = input.indexOf(' ', secondSpace + 1);
                    if (thirdSpace == -1) // Kein weiteres Leerzeichen erwartet
                    {
                        String chStr = input.substring(6, firstSpace);
                        String blueStr = input.substring(firstSpace + 1, secondSpace);
                        String redStr = input.substring(secondSpace + 1);

                        int ch = chStr.toInt();
                        float val1 = blueStr.toFloat(); // blueValue
                        float val2 = redStr.toFloat(); // redValue

                        if (ch >= 0 && ch < numChannels) {
                            sendComboPWMFloat(pf[ch], val1, val2);
                        }
                    }
                }
            }
        }

        // other commands
    }
}

// Serial monitor commands:
// COMBO <channel> <blueValue> <redValue>

// Serial monitor examples:
// COMBO 0 0.3 -0.6
