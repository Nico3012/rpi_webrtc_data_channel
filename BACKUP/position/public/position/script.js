class FeaturePointDetector {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.toggleRotationBtn = document.getElementById('toggleRotationBtn');
        this.fovSlider = document.getElementById('fovSlider');
        this.depthSlider = document.getElementById('depthSlider');
        this.invertPitchCheckbox = document.getElementById('invertPitchCheckbox');
        this.invertRollCheckbox = document.getElementById('invertRollCheckbox');
        this.featureCount = document.getElementById('featureCount');
        this.status = document.getElementById('status');
        this.fovValue = document.getElementById('fovValue');
        this.depthValue = document.getElementById('depthValue');
        this.deviceRotation = document.getElementById('deviceRotation');
        this.averageSpeed = document.getElementById('averageSpeed');
        this.positionX = document.getElementById('positionX');
        this.positionY = document.getElementById('positionY');
        this.resetPositionBtn = document.getElementById('resetPositionBtn');
        
        this.stream = null;
        this.animationId = null;
        this.isOpenCvReady = false;
        this.isProcessing = false;
        this.useDeviceRotation = false;
        
        // Device orientation data
        this.devicePitch = 0;
        this.deviceRoll = 0;
        this.deviceOrientationSupported = false;
        
        // 3D Camera instance
        this.camera3D = null;
        
        // Video scaling factors for responsive display
        this.scaleX = 1;
        this.scaleY = 1;
        
        // Feature point tracking and velocity calculation
        this.previousFeaturePoints = []; // Store previous frame's transformed points
        this.lastFrameTime = Date.now();
        this.currentPosition = { x: 0, y: 0 }; // Integrated position
        this.averageVelocity = { x: 0, y: 0 }; // Current average velocity in pixels/sec
        this.velocityHistory = []; // Store velocity history for smoothing
        this.maxVelocityHistory = 10; // Number of frames to average
        
        // Translation tracking for Method 1 (Track Compensation Offset)
        this.previousTranslation = null; // Store previous frame's translation offset
        this.useTranslationTracking = true; // Use the new tracking method
        
        this.setupEventListeners();
        this.initializeDeviceOrientation();
        this.updateStatus('Waiting for OpenCV...', 'loading');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.toggleRotationBtn.addEventListener('click', () => this.toggleDeviceRotation());
        this.resetPositionBtn.addEventListener('click', () => this.resetPosition());
        
        // Slider event listeners
        this.fovSlider.addEventListener('input', (e) => {
            this.fovValue.textContent = e.target.value;
            if (this.camera3D) {
                this.camera3D.camera.fov = parseFloat(e.target.value);
                this.camera3D.camera.updateProjectionMatrix();
            }
        });
        
        this.depthSlider.addEventListener('input', (e) => {
            this.depthValue.textContent = e.target.value;
            if (this.camera3D) {
                this.camera3D.setDepth(parseFloat(e.target.value));
            }
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Get the displayed video dimensions (scaled by CSS)
            const videoRect = this.video.getBoundingClientRect();
            const displayWidth = videoRect.width;
            const displayHeight = videoRect.height;
            
            // Calculate scaling factors for drawing coordinates
            this.scaleX = displayWidth / this.video.videoWidth;
            this.scaleY = displayHeight / this.video.videoHeight;
            
            console.log(`Video: ${this.video.videoWidth}x${this.video.videoHeight}, Display: ${displayWidth.toFixed(1)}x${displayHeight.toFixed(1)}, Scale: ${this.scaleX.toFixed(3)}x${this.scaleY.toFixed(3)}`);
            
            // Initialize 3D camera with actual video dimensions (not display dimensions)
            this.camera3D = new Camera3D(
                this.video.videoWidth,
                this.video.videoHeight,
                parseFloat(this.fovSlider.value),
                parseFloat(this.depthSlider.value)
            );
        });
    }
    
    initializeDeviceOrientation() {
        // Check if device orientation is supported
        if ('DeviceOrientationEvent' in window) {
            // Request permission for iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            this.setupDeviceOrientation();
                        } else {
                            console.log('Device orientation permission denied');
                        }
                    })
                    .catch(console.error);
            } else {
                // For other browsers
                this.setupDeviceOrientation();
            }
        } else {
            console.log('Device orientation not supported');
        }
    }
    
    setupDeviceOrientation() {
        window.addEventListener('deviceorientation', (event) => {
            // Use actual device orientation values without artificial amplification
            const pitchDegrees = event.beta || 0;
            const rollDegrees = event.gamma || 0;
            
            // Convert to radians without artificial amplification
            this.devicePitch = pitchDegrees * (Math.PI / 180);
            this.deviceRoll = rollDegrees * (Math.PI / 180);
            
            // Update display
            this.deviceRotation.textContent = `Pitch: ${pitchDegrees.toFixed(1)}°, Roll: ${rollDegrees.toFixed(1)}°`;
            
            this.deviceOrientationSupported = true;
            
            // Debug: Log rotation values
            console.log(`Device rotation - Pitch: ${this.devicePitch.toFixed(3)} rad, Roll: ${this.deviceRoll.toFixed(3)} rad`);
        });
        
        // Enable the toggle button after a short delay to allow for initial readings
        setTimeout(() => {
            if (this.deviceOrientationSupported) {
                this.toggleRotationBtn.disabled = false;
            }
        }, 1000);
    }
    
    toggleDeviceRotation() {
        this.useDeviceRotation = !this.useDeviceRotation;
        
        if (this.useDeviceRotation) {
            this.toggleRotationBtn.textContent = 'Disable Device Rotation';
            this.toggleRotationBtn.classList.add('enabled');
        } else {
            this.toggleRotationBtn.textContent = 'Enable Device Rotation';
            this.toggleRotationBtn.classList.remove('enabled');
        }
    }
    
    updateStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = type;
    }
    
    async startCamera() {
        if (!this.isOpenCvReady) {
            this.updateStatus('OpenCV not ready yet', 'error');
            return;
        }
        
        try {
            this.updateStatus('Requesting camera access...', 'loading');
            
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                }
            });

            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                
                // Get the displayed video dimensions (scaled by CSS)
                const videoRect = this.video.getBoundingClientRect();
                const displayWidth = videoRect.width;
                const displayHeight = videoRect.height;
                
                // Calculate scaling factors for drawing coordinates
                this.scaleX = displayWidth / this.video.videoWidth;
                this.scaleY = displayHeight / this.video.videoHeight;
                
                console.log(`Actual Video Resolution: ${this.video.videoWidth}x${this.video.videoHeight}`);
                console.log(`Display Size: ${displayWidth.toFixed(1)}x${displayHeight.toFixed(1)}`);
                console.log(`Scale Factors: ${this.scaleX.toFixed(3)}x${this.scaleY.toFixed(3)}`);
                
                // Initialize 3D camera with actual video dimensions chosen by browser
                this.camera3D = new Camera3D(
                    this.video.videoWidth,
                    this.video.videoHeight,
                    parseFloat(this.fovSlider.value),
                    parseFloat(this.depthSlider.value)
                );
                
                this.updateStatus('Camera started', '');
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.resetPositionBtn.disabled = false;
                this.startProcessing();
            };
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.updateStatus('Camera access denied', 'error');
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.featureCount.textContent = '0';
        this.updateStatus('Camera stopped', '');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.resetPositionBtn.disabled = true;
        
        // Reset device rotation toggle
        this.useDeviceRotation = false;
        this.toggleRotationBtn.textContent = 'Enable Device Rotation';
        this.toggleRotationBtn.classList.remove('enabled');
        this.toggleRotationBtn.disabled = !this.deviceOrientationSupported;
        
        // Reset tracking variables
        this.previousFeaturePoints = [];
        this.previousTranslation = null;
        this.currentPosition = { x: 0, y: 0 };
        this.averageVelocity = { x: 0, y: 0 };
        this.velocityHistory = [];
        this.updatePositionDisplay();
    }
    
    startProcessing() {
        const processFrame = () => {
            if (this.video.readyState === this.video.HAVE_ENOUGH_DATA && !this.isProcessing) {
                this.detectFeatures();
            }
            this.animationId = requestAnimationFrame(processFrame);
        };
        processFrame();
    }
    
    detectFeatures() {
        if (!this.isOpenCvReady || !this.camera3D) return;
        
        this.isProcessing = true;
        
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Create OpenCV matrices
            const src = new cv.Mat(this.video.videoHeight, this.video.videoWidth, cv.CV_8UC4);
            const gray = new cv.Mat();
            const corners = new cv.Mat();
            
            // Capture frame from video
            this.ctx.drawImage(this.video, 0, 0);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            src.data.set(imageData.data);
            
            // Convert to grayscale
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            // Detect good features to track (corner detection)
            const maxCorners = 100;
            const qualityLevel = 0.01;
            const minDistance = 10;
            const mask = new cv.Mat();
            const blockSize = 3;
            const useHarrisDetector = false;
            const k = 0.04;
            
            cv.goodFeaturesToTrack(
                gray,
                corners,
                maxCorners,
                qualityLevel,
                minDistance,
                mask,
                blockSize,
                useHarrisDetector,
                k
            );
            
            // Clear canvas again before drawing features
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Process feature points
            const numCorners = corners.rows;
            this.featureCount.textContent = numCorners.toString();
            
            // Collect feature points for 3D transformation
            const featurePoints = [];
            for (let i = 0; i < numCorners; i++) {
                const x = corners.data32F[i * 2];
                const y = corners.data32F[i * 2 + 1];
                featurePoints.push({ x, y });
            }
            
            // Always draw original points in green first
            this.drawFeaturePoints(featurePoints, false);
            
            // If device rotation is enabled, also draw transformed points in orange
            if (this.useDeviceRotation && this.deviceOrientationSupported) {
                const transformedPoints = this.transformFeaturePoints(featurePoints);
                this.drawFeaturePoints(transformedPoints, true);
                
                // Use Method 1: Track translation offset between original and transformed points
                if (this.useTranslationTracking) {
                    this.trackTranslationalMotion(featurePoints, transformedPoints);
                } else {
                    // Fallback to old method
                    this.trackFeaturePointVelocities(transformedPoints);
                }
                
                this.featureCount.textContent = `${numCorners} (${transformedPoints.length} visible after transform)`;
            } else {
                this.featureCount.textContent = numCorners.toString();
                // Reset tracking when device rotation is disabled
                this.previousFeaturePoints = [];
                this.previousTranslation = null;
                this.averageVelocity = { x: 0, y: 0 };
                this.updatePositionDisplay();
            }
            
            // Clean up
            src.delete();
            gray.delete();
            corners.delete();
            mask.delete();
            
        } catch (error) {
            console.error('Error processing frame:', error);
            this.updateStatus('Processing error', 'error');
        }
        
        this.isProcessing = false;
    }
    
    transformFeaturePoints(featurePoints) {
        const transformed = [];
        
        // Apply inversion based on checkbox states
        const pitchMultiplier = this.invertPitchCheckbox.checked ? -1 : 1;
        const rollMultiplier = this.invertRollCheckbox.checked ? -1 : 1;
        
        // Add sensitivity control (set to 1.0 for normal sensitivity)
        const sensitivity = 1.0; // Normal sensitivity - can be made configurable later
        
        // Apply the multipliers with sensitivity
        const finalPitch = this.devicePitch * pitchMultiplier * sensitivity;
        const finalRoll = this.deviceRoll * rollMultiplier * sensitivity;
        
        // Debug: Log the device rotation values
        console.log(`Device Pitch: ${this.devicePitch.toFixed(3)} rad (final: ${finalPitch.toFixed(3)}), Roll: ${this.deviceRoll.toFixed(3)} rad (final: ${finalRoll.toFixed(3)})`);
        
        for (const point of featurePoints) {
            // Convert canvas coordinates to center-origin coordinates
            const centerX = point.x - (this.canvas.width / 2);
            const centerY = point.y - (this.canvas.height / 2);
            
            // Debug: Log original center coordinates for first few points
            if (transformed.length < 3) {
                console.log(`Original center coords: ${centerX.toFixed(2)}, ${centerY.toFixed(2)}`);
            }
            
            // Apply 3D transformation with corrected perspective
            const result = this.camera3D.transform2DPoint(
                centerX,
                centerY,
                finalPitch,    // Pitch rotation (rotationX) - tilting up/down
                finalRoll,     // Roll applied as Yaw rotation (rotationY) - rotating left/right like turning a camera
                0,             // No rotation around Z-axis (rotationZ) - this was causing the "steering wheel" effect
                parseFloat(this.depthSlider.value) // Use depth from slider
            );
            
            // Debug: Log transformation result for first few points
            if (transformed.length < 3) {
                console.log(`Transformed result:`, result);
            }
            
            if (result.visible) {
                // Convert back to canvas coordinates
                const transformedPoint = {
                    x: result.x + (this.canvas.width / 2),
                    y: result.y + (this.canvas.height / 2),
                    original: point
                };
                
                // Debug: Log final transformed coordinates for first few points
                if (transformed.length < 3) {
                    console.log(`Final transformed coords: ${transformedPoint.x.toFixed(2)}, ${transformedPoint.y.toFixed(2)}`);
                }
                
                transformed.push(transformedPoint);
            }
        }
        
        console.log(`Original points: ${featurePoints.length}, Transformed visible: ${transformed.length}`);
        return transformed;
    }
    
    drawFeaturePoints(points, isTransformed = false) {
        // Set drawing style based on whether points are transformed
        if (isTransformed) {
            this.ctx.fillStyle = '#ff6b00'; // Orange for transformed points
            this.ctx.strokeStyle = '#ff6b00';
        } else {
            this.ctx.fillStyle = '#00ff00'; // Green for original points
            this.ctx.strokeStyle = '#00ff00';
        }
        
        this.ctx.lineWidth = 2;
        
        for (const point of points) {
            const x = point.x;
            const y = point.y;
            
            // Draw a small circle for each feature point
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw a cross for better visibility
            this.ctx.beginPath();
            this.ctx.moveTo(x - 5, y);
            this.ctx.lineTo(x + 5, y);
            this.ctx.moveTo(x, y - 5);
            this.ctx.lineTo(x, y + 5);
            this.ctx.stroke();
        }
    }
    
    trackFeaturePointVelocities(currentPoints) {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        
        // Skip if delta time is too small (avoid division by very small numbers)
        if (deltaTime < 0.01) {
            return;
        }
        
        const velocities = [];
        const matchingDistance = 30; // Maximum distance in pixels to consider points as matching
        
        // Find matching points between current and previous frames
        for (const currentPoint of currentPoints) {
            let bestMatch = null;
            let bestDistance = Infinity;
            
            // Find the closest point from the previous frame
            for (const prevPoint of this.previousFeaturePoints) {
                const distance = Math.sqrt(
                    Math.pow(currentPoint.x - prevPoint.x, 2) + 
                    Math.pow(currentPoint.y - prevPoint.y, 2)
                );
                
                if (distance < bestDistance && distance < matchingDistance) {
                    bestDistance = distance;
                    bestMatch = prevPoint;
                }
            }
            
            // If we found a matching point, calculate velocity
            if (bestMatch) {
                const velocityX = (currentPoint.x - bestMatch.x) / deltaTime; // pixels/sec
                const velocityY = (currentPoint.y - bestMatch.y) / deltaTime; // pixels/sec
                
                velocities.push({
                    x: velocityX,
                    y: velocityY,
                    magnitude: Math.sqrt(velocityX * velocityX + velocityY * velocityY)
                });
            }
        }
        
        // Calculate average velocity if we have any matching points
        if (velocities.length > 0) {
            const avgVelX = velocities.reduce((sum, vel) => sum + vel.x, 0) / velocities.length;
            const avgVelY = velocities.reduce((sum, vel) => sum + vel.y, 0) / velocities.length;
            
            // Store current average velocity
            this.averageVelocity = { x: avgVelX, y: avgVelY };
            
            // Add to velocity history for smoothing
            this.velocityHistory.push({ x: avgVelX, y: avgVelY, time: currentTime });
            
            // Keep only recent history
            if (this.velocityHistory.length > this.maxVelocityHistory) {
                this.velocityHistory.shift();
            }
            
            // Calculate smoothed velocity
            const smoothedVelocity = this.calculateSmoothedVelocity();
            
            // Integrate velocity to get position change
            this.currentPosition.x += smoothedVelocity.x * deltaTime;
            this.currentPosition.y += smoothedVelocity.y * deltaTime;
            
            // Update display
            this.updatePositionDisplay();
            
            // Debug output
            console.log(`Tracked ${velocities.length}/${currentPoints.length} points, Avg velocity: ${avgVelX.toFixed(2)}, ${avgVelY.toFixed(2)} px/s`);
        }
        
        // Store current points for next frame
        this.previousFeaturePoints = currentPoints.map(point => ({ x: point.x, y: point.y }));
        this.lastFrameTime = currentTime;
    }
    
    // Method 1: Track Compensation Offset
    trackTranslationalMotion(originalPoints, transformedPoints) {
        if (originalPoints.length === 0 || transformedPoints.length === 0) return;
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        
        // Skip if delta time is too small
        if (deltaTime < 0.01) return;
        
        // Calculate center of mass for both point sets
        const originalCenter = this.calculateCenterOfMass(originalPoints);
        const transformedCenter = this.calculateCenterOfMass(transformedPoints);
        
        // The difference between centers shows pure translation (after rotation compensation)
        const translationX = transformedCenter.x - originalCenter.x;
        const translationY = transformedCenter.y - originalCenter.y;
        
        // Track this translation over time
        if (this.previousTranslation) {
            // Calculate velocity of the translation offset
            const velocityX = (translationX - this.previousTranslation.x) / deltaTime;
            const velocityY = (translationY - this.previousTranslation.y) / deltaTime;
            
            // This velocity represents camera movement (negate because camera moves opposite to features)
            this.averageVelocity = { x: -velocityX, y: -velocityY };
            
            // Add to velocity history for smoothing
            this.velocityHistory.push({ x: this.averageVelocity.x, y: this.averageVelocity.y, time: currentTime });
            
            // Keep only recent history
            if (this.velocityHistory.length > this.maxVelocityHistory) {
                this.velocityHistory.shift();
            }
            
            // Calculate smoothed velocity
            const smoothedVelocity = this.calculateSmoothedVelocity();
            
            // Integrate velocity to get position change
            this.currentPosition.x += smoothedVelocity.x * deltaTime;
            this.currentPosition.y += smoothedVelocity.y * deltaTime;
            
            // Update display
            this.updatePositionDisplay();
            
            // Debug output
            console.log(`Translation offset: ${translationX.toFixed(2)}, ${translationY.toFixed(2)}, Camera velocity: ${this.averageVelocity.x.toFixed(2)}, ${this.averageVelocity.y.toFixed(2)} px/s`);
        }
        
        // Store current translation for next frame
        this.previousTranslation = { x: translationX, y: translationY };
        this.lastFrameTime = currentTime;
    }
    
    calculateCenterOfMass(points) {
        if (points.length === 0) return { x: 0, y: 0 };
        
        const sumX = points.reduce((sum, point) => sum + point.x, 0);
        const sumY = points.reduce((sum, point) => sum + point.y, 0);
        
        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }
    
    calculateSmoothedVelocity() {
        if (this.velocityHistory.length === 0) {
            return { x: 0, y: 0 };
        }
        
        // Simple moving average
        const sumX = this.velocityHistory.reduce((sum, vel) => sum + vel.x, 0);
        const sumY = this.velocityHistory.reduce((sum, vel) => sum + vel.y, 0);
        
        return {
            x: sumX / this.velocityHistory.length,
            y: sumY / this.velocityHistory.length
        };
    }
    
    updatePositionDisplay() {
        // Update velocity display with directional components
        this.averageSpeed.textContent = `X: ${this.averageVelocity.x.toFixed(1)}, Y: ${this.averageVelocity.y.toFixed(1)} px/sec`;
        
        // Update position display
        this.positionX.textContent = this.currentPosition.x.toFixed(1);
        this.positionY.textContent = this.currentPosition.y.toFixed(1);
    }
    
    resetPosition() {
        this.currentPosition = { x: 0, y: 0 };
        this.averageVelocity = { x: 0, y: 0 };
        this.velocityHistory = [];
        this.previousFeaturePoints = [];
        this.previousTranslation = null;
        this.updatePositionDisplay();
    }
    
    onOpenCvReady() {
        this.isOpenCvReady = true;
        this.updateStatus('Ready - Click Start Camera', '');
        console.log('OpenCV.js is ready');
    }
}

// Global variable to store the detector instance
let detector;

// This function is called when OpenCV.js is loaded
function onOpenCvReady() {
    if (typeof cv !== 'undefined') {
        detector.onOpenCvReady();
    } else {
        // If cv is not ready yet, wait a bit and try again
        setTimeout(onOpenCvReady, 100);
    }
}

// Initialize the detector when the page loads
document.addEventListener('DOMContentLoaded', () => {
    detector = new FeaturePointDetector();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (detector) {
        detector.stopCamera();
    }
});