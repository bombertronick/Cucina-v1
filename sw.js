// File: sw.js
const CACHE_NAME = 'scutum-v20-absolute-cache';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/theme.css',
    './css/layout.css',
    './js/app.js',
    './js/core/state.js',
    './js/core/cerbero.js',
    './js/core/lazzaro.js',
    './js/ui/renderer.js',
    './js/ui/nexus.js',
    // Caching delle librerie esterne cruciali per l'avvio a freddo
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap'
];

// Installazione e Pre-Caching del Motore
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SERVICE WORKER] Iniezione della Matrice Strutturale in Cache.');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Pulizia delle vecchie versioni (Garbage Collection del Codice)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SERVICE WORKER] Eliminazione vecchia cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Strategia Stale-While-Revalidate (Offline First)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Se la rete è morta, ignora l'errore e affidati alla cache
            });

            return cachedResponse || fetchPromise;
        })
    );
});
