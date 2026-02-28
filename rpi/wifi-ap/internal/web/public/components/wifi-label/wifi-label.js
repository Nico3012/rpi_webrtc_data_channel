import { LitElement, html, css } from 'lit';

const dirname = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);

export class WifiLabel extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        iframe {
            margin: 0;
            padding: 0;
            border: none;
            outline: none;
            width: 0;
            height: 0;
        }

        .label {
            padding: 1mm;
            display: none;
            border: 0.4mm solid black;
        }

        .label img {
            margin: 1mm;
            width: 15mm;
            height: 15mm;
        }

        .label .details {
            margin: 1mm;
            display: flex;
            flex-direction: column;
        }

        .label .details span {
            font-size: 4mm;
            line-height: 1.25;
        }

        button {
            display: block;
            appearance: none;
            margin: 8px;
            padding: 8px 12px;
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

        @media print {
            .label {
                display: flex;
            }

            .controls {
                display: none;
            }
        }

        [hidden] {
            display: none;
        }
    `;

    static properties = {
        ssid: { type: String, attribute: false },
        password: { type: String, attribute: false },
        devicePassword: { type: String, attribute: false },
    };

    constructor() {
        super();

        /** @type {HTMLIFrameElement} @private */
        this.iFrame = document.createElement('iframe');
        this.iFrame.src = `${dirname}iframe/`;

        /** @type {Promise<any>} @private */
        this.iFrameWindow = new Promise(resolve => {
            this.iFrame.addEventListener('load', () => {
                const contentWindow = this.iFrame.contentWindow;
                if (!contentWindow) throw new Error('somehow contentWindow null on load event');
                resolve(contentWindow);
            });
        });

        /** @type {HTMLImageElement} @private */
        this.image = document.createElement('img');
        this.image.alt = 'QR Code';

        /** @type {string} @private */ // wifi ssid
        this.ssid = '';

        /** @type {string} @private */ // wifi password
        this.password = '';

        /** @type {string} @private */ // device password, to make changes in the user interface
        this.devicePassword = '';
    }

    /** @param {string} ssid @param {string} password @param {string} devicePassword @public */
    setDetails = async (ssid, password, devicePassword) => {
        const iFrameWindow = await this.iFrameWindow;

        /** @type {string} */
        const base64 = await iFrameWindow.createQRCode(`WIFI:T:WPA;S:${ssid};P:${password};;`);

        this.image.src = base64;

        this.ssid = ssid;
        this.password = password;
        this.devicePassword = devicePassword;
    };

    /** @private */
    handlePrintClick = () => {
        window.print();
    }

    render() {
        return html`
            <div class="container">
                <!-- This iframe does not show anything in the dom but to load, its required, to be placed in the dom -->
                ${this.iFrame}
                <div class="label">
                    ${this.image}
                    <div class="details">
                        <span><strong>SSID:</strong> ${this.ssid}</span>
                        <span><strong>Passwort:</strong> ${this.password}</span>
                        <span><strong>Gerätepasswort:</strong> ${this.devicePassword}</span>
                    </div>
                </div>
                <div class="controls">
                    <button class="print" @click=${this.handlePrintClick}>Drucken</button>
                </div>
            </div>
        `;
    }
}

customElements.define('wifi-label', WifiLabel);
