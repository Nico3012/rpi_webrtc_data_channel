const ID_LENGTH = 6;

export class Channel extends EventTarget {
    /**
     * @param {import('./components/webrtc-connection.js').WebRTCConnection} webrtcConnection
     * @param {string} id
     */
    constructor(webrtcConnection, id) {
        super();

        /** @private @type {import('./components/webrtc-connection.js').WebRTCConnection} */
        this.webrtcConnection = webrtcConnection;
        /** @private @type {string} */
        this.id = id;

        webrtcConnection.addEventListener('message-received', (event) => {
            /** @type {string} */
            const message = event.detail.message;
            if (message.startsWith(id)) this.dispatchEvent(new CustomEvent('message-received', {
                detail: {
                    message: message.substring(ID_LENGTH),
                },
            }));
        });
    }

    /**
     * @param {string} data
     * @returns {void}
     */
    sendData(data) {
        this.webrtcConnection.sendData(`${this.id}${data}`);
    }
}

export class DataChannelMux {
    /** @param {import('./components/webrtc-connection.js').WebRTCConnection} webrtcConnection */
    constructor(webrtcConnection) {
        /** @private @type {import('./components/webrtc-connection.js').WebRTCConnection} */
        this.webrtcConnection = webrtcConnection;
    }

    /**
     * @public
     * @param {string} id 6 digit id
     */
    createChannel(id) {
        if (id.length !== ID_LENGTH) throw new Error(`id must be of length ${ID_LENGTH}`);

        return new Channel(this.webrtcConnection, id);
    }
}
