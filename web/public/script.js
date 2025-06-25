// Chat application implementation using the WebRTC component's API
document.addEventListener('DOMContentLoaded', () => {
    const webrtcComponent = document.getElementById('webrtcConnection');
    const chatContainer = document.getElementById('chatContainer');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    let messages = [];

    // Set up callback for incoming messages
    webrtcComponent.initReadDataCallback((message) => {
        console.log('Received message via callback:', message);
        addMessage(message, 'received');
    });

    // Monitor connection status to show/hide chat
    function updateChatVisibility() {
        if (webrtcComponent.isConnected()) {
            chatContainer.style.display = 'block';
        } else {
            chatContainer.style.display = 'none';
            // Clear messages when disconnected
            messages = [];
            renderMessages();
        }
    }

    // Check connection status periodically
    setInterval(updateChatVisibility, 500);

    // Also check immediately
    updateChatVisibility();

    // Send message function
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        try {
            webrtcComponent.sendData(message);
            addMessage(message, 'sent');
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message: ' + error.message);
        }
    }

    // Add message to chat
    function addMessage(text, type) {
        const message = {
            text,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        messages.push(message);
        renderMessages();
    }

    // Render messages in the chat
    function renderMessages() {
        messagesDiv.innerHTML = messages.map(msg => `
            <div class="message ${msg.type}">
                <div>${msg.text}</div>
                <div class="timestamp">${msg.timestamp}</div>
            </div>
        `).join('');

        // Auto-scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
