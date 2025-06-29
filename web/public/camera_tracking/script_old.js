let video, canvas, ctx;
let stream = null;
let isOpenCvReady = false;
let isProcessing = false;
let animationId = null;

// OpenCV matrices
let src, gray, corners, prevGray, prevCorners;

// Feature tracking
let currentFeatures = [];
let frameCount = 0;

// 3D projection is always enabled
let deviceOrientation = { pitch: 0, roll: 0, yaw: 0 };

// Three.js variables
let threeScene, threeCamera, threeRenderer;
let threeContainer;
let featurePoints3D = [];
let featurePointsMesh;

// Configurable parameters
let config = {
    fov: 75,
    featureDepth: 10,
    pointSize: 0.1,
    sensitivity: 1.0 // Fixed at 1.0
};

// Feature detection parameters
const maxCorners = 100;
const qualityLevel = 0.01;
const minDistance = 10;
const blockSize = 3;
const useHarrisDetector = false;
const k = 0.04;

// Initialize Three.js scene
function initThreeJS() {
    threeContainer = document.getElementById('threeContainer');
    
    // Create scene
    threeScene = new THREE.Scene();
    
    // Create camera with configurable FOV
    threeCamera = new THREE.PerspectiveCamera(config.fov, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 1000);
    threeCamera.position.set(0, 0, 0);
    threeCamera.rotation.set(0, 0, 0);
    
    // Create renderer
    threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    threeRenderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    threeRenderer.setClearColor(0x000000, 0);
    threeContainer.appendChild(threeRenderer.domElement);
    
    // Start render loop
    animateThree();
}

// Convert 2D feature points to 3D positions
function convertFeaturePointsTo3D() {
    if (!currentFeatures || currentFeatures.length === 0) {
        featurePoints3D = [];
        return;
    }
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    featurePoints3D = currentFeatures.map(feature => {
        // Convert from screen coordinates to normalized device coordinates (-1 to 1)
        const x = ((feature.x / canvasWidth) * 2 - 1) * (canvasWidth / canvasHeight);
        const y = -((feature.y / canvasHeight) * 2 - 1);
        
        // Project to 3D space at fixed depth using configurable FOV
        const fov = THREE.MathUtils.degToRad(config.fov);
        const aspectRatio = canvasWidth / canvasHeight;
        const halfHeight = Math.tan(fov / 2) * config.featureDepth;
        const halfWidth = halfHeight * aspectRatio;
        
        return new THREE.Vector3(
            x * halfWidth,
            y * halfHeight,
            -config.featureDepth
        );
    });
}

// Create or update 3D feature points visualization
function updateFeaturePoints3D() {
    // Remove existing points
    if (featurePointsMesh) {
        threeScene.remove(featurePointsMesh);
        featurePointsMesh.geometry.dispose();
        featurePointsMesh.material.dispose();
        featurePointsMesh = null;
    }
    
    if (featurePoints3D.length === 0) return;
    
    // Create geometry from current 3D points
    const geometry = new THREE.BufferGeometry().setFromPoints(featurePoints3D);
    
    // Create material for points
    const material = new THREE.PointsMaterial({
        color: 0x00ff88,
        size: config.pointSize,
        sizeAttenuation: true
    });
    
    // Create points mesh
    featurePointsMesh = new THREE.Points(geometry, material);
    threeScene.add(featurePointsMesh);
}

// Update camera rotation based on device orientation
function updateThreeCamera() {
    const { pitch, roll } = deviceOrientation;
    
    // Convert device orientation to camera rotation with fixed sensitivity
    threeCamera.rotation.set(
        THREE.MathUtils.degToRad(pitch * config.sensitivity),
        THREE.MathUtils.degToRad(-roll * config.sensitivity),
        0
    );
}

// Three.js render loop
function animateThree() {
    if (!threeRenderer || !threeScene || !threeCamera) {
        requestAnimationFrame(animateThree);
        return;
    }
    
    updateThreeCamera();
    threeRenderer.render(threeScene, threeCamera);
    requestAnimationFrame(animateThree);
}

// Resize Three.js renderer
function resizeThreeRenderer() {
    if (!threeRenderer || !threeCamera || !threeContainer) return;
    
    const width = threeContainer.clientWidth || 640;
    const height = threeContainer.clientHeight || 480;
    
    threeCamera.aspect = width / height;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(width, height);
}

// Initialize when OpenCV is ready
function onOpenCvReady() {
    if (typeof cv !== 'undefined' && cv.Mat) {
        console.log('OpenCV.js is ready');
        isOpenCvReady = true;
    } else {
        console.log('OpenCV is not ready, retrying...');
        setTimeout(onOpenCvReady, 100);
    }
}

