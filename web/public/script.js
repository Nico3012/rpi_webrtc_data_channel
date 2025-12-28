import { DataChannelMux } from "./data-channel-mux.js";
import { uploadFile } from "./upload.js";

const webrtcConnection = document.querySelector('webrtc-connection');
const cameraElement = document.getElementById('camera');
const microphoneElement = document.getElementById('microphone');
const leftJoystick = document.getElementById('left-joystick');
const rightJoystick = document.getElementById('right-joystick');
const uploadBtn = document.getElementById('upload-btn');

webrtcConnection.addEventListener('connection-update', () => {
    // Update video element with current stream (or null when disconnected)
    const videoStream = webrtcConnection.getVideoStream();
    cameraElement.srcObject = videoStream;

    // Update audio element with current stream (or null when disconnected)
    const audioStream = webrtcConnection.getAudioStream();
    microphoneElement.srcObject = audioStream;
});

// webrtcConnection.addEventListener('message-received', (event) => {
//     console.log('Message received:', event.detail.message);
// });

// let speed = 0; //  0 - 1
// let angle = 0; // -1 - 1

// leftJoystick.addEventListener('stick-move', (event) => {
//     speed = (event.detail.y + 1) / 2; // assign speed

//     if (webrtcConnection.isConnected()) {
//         // console.log(`${speed.toFixed(2)};${angle.toFixed(2)}`);
//         webrtcConnection.sendData(`${speed.toFixed(2)};${angle.toFixed(2)}`);
//     } else {
//         // console.log('not connected:', `${speed.toFixed(2)};${angle.toFixed(2)}`);
//     }
// });

// rightJoystick.addEventListener('stick-move', (event) => {
//     angle = event.detail.x; // assign angle

//     if (webrtcConnection.isConnected()) {
//         // console.log(`${speed.toFixed(2)};${angle.toFixed(2)}`);
//         webrtcConnection.sendData(`${speed.toFixed(2)};${angle.toFixed(2)}`);
//     } else {
//         // console.log('not connected:', `${speed.toFixed(2)};${angle.toFixed(2)}`);
//     }
// });

// setInterval(() => {
//     if (webrtcConnection.isConnected()) {
//         webrtcConnection.sendData(`${speed.toFixed(2)};${angle.toFixed(2)}`);
//     }
// }, 100);

// --- File upload logic ---
// User-configurable values
const FETCH_PATH = '/assets/video.mp4'; // path to fetch the binary from
const UPLOAD_FILENAME = 'uploaded_video.mp4'; // filename to send as target name on receiver

const mux = new DataChannelMux(webrtcConnection);

const channel = mux.createChannel('123456');

uploadBtn?.addEventListener('click', async () => {
    for await (const step of uploadFile(channel, FETCH_PATH, UPLOAD_FILENAME)) {
        console.log(UPLOAD_FILENAME, `${step.filename}: ${(step.progress * 100).toFixed(1)}%`);
    }

    console.log(UPLOAD_FILENAME, 'uploaded. Completed this file!');
});
