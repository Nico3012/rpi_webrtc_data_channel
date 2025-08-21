// Vor klick auf Verbinden wird erwaretet, dass die setOffer(offer: string) method aufgerufen wird um die offer zu setzen.
// Dieses custom element feuert ein CustomEvent namens 'answer-received', welches die answer über event.detail.answer als string bereitstellt.

import { LitElement, html, css } from 'lit';

const TARGET_ORIGIN = 'http://localhost:8081';
const TARGET = 'myPopupWindow';
const FORCE_MANUAL_MODE = false;

export class HandshakeManager extends LitElement {
    static properties = {
        state: { type: String, attribute: false },
        offer: { type: String, attribute: false },
        offerCopied: { type: Boolean, attribute: false },
    };

    static styles = css``;

    constructor() {
        super();

        /** @private @type {'ready' | 'manual-offer' | 'manual-waiting-answer' | 'auto-waiting-answer' | 'done'} */
        this.state = 'ready';

        /** @private */
        this.offer = '';

        /** @private */
        this.offerCopied = false;

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

                    this.state = 'auto-waiting-answer';
                }

                if (event.data.type === 'answer') {
                    this.dispatchEvent(new CustomEvent('answer-received', {
                        detail: {
                            answer: event.data.answer,
                        },
                    }));

                    this.state = 'done';
                }
            }
        }, { signal: this.controller.signal });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.controller) this.controller.abort();
    }

    /** @public @param {string} offer */
    setOffer(offer) {
        this.offer = offer;
    }

    /** @private */
    copyOffer() {
        const offerInput = this.renderRoot.querySelector('input[name="offer"]');
        if (offerInput === null) throw new Error('somehow the offer input is not displayed at the moment but the copy button was clicked');

        offerInput.focus();
        offerInput.setSelectionRange(0, offerInput.value.length);
        // using old execCommand because navigator.clipboard is only available in https
        const copied = document.execCommand('copy');
        offerInput.blur();

        if (copied) {
            this.offerCopied = true;

            setTimeout(() => {
                this.offerCopied = false;
            }, 2000);
        }
    }

    /** @private */
    startAutoConnection() {
        if (FORCE_MANUAL_MODE) {
            window.open(`${TARGET_ORIGIN}/auto/`, TARGET, 'noopener');
        } else {
            window.open(`${TARGET_ORIGIN}/auto/`, TARGET);
        }

        // fallback to manual offer until receiving auto message
        this.state = 'manual-offer';
    }

    /** @private */
    startManualConnection() {
        if (FORCE_MANUAL_MODE) {
            window.open(`${TARGET_ORIGIN}/manual/`, TARGET, 'noopener');
        } else {
            window.open(`${TARGET_ORIGIN}/manual/`, TARGET);
        }

        // display waiting answer state
        this.state = 'manual-waiting-answer';
    }

    /** @private @param {SubmitEvent} event */
    handleAnswerSubmit(event) {
        event.preventDefault();

        /** @type {string} */
        const answer = new FormData(event.target).get('answer');

        this.dispatchEvent(new CustomEvent('answer-received', {
            detail: {
                answer,
            },
        }));

        this.state = 'done';
    }

    render() {
        if (this.state === 'ready') {
            return html`
                <button type="button" @click=${this.startAutoConnection}>Verbinden</button>
            `;
        }

        if (this.state === 'manual-offer') {
            return html`
                Kopiere die Controller ID:
                <div>
                    <input type="text" name="offer" value=${this.offer}>
                    <button type="button" @click=${this.copyOffer}>${this.offerCopied ? html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    ` : html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    `}</button>
                </div>
                <button type="button" @click=${this.startManualConnection}>Verbinden</button>
            `;
        }

        if (this.state === 'manual-waiting-answer') {
            return html`
                <form @submit=${this.handleAnswerSubmit}>
                    Gebe die Geräte ID ein:
                    <input type="text" name="answer">
                    <button type="submit">Verbinden</button>
                </form>
            `;
        }

        if (this.state === 'auto-waiting-answer') {
            return html`
                Controller ID gesendet. Warten auf Geräte ID...
            `;
        }

        if (this.state === 'done') {
            return html`
                Verbunden!
            `;
        }

        return null;
    }
}

customElements.define('handshake-manager', HandshakeManager);
