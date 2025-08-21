const handshakeManager = document.querySelector('handshake-manager');

handshakeManager.offer = 'abc_offer_stuff';
handshakeManager.addEventListener('answer-received', event => {
    console.log(event.detail.answer);
});
