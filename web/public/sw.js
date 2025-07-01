const CACHE_NAME = 'static-cache';

self.addEventListener('fetch', event => {
    if (event.request.method === 'GET') {
        event.respondWith(handleFetch(event.request));
    }
});

const handleFetch = async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(request);

    if (response) {
        return response;
    }

    // fetch from network, if cache does not provide a response
    const networkResponse = await fetch(request);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
};
