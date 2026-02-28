import { WifiLabel } from "../components/wifi-label/wifi-label.js";

/** @type {WifiLabel} */
const wifiLabel = document.querySelector('wifi-label');

await wifiLabel.createQRCode('Device Controller', 'Password123!');
