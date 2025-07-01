import { LitElement, html, css } from 'lit';

class CacheController extends LitElement {
    static styles = css``;

    static properties = {
        swStatus: { type: String },
        isRefreshing: { type: Boolean }
    };

    constructor() {
        super();
        this.swStatus = 'Initializing...';
        this.isRefreshing = false;
        this.registration = null;
    }

    async connectedCallback() {
        super.connectedCallback();

        // register service worker:

        try {
            this.registration = await navigator.serviceWorker.register('/sw.js');
            this.swStatus = 'Service Worker registered';

            await navigator.serviceWorker.ready;
            this.swStatus = 'Service Worker active';
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
            <div class="container">
                <h1>Static Cache Demo</h1>

                <div class="status">
                    Status: ${this.swStatus}
                </div>

                <button @click=${this.refresh} ?disabled=${this.isRefreshing}>
                    ${this.isRefreshing ? 'Refreshing...' : 'Refresh Cache'}
                </button>

                <p>
                    This page uses a service worker to cache all static files.
                    Click "Refresh Cache" to clear all caches and reload fresh content.
                </p>
            </div>
        `;
    }
}

customElements.define('cache-controller', CacheController);
