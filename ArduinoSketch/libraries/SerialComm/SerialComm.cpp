#include "SerialComm.h"

SerialComm* SerialComm::instance = nullptr;

SerialComm::SerialComm(unsigned long baud)
    : dataCallback(nullptr) {
    Serial.begin(baud);
    instance = this;
}

void SerialComm::SendData(const String &data) {
    Serial.print(data);
}

void SerialComm::InitDataCallback(void (*callback)(String)) {
    dataCallback = callback;
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
