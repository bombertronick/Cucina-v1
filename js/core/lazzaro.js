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
            console.error("[LAZZARO] Accesso a IndexedDB negato:", event.target.errorCode);
            resolve(false); 
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            lazzaro_loadState().then(() => resolve(true));
        };
    });
};

const lazzaro_loadState = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(false); return; }
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
                }
                resolve(true);
            };
            request.onerror = () => resolve(false);
        } catch (err) { resolve(false); }
    });
};

export const lazzaro_saveState = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(false); return; }
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
        } catch (err) { resolve(false); }
    });
};

export const lazzaro_stampMutation = (stateKey, property, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { n_op: '', done: false, note: '' };
    }
    State.appState[stateKey][property] = value;
    lazzaro_saveState();
};

export const lazzaro_wipeVault = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(false); return; }
        try {
            const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        } catch (err) { resolve(false); }
    });
};
