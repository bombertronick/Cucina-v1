// File: js/core/lazzaro.js
import { State } from './state.js';
import { CloudVault } from './cloud.js';

/**
 * ============================================================================
 * PROTOCOLLO LAZZARO V15.8 (Persistenza, Cloud Integration e Fault Tolerance)
 * ============================================================================
 */
const store = localforage.createInstance({
    name: "ScutumERP_Absolute_V15_8",
    storeName: "matrice_logistica"
});

export async function initDatabase() {
    try {
        const savedStruct = await store.getItem('appStructure');
        const savedState = await store.getItem('appState');

        if (savedStruct) {
            State.appStructure = savedStruct;
            console.info("[Lazzaro] Struttura locale V15.8 caricata con successo.");
        } else {
            await recoverLegacyData();
        }

        if (savedState) {
            State.appState = savedState;
            console.info("[Lazzaro] Stato operativo locale ripristinato.");
        }

        if (CloudVault.isConfigured()) {
            console.info("[Lazzaro] Rilevato Cloud configurato. Avvio allineamento dati...");
            await syncPullCloud().catch(err => {
                console.warn("[Lazzaro - Boot Offline] Cloud non raggiungibile all'avvio. Utilizzo dati locali:", err.message);
            });
        }
    } catch (e) {
        console.error("[Lazzaro] ERRORE CRITICO INIZIALIZZAZIONE DATABASE:", e);
        State.appStructure = { sedi: {} };
        State.appState = {};
    }
}

export async function saveState() {
    try {
        await store.setItem('appStructure', State.appStructure);
        await store.setItem('appState', State.appState);

        if (CloudVault.isConfigured()) {
            syncPushCloud().catch(error => {
                console.warn("[Lazzaro - Cloud Sync Interrupted] Modalità offline attiva:", error.message);
            });
        }
    } catch (e) {
        console.error("[Lazzaro] Fallimento critico durante il salvataggio locale:", e);
    }
}

export async function syncPullCloud() {
    try {
        const cloudRecord = await CloudVault.pull();
        if (cloudRecord && cloudRecord.appStructure && cloudRecord.appState) {
            State.appStructure = cloudRecord.appStructure;
            State.appState = cloudRecord.appState;
            
            await store.setItem('appStructure', State.appStructure);
            await store.setItem('appState', State.appState);
            
            console.info("[Lazzaro] Allineamento Cloud completato.");
            if (window.renderApp) window.renderApp();
        } else {
            console.warn("[Lazzaro] Il record Cloud scaricato non è valido.");
        }
    } catch (error) {
        console.error("[Lazzaro] Errore PULL logico:", error.message);
        throw error;
    }
}

export async function syncPushCloud() {
    const payload = {
        appStructure: State.appStructure,
        appState: State.appState,
        lastSyncStamp: Date.now()
    };
    await CloudVault.push(payload);
    console.info("[Lazzaro] Snapshot inviato al Cloud Vault.");
}

async function recoverLegacyData() {
    console.warn("[Lazzaro] Ricerca database legacy in corso...");
    const legacyKeys = ['cucina_v13_struct', 'nexus_struct', 'scutum_v15_struct'];
    let legacyFound = false;

    for (let key of legacyKeys) {
        const oldData = localStorage.getItem(key);
        if (oldData) {
            try {
                const parsedData = JSON.parse(oldData);
                State.appStructure = parsedData;
                legacyFound = true;
                console.info(`[Lazzaro] Convertito database legacy da: ${key}`);
                await store.setItem('appStructure', State.appStructure);
                break;
            } catch (e) {
                console.error(`[Lazzaro] Dati corrotti nella chiave ${key}.`);
            }
        }
    }

    if (!legacyFound) {
        console.info("[Lazzaro] Generazione matrice vergine.");
        State.appStructure = { sedi: {} };
    }
}

/**
 * ============================================================================
 * LEGACY BRIDGE (Backup Fisico JSON - Import/Export)
 * ============================================================================
 */
export async function exportLocalBackup() {
    const payload = {
        appStructure: State.appStructure,
        appState: State.appState,
        timestamp: new Date().toISOString(),
        version: "15.8"
    };
    
    // Creazione del Blob per garantire il download sicuro di file pesanti su Mobile
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scutum_Backup_${new Date().toLocaleDateString('it-IT').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.info("[Legacy Bridge] Backup fisico generato e scaricato.");
}

export async function importLocalBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed.appStructure) throw new Error("File JSON incompatibile con Scutum ERP.");
                
                State.appStructure = parsed.appStructure;
                if (parsed.appState) State.appState = parsed.appState;
                
                await saveState(); 
                console.info("[Legacy Bridge] Matrice sovrascritta con successo dal backup fisico.");
                resolve(true);
            } catch (error) {
                console.error("[Legacy Bridge] Corruzione dati durante l'importazione:", error);
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error("Impossibile leggere il file dal dispositivo."));
        reader.readAsText(file);
    });
}
