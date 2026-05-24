// File: js/app.js
import { initDatabase, saveState, syncPullCloud, syncPushCloud, exportLocalBackup, importLocalBackup } from './core/lazzaro.js';
import { State } from './core/state.js';
import { Cerbero } from './core/cerbero.js';
import { CloudVault } from './core/cloud.js';
import { showToast, switchSpaView, haptic } from './ui/events.js';

import './ui/renderer.js';
import './ui/nexus.js';

window.syncPullCloud = syncPullCloud;
window.syncPushCloud = syncPushCloud;
window.CloudVault = CloudVault;
window.exportLocalBackup = exportLocalBackup;
window.importLocalBackup = importLocalBackup;

async function bootSystem() {
    try {
        console.info("[Bootloader] Inizializzazione Core Lazzaro...");
        await initDatabase();
        
        // Popola il menu a tendina degli operatori
        populateLoginProfiles();
        
        checkAuthentication();
    } catch (e) {
        console.error("[Fatal Error]", e);
        showToast("Errore critico avvio database.", "error");
    }
}

function populateLoginProfiles() {
    const select = document.getElementById('login-profile');
    const container = document.getElementById('login-profile-container');
    if (!select || !container) return;

    // Inizializza con ROOT
    select.innerHTML = '<option value="admin">ROOT (AMMINISTRATORE)</option>';

    // Estrae tutti gli operatori dalle Sedi e li aggiunge
    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        if (sede.roles && sede.roles.length > 0) {
            sede.roles.forEach(op => {
                const opt = document.createElement('option');
                opt.value = op.id;
                opt.dataset.sede = sedeId; // Memorizza a quale sede appartiene l'operatore
                opt.innerText = op.name.toUpperCase() + ' (' + sede.name + ')';
                select.appendChild(opt);
            });
        }
    });

    container.style.display = 'block';
}

function checkAuthentication() { 
    const session = localStorage.getItem('nexus_session');
    if (!session) { 
        switchSpaView('auth-screen'); 
    } else {
        State.activeProfile = session;
        routeUser(); 
    }
}

function routeUser() { 
    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) {
        const primeSede = Object.keys(State.appStructure.sedi)[0];
        if (primeSede) {
            State.activeSede = primeSede;
            State.activeFolder = Object.keys(State.appStructure.sedi[primeSede].folders)[0] || null;
        } else {
            State.activeSede = null; 
        }
    }
    
    if (window.renderApp) window.renderApp(); 
    switchSpaView('app-wrapper'); 
}

window.performLogin = async () => {
    const select = document.getElementById('login-profile');
    const pinInput = document.getElementById('login-password');
    if (!pinInput || !select) return;
    
    const profileId = select.value;
    const pin = pinInput.value.trim();
    
    if (!pin) {
        showToast("Inserisci il PIN", "error");
        return;
    }
    
    // Logica di accesso ROOT
    if (profileId === 'admin') {
        if (Cerbero.isSystemVirgin()) {
            console.warn("Forzatura Root: Sovrascrittura Master Password in corso...");
            Cerbero.setupRootSignature(pin || '0000');
            finalizeLogin('admin');
            return;
        } else if (Cerbero.verifyRootSignature(pin)) {
            finalizeLogin('admin');
            return;
        } else {
            showToast("Firma ROOT Respinta. PIN errato.", "error");
            haptic(50);
            return;
        }
    } 

    // Logica di accesso OPERATORE
    const selectedOpt = select.options[select.selectedIndex];
    const sedeId = selectedOpt.dataset.sede;
    const sede = State.appStructure.sedi[sedeId];

    if (sede && sede.roles) {
        const op = sede.roles.find(r => r.id === profileId);
        if (op && op.pin === pin) {
            State.activeSede = sedeId;
            State.activeFolder = Object.keys(sede.folders)[0] || null;
            finalizeLogin(op.id);
            return;
        }
    }

    showToast("PIN Errato per questo operatore.", "error");
    haptic(50);
    pinInput.value = ''; 
};

function finalizeLogin(profileId) { 
    State.activeProfile = profileId; 
    localStorage.setItem('nexus_session', profileId); 
    
    const msg = profileId === 'admin' ? "Accesso Consentito. Benvenuto ROOT." : "Identificazione operatore confermata.";
    showToast(msg, "success"); 
    routeUser(); 
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const currentStamp = new Date().toLocaleDateString('it-IT');
        if (localStorage.getItem('nexus_day') && localStorage.getItem('nexus_day') !== currentStamp) {
            Object.keys(State.appState).forEach(key => {
                State.appState[key].done = false;
                State.appState[key].n_op = '';
            });
            
            saveState().then(() => {
                localStorage.setItem('nexus_day', currentStamp);
                showToast("Nuovo Turno Inizializzato.", "info");
                if (window.renderApp) window.renderApp(); 
            });
        }
    }
});

bootSystem();
