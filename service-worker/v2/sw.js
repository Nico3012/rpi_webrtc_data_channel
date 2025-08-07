const CACHE_NAME = 'cache-v1';
const INDEX_HTML_HANDLER = true;

self.addEventListener('install', async (event) => {
    self.skipWaiting();

    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // load pathnames
        const response = await fetch('/api/pathnames.json');
        if (!response.ok) throw new Error(response.statusText);
        cache.put('/api/pathnames.json', response.clone());
        /** @type {string[]} */
        const pathnames = await response.json();

        pathnames.push('/api/script.js', '/api/sw.js');

        for (const pathname of pathnames) {
            const response = await fetch(pathname);
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

        // static routing server (Go http.FileServer compatible)
        if (!url.pathname.startsWith('/api/')) {

            if (!INDEX_HTML_HANDLER || !url.pathname.endsWith('/index.html')) {
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
                    return new Response('404 page not found', { status: 404 });
                }
            } else {
                // always remove index.html to cleanup pathname (like go http.FileServer does)
                return Response.redirect(url.pathname.slice(0, -10) + url.search, 301);
            }

        } else {

            if (url.pathname === '/api/pathnames.json' || url.pathname === '/api/script.js' || url.pathname === '/api/sw.js') {
                const response = await cache.match(url.pathname);

                if (response) {
                    return response;
                } else {
                    return new Response('500 file not found', { status: 500 });
                }
            } else {
                return new Response('404 page not found', { status: 404 });
            }

        }
    })());
});
