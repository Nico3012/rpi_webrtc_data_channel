import { LitElement, html, css } from 'lit';
import { isInstalled, install, initUninstall, updateAvailable } from '/api/script.js';

class InstallManager extends LitElement {
    static properties = {
        state: { type: String }, // 'uninstalled', 'installed', 'uninstalling', 'update'
        collapsed: { type: Boolean },
    };

    static styles = css`
    .pill-btn {
      display: inline-block;
      padding: 1em 2em;
      border: none;
      border-radius: 999px;
      background: black;
      color: white;
      font-size: 1.2em;
      cursor: pointer;
      margin: 1em 0;
      transition: background 0.2s;
    }
    .pill-btn.red {
      background: #d32f2f;
      color: white;
    }
    .collapsible {
      border: 1px solid #ccc;
      border-radius: 8px;
      margin: 1em 0;
      overflow: hidden;
    }
    .header {
      background: #f5f5f5;
      padding: 0.7em 1em;
      cursor: pointer;
      font-weight: bold;
      user-select: none;
    }
    .content {
      padding: 1em;
      display: block;
      animation: fadeIn 0.3s;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

    constructor() {
        super();
        this.state = 'uninstalled';
        this.collapsed = false;
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.checkState();
    }

    async checkState() {
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

    async handleInstall() {
        try {
            await install();
            await this.checkState();
        } catch (e) {
            alert(e.message);
        }
    }

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

    handleReload() {
        window.location.reload();
    }

    toggleCollapse() {
        this.collapsed = !this.collapsed;
    }

    renderButton() {
        switch (this.state) {
            case 'uninstalled':
                return html`<button class="pill-btn" @click="${this.handleInstall}">Install App</button>`;
            case 'installed':
                return html`<button class="pill-btn" @click="${this.handleUninstall}">Uninstall App</button>`;
            case 'uninstalling':
                return html`<button class="pill-btn" @click="${this.handleReload}">Reload Page</button>`;
            case 'update':
                return html`<button class="pill-btn red" @click="${this.handleUninstall}">Uninstall (Update Available)</button>`;
            default:
                return null;
        }
    }

    render() {
        return html`
      <div class="collapsible">
        <div class="header" @click="${this.toggleCollapse}">
          Service Worker Manager
          <span style="float:right;">${this.collapsed ? '+' : '-'}</span>
        </div>
        ${!this.collapsed ? html`
          <div class="content">
            ${this.renderButton()}
          </div>
        ` : ''}
      </div>
    `;
    }
}

customElements.define('install-manager', InstallManager);
