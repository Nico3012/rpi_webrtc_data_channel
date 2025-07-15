#include "SerialComm.h"

SerialComm* SerialComm::instance = nullptr;

SerialComm::SerialComm()
    : dataCallback(nullptr) {
    instance = this;
}

void SerialComm::Begin(unsigned long baud) {
    Serial.begin(baud);
}

void SerialComm::SendData(const String &data) {
    Serial.print(data);
    Serial.write('\n');
}

void SerialComm::InitDataCallback(void (*callback)(String)) {
    dataCallback = callback;
}

void SerialComm::Poll() {
    readLoop();                // trigger the same logic as serialEvent()
}

void SerialComm::Close() {
    Serial.end();
    instance = nullptr;
}

void SerialComm::readLoop() {
    while (Serial.available()) {
        String line = Serial.readStringUntil('\n');
        if (dataCallback) {
            dataCallback(line);
        }
    }
}

void serialEvent() {
    if (SerialComm::instance) {
        SerialComm::instance->readLoop();
    }
}
