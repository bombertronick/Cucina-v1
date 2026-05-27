// File: js/core/lazzaro.js
import { State } from './state.js';

/**
 * LAZZARO PROTOCOL - MOTORE DI PERSISTENZA E SINCRONIZZAZIONE DATI (INDEXEDDB)
 */

export const lazzaro_init = async () => {
    try {
        // Lettura asincrona profonda da LocalForage
        const savedStructure = await localforage.getItem('scutum_structure');
        const savedState = await localforage.getItem('scutum_state');
        
        if (savedStructure) {
            State.appStructure = savedStructure;
        } else {
            // Inizializzazione struttura vergine se il DB è vuoto
            State.appStructure = { sedi: {} };
        }
        
        if (savedState) {
            State.appState = savedState;
        } else {
            State.appState = {};
        }
        
        console.log("[LAZZARO] Boot completato. Matrice dati caricata in RAM con successo.");
        return true;
    } catch (e) {
        console.error("[LAZZARO CRITICAL ERROR] Impossibile leggere IndexedDB. Dati compromessi o assenti.", e);
        return false;
    }
};

export const lazzaro_saveState = async () => {
    try {
        // Scrittura parallela dello stato strutturale e dello stato operativo
        await localforage.setItem('scutum_structure', State.appStructure);
        await localforage.setItem('scutum_state', State.appState);
    } catch (e) {
        console.error("[LAZZARO CRITICAL ERROR] Impossibile scrivere in IndexedDB. Persistenza fallita.", e);
    }
};

export const lazzaro_stampMutation = (stateKey, field, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '0', note: '' };
    }
    State.appState[stateKey][field] = value;
    
    // Innesco asincrono del salvataggio senza bloccare il thread principale (UI)
    lazzaro_saveState(); 
};

export const lazzaro_purgeGhosts = (prefix) => {
    let hasChanges = false;
    Object.keys(State.appState).forEach(key => {
        // Disintegrazione matematica delle chiavi orfane basata su prefisso gerarchico
        if (key.startsWith(prefix)) {
            delete State.appState[key];
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        lazzaro_saveState();
    }
};

// Esportazione nello spazio globale per consentire l'interoperabilità asincrona con l'interfaccia
window.lazzaro_init = lazzaro_init;
window.lazzaro_saveState = lazzaro_saveState;
window.lazzaro_stampMutation = lazzaro_stampMutation;
window.lazzaro_purgeGhosts = lazzaro_purgeGhosts;
