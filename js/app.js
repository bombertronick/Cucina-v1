// File: js/app.js
import { State } from './core/state.js';
import { lazzaro_loadState, lazzaro_saveState } from './core/lazzaro.js';
import './core/cerbero.js';
import './ui/renderer.js';
import './ui/nexus.js';

/**
 * MOTORE FEEDBACK TATTILE E VISIVO (TOAST SYSTEM)
 */
window.showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--accent)');
    const textColor = type === 'success' ? '#000' : '#fff';
    const icon = type === 'error' ? 'fa-triangle-exclamation' : (type === 'success' ? 'fa-check' : 'fa-circle-info');
    
    toast.style.cssText = `background:${bgColor}; color:${textColor}; padding:12px 20px; margin-bottom:10px; border-radius:8px; font-weight:800; font-size:0.9rem; display:flex; align-items:center; gap:12px; box-shadow:0 4px 12px rgba(0,0,0,0.5); transform:translateY(-20px); opacity:0; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => { 
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
};

window.haptic = (ms = 15) => {
    if (navigator.vibrate) navigator.vibrate(ms);
};

/**
 * LOGICHE GLOBALI (DISCONNESSIONE E COPY/PASTE TOPOLOGICO)
 */
window.logout = () => {
    if(!confirm("Effettuare la disconnessione dal profilo operativo?")) return;
    State.activeProfile = null;
    window.location.reload(); 
};

window.copySection = (sectionId) => {
    State.clipboardSection = JSON.parse(JSON.stringify(State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId]));
    window.showToast("Cella Logica copiata in memoria.", "info");
    if(window.renderApp) window.renderApp();
};

window.pasteSection = async () => {
    if (!State.clipboardSection || !State.activeSede || !State.activeFolder) return;
    
    const newId = 'sec_' + Date.now();
    const clonedSection = JSON.parse(JSON.stringify(State.clipboardSection)); 
    
    if(clonedSection.items) {
        clonedSection.items.forEach(item => {
            item.id = 'itm_' + Math.random().toString(36).substr(2, 9);
        });
    }

    State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[newId] = clonedSection;
    State.clipboardSection = null; 
    
    window.showToast("Cella incollata e ricalcolata con successo.", "success");
    if(window.renderApp) window.renderApp();
    await lazzaro_saveState();
};

/**
 * BOOTSTRAPPER DI SISTEMA
 */
async function initializeSystem() {
    console.log("[SYSTEM] Inizializzazione protocolli Offline-First...");
    
    const dbLoaded = await lazzaro_loadState();
    if (!dbLoaded) throw new Error("LocalForage Fallito.");

    const loginSelect = document.getElementById('login-profile');
    if (loginSelect) {
        loginSelect.innerHTML = '<option value="admin">ROOT (AMMINISTRATORE)</option>';
        
        const bootSedeId = State.activeSede || Object.keys(State.appStructure.sedi)[0];
        if (bootSedeId && State.appStructure.sedi[bootSedeId] && State.appStructure.sedi[bootSedeId].roles) {
            State.appStructure.sedi[bootSedeId].roles.forEach(role => {
                const opt = document.createElement('option');
                opt.value = role.id;
                opt.innerText = role.name.toUpperCase();
                loginSelect.appendChild(opt);
            });
        }
    }

    const profileContainer = document.getElementById('login-profile-container');
    if (profileContainer) profileContainer.style.display = 'block';
    
    console.log("[SYSTEM] V20.2 Motore Operativo.");
}

initializeSystem();
