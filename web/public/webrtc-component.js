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
    // static styles = css`
    //     * {
    //         margin: 0;
    //         padding: 0;
    //         box-sizing: border-box;
    //     }

    //     :host {
    //         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    //         background: #fff;
    //         color: #000;
    //         line-height: 1.5;
    //         display: block;
    //     }

    //     h2 {
    //         font-size: 1.2rem;
    //         font-weight: 500;
    //     }

    //     .step-container {
    //         border: 1px solid #000;
    //         padding: 1.5rem;
    //         display: flex;
    //         flex-direction: column;
    //         gap: 0.5rem;
    //     }

    //     .step-header {
    //         display: flex;
    //         justify-content: space-between;
    //         align-items: center;
    //     }

    //     .step-indicator {
    //         font-size: 0.875rem;
    //         color: #fff;
    //         background: #000;
    //         padding: 0.25rem 0.5rem;
    //         border: 1px solid #000;
    //     }

    //     .input-group {
    //         display: flex;
    //         gap: 0.5rem;
    //     }

    //     .input-group input {
    //         flex-grow: 1;
    //         flex-shrink: 1;
    //     }

    //     .input-group .btn {
    //         width: auto;
    //     }

    //     input {
    //         flex: 1;
    //         padding: 0.75rem;
    //         border: 1px solid #000;
    //         background: #fff;
    //         color: #000;
    //     }

    //     input:focus {
    //         outline: 2px solid #000;
    //         outline-offset: -2px;
    //     }

    //     .btn {
    //         padding: 0.5rem 0.5rem;
    //         border: 1px solid #000;
    //         background: #000;
    //         color: #fff;
    //         cursor: pointer;
    //         white-space: nowrap;
    //         width: 100%;
    //         display: flex;
    //         align-items: center;
    //         justify-content: center;
    //         gap: 0.5rem;
    //     }

    //     .btn:hover {
    //         background: #333;
    //     }

    //     .btn:disabled {
    //         background: #ccc;
    //         border-color: #ccc;
    //         cursor: not-allowed;
    //     }

    //     .drone-link {
    //         display: block;
    //         padding: 0.5rem;
    //         border: 1px solid #000;
    //         color: #fff;
    //         background-color: #000;
    //         text-decoration: none;
    //         text-align: center;
    //         width: 100%;
    //     }

    //     .status {
    //         padding: 0.75rem;
    //         border: 1px solid #000;
    //         text-align: center;
    //     }

    //     .status.connected {
    //         background: #f0f0f0;
    //     }

    //     .status.error {
    //         background: #000;
    //         color: #fff;
    //     }

    //     p {
    //         color: #333;
    //     }

    //     .hidden {
    //         display: none;
    //     }
    // `;

    static styles = css`
        .step-container.hidden {
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
                    <h2>Step 3: Device Connected</h2>
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
                    <div class="step-indicator">1 / 3</div>
                </div>
                <p>Copy your Controller Code to connect to the device:</p>
                <div class="input-group">
                    <input type="text" id="offerDisplay" readonly>
                    <button @click="${this.copyOffer}" class="btn" id="copyOfferBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                </div>
                <a href="http://${this.rpiAddress}:${this.rpiPort}" target="_blank" class="drone-link" @click="${this.nextStep}">
                    Open device Setup
                </a>
            </div>

            <!-- Step 2: Paste Answer -->
            <div class="step-container ${this.currentStep !== 2 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 2: Paste device Response Code</h2>
                    <div class="step-indicator">2 / 3</div>
                </div>
                <p>Paste the device Response Code you copied from the setup page:</p>
                <input type="text" id="answerSdp" placeholder="Paste device Response Code here...">
                <button @click="${this.setAnswer}" class="btn">Connect</button>
            </div>

            <!-- Step 3: Communication -->
            <div class="step-container ${this.currentStep !== 3 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 3: Connecting to device</h2>
                    <div class="step-indicator">3 / 3</div>
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
            this.peerConnection = new RTCPeerConnection({
                // No ICE servers needed for local network connections
                iceServers: []
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
                const btn = this.shadowRoot.querySelector('#copyOfferBtn');
                const originalContent = btn.innerHTML;
                if (btn) {
                    btn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    `;
                    setTimeout(() => {
                        btn.innerHTML = originalContent;
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
                alert('Please paste the device Response Code first');
                return;
            }

            const answer = JSON.parse(answerInput.value);
            if (!answer.type || !answer.sdp || answer.type !== 'answer') {
                throw new Error('Invalid device Response Code format');
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
