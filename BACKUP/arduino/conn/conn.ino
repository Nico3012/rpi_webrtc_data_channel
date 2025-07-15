// Arduino Serial Communication Example
// Opposite side for Go serialcomm package

// Define baud rate (match Go code)
const unsigned long BAUD_RATE = 9600;

// Callback function prototype
void onDataReceived(const String &data);

void setup() {
  // Initialize serial port
  Serial.begin(BAUD_RATE);
  // Wait for serial port to connect (for native USB Arduinos)
  while (!Serial) {
    ; // wait
  }
}

void loop() {
  // Check if data is available
  if (Serial.available()) {
    // Read incoming string until newline (handles both \n and \r\n)
    String raw = Serial.readStringUntil('\n');
    // Trim any trailing carriage return
    raw.trim();

    // Call user-defined handler
    onDataReceived(raw);
  }

  // You can send data periodically or based on events
  // Example: echo back a heartbeat every second
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat >= 1000) {
    lastHeartbeat = millis();
    Serial.println("heartbeat");
  }
}

// User-defined callback: process received data
void onDataReceived(const String &data) {
  // Example: echo the received string back with a prefix
  Serial.print("Received: ");
  Serial.println(data);

  // Add your custom handling here
  // if (data == "LED_ON") {
  //   digitalWrite(LED_BUILTIN, HIGH);
  // }
  // else if (data == "LED_OFF") {
  //   digitalWrite(LED_BUILTIN, LOW);
  // }
}
