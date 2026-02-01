// script.js - ES6 Module for WiFi AP Config
const form = document.getElementById('configForm');

// Load initial config
async function loadConfig() {
  try {
    const response = await fetch('/get-config');
    const data = await response.json();
    const ssidInput = document.querySelector('input[name="ssid"]');
    const passwordInput = document.querySelector('input[name="password"]');
    ssidInput.value = data.ssid || '';
    passwordInput.value = data.password || '';
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save config
async function saveConfig(event) {
  event.preventDefault();

  const formData = new FormData(form);

  try {
    const response = await fetch('/set-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ssid: formData.get('ssid'),
        password: formData.get('password'),
      })
    });

    if (response.ok) {
      alert('Gespeichert. AP wird neu gestartet.');
    } else {
      const errorText = await response.text();
      alert('Fehler: ' + errorText);
    }
  } catch (error) {
    console.error('Error saving config:', error);
    alert('Netzwerkfehler beim Speichern.');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadConfig);
form.addEventListener('submit', saveConfig);
