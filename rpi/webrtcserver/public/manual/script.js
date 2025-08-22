const manualHandshake = document.querySelector('manual-handshake');

manualHandshake.addEventListener('offer-received', async event => {
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
    manualHandshake.setAnswer(btoa(JSON.stringify(answer)));
});
