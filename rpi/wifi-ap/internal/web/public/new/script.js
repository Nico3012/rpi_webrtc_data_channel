import { WifiLabel } from "../components/wifi-label/wifi-label.js";

/** @type {WifiLabel} */
const wifiLabel = document.querySelector('wifi-label');

await wifiLabel.setDetails('Device Controller', 'Password123!', '301202');
