export const installSW = async () => {
    return await new Promise(async (resolve) => {
        const registration = await navigator.serviceWorker.register('/api/files/sw.js', { scope: '/' });

        registration.addEventListener('updatefound', () => {
            const sw = registration.installing;

            sw.addEventListener('statechange', () => {
                if (sw.state === 'activated') {
                    resolve();
                }
            });
        });
    });
};

export const uninstallSW = async () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        throw new Error('Cannot uninstall service worker in standalone mode.');
    }

    // delete service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));

    // delete caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
};

export const isInstalled = () => {
    return !!navigator.serviceWorker.controller;
};
