#include <SerialComm.h>

SerialComm comm;
int counter = 0;

void setup() {
    comm.Begin(9600);
    comm.InitDataCallback(onDataReceived);
}

void loop() {
    // send our counter
    comm.SendData(String(counter));
    counter++;

    // give Arduino time to receive from PC and process it
    delay(1000);

    // explicitly poll for incoming data
    comm.Poll();
}

void onDataReceived(String line) {
    line.trim();
    long value = line.toInt();
    long squared = value * value;
    comm.SendData(String(squared));
}
