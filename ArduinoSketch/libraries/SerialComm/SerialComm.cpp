
// SerialComm.cpp
#include "SerialComm.h"

SerialComm* SerialComm::instance = nullptr;

SerialComm::SerialComm() {
    instance = this;
}

void SerialComm::Begin(unsigned long baud) {
    Serial.begin(baud);
}

void SerialComm::SendData(const String &data) {
    Serial.print(data);
    Serial.write('\n');
}

std::vector<String> SerialComm::ReadMessages() {
    // bring any pending bytes into our buffer
    readLoop();

    // swap out stored messages
    std::vector<String> out;
    out.swap(buffer);
    return out;
}

void SerialComm::Close() {
    Serial.end();
    instance = nullptr;
}

void SerialComm::readLoop() {
    while (Serial.available()) {
        String line = Serial.readStringUntil('\n');
        buffer.push_back(line);
    }
}

void serialEvent() {
    if (SerialComm::instance) {
        SerialComm::instance->readLoop();
    }
}

