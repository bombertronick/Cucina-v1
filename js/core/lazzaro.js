// File: js/core/lazzaro.js
import { State } from './state.js';

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
        
        await lazzaro_garbageCollector();
        return true;
    } catch (e) {
        console.error("[LAZZARO CRITICAL] Errore ripristino cache locale", e);
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
        console.error("[LAZZARO CRITICAL] Impossibile scrivere su DB locale", e);
    }
};

export const lazzaro_stampMutation = (stateKey, field, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '0', note: '', lastModified: 0 };
    }
    State.appState[stateKey][field] = value;
    State.appState[stateKey].lastModified = Date.now(); 

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
    
    const chunk = State.syncQueue.slice(0, 10);
    
    try {
        const gistId = localStorage.getItem('nexus_bin_id');
        const token = localStorage.getItem('nexus_api_key');
        if (!gistId || !token) return;

        // Estrazione dati dall'alveare GitHub Gist
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const cloudData = await response.json();
            // Controllo file nella struttura Gist
            if(!cloudData.files['scutum_matrix.json']) return;
            const remoteMatrix = JSON.parse(cloudData.files['scutum_matrix.json'].content);
            const remoteState = remoteMatrix.appState || {};
            
            chunk.forEach(item => {
                const remoteItem = remoteState[item.stateKey];
                // LWW: Sovrascrivi solo se il timestamp locale è più recente del cloud
                if (!remoteItem || item.timestamp > (remoteItem.lastModified || 0)) {
                    if (!remoteState[item.stateKey]) remoteState[item.stateKey] = {};
                    remoteState[item.stateKey][item.field] = item.value;
                    remoteState[item.stateKey].lastModified = item.timestamp;
                }
            });

            // Scrittura Chunk validato su GitHub
            const payloadContent = JSON.stringify({ appStructure: State.appStructure, appState: remoteState });
            await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files: { "scutum_matrix.json": { content: payloadContent } } })
            });

            State.syncQueue = State.syncQueue.slice(chunk.length);
            await lazzaro_saveState();
            
            if (State.syncQueue.length > 0) {
                setTimeout(lazzaro_processSyncQueue, 100);
            }
        }
    } catch (err) {
        console.error("[LAZZARO OFFLINE] Errore di rete nella sincronizzazione background con GitHub.", err);
    }
};

export const lazzaro_garbageCollector = async () => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; 
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

export const lazzaro_purgeGhosts = async (prefix) => {
    let purged = 0;
    Object.keys(State.appState).forEach(key => {
        if (key.startsWith(prefix)) {
            delete State.appState[key];
            purged++;
        }
    });
    console.log(`[SYSTEM PURGE] Rimosserò ${purged} record orfani per il prefisso: ${prefix}`);
    if (purged > 0) {
        await lazzaro_saveState();
    }
};

window.lazzaro_purgeGhosts = lazzaro_purgeGhosts;

/**
 * GITHUB VAULT E MACCHINA DEL TEMPO LOCALE
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
    const gistId = document.getElementById('input-cloud-bin').value.trim();
    const token = document.getElementById('input-cloud-key').value.trim();
    if (!gistId || !token) return window.showToast("Parametri GitHub assenti.", "error");

    localStorage.setItem('nexus_bin_id', gistId);
    localStorage.setItem('nexus_api_key', token);

    try {
        if (window.showToast) window.showToast("PUSH Globale verso GitHub in corso...", "info");
        
        const payloadContent = JSON.stringify({ appStructure: State.appStructure, appState: State.appState });
        
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ files: { "scutum_matrix.json": { content: payloadContent } } })
        });
        
        if (res.ok) window.showToast("Matrice Globale sincronizzata su GitHub Gist.", "success");
        else window.showToast("Rifiuto credenziali. Token non valido o Gist errato.", "error");
    } catch (err) {
        window.showToast("Nessun segnale verso i server GitHub.", "error");
    }
};

window.syncPullCloud = async () => {
    const gistId = document.getElementById('input-cloud-bin').value.trim();
    const token = document.getElementById('input-cloud-key').value.trim();
    if (!gistId || !token) return window.showToast("Parametri GitHub assenti.", "error");

    localStorage.setItem('nexus_bin_id', gistId);
    localStorage.setItem('nexus_api_key', token);

    try {
        if (window.showToast) window.showToast("Estrazione dati da GitHub Vault...", "info");
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (res.ok) {
            const data = await res.json();
            if (!data.files || !data.files['scutum_matrix.json']) throw new Error("File matrix mancante nel Gist.");
            
            const remoteMatrix = JSON.parse(data.files['scutum_matrix.json'].content);
            
            if (remoteMatrix.appStructure && remoteMatrix.appState) {
                State.appStructure = remoteMatrix.appStructure;
                State.appState = remoteMatrix.appState;
                await lazzaro_saveState();
                window.showToast("Allineamento completato. Riavvio...", "success");
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            window.showToast("Impossibile contattare il Gist remoto.", "error");
        }
    } catch (err) {
        console.error(err);
        window.showToast("Errore durante il parsing del Vault GitHub.", "error");
    }
};

window.addEventListener('online', () => {
    if (window.showToast) window.showToast("Segnale ripristinato. Svuotamento coda sync verso GitHub...", "success");
    lazzaro_processSyncQueue();
});
