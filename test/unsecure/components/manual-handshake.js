// Dieses custom element feuert ein CustomEvent namens 'offer-received', welches die offer über event.detail.offer als string bereitstellt.
// Im Anschluss wird erwaretet, dass die setAnswer(answer: string) method aufgerufen wird um die answer zu setzen.

import { LitElement, html, css } from 'lit';

class ManualHandshake extends LitElement {
    static properties = {
        answer: { type: String, attribute: false },
        answerCopied: { type: Boolean, attribute: false },
        waitForAnswer: { type: Boolean, attribute: false },
    };

    static styles = css``;

    constructor() {
        super();

        /** @private */
        this.answer = '';

        /** @private */
        this.answerCopied = false;

        /** @private */
        this.waitForAnswer = false;
    }

    /** @private @param {SubmitEvent} event */
    handleOfferSubmit(event) {
        event.preventDefault();

        /** @type {string} */
        const offer = new FormData(event.target).get('offer');

        this.dispatchEvent(new CustomEvent('offer-received', {
            detail: {
                offer,
            },
        }));

        this.waitForAnswer = true;
    }

    /** @public @param {string} answer */
    setAnswer(answer) {
        this.answer = answer;
        this.waitForAnswer = false;
    }

    /** @private */
    copyAnswer() {
        const answerInput = document.querySelector('input[name="answer"]');
        if (answerInput === null) throw new Error('somehow the answer input is not displayed at the moment but the copy button was clicked');

        answerInput.focus();
        answerInput.setSelectionRange(0, answerInput.value.length);
        // using old execCommand because navigator.clipboard is only available in https
        const copied = document.execCommand('copy');
        answerInput.blur();

        if (copied) {
            this.answerCopied = true;

            setTimeout(() => {
                this.answerCopied = false;
            }, 2000);
        }
    }

    /** @private */
    closePage() {
        window.close();
    }

    render() {
        if (this.answer === '') {
            if (this.waitForAnswer) {
                return html`
                    <form @submit=${this.handleOfferSubmit}>
                        Gebe die Controller ID ein:
                        <input type="text" name="offer">
                        <button type="submit">Suchen</button>
                    </form>
                `;
            } else {
                return html`
                    Searching...
                `;
            }
        } else {
            return html`
                Kopiere die Geräte ID:
                <div>
                    <input type="text" name="answer" value=${this.answer}>
                    <button type="button" @click=${this.copyAnswer}>${this.answerCopied ? html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    ` : html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    `}</button>
                </div>
                <button type="button" @click=${this.closePage}>Zurück zur App</button>
            `;
        }
    }
}

customElements.define('manual-handshake', ManualHandshake);
