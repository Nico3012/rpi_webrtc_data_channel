#include<Wire.h>
#include <Kalman.h>         // Install via Library Manager: "Kalman Filter Library"

Kalman kalmanRoll;          // Kalman filter for roll
Kalman kalmanPitch;         // Kalman filter for pitch

// Raw sensor values from MPU6050
int16_t accX_raw, accY_raw, accZ_raw;
int16_t gyroX_raw, gyroY_raw, gyroZ_raw;

// Converted sensor values (in g and °/s)
float accX, accY, accZ;
float gyroX, gyroY, gyroZ;

// Computed outputs
float roll, pitch;

unsigned long lastTime;

void setup() {
  Wire.begin();
  Wire.beginTransmission(0x68);
  Wire.write(0x6B);  
  Wire.write(0);    
  Wire.endTransmission(true);
  Serial.begin(115200);
  // initialize your IMU here...
  lastTime = micros();
}

void loop() {
  // 1) Read your sensors into accX, accY, accZ (in g)
  //    and gyroX, gyroY, gyroZ (in °/s)
  //    e.g.: imu.readAccel(&accX,&accY,&accZ); imu.readGyro(&gyroX,&gyroY,&gyroZ);

  Wire.beginTransmission(0x68);
  Wire.write(0x3B);  
  Wire.endTransmission(false);
  Wire.requestFrom(0x68,12,true);  
  accX_raw=Wire.read()<<8|Wire.read();    
  accY_raw=Wire.read()<<8|Wire.read();  
  accZ_raw=Wire.read()<<8|Wire.read();  
  gyroX_raw=Wire.read()<<8|Wire.read();  
  gyroY_raw=Wire.read()<<8|Wire.read();  
  gyroZ_raw=Wire.read()<<8|Wire.read();  

  // Convert raw values to proper units
  // MPU6050 accelerometer: ±2g range, 16384 LSB/g
  accX = accX_raw / 16384.0;
  accY = accY_raw / 16384.0;
  accZ = accZ_raw / 16384.0;
  
  // MPU6050 gyroscope: ±250°/s range, 131 LSB/°/s
  gyroX = gyroX_raw / 131.0;
  gyroY = gyroY_raw / 131.0;
  gyroZ = gyroZ_raw / 131.0;  

  // 2) Compute time step (in seconds)
  unsigned long now = micros();
  float dt = (now - lastTime) * 1e-6f;
  lastTime = now;

  // Convert raw values to proper units
  // MPU6050 accelerometer: ±2g range, 16384 LSB/g
  accX = accX_raw / 16384.0;
  accY = accY_raw / 16384.0;
  accZ = accZ_raw / 16384.0;
  
  // MPU6050 gyroscope: ±250°/s range, 131 LSB/°/s
  gyroX = gyroX_raw / 131.0;
  gyroY = gyroY_raw / 131.0;
  gyroZ = gyroZ_raw / 131.0;

  // 3) Compute “tilt” angles from accel
  //    Note: these give correct gravity‑based roll/pitch only when |a|≈1g
  float rollAcc  =  atan2(accY, accZ) * RAD_TO_DEG;
  float pitchAcc =  atan(-accX / sqrt(accY*accY + accZ*accZ)) * RAD_TO_DEG;

  // 4) Fuse with gyro via Kalman
  //    kalman.getAngle(measuredAngle, gyroRate, dt) returns the filtered angle
  roll  = kalmanRoll. getAngle(rollAcc,  gyroX, dt);
  pitch = kalmanPitch.getAngle(pitchAcc, gyroY, dt);

  // 5) (Optional) if your accel magnitude deviates strongly from 1g,
  //    you can skip the accel measurement to avoid linear‑accel spikes:
  // float accelMag = sqrt(accX*accX + accY*accY + accZ*accZ);
  // if (abs(accelMag - 1.0f) > 0.2f) {
  //   // too much linear accel, trust gyro-only
  //   roll  += gyroX * dt;
  //   pitch += gyroY * dt;
  // }

  // 6) Use roll & pitch for your inner‑loop controllers…
  Serial.print("Roll: ");  Serial.print(roll,  2);
  Serial.print("  Pitch: "); Serial.println(pitch, 2);

  delay(5); // or match your IMU’s output rate
}
