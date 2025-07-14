const webrtcConnection = document.querySelector('webrtc-connection');
const cameraElement = document.getElementById('camera');
const microphoneElement = document.getElementById('microphone');

webrtcConnection.addEventListener('connection-changed', () => {
    // Update video element with current stream (or null when disconnected)
    const videoStream = webrtcConnection.getVideoStream();
    cameraElement.srcObject = videoStream;

    // Update audio element with current stream (or null when disconnected)
    const audioStream = webrtcConnection.getAudioStream();
    microphoneElement.srcObject = audioStream;
});

export { };
