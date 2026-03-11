import { LitElement, html, css } from 'lit';

const dirname = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);

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

        iframe {
            margin: 0;
            padding: 0;
            border: none;
            outline: none;
            height: 40px;
            box-sizing: content-box;
            width: 108px;
        }

        [hidden] {
            display: none;
        }
    `;

    static properties = {
        state: { type: String, attribute: false },
        iFrameSrc: { type: String, attribute: false },
    };

    constructor() {
        super();

        /** @private @type {'login' | 'login-failed' | 'config' | 'config-failed' | 'updating'} */
        this.state = 'login';

        /** @private @type {{ ssid: string; password: string; devicePassword: string; } | null} */
        this.config = null;

        /** @private @type {string} */
        this.iFrameSrc = '';
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
            this.iFrameSrc = '';
            return;
        }

        /** @type {{ ssid: string; password: string; devicePassword: string; }} */
        const data = await response.json();

        this.state = 'config';
        this.config = data;
        this.iFrameSrc = '';
    }

    /** @private */
    async handleWiFiConfigUpdateSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        /** @type {string | null} */
        const ssid = formData.get('ssid');
        if (ssid === null) throw new Error('cannot find ssid in form data');

        /** @type {string | null} */
        const password = formData.get('password');
        if (password === null) throw new Error('cannot find password in form data');

        const devicePassword = this.config?.devicePassword;
        if (!devicePassword) throw new Error('cannot find devicePassword in config');

        const response = await fetch('/set-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${devicePassword}`,
            },
            body: JSON.stringify({
                ssid: ssid,
                password: password,
                devicePassword: devicePassword,
            }),
        });

        if (!response.ok) {
            // unexpected error. e.g. due to changed password on another page after login here
            this.state = 'config-failed';
            this.config = null;
            this.iFrameSrc = '';
            return;
        }

        // wifi ap will restart now

        this.state = 'updating';
        this.config = null;
        this.iFrameSrc = '';
    }

    /** @private */
    async handleDevicePasswordUpdateSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        /** @type {string | null} */
        const currentDevicePassword = formData.get('current-device-password');
        if (currentDevicePassword === null) throw new Error('cannot find current-device-password in form data');

        /** @type {string | null} */
        const newDevicePassword = formData.get('new-device-password');
        if (newDevicePassword === null) throw new Error('cannot find new-device-password in form data');

        const ssid = this.config?.ssid;
        if (!ssid) throw new Error('cannot find ssid in config');

        const password = this.config?.password;
        if (!password) throw new Error('cannot find password in config');

        const devicePassword = this.config?.devicePassword;
        if (!devicePassword) throw new Error('cannot find devicePassword in config');

        if (currentDevicePassword !== devicePassword) {
            alert('Das angegebene Gerätepasswort ist nicht korrekt.');
            return;
        }

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
            // unexpected error. e.g. due to changed password on another page after login here
            this.state = 'config-failed';
            this.config = null;
            this.iFrameSrc = '';
            return;
        }

        // wifi ap will restart now

        this.state = 'updating';
        this.config = null;
        this.iFrameSrc = '';
    }

    /** @private */
    handleLabelGenerationSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        /** @type {string | null} */
        const devicePassword = formData.get('device-password');
        if (devicePassword === null) throw new Error('cannot find device-password in form data');

        if (!this.config) throw new Error('somehow handleLabelGenerationSubmit get called but this.config is null');

        if (devicePassword !== this.config.devicePassword) {
            alert('Das angegebene Gerätepasswort ist nicht korrekt.');
            return;
        }

        this.iFrameSrc = `${dirname}iframe/?${new URLSearchParams(this.config).toString()}`;
    }

    /** @private */
    handleBackToLogin() {
        // reset login
        this.state = 'login';
        this.config = null;
        this.iFrameSrc = '';
    }

    /** @private */
    handleReload() {
        window.location.reload();
    }

    render() {
        if (this.state === 'login') return html`
            <div class="container">
                <p class="info">Login</p>
                <form @submit=${this.handleLoginSubmit}>
                    <input name="device-password" type="password" required>
                    <button type="submit">Login</button>
                </form>
            </div>
        `;

        if (this.state === 'login-failed') return html`
            <div class="container">
                <p class="info">Login fehlgeschlagen</p>
                <button @click=${this.handleBackToLogin}>Zurück zur Anmeldung</button>
            </div>
        `;

        if (this.state === 'config') return html`
            <div class="container">

                <p class="info">WiFi Konfiguration</p>
                <form @submit=${this.handleWiFiConfigUpdateSubmit}>
                    <label>
                        SSID:
                        <input name="ssid" type="text" value=${this.config?.ssid || ''} required>
                    </label>
                    <label>
                        Password:
                        <input name="password" type="text" value=${this.config?.password || ''} required>
                    </label>
                    <button type="submit">Aktualisieren</button>
                </form>

                <p class="info">Gerätepasswort ändern</p>
                <form @submit=${this.handleDevicePasswordUpdateSubmit}>
                    <label>
                        Bisheriges Gerätepasswort:
                        <input name="current-device-password" type="password" required>
                    </label>
                    <label>
                        Neues Gerätepasswort:
                        <input name="new-device-password" type="password" required>
                    </label>
                    <button type="submit">Aktualisieren</button>
                </form>

                <p class="info">Label erstellen</p>
                <form @submit=${this.handleLabelGenerationSubmit} ?hidden=${!!this.iFrameSrc}>
                    <label>
                        Gerätepasswort:
                        <input name="device-password" type="password" required>
                    </label>
                    <button type="submit">Label erstellen</button>
                </form>
                <iframe src=${this.iFrameSrc} ?hidden=${!this.iFrameSrc}></iframe>

                <button type="button" @click=${this.handleBackToLogin}>Logout</button>
            </div>
        `;

        if (this.state === 'config-failed') return html`
            <div class="container">
                <p class="info">Konfiguration fehlgeschlagen</p>
                <button @click=${this.handleBackToLogin}>Zurück zur Anmeldung</button>
            </div>
        `;

        if (this.state === 'updating') return html`
            <div class="container">
                <p class="info">Konfiguration wird durchgeführt. Verbinden Sie sich ernet mit dem WiFi und aktualisieren die Seite.</p>
                <button @click=${this.handleReload}>Seite neu laden</button>
            </div>
        `;

        throw new Error('unknown state in wifi-config');
    }
}

customElements.define('wifi-config', WifiConfig);
