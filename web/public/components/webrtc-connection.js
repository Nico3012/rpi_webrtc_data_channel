import { LitElement, html, css } from 'lit';
import './handshake-manager.js';

class WebRTCConnection extends LitElement {

    // lit property
    static properties = {
        // rpi-address and rpi-port removed: handshake-manager handles server details
        connectionStatus: { type: String },
        requestVideo: { type: Boolean, attribute: 'request-video' },
        requestAudio: { type: Boolean, attribute: 'request-audio' },
        offer: { type: String, attribute: false },
    };

    // lit property
    static styles = css`
        :host {
            display: block;
        }

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
        // minimal state: public attributes preserved per README
        this.connectionStatus = 'Disconnected';
        this.peerConnection = null;
        this.dataChannel = null;
        this.videoStream = null;
        this.audioStream = null;
        this.requestVideo = false;
        this.requestAudio = false;
        this._lastConnectionKey = '';
        this.offer = '';
    }

    // lit property
    firstUpdated() {
        this.generateOffer();
    }

    // lit property
    render() {
        return this.isConnected() ? this.renderConnectedView() : this.renderStepsView();
    }

    /** @private */
    renderConnectedView() {
        return html`
            <div class="step-container">
                <div class="step-header">
                    <h2>Device Connected</h2>
                </div>
                <button @click="${this.closeConnection}" class="btn">Disconnect</button>
            </div>
        `;
    }

    /** @public @returns {MediaStream | null} */
    getVideoStream() {
        return this.requestVideo && this.videoStream ? this.videoStream : null;
    }

    /** @public @returns {MediaStream | null} */
    getAudioStream() {
        return this.requestAudio && this.audioStream ? this.audioStream : null;
    }

    /** @private */
    renderStepsView() {
        return html`<handshake-manager .offer=${this.offer} @answer-received=${this.setAnswer2}></handshake-manager>`;
    }

    /** @public @returns {boolean} */
    isConnected() {
        return !!(this.dataChannel && this.dataChannel.readyState === 'open');
    }

    /** @public @param {string} data @returns {Promise<void>} */
    sendData(data) {
        if (!this.isConnected()) throw new Error('Data channel is not open');
        this.dataChannel.send(data);
        return Promise.resolve();
    }

    /** @private */
    async generateOffer() {
        try {
            this.peerConnection = new RTCPeerConnection({ iceServers: [] });

            this.peerConnection.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                if (event.track.kind === 'video') this.videoStream = new MediaStream([event.track]);
                else if (event.track.kind === 'audio') this.audioStream = new MediaStream([event.track]);
                this.requestUpdate();
                this._emitConnectionIfChanged();
            };

            if (this.requestVideo) this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            if (this.requestAudio) this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

            this.dataChannel = this.peerConnection.createDataChannel('messages', { ordered: true });

            this.setupDataChannel();
            this.setupPeerConnection();

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.offer = btoa(JSON.stringify(this.peerConnection.localDescription));
        } catch (error) {
            console.error('Error generating offer:', error);
            alert('Error generating offer: ' + (error.message || error));
        }
    }

    /** @private @param {CustomEvent} e */
    async setAnswer2(e) {
        try {
            const answer = JSON.parse(atob(e.detail.answer));
            if (!answer.type || !answer.sdp || answer.type !== 'answer') throw new Error('Invalid answer');
            await this.peerConnection.setRemoteDescription(answer);
            this.updateStatus('Connecting...', false);
        } catch (error) {
            console.error('Error setting answer:', error);
            alert('Error setting answer: ' + (error.message || error));
        }
    }

    /** @private */
    cleanupMediaResources() {
        if (this.videoStream) { this.videoStream.getTracks().forEach(t => t.stop()); this.videoStream = null; }
        if (this.audioStream) { this.audioStream.getTracks().forEach(t => t.stop()); this.audioStream = null; }
    }

    /** @private */
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.updateStatus('Connected', true);
            this._emitConnectionIfChanged();
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.cleanupMediaResources();
            this.updateStatus('Disconnected', false);
            this._emitConnectionIfChanged();
            setTimeout(() => this.generateOffer(), 100);
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received message:', event.data);
            this.dispatchEvent(new CustomEvent('message-received', { detail: { message: event.data }, bubbles: true }));
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateStatus('Connection Error', false);
            this._emitConnectionIfChanged();
        };
    }

    /** @private */
    setupPeerConnection() {
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log('ICE connection state:', state);
            if (state === 'connected' || state === 'completed') {
                this.updateStatus('Connected', true);
            } else if (state === 'disconnected' || state === 'failed') {
                this.cleanupMediaResources();
                this.updateStatus(state === 'disconnected' ? 'Disconnected' : 'Connection Failed', false);
                setTimeout(() => this.generateOffer(), 100);
            }
            this._emitConnectionIfChanged();
        };
    }

    /** @private */
    updateStatus(message, isConnected = false) {
        this.connectionStatus = message;
        // connected state is derived from dataChannel, no separate flag
        this.requestUpdate();
    }

    /** @private */
    closeConnection() {
        this.cleanupMediaResources();
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
        this.updateStatus('Connection closed manually', false);
        this._emitConnectionIfChanged();
        setTimeout(() => this.generateOffer(), 100);
    }

    /** @private */
    _emitConnectionIfChanged() {
        const detail = {
            connected: this.isConnected(),
            status: this.connectionStatus,
            hasVideo: !!this.videoStream,
            hasAudio: !!this.audioStream
        };
        const key = JSON.stringify(detail);
        if (key !== this._lastConnectionKey) {
            this._lastConnectionKey = key;
            this.dispatchEvent(new CustomEvent('connection-changed', { detail, bubbles: true }));
            console.log('Connection state changed:', detail);
        }
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
