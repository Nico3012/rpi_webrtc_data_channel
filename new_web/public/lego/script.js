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

let leftSpeed = 0; // -1 - 1
let rightSpeed = 0; // -1 - 1

leftJoystick.addEventListener('stick-move', (event) => {
    leftSpeed = event.detail.y;
});

rightJoystick.addEventListener('stick-move', (event) => {
    rightSpeed = event.detail.y;
});

setInterval(() => {
    if (webrtcConnection.isConnected()) {
        webrtcConnection.sendData(`COMBO 0 ${leftSpeed.toFixed(2)} ${rightSpeed.toFixed(2)}`);
    }
}, 100);

export { };
