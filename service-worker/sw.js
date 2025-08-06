const CACHE_NAME = 'cache-v1';

// PATHNAMES will be replaced by Go template
const PATHNAMES = [
    [[.Pathnames]]
];

const DIR_PATHS = extractDirectories(PATHNAMES);

self.addEventListener('install', async (event) => {
    event.waitUntil((async () => {
        await self.skipWaiting();

        const cache = await caches.open(CACHE_NAME);

        // cache /api/files/script.js
        console.log('Fetching: /api/files/script.js');
        const scriptResponse = await fetch('/api/files/script.js');
        console.log('Cacheing: /api/files/script.js');
        cache.put('/api/files/script.js', scriptResponse);

        // cache /api/files/sw.js
        console.log('Fetching: /api/files/sw.js');
        const swResponse = await fetch('/api/files/sw.js');
        console.log('Cacheing: /api/files/sw.js');
        cache.put('/api/files/sw.js', swResponse);

        // cache all assets
        for (const pathname of PATHNAMES) {
            console.log(`Fetching: ${pathname}`);
            const response = await fetch(pathname);
            console.log(`Cacheing: ${pathname}`);
            cache.put(pathname, response);
        }

        console.log('Completed cacheing');
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

                const response = await cache.match(url.pathname);

                if (response) {

                    // Handle Range requests
                    const rangeHeader = request.headers.get('Range');
                    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
                        const fullBuffer = await response.arrayBuffer();
                        const size = parseInt(response.headers.get('Content-Length')) || fullBuffer.byteLength;
                        const m = rangeHeader.match(/bytes=(\d*)-(\d*)/);
                        let start = m[1] ? parseInt(m[1]) : 0;
                        let end = m[2] ? parseInt(m[2]) : size - 1;
                        if (isNaN(start) || start < 0) start = 0;
                        if (isNaN(end) || end >= size) end = size - 1;
                        if (end < start) end = size - 1;
                        const chunkSize = end - start + 1;
                        const partialBuffer = fullBuffer.slice(start, end + 1);
                        const headers = new Headers(response.headers);
                        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
                        headers.set('Content-Length', chunkSize);
                        headers.set('Accept-Ranges', 'bytes');
                        return new Response(partialBuffer, {
                            status: 206,
                            statusText: 'Partial Content',
                            headers
                        });
                    } else {
                        return response;
                    }

                } else {
                    return new Response('404 Not found', { status: 404 });
                }

            }

        } else {

            // service worker api endpoints
            if (url.pathname === '/api/files/script.js') {
                const response = await cache.match(url.pathname);

                if (response) {
                    return response;
                } else {
                    return new Response('Unexpected Error: script not found!', { status: 500 });
                }

            } else if (url.pathname === '/api/files/sw.js') {
                const response = await cache.match(url.pathname);

                if (response) {
                    return response;
                } else {
                    return new Response('Unexpected Error: sw not found!', { status: 500 });
                }

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
