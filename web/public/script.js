const webrtcComponent = document.getElementById('webrtcConnection');
const servoInput = document.getElementById('servo-input');
const pitchDiv = document.getElementById('pitch');
const rollDiv = document.getElementById('roll');

webrtcComponent.addEventListener('connection-changed', () => {
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
