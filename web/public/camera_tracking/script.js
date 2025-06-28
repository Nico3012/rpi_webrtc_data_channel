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
let trackedFeatures = new Map();
let nextFeatureId = 0;

// 2D Projection variables
let projectionMode = false;
let orientationEnabled = false;
let deviceOrientation = { pitch: 0, roll: 0, yaw: 0 };

// Three.js variables
let threeScene, threeCamera, threeRenderer;
let threeContainer;
let featurePoints3D = []; // 3D representations of OpenCV feature points
let featurePointsMesh; // Three.js mesh for the points

// Configurable parameters
let config = {
    fov: 75,
    featureDepth: 10,
    pointSize: 0.1,
    sensitivity: 0.5
};

// Visual parameters
const trailDuration = 1000;
const maxTrailPoints = 30;

// Feature detection parameters
const maxCorners = 100;
const qualityLevel = 0.01;
const minDistance = 10;
const blockSize = 3;
const useHarrisDetector = false;
const k = 0.04;

// Movement tracking parameters
const matchingThreshold = 15;

// Initialize Three.js scene
function initThreeJS() {
    threeContainer = document.getElementById('threeContainer');
    
    // Create scene
    threeScene = new THREE.Scene();
    
    // Create camera with configurable FOV
    threeCamera = new THREE.PerspectiveCamera(config.fov, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 1000);
    threeCamera.position.set(0, 0, 0); // Camera at origin
    threeCamera.rotation.set(0, 0, 0); // Looking down negative Z axis initially
    
    // Create renderer
    threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    threeRenderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    threeRenderer.setClearColor(0x000000, 0); // Transparent background
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
        const y = -((feature.y / canvasHeight) * 2 - 1); // Flip Y axis
        
        // Project to 3D space at fixed depth using configurable FOV
        const fov = THREE.MathUtils.degToRad(config.fov);
        const aspectRatio = canvasWidth / canvasHeight;
        const halfHeight = Math.tan(fov / 2) * config.featureDepth;
        const halfWidth = halfHeight * aspectRatio;
        
        return new THREE.Vector3(
            x * halfWidth,
            y * halfHeight,
            -config.featureDepth // Negative Z is forward in Three.js
        );
    });
}

// Create or update 3D feature points visualization (no trails, only current points)
function updateFeaturePoints3D() {
    // Remove existing points and lines
    if (featurePointsMesh) {
        threeScene.remove(featurePointsMesh);
        featurePointsMesh.geometry.dispose();
        featurePointsMesh.material.dispose();
        featurePointsMesh = null;
    }
    
    // Remove any existing line segments
    const linesToRemove = [];
    threeScene.traverse((child) => {
        if (child instanceof THREE.LineSegments) {
            linesToRemove.push(child);
        }
    });
    linesToRemove.forEach(line => {
        threeScene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
    });
    
    if (featurePoints3D.length === 0) return;
    
    // Create geometry from current 3D points only
    const geometry = new THREE.BufferGeometry().setFromPoints(featurePoints3D);
    
    // Create material for points with configurable size
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
    if (!projectionMode || !orientationEnabled) {
        // When orientation is disabled, keep camera looking straight ahead
        threeCamera.rotation.set(0, 0, 0);
        return;
    }
    
    const { pitch, roll } = deviceOrientation;
    
    // Convert device orientation to camera rotation with configurable sensitivity
    // Pitch controls looking up/down (X-axis rotation) - NORMAL DIRECTION
    // Roll controls looking left/right (Y-axis rotation)
    threeCamera.rotation.set(
        THREE.MathUtils.degToRad(pitch * config.sensitivity), // X-axis (pitch) - NORMAL DIRECTION
        THREE.MathUtils.degToRad(-roll * config.sensitivity), // Y-axis (yaw from roll)
        0                                                     // Z-axis (no rotation)
    );
}

// Three.js render loop
function animateThree() {
    if (!projectionMode || !threeRenderer || !threeScene || !threeCamera) {
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
            
            // Resize Three.js renderer to match video
            resizeThreeRenderer();
            
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

// Old 2D projection functions replaced with Three.js implementation above

// Device orientation handling
function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ permission request
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    enableOrientationListeners();
                } else {
                    updateStatus('Orientation permission denied');
                }
            })
            .catch(error => {
                console.error('Error requesting orientation permission:', error);
                updateStatus('Error requesting orientation permission');
            });
    } else {
        // For other browsers, just enable listeners
        enableOrientationListeners();
    }
}

function enableOrientationListeners() {
    window.addEventListener('deviceorientation', handleOrientationChange);
    orientationEnabled = true;
    updateOrientationButton();
    updateStatus('Orientation tracking enabled');
}

function disableOrientationListeners() {
    window.removeEventListener('deviceorientation', handleOrientationChange);
    orientationEnabled = false;
    deviceOrientation = { pitch: 0, roll: 0, yaw: 0 };
    updateOrientationButton();
    updateOrientationDisplay();
    updateStatus('Orientation tracking disabled');
}

