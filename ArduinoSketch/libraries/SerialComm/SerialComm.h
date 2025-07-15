// SerialComm.h
#ifndef SERIALCOMM_H
#define SERIALCOMM_H

#include <Arduino.h>
#include <vector>

class SerialComm {
public:
    /**
     * Default constructor. Call Begin() in setup().
     */
    SerialComm();

    /**
     * Initialize Serial at the given baud rate. Must be called in setup().
     */
    void Begin(unsigned long baud);

    /**
     * Send a string over Serial, appending a newline.
     */
    void SendData(const String &data);

    /**
     * Poll for any newly received whole-line messages.
     * Returns a vector of all lines received since the last call.
     * The returned vector's size() is the number of new messages;
     * after returning them, the internal buffer is cleared.
     * This also internally reads any pending bytes.
     */
    std::vector<String> ReadMessages();

    /**
     * Close the serial communication.
     */
    void Close();

    // expose for serialEvent
    static SerialComm* instance;
    void readLoop();

private:
    std::vector<String> buffer;  // stores incoming lines until ReadMessages() is called
};

void serialEvent();  // for the Arduino core to dispatch incoming data

#endif // SERIALCOMM_H

