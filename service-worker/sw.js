// dynamically generate this list
const PATHNAMES = [
    '/index.html',
    '/src/style.css',
    '/src/script.js',
];

const CACHE_NAME = 'cache-v1';

self.addEventListener('install', async (event) => {
    event.waitUntil((async () => {
        await self.skipWaiting();

        const cache = await caches.open(CACHE_NAME);

        // cache all assets
        for (const pathname of PATHNAMES) {
            const response = await fetch('/api/cache' + pathname);
            cache.put(pathname, response);
        }
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        const request = event.request;
        const url = new URL(request.url);

        if (!url.pathname.startsWith('/api/')) {
            const response = await cache.match(url.pathname);

            if (response) {
                //
            } else {
                event.respondWith(new Response('404 Not found', { status: 404 }));
            }
        } else {
            if (url.pathname.startsWith('/api/cache/')) {
                event.respondWith(new Response('Trigger an update to reload resources', { status: 500 }));
            } else {
                event.respondWith(new Response('API Endpoint'));
            }
        }
    })());
});
