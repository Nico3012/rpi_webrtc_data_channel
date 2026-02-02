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

{ // sample data injection
    let speed = 5; // m/s
    let heading = 90 // west
    let lat = 51.505; // deg
    let lon = -0.09; // deg

    const img = document.createElement('img');
    img.className = 'marker-image';
    img.src = `../heading-foreground.svg`;
    /** @param {number} heading */
    const setMarkerHeading = (heading) => {
        img.style.transform = `rotate(-${heading.toString()}deg)`;
    };

    setMarkerHeading(heading);

    const divIcon = L.divIcon({
        className: 'icon-marker-container',
        html: img,
        iconSize: [40, 40],
    });

    const marker = L.marker([51.5, -0.09], {icon: divIcon});

    marker.addTo(map);

    setInterval(() => {
        heading += 5;
        setMarkerHeading(heading);
    }, 200);
}
