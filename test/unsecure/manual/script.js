const manualHandshake = document.querySelector('manual-handshake');

manualHandshake.addEventListener('offer-received', event => {
    manualHandshake.setAnswer(`${event.detail.offer};answer`);
});
