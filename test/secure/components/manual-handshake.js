// Vor klick auf Verbinden wird erwaretet, dass die property offer: string gesetzt wird.
// Dieses custom element feuert ein CustomEvent namens 'answer-received', welches die answer über event.detail.answer als string bereitstellt.
// Das Nach erfolgreichem Handshake setzt sich das Element auf den Anfangsstatus zurück

import { LitElement, html, css } from 'lit';

const TARGET_ORIGIN = 'http://192.168.2.53:8081';
const TARGET = 'myPopupWindow';
const FORCE_MANUAL_MODE = false;

export class ManualHandshake extends LitElement {
    static properties = {
        state: { type: String, attribute: false },
        offer: { type: String, attribute: false },
        offerCopied: { type: Boolean, attribute: false },
    };

    static styles = css``;

    constructor() {
        super();

        /** @private @type {'ready' | 'waiting-answer'} */
        this.state = 'ready';

        /** @public @type {string} */
        this.offer = '';

        /** @private */
        this.offerCopied = false;
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
    openPage() {
        if (FORCE_MANUAL_MODE) {
            window.open(`${TARGET_ORIGIN}/manual/`, TARGET, 'noopener');
        } else {
            window.open(`${TARGET_ORIGIN}/manual/`, TARGET);
        }

        // display waiting answer state
        this.state = 'waiting-answer';
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

        this.state = 'ready';
    }

    render() {
        if (this.state === 'ready') {
            return html`
                Kopiere die Controller ID:
                <div>
                    <input type="text" name="offer" value=${this.offer} readonly>
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
                <button type="button" @click=${this.openPage}>Weiter</button>
            `;
        }

        if (this.state === 'waiting-answer') {
            return html`
                <form @submit=${this.handleAnswerSubmit}>
                    Gebe die Geräte ID ein:
                    <input type="text" name="answer">
                    <button type="submit">Verbinden</button>
                </form>
            `;
        }

        return null;
    }
}

customElements.define('manual-handshake', ManualHandshake);
