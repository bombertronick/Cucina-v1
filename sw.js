// File: sw.js

/**
 * ============================================================================
 * SERVICE WORKER (PWA Engine & Cache Manager)
 * ============================================================================
 * Garantisce l'esecuzione offline assoluta dell'applicazione e gestisce il
 * "Cache-Busting" per evitare il paradosso della PWA Zombie.
 */

const CACHE_NAME = 'scutum-erp-v15.8.0';

// Array vitale: tutti i file necessari per l'avvio "A freddo" senza internet
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
    './js/ui/events.js',
    './js/ui/nexus.js',
    // Librerie Esterne
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
    // Tipografia e Icone (Precaricamento per evitare sfarfallii offline)
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

/**
 * FASE 1: INSTALLAZIONE
 * Scarica e incapsula forzatamente la matrice di file vitale.
 * `self.skipWaiting()` forza l'installazione immediata scavalcando vecchi worker in attesa.
 */
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.info(`[Service Worker] Ancoraggio file nel Vault di Cache: ${CACHE_NAME}`);
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

/**
 * FASE 2: ATTIVAZIONE (Cache-Busting Globale)
 * Esegue la Garbage Collection delle vecchie versioni dell'app rimaste in memoria.
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.info(`[Service Worker] Disintegrazione cache obsoleta: ${cache}`);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Prende immediatamente il controllo della pagina visibile
    );
});

/**
 * FASE 3: STRATEGIA FETCH (Network-First con Fallback Offline)
 * Assicura che l'utente veda sempre l'ultima versione del codice sorgente se connesso,
 * ma garantisce il funzionamento a zero-latenza se disconnesso o in zona d'ombra (es. Cella Frigo).
 */
self.addEventListener('fetch', (event) => {
    // Ignora le richieste POST o verso API esterne dinamiche (es. Cloud JSONBin)
    if (event.request.method !== 'GET' || event.request.url.includes('api.jsonbin.io') || event.request.url.includes('keyvalue.immanuel.co')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // Se la rete risponde correttamente, aggiorna silenziosamente la cache
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
        }).catch(() => {
            // Se la rete fallisce (Offline mode attivata), estrae la risorsa blindata dalla cache
            return caches.match(event.request);
        })
    );
});
