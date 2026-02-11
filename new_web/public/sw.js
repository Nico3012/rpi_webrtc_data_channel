const CACHE_NAME = 'cache-v1'
const RESOURCES = ['/', '/index.html', '/manifest.json', '/assets/favicon.png', '/assets/icon-192.png', '/assets/icon-512.png']

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			try {
				const cache = await caches.open(CACHE_NAME)
				await Promise.all(
					RESOURCES.map(async (url) => {
						const response = await fetch(url, { cache: 'no-store' })
						if (!response.ok) throw new Error(`Precache failed: ${url}`)
						await cache.put(url, response)
					})
				)
			} catch (error) {
				await caches.delete(CACHE_NAME)
				throw error
			}
		})()
	)
})

self.addEventListener('fetch', (event) => {
	const request = event.request
	const url = new URL(request.url)
	if (request.method !== 'GET' || url.origin !== self.location.origin) return

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME)
			const cached = await cache.match(request)
			return cached || fetch(request, { cache: 'no-store' })
		})()
	)
})
