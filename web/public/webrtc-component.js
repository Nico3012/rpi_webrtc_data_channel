import { LitElement, html, css } from 'lit';

class WebRTCConnection extends LitElement {
    static properties = {
        currentStep: { type: Number },
        isConnectedState: { type: Boolean },
        rpiAddress: { type: String },
        connectionStatus: { type: String },
        messages: { type: Array }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .step-container {
            padding: 25px;
            border-bottom: 1px solid #eee;
        }

        .step-container.hidden {
            display: none;
        }

        .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .step-header h2 {
            color: #333;
            margin-bottom: 0;
            font-size: 1.3rem;
        }

        .step-indicator {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        }

        .ip-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            transition: border-color 0.3s ease;
            margin-bottom: 5px;
        }

        .ip-input:focus {
            outline: none;
            border-color: #667eea;
        }

        .help-text {
            font-size: 0.9em;
            color: #666;
            font-style: italic;
        }

        .btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
            margin: 10px 5px 10px 0;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .btn-success {
            background: linear-gradient(45deg, #28a745, #20c997);
        }

        .btn-success:hover {
            box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
        }

        .btn-danger {
            background: linear-gradient(45deg, #dc3545, #c82333);
        }

        .btn-danger:hover {
            box-shadow: 0 5px 15px rgba(220, 53, 69, 0.4);
        }

        .input-group {
            display: flex;
            gap: 10px;
            align-items: center;
            margin: 10px 0;
        }

        .input-group input {
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
        }

        .input-group input:focus {
            outline: none;
            border-color: #667eea;
        }

        .input-group button {
            margin: 0;
            white-space: nowrap;
        }

        .rpi-link {
            text-decoration: none;
            display: inline-block;
            margin: 10px 0;
        }

        .rpi-link button {
            margin: 0;
        }

        .status {
            padding: 15px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .status.connected {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .chat-container {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
        }

        .messages {
            height: 200px;
            overflow-y: auto;
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
        }

        .message {
            margin: 8px 0;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
        }

        .message.sent {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            margin-left: auto;
            text-align: right;
        }

        .message.received {
            background: #e9ecef;
            color: #333;
            margin-right: auto;
        }

        .message .timestamp {
            font-size: 0.8em;
            opacity: 0.7;
            margin-top: 5px;
        }
    `;

    constructor() {
        super();
        this.currentStep = 1;
        this.isConnectedState = false;
        this.rpiAddress = '192.168.1.100';
        this.connectionStatus = 'Disconnected';
        this.messages = [];
        this.peerConnection = null;
        this.dataChannel = null;
        this.rpiServerUrl = null;
        this.messageCallback = null;
        
        this.loadSavedIP();
    }

    firstUpdated() {
        this.initializeEventListeners();
    }

    render() {
        if (this.isConnectedState) {
            return this.renderConnectedView();
        } else {
            return this.renderStepsView();
        }
    }

    renderConnectedView() {
        return html`
            <div class="step-container">
                <div class="step-header">
                    <h2>WebRTC Data Channel Communication</h2>
                    <div class="step-indicator">Connected</div>
                </div>
                <div class="status connected">${this.connectionStatus}</div>
                <button @click="${this.closeConnection}" class="btn btn-danger">Close Connection</button>
                
                <div class="chat-container">
                    <div class="messages">
                        ${this.messages.map(msg => html`
                            <div class="message ${msg.type}">
                                <div>${msg.text}</div>
                                <div class="timestamp">${msg.timestamp}</div>
                            </div>
                        `)}
                    </div>
                    <div class="input-group">
                        <input 
                            type="text" 
                            id="messageInput" 
                            placeholder="Type your message..." 
                            @keypress="${this.handleMessageKeypress}"
                        >
                        <button @click="${this.sendMessage}" class="btn btn-primary">Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStepsView() {
        return html`
            <!-- Step 1: Configure IP -->
            <div class="step-container ${this.currentStep !== 1 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 1: Configure Raspberry Pi</h2>
                    <div class="step-indicator">1 / 4</div>
                </div>
                <div class="form-group">
                    <label for="rpiAddress">Raspberry Pi IP Address:</label>
                    <input 
                        type="text" 
                        id="rpiAddress" 
                        placeholder="192.168.1.100" 
                        .value="${this.rpiAddress}" 
                        @input="${this.handleIPInput}"
                        @blur="${this.validateIP}"
                        class="ip-input"
                    >
                    <small class="help-text">Enter the IP address of your Raspberry Pi on the local network</small>
                </div>
                <button @click="${this.nextStep}" class="btn btn-primary">Continue</button>
            </div>

            <!-- Step 2: Generate and Copy Offer -->
            <div class="step-container ${this.currentStep !== 2 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 2: Copy SDP Offer</h2>
                    <div class="step-indicator">2 / 4</div>
                </div>
                <div id="offerSection">
                    <p>Your SDP offer has been generated. Copy it and open the RPI server:</p>
                    <label for="offerDisplay">SDP Offer (copy this):</label>
                    <div class="input-group">
                        <input type="text" id="offerDisplay" readonly>
                        <button @click="${this.copyOffer}" class="btn btn-success">Copy Offer</button>
                    </div>
                    <p class="help-text">Click the link below to open the RPI server and paste the offer:</p>
                    <a href="#" @click="${this.handleRpiLinkClick}" target="_blank" class="rpi-link">
                        <button class="btn btn-primary">Open RPI Server</button>
                    </a>
                    <p class="help-text"><small>This will open in a new tab and automatically proceed to the next step.</small></p>
                </div>
            </div>

            <!-- Step 3: Paste Answer -->
            <div class="step-container ${this.currentStep !== 3 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 3: Paste SDP Answer</h2>
                    <div class="step-indicator">3 / 4</div>
                </div>
                <p>Paste the SDP answer you copied from the RPI server:</p>
                <input type="text" id="answerSdp" placeholder="Paste the SDP Answer from the RPI server here...">
                <button @click="${this.setAnswer}" class="btn btn-primary">Connect with Answer</button>
            </div>

            <!-- Step 4: Communication -->
            <div class="step-container ${this.currentStep !== 4 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 4: Data Channel Communication</h2>
                    <div class="step-indicator">4 / 4</div>
                </div>
                <div class="status">${this.connectionStatus}</div>
                
                <div class="chat-container">
                    <div class="messages">
                        ${this.messages.map(msg => html`
                            <div class="message ${msg.type}">
                                <div>${msg.text}</div>
                                <div class="timestamp">${msg.timestamp}</div>
                            </div>
                        `)}
                    </div>
                    <div class="input-group">
                        <input 
                            type="text" 
                            id="messageInput" 
                            placeholder="Type your message..." 
                            ?disabled="${!this.isConnectedState}"
                            @keypress="${this.handleMessageKeypress}"
                        >
                        <button 
                            @click="${this.sendMessage}" 
                            class="btn btn-primary" 
                            ?disabled="${!this.isConnectedState}"
                        >Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Public API methods matching the RPI server interface
    isConnected() {
        return this.isConnectedState && this.dataChannel && this.dataChannel.readyState === 'open';
    }

    sendData(data) {
        if (!this.isConnected()) {
            throw new Error('Data channel is not available or not open');
        }

        try {
            this.dataChannel.send(data);
            this.addMessage(data, 'sent');
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    initReadDataCallback(callback) {
        this.messageCallback = callback;
    }

    // Internal methods
    loadSavedIP() {
        const savedIP = localStorage.getItem('rpiAddress');
        if (savedIP) {
            this.rpiAddress = savedIP;
        }
    }

    handleIPInput(e) {
        this.rpiAddress = e.target.value;
        localStorage.setItem('rpiAddress', this.rpiAddress);
    }

    validateIP() {
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (this.rpiAddress && !ipPattern.test(this.rpiAddress)) {
            alert('Please enter a valid IP address (e.g., 192.168.1.100)');
            return false;
        }
        return true;
    }

    async nextStep() {
        if (this.currentStep === 1) {
            if (!this.validateIP()) return;
            this.rpiServerUrl = `http://${this.rpiAddress}:${CONFIG.RPI_SERVER_PORT}`;
            await this.generateOffer();
        }
        
        if (this.currentStep < 4) {
            this.currentStep++;
        }
    }

    async generateOffer() {
        try {
            // Create peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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

            // Wait for ICE gathering
            await this.waitForIceGathering();

            // Display offer
            const offerDisplay = this.shadowRoot.querySelector('#offerDisplay');
            if (offerDisplay) {
                offerDisplay.value = JSON.stringify(this.peerConnection.localDescription);
            }

        } catch (error) {
            console.error('Error generating offer:', error);
            alert('Error generating offer: ' + error.message);
        }
    }

    copyOffer() {
        const offerDisplay = this.shadowRoot.querySelector('#offerDisplay');
        if (offerDisplay) {
            offerDisplay.select();
            offerDisplay.setSelectionRange(0, 99999);
            
            try {
                document.execCommand('copy');
                // Show feedback
                const btn = this.shadowRoot.querySelector('[data-copy-offer]') || 
                           this.shadowRoot.querySelector('button');
                if (btn) {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 2000);
                }
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                alert('Failed to copy to clipboard. Please select and copy manually.');
            }
        }
    }

    handleRpiLinkClick(e) {
        e.preventDefault();
        if (this.rpiServerUrl) {
            window.open(this.rpiServerUrl, '_blank');
            setTimeout(() => {
                this.currentStep = 3;
                this.requestUpdate();
            }, 1000);
        }
    }

    async setAnswer() {
        try {
            const answerInput = this.shadowRoot.querySelector('#answerSdp');
            if (!answerInput || !answerInput.value.trim()) {
                alert('Please paste the SDP answer first');
                return;
            }

            const answer = JSON.parse(answerInput.value);
            if (!answer.type || !answer.sdp || answer.type !== 'answer') {
                throw new Error('Invalid answer format');
            }

            await this.peerConnection.setRemoteDescription(answer);
            this.currentStep = 4;
            this.updateStatus('Connecting...', false);

        } catch (error) {
            console.error('Error setting answer:', error);
            alert('Error setting answer: ' + error.message);
        }
    }

    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.isConnectedState = true;
            this.updateStatus('Connected', true);
            this.requestUpdate();
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.isConnectedState = false;
            this.updateStatus('Disconnected', false);
            this.requestUpdate();
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received message:', event.data);
            this.addMessage(event.data, 'received');
            
            // Call user-defined callback if set
            if (this.messageCallback) {
                this.messageCallback(event.data);
            }
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateStatus('Connection Error', false);
        };
    }

