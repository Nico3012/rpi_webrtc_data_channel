class CameraMovementAnalyzer {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.statusText = document.getElementById('statusText');
        this.cameraSelect = document.getElementById('cameraSelect');
        this.refreshCamerasBtn = document.getElementById('refreshCameras');
        
        // Movement display elements
        this.horizontalMovement = document.getElementById('horizontalMovement');
        this.verticalMovement = document.getElementById('verticalMovement');
        this.overallSpeed = document.getElementById('overallSpeed');
        this.horizontalDirection = document.getElementById('horizontalDirection');
        this.verticalDirection = document.getElementById('verticalDirection');
        
        // Direction indicators
        this.upIndicator = document.getElementById('upIndicator');
        this.downIndicator = document.getElementById('downIndicator');
        this.leftIndicator = document.getElementById('leftIndicator');
        this.rightIndicator = document.getElementById('rightIndicator');
        
        // Analysis variables
        this.stream = null;
        this.previousFrame = null;
        this.isAnalyzing = false;
        this.frameRate = 30;
        this.analysisInterval = null;
        this.availableCameras = [];
        
        // Movement tracking
        this.movementHistory = [];
        this.maxHistoryLength = 10;
        this.threshold = 0.5;
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.refreshCamerasBtn.addEventListener('click', () => this.loadAvailableCameras());
        
        // Load cameras after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.loadAvailableCameras();
        }, 100);
    }
    
    async loadAvailableCameras() {
        try {
            this.cameraSelect.innerHTML = '<option value="">Loading cameras...</option>';
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access not supported');
            }
            
            // Try to get devices without permission first
            let devices = await navigator.mediaDevices.enumerateDevices();
            let videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // If no labels are available, we need permission
            if (videoDevices.length > 0 && !videoDevices[0].label) {
                try {
                    // Request permission to get device labels
                    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    tempStream.getTracks().forEach(track => track.stop());
                    
                    // Get devices again with labels
                    devices = await navigator.mediaDevices.enumerateDevices();
                    videoDevices = devices.filter(device => device.kind === 'videoinput');
                } catch (permissionError) {
                    console.log('Permission denied, using generic camera names');
                }
            }
            
            this.availableCameras = videoDevices;
            console.log('Found cameras:', this.availableCameras);
            this.populateCameraSelect();
            
        } catch (error) {
            console.error('Error getting camera list:', error);
            this.cameraSelect.innerHTML = '<option value="">Default Camera</option>';
            this.statusText.textContent = 'Using default camera. Grant permission to see all cameras.';
        }
    }
    
    populateCameraSelect() {
        console.log('Populating camera select with', this.availableCameras.length, 'cameras');
        this.cameraSelect.innerHTML = '';
        
        if (this.availableCameras.length === 0) {
            this.cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            return;
        }
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Default Camera';
        this.cameraSelect.appendChild(defaultOption);
        
        // Add each camera
        this.availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            this.cameraSelect.appendChild(option);
            console.log(`Added camera: ${option.textContent} (${camera.deviceId})`);
        });
        
        this.statusText.textContent = `Found ${this.availableCameras.length} camera(s). Click "Start Camera" to begin.`;
    }
    
    async startCamera() {
        try {
            this.statusText.textContent = 'Requesting camera access...';
            
            const selectedCameraId = this.cameraSelect.value;
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: this.frameRate },
                }
            };
            
            // Add device constraint if a specific camera is selected
            if (selectedCameraId) {
                constraints.video.deviceId = { exact: selectedCameraId };
            } else {
                constraints.video.facingMode = { ideal: "environment" };
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video.srcObject = this.stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.startAnalysis();
            });
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.cameraSelect.disabled = true;
            this.statusText.textContent = 'Camera active - Movement analysis started';
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            if (error.name === 'OverconstrainedError') {
                this.statusText.textContent = 'Selected camera not available. Try another camera.';
            } else {
                this.statusText.textContent = 'Error: Could not access camera. Please check permissions.';
            }
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.stopAnalysis();
        this.resetDisplay();
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.cameraSelect.disabled = false;
        this.statusText.textContent = 'Camera stopped';
    }
    
    startAnalysis() {
        this.isAnalyzing = true;
        this.previousFrame = null;
        this.analysisInterval = setInterval(() => {
            this.analyzeMovement();
        }, 1000 / this.frameRate);
    }
    
    stopAnalysis() {
        this.isAnalyzing = false;
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
    }
    
    analyzeMovement() {
        if (!this.isAnalyzing || this.video.readyState !== 4) {
            return;
        }
        
        // Draw current frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get current frame data
        const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.previousFrame) {
            const movement = this.calculateOpticalFlow(this.previousFrame, currentFrame);
            this.updateDisplay(movement);
            this.updateMovementHistory(movement);
        }
        
        this.previousFrame = currentFrame;
    }
    
    calculateOpticalFlow(prevFrame, currFrame) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const blockSize = 16; // Size of blocks to compare
        const searchRange = 8; // Search range for motion vectors
        
        let totalX = 0;
        let totalY = 0;
        let blockCount = 0;
        
        // Convert to grayscale and calculate motion vectors
        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                const motion = this.findMotionVector(
                    prevFrame, currFrame, 
                    x, y, blockSize, searchRange
                );
                
                if (motion) {
                    totalX += motion.x;
                    totalY += motion.y;
                    blockCount++;
                }
            }
        }
        
        if (blockCount === 0) {
            return { x: 0, y: 0, magnitude: 0 };
        }
        
        const avgX = totalX / blockCount;
        const avgY = totalY / blockCount;
        const magnitude = Math.sqrt(avgX * avgX + avgY * avgY);
        
        return {
            x: avgX,
            y: avgY,
            magnitude: magnitude
        };
    }
    
    findMotionVector(prevFrame, currFrame, x, y, blockSize, searchRange) {
        let bestMatch = { x: 0, y: 0, error: Infinity };
        
        // Get reference block from previous frame
        const refBlock = this.getBlock(prevFrame, x, y, blockSize);
        
        // Search in current frame
        for (let dy = -searchRange; dy <= searchRange; dy++) {
            for (let dx = -searchRange; dx <= searchRange; dx++) {
                const newX = x + dx;
                const newY = y + dy;
                
                if (newX >= 0 && newY >= 0 && 
                    newX + blockSize < this.canvas.width && 
                    newY + blockSize < this.canvas.height) {
                    
                    const currBlock = this.getBlock(currFrame, newX, newY, blockSize);
                    const error = this.calculateBlockError(refBlock, currBlock);
                    
                    if (error < bestMatch.error) {
                        bestMatch = { x: dx, y: dy, error: error };
                    }
                }
            }
        }
        
        // Only return motion if error is below threshold
        if (bestMatch.error < this.threshold * blockSize * blockSize * 255) {
            return bestMatch;
        }
        
        return null;
    }
    
    getBlock(frame, x, y, size) {
        const block = [];
        const width = this.canvas.width;
        
        for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
                const pixelIndex = ((y + j) * width + (x + i)) * 4;
                // Convert to grayscale
                const gray = (frame.data[pixelIndex] + 
                             frame.data[pixelIndex + 1] + 
                             frame.data[pixelIndex + 2]) / 3;
                block.push(gray);
            }
        }
        
        return block;
    }
    
    calculateBlockError(block1, block2) {
        let error = 0;
        for (let i = 0; i < block1.length; i++) {
            error += Math.abs(block1[i] - block2[i]);
        }
        return error;
    }
    
    updateMovementHistory(movement) {
        this.movementHistory.push(movement);
        if (this.movementHistory.length > this.maxHistoryLength) {
            this.movementHistory.shift();
        }
    }
    
    updateDisplay(movement) {
        // Smooth the movement values using history
        const smoothed = this.smoothMovement(movement);
        
        // Update numerical displays
        this.horizontalMovement.textContent = Math.abs(smoothed.x).toFixed(2);
        this.verticalMovement.textContent = Math.abs(smoothed.y).toFixed(2);
        this.overallSpeed.textContent = smoothed.magnitude.toFixed(2);
        
        // Update direction indicators
        this.updateDirections(smoothed);
        this.updateIndicators(smoothed);
        
        // Add active animation to movement items
        this.animateMovementItems(smoothed);
    }
    
    smoothMovement(movement) {
        if (this.movementHistory.length < 3) {
            return movement;
        }
        
        // Use weighted average of recent movements
        let totalX = 0, totalY = 0, totalWeight = 0;
        
        for (let i = 0; i < this.movementHistory.length; i++) {
            const weight = (i + 1) / this.movementHistory.length; // More recent = higher weight
            totalX += this.movementHistory[i].x * weight;
            totalY += this.movementHistory[i].y * weight;
            totalWeight += weight;
        }
        
        const smoothX = totalX / totalWeight;
        const smoothY = totalY / totalWeight;
        
        return {
            x: smoothX,
            y: smoothY,
            magnitude: Math.sqrt(smoothX * smoothX + smoothY * smoothY)
        };
    }
    
    updateDirections(movement) {
        const threshold = 0.1;
        
        // Horizontal direction
        if (Math.abs(movement.x) > threshold) {
            this.horizontalDirection.textContent = movement.x > 0 ? 'RIGHT' : 'LEFT';
        } else {
            this.horizontalDirection.textContent = '-';
        }
        
        // Vertical direction
        if (Math.abs(movement.y) > threshold) {
            this.verticalDirection.textContent = movement.y > 0 ? 'DOWN' : 'UP';
        } else {
            this.verticalDirection.textContent = '-';
        }
    }
    
    updateIndicators(movement) {
        const threshold = 0.2;
        
        // Reset all indicators
        [this.upIndicator, this.downIndicator, this.leftIndicator, this.rightIndicator]
            .forEach(indicator => indicator.classList.remove('active'));
        
        // Activate relevant indicators
        if (movement.y < -threshold) {
            this.upIndicator.classList.add('active');
        }
        if (movement.y > threshold) {
            this.downIndicator.classList.add('active');
        }
        if (movement.x < -threshold) {
            this.leftIndicator.classList.add('active');
        }
        if (movement.x > threshold) {
            this.rightIndicator.classList.add('active');
        }
    }
    
    animateMovementItems(movement) {
        const threshold = 0.1;
        const items = document.querySelectorAll('.movement-item');
        
        items.forEach(item => item.classList.remove('active'));
        
        if (movement.magnitude > threshold) {
            items.forEach(item => item.classList.add('active'));
        }
    }
    
    resetDisplay() {
        this.horizontalMovement.textContent = '0.00';
        this.verticalMovement.textContent = '0.00';
        this.overallSpeed.textContent = '0.00';
        this.horizontalDirection.textContent = '-';
        this.verticalDirection.textContent = '-';
        
        // Reset indicators
        [this.upIndicator, this.downIndicator, this.leftIndicator, this.rightIndicator]
            .forEach(indicator => indicator.classList.remove('active'));
        
        // Reset movement items
        document.querySelectorAll('.movement-item')
            .forEach(item => item.classList.remove('active'));
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CameraMovementAnalyzer();
});

// Check for getUserMedia support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('statusText').textContent = 
        'Error: Your browser does not support camera access';
}
