/**
 * Calculate motor speeds for a quadcopter based on control inputs.
 * 
 * @param {number} rollX - Roll control around X-axis (-1 to 1)
 * @param {number} rollY - Roll control around Y-axis (-1 to 1) 
 * @param {number} yaw - Yaw control (-1 to 1)
 * @param {number} thrust - Thrust control (0 to 1)
 * @returns {Array<number>} Array of 4 motor speeds [motor1, motor2, motor3, motor4] (0 to 1)
 * 
 * Motor layout (viewed from above):
 * Motor 1 (Front-Right) - CW
 * Motor 2 (Front-Left)  - CCW  
 * Motor 3 (Rear-Left)   - CW
 * Motor 4 (Rear-Right)  - CCW
 * 
 * Diagonal motors (1&3, 2&4) spin in same direction.
 */
function calculateMotorSpeeds(rollX, rollY, yaw, thrust) {
    // Clamp inputs to valid ranges
    rollX = Math.max(-1, Math.min(1, rollX));
    rollY = Math.max(-1, Math.min(1, rollY));
    yaw = Math.max(-1, Math.min(1, yaw));
    thrust = Math.max(0, Math.min(1, thrust));
    
    // If thrust is 0, all motors stop
    if (thrust === 0) {
        return [0.0, 0.0, 0.0, 0.0];
    }
    
    // Base motor speeds from thrust
    const baseSpeed = thrust;
    
    // Calculate motor adjustments
    // Roll X affects left/right motor pairs
    const rollXAdjustment = rollX * 0.5;
    
    // Roll Y affects front/back motor pairs  
    const rollYAdjustment = rollY * 0.5;
    
    // Yaw affects diagonal pairs differently
    const yawAdjustment = yaw * 0.3;
    
    // Calculate individual motor speeds
    // Motor 1: Front-Right (CW)
    let motor1 = baseSpeed - rollXAdjustment + rollYAdjustment + yawAdjustment;
    
    // Motor 2: Front-Left (CCW)
    let motor2 = baseSpeed + rollXAdjustment + rollYAdjustment - yawAdjustment;
    
    // Motor 3: Rear-Left (CW) 
    let motor3 = baseSpeed + rollXAdjustment - rollYAdjustment + yawAdjustment;
    
    // Motor 4: Rear-Right (CCW)
    let motor4 = baseSpeed - rollXAdjustment - rollYAdjustment - yawAdjustment;
    
    // Clamp all motor speeds to valid range [0, 1]
    motor1 = Math.max(0, Math.min(1, motor1));
    motor2 = Math.max(0, Math.min(1, motor2));
    motor3 = Math.max(0, Math.min(1, motor3));
    motor4 = Math.max(0, Math.min(1, motor4));
    
    return [motor1, motor2, motor3, motor4];
}

// testing the output:

const rollForward = 0.1;
const rollRight = 0.2;
const yawRightClockwise = 0;
const thrust = 0.5;

const res = calculateMotorSpeeds(rollRight, -rollForward, yawRightClockwise, thrust);

console.log(res[1].toFixed(2), res[0].toFixed(2));
console.log(res[2].toFixed(2), res[3].toFixed(2));
