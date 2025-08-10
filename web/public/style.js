const mediaDiv = document.querySelector('div.media');
const video = document.querySelector('video#camera');

// Set initial aspect ratio
const aspectRatio = 16 / 9;

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
