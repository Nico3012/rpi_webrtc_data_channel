const webrtcConnection = document.querySelector('webrtc-connection');
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
});

let speed = 0; //  0 - 1
let angle = 0; // -1 - 1

leftJoystick.addEventListener('stick-move', (event) => {
    speed = (event.detail.y + 1) / 2; // assign speed

    if (webrtcConnection.isConnected()) {
        console.log(`${speed.toFixed(2)};${angle.toFixed(2)}`);
        webrtcConnection.sendData(`${speed.toFixed(2)};${angle.toFixed(2)}`);
    } else {
        console.log('not connected:', `${speed.toFixed(2)};${angle.toFixed(2)}`);
    }
});

rightJoystick.addEventListener('stick-move', (event) => {
    angle = event.detail.x; // assign angle

    if (webrtcConnection.isConnected()) {
        console.log(`${speed.toFixed(2)};${angle.toFixed(2)}`);
        webrtcConnection.sendData(`${speed.toFixed(2)};${angle.toFixed(2)}`);
    } else {
        console.log('not connected:', `${speed.toFixed(2)};${angle.toFixed(2)}`);
    }
});

setInterval(() => {
    if (webrtcConnection.isConnected()) {
        webrtcConnection.sendData(`${speed.toFixed(2)};${angle.toFixed(2)}`);
    }
}, 100);

export { };
