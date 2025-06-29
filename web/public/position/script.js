class FeaturePointDetector {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.featureCount = document.getElementById('featureCount');
        this.status = document.getElementById('status');
        
        this.stream = null;
        this.animationId = null;
        this.isOpenCvReady = false;
        this.isProcessing = false;
        
        this.setupEventListeners();
        this.updateStatus('Waiting for OpenCV...', 'loading');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        
        this.video.addEventListener('loadedmetadata', () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        });
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
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.updateStatus('Camera started', '');
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
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
        if (!this.isOpenCvReady) return;
        
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
            
            // Draw feature points
            const numCorners = corners.rows;
            this.featureCount.textContent = numCorners.toString();
            
            this.ctx.fillStyle = '#00ff00';
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            
            for (let i = 0; i < numCorners; i++) {
                const x = corners.data32F[i * 2];
                const y = corners.data32F[i * 2 + 1];
                
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