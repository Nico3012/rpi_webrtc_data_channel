import { LitElement, html, css } from 'lit';

class WebRTCConnection extends LitElement {
    static properties = {
        currentStep: { type: Number },
        isConnectedState: { type: Boolean },
        rpiAddress: { type: String, attribute: 'rpi-address' },
        rpiPort: { type: String, attribute: 'rpi-port' },
        connectionStatus: { type: String }
    };

    static styles = css`
        .hidden {
            display: none;
        }
    `;

    constructor() {
        super();
        this.currentStep = 1;
        this.isConnectedState = false;
        this.rpiAddress = '192.168.1.100';
        this.rpiPort = '8080';
        this.connectionStatus = 'Disconnected';
        this.peerConnection = null;
        this.dataChannel = null;
        this.rpiServerUrl = null;
        this.messageCallback = null;
    }

    firstUpdated() {
        this.initializeEventListeners();
        this.generateOffer(); // Start generating offer immediately
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
                    <h2>WebRTC Data Channel Connected</h2>
                    <div class="step-indicator">Connected</div>
                </div>
                <div class="status connected">${this.connectionStatus}</div>
                <button @click="${this.closeConnection}" class="btn btn-danger">Close Connection</button>
            </div>
        `;
    }

    renderStepsView() {
        return html`
            <!-- Step 1: Generate and Copy Offer -->
            <div class="step-container ${this.currentStep !== 1 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 1: Copy SDP Offer</h2>
                    <div class="step-indicator">1 / 3</div>
                </div>
                <div id="offerSection">
                    <p>Your SDP offer has been generated. Copy it and open the RPI server:</p>
                    <label for="offerDisplay">SDP Offer (copy this):</label>
                    <div class="input-group">
                        <input type="text" id="offerDisplay" readonly>
                        <button @click="${this.copyOffer}" class="btn btn-success">Copy Offer</button>
                    </div>
                    <p class="help-text">Click the link below to open the RPI server and paste the offer:</p>
                    <a href="http://${this.rpiAddress}:${this.rpiPort}" target="_blank" class="rpi-link" @click="${this.nextStep}">
                        http://${this.rpiAddress}:${this.rpiPort}
                    </a>
                    <p class="help-text"><small>This will open in a new tab and automatically proceed to the next step.</small></p>
                </div>
            </div>

            <!-- Step 2: Paste Answer -->
            <div class="step-container ${this.currentStep !== 2 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 2: Paste SDP Answer</h2>
                    <div class="step-indicator">2 / 3</div>
                </div>
                <p>Paste the SDP answer you copied from the RPI server:</p>
                <input type="text" id="answerSdp" placeholder="Paste the SDP Answer from the RPI server here...">
                <button @click="${this.setAnswer}" class="btn btn-primary">Connect with Answer</button>
            </div>

            <!-- Step 3: Communication -->
            <div class="step-container ${this.currentStep !== 3 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 3: Establishing Connection</h2>
                    <div class="step-indicator">3 / 3</div>
                </div>
                <div class="status">${this.connectionStatus}</div>
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
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    initReadDataCallback(callback) {
        this.messageCallback = callback;
    }

    // Internal methods
    async nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
        }
    }

    async generateOffer() {
        try {
            // Update the RPI server URL using the attributes
            this.rpiServerUrl = `http://${this.rpiAddress}:${this.rpiPort}`;
            
            // Create peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('messages', {
                ordered: true
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
            this.currentStep = 3;
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
            // Only handle if not already handled by peer connection state change
            if (this.isConnectedState) {
                this.isConnectedState = false;
                this.updateStatus('Disconnected', false);
                this.currentStep = 1;
                this.requestUpdate();
                // Generate a new offer when data channel closes
                setTimeout(() => {
                    this.generateOffer();
                }, 100);
            }
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received message:', event.data);
            
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
                    this.currentStep = 1;
                    this.requestUpdate();
                    // Generate a new offer when connection is lost
                    setTimeout(() => {
                        this.generateOffer();
                    }, 100);
                    break;
                case 'failed':
                    this.updateStatus('Connection Failed', false);
                    this.isConnectedState = false;
                    this.currentStep = 1;
                    this.requestUpdate();
                    // Generate a new offer when connection fails
                    setTimeout(() => {
                        this.generateOffer();
                    }, 100);
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
        this.updateStatus('Connection closed manually', false);
        
        // Clear answer input
        const answerInput = this.shadowRoot.querySelector('#answerSdp');
        if (answerInput) {
            answerInput.value = '';
        }
        
        this.requestUpdate();
        
        // Generate a new offer when returning to step 1
        setTimeout(() => {
            this.generateOffer();
        }, 100);
    }

    initializeEventListeners() {
        // Additional initialization if needed
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
