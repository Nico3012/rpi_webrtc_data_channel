const CACHE_NAME = 'cache-v1';

const PATHNAMES = [
    '/dir',
    '/dir/',
    '/dir/file.ext',
];

self.addEventListener('install', async (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const PATH of PATHNAMES) {
            const response = await fetch(PATH);
            cache.put(PATH, response);
        }
    })());
});

// fetch (Golang similar implementation):
// if request ends with /index.html, return Response.redirect(PATH, 301) [Golang FileServer also does this no matter, if the directory exists and also only knows the entry point index.html]
// split between range and not range requests
