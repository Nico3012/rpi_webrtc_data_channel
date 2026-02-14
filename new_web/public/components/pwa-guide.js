// set the 'app-icon-src' and 'app-name' attributes on this element

import { LitElement, html, css } from 'lit';

export class PwaGuide extends LitElement {
    static properties = {
        closed: { type: Boolean, attribute: false }, // if the guide is closed by the user (including localstorage)
        info: { type: Boolean, attribute: false }, // Display info or not
        guide: { type: String, attribute: false }, // the name of the guide, that is shown e.g. ios
        state: { type: String, attribute: false }, // 'guide' | 'installable' | 'installing' | 'installed'
        appIconSrc: { type: String, attribute: 'app-icon-src' },
        appName: { type: String, attribute: 'app-name' },
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
        }

        div.notification {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: black;
            color: white;
            padding: 4px;
        }

        div.app-description {
            display: flex;
            align-items: center;
        }

        div.app-description img {
            margin: 4px;
            width: 28px;
            height: 28px;
            border-radius: 20%;
        }

        div.app-name {
            display: flex;
            flex-direction: column;
        }

        h6 {
            margin: 4px;
            margin-bottom: 2px;
            padding: 0;
            font-size: 12px;
            font-weight: bolder;
            font-family: sans-serif;
            line-height: 1;
            text-decoration: none;
        }

        p {
            margin: 4px;
            margin-top: 2px;
            padding: 0;
            font-size: 12px;
            font-weight: lighter;
            font-family: sans-serif;
            line-height: 1;
            text-decoration: none;
        }

        button.close {
            flex-shrink: 0;
            margin: 4px;
            display: block;
            appearance: none;
            padding: 3px;
            border: none;
            outline: none;
            background-color: white;
            color: black;
            text-decoration: none;
            font-family: monospace;
            font-size: 12px;
            font-weight: normal;
            line-height: 1.0;
            text-align: center;
            cursor: pointer;
            border-radius: 12px;
            width: 12px;
            box-sizing: content-box;
        }

        /* Ende des info styles */

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
            div.notification,
            div.wrapper {
                display: none;
            }
        }
    `;

    constructor() {
        super();

        /** @private @type {boolean} */
        this.closed = JSON.parse(localStorage.getItem('pwa-guide-close-immediately') || 'false');
        this.info = this.closed;

        /** @private @type {string} */
        this.guide = 'ios'; // set to ios, because we expect android to fire a beforeinstallprompt event

        /** @private @type {string} */
        this.state = 'guide';

        /** @private @type {BeforeInstallPromptEvent | null} */
        this.event = null;

        /** @private */
        this.appIconSrc = '';

        /** @private */
        this.appName = '';

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
        }

        this.closed = true;
    }

    /** @private */
    notificationClick() {
        localStorage.removeItem('pwa-guide-close-immediately');
        this.closed = false;
        this.info = false;
    }

    /** @private */
    notificationClose(e) {
        e.stopPropagation();
        this.info = false;
    }

    render() {
        switch (this.closed) {
            case true:
                switch (this.info) {
                    case true:
                        return html`
                            <div class="notification" @click=${this.notificationClick}>
                                <div class="app-description">
                                    <img src=${this.appIconSrc} alt=${this.appName}>
                                    <div class="app-name">
                                        <h6>${this.appName}</h6>
                                        <p>App installieren</p>
                                    </div>
                                </div>
                                <button class="close" @click=${this.notificationClose}>x</button>
                            </div>
                        `;
                    default:
                        return null
                }
            default:
                return html`
                    <div class="wrapper" @click=${this.closeGuide}>
                        <div class="container" @click=${e => e.stopPropagation()}>
                            <h2>App installieren</h2>
                            <button class="primary" @click=${this.installPWA} ?hidden=${this.state !== 'installable'}>Installieren</button>
                            <div class="status" ?hidden=${this.state !== 'installing'}>
                                Warten auf Bestätigung... ⏳
                            </div>
                            <div class="status" ?hidden=${this.state !== 'installed'}>
                                Installiert... Deine App erscheint auf dem Homebildschirm 🎉
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
                            <label class="close-hint"><input type="checkbox" class="close-immediately" checked><span>Nicht mehr anzeigen.</span></label>
                            <button class="secondary" @click=${this.closeGuide}>Schließen</button>
                        </div>
                    </div>
                `;
        }
    }
}

customElements.define('pwa-guide', PwaGuide);
