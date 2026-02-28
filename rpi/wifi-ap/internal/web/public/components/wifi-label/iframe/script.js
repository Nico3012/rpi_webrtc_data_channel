'use strict';

const qrCodeIcon = fetch('./assets/qr-code-icon.png').then(res => res.blob()).then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onloadend = () => resolve(reader.result); // enthält data:image/png;base64,...
    reader.readAsDataURL(blob);
}));

/** @param {string} data */
window.createQRCode = async (data) => {
    const qrCode = new QRCodeStyling({
        "type": "canvas",
        "shape": "square",
        "width": 1024,
        "height": 1024,
        "data": data,
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
        "image": await qrCodeIcon,
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

    const base64 = await qrCode.getRawData('png').then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = reject;
        reader.onloadend = () => resolve(reader.result); // enthält data:image/png;base64,...
        reader.readAsDataURL(blob);
    }));

    return base64;
};
