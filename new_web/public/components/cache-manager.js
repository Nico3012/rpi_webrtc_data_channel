import { LitElement, html, css } from 'lit';

export class CacheManager extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        .update-message {
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            text-align: center;
        }

        button.uninstall {
            background-color: green;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        @media (display-mode: standalone) {
            button.uninstall {
                background-color: red;
                cursor: not-allowed;
            }
        }

        @media (display-mode: standalone) {
            button.browser {
                background-color: red;
                color: white;
            }
        }
    `;

    static properties = {
        updateStatus: { type: String },
        isStandalone: { type: Boolean }
    };

    constructor() {
        super();
        this.updateStatus = null;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        this.updateInterval = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this.registerServiceWorker();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
                this.setupServiceWorkerListeners(registration);
                await registration.update();
                // Start interval for periodic updates
                this.updateInterval = setInterval(() => {
                    registration.update();
                }, 8000); // 8 seconds
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    setupServiceWorkerListeners(registration) {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                this.updateStatus = 'downloading';
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.updateStatus = 'installed';
                    }
                });
            }
        });
    }

    async handleUninstall() {
        if (this.isStandalone) {
            alert('Uninstall is not allowed in standalone mode.');
            return;
        }

        try {
            // Unregister all service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));

            // Delete all caches
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));

            alert('Uninstalled. You can close the page now.');
        } catch (error) {
            console.error('Uninstall failed:', error);
            alert('Uninstall failed. Please try again.');
        }
    }

    render() {
        let message = '';
        if (this.updateStatus === 'downloading') {
            message = 'Downloading Update...';
        } else if (this.updateStatus === 'installed') {
            message = 'Installed. Close The app and re open it.';
        }

        return html`
            <div>
                ${message ? html`<div class="update-message">${message}</div>` : ''}
                ${!this.isStandalone ? html`<button class="uninstall" @click=${this.handleUninstall}>Uninstall App</button>` : ''}
            </div>
        `;
    }
}

customElements.define('cache-manager', CacheManager);
