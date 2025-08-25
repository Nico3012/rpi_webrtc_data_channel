// THESE METHODS ARE NOT INSTALLING/UNINSTALLING A PWA APP! THEY ONLY CACHE RESOURCES AND INSTALL THE SERVICE WORKER! THE SERVICE WORKER IS PWA COMPATIBLE!
// IMPORTANT: Restart the server to make changes in this file appear!

const CACHE_NAME = 'cache-v1';

/** @returns {Promise<boolean>} */
export const isInstalled = async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');

    return !!registration;
};

/** @returns {Promise<void>} */
export const install = async () => {
    if (await isInstalled()) throw new Error('Already installed.');

    // service worker:
    await new Promise(async resolve => {
        // update service worker first, because maybe old service worker might still be active
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

    { // cache:
        /** @type {{ [pathname: string]: Response; }} */
        const responses = {};

        const response = await fetch('/api/pathnames.json');
        responses['/api/pathnames.json'] = response.clone();

        /** @type {string[]} */
        const pathnames = await response.json();

        pathnames.push('/api/script.js', '/api/sw.js', '/api/hash/current.json');

        for (const pathname of pathnames) {
            const response = await fetch(pathname, { redirect: 'manual' });
            responses[pathname] = response;
        }

        // All fetch events are gone through the service worker.
        // Now open the cache. After opening the cache, the service worker interprets the state as installed.

        const cache = await caches.open(CACHE_NAME);

        // Cache all responses and await the cache. In this step, its possible that fetching data in other scripts fails. After this function call, fetching is again safe.
        await Promise.all(Object.entries(responses).map(([pathname, response]) => cache.put(pathname, response)));
    }
};

/**
 * The active service worker will only be released after a reload.
 * To make this still work, the service worker acts like a gateway to the server, if the cache is removed.
 * @returns {Promise<void>}
 */
export const uninstall = async () => {
    if (!(await isInstalled())) throw new Error('Not installed.');

    if (window.matchMedia('(display-mode: standalone)').matches)
        throw new Error('Cannot uninstall in standalone mode. Uninstall the PWA first!');

    // delete caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
};

/** @returns {Promise<boolean>} */
export const updateAvailable = async () => {
    if (!(await isInstalled())) return false; // cant be true, if app is not installed

    const currentResponse = await fetch('/api/hash/current.json');
    const latestResponse = await fetch('/api/hash/latest.json');

    if (!currentResponse.ok) throw new Error(currentResponse.statusText);
    if (!latestResponse.ok) throw new Error(latestResponse.statusText);

    const currentHash = await currentResponse.json();
    const latestHash = await latestResponse.json();

    return currentHash !== latestHash;
};
