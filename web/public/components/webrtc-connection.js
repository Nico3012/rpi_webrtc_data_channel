import { LitElement, html, css } from 'lit';
import './handshake-manager.js';

class WebRTCConnection extends LitElement {

    // lit property
    static properties = {
        requestVideo: { type: Boolean, attribute: 'request-video' },
        requestAudio: { type: Boolean, attribute: 'request-audio' },
        offer: { type: String, attribute: false },
    };

    // lit property
    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
        }

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
    `;

    constructor() {
        super();
        this.peerConnection = null;
        this.dataChannel = null;
        this.videoStream = null;
        this.audioStream = null;
        this.requestVideo = false;
        this.requestAudio = false;
        this.offer = '';
    }

    // lit property
    firstUpdated() {
        this.generateOffer();
    }

    // lit property
    render() {
        if (this.isConnected()) {
            return html`
                <button @click="${this.closeConnection}">Disconnect</button>
            `;
        } else {
            return html`
                <handshake-manager .offer=${this.offer} @answer-received=${this.setAnswer}></handshake-manager>
            `;
        }
    }

    /** @public @returns {MediaStream | null} */
    getVideoStream() {
        return this.requestVideo && this.videoStream ? this.videoStream : null;
    }

    /** @public @returns {MediaStream | null} */
    getAudioStream() {
        return this.requestAudio && this.audioStream ? this.audioStream : null;
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
            this.peerConnection = new RTCPeerConnection();

            this.peerConnection.ontrack = (event) => {
                if (event.track.kind === 'video') this.videoStream = new MediaStream([event.track]);
                else if (event.track.kind === 'audio') this.audioStream = new MediaStream([event.track]);
                this._emitConnectionIfChanged();
                this.requestUpdate();
            };

            if (this.requestVideo) this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            if (this.requestAudio) this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

            this.dataChannel = this.peerConnection.createDataChannel('messages', { ordered: true });

            this.dataChannel.onopen = () => {
                console.log('Data channel opened');
                this._emitConnectionIfChanged();
                this.requestUpdate();
            };

            this.dataChannel.onclose = () => {
                console.log('Data channel closed');
                this.cleanupMediaResources();
                this._emitConnectionIfChanged();
                setTimeout(() => this.generateOffer(), 100);
                this.requestUpdate();
            };

            this.dataChannel.onmessage = (event) => {
                this.dispatchEvent(new CustomEvent('message-received', { detail: { message: event.data } }));
            };

            this.dataChannel.onerror = (error) => {
                console.error('Data channel error:', error);
                this._emitConnectionIfChanged();
                this.requestUpdate();
            };

            this.peerConnection.oniceconnectionstatechange = () => {
                const state = this.peerConnection.iceConnectionState;
                console.log('ICE connection state:', state);
                if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                    this.cleanupMediaResources();
                    setTimeout(() => this.generateOffer(), 100);
                }
                this._emitConnectionIfChanged();
                this.requestUpdate();
            };

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.offer = btoa(JSON.stringify(this.peerConnection.localDescription));
        } catch (error) {
            console.error('Error generating offer:', error);
            alert('Error generating offer: ' + (error.message || error));
        }
    }

    /** @private @param {CustomEvent} e */
    async setAnswer(e) {
        try {
            const answer = JSON.parse(atob(e.detail.answer));
            if (!answer.type || !answer.sdp || answer.type !== 'answer') throw new Error('Invalid answer');
            await this.peerConnection.setRemoteDescription(answer);
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
    closeConnection() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
    }

    /** @private */
    _emitConnectionIfChanged() {
        this.dispatchEvent(new CustomEvent('connection-changed'));
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
