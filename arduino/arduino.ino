#include <PID_v1.h>

// PID variables for first controller
double input1, output1, setpoint1;
double kp1 = 2.0, ki1 = 0.1, kd1 = 0.5;
PID pid1(&input1, &output1, &setpoint1, kp1, ki1, kd1, DIRECT);

// PID variables for second controller
double input2, output2, setpoint2;
double kp2 = 1.5, ki2 = 0.05, kd2 = 0.3;
PID pid2(&input2, &output2, &setpoint2, kp2, ki2, kd2, DIRECT);

float sensor_value = 0.0;
float target_value = 0.0;

void setup() {
  Serial.begin(9600);
  Serial.println("PID Library-based Controller");
  
  // Initialize PID1
  setpoint1 = target_value;
  pid1.SetOutputLimits(-200, 200);
  pid1.SetSampleTime(20);  // 20ms sample time
  pid1.SetMode(AUTOMATIC);
  
  // Initialize PID2
  setpoint2 = 0.0;
  pid2.SetOutputLimits(-150, 150);
  pid2.SetSampleTime(10);  // 10ms sample time
  pid2.SetMode(AUTOMATIC);
  
  Serial.println("PID controllers initialized!");
  Serial.println("Commands: 't' to set target, 'i' to set input, 'd' for debug, 'p' to tune PID");
}

void loop() {
  // Simulate sensor reading (replace with actual sensor)
  sensor_value += random(-10, 11) / 10.0;  // Add some noise
  
  // Update PID inputs
  input1 = sensor_value;
  input2 = sensor_value * 0.8;  // Different input scaling
  
  // Compute PID outputs
  pid1.Compute();
  pid2.Compute();
  
  // Use outputs (e.g., motor control)
  Serial.print("Sensor:");
  Serial.print(sensor_value, 2);
  Serial.print(" | Target:");
  Serial.print(target_value, 2);
  Serial.print(" | PID1 Out:");
  Serial.print(output1, 2);
  Serial.print(" | PID2 Out:");
  Serial.println(output2, 2);
  
  // Handle serial commands
  if (Serial.available()) {
    char cmd = Serial.read();
    switch (cmd) {
      case 't':
        Serial.println("Enter new target value:");
        while (!Serial.available()) delay(10);
        target_value = Serial.parseFloat();
        setpoint1 = target_value;
        Serial.print("Target set to: ");
        Serial.println(target_value);
        break;
        
      case 'i':
        Serial.println("Enter new input value:");
        while (!Serial.available()) delay(10);
        sensor_value = Serial.parseFloat();
        Serial.print("Input set to: ");
        Serial.println(sensor_value);
        break;
        
      case 'd':
        printDebugInfo();
        break;
        
      case 'p':
        tunePID();
        break;
        
      case 'r':
        // Reset PIDs by switching to manual then back to automatic
        pid1.SetMode(MANUAL);
        pid2.SetMode(MANUAL);
        output1 = 0;
        output2 = 0;
        pid1.SetMode(AUTOMATIC);
        pid2.SetMode(AUTOMATIC);
        Serial.println("PIDs reset!");
        break;
        
      case 'm':
        // Toggle between AUTOMATIC and MANUAL mode
        if (pid1.GetMode() == AUTOMATIC) {
          pid1.SetMode(MANUAL);
          pid2.SetMode(MANUAL);
          Serial.println("Switched to MANUAL mode");
        } else {
          pid1.SetMode(AUTOMATIC);
          pid2.SetMode(AUTOMATIC);
          Serial.println("Switched to AUTOMATIC mode");
        }
        break;
    }
  }
  
  delay(50);  // Main loop delay
}

void printDebugInfo() {
  Serial.println("=== PID Debug Info ===");
  
  Serial.print("PID1 - Input:");
  Serial.print(input1, 3);
  Serial.print(" Setpoint:");
  Serial.print(setpoint1, 3);
  Serial.print(" Output:");
  Serial.print(output1, 3);
  Serial.print(" Error:");
  Serial.print(setpoint1 - input1, 3);
  Serial.print(" Mode:");
  Serial.println(pid1.GetMode() == AUTOMATIC ? "AUTO" : "MANUAL");
  
  Serial.print("PID2 - Input:");
  Serial.print(input2, 3);
  Serial.print(" Setpoint:");
  Serial.print(setpoint2, 3);
  Serial.print(" Output:");
  Serial.print(output2, 3);
  Serial.print(" Error:");
  Serial.print(setpoint2 - input2, 3);
  Serial.print(" Mode:");
  Serial.println(pid2.GetMode() == AUTOMATIC ? "AUTO" : "MANUAL");
  
  Serial.print("PID1 Tunings - Kp:");
  Serial.print(pid1.GetKp(), 3);
  Serial.print(" Ki:");
  Serial.print(pid1.GetKi(), 3);
  Serial.print(" Kd:");
  Serial.println(pid1.GetKd(), 3);
}

void tunePID() {
  Serial.println("PID Tuning Menu:");
  Serial.println("1. Tune PID1 Kp");
  Serial.println("2. Tune PID1 Ki");
  Serial.println("3. Tune PID1 Kd");
  Serial.println("4. Tune PID2 Kp");
  Serial.println("5. Tune PID2 Ki");
  Serial.println("6. Tune PID2 Kd");
  Serial.println("Enter choice (1-6):");
  
  while (!Serial.available()) delay(10);
  int choice = Serial.parseInt();
  
  Serial.println("Enter new value:");
  while (!Serial.available()) delay(10);
  double newValue = Serial.parseFloat();
  
  switch (choice) {
    case 1:
      kp1 = newValue;
      pid1.SetTunings(kp1, ki1, kd1);
      Serial.print("PID1 Kp set to: ");
      Serial.println(kp1, 3);
      break;
    case 2:
      ki1 = newValue;
      pid1.SetTunings(kp1, ki1, kd1);
      Serial.print("PID1 Ki set to: ");
      Serial.println(ki1, 3);
      break;
    case 3:
      kd1 = newValue;
      pid1.SetTunings(kp1, ki1, kd1);
      Serial.print("PID1 Kd set to: ");
      Serial.println(kd1, 3);
      break;
    case 4:
      kp2 = newValue;
      pid2.SetTunings(kp2, ki2, kd2);
      Serial.print("PID2 Kp set to: ");
      Serial.println(kp2, 3);
      break;
    case 5:
      ki2 = newValue;
      pid2.SetTunings(kp2, ki2, kd2);
      Serial.print("PID2 Ki set to: ");
      Serial.println(ki2, 3);
      break;
    case 6:
      kd2 = newValue;
      pid2.SetTunings(kp2, ki2, kd2);
      Serial.print("PID2 Kd set to: ");
      Serial.println(kd2, 3);
      break;
    default:
      Serial.println("Invalid choice!");
      break;
  }
}