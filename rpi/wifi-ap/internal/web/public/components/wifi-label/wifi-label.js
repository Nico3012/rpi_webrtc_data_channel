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

        @media print {
            img {
                width: 5cm;
            }
        }

        [hidden] {
            display: none;
        }
    `;

    // static properties = {
    // };

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

        this.image = document.createElement('img');
        this.image.alt = 'qr-code';
    }

    /** @param {string} ssid @param {string} password @public */
    createQRCode = async (ssid, password) => {
        const iFrameWindow = await this.iFrameWindow;

        /** @type {string} */
        const base64 = await iFrameWindow.createQRCode(`WIFI:T:WPA;S:${ssid};P:${password};;`);

        this.image.src = base64;
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
                ${this.image}
                <button class="print" @click=${this.handlePrintClick}>Drucken</button>
            </div>
        `;
    }
}

customElements.define('wifi-label', WifiLabel);
