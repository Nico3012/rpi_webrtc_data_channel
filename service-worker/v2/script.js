/** @returns {boolean} */
export const isInstalled = () => !!navigator.serviceWorker.controller; // A ServiceWorker object if its state is activating or activated, or null if there is no active worker.

/** @returns {Promise<void>} */
export const install = () => new Promise(async (resolve) => {
    const registration = await navigator.serviceWorker.register('/api/sw.js', { scope: '/' });

    registration.addEventListener('updatefound', () => {
        const sw = registration.installing;

        sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') {
                resolve();
            }
        });
    });
});

/**
 * The active service worker will only be released after a reload.
 * Therefore this function only initializes the uninstall process.
 * isInstalled stays true after this function call
 * @returns {Promise<void>}
 */
export const initUninstall = async () => {
    if (window.matchMedia('(display-mode: standalone)').matches)
        throw new Error('Cannot uninstall in standalone mode.');

    // unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));

    // delete caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
};

/** @returns {Promise<boolean>} */
export const updateAvailable = async () => {
    const currentResponse = await fetch('/api/hash/current.json');
    const latestResponse = await fetch('/api/hash/latest.json');

    if (!currentResponse.ok) throw new Error(currentResponse.statusText);
    if (!latestResponse.ok) throw new Error(latestResponse.statusText);

    const currentHash = await currentResponse.json();
    const latestHash = await latestResponse.json();

    return currentHash !== latestHash;
};
