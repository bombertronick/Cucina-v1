// File: js/ui/utilities.js
import { State } from '../core/state.js';
import { lazzaro_saveState } from '../core/lazzaro.js';

/**
 * ============================================================================
 * 1. MOTORE NOTIFICHE (TOAST MATERIAL YOU) E FEEDBACK TATTILI
 * ============================================================================
 */

// Auto-iniezione del container per le notifiche se non esiste nel DOM
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '24px';
        toastContainer.style.left = '50%';
        toastContainer.style.transform = 'translateX(-50%)';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '8px';
        toastContainer.style.zIndex = '10000';
        toastContainer.style.pointerEvents = 'none';
        toastContainer.style.width = '90%';
        toastContainer.style.maxWidth = '400px';
        document.body.appendChild(toastContainer);
    }
});

window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    // Mappatura colori stile Pixel Material 3
    let bgColor = 'var(--surface-variant)';
    let textColor = 'var(--text-main)';
    let icon = '<i class="fa-solid fa-circle-info"></i>';

    if (type === 'success') {
        bgColor = 'rgba(147, 240, 170, 0.2)'; // var(--success) con opacità
        textColor = 'var(--success)';
        icon = '<i class="fa-solid fa-circle-check"></i>';
    } else if (type === 'error') {
        bgColor = 'rgba(255, 180, 171, 0.2)'; // var(--danger) con opacità
        textColor = 'var(--danger)';
        icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else if (type === 'warning') {
        bgColor = 'rgba(241, 196, 15, 0.2)'; 
        textColor = '#f1c40f';
        icon = '<i class="fa-solid fa-bolt"></i>';
    }

    toast.style.background = bgColor;
    toast.style.color = textColor;
    toast.style.padding = '14px 20px';
    toast.style.borderRadius = 'var(--radius-pill)';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '700';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.style.backdropFilter = 'blur(10px)';
    
    toast.innerHTML = `${icon} <span style="flex:1;">${message}</span>`;
    
    container.appendChild(toast);

    // Animazione di entrata
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Autodistruzione dopo 3.5 secondi
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3500);
};

window.haptic = (pattern) => {
    if (navigator.vibrate) {
        // Ignora l'aptica se stiamo simulando da PC, agisce solo su mobile
        navigator.vibrate(pattern);
    }
};

/**
 * ============================================================================
 * 2. COLD STORAGE (BACKUP E RIPRISTINO LOCALE DEL DATABASE)
 * ============================================================================
 */
window.exportDatabase = () => {
    if (State.activeProfile !== 'admin') {
        window.showToast("Solo il ROOT può esportare il database.", "error");
        return;
    }

    const payload = {
        appStructure: State.appStructure,
        appState: State.appState,
        ledgerHistory: State.ledgerHistory || [],
        exportDate: new Date().toISOString(),
        version: "V20"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    
    const dateStamp = new Date().toISOString().split('T')[0];
    downloadAnchorNode.setAttribute("download", `Scutum_Backup_${dateStamp}.json`);
    document.body.appendChild(downloadAnchorNode); // Richiesto per Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    window.showToast("Backup generato con successo. Salva il file al sicuro.", "success");
};

window.triggerImportDatabase = () => {
    if (State.activeProfile !== 'admin') {
        window.showToast("Solo il ROOT può sovrascrivere il database.", "error");
        return;
    }
    
    if (!confirm("ATTENZIONE CRITICA: Il ripristino sovrascriverà TUTTI i dati attuali con quelli del file di backup. L'operazione è irreversibile. Vuoi procedere?")) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!importedData.appStructure) throw new Error("File di backup non valido o corrotto.");

                State.appStructure = importedData.appStructure;
                State.appState = importedData.appState || {};
                State.ledgerHistory = importedData.ledgerHistory || [];
                
                // Resetta le variabili di navigazione per evitare schermate vuote
                State.activeSede = null;
                State.activeFolder = null;
                
                await lazzaro_saveState();
                
                alert("Ripristino completato con successo. Il sistema verrà riavviato.");
                window.location.reload(true);
            } catch (err) {
                console.error("[IMPORT ERROR]", err);
                window.showToast("Errore durante la lettura del file: Formato non compatibile.", "error");
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
};
/**
 * ============================================================================
 * 3. MODALI DI SISTEMA (IMPOSTAZIONI ROOT E LIBRO MASTRO)
 * ============================================================================
 */
window.openSystemSettings = () => {
    if (State.activeProfile !== 'admin') {
        window.showToast("Accesso negato. Privilegi ROOT richiesti.", "error");
        return;
    }

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="color:var(--accent); margin:0; font-weight:900;"><i class="fa-solid fa-gear"></i> IMPOSTAZIONI</h3>
                <button onclick="document.getElementById('modal-layer').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                <button onclick="window.exportDatabase()" class="btn-action" style="background:rgba(168,199,250,0.1); color:var(--accent); border:1px solid var(--accent); justify-content:flex-start;"><i class="fa-solid fa-download"></i> BACKUP VAULT (JSON)</button>
                <button onclick="window.triggerImportDatabase()" class="btn-action" style="background:rgba(241,196,15,0.1); color:#f1c40f; border:1px solid #f1c40f; justify-content:flex-start;"><i class="fa-solid fa-upload"></i> RIPRISTINA DA BACKUP</button>
                <button onclick="window.wipeLocalDatabase()" class="btn-action" style="background:rgba(255,180,171,0.1); color:var(--danger); border:1px dashed var(--danger); justify-content:flex-start; margin-top:12px;"><i class="fa-solid fa-skull"></i> FORMATTA SISTEMA LOCALE</button>
            </div>
        </div>
    `;
    
    const layer = document.getElementById('modal-layer');
    if (layer) {
        layer.innerHTML = html;
        layer.style.display = 'flex';
    }
};

window.openLedgerModal = () => {
    if (State.activeProfile !== 'admin') {
        window.showToast("Accesso negato. Privilegi ROOT richiesti.", "error");
        return;
    }

    const logs = State.ledgerHistory || [];
    let logsHtml = '';

    if (logs.length === 0) {
        logsHtml = '<div style="color:var(--text-muted); text-align:center; padding:20px;">Nessun record trovato nel Libro Mastro.</div>';
    } else {
        logsHtml = logs.map(log => {
            const date = new Date(log.timestamp).toLocaleString('it-IT');
            return `
            <div style="background:var(--surface-variant); padding:12px; border-radius:var(--radius-sm); margin-bottom:8px; border-left:4px solid var(--accent);">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:var(--accent); font-weight:800; font-size:0.8rem;">${log.profileId}</span>
                    <span style="color:var(--text-muted); font-size:0.7rem;">${date}</span>
                </div>
                <div style="font-size:0.9rem; color:var(--text-main);">${log.action}</div>
            </div>`;
        }).join('');
    }

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:500px; max-height:80vh; display:flex; flex-direction:column; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="color:var(--accent); margin:0; font-weight:900;"><i class="fa-solid fa-book-journal-whills"></i> LIBRO MASTRO</h3>
                <button onclick="document.getElementById('modal-layer').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <div style="overflow-y:auto; flex:1; padding-right:8px;">
                ${logsHtml}
            </div>
            <button onclick="document.getElementById('modal-layer').style.display='none'" class="btn-action solid" style="margin-top:16px; width:100%;">CHIUDI</button>
        </div>
    `;
    
    const layer = document.getElementById('modal-layer');
    if (layer) {
        layer.innerHTML = html;
        layer.style.display = 'flex';
    }
};
