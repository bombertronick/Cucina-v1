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
        request.onerror = (e) => { console.error("[LAZZARO] Negato", e); resolve(false); };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            lazzaro_loadState().then(() => resolve(true));
        };
    });
};

const lazzaro_loadState = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(false); return; }
        try {
            const tx = dbInstance.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(STATE_KEY);
            req.onsuccess = (e) => {
                const saved = e.target.result;
                if (saved) {
                    State.appStructure = saved.appStructure || { sedi: {} };
                    State.appState = saved.appState || {};
                    State.currentTheme = saved.currentTheme || 'dark';
                    State.peakOverride = saved.peakOverride || false;
                }
                resolve(true);
            };
            req.onerror = () => resolve(false);
        } catch (err) { resolve(false); }
    });
};

export const lazzaro_saveState = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(false); return; }
        const stateToSave = {
            appStructure: State.appStructure, appState: State.appState,
            currentTheme: State.currentTheme, peakOverride: State.peakOverride, timestamp: Date.now()
        };
        try {
            const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(stateToSave, STATE_KEY);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        } catch (err) { resolve(false); }
    });
};

export const lazzaro_stampMutation = (key, prop, val) => {
    if (!State.appState[key]) State.appState[key] = { n_op: '', done: false, note: '' };
    State.appState[key][prop] = val;
    lazzaro_saveState();
};

export const lazzaro_wipeVault = () => {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(false); return; }
        try {
            const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        } catch (err) { resolve(false); }
    });
};
