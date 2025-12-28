import { LitElement, html, css } from 'lit';

const dirname = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);

export class GPSData extends LitElement {
    static properties = {
        latitude: { type: Number },
        longitude: { type: Number },
        altitude: { type: Number },
        speed: { type: Number },
        accuracy: { type: Number },
        altitudeAccuracy: { type: Number },
        speedAccuracy: { type: Number },
        isTracking: { type: Boolean },
        error: { type: String },
    };

    static styles = css`
        :host {
            display: block;
        }

        button {
            width: 100%;
            margin: 8px 0;
            padding: 8px;
            border: 0;
            border-radius: 20px;
            background: black;
            color: white;
            font: 16px/1.5 sans-serif;
        }

        button:disabled {
            opacity: 0.5;
        }

        .stats {
            margin: 8px 0;
            padding: 7px;
            border: 1px solid black;
            border-radius: 20px;
            text-align: center;
            font: 16px/1.5 monospace;
        }

        iframe {
            width: 100%;
            height: 55vh;
            min-height: 320px;
            border: 1px solid black;
            border-radius: 20px;
            background: white;
        }

        .error {
            margin-top: 8px;
            color: red;
            font: 14px/1.4 monospace;
        }
    `;

    constructor() {
        super();

        this.latitude = null;
        this.longitude = null;
        this.altitude = null;
        this.speed = null;
        this.accuracy = null;
        this.altitudeAccuracy = null;
        this.speedAccuracy = null;

        this.isTracking = false;
        this.error = null;
        this.watchId = null;
        this.mapFrameEl = null;
    }

    get iframeSrc() {
        return dirname + 'iframe/';
    }

    render() {
        const fmtM = (value) => {
            if (typeof value === 'number' && !Number.isNaN(value)) return `${value.toFixed(1)} m`;
            return 'N/A';
        };

        const fmtKmH = (value) => {
            if (typeof value === 'number' && !Number.isNaN(value)) return `${(value * 3.6).toFixed(1)} km/h`;
            return 'N/A';
        };

        const fmtLatLon = (lat, lon) => {
            if (typeof lat === 'number' && typeof lon === 'number') return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            return 'N/A';
        };

        return html`
            <button @click=${this.startTracking} ?disabled=${this.isTracking}>
                ${this.isTracking ? 'Tracking…' : 'Starten'}
            </button>

            <div class="stats">
                <div>Speed: ${fmtKmH(this.speed)} (± ${fmtKmH(this.speedAccuracy)})</div>
                <div>Altitude: ${fmtM(this.altitude)} (± ${fmtM(this.altitudeAccuracy)})</div>
                <div>Position: ${fmtLatLon(this.latitude, this.longitude)} (± ${fmtM(this.accuracy)})</div>
            </div>

            ${this.error ? html`<div class="error">${this.error}</div>` : ''}

            <iframe
                title="Map"
                src=${this.iframeSrc}
                @load=${this.onMapFrameLoad}
                referrerpolicy="no-referrer"
            ></iframe>
        `;
    }

    /** @private */
    onMapFrameLoad = () => {
        this.mapFrameEl = this.renderRoot.querySelector('iframe');
        this.post();
    };

    startTracking() {
        if (!('geolocation' in navigator)) {
            this.error = 'Geolocation is not supported by your browser.';
            return;
        }

        this.isTracking = true;
        this.error = null;

        this.watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                this.latitude = coords.latitude;
                this.longitude = coords.longitude;
                this.altitude = coords.altitude;
                this.altitudeAccuracy = coords.altitudeAccuracy;
                this.speed = coords.speed;
                this.speedAccuracy = coords.speedAccuracy ?? null;
                this.accuracy = coords.accuracy;
                this.post();
            },
            (e) => {
                this.error = 'Could not get your location: ' + e.message;
                this.isTracking = false;
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );
    }

    /** @private */
    post() {
        if (!this.mapFrameEl?.contentWindow) return;
        if (this.latitude == null || this.longitude == null) return;

        this.mapFrameEl.contentWindow.postMessage(
            {
                type: 'gps-position',
                lat: this.latitude,
                lon: this.longitude,
                accuracy: this.accuracy,
            },
            window.location.origin
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
    }
}

customElements.define('gps-data', GPSData);
