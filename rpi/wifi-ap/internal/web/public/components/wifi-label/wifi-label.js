import { LitElement, html, css } from 'lit';

const dirname = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);

export class WifiLabel extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        iframe {
            border: none;
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
    }

    /** @param {string} data @public */
    createQRCode = async (data) => {
        const iFrameWindow = await this.iFrameWindow;

        return await iFrameWindow.createQRCode(data);
    };

    render() {
        return html`
            <!-- This iframe does not show anything in the dom but to load, its required, to be placed in the dom -->
            ${this.iFrame}
        `;
    }
}

customElements.define('wifi-label', WifiLabel);
