// File: js/app.js
import { initDatabase, saveState, syncPullCloud, syncPushCloud } from './core/lazzaro.js';
import { State } from './core/state.js';
import { Cerbero } from './core/cerbero.js';
import { CloudVault } from './core/cloud.js';
import { showToast, switchSpaView, haptic } from './ui/events.js';

import './ui/renderer.js';
import './ui/nexus.js';

// ============================================================================
// ESPOSIZIONE GLOBALE DELLE API DI RETE
// ============================================================================
window.syncPullCloud = syncPullCloud;
window.syncPushCloud = syncPushCloud;
window.CloudVault = CloudVault;

/**
 * ============================================================================
 * BOOTLOADER GLOBALE E GESTIONE SESSIONI
 * ============================================================================
 */
async function bootSystem() {
    try {
        console.info("[Bootloader] Inizializzazione Core Lazzaro...");
        await initDatabase();
        console.info("[Bootloader] Motore database allineato. Avvio controlli di sicurezza...");
        
        checkAuthentication();
    } catch (e) {
        console.error("[Fatal Error]", e);
        showToast("Errore critico avvio sistema.", "error");
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
    
    // Tutti gli utenti vengono instradati alla Matrice. 
    // Il renderer.js si occuperà di nascondere i tasti di modifica per i NON-Admin.
    if (window.renderApp) window.renderApp(); 
    switchSpaView('app-wrapper'); 
}

window.performLogin = async () => {
    const pin = document.getElementById('login-password').value.trim();
    if (!pin) return;
    
    // 1. Controllo Accesso ROOT (Amministratore Assoluto)
    if (Cerbero.isSystemVirgin()) {
        console.warn("Forzatura Root: Sovrascrittura Master Password in corso...");
        Cerbero.setupRootSignature(pin || '0000');
        finalizeLogin('admin');
        return;
    } else if (Cerbero.verifyRootSignature(pin)) {
        finalizeLogin('admin');
        return;
    } 

    // 2. Controllo Accesso Operatore Base (Scansione Matrice)
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
        // Forza l'operatore a visualizzare la sede a cui è stato assegnato
        State.activeSede = foundSedeId;
        State.activeFolder = Object.keys(State.appStructure.sedi[foundSedeId].folders)[0] || null;
        finalizeLogin(foundOperator.id);
    } else {
        showToast("Firma Respinta. PIN Errato o inesistente.", "error");
        haptic(50);
    }
    
    document.getElementById('login-password').value = ''; 
    haptic();
};

function finalizeLogin(profileId) { 
    State.activeProfile = profileId; 
    localStorage.setItem('nexus_session', profileId); 
    
    const msg = profileId === 'admin' ? "Accesso Consentito. Benvenuto ROOT." : "Identificazione operatore confermata.";
    showToast(msg, "success"); 
    routeUser(); 
}

/**
 * ============================================================================
 * VISIBILITY API (Purificazione Notturna Automatica)
 * ============================================================================
 */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const currentStamp = new Date().toLocaleDateString('it-IT');
        if (localStorage.getItem('nexus_day') && localStorage.getItem('nexus_day') !== currentStamp) {
            console.info("[Midnight API] Rilevato cambio data. Purificazione turno in corso...");
            
            Object.keys(State.appState).forEach(key => {
                State.appState[key].done = false;
                State.appState[key].n_op = '';
            });
            
            saveState().then(() => {
                localStorage.setItem('nexus_day', currentStamp);
                showToast("Nuovo Turno Inizializzato automaticamente.", "info");
                if (window.renderApp) window.renderApp(); 
            });
        }
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

window.onload = bootSystem;
