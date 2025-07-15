#ifndef SERIALCOMM_H
#define SERIALCOMM_H

#include <Arduino.h>

class SerialComm {
    // allow serialEvent to access private members
    friend void ::serialEvent();

public:
    /**
     * Initialize Serial at the given baud rate.
     */
    SerialComm(unsigned long baud);

    /**
     * Send a string over Serial. Does not append newline.
     */
    void SendData(const String &data);

    /**
     * Register a callback to be invoked when a full line is received (ending with '\n').
     */
    void InitDataCallback(void (*callback)(String));

    /**
     * Close the serial communication.
     */
    void Close();

private:
    void readLoop();

    // Singleton instance for dispatching serialEvent()
    static SerialComm* instance;
    void (*dataCallback)(String);
};

/**
 * Called by the Arduino core when data is available.
 * Dispatches to the library's readLoop.
 */
void serialEvent();

#endif // SERIALCOMM_H
