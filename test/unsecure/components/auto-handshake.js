// Dieses custom element feuert ein CustomEvent namens 'offer-received', welches die offer über event.detail.offer als string bereitstellt.
// Im Anschluss wird erwaretet, dass die setAnswer(answer: string) method aufgerufen wird um die answer zu setzen.

import { LitElement, html, css } from 'lit';

const TARGET_ORIGIN = new URLSearchParams(location.search).get('target_origin');
if (TARGET_ORIGIN === null) throw new Error('target_origin search param not specified');

export class AutoHandshake extends LitElement {
    static properties = {
        state: { type: String, attribute: false },
    };

    static styles = css``;

    constructor() {
        super();

        /** @private @type {'waiting-offer' | 'waiting-answer' | 'waiting-close'} */
        this.state = 'waiting-offer';

        /** @private @type {AbortController | null} */
        this.controller = null;

        /** @private @type {Window | null} */
        this.w = window.opener;
    }

    connectedCallback() {
        super.connectedCallback();

        this.controller = new AbortController();

        window.addEventListener('message', event => {
            if (event.origin === TARGET_ORIGIN) {
                if (event.data.type === 'offer') {
                    this.state = 'waiting-answer';

                    this.dispatchEvent(new CustomEvent('offer-received', {
                        detail: {
                            offer: event.data.offer,
                        },
                    }));
                }
            }
        }, { signal: this.controller.signal });

        // Tell opener, auto mode is used
        if (this.w) this.w.postMessage({
            type: 'auto',
        }, TARGET_ORIGIN);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.controller) this.controller.abort();
    }

    /** @public @param {string} answer */
    setAnswer(answer) {
        if (this.w) this.w.postMessage({
            type: 'answer',
            answer,
        }, TARGET_ORIGIN);

        this.state = 'waiting-close';
    }

    /** @private */
    closePage() {
        window.close();
    }

    render() {
        if (this.w) {
            if (this.state === 'waiting-offer') {
                return html`
                    Suche Controller ID...
                `;
            }

            if (this.state === 'waiting-answer') {
                return html`
                    Abrufen der Geräte ID...
                `;
            }

            if (this.state === 'waiting-close') {
                return html`
                    Verbunden!
                    <button type="button" @click=${this.closePage}>Zurück zur App</button>
                `;
            }

            return null;
        } else {
            return html`
                Automatische Verbindung fehlgeschlagen. Führen Sie eine manuelle Verbindung durch.
                <button type="button" @click=${this.closePage}>Zurück zur App</button>
            `;
        }
    }
}

customElements.define('auto-handshake', AutoHandshake);
