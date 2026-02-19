"use strict";

// @ts-expect-error
const map = L.map('map');

map.setView([0, 0], 0);

// @ts-expect-error
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

tiles.addTo(map);

// @ts-expect-error
const path = L.polyline([], {color: 'red'});

path.addTo(map);

{ // sample data injection
    /** @type {number | null} */
    let speed = null; // m/s
    /** @type {number | null} */
    let heading = null; // degrees, 0 = north, 90 = east
    /** @type {number} */
    let lat = 0; // deg
    /** @type {number} */
    let lon = 0; // deg

    const img = document.createElement('img');
    img.className = 'marker-image';
    img.src = `../heading-foreground.svg`;
    /** @param {number | null} heading */
    const setMarkerHeading = (heading) => {
        if (heading === null) {
            if (marker.options.icon !== defaultIcon) marker.setIcon(defaultIcon);
        } else {
            img.style.transform = `rotate(${heading.toString()}deg)`;
            if (marker.options.icon !== divIcon) marker.setIcon(divIcon);
        }
    };

    // @ts-expect-error
    const defaultIcon = new L.Icon.Default();

    // @ts-expect-error
    const divIcon = L.divIcon({
        className: 'icon-marker-container',
        html: img,
        iconSize: [40, 40],
    });

    // @ts-expect-error
    const marker = L.marker([lat, lon], {icon: defaultIcon});

    setMarkerHeading(heading);

    marker.addTo(map);

    /**
     * @param {number} newLat
     * @param {number} newLon
     * @param {number | null} newHeading
     * @param {number | null} newSpeed
     */
    window.updateMarker = (newLat, newLon, newHeading, newSpeed) => {
        lat = newLat;
        lon = newLon;
        heading = newHeading;
        speed = newSpeed;
        setMarkerHeading(newHeading);
    };

    /**
     * @param {number} lat
     * @param {number} lon
     */
    window.addToPath = (lat, lon) => {
        path.addLatLng([lat, lon]);
    };

    window.clearPath = () => {
        path.setLatLngs([]);
    };

    // Function to update position based on speed and heading
    const updatePosition = () => {
        if (speed === 0 || speed === null || heading === null) {
            return; // no movement calculation possible or needed
        }

        const deltaTime = 0.1; // seconds (100ms interval)
        const deltaDist = speed * deltaTime; // meters

        const headingRad = (heading * Math.PI) / 180;
        const latRad = (lat * Math.PI) / 180;

        // Approximate delta lat/lon
        const deltaLat = (deltaDist / 111320) * Math.cos(headingRad);
        const deltaLon = (deltaDist / (111320 * Math.cos(latRad))) * Math.sin(headingRad);

        lat += deltaLat;
        lon += deltaLon;

        marker.setLatLng([lat, lon]);
        // map.setView([lat, lon], map.getZoom()); // Follow the marker
    };

    // Update position every 100ms
    setInterval(updatePosition, 100);
}
