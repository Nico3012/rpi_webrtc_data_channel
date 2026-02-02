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