// Handle OpenCV loading errors
function onOpenCvError() {
    console.error('Failed to load OpenCV script');
    
    // Try loading from alternative CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/opencv.js@1.2.1/opencv.js';
    script.onload = onOpenCvReady;
    script.onerror = () => {
        console.error('Failed to load OpenCV from alternative source');
        showOpenCvError();
    };
    document.head.appendChild(script);
}

// Show user-friendly error message
function showOpenCvError() {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'opencv-error';
    errorDiv.innerHTML = `
        <div style="background: #fee; border: 2px solid #fcc; border-radius: 10px; padding: 20px; margin: 20px 0; color: #c33;">
            <h3>OpenCV Loading Error</h3>
            <p>Could not load OpenCV.js library. This might be due to:</p>
            <ul style="text-align: left; margin: 10px 0;">
                <li>Network connectivity issues</li>
                <li>CDN server problems</li>
                <li>Browser security restrictions</li>
            </ul>
            <p><strong>Try:</strong></p>
            <ul style="text-align: left;">
                <li>Refreshing the page</li>
                <li>Checking your internet connection</li>
                <li>Using a different browser</li>
            </ul>
            <p><em>Note: Camera will still work, but feature detection will be disabled.</em></p>
        </div>
    `;
    container.appendChild(errorDiv);
    
    // Show retry button
    document.getElementById('retryOpenCv').style.display = 'inline-block';
}

// Initialize the application
function init() {
    video = document.getElementById('videoElement');
    canvas = document.getElementById('canvasOutput');
    ctx = canvas.getContext('2d');
    
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const retryButton = document.getElementById('retryOpenCv');
    
    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    retryButton.addEventListener('click', retryOpenCvLoading);
    
    // Add configuration control event listeners
    const fovSlider = document.getElementById('fovSlider');
    const depthSlider = document.getElementById('depthSlider');
    const sizeSlider = document.getElementById('sizeSlider');
    
    fovSlider.addEventListener('input', updateFOV);
    depthSlider.addEventListener('input', updateDepth);
    sizeSlider.addEventListener('input', updatePointSize);
    
    // Initialize Three.js
    initThreeJS();
    
    // Handle window resize
    window.addEventListener('resize', resizeThreeRenderer);
    
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCvReady = true;
    } else {
        setTimeout(() => waitForOpenCV(), 100);
    }
}
    
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const projectionToggle = document.getElementById('projectionToggle');
    const orientationToggle = document.getElementById('orientationToggle');
    const retryButton = document.getElementById('retryOpenCv');
    
    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    projectionToggle.addEventListener('click', toggleProjectionMode);
    orientationToggle.addEventListener('click', toggleOrientation);
    retryButton.addEventListener('click', retryOpenCvLoading);
    
    // Add configuration control event listeners
    const fovSlider = document.getElementById('fovSlider');
    const depthSlider = document.getElementById('depthSlider');
    const sizeSlider = document.getElementById('sizeSlider');
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    
    fovSlider.addEventListener('input', updateFOV);
    depthSlider.addEventListener('input', updateDepth);
    sizeSlider.addEventListener('input', updatePointSize);
    sensitivitySlider.addEventListener('input', updateSensitivity);
    
    // Initialize Three.js
    initThreeJS();
    
    // Handle window resize
    window.addEventListener('resize', resizeThreeRenderer);
    
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCvReady = true;
        updateStatus('Ready - Click Start Camera');
    } else {
        updateStatus('Loading OpenCV...');
// Retry OpenCV loading manually
function retryOpenCvLoading() {
    document.getElementById('retryOpenCv').style.display = 'none';
    
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.opencv-error');
    existingErrors.forEach(error => error.remove());
    
    // Try loading OpenCV again
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.onload = onOpenCvReady;
    script.onerror = onOpenCvError;
    document.head.appendChild(script);
}

// Wait for OpenCV to load with retry mechanism
function waitForOpenCV(retries = 0) {
    const maxRetries = 50;
    
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCvReady = true;
        return;
    }
    
    if (retries < maxRetries) {
        setTimeout(() => waitForOpenCV(retries + 1), 200);
    } else {
        console.error('OpenCV failed to load after maximum retries');
        showOpenCvError();
    }
}

// Start camera stream and automatically enable 3D projection and orientation
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        video.srcObject = stream;
        canvas.width = 640;
        canvas.height = 480;
        
        // Automatically enable 3D projection and orientation
        threeContainer.style.display = 'block';
        document.querySelector('.config-controls').style.display = 'flex';
        
        // Request orientation permission and enable listeners
        requestOrientationPermission();
        
        updateButtons(false, true);
        
        // Start processing frames
        processFrame();
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera: ' + error.message);
    }
}

