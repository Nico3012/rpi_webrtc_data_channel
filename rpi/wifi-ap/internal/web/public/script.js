// script.js - ES6 Module for WiFi AP Config
const form = document.getElementById('configForm');
const downloadQRCodeButton = document.getElementById('download-qr-code');

let qrCode;

async function updateQRCode(ssid, password) {
    document.querySelector('#qr-code-container > canvas')?.remove();
    qrCode = undefined;

    const qrCodeIconResponse = await fetch('./assets/qr-code-icon.png');
    if (!qrCodeIconResponse.ok) throw new Error('qr code response not ok');
    const qrCodeIconBlob = await qrCodeIconResponse.blob();
    const qrCodeIconBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // enthält data:image/png;base64,...
        reader.onerror = reject;
        reader.readAsDataURL(qrCodeIconBlob);
    });

    qrCode = new QRCodeStyling({
        "type": "canvas",
        "shape": "square",
        "width": 1024,
        "height": 1024,
        "data": `WIFI:T:WPA;S:${ssid};P:${password};;`,
        "margin": 0,
        "qrOptions": {
            "typeNumber": "8",
            "mode": "Byte",
            "errorCorrectionLevel": "Q"
        },
        "imageOptions": {
            "saveAsBlob": true,
            "hideBackgroundDots": true,
            "imageSize": 0.4,
            "margin": 0
        },
        "dotsOptions": {
            "type": "extra-rounded",
            "color": "#000000",
            "roundSize": true
        },
        "backgroundOptions": {
            "round": 0,
            "color": "#ffffff"
        },
        "image": qrCodeIconBase64,
        "dotsOptionsHelper": {
            "colorType": {
                "single": true,
                "gradient": false
            },
            "gradient": {
                "linear": true,
                "radial": false,
                "color1": "#6a1a4c",
                "color2": "#6a1a4c",
                "rotation": "0"
            }
        },
        "cornersSquareOptions": {
            "type": "dot",
            "color": "#000000"
        },
        "cornersSquareOptionsHelper": {
            "colorType": {
                "single": true,
                "gradient": false
            },
            "gradient": {
                "linear": true,
                "radial": false,
                "color1": "#000000",
                "color2": "#000000",
                "rotation": "0"
            }
        },
        "cornersDotOptions": {
            "type": "dot",
            "color": "#000000"
        },
        "cornersDotOptionsHelper": {
            "colorType": {
                "single": true,
                "gradient": false
            },
            "gradient": {
                "linear": true,
                "radial": false,
                "color1": "#000000",
                "color2": "#000000",
                "rotation": "0"
            }
        },
        "backgroundOptionsHelper": {
            "colorType": {
                "single": true,
                "gradient": false
            },
            "gradient": {
                "linear": true,
                "radial": false,
                "color1": "#ffffff",
                "color2": "#ffffff",
                "rotation": "0"
            }
        }
    });

    qrCode.append(document.getElementById('qr-code-container'));
}

function downloadQRCode() {
    qrCode?.download({ name: "qr-code", extension: "png" });
}

// Load initial config
async function loadConfig() {
    try {
        const response = await fetch('/get-config');
        const data = await response.json();
        const ssidInput = document.querySelector('input[name="ssid"]');
        const passwordInput = document.querySelector('input[name="password"]');
        ssidInput.value = data.ssid || '';
        passwordInput.value = data.password || '';
        updateQRCode(data.ssid || '', data.password || '');
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Save config
async function saveConfig(event) {
    event.preventDefault();

    const formData = new FormData(form);

    try {
        const response = await fetch('/set-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ssid: formData.get('ssid'),
                password: formData.get('password'),
            })
        });

        if (response.ok) {
            alert('Gespeichert. AP wird neu gestartet.');
            updateQRCode(formData.get('ssid'), formData.get('password'));
        } else {
            const errorText = await response.text();
            alert('Fehler: ' + errorText);
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Netzwerkfehler beim Speichern.');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadConfig);
form.addEventListener('submit', saveConfig);
downloadQRCodeButton.addEventListener('click', downloadQRCode);
