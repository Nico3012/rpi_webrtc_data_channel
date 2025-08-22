const autoHandshake = document.querySelector('auto-handshake');

autoHandshake.addEventListener('offer-received', async event => {
    const response = await fetch('/api/offer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event.detail.offer),
    });

    if (!response.ok) {
        throw new Error('Failed to generate answer');
    }

    const answer = await response.json();

    // set json string as base64 encoded string
    autoHandshake.setAnswer(btoa(JSON.stringify(answer)));
});
