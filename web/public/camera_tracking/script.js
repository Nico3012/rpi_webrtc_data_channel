let video, canvas, ctx;
let stream = null;
let isOpenCvReady = false;
let isProcessing = false;
let animationId = null;

// OpenCV matrices
let src, gray, corners, prevGray, prevCorners;

// Feature tracking
let previousFeatures = [];
let currentFeatures = [];
let featureMovements = [];
let frameCount = 0;
let trackedFeatures = new Map(); // Store feature history with colors
let nextFeatureId = 0;

// Visual parameters
const trailDuration = 1000; // 1 second in milliseconds
const maxTrailPoints = 30; // Maximum trail points per feature (assuming 30 FPS)

// Feature detection parameters
const maxCorners = 100;
const qualityLevel = 0.01;
const minDistance = 10;
const blockSize = 3;
const useHarrisDetector = false;
const k = 0.04;

// Movement tracking parameters
const matchingThreshold = 15; // pixels - max distance to consider points as matching

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
                    prevGray = new cv.Mat();
                    prevCorners = new cv.Mat();
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
        if (prevGray && typeof prevGray.delete === 'function') prevGray.delete();
        if (prevCorners && typeof prevCorners.delete === 'function') prevCorners.delete();
        src = gray = corners = prevGray = prevCorners = null;
    } catch (error) {
        console.warn('Error cleaning up OpenCV matrices:', error);
    }
    
    // Reset tracking data
    previousFeatures = [];
    currentFeatures = [];
    featureMovements = [];
    frameCount = 0;
    trackedFeatures.clear();
    nextFeatureId = 0;
    
    video.srcObject = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateButtons(true, false);
    updateStatus('Camera stopped');
    updateFeatureCount(0);
    updateMovementDisplay([]);
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
            
            // Store previous frame data if available
            if (frameCount > 0 && gray.rows > 0) {
                gray.copyTo(prevGray);
                corners.copyTo(prevCorners);
                previousFeatures = [...currentFeatures];
            }
            
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
            
            // Extract current features
            currentFeatures = [];
            for (let i = 0; i < corners.rows; i++) {
                currentFeatures.push({
                    x: corners.data32F[i * 2],
                    y: corners.data32F[i * 2 + 1],
                    trackedId: null // Will be assigned during matching
                });
            }
            
            // Calculate movements if we have previous features
            if (frameCount > 0 && previousFeatures.length > 0) {
                featureMovements = calculateFeatureMovements(previousFeatures, currentFeatures);
                updateMovementDisplay(featureMovements);
            }
            
            // Draw feature points on top of the video
            drawFeaturePoints();
            
            updateFeatureCount(corners.rows);
            frameCount++;
            
        } catch (error) {
            console.error('Error processing frame:', error);
            updateStatus('Error processing frame - Feature detection disabled');
            isOpenCvReady = false; // Disable OpenCV processing
        }
        
        isProcessing = false;
    } else if (!isOpenCvReady) {
        // Update feature count to 0 when OpenCV is not available
        updateFeatureCount(0);
        updateMovementDisplay([]);
    }
    
    // Schedule next frame
    animationId = requestAnimationFrame(processFrame);
}

// Draw feature points on canvas
function drawFeaturePoints() {
    const currentTime = Date.now();
    
    // Draw trails for all tracked features
    for (const [id, feature] of trackedFeatures.entries()) {
        if (feature.trail.length < 2) continue;
        
        const baseColor = feature.color;
        
        // Draw trail as connected lines with fading alpha
        for (let i = 1; i < feature.trail.length; i++) {
            const prevPoint = feature.trail[i - 1];
            const currPoint = feature.trail[i];
            
            // Calculate alpha based on age (newer = more opaque)
            const age = currentTime - currPoint.timestamp;
            const alpha = Math.max(0, 1 - (age / trailDuration));
            
            if (alpha <= 0) continue;
            
            // Draw line segment
            ctx.strokeStyle = hexToRgba(baseColor, alpha * 0.7);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(currPoint.x, currPoint.y);
            ctx.stroke();
            
            // Draw trail point
            ctx.fillStyle = hexToRgba(baseColor, alpha * 0.5);
            ctx.beginPath();
            ctx.arc(currPoint.x, currPoint.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    // Draw current feature points on top
    for (let i = 0; i < corners.rows; i++) {
        const x = corners.data32F[i * 2];
        const y = corners.data32F[i * 2 + 1];
        
        // Find the corresponding tracked feature
        const feature = currentFeatures[i];
        let color = '#00ff00'; // Default green for new points
        let isTracked = false;
        
        if (feature && feature.trackedId !== null && trackedFeatures.has(feature.trackedId)) {
            const trackedFeature = trackedFeatures.get(feature.trackedId);
            color = trackedFeature.color;
            isTracked = true;
        }
        
        // Draw main feature point
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        
        // Draw a larger circle for current position
        ctx.beginPath();
        ctx.arc(x, y, isTracked ? 5 : 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw outer ring for better visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, isTracked ? 6 : 5, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw cross for better visibility
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
        
        // Draw ID for tracked points
        if (isTracked) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x - 12, y - 22, 24, 14);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`P${feature.trackedId}`, x, y - 12);
        }
    }
}

// Generate a unique color for each feature point
function generateFeatureColor(id) {
    const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#FF8000', '#8000FF', '#0080FF', '#FF0080', '#80FF00', '#0040FF',
        '#FF4000', '#4000FF', '#00FF40', '#FF0040', '#40FF00', '#0020FF',
        '#FF6000', '#6000FF', '#00FF60', '#FF0060', '#60FF00', '#0060FF',
        '#FF8040', '#8040FF', '#40FF80', '#FF4080', '#80FF40', '#4080FF'
    ];
    return colors[id % colors.length];
}

