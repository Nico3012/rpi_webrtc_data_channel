// Dieses custom element feuert ein CustomEvent namens 'offer-received', welches die offer über event.detail.offer als string bereitstellt.
// Im Anschluss wird erwaretet, dass die setAnswer(answer: string) method aufgerufen wird um die answer zu setzen.

import { LitElement, html, css } from 'lit';

export class ManualHandshake extends LitElement {
    static properties = {
        answer: { type: String, attribute: false },
        answerCopied: { type: Boolean, attribute: false },
        waitForAnswer: { type: Boolean, attribute: false },
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
        }

        div.status {
            display: flex;
            justify-content: space-between;
            align-items: flex-start
        }

        span.description {
            color: black;
            margin: 8px;
            font-family: serif;
            font-size: 24px;
            line-height: 1.5;
        }

        span.state {
            flex-shrink: 0;
            background-color: black;
            color: white;
            margin: 8px;
            font-family: monospace;
            font-size: 16px;
            line-height: 1.5;
            padding: 8px 12px;
            border-radius: 20px;
        }

        form {
            display: flex;
            flex-direction: column;
        }

        input {
            display: block;
            appearance: none;
            margin: 8px;
            padding: 7px 11px;
            border-radius: 20px;
            border: 1px solid black;
            outline: none;
            background-color: white;
            color: black;
            text-decoration: none;
            font-family: sans-serif;
            font-size: 16px;
            font-weight: normal;
            line-height: 1.5;
            text-align: left;
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

        div.inline {
            display: flex;
            align-items: center;
        }

        div.inline input {
            flex-grow: 1;
        }

        div.inline button {
            display: flex;
            padding: 12px;
        }
    `;

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
        const answerInput = this.renderRoot.querySelector('input[name="answer"]');
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
                    Searching...
                `;
            } else {
                return html`
                    <form @submit=${this.handleOfferSubmit}>
                        <div class="status"><span class="description">Gebe die Controller ID ein:</span><span class="state">2 / 4</span></div>
                        <input type="text" name="offer" placeholder="Controller ID">
                        <button type="submit">Suchen</button>
                    </form>
                `;
            }
        } else {
            return html`
                <div class="status"><span class="description">Gefunden! Kopiere die Geräte ID:</span><span class="state">3 / 4</span></div>
                <div class="inline">
                    <input type="text" name="answer" value=${this.answer} readonly>
                    <button type="button" @click=${this.copyAnswer}>${this.answerCopied ? html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    ` : html`
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    `}</button>
                </div>
                <button type="button" @click=${this.closePage}>Zurück zur App</button>
            `;
        }
    }
}

customElements.define('manual-handshake', ManualHandshake);
