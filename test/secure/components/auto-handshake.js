// Vor klick auf Verbinden wird erwaretet, dass die property offer: string gesetzt wird.
// Dieses custom element feuert ein CustomEvent namens 'answer-received', welches die answer über event.detail.answer als string bereitstellt.
// Das Nach erfolgreichem Handshake setzt sich das Element auf den Anfangsstatus zurück

import { LitElement, html, css } from 'lit';

const TARGET_ORIGIN = 'http://192.168.2.53:8081';
const TARGET = 'myPopupWindow';
const FORCE_MANUAL_MODE = false;

export class AutoHandshake extends LitElement {
    static properties = {
        state: { type: String, attribute: false },
    };

    static styles = css``;

    constructor() {
        super();

        /** @private @type {'ready' | 'waiting-answer'} */
        this.state = 'ready';

        /** @public @type {string} */
        this.offer = '';

        /** @private @type {AbortController | null} */
        this.controller = null;
    }

    connectedCallback() {
        super.connectedCallback();

        this.controller = new AbortController();

        window.addEventListener('message', event => {
            if (event.origin === TARGET_ORIGIN) {
                if (event.data.type === 'auto') {
                    event.source.postMessage({
                        type: 'offer',
                        offer: this.offer,
                    }, TARGET_ORIGIN);

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
            window.open(`${TARGET_ORIGIN}/auto/?target_origin=${encodeURIComponent(location.origin)}`, TARGET, 'noopener');
        } else {
            window.open(`${TARGET_ORIGIN}/auto/?target_origin=${encodeURIComponent(location.origin)}`, TARGET);
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
                Controller ID gesendet. Warten auf Geräte ID...
            `;
        }

        return null;
    }
}

customElements.define('auto-handshake', AutoHandshake);
