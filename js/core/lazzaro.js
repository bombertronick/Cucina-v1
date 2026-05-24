// File: js/core/lazzaro.js

import { State } from './state.js';

/**
 * ============================================================================
 * BLOCCO STORAGE PERSISTENTE (Anti OS-Amnesia)
 * ============================================================================
 * Richiede al sistema operativo mobile (iOS/Android) di elevare IndexedDB a 
 * "Memoria Persistente", bloccando i demoni di pulizia automatica dello spazio.
 */
async function lockStorage() {
    if (navigator.storage && navigator.storage.persist) {
        try {
            const isPersisted = await navigator.storage.persist();
            console.info(`[Lazzaro] Ancoraggio Storage OS: ${isPersisted ? 'BLINDATO' : 'VOLATILE'}`);
        } catch (e) {
            console.warn("[Lazzaro] Richiesta persistenza negata o non supportata.", e);
        }
    }
}

/**
 * ============================================================================
 * GARBAGE COLLECTION DIFFERITA (Prevenzione Memory Bloat)
 * ============================================================================
 * Spazza via i dati fantasma (es. giacenze di prodotti ormai eliminati) senza 
 * bloccare il main thread. Agisce solo quando la CPU è inattiva.
 */
export function deferGarbageCollection() {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(executeGarbageCollection);
    } else {
        setTimeout(executeGarbageCollection, 5000); // Fallback browser obsoleti
    }
}

async function executeGarbageCollection() {
    let validKeys = new Set();
    
    // Scansione topologica della struttura per censire le chiavi valide
    Object.keys(State.appStructure.sedi).forEach(sid => {
        const sede = State.appStructure.sedi[sid];
        Object.keys(sede.folders || {}).forEach(fid => {
            const folder = sede.folders[fid];
            (folder.sections || []).forEach(sec => {
                (sec.items || []).forEach(item => {
                    validKeys.add(`${sid}_${fid}_${sec.id}_${item.id}`);
                });
            });
        });
    });

    let orphansFound = false;
    Object.keys(State.appState).forEach(stateKey => {
        if (!validKeys.has(stateKey)) {
            delete State.appState[stateKey];
            orphansFound = true;
        }
    });

    if (orphansFound) {
        await saveState();
        console.info("[Lazzaro] Garbage Collection completata. Ram purificata.");
    }
}

/**
 * ============================================================================
 * MOTORE DATABASE (Lettura / Scrittura IndexedDB)
 * ============================================================================
 */
export async function saveStructure() { 
    try { 
        await window.localforage.setItem('nexus_struct_v15_8_absolute', State.appStructure); 
        deferGarbageCollection(); // Innesco pulizia differita dopo modifiche strutturali
    } catch(e) { 
        console.error("[Lazzaro] Errore archiviazione Topologia:", e); 
        throw new Error("Salvataggio topologia fallito. Spazio esaurito?");
    } 
} 

export async function saveState() { 
    try { 
        await window.localforage.setItem('nexus_state_v15_8_absolute', State.appState); 
    } catch(e) { 
        console.error("[Lazzaro] Errore archiviazione Contatori:", e); 
        throw new Error("Salvataggio stato fallito.");
    } 
}

/**
 * ============================================================================
 * BOOTLOADER PRINCIPALE E MIGRAZIONE DATI (Legacy Recovery)
 * ============================================================================
 */
