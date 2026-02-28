import { WifiLabel } from "../components/wifi-label/wifi-label.js";

/** @type {WifiLabel} */
const wifiLabel = document.querySelector('wifi-label');

const base64 = await wifiLabel.createQRCode('test');
console.log(base64);
