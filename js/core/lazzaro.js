// File: js/core/lazzaro.js
import { State } from './state.js';

// Configurazione storage crudo IndexedDB tramite LocalForage
localforage.config({ name: 'Scutum_ERP_V20', storeName: 'encrypted_cache' });

export const lazzaro_loadState = async () => {
    try {
        const savedStructure = await localforage.getItem('appStructure');
        const savedState = await localforage.getItem('appState');
        const savedConfig = await localforage.getItem('appConfig');
        const savedQueue = await localforage.getItem('syncQueue');

        if (savedStructure) State.appStructure = savedStructure;
        if (savedState) State.appState = savedState;
        if (savedQueue) State.syncQueue = savedQueue;
        if (savedConfig) {
            State.currentTheme = savedConfig.currentTheme || 'dark';
            State.peakOverride = savedConfig.peakOverride || false;
        }
        
        // Esecuzione silente del Garbage Collector all'avvio del motore
        await lazzaro_garbageCollector();
        return true;
    } catch (e) {
        console.error("[LAZZARO CRITICAL] Errore nel ripristino della cache locale", e);
        return false;
    }
};

export const lazzaro_saveState = async () => {
    try {
        await localforage.setItem('appStructure', State.appStructure);
        await localforage.setItem('appState', State.appState);
        await localforage.setItem('syncQueue', State.syncQueue);
        await localforage.setItem('appConfig', {
            currentTheme: State.currentTheme,
            peakOverride: State.peakOverride
        });
    } catch (e) {
        console.error("[LAZZARO CRITICAL] Impossibile scrivere su database locale", e);
    }
};

export const lazzaro_stampMutation = (stateKey, field, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '0', note: '', lastModified: 0 };
    }
    State.appState[stateKey][field] = value;
    State.appState[stateKey].lastModified = Date.now(); // Soluzione Last Write Wins

    // Accodamento asincrono per resilienza offline
    const queuePayload = { 
        stateKey, 
        field, 
        value, 
        timestamp: State.appState[stateKey].lastModified 
    };
    
    const existingIdx = State.syncQueue.findIndex(q => q.stateKey === stateKey && q.field === field);
    if (existingIdx !== -1) {
        State.syncQueue[existingIdx] = queuePayload;
    } else {
        State.syncQueue.push(queuePayload);
    }
    
    lazzaro_saveState();
    
    if (navigator.onLine) {
        lazzaro_processSyncQueue();
    }
};

export const lazzaro_processSyncQueue = async () => {
    if (State.syncQueue.length === 0 || !navigator.onLine) return;
    
    // Micro-Chunking: Isolamento a blocchi di 10 record per preservare i 60fps dell'interfaccia
    const chunk = State.syncQueue.slice(0, 10);
    
    try {
        const binId = localStorage.getItem('nexus_bin_id');
        const apiKey = localStorage.getItem('nexus_api_key');
        if (!binId || !apiKey) return;

        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
            method: 'GET',
            headers: { 'X-Master-Key': apiKey }
        });
        
        if (response.ok) {
            const cloudData = await response.json();
            const remoteState = cloudData.record.appState || {};
            
            chunk.forEach(item => {
                const remoteItem = remoteState[item.stateKey];
                // Risoluzione conflitti concorrenziali tramite confronto temporale millimetrico
                if (!remoteItem || item.timestamp > (remoteItem.lastModified || 0)) {
                    if (!remoteState[item.stateKey]) remoteState[item.stateKey] = {};
                    remoteState[item.stateKey][item.field] = item.value;
                    remoteState[item.stateKey].lastModified = item.timestamp;
                }
            });

            await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
                body: JSON.stringify({ appStructure: State.appStructure, appState: remoteState })
            });

            // Svuotamento controllato della porzione elaborata
            State.syncQueue = State.syncQueue.slice(chunk.length);
            await lazzaro_saveState();
            
            if (State.syncQueue.length > 0) {
                setTimeout(lazzaro_processSyncQueue, 100);
            }
        }
    } catch (err) {
        console.error("[LAZZARO OFFLINE ALARM] Errore di scaricamento della coda in background", err);
    }
};

export const lazzaro_garbageCollector = async () => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // Conservazione limite per prevenire la saturazione delle cache iOS
    let keysDeleted = 0;

    Object.keys(State.appState).forEach(key => {
        const record = State.appState[key];
        if (record && record.lastModified && (now - record.lastModified > SEVEN_DAYS_MS)) {
            delete State.appState[key];
            keysDeleted++;
        }
    });

    if (keysDeleted > 0) {
        await lazzaro_saveState();
    }
};

/**
 * ============================================================================
 * MACCHINA DEL TEMPO E CONFIGURAZIONI QUANTICHE CLOUD VAULT
 * ============================================================================
 */
window.exportLocalBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        appStructure: State.appStructure,
        appState: State.appState
    }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SCUTUM_SNAP_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (window.showToast) window.showToast("Snapshot temporale scaricato.", "success");
};

window.importLocalBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.appStructure && parsed.appState) {
                State.appStructure = parsed.appStructure;
                State.appState = parsed.appState;
                await lazzaro_saveState();
                if (window.showToast) window.showToast("Linea temporale ripristinata. Riavvio...", "success");
                setTimeout(() => window.location.reload(), 1200);
            }
        } catch (err) {
            if (window.showToast) window.showToast("File di backup corrotto.", "error");
        }
    };
    reader.readAsText(file);
};

window.syncPushCloud = async () => {
    const binId = document.getElementById('input-cloud-bin').value.trim();
    const apiKey = document.getElementById('input-cloud-key').value.trim();
    if (!binId || !apiKey) return window.showToast("Parametri Cloud assenti.", "error");

    localStorage.setItem('nexus_bin_id', binId);
    localStorage.setItem('nexus_api_key', apiKey);

    try {
        if (window.showToast) window.showToast("Sincronizzazione forzata in corso...", "info");
        const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
            body: JSON.stringify({ appStructure: State.appStructure, appState: State.appState })
        });
        if (res.ok) window.showToast("PUSH Globale completato con successo.", "success");
        else window.showToast("Rifiuto credenziali Cloud Vault.", "error");
    } catch (err) {
        window.showToast("Blocco CORS o assenza segnale Cloud.", "error");
    }
};

window.syncPullCloud = async () => {
    const binId = document.getElementById('input-cloud-bin').value.trim();
    const apiKey = document.getElementById('input-cloud-key').value.trim();
    if (!binId || !apiKey) return window.showToast("Parametri Cloud assenti.", "error");

    localStorage.setItem('nexus_bin_id', binId);
    localStorage.setItem('nexus_api_key', apiKey);

    try {
        if (window.showToast) window.showToast("Estrazione dati alveare...", "info");
        const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': apiKey }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.record.appStructure && data.record.appState) {
                State.appStructure = data.record.appStructure;
                State.appState = data.record.appState;
                await lazzaro_saveState();
                window.showToast("Allineamento completato. Riavvio in corso...", "success");
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            window.showToast("Impossibile decodificare il bin remoto.", "error");
        }
    } catch (err) {
        window.showToast("Errore di rete nell'estrazione Pull.", "error");
    }
};

window.addEventListener('online', () => {
    if (window.showToast) window.showToast("Segnale ripristinato. Svuotamento coda sync...", "success");
    lazzaro_processSyncQueue();
});
