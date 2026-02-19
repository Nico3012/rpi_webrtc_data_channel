import { LitElement, html, css } from 'lit';

const dirname = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);

export class GeolocationManager extends LitElement {
    static properties = {
        watching: { type: Boolean, attribute: false },
        watchingId: { type: Number, attribute: false },

        // coords:

        latitude: { type: Number, attribute: false },
        longitude: { type: Number, attribute: false },
        accuracy: { type: Number, attribute: false },

        altitude: { type: Number, attribute: false },
        altitudeAccuracy: { type: Number, attribute: false },

        heading: { type: Number, attribute: false },

        speed: { type: Number, attribute: false },
    };

    constructor() {
        super();

        /** @type {boolean} @private */
        this.watching = false;

        /** @type {number} @private */
        this.watchingId = 0;

        // coords:

        /** @type {number | null} @private */
        this.latitude = null; // in the spec, this is not a optional parameter. It will always be a number, in the successCallback
        /** @type {number | null} @private */
        this.longitude = null; // in the spec, this is not a optional parameter. It will always be a number, in the successCallback
        /** @type {number | null} @private */
        this.accuracy = null; // in the spec, this is not a optional parameter. It will always be a number, in the successCallback

        /** @type {number | null} @private */
        this.altitude = null;
        /** @type {number | null} @private */
        this.altitudeAccuracy = null;

        /** @type {number | null} @private */
        this.heading = null;

        /** @type {number | null} @private */
        this.speed = null;

        // leaflet:

        /** @type {HTMLIFrameElement} @private */
        this.leafletIFrame = document.createElement('iframe');
        this.leafletIFrame.src = `${dirname}iframe/`;
        this.leafletIFrame.className = 'leaflet';

        /** @type {Promise<any>} @private */
        this.leafletWindow = new Promise(resolve => {
            this.leafletIFrame.addEventListener('load', () => {
                const contentWindow = this.leafletIFrame.contentWindow;
                if (!contentWindow) throw new Error('somehow contentWindow null on load event');
                resolve(contentWindow);
            });
        });
    }

    /** @private @param {GeolocationPosition} pos */
    successCallback = async (pos) => {
        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
        this.accuracy = pos.coords.accuracy;

        this.altitude = pos.coords.altitude;
        this.altitudeAccuracy = pos.coords.altitudeAccuracy;

        this.heading = pos.coords.heading;

        this.speed = pos.coords.speed;

        // updating leaflet map:

        const leafletWindow = await this.leafletWindow;

        leafletWindow.updateMarker(this.latitude, this.longitude, this.heading, this.speed);
    }

    /** @private */
    stopWatching = () => {
        navigator.geolocation.clearWatch(this.watchingId);
        this.watching = false;

        this.latitude = null;
        this.longitude = null;
        this.accuracy = null;

        this.altitude = null;
        this.altitudeAccuracy = null;

        this.heading = null;

        this.speed = null;
    }

    /** @private @param {GeolocationPositionError} err */
    errorCallback = (err) => {
        console.warn(err);
        this.stopWatching();
    }

    /** @private */
    toggleWatching = () => {
        if (this.watching) {
            this.stopWatching();
        } else {
            this.watchingId = navigator.geolocation.watchPosition(this.successCallback, this.errorCallback, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            });
            this.watching = true;
        }
    }

    static styles = css`
        .heading {
            display: grid;
            justify-items: center;
            align-items: center;
        }

        .heading-background {
            grid-area: 1 / 1 / 2 / 2;
            width: 256px;
            height: 256px;
            padding: 16px;
            border-radius: 50%;
            border: 4px solid black;
        }

        .heading-foreground {
            grid-area: 1 / 1 / 2 / 2;
            width: 32px;
            height: 128px;
        }

        .leaflet {
            margin: 0;
            padding: 0;
            border: none;
            outline: none;
            width: 384px;
            height: 384px;
            border-radius: 0;
        }
    `;

    render() {
        return html`
            <button @click=${this.toggleWatching}>${this.watching ? 'Ausschalten' : 'Einschalten'}</button>
            ${this.speed === null ? null : html`
                <div>
                    <span>Geschwindigkeit: ${(this.speed * 3.6).toFixed(1)} km/h</span>
                </div>
            `}
            ${this.altitude === null ? null : html`
                <div>
                    <span>Höhe: ${this.altitude.toFixed(1)}${this.altitudeAccuracy === null ? null : ` ± ${this.altitudeAccuracy.toFixed(1)}`} m</span>
                </div>
            `}
            ${this.heading === null ? null : html`
                <div class="heading">
                    <img class="heading-background" src="${dirname}heading-background.svg" alt="heading-background">
                    <img class="heading-foreground" src="${dirname}heading-foreground.svg" alt="heading-foreground" style="transform: rotate(${this.heading.toFixed(0)}deg); transition: transform 0.2s linear;">
                </div>
            `}
            ${this.latitude === null || this.longitude === null || this.accuracy === null ? null : html`
                <div class="map">
                    <div><span>Latitude: ${this.latitude.toString()} deg</span></div>
                    <div><span>Longitude: ${this.longitude.toString()} deg</span></div>
                    <div><span>Genauigkeit: ${this.accuracy.toFixed(1)} m</span></div>
                    <!-- Die leaflet Karte ist immer nach Norden ausgerichtet -->
                    ${this.leafletIFrame}
                </div>
            `}
        `;
    }
}

customElements.define('geolocation-manager', GeolocationManager);
