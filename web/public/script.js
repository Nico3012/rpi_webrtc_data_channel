class WebRTCClient {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.rpiServerUrl = null;
        this.currentStep = 1;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSavedIP();
        this.showStep(1);
    }

    initializeElements() {
        this.sendMessageBtn = document.getElementById('sendMessage');
        this.messageInput = document.getElementById('messageInput');
        this.answerSdp = document.getElementById('answerSdp');
        this.status = document.getElementById('status');
        this.messages = document.getElementById('messages');
        this.rpiAddressInput = document.getElementById('rpiAddress');
        this.connectBtn = document.getElementById('connectBtn');
        this.closeConnectionBtn = document.getElementById('closeConnection');
        
        // Step elements
        this.step1Continue = document.getElementById('step1Continue');
        this.copyOfferBtn = document.getElementById('copyOfferBtn');
        this.offerDisplay = document.getElementById('offerDisplay');
        this.offerSection = document.getElementById('offerSection');
        this.rpiLink = document.getElementById('rpiLink');
    }

    bindEvents() {
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.rpiAddressInput.addEventListener('input', () => this.saveIP());
        this.rpiAddressInput.addEventListener('blur', () => this.validateIP());
        this.connectBtn.addEventListener('click', () => this.setAnswer());
        this.closeConnectionBtn.addEventListener('click', () => this.closeConnection());
        
        // Step navigation
        this.step1Continue.addEventListener('click', () => this.nextStep());
        this.copyOfferBtn.addEventListener('click', () => this.copyOffer());
        this.rpiLink.addEventListener('click', () => this.handleRpiLinkClick());
    }
    
    loadSavedIP() {
        const savedIP = localStorage.getItem('rpiAddress');
        if (savedIP) {
            this.rpiAddressInput.value = savedIP;
        }
    }
    
    saveIP() {
        localStorage.setItem('rpiAddress', this.rpiAddressInput.value);
    }
      validateIP() {
        const ip = this.rpiAddressInput.value.trim();
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        
        if (ip && !ipPattern.test(ip)) {
            this.rpiAddressInput.style.borderColor = '#dc3545';
            this.updateStatus('Invalid IP address format (e.g., 192.168.1.100)');
            return false;
        } else if (ip) {
            // Validate IP ranges (0-255 for each octet)
            const octets = ip.split('.');
            const isValidRange = octets.every(octet => {
                const num = parseInt(octet, 10);
                return num >= 0 && num <= 255;
            });
            
            if (!isValidRange) {
                this.rpiAddressInput.style.borderColor = '#dc3545';
                this.updateStatus('IP address values must be between 0 and 255');
                return false;
            }
            
            this.rpiAddressInput.style.borderColor = '#28a745';
            this.updateStatus('IP address looks valid');
        } else {
            this.rpiAddressInput.style.borderColor = '#ddd';
            this.updateStatus('Please enter the Raspberry Pi IP address');
        }
        return true;
    }    getRpiServerUrl() {
        const ip = this.rpiAddressInput.value.trim();
        if (!ip) {
            return null;
        }
        if (!this.validateIP()) {
            return null;
        }
        return `http://${ip}:${CONFIG.RPI_SERVER_PORT}`;
    }
    
    showStep(stepNumber) {
        // Hide all steps
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.classList.add('hidden');
            }
        }
        
        // Show current step
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) {
            currentStep.classList.remove('hidden');
        }
        
        this.currentStep = stepNumber;
    }
    
    nextStep() {
        if (this.currentStep === 1) {
            // Validate IP before proceeding
            if (!this.validateIP() || !this.rpiAddressInput.value.trim()) {
                alert('Please enter a valid IP address');
                return;
            }
            this.rpiServerUrl = this.getRpiServerUrl();
        }
        
        if (this.currentStep < 4) {
            this.showStep(this.currentStep + 1);
            
            // Auto-generate offer when reaching step 2
            if (this.currentStep === 2) {
                this.generateOffer();
            }
        }
    }
    
    async generateOffer() {
        try {
            // Create peer connection
            this.peerConnection = new RTCPeerConnection();
            
            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel(CONFIG.DATA_CHANNEL_LABEL, {
                ordered: CONFIG.DATA_CHANNEL_ORDERED
            });
            
            this.setupDataChannel();
            this.setupPeerConnection();
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Wait for ICE gathering to complete
            await this.waitForIceGathering();
            
            // Get the complete SessionDescription object and display as JSON (compact format for single line)
            const offerSessionDescription = this.peerConnection.localDescription;
            this.offerDisplay.value = JSON.stringify(offerSessionDescription);
            
            // Set up the RPI link
            this.rpiLink.href = this.rpiServerUrl;
            
        } catch (error) {
            console.error('Error generating offer:', error);
            alert('Error generating offer: ' + error.message);
        }
    }
    
    copyOffer() {
        this.offerDisplay.select();
        this.offerDisplay.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            
            const originalText = this.copyOfferBtn.textContent;
            this.copyOfferBtn.textContent = 'Copied!';
            
            setTimeout(() => {
                this.copyOfferBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard. Please select and copy manually.');
        }
    }
    
    async testRpiConnection(url) {
        try {
            // Try to reach the server with a simple fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                mode: 'no-cors' // This will succeed if server is reachable
            });
            
            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Connection timeout - is the RPI server running?');
            }
            // In no-cors mode, we can't read the response, but if we get here without timeout, server is likely reachable
            return true;
        }    }    
    
    async setAnswer() {
        try {
            const answerJson = this.answerSdp.value.trim();
            if (!answerJson) {
                alert('Please paste the SDP answer from the RPI server first.');
                return;
            }
            
            this.updateStatus('Processing answer from RPI...');
            
            // Parse the JSON answer
            let answerSessionDescription;
            try {
                answerSessionDescription = JSON.parse(answerJson);
            } catch (parseError) {
                throw new Error('Invalid JSON format for answer.');
            }
            
            // Validate the answer object
            if (!answerSessionDescription.type || !answerSessionDescription.sdp) {
                throw new Error('Answer must contain both "type" and "sdp" properties');
            }
            
            if (answerSessionDescription.type !== 'answer') {
                throw new Error('Expected answer type "answer", got "' + answerSessionDescription.type + '"');
            }
            
            const answer = new RTCSessionDescription(answerSessionDescription);
            await this.peerConnection.setRemoteDescription(answer);
            
            this.updateStatus('Answer processed successfully! Waiting for connection...');
            this.showStep(4);
            
        } catch (error) {
            console.error('Error setting answer:', error);
            this.updateStatus('Error setting answer: ' + error.message);
        }
    }
    
    setupDataChannel() {        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.updateStatus('Connected!', true);
            this.enableMessaging(true);
            this.closeConnectionBtn.style.display = 'inline-block';
        };
        
        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.updateStatus('Connection closed');
            this.enableMessaging(false);
            this.closeConnectionBtn.style.display = 'none';
        };
        
        this.dataChannel.onmessage = (event) => {
            console.log('Received message:', event.data);
            this.addMessage(event.data, 'received');
        };
        
        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateStatus('Data channel error');
        };
    }
    
    setupPeerConnection() {
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'failed') {
                this.updateStatus('Connection failed');
            }
        };
        
        this.peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            console.log('Received data channel:', channel.label);
        };
    }
    
    async waitForIceGathering() {
        return new Promise((resolve) => {
            if (this.peerConnection.iceGatheringState === 'complete') {
                resolve();
                return;
            }
              const timeout = setTimeout(() => {
                this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                resolve();
            }, CONFIG.ICE_GATHERING_TIMEOUT);
            
            const checkState = () => {
                if (this.peerConnection.iceGatheringState === 'complete') {
                    clearTimeout(timeout);
                    this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            
            this.peerConnection.addEventListener('icegatheringstatechange', checkState);
        });
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.dataChannel || this.dataChannel.readyState !== 'open') {
            return;
        }
        
        try {
            this.dataChannel.send(message);
            this.addMessage(message, 'sent');
            this.messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            this.updateStatus('Error sending message');
        }
    }
    
    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.textContent = text;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'timestamp';
        timestampDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestampDiv);
        
        this.messages.appendChild(messageDiv);
        this.messages.scrollTop = this.messages.scrollHeight;
    }
    
    updateStatus(message, isConnected = false) {
        this.status.textContent = message;
        this.status.className = isConnected ? 'status connected' : 'status';
    }
      enableMessaging(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendMessageBtn.disabled = !enabled;
    }
    
    closeConnection() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.updateStatus('Connection closed manually');
        this.enableMessaging(false);
        this.closeConnectionBtn.style.display = 'none';
        
        // Clear the answer textarea for next connection
        this.answerSdp.value = '';
        
        console.log('Connection closed manually');
    }
    
    handleRpiLinkClick() {
        // Automatically proceed to step 3 after a short delay
        // This gives the user time to see the new tab opening
        setTimeout(() => {
            this.showStep(3);
        }, 1000);
    }
}

// Initialize the WebRTC client when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebRTCClient();
});
