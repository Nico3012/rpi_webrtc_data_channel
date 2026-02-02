import { LitElement, html, css } from 'lit';

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
        this.latitude = null;
        /** @type {number | null} @private */
        this.longitude = null;
        /** @type {number | null} @private */
        this.accuracy = null;

        /** @type {number | null} @private */
        this.altitude = null;
        /** @type {number | null} @private */
        this.altitudeAccuracy = null;

        /** @type {number | null} @private */
        this.heading = null;

        /** @type {number | null} @private */
        this.speed = null;
    }

    /** @private @param {GeolocationPosition} pos */
    successCallback(pos) {
        console.log(pos.coords);

        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
        this.accuracy = pos.coords.accuracy;

        this.altitude = pos.coords.altitude;
        this.altitudeAccuracy = pos.coords.altitudeAccuracy;

        this.heading = pos.coords.heading;

        this.speed = pos.coords.speed;
    }

    /** @private */
    stopWatching() {
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
    errorCallback(err) {
        console.warn(err);
        this.stopWatching();
    }

    /** @private */
    toggleWatching() {
        if (this.watching) {
            this.stopWatching();
        } else {
            this.watchingId = navigator.geolocation.watchPosition(this.successCallback, this.errorCallback, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0,
            });
            this.watching = true;
        }
    }

    static styles = css``;

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
                <div>
                    <svg width="120" height="120" viewBox="0 0 100 100" style="transform: rotate(-${this.heading.toFixed(0)}deg); transition: transform 0.2s linear;">
                        <!-- Außenkreis -->
                        <circle
                            cx="50"
                            cy="50"
                            r="48"
                            fill="none"
                            stroke="black"
                            stroke-width="4"
                        />

                        <!-- Nadel -->
                        <g>
                            <polygon
                                points="50,10 54,50 50,90 46,50"
                                fill="black"
                            />
                        </g>
                    </svg>
                </div>
            `}
        `;
    }
}

customElements.define('geolocation-manager', GeolocationManager);
