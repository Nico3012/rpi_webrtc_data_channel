# Minor enhancements of sw and api:
- Use indexeddb to check the install state in sw.js and script.js
- Also make sure to completely await the service worker to become active before cacheing to make sure, cache is handled by the new service worker
