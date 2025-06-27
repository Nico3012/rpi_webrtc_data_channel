async function generateAnswer() {
    const offerInput = document.getElementById('offerInput');
    const offerText = offerInput.value.trim();

    if (!offerText) {
        showError('Please paste the Controller Code first');
        return;
    }

    try {
        // Parse the offer JSON
        const offer = JSON.parse(offerText);

        // Validate offer structure
        if (!offer.type || !offer.sdp || offer.type !== 'offer') {
            throw new Error('Invalid Controller Code format');
        }

        // Disable button during processing
        const btn = document.getElementById('generateAnswerBtn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        // Send offer to RPI server API
        const response = await fetch('/api/offer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(offer)
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            throw new Error(result.error || 'Failed to generate response code');
        }

        // Display the answer as JSON (compact format for single line)
        document.getElementById('answerDisplay').value = JSON.stringify(result);
        showStep(2);

    } catch (error) {
        console.error('Error generating answer:', error);
        showError('Error generating response code: ' + error.message);
    } finally {
        // Re-enable button
        const btn = document.getElementById('generateAnswerBtn');
        btn.disabled = false;
        btn.textContent = 'Generate Response';
    }
}

function copyAnswer() {
    const answerInput = document.getElementById('answerDisplay');

    // using old execCommand because navigator.clipboard is only available in https
    answerInput.focus();
    answerInput.setSelectionRange(0, answerInput.value.length);
    const copied = document.execCommand('copy');
    answerInput.blur();

    // display some feedback to the user, if copy was successful
    if (copied) {
        const btn = document.getElementById('copyAnswerBtn');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        `;
        // Reset button content after 2 seconds
        setTimeout(() => {
            btn.innerHTML = originalContent;
        }, 2000);
    }
}

function closePage() {
    window.close();
}

function showStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 2; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            step.classList.add('hidden');
        }
    }

    // Show current step
    const currentStep = document.getElementById(`step${stepNumber}`);
    if (currentStep) {
        currentStep.classList.remove('hidden');
    }

    // Hide error section when showing a step
    document.getElementById('errorSection').classList.add('hidden');
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorSection').classList.remove('hidden');
}

// Set up event listeners
window.addEventListener('load', () => {
    document.getElementById('generateAnswerBtn').addEventListener('click', generateAnswer);
    document.getElementById('copyAnswerBtn').addEventListener('click', copyAnswer);
    document.getElementById('closePageBtn').addEventListener('click', closePage);
    showStep(1); // Start with step 1
});
