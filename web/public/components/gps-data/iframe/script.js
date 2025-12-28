const getById = (id) => document.getElementById(id);

const fallbackEl = getById('fallback');
const mapEl = getById('map');

let map;
let marker;
let circle;
let tiles;
let firstPosition = true;

const ensureTiles = () => {
    if (!map) return;
    if (tiles) return;
    if (!navigator.onLine) return;

    tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
};

const setPosition = (lat, lon, accuracy) => {
    if (!map) return;

    const position = [lat, lon];

    if (firstPosition) {
        firstPosition = false;
        map.setView(position, 16);
        setTimeout(() => map.invalidateSize(), 0);
    }

    if (marker) {
        marker.setLatLng(position);
    } else {
        marker = L.marker(position).addTo(map);
    }

    const hasAccuracy = typeof accuracy === 'number' && !Number.isNaN(accuracy);
    if (!hasAccuracy) return;

    if (circle) {
        circle.setLatLng(position);
        circle.setRadius(accuracy);
    } else {
        circle = L.circle(position, {
            radius: accuracy,
            color: '#136AEC',
            fillColor: '#136AEC',
            fillOpacity: 0.2,
            weight: 2,
        }).addTo(map);
    }
};

window.addEventListener('online', () => {
    ensureTiles();
});

window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type !== 'gps-position') return;

    setPosition(event.data.lat, event.data.lon, event.data.accuracy);
});

try {
    // Leaflet is expected to be loaded via CDN in index.html.
    if (!window.L) {
        throw new Error('Leaflet (window.L) not available');
    }

    map = L.map(mapEl).setView([0, 0], 2);
    ensureTiles();
} catch (e) {
    console.error(e);
    fallbackEl.textContent =
        'Map library not available.\n' +
        'Tiles: online only.';
    fallbackEl.classList.add('show');
}
