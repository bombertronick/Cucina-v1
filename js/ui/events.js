// File: js/ui/events.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js';

/**
 * ============================================================================
 * INTERFACCIA UTENTE: ROUTING INTERNO (SPA) E FEEDBACK
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
        target.style.display = viewId === 'app-wrapper' ? 'flex' : 'block';
    }
}
window.switchSpaView = switchSpaView; // Esportazione Globale

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

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
window.showToast = showToast;

export function haptic(ms = 15) {
    if ('vibrate' in navigator) navigator.vibrate(ms);
}
window.haptic = haptic;

/**
 * ============================================================================
 * GESTORI EVENTI GLOBALI (Interazioni Database)
 * ============================================================================
 */
window.logout = () => {
    localStorage.removeItem('nexus_session');
    window.location.reload();
};

window.toggleDone = async (stateKey) => {
    haptic(25);
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '', note: '' };
    }
    
    State.appState[stateKey].done = !State.appState[stateKey].done;
    State.appState[stateKey].operator = State.activeProfile || 'unknown';
    
    if (window.renderApp) window.renderApp();
    await saveState();
};

window.updateItemData = async (stateKey, field, value) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '', note: '' };
    }
    
    State.appState[stateKey][field] = value;
    
    if (field === 'n_op' && (value === '' || parseFloat(value) === 0)) {
        State.appState[stateKey].done = false;
        if (window.renderApp) window.renderApp();
    }
    await saveState();
};

// Listener Motore di Ricerca
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll('.item-row');
        
        rows.forEach(row => {
            const name = row.querySelector('.item-name')?.innerText.toLowerCase() || '';
            const note = row.querySelector('.note-input')?.value.toLowerCase() || '';
            
            if (name.includes(query) || note.includes(query)) {
                row.style.display = 'flex';
                row.closest('.section-container').style.display = 'block';
            } else {
                row.style.display = 'none';
            }
        });
        
        if (query === '' && window.renderApp) window.renderApp();
    });
});

// Appunti (Copia/Incolla Celle Logiche)
window.copySection = (sectionId) => {
    haptic(40);
    const sourceSection = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    if (!sourceSection) return;

    State.clipboardSection = JSON.parse(JSON.stringify(sourceSection));
    showToast(`Cella "${sourceSection.name}" copiata negli appunti`, "success");
    if (window.renderApp) window.renderApp();
};

window.pasteSection = async () => {
    haptic(50);
    if (!State.clipboardSection || !State.activeSede || !State.activeFolder) return;

    const targetFolder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    const newSectionId = 'sec_' + Date.now();
    
    const pastedSection = JSON.parse(JSON.stringify(State.clipboardSection));
    pastedSection.items.forEach(item => { item.id = 'itm_' + Math.random().toString(36).substr(2, 9); });

    targetFolder.sections[newSectionId] = pastedSection;
    showToast(`Matrice "${pastedSection.name}" innestata`, "success");
    
    if (window.renderApp) window.renderApp();
    await saveState();
};

// Chiusura Modali e Routing
window.closeModals = () => {
    window._editContext = null;
    document.getElementById('modal-layer').style.display = 'none';
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    
    const modalItem = document.getElementById('modal-item');
    if (modalItem) modalItem.style.display = 'none';
};
