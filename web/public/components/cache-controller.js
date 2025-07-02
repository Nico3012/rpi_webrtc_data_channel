import { LitElement, html, css } from 'lit';

class CacheController extends LitElement {
    static styles = css`
        .container {
            display: flex;
            flex-direction: column;
        }

        @media (display-mode: standalone) {
            .container {
                display: none;
            }
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

        button:disabled {
            background-color: #222;
            color: #bbb;
        }

        .status {
            margin: 8px;
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
        }

        p {
            margin: 8px;
            font-family: serif;
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
        }

        .banner {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: black;
            color: white;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }

        .banner[hidden] {
            display: none;
        }
    `;

    static properties = {
        swStatus: { type: String },
        swActive: { type: Boolean },
        isRefreshing: { type: Boolean }
    };

    constructor() {
        super();
        this.swStatus = 'Initializing...';
        this.swActive = false;
        this.isRefreshing = false;
    }

    async connectedCallback() {
        super.connectedCallback();

        // register service worker:

        try {
            if (navigator.serviceWorker.controller) { // check, if a service worker controls the page
                this.swStatus = 'Service worker active';
                this.swActive = true;
            } else {
                this.swStatus = 'Installing service worker...';

                // install new service worker
                await navigator.serviceWorker.register('/sw.js');

                // wait for service worker to become ready
                await navigator.serviceWorker.ready;

                this.swStatus = 'Waiting for reload...';

                setTimeout(() => {
                    if (confirm('Installed! Reload page?')) {
                        // reload the page after installing service worker. Otherwise initial loaded resources might not be cached
                        window.location.reload()
                    }
                }, 500);
            }
        } catch (error) {
            this.swStatus = `Registration failed: ${error.message}`;
        }
    }

    /** @private */
    async refresh() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;
        this.swStatus = 'Refreshing...';

        try {
            // Clear all caches
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));

            // Clear all service worker registrations
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));

            this.swStatus = 'Cache cleared, reloading...';

            // Force reload from server
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            this.swStatus = `Refresh failed: ${error.message}`;
            this.isRefreshing = false;
        }
    }

    render() {
        return html`
            <div ?hidden=${this.swActive} class="banner">Installing...</div>
            <div class="container">
                <div class="status">
                    <b>Status</b>: ${this.swStatus}
                </div>

                <button @click=${this.refresh} ?disabled=${this.isRefreshing}>
                    Update (Uninstall PWA before)
                </button>

                <p>
                    This page uses a service worker to cache all static files.
                    Click "Update" to clear all caches and reload fresh content.
                </p>
            </div>
        `;
    }
}

customElements.define('cache-controller', CacheController);
