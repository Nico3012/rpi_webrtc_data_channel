const webrtcConnection = document.querySelector('webrtc-connection');
const wifiManager = document.getElementById('wifi-manager');
const cameraElement = document.getElementById('camera');
const microphoneElement = document.getElementById('microphone');
const leftJoystick = document.getElementById('left-joystick');
const rightJoystick = document.getElementById('right-joystick');

webrtcConnection.addEventListener('connection-update', () => {
    // Update video element with current stream (or null when disconnected)
    const videoStream = webrtcConnection.getVideoStream();
    cameraElement.srcObject = videoStream;

    // Update audio element with current stream (or null when disconnected)
    const audioStream = webrtcConnection.getAudioStream();
    microphoneElement.srcObject = audioStream;

    wifiManager.hidden = !webrtcConnection.isConnected();
});

webrtcConnection.addEventListener('message-received', (event) => {
    console.log('Message received:', event.detail.message);
});

let speed = 0; //  0 - 1
let angle = 0; // -1 - 1

leftJoystick.addEventListener('stick-move', (event) => {
    speed = (event.detail.y + 1) / 2; // assign speed

    if (webrtcConnection.isConnected()) {
        // do not send every time, to ensure ir led is not waiting for cmd stack
        // webrtcConnection.sendData(`COMBO 0 ${speed.toFixed(2)} ${angle.toFixed(2)}`);
    }
});

rightJoystick.addEventListener('stick-move', (event) => {
    angle = event.detail.x; // assign angle

    if (webrtcConnection.isConnected()) {
        // do not send every time, to ensure ir led is not waiting for cmd stack
        // webrtcConnection.sendData(`COMBO 0 ${speed.toFixed(2)} ${angle.toFixed(2)}`);
    }
});

setInterval(() => {
    if (webrtcConnection.isConnected()) {
        const motor1 = Math.max(Math.min(speed * (1 + 2 * angle), 1), -1);
        const motor2 = Math.max(Math.min(speed * (1 - 2 * angle), 1), -1);
        webrtcConnection.sendData(`COMBO 0 ${motor1.toFixed(2)} ${-(motor2).toFixed(2)}`);
    }
}, 200);

export { };
