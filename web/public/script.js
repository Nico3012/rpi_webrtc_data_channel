const webrtcComponent = document.getElementById('webrtcConnection');
const digitalJoystick = document.getElementById('digitalJoystick');
const servoInput = document.getElementById('servo-input');
const pitchDiv = document.getElementById('pitch');
const rollDiv = document.getElementById('roll');
const videoElement = document.getElementById('external-video');
const audioElement = document.getElementById('external-audio');

// Handle connection changes (includes video and audio stream status)
webrtcComponent.addEventListener('connection-changed', () => {
    // Update video element with current stream (or null when disconnected)
    const videoStream = webrtcComponent.getVideoStream();
    videoElement.srcObject = videoStream;

    // Update audio element with current stream (or null when disconnected)
    const audioStream = webrtcComponent.getAudioStream();
    audioElement.srcObject = audioStream;

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

digitalJoystick.addEventListener('stick-move', (event) => {
    console.log('Stick moved:', event.detail.x, event.detail.y);
});

servoInput.addEventListener('input', () => {
    if (webrtcComponent.isConnected()) {
        webrtcComponent.sendData(servoInput.value);
    }
});
