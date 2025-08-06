const CACHE_NAME = 'cache-v1';

// PATHNAMES will be replaced by Go template
const PATHNAMES = [
    [[.Pathnames]]
];

const DIR_PATHS = extractDirectories(PATHNAMES);

const UPDATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Update Service Worker</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        async function unregisterServiceWorkersAndClearCache() {
            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // Delete all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }

            // Redirect to home after a short delay
            setTimeout(() => {
                window.location.replace('/');
            }, 500);
        }

        window.addEventListener('DOMContentLoaded', unregisterServiceWorkersAndClearCache);
    </script>
</head>
<body>
    <h1>Updating...</h1>
    <p>Please wait while the service worker and cache are cleared.</p>
</body>
</html>
`;

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
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        const request = event.request;
        const url = new URL(request.url);

        if (!url.pathname.startsWith('/api/')) {

            // static routing server
            if (DIR_PATHS.includes(url.pathname)) {

                // add / to pathname and redirect
                return Response.redirect(url.pathname + '/' + url.search, 307);

            } else if (url.pathname.endsWith('/index.html')) {

                // remove index.html to cleanup pathname (like go FileServer does)
                return Response.redirect(url.pathname.substring(0, url.pathname.length - 11) + url.search, 307);

            } else {

                const response = url.pathname.endsWith('/') ?
                    await cache.match(url.pathname + 'index.html') :
                    await cache.match(url.pathname);

                if (response) {
                    // needs seperation into with range header or not
                    return response;
                } else {
                    return new Response('404 Not found', { status: 404 });
                }

            }

        } else {

            // service worker api endpoints
            if (url.pathname.startsWith('/api/cache/')) {
                return new Response('Trigger an update to reload resources', { status: 500 });
            } else if (url.pathname === '/api/update/') {

                return new Response(UPDATE_HTML, { headers: new Headers([
                    ['Content-Type', 'text/html; charset=utf-8'],
                ]) });

            } else {
                return new Response('API Endpoint');
            }

        }
    })());
});

// helper functions:

/** @returns {string[]} */
function extractDirectories(paths) {
    const dirSet = new Set();

    paths.forEach(path => {
        const parts = path.split('/');
        parts.pop();

        let currentPath = '';
        for (let i = 1; i < parts.length; i++) {
            currentPath += '/' + parts[i];
            dirSet.add(currentPath);
        }
    });

    return Array.from(dirSet);
}
