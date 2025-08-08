import { install, initUninstall, isInstalled, updateAvailable } from '/api/script.js';

console.log('Initial install state:', isInstalled());

document.getElementById('install').addEventListener('click', async () => {
    console.log('Before install state:', isInstalled());
    await install();
    console.log('After install state:', isInstalled());
});

document.getElementById('uninstall').addEventListener('click', async () => {
    console.log('Before uninstall state:', isInstalled());
    await initUninstall();
    console.log('After uninstall state:', isInstalled());
});

document.getElementById('isinstalled').addEventListener('click', async () => {
    console.log('Current state:', isInstalled());
});

if (await updateAvailable()) {
    console.log('Update available');
} else {
    console.log('Already latest update');
}
