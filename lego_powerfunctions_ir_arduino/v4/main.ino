#include <LegoIr.h>

/////////////////////////////////////////////////////////////////////////////////////////////////////////

void sendSinglePWM(LegoIr &pf, uint8_t port, uint8_t pwm)
{
    pf.single_pwm(port, pwm);
}

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

// value is element of [-1, 1]
void sendSinglePWMFloat(LegoIr &pf, uint8_t port, float value)
{
    uint8_t pwm = calculatePWM(value);
    sendSinglePWM(pf, port, pwm);
}

// blueValue, redValue are element of [-1, 1]
void sendComboPWMFloat(LegoIr &pf, float blueValue, float redValue)
{
    uint8_t bluePWM = calculatePWM(blueValue);
    uint8_t redPWM = calculatePWM(redValue);
    sendComboPWM(pf, bluePWM, redPWM);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

LegoIr pf;

void setup()
{
    Serial.begin(9600);
    pf.begin(3, 0); // arduino pin 3, channel 0 (0 - 3)
}

void loop()
{
    if (Serial.available())
    {
        String input = Serial.readStringUntil('\n');
        input.trim(); // Entfernt \r falls vorhanden, für Kompatibilität mit Arduino IDE Serial Monitor

        if (input.startsWith("SINGLE "))
        {
            // Parse SINGLE command: SINGLE <channel> <port> <value>
            int firstSpace = input.indexOf(' ', 7); // Nach "SINGLE "
            if (firstSpace != -1)
            {
                int secondSpace = input.indexOf(' ', firstSpace + 1);
                if (secondSpace != -1)
                {
                    int thirdSpace = input.indexOf(' ', secondSpace + 1);
                    if (thirdSpace == -1) // Kein weiteres Leerzeichen erwartet
                    {
                        String chStr = input.substring(7, firstSpace);
                        String portStr = input.substring(firstSpace + 1, secondSpace);
                        String valStr = input.substring(secondSpace + 1);

                        int ch = chStr.toInt();
                        int port = portStr.toInt();
                        float val1 = valStr.toFloat();

                        // ch
                        sendSinglePWMFloat(pf, port, val1);
                    }
                }
            }
        }

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

                        // ch
                        sendComboPWMFloat(pf, val1, val2);
                    }
                }
            }
        }
    }
}

// Serial monitor commands:

// SINGLE <channel> <port> <value>
// COMBO <channel> <blueValue> <redValue>

// Serial monitor examples:

// SINGLE 0 0 0.5
// COMBO 1 0.3 -0.6
