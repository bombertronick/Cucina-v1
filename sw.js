// File: sw.js
const CACHE_NAME = 'scutum-erp-v21-force';

// Forza il Service Worker ad attivarsi immediatamente senza aspettare
self.addEventListener('install', (e) => {
    self.skipWaiting();
    console.log("[SW] Installato nuovo Service Worker.");
});

// All'attivazione, distrugge chirurgicamente tutte le vecchie cache
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log("[SW] Epurazione vecchia cache:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Strategia Network-First: Prova prima a prendere i file nuovi da internet, 
// se sei offline usa la cache.
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Se la rete risponde, aggiorna la cache in background
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
                return response;
            })
            .catch(() => {
                // Se sei offline, usa la cache
                return caches.match(e.request);
            })
    );
});
