import { LitElement, html, css } from 'lit';

export class UninstallManager extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        details {
            display: flex;
            flex-direction: column;
        }

        summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px;
            font-family: sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }

        summary::marker {
            content: '';
        }

        summary::after {
            content: '+';
            font-family: monospace;
            font-size: 16px;
            line-height: 1;
        }

        details[open] summary::after {
            content: '-';
        }

        div.content {
            display: flex;
            flex-direction: column;
        }

        button.uninstall {
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

        button.uninstall[disabled] {
            opacity: 0.7;
        }

        @media (display-mode: standalone) {
            button.uninstall {
                background-color: red;
            }
        }

        [hidden] {
            display: none;
        }
    `;

    static properties = {
        uninstalled: { type: Boolean, attribute: false },
    };

    constructor() {
        super();

        /** @private @type {boolean} */
        this.uninstalled = false;
    }

    /** @private */
    async handleUninstall() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            alert('Uninstall is not allowed in standalone mode. Please uninstall the app.');
            return;
        }

        if (!confirm('Make sure to uninstall the app before! No PWA installed?')) {
            return;
        }

        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));

        // Delete all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));

        alert('Uninstalled. You can close the page now.');

        this.uninstalled = true;
    }

    render() {
        return html`
            <details>
                <summary>
                    Cache Manager
                </summary>
                <div class="content">
                    <button class="uninstall" ?disabled=${this.uninstalled} @click=${this.handleUninstall}>Uninstall Cache</button>
                </div>
            </details>
        `;
    }
}

customElements.define('uninstall-manager', UninstallManager);
