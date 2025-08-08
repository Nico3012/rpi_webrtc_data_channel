import { LitElement, html, css } from 'lit';
import { isInstalled, install, initUninstall, updateAvailable } from '/api/script.js';

class InstallManager extends LitElement {
    static properties = {
        state: { type: String }, // 'initializing', 'installed', 'uninstalling', 'update'
        collapsed: { type: Boolean },
    };

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
            content: '+ ';
            font-family: monospace;
            font-size: 16px;
            line-height: 1;
        }

        details[open] summary::after {
            content: '- ';
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

        span.status {
            display: block;
            margin: 8px;
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

        this.state = 'initializing';
        this.collapsed = true;
    }

    async connectedCallback() {
        super.connectedCallback();

        if (isInstalled()) {
            this.state = 'installed';
            this.collapsed = true;

            if (await updateAvailable()) {
                this.state = 'update';
                this.collapsed = false;
            }
        } else {
            try {
                await install();
                this.state = 'installed';
                this.collapsed = true;
            } catch (e) {
                alert(e.message);
            }
        }
    }

    /** @private */
    async handleUninstall() {
        try {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                alert('Cannot uninstall in standalone mode. Uninstall the PWA first!');
                return;
            }

            if (confirm('Make sure to uninstall the PWA before! No PWA installed?')) {
                await initUninstall();
                this.state = 'uninstalling';
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
    renderButton() {
        switch (this.state) {
            case 'installed':
                return html`<button class="pill browser" @click="${this.handleUninstall}">Uninstall App</button>`;
            case 'update':
                return html`<button class="pill browser" @click="${this.handleUninstall}">Uninstall (Update Available)</button>`;
            case 'uninstalling':
                return html`<button class="pill" @click="${this.handleReload}">Reload Page</button>`;
            default:
                return html`<span class="status">Loading ...</span>`;
        }
    }

    render() {
        return html`
            <details ?open="${!this.collapsed}">
                <summary>
                    Install Manager
                </summary>
                <div class="content">
                    ${this.renderButton()}
                </div>
            </details>
        `;
    }
}

customElements.define('install-manager', InstallManager);
