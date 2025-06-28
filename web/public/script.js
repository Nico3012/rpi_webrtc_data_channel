// // Chat application implementation using the WebRTC component's API
// document.addEventListener('DOMContentLoaded', () => {
//     const webrtcComponent = document.getElementById('webrtcConnection');
//     const chatContainer = document.getElementById('chatContainer');
//     const messagesDiv = document.getElementById('messages');
//     const messageInput = document.getElementById('messageInput');
//     const sendButton = document.getElementById('sendButton');

//     let messages = [];

//     // Set up event listeners for WebRTC component
//     webrtcComponent.addEventListener('message-received', (event) => {
//         console.log('Received response via event:', event.detail.message);
//         addMessage(event.detail.message, 'received');
//     });

//     webrtcComponent.addEventListener('connection-changed', (event) => {
//         console.log('Connection status changed:', event.detail);
//         updateChatVisibility();
//     });

//     // Monitor connection status to show/hide chat
//     function updateChatVisibility() {
//         if (webrtcComponent.isConnected()) {
//             chatContainer.style.display = 'block';
//         } else {
//             chatContainer.style.display = 'none';
//             // Clear commands when disconnected
//             messages = [];
//             renderMessages();
//         }
//     }

//     // Also check immediately
//     updateChatVisibility();

//     // Send command function
//     function sendMessage() {
//         const message = messageInput.value.trim();
//         if (!message) return;

//         try {
//             webrtcComponent.sendData(message);
//             addMessage(message, 'sent');
//             messageInput.value = '';
//         } catch (error) {
//             console.error('Error sending command:', error);
//             alert('Error sending command: ' + error.message);
//         }
//     }

//     // Add message to chat
//     function addMessage(text, type) {
//         const message = {
//             text,
//             type,
//             timestamp: new Date().toLocaleTimeString()
//         };

//         messages.push(message);
//         renderMessages();
//     }

//     // Render messages in the chat
//     function renderMessages() {
//         messagesDiv.innerHTML = messages.map(msg => `
//             <div class="message ${msg.type}">
//                 <div>${msg.text}</div>
//                 <div class="timestamp">${msg.timestamp}</div>
//             </div>
//         `).join('');

//         // Auto-scroll to bottom
//         messagesDiv.scrollTop = messagesDiv.scrollHeight;
//     }

//     // Event listeners
//     sendButton.addEventListener('click', sendMessage);
//     messageInput.addEventListener('keypress', (e) => {
//         if (e.key === 'Enter') {
//             sendMessage();
//         }
//     });
// });







const webrtcComponent = document.getElementById('webrtcConnection');
const rangeInput = document.getElementById('rangeInput');
const pitchDiv = document.getElementById('pitch');
const rollDiv = document.getElementById('roll');

rangeInput.addEventListener('input', () => {
    if (webrtcComponent.isConnected()) {
        webrtcComponent.sendData(rangeInput.value);
    }
});

webrtcComponent.addEventListener('connection-changed', () => {
    if (webrtcComponent.isConnected()) {
        webrtcComponent.sendData(rangeInput.value);
    }
});

webrtcComponent.addEventListener('message-received', (event) => {
    const [pitch, roll] = event.detail.message.split(';').map(str => parseFloat(str));

    pitchDiv.textContent = pitch.toString();
    rollDiv.textContent = roll.toString();
});
