// Vor klick auf Verbinden wird erwaretet, dass die property offer: string gesetzt wird.
// Dieses custom element feuert ein CustomEvent namens 'answer-received', welches die answer über event.detail.answer als string bereitstellt.
// Das Nach erfolgreichem Handshake setzt sich das Element auf den Anfangsstatus zurück

import { LitElement, html, css } from 'lit';
import './manual-handshake.js';
import './auto-handshake.js';

const MODE_STORAGE_NAME = 'handshake-manager-manual-mode';

export class HandshakeManager extends LitElement {
    static properties = {
        auto: { type: Boolean, attribute: false },
        offer : { type: String, attribute: false },
    };

    static styles = css``;

    constructor() {
        super();

        /** @private @type {boolean} */
        this.auto = localStorage.getItem(MODE_STORAGE_NAME) !== 'true';

        /** @public @type {string} */
        this.offer = '';
    }

    /** @private @param {Event} event */
    toggleAutoMode(event) {
        if (event.target.checked) {
            localStorage.removeItem(MODE_STORAGE_NAME);
            this.auto = true;
        } else {
            localStorage.setItem(MODE_STORAGE_NAME, 'true');
            this.auto = false;
        }
    }

    /** @private */
    handleAnswerReceived(event) {
        this.dispatchEvent(new CustomEvent('answer-received', {
            detail: {
                answer: event.detail.answer,
            },
        }));
    }

    render() {
        if (this.auto) {
            return html`
                Auto mode: <input type="checkbox" @change=${this.toggleAutoMode} checked>
                <auto-handshake .offer=${this.offer} @answer-received=${this.handleAnswerReceived}></auto-handshake>
            `;
        } else {
            return html`
                Auto mode: <input type="checkbox" @change=${this.toggleAutoMode}>
                <manual-handshake .offer=${this.offer} @answer-received=${this.handleAnswerReceived}></manual-handshake>
            `;
        }
    }
}

customElements.define('handshake-manager', HandshakeManager);
