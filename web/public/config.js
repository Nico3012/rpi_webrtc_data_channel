// Configuration for WebRTC Demo
const CONFIG = {
    // Server Configuration
    RPI_SERVER_PORT: '8080',
    
    // Data Channel Configuration
    DATA_CHANNEL_LABEL: 'messages',
    DATA_CHANNEL_ORDERED: true,
    
    // UI Configuration
    ICE_GATHERING_TIMEOUT: 10000, // 10 seconds
    PERIODIC_MESSAGE_INTERVAL: 2000 // 2 seconds
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
