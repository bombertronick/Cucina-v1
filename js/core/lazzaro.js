// File: js/core/lazzaro.js
import { State } from './state.js';

/**
 * ============================================================================
 * PROTOCOLLO LAZZARO (Persistenza e Retrocompatibilità)
 * ============================================================================
 */

// Inizializzazione di LocalForage (Motore IndexedDB)
const store = localforage.createInstance({
    name: "ScutumERP_Absolute_V15_8",
    storeName: "matrice_logistica"
});

export async function initDatabase() {
    try {
        const savedStruct = await store.getItem('appStructure');
        const savedState = await store.getItem('appState');

        // Se esistono dati della V15.8, li carica.
        if (savedStruct) {
            State.appStructure = savedStruct;
            console.info("[Lazzaro] Struttura V15.8 caricata dalla memoria profonda.");
        } else {
            // Se NON esistono, cerca i dati delle vecchie versioni V13/V15.3 per non perdere nulla
            await recoverLegacyData();
        }

        if (savedState) {
            State.appState = savedState;
            console.info("[Lazzaro] Stato operativo (Quantità/Spunte) ripristinato.");
        }

    } catch (e) {
        console.error("[Lazzaro] ERRORE FATALE INIZIALIZZAZIONE DB:", e);
        // Fallback: Struttura vergine per evitare il crash totale
        State.appStructure = { sedi: {} };
        State.appState = {};
    }
}

export async function saveState() {
    try {
        await store.setItem('appStructure', State.appStructure);
        await store.setItem('appState', State.appState);
    } catch (e) {
        console.error("[Lazzaro] Fallimento salvataggio matrice:", e);
    }
}

// ============================================================================
// MODULO RECUPERO DATI VECCHIE VERSIONI
// ============================================================================
async function recoverLegacyData() {
    console.warn("[Lazzaro] Ricerca vecchie versioni database in corso...");
    
    const legacyKeys = ['cucina_v13_struct', 'nexus_struct', 'scutum_v15_struct'];
    let legacyFound = false;

    for (let key of legacyKeys) {
        const oldData = localStorage.getItem(key);
        if (oldData) {
            try {
                const parsedData = JSON.parse(oldData);
                // Migrazione dei vecchi dati nel nuovo standard
                State.appStructure = parsedData;
                legacyFound = true;
                console.info(`[Lazzaro] Dati recuperati con successo dalla chiave legacy: ${key}`);
                
                // Salva immediatamente i vecchi dati nel nuovo DB
                await saveState();
                break; // Ferma il ciclo al primo backup valido trovato
            } catch (e) {
                console.error(`[Lazzaro] Impossibile decifrare dati legacy da ${key}`);
            }
        }
    }

    if (!legacyFound) {
        console.info("[Lazzaro] Nessun dato precedente trovato. Inizializzazione Matrice Vuota.");
        State.appStructure = { sedi: {} };
    }
}