    setupPeerConnection() {
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
            
            switch (this.peerConnection.iceConnectionState) {
                case 'connected':
                case 'completed':
                    this.updateStatus('Connected', true);
                    break;
                case 'disconnected':
                    this.updateStatus('Disconnected', false);
                    this.isConnectedState = false;
                    this.requestUpdate();
                    break;
                case 'failed':
                    this.updateStatus('Connection Failed', false);
                    this.isConnectedState = false;
                    this.requestUpdate();
                    break;
            }
        };
    }

    async waitForIceGathering() {
        return new Promise((resolve) => {
            if (this.peerConnection.iceGatheringState === 'complete') {
                resolve();
            } else {
                this.peerConnection.addEventListener('icegatheringstatechange', () => {
                    if (this.peerConnection.iceGatheringState === 'complete') {
                        resolve();
                    }
                });
            }
        });
    }

    sendMessage() {
        const messageInput = this.shadowRoot.querySelector('#messageInput');
        if (!messageInput || !messageInput.value.trim()) return;

        const message = messageInput.value.trim();
        
        try {
            this.sendData(message);
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message: ' + error.message);
        }
    }

    handleMessageKeypress(e) {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
    }

    addMessage(text, type) {
        const message = {
            text,
            type,
            timestamp: new Date().toLocaleTimeString()
        };
        
        this.messages = [...this.messages, message];
        this.requestUpdate();
        
        // Auto-scroll to bottom
        this.updateComplete.then(() => {
            const messagesContainer = this.shadowRoot.querySelector('.messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    }

    updateStatus(message, isConnected = false) {
        this.connectionStatus = message;
        if (isConnected) {
            this.isConnectedState = true;
        }
        this.requestUpdate();
    }

    closeConnection() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.isConnectedState = false;
        this.currentStep = 1;
        this.messages = [];
        this.updateStatus('Connection closed manually', false);
        
        // Clear answer input
        const answerInput = this.shadowRoot.querySelector('#answerSdp');
        if (answerInput) {
            answerInput.value = '';
        }
        
        this.requestUpdate();
    }

    initializeEventListeners() {
        // Additional initialization if needed
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
