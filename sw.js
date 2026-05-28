// File: sw.js
const CACHE_NAME = 'scutum-erp-v23-core';

// Risorse critiche per l'avvio della shell offline
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/core/state.js',
    './js/core/lazzaro.js',
    './js/core/cerbero.js',
    './js/core/ledger.js',
    './js/ui/renderer.js',
    './js/ui/nexus.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    // Forza l'attivazione immediata del nuovo Service Worker
    self.skipWaiting();
    
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("[SW] Pre-caching degli asset critici V23 avviato.");
            return cache.addAll(ASSETS).catch(err => console.warn("[SW] Impossibile eseguire il pre-cache di alcuni asset:", err));
        })
    );
    console.log("[SW] Installazione nuova versione V23 completata.");
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    // Distrugge tutte le cache precedenti non allineate alla versione attuale
                    if (key !== CACHE_NAME) {
                        console.log("[SW] Rimozione vecchia cache obsoleta:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Prende il controllo di tutti i client immediatamente
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Aggiorna dinamicamente la cache solo se la risposta di rete è valida
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
                return response;
            })
            .catch(() => {
                // FALLBACK OFFLINE ASSOLUTO
                // { ignoreSearch: true } previene i crash 404 causati da suffissi come ?v=20
                console.warn(`[SW] Rete assente o richiesta fallita per ${e.request.url}. Tentativo di lettura da Cache Locale.`);
                return caches.match(e.request, { ignoreSearch: true });
            })
    );
});
