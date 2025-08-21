const SECURE_ORIGIN = 'https://localhost:8443';

const controller = new AbortController();

window.addEventListener("message", (event) => {
    if (event.origin === SECURE_ORIGIN) {
        const offer = event.data;

        const answer = offer + ';answer';
        event.source.postMessage(answer, SECURE_ORIGIN); // set targetOrigin, '*' must be avoided

        controller.abort();
    }
}, { signal: controller.signal });
