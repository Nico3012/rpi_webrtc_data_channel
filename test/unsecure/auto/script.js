const autoHandshake = document.querySelector('auto-handshake');

autoHandshake.addEventListener('offer-received', event => {
    autoHandshake.setAnswer(`${event.detail.offer};answer`);
});
