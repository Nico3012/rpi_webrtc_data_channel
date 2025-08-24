import { LitElement, html, css } from 'lit';
import './handshake-manager.js';

class WebRTCConnection extends LitElement {

    // lit property
    static properties = {
        requestVideo: { type: Boolean, attribute: 'request-video' },
        requestAudio: { type: Boolean, attribute: 'request-audio' },
        offer: { type: String, attribute: false },
        state: { type: String, attribute: false },
    };

    // lit property
    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
        }

        div.status {
            margin: 8px;
            padding: 7px;
            border: 1px solid black;
            text-align: center;
            font-size: 16px;
            font-family: monospace;
            line-height: 1.5;
            border-radius: 20px;
            color: black;
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

        /** @private @type {'disconnected' | 'connecting' | 'connected'} */
        this.state = 'disconnected';

        /** @private @type {AbortController | null} */
        this.controller = null;
    }

    firstUpdated() {
        this.init();
    }

    /** @public @returns {MediaStream | null} */
    getVideoStream() {
        return this.requestVideo && this.videoStream ? this.videoStream : null;
    }

    /** @public @returns {MediaStream | null} */
    getAudioStream() {
        return this.requestAudio && this.audioStream ? this.audioStream : null;
    }

    /**
     * Returns the state of the data channel. (If it is able to send and receive messages)
     * @public
     * @returns {boolean}
     */
    isConnected() {
        return this.dataChannel?.readyState === 'open';
    }

    /** @public @param {string} data @returns {void} */
    sendData(data) {
        if (!this.isConnected()) throw new Error('Data channel is not open');
        this.dataChannel.send(data);
    }

    /** @private */
    reset() {
        console.log('Reset webrtc-component now.');
        this.state = 'disconnected';
        this.init();
    }

    /** @private */
    async init() {
        try {
            // cleanup everything:

            if (this.controller) this.controller.abort();
            this.controller = new AbortController();

            // stop all tracks
            this.videoStream?.getTracks().forEach(track => track.stop());
            this.audioStream?.getTracks().forEach(track => track.stop());
            this.videoStream = null;
            this.audioStream = null;

            // close data channel
            this.dataChannel?.close();
            this.dataChannel = null;

            this.peerConnection?.close();
            this.peerConnection = null;

            // start new connection:

            this.peerConnection = new RTCPeerConnection();

            // general state of everything
            this.peerConnection.addEventListener('connectionstatechange', (event) => {
                if (this.peerConnection.connectionState === 'new' || this.peerConnection.connectionState === 'connecting') {
                    this.state = 'connecting';
                } else if (this.peerConnection.connectionState === 'connected') {
                    this.state = 'connected';
                } else if (this.peerConnection.connectionState === 'disconnected' || this.peerConnection.connectionState === 'failed' || this.peerConnection.connectionState === 'closed') {
                    this.reset();
                } else {
                    throw new Error(`unexpected state in connectionstatechange event: ${this.peerConnection.connectionState}`);
                }

                // emit change event, because connection state has changed
                this.dispatchEvent(new CustomEvent('connection-update'));
            }, { signal: this.controller.signal });

            this.peerConnection.addEventListener('track', (event) => {
                if (event.track.kind === 'video') {
                    this.videoStream = new MediaStream([event.track]);
                }

                if (event.track.kind === 'audio') {
                    this.audioStream = new MediaStream([event.track]);
                }

                // emit change event, because video or audio is now available
                this.dispatchEvent(new CustomEvent('connection-update'));

                event.track.addEventListener('ended', () => {
                    if (event.track.kind === 'video') {
                        this.videoStream = null;
                    }

                    if (event.track.kind === 'audio') {
                        this.audioStream = null;
                    }

                    // do not reset component, because media tracks are no key features of this component. ended event also is not a connection error!

                    // emit change event, because video or audio is now not available
                    this.dispatchEvent(new CustomEvent('connection-update'));
                }, { signal: this.controller.signal });
            }, { signal: this.controller.signal });

            // add transceiver for video and audio if requested
            if (this.requestVideo) this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            if (this.requestAudio) this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

            // data channel:

            this.dataChannel = this.peerConnection.createDataChannel('messages', { ordered: true });

            this.dataChannel.addEventListener('open', () => {
                // emit change event, because data channel is now available
                this.dispatchEvent(new CustomEvent('connection-update'));

                // no need to set this.state, because data channel can only be open when connection state is connected!
            }, { signal: this.controller.signal });

            this.dataChannel.addEventListener('closing', () => {
                // emit change event, because data channel state has changed
                this.dispatchEvent(new CustomEvent('connection-update'));

                // reset component, because data channel is a critical core feature of this component
                this.reset();
            }, { signal: this.controller.signal });

            this.dataChannel.addEventListener('close', () => {
                // emit change event, because data channel state has changed
                this.dispatchEvent(new CustomEvent('connection-update'));

                // reset component, because data channel is a critical core feature of this component
                this.reset();
            }, { signal: this.controller.signal });

            this.dataChannel.addEventListener('error', () => {
                // emit change event, because data channel state has changed
                this.dispatchEvent(new CustomEvent('connection-update'));

                // reset component, because data channel is a critical core feature of this component
                this.reset();
            }, { signal: this.controller.signal });

            this.dataChannel.addEventListener('message', (event) => {
                this.dispatchEvent(new CustomEvent('message-received', { detail: { message: event.data } }));
            }, { signal: this.controller.signal });

            // create offer and assign it

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.offer = btoa(JSON.stringify(this.peerConnection.localDescription));
        } catch (error) {
            console.error('Error on initialization:', error);
            alert(`Error on initialization: ${error.message}`);
        }
    }

    /** @private @param {CustomEvent} e */
    async setAnswer(e) {
        try {
            const answer = JSON.parse(atob(e.detail.answer));
            await this.peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error setting answer:', error);
            alert(`Error setting answer: ${error.message}`);
        }
    }

    /** @private */
    closeConnection() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
    }

    // lit property
    render() {
        if (this.state === 'connected') {
            return html`
                <button @click="${this.closeConnection}">Disconnect</button>
            `;
        }

        if (this.state === 'connecting') {
            return html`
                <div class="status">Connecting...</div>
            `;
        }

        if (this.state === 'disconnected') {
            return html`
                <handshake-manager .offer=${this.offer} @answer-received=${this.setAnswer}></handshake-manager>
            `;
        }

        return null;
    }
}

customElements.define('webrtc-connection', WebRTCConnection);