function handleOrientationChange(event) {
    if (!orientationEnabled) return;
    
    // Get orientation values (adjusting for different browser implementations)
    deviceOrientation.pitch = event.beta || 0;   // X-axis rotation (-180 to 180)
    deviceOrientation.roll = event.gamma || 0;   // Y-axis rotation (-90 to 90)
    deviceOrientation.yaw = event.alpha || 0;    // Z-axis rotation (0 to 360)
    
    updateOrientationDisplay();
}

// Process each frame
function processFrame() {
    if (!video || video.paused || video.ended) {
        return;
    }
    
    // Always draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Three.js handles 3D projection rendering automatically
    
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
            
            // Draw feature points on top of the video (2D canvas overlay)
            if (!projectionMode) {
                drawFeaturePoints();
            }
            
            // Update 3D feature points for projection mode
            if (projectionMode) {
                convertFeaturePointsTo3D();
                updateFeaturePoints3D();
            }
            
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
        
        // Clear 3D feature points if in projection mode
        if (projectionMode) {
            featurePoints3D = [];
            updateFeaturePoints3D();
        }
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

// Toggle projection mode
function toggleProjectionMode() {
    projectionMode = !projectionMode;
    const button = document.getElementById('projectionToggle');
    const orientationButton = document.getElementById('orientationToggle');
    const configControls = document.querySelector('.config-controls');
    
    if (projectionMode) {
        button.textContent = 'Disable 3D Projection';
        button.classList.add('active');
        orientationButton.disabled = false;
        
        // Show configuration controls
        configControls.style.display = 'flex';
        
        // Show Three.js container
        threeContainer.style.display = 'block';
        
        // Ensure proper sizing
        resizeThreeRenderer();
        
        // Force render once to make grid visible
        if (threeRenderer && threeScene && threeCamera) {
            threeRenderer.render(threeScene, threeCamera);
        }
        
        updateStatus('3D Projection enabled - Feature points will be visualized');
    } else {
        button.textContent = 'Enable 3D Projection';
        button.classList.remove('active');
        orientationButton.disabled = true;
        
        // Hide configuration controls
        configControls.style.display = 'none';
        
        // Hide Three.js container
        threeContainer.style.display = 'none';
        
        if (orientationEnabled) {
            disableOrientationListeners();
        }
        updateStatus('3D Projection disabled');
    }
}

// Toggle orientation tracking
function toggleOrientation() {
    if (!projectionMode) return;
    
    if (orientationEnabled) {
        disableOrientationListeners();
    } else {
        requestOrientationPermission();
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

function updateOrientationDisplay() {
    const { pitch, roll } = deviceOrientation;
    document.getElementById('orientationData').textContent = 
        `Pitch: ${Math.round(pitch)}° Roll: ${Math.round(roll)}°`;
}

function updateOrientationButton() {
    const button = document.getElementById('orientationToggle');
    if (orientationEnabled) {
        button.textContent = 'Disable Orientation';
        button.classList.add('active');
    } else {
        button.textContent = 'Enable Orientation';
        button.classList.remove('active');
    }
}

// Configuration update functions
function updateFOV() {
    const fovSlider = document.getElementById('fovSlider');
    const fovValue = document.getElementById('fovValue');
    
    config.fov = parseInt(fovSlider.value);
    fovValue.textContent = config.fov;
    
    // Update Three.js camera FOV
    if (threeCamera) {
        threeCamera.fov = config.fov;
        threeCamera.updateProjectionMatrix();
    }
    
    // Recompute 3D points with new FOV
    if (projectionMode && currentFeatures.length > 0) {
        convertFeaturePointsTo3D();
        updateFeaturePoints3D();
    }
}

function updateDepth() {
    const depthSlider = document.getElementById('depthSlider');
    const depthValue = document.getElementById('depthValue');
    
    config.featureDepth = parseInt(depthSlider.value);
    depthValue.textContent = config.featureDepth;
    
    // Recompute 3D points with new depth
    if (projectionMode && currentFeatures.length > 0) {
        convertFeaturePointsTo3D();
        updateFeaturePoints3D();
    }
}

function updatePointSize() {
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    
    config.pointSize = parseFloat(sizeSlider.value);
    sizeValue.textContent = config.pointSize;
    
    // Update Three.js point size
    if (featurePointsMesh && featurePointsMesh.material) {
        featurePointsMesh.material.size = config.pointSize;
    }
}

function updateSensitivity() {
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    const sensitivityValue = document.getElementById('sensitivityValue');
    
    config.sensitivity = parseFloat(sensitivitySlider.value);
    sensitivityValue.textContent = config.sensitivity;
    
    // Camera rotation will be updated automatically in the next frame
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
    if (orientationEnabled) {
        disableOrientationListeners();
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);