const webrtcComponent = document.getElementById('webrtcConnection');
const servoInput = document.getElementById('servo-input');
const pitchDiv = document.getElementById('pitch');
const rollDiv = document.getElementById('roll');
const videoElement = document.getElementById('external-video');

// Handle connection changes (includes video stream status)
webrtcComponent.addEventListener('connection-changed', () => {
    // Update video element with current stream (or null when disconnected)
    const videoStream = webrtcComponent.getVideoStream();
    videoElement.srcObject = videoStream;

    // Send initial servo value when connected
    if (webrtcComponent.isConnected()) {
        webrtcComponent.sendData(servoInput.value);
    }
});

webrtcComponent.addEventListener('message-received', (event) => {
    const [pitch, roll] = event.detail.message.split(';').map(str => parseFloat(str));

    pitchDiv.textContent = pitch.toString();
    rollDiv.textContent = roll.toString();
});

servoInput.addEventListener('input', () => {
    if (webrtcComponent.isConnected()) {
        webrtcComponent.sendData(servoInput.value);
    }
});
