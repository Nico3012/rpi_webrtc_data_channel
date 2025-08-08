import { installSW, uninstallSW, isInstalled, checkForUpdate } from '/api/script.js';

if (!isInstalled()) {
    await installSW();
    // alert('installed');
}

const button = document.querySelector('button');
button.addEventListener('click', async () => {
    await uninstallSW();
    setTimeout(() => {
        alert('uninstalled, reloading now.');
        location.reload();
    }, 1000);
});

if (await checkForUpdate()) {
    alert('Update available. Click Uninstall to update');
} else {
    console.log('Already latest');
}
