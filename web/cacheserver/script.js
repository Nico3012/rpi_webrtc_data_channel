// THESE METHODS ARE NOT INSTALLING/UNINSTALLING A PWA APP! THEY ONLY CACHE RESOURCES AND INSTALL THE SERVICE WORKER! THE SERVICE WORKER IS PWA COMPATIBLE!
// IMPORTANT: Restart the server to make changes in this file appear!

const CACHE_NAME = 'cache-v1';

/** @returns {boolean} */
export const isInstalled = () => !!navigator.serviceWorker.controller; // A ServiceWorker object if its state is activating or activated, or null if there is no active worker.

/** @returns {Promise<void>} */
export const install = () => new Promise(async (resolve) => {
    if (isInstalled()) throw new Error('Already installed.');

    { // cache:
        const cache = await caches.open(CACHE_NAME);

        // load pathnames
        const response = await fetch('/api/pathnames.json');
        await cache.put('/api/pathnames.json', response.clone());

        /** @type {string[]} */
        const pathnames = await response.json();

        pathnames.push('/api/script.js', '/api/sw.js', '/api/hash/current.json');

        for (const pathname of pathnames) {
            const response = await fetch(pathname, { redirect: 'manual' });
            await cache.put(pathname, response);
        }
    }

    { // service worker:
        const registration = await navigator.serviceWorker.register('/api/sw.js', { scope: '/' });

        registration.addEventListener('updatefound', () => {
            const sw = registration.installing;

            sw.addEventListener('statechange', () => {
                if (sw.state === 'activated') {
                    resolve();
                }
            });
        });
    }
});

/**
 * The active service worker will only be released after a reload.
 * Therefore this function only initializes the uninstall process.
 * isInstalled stays true after this function call
 * @returns {Promise<void>}
 */
export const initUninstall = async () => {
    if (!isInstalled()) throw new Error('Not installed.');

    if (window.matchMedia('(display-mode: standalone)').matches)
        throw new Error('Cannot uninstall in standalone mode. Uninstall the PWA first!');

    // unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));

    // delete caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
};

/**
 * This function should not be called after initUninstall was called, because then the cache is gone but the service worker stays active until the page reloads
 * @returns {Promise<boolean>}
 */
export const updateAvailable = async () => {
    if (!isInstalled()) return false; // cant be true, if app is not installed

    const currentResponse = await fetch('/api/hash/current.json');
    const latestResponse = await fetch('/api/hash/latest.json');

    if (!currentResponse.ok) throw new Error(currentResponse.statusText);
    if (!latestResponse.ok) throw new Error(latestResponse.statusText);

    const currentHash = await currentResponse.json();
    const latestHash = await latestResponse.json();

    return currentHash !== latestHash;
};
