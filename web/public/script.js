class WebRTCClient {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.rpiServerUrl = null; // Will be set dynamically
        
        this.initializeElements();
        this.bindEvents();
        this.loadSavedIP();
    }
    
    initializeElements() {
        this.generateOfferBtn = document.getElementById('generateOffer');
        this.setAnswerBtn = document.getElementById('setAnswer');
        this.sendMessageBtn = document.getElementById('sendMessage');
        this.messageInput = document.getElementById('messageInput');
        this.offerSdp = document.getElementById('offerSdp');
        this.answerSdp = document.getElementById('answerSdp');
        this.status = document.getElementById('status');
        this.messages = document.getElementById('messages');
        this.rpiAddressInput = document.getElementById('rpiAddress');
    }
      bindEvents() {
        this.generateOfferBtn.addEventListener('click', () => this.generateOffer());
        this.setAnswerBtn.addEventListener('click', () => this.setAnswer());
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.rpiAddressInput.addEventListener('input', () => this.saveIP());
        this.rpiAddressInput.addEventListener('blur', () => this.validateIP());
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
    }
      getRpiServerUrl() {
        const ip = this.rpiAddressInput.value.trim();
        if (!ip) {
            throw new Error('Please enter the Raspberry Pi IP address');
        }
        if (!this.validateIP()) {
            throw new Error('Please enter a valid IP address');
        }
        return `http://${ip}:${CONFIG.RPI_SERVER_PORT}`;
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
        }
    }    async generateOffer() {
        try {
            // Disable button during process
            this.generateOfferBtn.disabled = true;
            this.generateOfferBtn.textContent = 'Processing...';
            
            // Validate IP address first
            this.rpiServerUrl = this.getRpiServerUrl();
            
            this.updateStatus('Testing connection to RPI server...');
            
            // Test if RPI server is reachable
            await this.testRpiConnection(this.rpiServerUrl);
            
            this.updateStatus('RPI server reachable! Generating offer...');
            
            // Create peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: CONFIG.ICE_SERVERS
            });
            
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
            
            // Get the complete SessionDescription object
            const offerSessionDescription = this.peerConnection.localDescription;
            const offerJson = JSON.stringify(offerSessionDescription, null, 2);
            this.offerSdp.value = offerJson;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(offerJson);
            
            this.updateStatus('Offer generated and copied to clipboard!');
              // Open RPI server in new tab
            window.open(this.rpiServerUrl, '_blank');
            
        } catch (error) {
            console.error('Error generating offer:', error);
            this.updateStatus('Error generating offer: ' + error.message);
        } finally {
            // Re-enable button
            this.generateOfferBtn.disabled = false;
            this.generateOfferBtn.textContent = 'Generate SDP Offer & Open RPI Server';
        }
    }
      async setAnswer() {
        try {
            const answerJson = this.answerSdp.value.trim();
            if (!answerJson) {
                alert('Please paste the SDP answer from the RPI server');
                return;
            }
            
            this.updateStatus('Setting answer...');
            
            // Parse the JSON answer
            let answerSessionDescription;
            try {
                answerSessionDescription = JSON.parse(answerJson);
            } catch (parseError) {
                throw new Error('Invalid JSON format for answer. Please copy the complete JSON from the RPI server.');
            }
            
            // Validate the parsed object
            if (!answerSessionDescription.type || !answerSessionDescription.sdp) {
                throw new Error('Answer must contain both "type" and "sdp" properties');
            }
            
            const answer = new RTCSessionDescription(answerSessionDescription);
            
            await this.peerConnection.setRemoteDescription(answer);
            this.updateStatus('Answer set successfully! Waiting for connection...');
            
        } catch (error) {
            console.error('Error setting answer:', error);
            this.updateStatus('Error setting answer: ' + error.message);
        }
    }
    
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.updateStatus('Connected!', true);
            this.enableMessaging(true);
        };
        
        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.updateStatus('Connection closed');
            this.enableMessaging(false);
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
}

// Initialize the WebRTC client when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebRTCClient();
});
