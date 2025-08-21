const autoHandshake = document.querySelector('auto-handshake');
const manualHandshake = document.querySelector('manual-handshake');

autoHandshake.style.display = 'none';
manualHandshake.style.display = 'none';

if (location.search === '?auto=true') {
    autoHandshake.style.display = 'block';

    autoHandshake.addEventListener('offer-received', event => {
        autoHandshake.setAnswer(`${event.detail.offer};answer`);
    });
}

if (location.search === '?auto=false') {
    manualHandshake.style.display = 'block';

    manualHandshake.addEventListener('offer-received', event => {
        manualHandshake.setAnswer(`${event.detail.offer};answer`);
    });
}
