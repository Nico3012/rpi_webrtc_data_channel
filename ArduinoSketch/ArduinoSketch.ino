#include <SerialComm.h>

SerialComm comm(9600);
int counter = 0;

void setup() {
  // Register a callback to handle incoming lines
  comm.InitDataCallback(onDataReceived);
}

void loop() {
  // Send the current counter value
  comm.SendData(String(counter));
  counter++;

  // Wait one second before next send
  delay(1000);
}

// This function is called whenever a full line ending in '\n' arrives
void onDataReceived(String line) {
  line.trim();                    // remove any trailing CR/LF or spaces
  long value = line.toInt();      // parse to integer (returns 0 on failure)
  long squared = value * value;   // compute the square

  // Send the squared result back
  comm.SendData(String(squared));
}
