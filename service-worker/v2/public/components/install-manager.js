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
            margin: 8px 0;
            background: none;
            border: none;
            border-radius: 0;
            box-shadow: none;
            overflow: visible;
        }

        summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: none;
            padding: 0.7em 0.5em;
            cursor: pointer;
            font-weight: bold;
            font-family: serif;
            font-size: 24px;
            color: black;
            user-select: none;
        }

        .content {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 0.5em 0.5em 1em 0.5em;
        }

        .pill {
            display: block;
            width: 100%;
            padding: 12px 0;
            border: none;
            border-radius: 20px;
            background: black;
            color: white;
            font-size: 16px;
            font-family: sans-serif;
            font-weight: normal;
            line-height: 1.5;
            cursor: pointer;
            margin: 0;
            text-align: center;
        }

        .red {
            background: #d32f2f;
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
                return html`<button class="pill red" @click="${this.handleUninstall}">Uninstall (Update Available)</button>`;
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
