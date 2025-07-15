#ifndef SERIALCOMM_H
#define SERIALCOMM_H

#include <Arduino.h>

class SerialComm {
public:
    friend void ::serialEvent();

    SerialComm();

    /** Initialize Serial at the given baud rate. Must be called in setup(). */
    void Begin(unsigned long baud);

    /** Send a string over Serial, appending a newline. */
    void SendData(const String &data);

    /** Register a callback to be invoked when a full line is received (ending with '\n'). */
    void InitDataCallback(void (*callback)(String));

    /** Poll for incoming data (call this regularly in loop()). */
    void Poll();                // ← NEW

    /** Close the serial communication. */
    void Close();

private:
    void readLoop();

    static SerialComm* instance;
    void (*dataCallback)(String);
};

void serialEvent();

#endif // SERIALCOMM_H
