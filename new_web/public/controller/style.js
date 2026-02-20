const mediaDiv = document.querySelector('.media');
const video = document.querySelector('#camera');

// Set initial aspect ratio
const aspectRatio = 4 / 3; // also change this in style.css

function resizeVideo() {
    const parentWidth = mediaDiv.clientWidth;
    const parentHeight = mediaDiv.clientHeight;
    // Calculate max possible size for video inside parent
    if (parentWidth / parentHeight >= aspectRatio) {
        // Parent is wider than aspect ratio: limit by height
        // video.style.left = parentWidth / 2 + 'px';
        // video.style.top = parentHeight / 2 + 'px';
        video.style.height = parentHeight + 'px';
        video.style.width = 'auto';
    } else {
        // Parent is taller than aspect ratio: limit by width
        // video.style.left = parentWidth / 2 + 'px';
        // video.style.top = parentHeight / 2 + 'px';
        video.style.width = parentWidth + 'px';
        video.style.height = 'auto';
    }

    window.requestAnimationFrame(resizeVideo);
}

window.requestAnimationFrame(resizeVideo);
