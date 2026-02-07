import { LitElement, html, css } from 'lit';
import { isInstalled, install, uninstall, update, updateAvailable } from '/api/script.js';

const UPDATE_INTERVAL = 8000;

export class CacheManager extends LitElement {
    static properties = {
        state: { type: String, attribute: false },
        collapsed: { type: Boolean, attribute: false },
    };

    static styles = css`
        :host {
            display: block;
        }

        div.blocker {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: black;
            color: white;
            z-index: 9999;
        }

        span.status {
            display: block;
            margin: 16px;
            color: white;
            font-family: monospace;
            font-size: 16px;
            line-height: 1.5;
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
            font-family: monospace;
        }

        .content {
            display: flex;
            flex-direction: column;
        }

        button.pill {
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

        @media (display-mode: standalone) {
            button.browser {
                background-color: red;
                color: white;
            }
        }
    `;

    constructor() {
        super();

        /** @private @type {'initializing' | 'installed' | 'uninstalled' | 'update'} */
        this.state = 'initializing';
        /** @private */
        this.collapsed = true;

        /** @private @type {number | undefined} */
        this.updateInterval = undefined;
    }

    async connectedCallback() {
        super.connectedCallback();

        if (await isInstalled()) {
            this.state = 'installed';
            this.collapsed = true;

            // register update handler, to check, if update is available
            this.updateInterval = setInterval(() => this.checkForUpdate(), UPDATE_INTERVAL);
        
            // check for update immediately
            this.checkForUpdate();
        } else {
            try {
                await install();
                this.state = 'installed';
                this.collapsed = true;

                // register update handler, to check, if update is available
                this.updateInterval = setInterval(() => this.checkForUpdate(), UPDATE_INTERVAL);
            } catch (e) {
                alert(e.message);
            }
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // clear update interval
        clearInterval(this.updateInterval);
    }

    /** @private */
    async checkForUpdate() {
        if (await updateAvailable()) {
            this.state = 'update';
            this.collapsed = false;
        } else {
            this.state = 'installed';
            this.collapsed = true;
        }
    }

    /** @private */
    async handleUninstall() {
        try {
            // we are explicitely filtering for states, where this method is not allowed. We could also check, if the display-mode is e.g. browser and only allow this method then but this might break the feature in the future on other browser modes, where this feature should work. So in this case, we allow this feature and its up to the user to know what he is doing in an (at the moment) unknown state. Make sure, to keep this align with checks in /api/script.js
            if (window.matchMedia('(display-mode: standalone)').matches) {
                alert('Cannot remove cache in app mode. Uninstall the PWA first!');
                return;
            }

            if (confirm('Make sure to uninstall the app before! No PWA installed?')) {
                clearInterval(this.updateInterval);
                await uninstall();
                this.state = 'uninstalled';
                this.collapsed = false;
            }
        } catch (e) {
            alert(e.message);
        }
    }

    /** @private */
    handleReload() {
        window.location.reload();
    }

    /** @private */
    async handleUpdate() {
        try {
            if (confirm('This update method may not update app metadata such as icons. If this is needed, please use the \'Remove cache\' button.')) {
                clearInterval(this.updateInterval);
                await update();
                this.state = 'uninstalled';
                this.collapsed = false;
            }
        } catch (e) {
            alert(e.message);
        }
    }

    /** @private */
    renderButton() {
        switch (this.state) {
            case 'installed':
                // technisch könnte auch hier der Update button angezeigt werden aber um den Nutzer nicht zu irritieren, wird der button nur im update state angezeigt
                return html`<button class="pill browser" @click="${this.handleUninstall}">Remove cache</button>`;
            case 'update':
                return html`
                    <button class="pill browser" @click="${this.handleUninstall}">Remove cache</button>
                    <button class="pill" @click="${this.handleUpdate}">Update</button>
                `;
            case 'uninstalled':
                return html`<button class="pill" @click="${this.handleReload}">Reload Page</button>`;
            default:
                return null;
        }
    }

    render() {
        switch (this.state) {
            case 'initializing':
                return html`
                    <div class="blocker">
                        <span class="status">Cacheing ...</span>
                    </div>
                `;
            default:
                return html`
                    <details ?open="${!this.collapsed}">
                        <summary>
                            Cache Manager
                        </summary>
                        <div class="content">
                            ${this.renderButton()}
                        </div>
                    </details>
                `;
        }
    }
}

customElements.define('cache-manager', CacheManager);
