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
        requestVideo: { type: Boolean, attribute: 'request-video' },
        hasAudioStream: { type: Boolean },
        requestAudio: { type: Boolean, attribute: 'request-audio' }
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
        this.videoStream = null;
        this.requestVideo = false;
        this.hasAudioStream = false;
        this.audioStream = null;
        this.requestAudio = false;
        this.lastConnectionState = {
            connected: false,
            status: 'Disconnected',
            hasVideo: false,
            hasAudio: false
        };
    }

    // lit property
    firstUpdated() {
        this.generateOffer();
    }

    // lit property
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

    /** @public @returns {MediaStream | null} */
    getVideoStream() {
        return this.requestVideo && this.hasVideoStream && this.videoStream ? this.videoStream : null;
    }

    /** @public @returns {MediaStream | null} */
    getAudioStream() {
        return this.requestAudio && this.hasAudioStream && this.audioStream ? this.audioStream : null;
    }

    /** @private */
    renderStepsView() {
        return html`
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

            <div class="step-container ${this.currentStep !== 2 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 2: Paste device Response Code</h2>
                    <div class="step-indicator">2 / 4</div>
                </div>
                <p>Paste the device Response Code you copied from the setup page:</p>
                <input type="text" id="answerSdp" placeholder="Paste device Response Code here...">
                <button @click="${this.setAnswer}" class="btn">Connect</button>
            </div>

            <div class="step-container ${this.currentStep !== 3 ? 'hidden' : ''}">
                <div class="step-header">
                    <h2>Step 3: Connecting to device</h2>
                    <div class="step-indicator">3 / 4</div>
                </div>
                <div class="status">${this.connectionStatus}</div>
            </div>
        `;
    }

    /** @public @returns {boolean} */
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

    /** @private */
    async nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
        }
    }

    /** @private */
    async generateOffer() {
        try {
            this.rpiServerUrl = `http://${this.rpiAddress}:${this.rpiPort}`;
            this.peerConnection = new RTCPeerConnection({ iceServers: [] });

            this.peerConnection.ontrack = (event) => {
                console.log("Received remote track:", event.track.kind);
                if (event.track.kind === 'video') {
                    this.videoStream = new MediaStream([event.track]);
                    this.hasVideoStream = true;
                } else if (event.track.kind === 'audio') {
                    this.audioStream = new MediaStream([event.track]);
                    this.hasAudioStream = true;
                }

                this.requestUpdate();
                
                if (this.isConnectedState) {
                    this.dispatchConnectionChangedEvent({
                        connected: true,
                        status: 'Connected',
                        hasVideo: this.hasVideoStream,
                        hasAudio: this.hasAudioStream
                    });
                }
            };

            if (this.requestVideo) {
                this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            }

            if (this.requestAudio) {
                this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });
            }

            this.dataChannel = this.peerConnection.createDataChannel('messages', {
                ordered: true
            });

            this.setupDataChannel();
            this.setupPeerConnection();

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

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
            offerDisplay.focus();
            offerDisplay.setSelectionRange(0, offerDisplay.value.length);
            const copied = document.execCommand('copy');
            offerDisplay.blur();

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
            answerInput.value = '';
            this.currentStep = 3;
            this.updateStatus('Connecting...', false);

        } catch (error) {
            console.error('Error setting answer:', error);
            alert('Error setting answer: ' + error.message);
        }
    }

    /** @private */
    cleanupMediaResources() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        this.hasVideoStream = false;

        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        this.hasAudioStream = false;
    }

    /** @private */
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.isConnectedState = true;
            this.updateStatus('Connected', true);
            this.requestUpdate();

            this.dispatchConnectionChangedEvent({
                connected: true,
                status: 'Connected',
                hasVideo: this.hasVideoStream,
                hasAudio: this.hasAudioStream
            });
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            if (this.isConnectedState) {
                this.cleanupMediaResources();
                this.isConnectedState = false;
                this.updateStatus('Disconnected', false);
                this.currentStep = 1;
                this.requestUpdate();

                this.dispatchConnectionChangedEvent({
                    connected: false,
                    status: 'Disconnected',
                    hasVideo: false,
                    hasAudio: false
                });

                setTimeout(() => {
                    this.generateOffer();
                }, 100);
            }
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received message:', event.data);
            this.dispatchEvent(new CustomEvent('message-received', {
                detail: { message: event.data },
                bubbles: true
            }));
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateStatus('Connection Error', false);
            this.dispatchConnectionChangedEvent({
                connected: false,
                status: 'Connection Error',
                hasVideo: false,
                hasAudio: false
            });
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
                    this.dispatchConnectionChangedEvent({
                        connected: true,
                        status: 'Connected',
                        hasVideo: this.hasVideoStream,
                        hasAudio: this.hasAudioStream
                    });
                    break;
                case 'disconnected':
                case 'failed':
                    this.cleanupMediaResources();
                    const status = this.peerConnection.iceConnectionState === 'disconnected' 
                        ? 'Disconnected' 
                        : 'Connection Failed';
                    
                    this.updateStatus(status, false);
                    this.isConnectedState = false;
                    this.currentStep = 1;
                    this.requestUpdate();
                    
                    this.dispatchConnectionChangedEvent({
                        connected: false,
                        status: status,
                        hasVideo: false,
                        hasAudio: false
                    });
                    
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
        this.cleanupMediaResources();

        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.isConnectedState = false;
        this.currentStep = 1;
        this.updateStatus('Connection closed manually', false);

        const answerInput = this.shadowRoot.querySelector('#answerSdp');
        if (answerInput) {
            answerInput.value = '';
        }

        this.requestUpdate();

        this.dispatchConnectionChangedEvent({
            connected: false,
            status: 'Connection closed manually',
            hasVideo: false,
            hasAudio: false
        });

        setTimeout(() => {
            this.generateOffer();
        }, 100);
    }

    /** @private */
    dispatchConnectionChangedEvent(detail) {
        const stateChanged =
            this.lastConnectionState.connected !== detail.connected ||
            this.lastConnectionState.status !== detail.status ||
            this.lastConnectionState.hasVideo !== detail.hasVideo ||
            this.lastConnectionState.hasAudio !== detail.hasAudio;

        if (stateChanged) {
            this.lastConnectionState = { ...detail };
            this.dispatchEvent(new CustomEvent('connection-changed', {
                detail,
                bubbles: true
            }));
            console.log('Connection state changed:', detail);
        }
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
