const UNSECURE_ORIGIN = 'http://localhost:8081';

/**
 * @param {string} offer
 * @returns {Promise<string>}
 */
const openPageAndSendData = (offer) => new Promise(async resolve => {
    const w = window.open(UNSECURE_ORIGIN, '_blank');
    if (!w) return; // never resolve the promise

    const controller = new AbortController();

    window.addEventListener('message', event => {
        if (event.origin === UNSECURE_ORIGIN) {
            const answer = event.data;
            controller.abort();

            w.close();
            resolve(answer);
        }
    }, { signal: controller.signal });

    while (true) {
        if (controller.signal.aborted) {
            // controller got aborted. Exit the loop
            break;
        } else if (w.closed) {
            // window got closed but controller was not aborted. Therefore aborting controller and exit the loop
            controller.abort();
            break;
        }

        w.postMessage(offer, UNSECURE_ORIGIN);
        await new Promise(resolve => setTimeout(resolve, 10)); // sleep
    }
});

// use function

document.querySelector('button').addEventListener('click', async () => {
    const answer = await openPageAndSendData('offer');

    console.log(answer);
});
