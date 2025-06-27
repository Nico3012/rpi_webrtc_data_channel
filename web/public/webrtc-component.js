import { LitElement, html, css } from 'lit';

class WebRTCConnection extends LitElement {

    // lit property
    static properties = {
        currentStep: { type: Number },
        isConnectedState: { type: Boolean },
        rpiAddress: { type: String, attribute: 'rpi-address' },
        rpiPort: { type: String, attribute: 'rpi-port' },
        connectionStatus: { type: String }
    };

    // lit property
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
    }

    // lit function
    firstUpdated() {
        this.generateOffer(); // Start generating offer immediately
    }

    // lit function
    render() {
        if (this.isConnectedState) {
            return this.renderConnectedView();
        } else {
            return this.renderStepsView();
        }
    }

    /** @private */
    renderConnectedView() {
        return html`
            <div class="step-container">
                <div class="step-header">
                    <h2>Drone Connected</h2>
                    <div class="step-indicator">Ready</div>
                </div>
                <div class="status connected">${this.connectionStatus}</div>
                <button @click="${this.closeConnection}" class="btn">Disconnect</button>
            </div>
        `;
    }

    /** @private */
    renderStepsView() {
        return html`
            <!-- Step 1: Generate and Copy Offer -->
            <div class="step-container ${this.currentStep !== 1 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 1: Copy Controller Code</h2>
                    <div class="step-indicator">1 / 4</div>
                </div>
                <div id="offerSection">
                    <p>Copy your Controller Code and open the drone setup page:</p>
                    <div class="input-group">
                        <input type="text" id="offerDisplay" readonly>
                        <button @click="${this.copyOffer}" class="btn">Copy Controller Code</button>
                    </div>
                    <a href="http://${this.rpiAddress}:${this.rpiPort}" target="_blank" class="drone-link" @click="${this.nextStep}">
                        Open Drone Setup
                    </a>
                </div>
            </div>

            <!-- Step 2: Paste Answer -->
            <div class="step-container ${this.currentStep !== 2 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 2: Paste Drone Response Code</h2>
                    <div class="step-indicator">2 / 4</div>
                </div>
                <p>Paste the Drone Response Code you copied from the setup page:</p>
                <div class="input-group">
                    <input type="text" id="answerSdp" placeholder="Paste Drone Response Code here...">
                    <button @click="${this.setAnswer}" class="btn">Connect</button>
                </div>
            </div>

            <!-- Step 3: Communication -->
            <div class="step-container ${this.currentStep !== 3 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 3: Connecting to Drone</h2>
                    <div class="step-indicator">3 / 4</div>
                </div>
                <div class="status">${this.connectionStatus}</div>
            </div>
        `;
    }

    /** @public @returns {boolean} */ // Public API methods matching the RPI server interface
    isConnected() {
        return this.isConnectedState && this.dataChannel && this.dataChannel.readyState === 'open';
    }

    /** @public @returns {Promise<void>} */
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

    // Internal methods:

    /** @private */
    async nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
        }
    }

    /** @private */
    async generateOffer() {
        try {
            // Update the RPI server URL using the attributes
            this.rpiServerUrl = `http://${this.rpiAddress}:${this.rpiPort}`;

            // Create peer connection without STUN/TURN servers for local network
            this.peerConnection = new RTCPeerConnection();

            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('messages', {
                ordered: true
            });

            this.setupDataChannel();
            this.setupPeerConnection();

            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // Display offer immediately without waiting for ICE candidates
            const offerDisplay = this.shadowRoot.querySelector('#offerDisplay');
            if (offerDisplay) {
                offerDisplay.value = JSON.stringify(this.peerConnection.localDescription);
            }

        } catch (error) {
            console.error('Error generating offer:', error);
            alert('Error generating offer: ' + error.message);
        }
    }

    /** @private */
    async copyOffer() {
        const offerDisplay = this.shadowRoot.querySelector('#offerDisplay');

        if (offerDisplay && offerDisplay.value) {

            // using old execCommand library to ensure consistency between the copy mechanism between both servers. (The http server has no access to navigator.clipboard)
            offerDisplay.focus();
            offerDisplay.setSelectionRange(0, offerDisplay.value.length);
            const copied = document.execCommand('copy');
            offerDisplay.blur();

            // if copy was successful, show feedback to the user
            if (copied) {
                const btn = this.shadowRoot.querySelector('[data-copy-offer]') ||
                    this.shadowRoot.querySelector('button');
                if (btn) {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 2000);
                }
            }
        }
    }

    /** @private */
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

    /** @private */
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.isConnectedState = true;
            this.updateStatus('Connected', true);
            this.requestUpdate();
            
            // Dispatch connection update event
            this.dispatchEvent(new CustomEvent('connection-changed', {
                detail: { connected: true, status: 'Connected' },
                bubbles: true
            }));
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            // Only handle if not already handled by peer connection state change
            if (this.isConnectedState) {
                this.isConnectedState = false;
                this.updateStatus('Disconnected', false);
                this.currentStep = 1;
                this.requestUpdate();
                
                // Dispatch connection update event
                this.dispatchEvent(new CustomEvent('connection-changed', {
                    detail: { connected: false, status: 'Disconnected' },
                    bubbles: true
                }));
                
                // Generate a new offer when data channel closes
                setTimeout(() => {
                    this.generateOffer();
                }, 100);
            }
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received message:', event.data);

            // Dispatch custom event for received message
            this.dispatchEvent(new CustomEvent('message-received', {
                detail: { message: event.data },
                bubbles: true
            }));
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateStatus('Connection Error', false);
            // Dispatch connection update event
            this.dispatchEvent(new CustomEvent('connection-changed', {
                detail: { connected: false, status: 'Connection Error' },
                bubbles: true
            }));
        };
    }

    /** @private */
    setupPeerConnection() {
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);

            switch (this.peerConnection.iceConnectionState) {
                case 'connected':
                case 'completed':
                    this.updateStatus('Connected', true);
                    // Dispatch connection update event
                    this.dispatchEvent(new CustomEvent('connection-changed', {
                        detail: { connected: true, status: 'Connected' },
                        bubbles: true
                    }));
                    break;
                case 'disconnected':
                    this.updateStatus('Disconnected', false);
                    this.isConnectedState = false;
                    this.currentStep = 1;
                    this.requestUpdate();
                    // Dispatch connection update event
                    this.dispatchEvent(new CustomEvent('connection-changed', {
                        detail: { connected: false, status: 'Disconnected' },
                        bubbles: true
                    }));
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
                    // Dispatch connection update event
                    this.dispatchEvent(new CustomEvent('connection-changed', {
                        detail: { connected: false, status: 'Connection Failed' },
                        bubbles: true
                    }));
                    // Generate a new offer when connection fails
                    setTimeout(() => {
                        this.generateOffer();
                    }, 100);
                    break;
            }
        };
    }

    /** @private */
    updateStatus(message, isConnected = false) {
        this.connectionStatus = message;
        if (isConnected) {
            this.isConnectedState = true;
        }
        this.requestUpdate();
    }

    /** @private */
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
}

customElements.define('webrtc-connection', WebRTCConnection);
