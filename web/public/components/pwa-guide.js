import { LitElement, html, css } from 'lit';

export class PwaGuide extends LitElement {
    static properties = {
        standalone: { type: Boolean, attribute: false },
        guideClosed: { type: Boolean, attribute: false },
        deferredPrompt: { type: Object, attribute: false },
        activePlatform: { type: String, attribute: false },
        justInstalled: { type: Boolean, attribute: false },
        installing: { type: Boolean, attribute: false },
        installationSuccess: { type: Boolean, attribute: false }, // New property
    };

    constructor() {
        super();

        { // check, if the app runs in the browser or in standalone mode
            const standaloneMQL = window.matchMedia('(display-mode: standalone)');

            /** @private @type {boolean} */
            this.standalone = standaloneMQL.matches;

            // listen for changes on this property
            standaloneMQL.addEventListener('change', (event) => {
                this.standalone = event.matches;
                if (this.standalone) {
                    this.justInstalled = true;
                    // After 5 seconds, hide the success message
                    setTimeout(() => {
                        this.justInstalled = false;
                    }, 5000);
                }
            });
        }

        /** @private @type {boolean} */
        this.guideClosed = JSON.parse(localStorage.getItem('pwa-guide-close-immediately') || 'false');

        /** @private @type {Event | null} */
        this.deferredPrompt = null;

        /** @private @type {boolean} */
        this.justInstalled = false;

        /** @private @type {boolean} */
        this.installing = false;

        /** @private @type {boolean} */
        this.installationSuccess = false;

        // if the beforeinstallprompt feature is not supported, the install button will never be shown
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
        });

        this.activePlatform = 'android';
    }

    /** @private */
    async installApp() {
        if (this.deferredPrompt) {
            this.installing = true;
            
            try {
                // @ts-expect-error - BeforeInstallPromptEvent is not available in every browser
                const result = await this.deferredPrompt.prompt();
                
                // Check the outcome of the installation
                if (result.outcome === 'accepted') {
                    this.installationSuccess = true;
                    this.justInstalled = true;
                    
                    // Remove the timeout that automatically hides the message
                    // Let user dismiss it manually
                }
                
                // Wait for the user decision
                this.deferredPrompt = null;
            } catch (error) {
                console.error('Installation failed', error);
            } finally {
                this.installing = false;
            }
        }
    }

    /** @private */
    closeGuide() {
        /** @type {HTMLInputElement | null} */
        const checkbox = this.renderRoot.querySelector('#close-immediately');
        if (!checkbox) throw new Error('#close-immediately checkbox not found');

        if (checkbox.checked) {
            localStorage.setItem('pwa-guide-close-immediately', JSON.stringify(true));
        } else {
            localStorage.setItem('pwa-guide-close-immediately', JSON.stringify(false));
        }

        this.guideClosed = true;
    }

    static styles = css`
        :host {
            display: block;
            font-family: 'Arial', sans-serif;
            color: var(--text-color, #333);
            --overlay-bg: rgba(0, 0, 0, 0.6);
            --card-bg: var(--card-background, #ffffff);
            --button-primary: var(--primary-color, #4CAF50);
            --button-primary-hover: var(--primary-hover, #45a049);
            --button-secondary: #e0e0e0;
            --button-secondary-text: #333;
            --checkbox-border: #ccc;
            --checkbox-checked: var(--primary-color, #4CAF50);
        }

        /* Dark overlay with blur for modal effect */
        #wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: var(--overlay-bg);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1111;
            backdrop-filter: blur(4px);
        }

        /* Card-like container with a fade-in animation */
        #container {
            background: var(--card-bg);
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            max-width: 480px;
            width: 90%;
            display: flex;
            flex-direction: column;
            gap: 16px;
            animation: fadeIn 0.3s ease-out;
            color: var(--text-color, #333);
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        h2 {
            margin: 0;
            color: var(--text-color, #333);
        }

        /* Visually separated section for guide content */
        .guide-content {
            border-top: 1px solid var(--border-color, #eee);
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-top: 16px;
        }

        /* Platform selector button group */
        #guide-selector {
            display: flex;
            gap: 8px;
            justify-content: center;
        }

        #guide-selector button {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 14px;
            background-color: var(--button-primary);
            color: white;
        }

        #guide-selector button:hover {
            background-color: var(--button-primary-hover);
        }

        .guide {
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
        }

        /* Custom checkbox styling */
        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
        }

        input[type="checkbox"] {
            appearance: none;
            margin: 0;
            padding: 0;
            width: 22px;
            height: 22px;
            border: 2px solid var(--checkbox-border);
            border-radius: 4px;
            background-color: transparent;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        input[type="checkbox"]:checked {
            background-color: var(--checkbox-checked);
            border-color: var(--checkbox-checked);
        }

        input[type="checkbox"]:checked::after {
            content: "";
            position: absolute;
            left: 7px;
            top: 3px;
            width: 6px;
            height: 12px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }

        label {
            font-size: 14px;
            color: var(--text-color, #555);
            cursor: pointer;
        }

        /* General button styles */
        button {
            padding: 12px 16px;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.2s;
            font-weight: 500;
        }

        /* Primary button */
        button.primary {
            background: var(--button-primary);
            color: white;
        }

        button.primary:hover {
            background: var(--button-primary-hover);
        }

        /* Secondary button (subdued styling) */
        button.secondary {
            background: var(--button-secondary);
            color: var(--button-secondary-text);
        }

        button.secondary:hover {
            filter: brightness(0.95);
        }

        .guide.ios img, .guide.android img {
            width: 24px;
            height: 24px;
            vertical-align: middle;
            margin: 0 4px;
        }

        .guide ol {
            padding-left: 20px;
            text-align: left;
        }

        .guide li {
            margin-bottom: 12px;
        }

        .success-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 16px;
            border-radius: 12px;
            background-color: rgba(76, 175, 80, 0.1);
            border: 1px solid var(--primary-color, #4CAF50);
            animation: fadeIn 0.5s ease-out;
        }

        .success-icon {
            width: 48px;
            height: 48px;
            color: var(--primary-color, #4CAF50);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .installing-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            padding: 16px 0;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(76, 175, 80, 0.2);
            border-radius: 50%;
            border-top: 4px solid var(--button-primary);
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (prefers-color-scheme: dark) {
            :host {
                --overlay-bg: rgba(0, 0, 0, 0.75);
                --button-secondary: #555555;
                --button-secondary-text: #e0e0e0;
                --checkbox-border: #666;
                --checkbox-checked: var(--primary-color, #5cbb60);
            }

            .success-message {
                background-color: rgba(92, 187, 96, 0.15);
                border-color: var(--primary-color, #5cbb60);
            }
        }
    `;

    render() {
        // Show success message if app was just installed
        if (this.standalone && this.justInstalled) {
            return html`
                <div class="success-message">
                    <svg class="success-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <h3>App successfully installed!</h3>
                    <p>You are now using EqualPay as a standalone app.</p>
                </div>
            `;
        }

        // Show installation guide only if not in standalone mode and not closed
        return html`
            ${(!this.standalone && !this.guideClosed) ? html`
                <div id="wrapper">
                    <div id="container">
                        <h2>App installieren!</h2>
                        
                        ${this.installationSuccess ? html`
                            <div class="success-message">
                                <svg class="success-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <h3>Installation läuft!</h3>
                                <p>EqualPay wird auf Ihrem Gerät installiert.</p>
                            </div>
                        ` : this.installing ? html`
                            <div class="installing-container">
                                <div class="spinner"></div>
                                <p>Installation wird vorbereitet...</p>
                                <p>Bitte folgen Sie den Anweisungen in Ihrem Browser.</p>
                            </div>
                        ` : this.deferredPrompt ? html`
                            <button class="install primary" @click=${this.installApp}>Installieren</button>
                        ` : html`
                            <div class="guide-content">
                                <div id="guide-selector">
                                    <button class="${this.activePlatform === 'android' ? 'active' : ''}" @click=${()=> this.activePlatform = 'android'}>Android</button>
                                    <button class="${this.activePlatform === 'ios' ? 'active' : ''}" @click=${()=> this.activePlatform = 'ios'}>iOS</button>
                                </div>
                                <div class="guide android" ?hidden=${this.activePlatform !=='android' }>
                                    <ol>
                                        <li>
                                            Öffne das <strong>Menü</strong> (<img src="/images/android-chrome-menu-icon.svg" alt="Android Chrome menu icon">) oben rechts in Chrome.
                                        </li>
                                        <li>
                                            Wähle <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm hinzufügen"</strong>, um diese App zu installieren.
                                        </li>
                                    </ol>
                                </div>
                                <div class="guide ios" ?hidden=${this.activePlatform !=='ios' }>
                                    <ol>
                                        <li>
                                            Tippe auf <strong>Teilen</strong> (<img src="/images/share-icon-apple.svg" alt="Share icon Apple">).
                                        </li>
                                        <li>
                                            Wähle <strong>„Zum Home-Bildschirm"</strong> aus, um diese App zu installieren.
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        `}

                        <div class="checkbox-container">
                            <input type="checkbox" id="close-immediately">
                            <label for="close-immediately">Nicht mehr anzeigen.</label>
                        </div>
                        <button class="close secondary" @click=${this.closeGuide}>Schließen</button>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('pwa-guide', PwaGuide);
