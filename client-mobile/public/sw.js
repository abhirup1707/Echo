// Echo Background Service Worker
self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Network-first pass-through for WebSockets, API calls, and streaming
    event.respondWith(fetch(event.request));
});
