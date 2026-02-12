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
    };

    constructor() {
        super();
        this.updateStatus = null;
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

                // Start interval for periodic updates every 8 seconds
                this.updateInterval = setInterval(async () => {
                    // Check if service worker still exists before updating
                    const currentReg = await navigator.serviceWorker.getRegistration(); // without clientURL it returns the current registration of this page, which is what we want
                    if (currentReg) {
                        currentReg.update();
                    }
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
                    if (newWorker.state === 'installed') {
                        // navigator.serviceWorker.controller is the reference to the current active service-worker. If its the first installation, then this is null
                        if (navigator.serviceWorker.controller) {
                            // update ist ready
                            this.updateStatus = 'installed';
                        } else {
                            // first installation. Now we are offline available. But we are already on the latest version
                            this.updateStatus = null;
                        }
                    }
                });
            }
        });
    }

    async handleUninstall() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            alert('Uninstall is not allowed in standalone mode.');
            return;
        }

        if (!confirm('Make sure to uninstall the app before! No PWA installed?')) {
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
                <button class="uninstall" @click=${this.handleUninstall}>Uninstall App</button>
            </div>
        `;
    }
}

customElements.define('cache-manager', CacheManager);
