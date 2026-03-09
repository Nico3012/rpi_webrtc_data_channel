import { WifiLabel } from "../components/wifi-label/wifi-label.js";

const params = new URLSearchParams(window.location.search);

const ssid = params.get('ssid');
const password = params.get('password');
const devicePassword = params.get('devicePassword');

if (!ssid) throw new Error('no ssid in search params');
if (!password) throw new Error('no password in search params');
if (!devicePassword) throw new Error('no devicePassword in search params');

/** @type {WifiLabel} */
const wifiLabel = document.querySelector('wifi-label');

await wifiLabel.setDetails(ssid, password, devicePassword);
