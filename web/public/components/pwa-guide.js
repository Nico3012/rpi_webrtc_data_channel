import { LitElement, html, css } from 'lit';

export class PwaGuide extends LitElement {
    static properties = {
        closed: { type: Boolean, attribute: false }, // if the guide is closed by the user (including localstorage)
        guide: { type: String, attribute: false }, // the name of the guide, that is shown e.g. ios
        state: { type: String, attribute: false }, // 'guide' | 'installable' | 'installing' | 'installed'
    };

    static styles = css`
        div.wrapper {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #00000030;
            backdrop-filter: blur(8px);
            z-index: 999;
        }

        div.container {
            flex-grow: 1;
            margin: 16px;
            padding: 8px;
            background-color: white;
            border-radius: 20px;
            max-width: 480px;
            display: flex;
            flex-direction: column;
        }

        h2 {
            margin: 8px;
            margin-bottom: 24px;
            font-family: sans-serif;
            font-size: 24px;
            line-height: 1.5;
            font-weight: bold;
        }

        button.primary {
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
            cursor: pointer;
        }

        div.status {
            margin: 8px;
            padding: 8px;
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
            border: none;
            border-radius: 20px;
            text-align: center;
            background-color: black;
            color: white;
        }

        div.guide-content {
            margin: 8px;
            display: flex;
            flex-direction: column;
        }

        div.guide-selector {
            display: flex;
            gap: 16px;
        }

        div.guide-selector button {
            flex-grow: 1;
            display: block;
            appearance: none;
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
            cursor: pointer;
        }

        div.guide {
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }

        div.guide ol {
            margin: 16px 0;
            padding-left: 20px;
            text-align: left;
        }

        div.guide li {
            margin-bottom: 12px;
        }

        div.guide img {
            width: 24px;
            height: 24px;
            vertical-align: middle;
            margin: 0 4px;
        }

        label.close-hint {
            margin: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        label.close-hint span {
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }

        input.close-immediately {
            margin: 0;
        }

        button.secondary {
            display: block;
            appearance: none;
            margin: 8px;
            padding: 7px;
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
            text-align: center;
            cursor: pointer;
        }

        [hidden] {
            display: none !important;
        }

        @media (display-mode: standalone) {
            div.wrapper {
                display: none;
            }
        }
    `;

    constructor() {
        super();

        /** @private @type {boolean} */
        this.closed = JSON.parse(localStorage.getItem('pwa-guide-close-immediately') || 'false');

        /** @private @type {string} */
        this.guide = 'ios'; // set to ios, because we expect android to fire a beforeinstallprompt event

        /** @private @type {string} */
        this.state = 'guide';

        /** @private @type {BeforeInstallPromptEvent | null} */
        this.event = null;

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.state = 'installable';
            this.event = event;
        }, { passive: false });
    }

    /** @private */
    async installPWA() {
        if (!this.event) throw new Error('this.event is null');
        this.state = 'installing';

        try {
            const result = await this.event.prompt();

            if (result.outcome === 'accepted') {
                this.state = 'installed';
            } else {
                // fallback to guide
                this.state = 'guide';
            }

            this.event = null;
        } catch (error) {
            console.error(error);

            // fallback to guide
            this.state = 'guide';
        }
    }

    /** @private */
    closeGuide() {
        /** @type {HTMLInputElement | null} */
        const checkbox = this.renderRoot.querySelector('input.close-immediately');
        if (!checkbox) throw new Error('input.close-immediately checkbox not found');

        if (checkbox.checked) {
            localStorage.setItem('pwa-guide-close-immediately', 'true');
        } else {
            localStorage.setItem('pwa-guide-close-immediately', 'false');
        }

        this.closed = true;
    }

    render() {
        switch (this.closed) {
            case true:
                return null;
            default:
                return html`
                    <div class="wrapper">
                        <div class="container">
                            <h2>App installieren</h2>
                            <button class="primary" @click=${this.installPWA} ?hidden=${this.state !== 'installable'}>Installieren</button>
                            <div class="status" ?hidden=${this.state !== 'installing'}>
                                Installiert... ⏳
                            </div>
                            <div class="status" ?hidden=${this.state !== 'installed'}>
                                Installiert 🎉
                            </div>
                            <div class="guide-content" ?hidden=${this.state !== 'guide'}>
                                <div class="guide-selector">
                                    <button @click=${()=> this.guide = 'ios'}>iOS</button>
                                    <button @click=${()=> this.guide = 'android'}>Android</button>
                                </div>
                                <div class="guide ios" ?hidden=${this.guide !=='ios'}>
                                    <ol>
                                        <li>
                                            Tippe auf <strong>Teilen</strong> (<img src="/assets/share-icon-apple.svg" alt="Share icon Apple">).
                                        </li>
                                        <li>
                                            Wähle <strong>„Zum Home-Bildschirm"</strong> aus, um diese App zu installieren.
                                        </li>
                                    </ol>
                                </div>
                                <div class="guide android" ?hidden=${this.guide !=='android'}>
                                    <ol>
                                        <li>
                                            Öffne das <strong>Menü</strong> (<img src="/assets/android-chrome-menu-icon.svg" alt="Android Chrome menu icon">) oben rechts in Chrome.
                                        </li>
                                        <li>
                                            Wähle <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm hinzufügen"</strong>, um diese App zu installieren.
                                        </li>
                                    </ol>
                                </div>
                            </div>
                            <label class="close-hint"><input type="checkbox" class="close-immediately"><span>Nicht mehr anzeigen.</span></label>
                            <button class="secondary" @click=${this.closeGuide}>Schließen</button>
                        </div>
                    </div>
                `;
        }
    }
}

customElements.define('pwa-guide', PwaGuide);
