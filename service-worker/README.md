# How to use this server framework?
### Possibilities
Inside the public directory, every webpage can be hosted. The service worker will cache every file inside and provide a static routing server.

### Limitations
Interactions with the service worker api or cache api should be avoided to not interupt the framework.
The service worker by default is pwa ready.

# PWA Compatibility
### Chrome
Chrome shares the same services worker between the pwa and the browser.

### Safari
Safari creates a new context for every pwa.
Therefore the service worker is not shared between the browser and the pwa. The pwa must install the service worker again.
This is no problem. The pwa app opens and always when no service worker is installed, the server tries to install it. This means, you get the install page, which automatically resolves to the wanted resource in seconds. The custom web manifest is therefore not present when opening the pwa the first time but this is no problem, because pwa's are not required to provide a manifest when they are installed. Also the initially missing service worker is no problem, because safari automatically provides an empty browser session.
