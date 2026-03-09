import { LitElement, html, css } from 'lit';

export class WifiConfig extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
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

        /** @private @type {'login' | 'login-failed' | 'config'} */
        this.state = 'login';

        /** @private @type {{ ssid: string; password: string; devicePassword: string; } | null} */
        this.config = null;
    }

    /** @private */
    async handleLoginSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        /** @type {string | null} */
        const devicePassword = formData.get('device-password');
        if (devicePassword === null) throw new Error('cannot find device-password in form data');

        const response = await fetch('/get-config', {
            headers: {
                'Authorization': `Bearer ${devicePassword}`,
            },
        });

        if (!response.ok) {
            this.state = 'login-failed';
            this.config = null;
            return;
        }

        /** @type {{ ssid: string; password: string; devicePassword: string; }} */
        const data = await response.json();

        this.state = 'config';
        this.config = data;
    }

    /** @private */
    async handleUpdateSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        /** @type {string | null} */
        const ssid = formData.get('ssid');
        if (ssid === null) throw new Error('cannot find ssid in form data');

        /** @type {string | null} */
        const password = formData.get('password');
        if (password === null) throw new Error('cannot find password in form data');

        /** @type {string | null} */
        const newDevicePassword = formData.get('device-password');
        if (newDevicePassword === null) throw new Error('cannot find device-password in form data');

        if (this.config === null) throw new Error('config is null on handleUpdateSubmit. This should not be possible');
        const currentDevicePassword = this.config.devicePassword;

        const response = await fetch('/set-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentDevicePassword}`,
            },
            body: JSON.stringify({
                ssid: ssid,
                password: password,
                devicePassword: newDevicePassword,
            }),
        });

        if (!response.ok) {
            this.state = 'login-failed';
            this.config = null;
            return;
        }

        this.config = {
            ssid: ssid,
            password: password,
            devicePassword: newDevicePassword,
        };
    }

    /** @private */
    handleLoginFailed() {
        // reset login
        this.state = 'login';
        this.config = null;
    }

    render() {
        if (this.state === 'login') return html`
            <div class="container">
                <form @submit=${this.handleLoginSubmit}>
                    <input name="device-password" type="password" required>
                    <button type="submit">Login</button>
                </form>
            </div>
        `;

        if (this.state === 'login-failed') return html`
            <div class="container">
                <button @click=${this.handleLoginFailed}>Anmeldung erneut versuchen</button>
            </div>
        `;

        if (this.state === 'config') return html`
            <div class="container">
                <form @submit=${this.handleUpdateSubmit}>
                    <input name="ssid" type="text" value=${this.config.ssid} required>
                    <input name="password" type="text" value=${this.config.password} required>
                    <input name="device-password" type="text" value=${this.config.devicePassword} required>
                    <button type="submit">Aktualisieren</button>
                </form>
                <a target="_blank" href="/wifi-label/?${new URLSearchParams(this.config).toString()}">Drucken</a>
            </div>
        `;

        throw new Error('unknown state in wifi-config');
    }
}

customElements.define('wifi-config', WifiConfig);
