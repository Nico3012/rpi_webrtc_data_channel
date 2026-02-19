import { LitElement, html, css } from 'lit';
import { Chart, CategoryScale, LinearScale, LineController, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { FakeGeolocation } from './fake-geolocation.js';

const dirname = import.meta.url.substring(0, import.meta.url.lastIndexOf('/') + 1);

const LIVE = false; // Set to true for real geolocation, false for fake

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Title, Tooltip, Legend, zoomPlugin);

const fakeGeo = new FakeGeolocation();

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

        averageSpeed: { type: Number, attribute: false },
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

        // average speed calculation:

        /** @type {number | null} @private */
        this.averageSpeed = null;

        /** @type {number | null} @private */
        this.startTime = null;

        /** @type {number | null} @private */
        this.totalDistance = null;

        /** @type {number | null} @private */
        this.lastLat = null;

        /** @type {number | null} @private */
        this.lastLon = null;

        // coords:

        /** @private @type {{ lat: number; lon: number; altitude: number; time: Date; }[]} */
        this.dataPoints = [];

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

        // initialize altitude chart

        /** @type {HTMLCanvasElement} @private */
        this.canvas = document.createElement('canvas');
    }

    firstUpdated() {
        // initialize chart after canvas is in DOM
        const ctx = this.canvas.getContext('2d');
        this.altitudeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Höhe (m)',
                    data: [],
                    borderColor: 'blue',
                    fill: false
                }]
            },
            options: {
                responsive: true, // ensure, this completely follows its parents sizing
                maintainAspectRatio: false, // ensure, this completely follows its parents sizing
                scales: {
                    x: { title: { display: true, text: 'Zeit' } },
                    y: { title: { display: true, text: 'Höhe (m)' } }
                },
                // plugins: {
                //     zoom: {
                //         zoom: {
                //             wheel: {
                //                 enabled: true,
                //             },
                //             pinch: {
                //                 enabled: true
                //             },
                //             mode: 'xy',
                //         }
                //     }
                // }
            }
        });
    }

    /** @private @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2 */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
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

        // avg speed calculation:

        if (this.startTime) {
            const currentTime = Date.now();
            this.totalDistance += this.calculateDistance(this.lastLat, this.lastLon, this.latitude, this.longitude); // m

            this.lastLat = this.latitude;
            this.lastLon = this.longitude;

            // update average speed
            const totalTime = currentTime - this.startTime; // ms
            this.averageSpeed = 1000 * this.totalDistance / totalTime; // m/s
        } else {
            this.startTime = Date.now();
            this.totalDistance = 0;

            this.lastLat = this.latitude;
            this.lastLon = this.longitude;
        }

        // update data points

        this.dataPoints.push({
            lat: this.latitude,
            lon: this.longitude,
            altitude: this.altitude,
            time: new Date(),
        });

        // update altitude chart
        if (!this.altitudeChart) throw new Error('somehow cannot find altitude chart in successCallback. successCallback must have run before firstUpdate');
        this.altitudeChart.data.labels = this.dataPoints.map(p => p.time.toLocaleTimeString());
        this.altitudeChart.data.datasets[0].data = this.dataPoints.map(p => p.altitude);
        this.altitudeChart.update();

        // updating leaflet map:

        const leafletWindow = await this.leafletWindow;

        leafletWindow.updateMarker(this.latitude, this.longitude, this.heading, this.speed);
        leafletWindow.addToPath(this.latitude, this.longitude);
    }

    /** @private */
    stopWatching = async () => {
        if (LIVE) {
            navigator.geolocation.clearWatch(this.watchingId);
        } else {
            fakeGeo.clearWatch(this.watchingId);
        }

        this.watching = false;

        this.latitude = null;
        this.longitude = null;
        this.accuracy = null;

        this.altitude = null;
        this.altitudeAccuracy = null;

        this.heading = null;

        this.speed = null;

        // reset arrays

        this.dataPoints = [];

        // reset distance tracking
        this.startTime = null;
        this.totalDistance = null;
        this.lastLat = null;
        this.lastLon = null;
        this.averageSpeed = null;

        // clear path on map

        const leafletWindow = await this.leafletWindow;

        leafletWindow.clearPath();
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
            if (LIVE) {
                this.watchingId = navigator.geolocation.watchPosition(this.successCallback, this.errorCallback, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0,
                });
            } else {
                this.watchingId = fakeGeo.watchPosition(this.successCallback, this.errorCallback, {});
            }

            this.watching = true;
        }
    }

    static styles = css`
        .altitude-chart {
            width: 384px;
            height: 192px;
        }

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
            ${this.averageSpeed === null ? null : html`
                <div>
                    <span>Durchschnittsgeschwindigkeit: ${(this.averageSpeed * 3.6).toFixed(1)} km/h</span>
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
            <div class="altitude-chart">
                ${this.canvas}
            </div>
            ${this.heading === null ? null : html`
                <div class="heading">
                    <img class="heading-background" src="${dirname}heading-background.svg" alt="heading-background">
                    <img class="heading-foreground" src="${dirname}heading-foreground.svg" alt="heading-foreground" style="transform: rotate(${this.heading.toFixed(0)}deg); transition: transform 0.2s linear;">
                </div>
            `}
            ${this.altitude === null ? null : html`
                <div>
                    <span>Höhe: ${this.altitude.toFixed(1)}${this.altitudeAccuracy === null ? null : ` ± ${this.altitudeAccuracy.toFixed(1)}`} m</span>
                </div>
            `}
        `;
    }
}

customElements.define('geolocation-manager', GeolocationManager);
