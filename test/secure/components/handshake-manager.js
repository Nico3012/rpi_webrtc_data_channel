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

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
        }

        div {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        span {
            margin: 8px;
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }

        input {
            flex-shrink: 0;
            margin: 8px;
            padding: 8px;
            border: 2px solid black;
            outline: none;
            appearance: none;
            background-image: url("data:image/svg+xml;utf8,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='40'%20height='20'%20viewBox='0%200%2040%2020'><rect%20width='40'%20height='20'%20fill='transparent'/><circle%20cx='10'%20cy='10'%20r='6'%20fill='%23000'/></svg>");
            box-sizing: border-box;
            width: 44px;
            height: 24px;
            border-radius: 12px;
        }

        input:checked {
            background-image: url("data:image/svg+xml;utf8,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='40'%20height='20'%20viewBox='0%200%2040%2020'><rect%20width='40'%20height='20'%20fill='transparent'/><circle%20cx='30'%20cy='10'%20r='6'%20fill='%23000'/></svg>");
        }
    `;

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
                <div><span>Auto mode:</span><input type="checkbox" @change=${this.toggleAutoMode} checked></div>
                <auto-handshake .offer=${this.offer} @answer-received=${this.handleAnswerReceived}></auto-handshake>
            `;
        } else {
            return html`
                <div><span>Auto mode:</span><input type="checkbox" @change=${this.toggleAutoMode}></div>
                <manual-handshake .offer=${this.offer} @answer-received=${this.handleAnswerReceived}></manual-handshake>
            `;
        }
    }
}

customElements.define('handshake-manager', HandshakeManager);
