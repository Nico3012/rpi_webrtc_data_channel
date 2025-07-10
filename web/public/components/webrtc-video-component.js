import { LitElement, html, css } from 'lit';

class WebRTCConnection extends LitElement {

    // lit property
    static properties = {
        currentStep: { type: Number },
        isConnectedState: { type: Boolean },
        rpiAddress: { type: String, attribute: 'rpi-address' },
        rpiPort: { type: String, attribute: 'rpi-port' },
        connectionStatus: { type: String },
        hasVideoStream: { type: Boolean },
        videoEnabled: { type: Boolean, attribute: 'video-enabled' }
    };

    // lit property
    static styles = css`
        .step-container {
            display: flex;
            flex-direction: column;
        }

        .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        video {
            width: 100%;
            border-radius: 10px;
            background-color: #000;
            margin: 8px 0;
        }

        h2 {
            margin: 8px;
            color: black;
            font-size: 24px;
            font-family: serif;
            line-height: 1.5;
        }

        .step-indicator {
            margin: 8px;
            padding: 4px 10px;
            background-color: black;
            color: white;
            font-family: monospace;
            font-size: 16px;
            line-height: 1.5;
            border-radius: 16px;
            flex-shrink: 0;
        }

        .input-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        input {
            flex-grow: 1;
            display: block;
            appearance: none;
            margin: 8px;
            padding: 10px;
            border: 1px solid black;
            border-radius: 20px;
            outline: none;
            background-color: white;
            color: black;
            text-decoration: none;
            font-family: sans-serif;
            font-size: 12px;
            font-weight: normal;
            line-height: 1.5;
            text-align: left;
        }

        svg {
            display: block;
            margin: 4px;
        }

        a,
        button {
            display: block;
            appearance: none;
            margin: 8px;
            padding: 8px;
            border-radius: 20px;
            border: none;
            outline: none;
            background-color: black;
            color: white;
            text-decoration: none;
            font-family: sans-serif;
            font-size: 16px;
            font-weight: normal;
            line-height: 1.5;
            text-align: center;
        }

        p {
            margin: 8px;
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: black;
        }

        .status {
            margin: 8px;
            padding: 10px;
            border: 1px solid black;
            border-radius: 20px;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
            text-align: center;
        }

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
        this.hasVideoStream = false;
        this.videoEnabled = true; // Enable video by default
        this.videoStream = null;
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
                    <h2>Step 4: Device Connected</h2>
                    <div class="step-indicator">4 / 4</div>
                </div>
                <button @click="${this.closeConnection}" class="btn">Disconnect</button>
            </div>
        `;
    }

    // lit function
    firstUpdated() {
        this.generateOffer();
    }

    // We don't need to track video state changes separately as they're included in connection-changed events

    /** @public @returns {MediaStream|null} */
    getVideoStream() {
        return this.hasVideoStream ? this.videoStream : null;
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
                    <div class="step-indicator">2 / 4</div>
                </div>
                <p>Paste the device Response Code you copied from the setup page:</p>
                <input type="text" id="answerSdp" placeholder="Paste device Response Code here...">
                <button @click="${this.setAnswer}" class="btn">Connect</button>
            </div>

            <!-- Step 3: Communication -->
            <div class="step-container ${this.currentStep !== 3 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 3: Connecting to device</h2>
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

    /** @public @param {string} data @returns {Promise<void>} */
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

            // Setup video handlers if video is enabled
            if (this.videoEnabled) {
                // Set up handlers for incoming video tracks
                this.peerConnection.ontrack = (event) => {
                    console.log("Received remote track:", event.track.kind);
                    if (event.track.kind === 'video') {
                        this.videoStream = new MediaStream([event.track]);
                        this.hasVideoStream = true;

                        // If we're already connected, dispatch a connection update to notify about the new video
                        if (this.isConnectedState) {
                            this.dispatchEvent(new CustomEvent('connection-changed', {
                                detail: {
                                    connected: true,
                                    status: 'Connected',
                                    hasVideo: true
                                },
                                bubbles: true
                            }));
                        }

                        this.requestUpdate();
                    }
                };

                // Add a video transceiver to request video from the server
                this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            }

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

            // Clear the input immediately after successful connection attempt
            answerInput.value = '';

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

            // Dispatch connection update event with video information
            this.dispatchEvent(new CustomEvent('connection-changed', {
                detail: {
                    connected: true,
                    status: 'Connected',
                    hasVideo: this.hasVideoStream
                },
                bubbles: true
            }));
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            // Only handle if not already handled by peer connection state change
            if (this.isConnectedState) {
                // Reset video stream
                if (this.videoStream) {
                    const tracks = this.videoStream.getTracks();
                    tracks.forEach(track => track.stop());
                }
                this.hasVideoStream = false;
                this.videoStream = null;

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
                    // Dispatch connection update event with video state
                    this.dispatchEvent(new CustomEvent('connection-changed', {
                        detail: {
                            connected: true,
                            status: 'Connected',
                            hasVideo: this.hasVideoStream
                        },
                        bubbles: true
                    }));
                    break;
                case 'disconnected':
                    // Reset video stream when connection is lost
                    if (this.videoStream) {
                        const tracks = this.videoStream.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    this.hasVideoStream = false;
                    this.videoStream = null;

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
                    // Reset video stream when connection fails
                    if (this.videoStream) {
                        const tracks = this.videoStream.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    this.hasVideoStream = false;
                    this.videoStream = null;

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
        // Clean up video resources if any
        if (this.videoStream) {
            const tracks = this.videoStream.getTracks();
            tracks.forEach(track => track.stop());
        }
        this.hasVideoStream = false;
        this.videoStream = null;

        // Close data channel
        if (this.dataChannel) {
            this.dataChannel.close();
        }

        // Close peer connection
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

        // Dispatch connection update event for manual disconnect
        this.dispatchEvent(new CustomEvent('connection-changed', {
            detail: { connected: false, status: 'Connection closed manually' },
            bubbles: true
        }));

        // Generate a new offer when returning to step 1
        setTimeout(() => {
            this.generateOffer();
        }, 100);
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
