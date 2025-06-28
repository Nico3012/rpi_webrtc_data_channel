let video, canvas, ctx;
let stream = null;
let isOpenCvReady = false;
let isProcessing = false;
let animationId = null;

// OpenCV matrices
let src, gray, corners;

// Feature detection parameters
const maxCorners = 100;
const qualityLevel = 0.01;
const minDistance = 10;
const blockSize = 3;
const useHarrisDetector = false;
const k = 0.04;

// Initialize when OpenCV is ready
function onOpenCvReady() {
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCvReady = true;
        updateStatus('OpenCV loaded successfully');
        console.log('OpenCV.js is ready');
    } else {
        console.error('OpenCV failed to load properly');
        updateStatus('Error: OpenCV failed to load');
    }
}

// Handle OpenCV loading errors
function onOpenCvError() {
    console.error('Failed to load OpenCV script');
    updateStatus('Error: Failed to load OpenCV. Trying alternative source...');
    
    // Try loading from alternative CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/opencv.js@1.2.1/opencv.js';
    script.onload = onOpenCvReady;
    script.onerror = () => {
        console.error('All OpenCV sources failed');
        updateStatus('Error: Could not load OpenCV from any source');
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
    
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCvReady = true;
        updateStatus('Ready - Click Start Camera');
    } else {
        updateStatus('Loading OpenCV...');
        // Wait for OpenCV to load with timeout
        waitForOpenCV();
    }
}

// Retry OpenCV loading manually
function retryOpenCvLoading() {
    updateStatus('Retrying OpenCV loading...');
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
    const maxRetries = 50; // 10 seconds max wait time
    
    if (typeof cv !== 'undefined' && cv.Mat) {
        isOpenCvReady = true;
        updateStatus('Ready - Click Start Camera');
        console.log('OpenCV loaded successfully');
        return;
    }
    
    if (retries < maxRetries) {
        setTimeout(() => waitForOpenCV(retries + 1), 200);
    } else {
        updateStatus('Error: OpenCV failed to load. Please refresh the page.');
        console.error('OpenCV failed to load after maximum retries');
    }
}

// Start camera stream
async function startCamera() {
    try {
        updateStatus('Requesting camera access...');
        
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Initialize OpenCV matrices only if OpenCV is ready
            if (isOpenCvReady && typeof cv !== 'undefined') {
                try {
                    src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
                    gray = new cv.Mat();
                    corners = new cv.Mat();
                    console.log('OpenCV matrices initialized successfully');
                    updateStatus('Camera started - Feature detection enabled');
                } catch (error) {
                    console.error('Error initializing OpenCV matrices:', error);
                    updateStatus('Camera started - Feature detection disabled');
                    isOpenCvReady = false;
                }
            } else {
                updateStatus('Camera started - Feature detection disabled (OpenCV not loaded)');
            }
            
            updateButtons(false, true);
            
            // Start processing (will work with or without OpenCV)
            processFrame();
        };
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        updateStatus('Error: Could not access camera');
        alert('Could not access camera. Please ensure you have granted camera permissions.');
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
        if (src && typeof src.delete === 'function') src.delete();
        if (gray && typeof gray.delete === 'function') gray.delete();
        if (corners && typeof corners.delete === 'function') corners.delete();
        src = gray = corners = null;
    } catch (error) {
        console.warn('Error cleaning up OpenCV matrices:', error);
    }
    
    video.srcObject = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateButtons(true, false);
    updateStatus('Camera stopped');
    updateFeatureCount(0);
}

// Process each frame
function processFrame() {
    if (!video || video.paused || video.ended) {
        return;
    }
    
    // Always draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Only do feature detection if OpenCV is available
    if (isOpenCvReady && !isProcessing && typeof cv !== 'undefined' && src && gray && corners) {
        isProcessing = true;
        
        try {
            // Get image data for OpenCV processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Convert to OpenCV Mat
            src.data.set(imageData.data);
            
            // Convert to grayscale
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            // Detect corners using goodFeaturesToTrack
            cv.goodFeaturesToTrack(
                gray,
                corners,
                maxCorners,
                qualityLevel,
                minDistance,
                new cv.Mat(),
                blockSize,
                useHarrisDetector,
                k
            );
            
            // Draw feature points on top of the video
            drawFeaturePoints();
            
            updateFeatureCount(corners.rows);
            
        } catch (error) {
            console.error('Error processing frame:', error);
            updateStatus('Error processing frame - Feature detection disabled');
            isOpenCvReady = false; // Disable OpenCV processing
        }
        
        isProcessing = false;
    } else if (!isOpenCvReady) {
        // Update feature count to 0 when OpenCV is not available
        updateFeatureCount(0);
    }
    
    // Schedule next frame
    animationId = requestAnimationFrame(processFrame);
}

// Draw feature points on canvas
function drawFeaturePoints() {
    if (corners.rows === 0) return;
    
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    // Draw each corner point
    for (let i = 0; i < corners.rows; i++) {
        const x = corners.data32F[i * 2];
        const y = corners.data32F[i * 2 + 1];
        
        // Draw a small circle for each feature point
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw a small cross for better visibility
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
    }
}

// Update UI elements
function updateButtons(startEnabled, stopEnabled) {
    document.getElementById('startButton').disabled = !startEnabled;
    document.getElementById('stopButton').disabled = !stopEnabled;
}

function updateStatus(message) {
    document.getElementById('status').textContent = `Status: ${message}`;
}

function updateFeatureCount(count) {
    document.getElementById('featureCount').textContent = `Features: ${count}`;
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);