// IMPORTANT: Restart the go server to make changes in this file appear!

const CACHE_NAME = 'cache-v1';
const INDEX_HTML_HANDLER = true;

self.addEventListener('install', async () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith((async () => {
        // if cache is not available, bypass the service worker!
        if (!(await caches.has(CACHE_NAME))) return await fetch(event.request);

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
                        const m = rangeHeader.match(/bytes=(\d*)-(\d*)/);
                        const size = parseInt(response.headers.get('Content-Length')) || 0;
                        let start = m[1] ? parseInt(m[1]) : 0;
                        let end = m[2] ? parseInt(m[2]) : (size ? size - 1 : 0);

                        if (isNaN(start) || start < 0) start = 0;
                        if (isNaN(end) || end >= size) end = size - 1;
                        if (end < start) end = size - 1;

                        const chunkSize = end - start + 1;
                        const headers = new Headers(response.headers);
                        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
                        headers.set('Content-Length', chunkSize);
                        headers.set('Accept-Ranges', 'bytes');

                        const stream = new ReadableStream({
                            async start(controller) {
                                const reader = response.body.getReader();
                                let bytesSkipped = 0;
                                let bytesSent = 0;

                                while (true) {
                                    const { value, done } = await reader.read();
                                    if (done) break;

                                    const chunk = value;
                                    const chunkLength = chunk.byteLength;

                                    if (bytesSkipped + chunkLength <= start) {
                                        // skip entire chunk
                                        bytesSkipped += chunkLength;
                                        continue;
                                    }

                                    let sliceStart = 0;
                                    if (bytesSkipped < start) {
                                        sliceStart = start - bytesSkipped;
                                    }

                                    const available = chunkLength - sliceStart;
                                    const bytesRemaining = chunkSize - bytesSent;
                                    const bytesToSend = Math.min(available, bytesRemaining);

                                    controller.enqueue(chunk.slice(sliceStart, sliceStart + bytesToSend));
                                    bytesSent += bytesToSend;
                                    bytesSkipped += chunkLength;

                                    if (bytesSent >= chunkSize) break;
                                }

                                controller.close();
                            }
                        });

                        return new Response(stream, {
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

            if (url.pathname === '/api/pathnames.json' || url.pathname === '/api/script.js' || url.pathname === '/api/sw.js' || url.pathname === '/api/hash/current.json') {
                const response = await cache.match(url.pathname);

                if (response) {
                    return response;
                } else {
                    return new Response('500 page not found', { status: 500 });
                }
            } else if (url.pathname === '/api/hash/latest.json') {
                try {
                    return await fetch('/api/hash/latest.json');
                } catch {
                    // fallback with current hash, if server is not reachable
                    return await cache.match('/api/hash/current.json') || new Response('500 page not found', { status: 500 });
                }
            } else {
                return new Response('404 page not found', { status: 404 });
            }

        }
    })());
});
