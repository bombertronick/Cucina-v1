// File: js/ui/events.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js';

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
window.switchSpaView = switchSpaView;

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

/**
 * ============================================================================
 * INIEZIONE E GESTIONE MODALE CLOUD VAULT
 * ============================================================================
 */
function injectCloudModal() {
    if (document.getElementById('modal-cloud')) return;
    const modalHTML = `
        <div id="modal-cloud" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
            <div class="modal-box">
                <h2 style="margin-bottom: 24px; color: var(--nexus);"><i class="fa-solid fa-cloud"></i> CLOUD VAULT</h2>
                <div class="input-group">
                    <label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">JSONBIN ID</label>
                    <input type="text" id="input-cloud-bin" placeholder="Es. 65c...a12">
                </div>
                <div class="input-group">
                    <label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">MASTER API KEY</label>
                    <input type="password" id="input-cloud-api" placeholder="Es. $2a$10$...">
                </div>
                <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <button class="btn-action" style="background: rgba(46, 204, 113, 0.1); color: var(--success); border-color: var(--success);" onclick="window.forceCloudPull()"><i class="fa-solid fa-cloud-arrow-down"></i> PULL MANUALE</button>
                    <button class="btn-action" style="background: rgba(155, 89, 182, 0.1); color: var(--nexus); border-color: var(--nexus);" onclick="window.forceCloudPush()"><i class="fa-solid fa-cloud-arrow-up"></i> PUSH MANUALE</button>
                </div>
                <div style="display: flex; gap: 16px; margin-top: auto;">
                    <button class="btn-action" onclick="window.closeModals();">CHIUDI</button>
                    <button class="btn-action solid" style="background: var(--nexus);" onclick="window.saveCloudCredentialsLogic()">SALVA CHIAVI</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
}

window.openCloudModal = () => {
    injectCloudModal();
    const creds = window.CloudVault ? window.CloudVault.getCredentials() : {binId: '', apiKey: ''};
    document.getElementById('input-cloud-bin').value = creds.binId;
    document.getElementById('input-cloud-api').value = creds.apiKey;
    
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-cloud').style.display = 'flex';
};

window.saveCloudCredentialsLogic = () => {
    const bin = document.getElementById('input-cloud-bin').value.trim();
    const api = document.getElementById('input-cloud-api').value.trim();
    
    if (window.CloudVault && window.CloudVault.saveCredentials(bin, api)) {
        window.showToast("Credenziali Cloud ancorate.", "success");
        window.closeModals();
        if (window.renderApp) window.renderApp();
    } else {
        window.showToast("Errore salvataggio chiavi. Campi vuoti.", "error");
    }
};

window.forceCloudPull = async () => {
    if (!window.CloudVault || !window.CloudVault.isConfigured()) {
        window.showToast("Configura prima le chiavi API.", "error");
        return;
    }
    window.haptic(30);
    window.showToast("Download dal Cloud in corso...", "info");
    try {
        await window.syncPullCloud();
        window.showToast("Sincronizzazione PULL completata.", "success");
        window.closeModals();
    } catch(e) {
        window.showToast("Fallimento PULL: " + e.message, "error");
    }
};

window.forceCloudPush = async () => {
     if (!window.CloudVault || !window.CloudVault.isConfigured()) {
        window.showToast("Configura prima le chiavi API.", "error");
        return;
    }
    window.haptic(30);
    window.showToast("Upload nel Cloud in corso...", "info");
    try {
        await window.syncPushCloud();
        window.showToast("Sincronizzazione PUSH completata.", "success");
        window.closeModals();
    } catch(e) {
        window.showToast("Fallimento PUSH: " + e.message, "error");
    }
};

window.closeModals = () => {
    window._editContext = null;
    document.getElementById('modal-layer').style.display = 'none';
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
};
