const SECURE_ORIGIN = 'https://localhost:8443';

const openerW = window.opener;

if (!openerW) throw new Error('Cannot get reference to opener');

window.addEventListener("message", (event) => {
    if (event.origin === SECURE_ORIGIN) {
        const { type, data } = JSON.parse(event.data);

        if (type === 'offer') {
            const answer = data + ';answer';

            openerW.postMessage(JSON.stringify({
                type: 'answer',
                data: answer,
            }), SECURE_ORIGIN);
        }
    }
});

// Tell client, we are connected
openerW.postMessage(JSON.stringify({
    type: 'connected',
    data: '',
}), SECURE_ORIGIN);
