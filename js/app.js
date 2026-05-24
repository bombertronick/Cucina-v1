// File: js/app.js
import { initDatabase, saveState, syncPullCloud, syncPushCloud, exportLocalBackup, importLocalBackup } from './core/lazzaro.js';
import { State } from './core/state.js';
import { Cerbero } from './core/cerbero.js';
import { CloudVault } from './core/cloud.js';
import { showToast, switchSpaView, haptic } from './ui/events.js';

import './ui/renderer.js';
import './ui/nexus.js';

// Esposizione per l'interfaccia
window.syncPullCloud = syncPullCloud;
window.syncPushCloud = syncPushCloud;
window.CloudVault = CloudVault;
window.exportLocalBackup = exportLocalBackup;
window.importLocalBackup = importLocalBackup;

async function bootSystem() {
    try {
        console.info("[Bootloader] Inizializzazione Core Lazzaro...");
        await initDatabase();
        checkAuthentication();
    } catch (e) {
        console.error("[Fatal Error]", e);
        showToast("Errore critico avvio database.", "error");
    }
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
    const pinInput = document.getElementById('login-password');
    if (!pinInput) return;
    const pin = pinInput.value.trim();
    if (!pin) return;
    
    if (Cerbero.isSystemVirgin()) {
        console.warn("Forzatura Root: Sovrascrittura Master Password in corso...");
        Cerbero.setupRootSignature(pin || '0000');
        finalizeLogin('admin');
        return;
    } else if (Cerbero.verifyRootSignature(pin)) {
        finalizeLogin('admin');
        return;
    } 

    let foundOperator = null;
    let foundSedeId = null;
    
    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        if (sede.roles) {
            const op = sede.roles.find(r => r.pin === pin);
            if (op) {
                foundOperator = op;
                foundSedeId = sedeId;
            }
        }
    });

    if (foundOperator) {
        State.activeSede = foundSedeId;
        State.activeFolder = Object.keys(State.appStructure.sedi[foundSedeId].folders)[0] || null;
        finalizeLogin(foundOperator.id);
    } else {
        showToast("Firma Respinta. PIN Errato o inesistente.", "error");
        haptic(50);
    }
    
    pinInput.value = ''; 
    haptic();
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

// Avvio esplicito forzato
bootSystem();