// Stop camera stream
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Clean up OpenCV matrices safely
    try {
        if (src) src.delete();
        if (gray) gray.delete();
        if (corners) corners.delete();
        if (prevGray) prevGray.delete();
        if (prevCorners) prevCorners.delete();
    } catch (error) {
        console.error('Error cleaning up OpenCV matrices:', error);
    }
    
    // Reset tracking data
    currentFeatures = [];
    frameCount = 0;
    
    video.srcObject = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Hide 3D projection
    threeContainer.style.display = 'none';
    document.querySelector('.config-controls').style.display = 'none';
    
    // Disable orientation listeners
    disableOrientationListeners();
    
    updateButtons(true, false);
    updateFeatureCount(0);
}

// Device orientation handling
function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    enableOrientationListeners();
                }
            })
            .catch(console.error);
    } else {
        enableOrientationListeners();
    }
}

function enableOrientationListeners() {
    window.addEventListener('deviceorientation', handleOrientationChange);
}

function disableOrientationListeners() {
    window.removeEventListener('deviceorientation', handleOrientationChange);
    deviceOrientation = { pitch: 0, roll: 0, yaw: 0 };
}

function handleOrientationChange(event) {
    deviceOrientation.pitch = event.beta || 0;
    deviceOrientation.roll = event.gamma || 0;
    deviceOrientation.yaw = event.alpha || 0;
}

// Process each frame
function processFrame() {
    if (!video || video.paused || video.ended) {
        animationId = requestAnimationFrame(processFrame);
        return;
    }
    
    // Always draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Only do feature detection if OpenCV is available
    if (isOpenCvReady && !isProcessing && typeof cv !== 'undefined' && src && gray && corners) {
        detectFeatures();
    } else if (isOpenCvReady && typeof cv !== 'undefined') {
        // Initialize OpenCV matrices
        try {
            src = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
            gray = new cv.Mat();
            corners = new cv.Mat();
            prevGray = new cv.Mat();
            prevCorners = new cv.Mat();
        } catch (error) {
            console.error('Error initializing OpenCV matrices:', error);
        }
    }
    
    animationId = requestAnimationFrame(processFrame);
}

// Detect features using OpenCV
function detectFeatures() {
    if (isProcessing) return;
    
    isProcessing = true;
    
    try {
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        src.data.set(imageData.data);
        
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        
        // Detect corner features
        cv.goodFeaturesToTrack(gray, corners, maxCorners, qualityLevel, minDistance, new cv.Mat(), blockSize, useHarrisDetector, k);
        
        // Convert corners to JavaScript array
        currentFeatures = [];
        for (let i = 0; i < corners.rows; i++) {
            const x = corners.data32F[i * 2];
            const y = corners.data32F[i * 2 + 1];
            currentFeatures.push({ x, y });
        }
        
        // Draw feature points
        drawFeaturePoints();
        
        // Update 3D visualization
        convertFeaturePointsTo3D();
        updateFeaturePoints3D();
        
        // Update UI
        updateFeatureCount(currentFeatures.length);
        
        frameCount++;
        
    } catch (error) {
        console.error('Error in feature detection:', error);
    } finally {
        isProcessing = false;
    }
}

// Draw feature points on canvas
function drawFeaturePoints() {
    currentFeatures.forEach((feature, index) => {
        ctx.beginPath();
        ctx.arc(feature.x, feature.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff88';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

// Update UI elements
function updateButtons(startEnabled, stopEnabled) {
    document.getElementById('startButton').disabled = !startEnabled;
    document.getElementById('stopButton').disabled = !stopEnabled;
}

function updateFeatureCount(count) {
    document.getElementById('featureCount').textContent = `Features: ${count}`;
}

// Configuration update functions
function updateFOV() {
    const fovSlider = document.getElementById('fovSlider');
    const fovValue = document.getElementById('fovValue');
    config.fov = parseInt(fovSlider.value);
    fovValue.textContent = config.fov;
    
    if (threeCamera) {
        threeCamera.fov = config.fov;
        threeCamera.updateProjectionMatrix();
    }
}

function updateDepth() {
    const depthSlider = document.getElementById('depthSlider');
    const depthValue = document.getElementById('depthValue');
    config.featureDepth = parseInt(depthSlider.value);
    depthValue.textContent = config.featureDepth;
}

function updatePointSize() {
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    config.pointSize = parseFloat(sizeSlider.value);
    sizeValue.textContent = config.pointSize;
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);