export async function initDatabase() {
    if (typeof window.localforage !== 'undefined') {
        window.localforage.config({ name: 'ScutumERP_Absolute_V15_8', storeName: 'Scutum_DB_Core' });
    } else {
        throw new Error("Libreria LocalForage (IndexedDB) inaccessibile.");
    }

    await lockStorage(); // Blindatura a livello OS

    try {
        // 1. Fallback a cascata per il recupero dati dalle versioni precedenti
        let legacyLsStruct = localStorage.getItem('nexus_struct') || localStorage.getItem('cucina_v13_struct');
        let legacyLsState = localStorage.getItem('nexus_state') || localStorage.getItem('cucina_v13_state');
        
        let dbStructureSnapshot = await window.localforage.getItem('nexus_struct_v15_8_absolute')
                               || await window.localforage.getItem('nexus_struct_v15_7_absolute')
                               || await window.localforage.getItem('nexus_struct_v15_6')
                               || await window.localforage.getItem('nexus_struct_v15_3');
                               
        if (!dbStructureSnapshot && legacyLsStruct) dbStructureSnapshot = JSON.parse(legacyLsStruct);
        
        let dbStateSnapshot = await window.localforage.getItem('nexus_state_v15_8_absolute')
                           || await window.localforage.getItem('nexus_state_v15_7_absolute')
                           || await window.localforage.getItem('nexus_state_v15_6')
                           || await window.localforage.getItem('nexus_state_v15_3');
                           
        if (!dbStateSnapshot && legacyLsState) dbStateSnapshot = JSON.parse(legacyLsState);

        State.appState = dbStateSnapshot || {}; 
        State.appStructure = dbStructureSnapshot || { sedi: {} };
        
        // 2. Creazione Sede "Comando Centrale" per database vergini
        if (Object.keys(State.appStructure.sedi).length === 0) { 
            State.appStructure = { 
                sedi: { 
                    ['sede_root']: { 
                        id: 'sede_root', name: "COMANDO CENTRALE", 
                        folders: { ['fol_root']: { id: 'fol_root', name: "TURNO STANDARD", sections: [] } }, 
                        roles: [], checklists: [], supplierCategories: [], 
                        categories: [{ id: 'cat_root', name: 'Operazioni', color: 'var(--accent)', type: 'action' }] 
                    } 
                } 
            }; 
        }
        
        // 3. Normalizzazione tassonomia (Retrocompatibilità V15.3 -> V15.8)
        Object.values(State.appStructure.sedi).forEach(sede => { 
            if (!Array.isArray(sede.categories) || sede.categories.length === 0) {
                sede.categories = [{ id: 'cat_root', name: 'Operazioni', color: 'var(--accent)', type: 'action' }]; 
            }
            sede.categories.forEach(cat => { 
                if (cat.type === 'standard') cat.type = 'action'; 
                if (cat.type === 'magazzino') cat.type = 'central_stock'; 
            }); 
            if (!Array.isArray(sede.roles)) sede.roles = []; 
            if (!Array.isArray(sede.checklists)) sede.checklists = []; 
            if (!Array.isArray(sede.supplierCategories)) sede.supplierCategories = []; 
            if (!sede.folders || typeof sede.folders !== 'object') sede.folders = {}; 
        });
        
        // 4. Bonifica dello Stato Volatile
        let requireStateSync = false; 
        Object.keys(State.appState).forEach(stateKey => {
            let record = State.appState[stateKey]; 
            if (record && typeof record === 'object' && !Array.isArray(record)) { 
                if (record.done === undefined) { record.done = (record.fare === true); requireStateSync = true; } 
                if (record.q === undefined) { record.q = 0; requireStateSync = true; } 
                if (record.n_op === undefined) { record.n_op = record.n_fare || ''; requireStateSync = true; } 
                
                // Distruzione vecchie chiavi V15.3 deprecate
                delete record.fare; delete record.comprare; delete record.n_fare; delete record.n_comprare; delete record.reqQty;
            } else { 
                delete State.appState[stateKey]; 
                requireStateSync = true; 
            } 
        });
        
        await saveStructure(); 
        if (requireStateSync) await saveState();
        
        // 5. Innesco della Macchina del Tempo (Snapshot del Giorno)
        checkNewDayAndBackup();
        
        return true;

    } catch(e) { 
        console.error("[Lazzaro] Formattazione Fallback Innescata causa corruzione:", e); 
        State.appStructure = { sedi: {} }; State.appState = {}; 
        await saveStructure(); await saveState(); 
        throw new Error("Database corrotto e riformattato. Ricaricare l'applicazione.");
    }
}

/**
 * ============================================================================
 * MACCHINA DEL TEMPO E SNAPSHOT MANAGER
 * ============================================================================
 */
function checkNewDayAndBackup() { 
    const todayStamp = new Date().toLocaleDateString('it-IT'); 
    const backupKey = 'nexus_bkp_' + todayStamp.replace(/\//g, '-'); 
    
    // Scrittura silente Snapshot a Freddo
    if (!localStorage.getItem(backupKey)) {
        localStorage.setItem(backupKey, JSON.stringify(State.appStructure)); 
    }
    
    // Purificazione di Fine Turno su cambio data reale
    if (localStorage.getItem('nexus_day') !== todayStamp) { 
        Object.keys(State.appState).forEach(key => {
            State.appState[key].done = false;
            State.appState[key].n_op = '';
            // Le quantità in magazzino (q) NON vengono azzerate, persistono
        });
        saveState(); // Operazione de-prioritizzata per non rallentare l'avvio
        localStorage.setItem('nexus_day', todayStamp); 
    } 
}

export function fetchBackups() {
    let backupsFound = []; 
    for (let i = 0; i < localStorage.length; i++) { 
        const currentKey = localStorage.key(i); 
        if (currentKey && currentKey.startsWith('nexus_bkp_')) {
            backupsFound.push(currentKey); 
        }
    }
    return backupsFound.sort().reverse();
}

export async function executeRestore(backupKey) {
    const rawData = localStorage.getItem(backupKey); 
    if (!rawData) throw new Error("Pacchetto Snapshot illeggibile o distrutto dall'OS."); 
    
    State.appStructure = JSON.parse(rawData); 
    await saveStructure(); 
    return true; // Ritorna esito positivo per permettere al renderer di riavviare l'app
}
