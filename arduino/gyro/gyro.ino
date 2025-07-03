#include<Wire.h>

int16_t AcX,AcY,AcZ,Tmp,GyX,GyY,GyZ;

void  setup(){
  Wire.begin();
  Wire.beginTransmission(0x68);
  Wire.write(0x6B);  
  Wire.write(0);    
  Wire.endTransmission(true);
  Serial.begin(9600);
}
void  loop(){
  Wire.beginTransmission(0x68);
  Wire.write(0x3B);  
  Wire.endTransmission(false);
  Wire.requestFrom(0x68,12,true);  
  AcX=Wire.read()<<8|Wire.read();    
  AcY=Wire.read()<<8|Wire.read();  
  AcZ=Wire.read()<<8|Wire.read();  
  GyX=Wire.read()<<8|Wire.read();  
  GyY=Wire.read()<<8|Wire.read();  
  GyZ=Wire.read()<<8|Wire.read();  
  
  // Calculate pitch and roll in degrees
  float pitch = atan2(AcY, sqrt(AcX * AcX + AcZ * AcZ)) * 180.0 / PI;
  float roll = atan2(-AcX, AcZ) * 180.0 / PI;
  
  Serial.print("Pitch: "); Serial.print(pitch);
  Serial.print(" | Roll: "); Serial.println(roll);
  delay(100);
}
