const UNSECURE_ORIGIN = 'http://localhost:8081';

/**
 * @param {string} offer
 * @returns {Promise<string>}
 */
const openPageAndSendData = (offer) => new Promise((resolve) => {
    const w = window.open(UNSECURE_ORIGIN, '_blank');

    if (w) {
        window.addEventListener('message', (event) => {
            if (event.origin === UNSECURE_ORIGIN) {
                const { type, data } = JSON.parse(event.data);

                if (type === 'connected') {
                    w.postMessage(JSON.stringify({
                        type: 'offer',
                        data: offer,
                    }), UNSECURE_ORIGIN);
                }

                if (type === 'answer') {
                    w.close();

                    resolve(data);
                }
            }
        });
    } else {
        throw new Error('Failed to get window reference');
    }
});

// use function

document.querySelector('button').addEventListener('click', async () => {
    const answer = await openPageAndSendData('offer');

    console.log(answer);
});