// Convert hex color to rgba with alpha
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Calculate feature movements between frames
function calculateFeatureMovements(prevFeatures, currFeatures) {
    const movements = [];
    const currentTime = Date.now();
    
    // Match current features with previous features based on proximity
    for (let i = 0; i < currFeatures.length; i++) {
        const curr = currFeatures[i];
        let bestMatch = null;
        let bestDistance = Infinity;
        let bestIndex = -1;
        
        // Find the closest previous feature
        for (let j = 0; j < prevFeatures.length; j++) {
            const prev = prevFeatures[j];
            if (prev.matched) continue; // Skip already matched features
            
            const distance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            
            if (distance < bestDistance && distance < matchingThreshold) {
                bestDistance = distance;
                bestMatch = prev;
                bestIndex = j;
            }
        }
        
        // If we found a match, update existing tracked feature
        if (bestMatch && bestMatch.trackedId !== undefined) {
            prevFeatures[bestIndex].matched = true; // Mark as matched
            const dx = curr.x - bestMatch.x;
            const dy = curr.y - bestMatch.y;
            
            // Update tracked feature with new position
            if (trackedFeatures.has(bestMatch.trackedId)) {
                const trackedFeature = trackedFeatures.get(bestMatch.trackedId);
                
                // Add current position to trail
                trackedFeature.trail.push({
                    x: curr.x,
                    y: curr.y,
                    timestamp: currentTime
                });
                
                // Remove old trail points (older than 1 second)
                trackedFeature.trail = trackedFeature.trail.filter(
                    point => currentTime - point.timestamp <= trailDuration
                );
                
                // Limit trail length
                if (trackedFeature.trail.length > maxTrailPoints) {
                    trackedFeature.trail = trackedFeature.trail.slice(-maxTrailPoints);
                }
                
                trackedFeature.currentX = curr.x;
                trackedFeature.currentY = curr.y;
                trackedFeature.lastSeen = currentTime;
            }
            
            movements.push({
                id: bestMatch.trackedId,
                prevX: Math.round(bestMatch.x * 10) / 10,
                prevY: Math.round(bestMatch.y * 10) / 10,
                currX: Math.round(curr.x * 10) / 10,
                currY: Math.round(curr.y * 10) / 10,
                dx: Math.round(dx * 10) / 10,
                dy: Math.round(dy * 10) / 10,
                distance: Math.round(bestDistance * 10) / 10
            });
            
            curr.trackedId = bestMatch.trackedId;
        } else {
            // New feature - create a new tracked feature
            const newId = nextFeatureId++;
            trackedFeatures.set(newId, {
                id: newId,
                color: generateFeatureColor(newId),
                trail: [{
                    x: curr.x,
                    y: curr.y,
                    timestamp: currentTime
                }],
                currentX: curr.x,
                currentY: curr.y,
                lastSeen: currentTime
            });
            curr.trackedId = newId;
        }
    }
    
    // Clean up old tracked features (not seen for more than trail duration)
    for (const [id, feature] of trackedFeatures.entries()) {
        if (currentTime - feature.lastSeen > trailDuration) {
            trackedFeatures.delete(id);
        }
    }
    
    // Reset matched flags for next frame
    prevFeatures.forEach(feature => feature.matched = false);
    
    return movements;
}

// Update the movement display
function updateMovementDisplay(movements) {
    const movementList = document.getElementById('movementList');
    
    if (movements.length === 0) {
        movementList.innerHTML = '<p class="no-data">No movement data available</p>';
        return;
    }
    
    let html = '';
    movements.forEach(movement => {
        const dxClass = movement.dx > 0 ? 'positive-x' : movement.dx < 0 ? 'negative-x' : '';
        const dyClass = movement.dy > 0 ? 'positive-x' : movement.dy < 0 ? 'negative-x' : '';
        
        // Get the color for this tracked feature
        const trackedFeature = trackedFeatures.get(movement.id);
        const featureColor = trackedFeature ? trackedFeature.color : '#666666';
        
        html += `
            <div class="movement-item">
                <span class="point-id" style="color: ${featureColor}; border-left: 4px solid ${featureColor}; padding-left: 8px;">P${movement.id}</span>
                <span class="coordinates">
                    (${movement.prevX}, ${movement.prevY}) → (${movement.currX}, ${movement.currY})
                </span>
                <span class="movement">
                    Δx: <span class="${dxClass}">${movement.dx > 0 ? '+' : ''}${movement.dx}</span>, 
                    Δy: <span class="${dyClass}">${movement.dy > 0 ? '+' : ''}${movement.dy}</span>
                </span>
            </div>
        `;
    });
    
    movementList.innerHTML = html;
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