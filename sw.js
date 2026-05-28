// File: sw.js
const CACHE_NAME = 'scutum-erp-v22-core';

self.addEventListener('install', (e) => {
    self.skipWaiting();
    console.log("[SW] Installazione ed esecuzione nuova versione V22.");
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log("[SW] Rimozione vecchia cache obsoleta:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
                return response;
            })
            .catch(() => {
                // Forzatura della corrispondenza ignorando i parametri di query (?v=...)
                return caches.match(e.request, { ignoreSearch: true });
            })
    );
});
