// File: js/ui/events.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js';
import { renderApp } from './renderer.js';

/**
 * ============================================================================
 * INTERFACCIA UTENTE: ROUTING INTERNO (SPA)
 * ============================================================================
 */
export function switchSpaView(viewId) {
    document.querySelectorAll('.spa-view').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });
    
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        // Ripristina il corretto display flex per l'app wrapper principale
        target.style.display = viewId === 'app-wrapper' ? 'flex' : 'block';
    }
}

/**
 * ============================================================================
 * NOTIFICHE PUSH FLOTTANTI (Toast)
 * ============================================================================
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // Animazione di uscita e distruzione autonoma
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * ============================================================================
 * RISPOSTA COGNITIVA (Feedback Aptico / Vibrazione)
 * ============================================================================
 */
export function haptic(ms = 15) {
    if ('vibrate' in navigator) {
        navigator.vibrate(ms);
    }
}

/**
 * ============================================================================
 * AGGANCIO DELLE LOGICHE AL PROFILO GLOBALE (Window)
 * ============================================================================
 */

// 1. Inversione dello stato "Fatto" (Checkbox)
window.toggleDone = async (stateKey) => {
    haptic(25);
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '', note: '' };
    }
    
    State.appState[stateKey].done = !State.appState[stateKey].done;
    
    // Registra la firma di chi ha eseguito la spunta
    State.appState[stateKey].operator = State.activeProfile || 'unknown';
    
    renderApp();
    await saveState(); // Archiviazione blindata immediata
};

// 2. Salvataggio in tempo reale di Quantità e Note operative
window.updateItemData = async (stateKey, field, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '', note: '' };
    }
    
    State.appState[stateKey][field] = value;
    await saveState(); // Salva silenziosamente nel telefono
    
    // Se la quantità viene azzerata, rimuove lo stato di completato per sicurezza
    if (field === 'n_op' && (value === '' || parseFloat(value) === 0)) {
        State.appState[stateKey].done = false;
        renderApp();
    }
};

// 3. Sistema di Ricerca Hardware-Observed
document.getElementById('search-input')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.item-row');
    
    rows.forEach(row => {
        const name = row.querySelector('.item-name')?.innerText.toLowerCase() || '';
        const note = row.querySelector('.note-input')?.value.toLowerCase() || '';
        
        if (name.includes(query) || note.includes(query)) {
            row.style.display = 'flex';
            // Forza la visibilità del contenitore padre se c'è un match
            row.closest('.section-container').style.display = 'block';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Se la ricerca è vuota, ripristina la visualizzazione standard
    if (query === '') renderApp();
});

// ============================================================================
// LOGICA INTER-SEZIONE: COPIA & INCOLLA STRUTTURE (Solo Amministratori)
// ============================================================================
window.copySection = (sectionId) => {
    haptic(40);
    const sourceSection = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    if (!sourceSection) return;

    // Duplica l'oggetto in memoria profonda per slegarlo dai riferimenti passati
    State.clipboardSection = JSON.parse(JSON.stringify(sourceSection));
    showToast(`Cella "${sourceSection.name}" copiata negli appunti`, "success");
    renderApp();
};

window.pasteSection = async () => {
    haptic(50);
    if (!State.clipboardSection || !State.activeSede || !State.activeFolder) return;

    const targetFolder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    const newSectionId = 'sec_' + Date.now();
    
    // Rigenera ID univoci per i prodotti incollati per evitare collisioni logiche
    const pastedSection = JSON.parse(JSON.stringify(State.clipboardSection));
    pastedSection.items.forEach(item => {
        item.id = 'itm_' + Math.random().toString(36).substr(2, 9);
    });

    targetFolder.sections[newSectionId] = pastedSection;
    showToast(`Matrice "${pastedSection.name}" innestata con successo`, "success");
    
    renderApp();
    await saveState();
};

/**
 * ============================================================================
 * APERTURA MODALI DI EDITING (Invocati dal Renderer)
 * ============================================================================
 */
window.openSedeModal = () => {
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-sede').style.display = 'flex';
    document.getElementById('input-sede-name').value = '';
    window.location.hash = 'modal-open';
};

window.openFolderModal = () => {
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-folder').style.display = 'flex';
    document.getElementById('input-folder-name').value = '';
    window.location.hash = 'modal-open';
};

window.openSectionModal = () => {
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-section').style.display = 'flex';
    document.getElementById('input-section-name').value = '';
    
    // Carica selettore cromatico standard
    const select = document.getElementById('input-section-color');
    select.innerHTML = `
        <option value="#3498db" style="color:#3498db;">LINEA BLU (STANDARD)</option>
        <option value="#2ecc71" style="color:#2ecc71;">LINEA VERDE (FRESCHI)</option>
        <option value="#e74c3c" style="color:#e74c3c;">LINEA ROSSA (CARNI/FRITTI)</option>
        <option value="#9b59b6" style="color:#9b59b6;">LINEA VIOLA (PANIFICAZIONE)</option>
        <option value="#f1c40f" style="color:#f1c40f;">LINEA GIALLA (DRY GOODS)</option>
    `;
    window.location.hash = 'modal-open';
};

// Gestore della chiusura tramite il tasto "Back" nativo dello smartphone
window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#modal-open') {
        document.getElementById('modal-layer').style.display = 'none';
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    }
});
