import { LitElement, html, css } from 'lit';
import { isInstalled, install, initUninstall, updateAvailable } from '/api/script.js';

class InstallManager extends LitElement {
    static properties = {
        state: { type: String }, // 'uninstalled', 'installed', 'uninstalling', 'update'
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

        button.highlight {
            background-color: #2f97d3;
            color: white;
        }
    `;

    constructor() {
        super();

        this.state = 'initializing';
        this.collapsed = true;
    }

    async connectedCallback() {
        super.connectedCallback();

        if (await isInstalled()) {
            if (await updateAvailable()) {
                this.state = 'update';
                this.collapsed = false;
            } else {
                this.state = 'installed';
                this.collapsed = true;
            }
        } else {
            this.state = 'uninstalled';
            this.collapsed = false;
        }

        this.requestUpdate();
    }

    /** @private */
    async handleInstall() {
        try {
            await install();
            this.state = 'installed';
            this.collapsed = true;
            this.requestUpdate();
        } catch (e) {
            alert(e.message);
        }
    }

    /** @private */
    async handleUninstall() {
        try {
            await initUninstall();
            this.state = 'uninstalling';
            this.collapsed = false;
            this.requestUpdate();
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
            case 'uninstalled':
                return html`<button class="pill" @click="${this.handleInstall}">Install App</button>`;
            case 'installed':
                return html`<button class="pill" @click="${this.handleUninstall}">Uninstall App</button>`;
            case 'uninstalling':
                return html`<button class="pill" @click="${this.handleReload}">Reload Page</button>`;
            case 'update':
                return html`<button class="pill highlight" @click="${this.handleUninstall}">Uninstall (Update Available)</button>`;
            default:
                return null;
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
