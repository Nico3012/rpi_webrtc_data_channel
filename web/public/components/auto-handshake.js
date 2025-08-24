// Setzen Sie 'target-origin' als attribut z.B. target-origin="http://10.3.141.1:8080"
// Vor klick auf Verbinden wird erwaretet, dass die property offer: string gesetzt wird.
// Dieses custom element feuert ein CustomEvent namens 'answer-received', welches die answer über event.detail.answer als string bereitstellt.
// Das Nach erfolgreichem Handshake setzt sich das Element auf den Anfangsstatus zurück

import { LitElement, html, css } from 'lit';

const TARGET = 'myPopupWindow';
const FORCE_MANUAL_MODE = false;

export class AutoHandshake extends LitElement {
    static properties = {
        state: { type: String, attribute: false },
        targetOrigin: { type: String, attribute: 'target-origin' },
    };

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

        /** @private @type {'ready' | 'waiting-answer'} */
        this.state = 'ready';

        /** @private */
        this.targetOrigin = '';

        /** @public @type {string} */
        this.offer = '';

        /** @private @type {AbortController | null} */
        this.controller = null;
    }

    connectedCallback() {
        super.connectedCallback();

        this.controller = new AbortController();

        window.addEventListener('message', event => {
            if (event.origin === this.targetOrigin) {
                if (event.data.type === 'auto') {
                    event.source.postMessage({
                        type: 'offer',
                        offer: this.offer,
                    }, this.targetOrigin);

                    this.state = 'waiting-answer';
                }

                if (event.data.type === 'answer') {
                    this.dispatchEvent(new CustomEvent('answer-received', {
                        detail: {
                            answer: event.data.answer,
                        },
                    }));

                    this.state = 'ready';
                }
            }
        }, { signal: this.controller.signal });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.controller) this.controller.abort();
    }

    /** @private */
    openPage() {
        if (FORCE_MANUAL_MODE) {
            window.open(`${this.targetOrigin}/auto/?target_origin=${encodeURIComponent(location.origin)}`, TARGET, 'noopener');
        } else {
            window.open(`${this.targetOrigin}/auto/?target_origin=${encodeURIComponent(location.origin)}`, TARGET);
        }

        // state change is managed by the message event
    }

    render() {
        if (this.state === 'ready') {
            return html`
                <button type="button" @click=${this.openPage}>Verbinden</button>
            `;
        }

        if (this.state === 'waiting-answer') {
            return html`
                <div class="status">Controller ID gesendet. Warten auf Geräte ID...</div>
            `;
        }

        return null;
    }
}

customElements.define('auto-handshake', AutoHandshake);
