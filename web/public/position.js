import { AlvaAR } from './assets/alva_ar.js';

const width = 640;
const height = 480;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

canvas.width = width;
canvas.height = height;

const alva = await AlvaAR.Initialize( width, height );

const cameraElement = document.getElementById('camera');

setInterval(() => {
    ctx.drawImage(cameraElement, 0, 0, width, height);
    const frame = ctx.getImageData(0, 0, width, height);

    const cameraPose = alva.findCameraPose(frame);

    if (cameraPose) {
        const x = cameraPose[12];
        const y = cameraPose[13];
        const z = cameraPose[14];

        console.log(x, y, z);
    } else {
        console.log(null);
    }
}, 1000/30);
