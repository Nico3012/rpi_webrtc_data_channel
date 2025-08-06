# PWA Compatibility
## Chrome
Chrome shares the same services worker between the pwa and the browser

## Safari
Safari creates a new context for every pwa.
Therefore the service worker is not shared between the browser and the pwa. The pwa must install the service worker again.
