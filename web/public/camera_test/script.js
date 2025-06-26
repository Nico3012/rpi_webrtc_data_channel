document.addEventListener('DOMContentLoaded', function() {
    const rollValue = document.getElementById('roll-value');
    const pitchValue = document.getElementById('pitch-value');
    const deviceInfo = document.getElementById('device-info');
    
    // Set up device orientation listener directly
    window.addEventListener('deviceorientation', function(event) {
        // gamma is the left-to-right tilt in degrees (roll)
        let roll = event.gamma;
        
        // beta is the front-to-back tilt in degrees (pitch)
        let pitch = event.beta;
        
        // Display the values rounded to the nearest integer
        rollValue.textContent = Math.round(roll) + '°';
        pitchValue.textContent = Math.round(pitch) + '°';
        
        // Update status message once data starts flowing
        deviceInfo.textContent = "Device orientation active";
    });
});
