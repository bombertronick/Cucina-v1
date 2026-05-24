// File: js/core/lazzaro.js
import { State } from './state.js';
import { CloudVault } from './cloud.js';

/**
 * ============================================================================
 * PROTOCOLLO LAZZARO V15.8 (Persistenza, Cloud Integration e Fault Tolerance)
 * ============================================================================
 * Gestisce l'archiviazione locale profonda tramite IndexedDB e l'allineamento
 * asincrono con il Cloud Vault (JSONBin) senza bloccare il thread principale.
 */

// Inizializzazione dell'istanza LocalForage per IndexedDB
const store = localforage.createInstance({
    name: "ScutumERP_Absolute_V15_8",
    storeName: "matrice_logistica"
});

/**
 * Inizializza il database locale, gestisce il recupero delle versioni precedenti
 * e innesca la sincronizzazione automatica col cloud se configurato.
 */
export async function initDatabase() {
    try {
        const savedStruct = await store.getItem('appStructure');
        const savedState = await store.getItem('appState');

        // Caricamento o recupero della struttura architetturale
        if (savedStruct) {
            State.appStructure = savedStruct;
            console.info("[Lazzaro] Struttura strutturale locale V15.8 caricata con successo.");
        } else {
            // Bridge di retrocompatibilità con V13 e V15.3 monolitiche
            await recoverLegacyData();
        }

        // Ripristino dello stato operativo corrente (Quantità, Note, Spunte)
        if (savedState) {
            State.appState = savedState;
            console.info("[Lazzaro] Stato operativo locale ripristinato.");
        }

        // Se le credenziali Cloud sono già presenti, esegue il PULL automatico all'avvio
        if (CloudVault.isConfigured()) {
            console.info("[Lazzaro] Rilevato Cloud configurato. Avvio allineamento dati...");
            await syncPullCloud().catch(err => {
                console.warn("[Lazzaro - Boot Offline] Cloud non raggiungibile all'avvio. Utilizzo dati locali:", err.message);
            });
        }

    } catch (e) {
        console.error("[Lazzaro] ERRORE CRITICO DURANTE L'INIZIALIZZAZIONE DEL DATABASE:", e);
        // Fallback strutturale di emergenza per impedire il blocco completo dell'App Shell
        State.appStructure = { sedi: {} };
        State.appState = {};
    }
}

/**
 * Salva lo stato corrente in IndexedDB in tempo reale.
 * Avvia la sincronizzazione specchio verso il Cloud Vault in background.
 */
export async function saveState() {
    try {
        // FASE 1: Scrittura atomica immediata su memoria locale (Nessun lag per l'operatore)
        await store.setItem('appStructure', State.appStructure);
        await store.setItem('appState', State.appState);

        // FASE 2: Sincronizzazione Cloud in background (Asincrona)
        if (CloudVault.isConfigured()) {
            syncPushCloud().catch(error => {
                // Intercettazione dell'errore di rete: i dati locali sono comunque al sicuro
                console.warn("[Lazzaro - Cloud Sync Interrupted] Impossibile inviare lo snapshot. Modalità offline attiva:", error.message);
            });
        }
    } catch (e) {
        console.error("[Lazzaro] Fallimento critico durante il salvataggio locale:", e);
    }
}

/**
 * Scarica forzatamente l'ultimo record dal Cloud Vault, sovrascrive la RAM dell'app
 * e aggiorna il database locale consolidando i dati.
 */
export async function syncPullCloud() {
    try {
        const cloudRecord = await CloudVault.pull();
        if (cloudRecord && cloudRecord.appStructure && cloudRecord.appState) {
            State.appStructure = cloudRecord.appStructure;
            State.appState = cloudRecord.appState;
            
            // Consolidamento immediato su IndexedDB per consistenza dati offline
            await store.setItem('appStructure', State.appStructure);
            await store.setItem('appState', State.appState);
            
            console.info("[Lazzaro] Allineamento Cloud completato. RAM e IndexedDB sincronizzati.");
            
            // Forza il refresh dell'interfaccia se il motore grafico è già agganciato
            if (window.renderApp) window.renderApp();
        } else {
            console.warn("[Lazzaro] Il record Cloud scaricato non contiene una struttura Scutum valida.");
        }
    } catch (error) {
        console.error("[Lazzaro] Errore durante l'esecuzione del PULL logico:", error.message);
        throw error; // Rilancia per la gestione del fallback
    }
}

/**
 * Spinge l'intero stato logico e strutturale corrente nel Cloud Vault.
 */
export async function syncPushCloud() {
    const payload = {
        appStructure: State.appStructure,
        appState: State.appState,
        lastSyncStamp: Date.now()
    };
    await CloudVault.push(payload);
    console.info("[Lazzaro] Snapshot specchio inviato al Cloud Vault correttamente.");
}

/**
 * Modulo interno per il recupero dei dati estratti dai vecchi database LocalStorage
 */
async function recoverLegacyData() {
    console.warn("[Lazzaro] Struttura V15.8 assente. Scansione chiavi database precedenti...");
    const legacyKeys = ['cucina_v13_struct', 'nexus_struct', 'scutum_v15_struct'];
    let legacyFound = false;

    for (let key of legacyKeys) {
        const oldData = localStorage.getItem(key);
        if (oldData) {
            try {
                const parsedData = JSON.parse(oldData);
                State.appStructure = parsedData;
                legacyFound = true;
                console.info(`[Lazzaro] Rilevato e convertito database legacy dalla chiave: ${key}`);
                
                // Conversione e consolidamento immediato nel nuovo database IndexedDB
                await store.setItem('appStructure', State.appStructure);
                break;
            } catch (e) {
                console.error(`[Lazzaro] Rilevata corruzione dati nella chiave legacy ${key}. Conversione annullata.`);
            }
        }
    }

    if (!legacyFound) {
        console.info("[Lazzaro] Nessun archivio storico rilevato sul dispositivo. Generazione matrice vergine.");
        State.appStructure = { sedi: {} };
    }
}
