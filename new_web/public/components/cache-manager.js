import { LitElement, html, css } from 'lit';

export class CacheManager extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        div.state {
            padding: 8px;
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
            font-family: monospace;
            background-color: red;
            color: white;
        }

        [hidden] {
            display: none;
        }
    `;

    static properties = {
        state: { type: String, attribute: false },
    };

    constructor() {
        super();

        /** @private @type {'stable' | 'updating' | 'deprecated'} */
        this.state = 'stable';

        (async () => {
            // wether the current page was loaded through a service worker or not
            const pageIsControlled = !!navigator.serviceWorker.controller;

            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', type: 'module', updateViaCache: 'none' });

            // register update interval
            setInterval(async () => {
                // without clientURL, getRegistration returns the current registration of this page, which is what we want
                const currentRegistration = await navigator.serviceWorker.getRegistration();
                if (currentRegistration) await currentRegistration.update();
            }, 8000);

            if (registration.waiting) {
                this.state = 'deprecated';
            }

            registration.addEventListener('updatefound', () => {
                // this event fires, when registration.installing has a new service worker.
                const newRegistration = registration.installing;
                if (!newRegistration) throw new Error('somehow registration.installing is null in updatefound event');

                this.state = 'updating';

                newRegistration.addEventListener('statechange', () => {
                    if (newRegistration.state === 'installed') {
                        if (pageIsControlled) {
                            // New update is available
                            this.state = 'deprecated';
                        } else {
                            // The page is already up to date, because it originally fetched directly from the server
                            this.state = 'stable';
                        }

                    }
                });
            });
        })();
    }

    render() {
        return html`
            <div class="state" ?hidden=${this.state === 'stable'}>${this.state === 'updating' ? 'Update available. Downloading...' : this.state === 'deprecated' ? 'Close this page/app and reopen it to see the latest version' : ''}</div>
        `;
    }
}

customElements.define('cache-manager', CacheManager);
