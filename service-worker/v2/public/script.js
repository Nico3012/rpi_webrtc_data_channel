import { installSW, uninstallSW, isInstalled } from '/api/script.js';

if (!isInstalled()) {
    await installSW();
    // alert('installed');
}

const button = document.querySelector('button');
button.addEventListener('click', async () => {
    await uninstallSW();
    alert('uninstalled, reloading now.');
    location.reload();
});
