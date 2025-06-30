const CACHE_NAME = 'drone-controller-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/style.css',
  '/webrtc-component.js',
  '/manifest.json',
  '/lit@3.2.1/lit-core.min.js'
];

// Install event - cache initial resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching initial resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - modern network-first strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests for same origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Modern fetch with network-first strategy
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        // Cache successful responses
        if (response?.ok && response.type === 'basic') {
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('Service Worker: Caching updated resource:', event.request.url);
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(async () => {
        // Network failed, try cache
        console.log('Service Worker: Network failed, trying cache for:', event.request.url);
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // No cache, return offline page for navigation
        if (event.request.mode === 'navigate') {
          return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <title>Offline - Drone Controller</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: system-ui, sans-serif; 
                  text-align: center; 
                  padding: 2rem;
                  background: #f5f5f5;
                }
                .container { 
                  max-width: 400px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 2rem; 
                  border-radius: 8px; 
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #333; margin-bottom: 1rem; }
                p { color: #666; margin-bottom: 2rem; }
                button { 
                  background: #000; 
                  color: white; 
                  border: none; 
                  padding: 0.75rem 1.5rem; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 1rem;
                }
                button:hover { background: #333; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>The drone controller is not available right now. Please check your connection and try again.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // For other requests, return network error
        return new Response('Network unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Handle skip waiting messages
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
