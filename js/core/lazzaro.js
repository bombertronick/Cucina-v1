// File: js/core/lazzaro.js
import { State } from './state.js';

const DB_NAME = 'ScutumERP_Vault';
const DB_VERSION = 1;
const STORE_NAME = 'scutum_state';
const STATE_KEY = 'v20_master_state';

let dbInstance = null;

export const lazzaro_init = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("[LAZZARO ERROR] Accesso a IndexedDB negato o non supportato:", event.target.errorCode);
            resolve(false); 
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
                console.log("[LAZZARO] Nuovo ObjectStore creato.");
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            console.log("[LAZZARO] Connessione al Vault Locale IndexedDB stabilita.");
            lazzaro_loadState().then(() => resolve(true));
        };
    });
};

const lazzaro_loadState = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { 
            resolve(false); 
            return; 
        }
        
        try {
            const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(STATE_KEY);

            request.onsuccess = (event) => {
                const savedState = event.target.result;
                if (savedState) {
                    State.appStructure = savedState.appStructure || { sedi: {} };
                    State.appState = savedState.appState || {};
                    State.currentTheme = savedState.currentTheme || 'dark';
                    State.peakOverride = savedState.peakOverride || false;
                    console.log("[LAZZARO] Matrice di stato ripristinata in memoria RAM.");
                } else {
                    console.log("[LAZZARO] Nessun salvataggio precedente rilevato. Inizializzazione matrice vergine.");
                }
                resolve(true);
            };
            
            request.onerror = () => {
                console.error("[LAZZARO ERROR] Lettura dello stato fallita.");
                resolve(false);
            };
        } catch (err) {
            console.error("[LAZZARO CRITICAL] Eccezione durante il caricamento:", err);
            resolve(false);
        }
    });
};

export const lazzaro_saveState = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { 
            resolve(false); 
            return; 
        }
        
        const stateToSave = {
            appStructure: State.appStructure,
            appState: State.appState,
            currentTheme: State.currentTheme,
            peakOverride: State.peakOverride,
            timestamp: Date.now()
        };

        try {
            const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(stateToSave, STATE_KEY);

            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        } catch (err) {
            console.error("[LAZZARO CRITICAL] Impossibile scrivere su disco:", err);
            resolve(false);
        }
    });
};

export const lazzaro_stampMutation = (stateKey, property, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { n_op: '', done: false, note: '' };
    }
    State.appState[stateKey][property] = value;
    
    // Innesco asincrono del salvataggio senza bloccare il Main Thread UI
    lazzaro_saveState();
};

export const lazzaro_wipeVault = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { 
            resolve(false); 
            return; 
        }
        
        try {
            const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => {
                console.warn("[LAZZARO] VAULT AZZERATO COMPLETAMENTE.");
                resolve(true);
            };
            request.onerror = () => resolve(false);
        } catch (err) {
            console.error("[LAZZARO CRITICAL] Fallimento durante il wipe:", err);
            resolve(false);
        }
    });
};
