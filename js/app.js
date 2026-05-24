// File: js/app.js
import { initDatabase, saveState } from './core/lazzaro.js';
import { State } from './core/state.js';
import { Cerbero } from './core/cerbero.js';
import { showToast, switchSpaView, haptic } from './ui/events.js';

// Pre-Caricamento dei Moduli Visivi (Verranno eseguiti non appena li creerai nel prossimo step)
import './ui/renderer.js';
import './ui/nexus.js';

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
            // Se non ci sono sedi, forza la creazione (Sblocco interfaccia)
            State.activeSede = null; 
        }
    }
    
    const isAdmin = State.activeProfile === 'admin';
    
    if (!isAdmin) { 
        switchSpaView('checklist-hub'); 
    } else { 
        if (window.renderApp) window.renderApp(); 
        switchSpaView('app-wrapper'); 
    } 
}

window.performLogin = async () => {
    const pin = document.getElementById('login-password').value;
    
    if (Cerbero.isSystemVirgin()) {
        console.warn("Forzatura Root: Sovrascrittura Master Password in corso...");
        Cerbero.setupRootSignature(pin || '0000');
        finalizeLogin('admin');
    } else if (Cerbero.verifyRootSignature(pin)) {
        finalizeLogin('admin');
    } else {
        showToast("Firma Root Respinta. PIN Errato.", "error");
        haptic(50);
    }
    
    document.getElementById('login-password').value = ''; 
    haptic();
};

function finalizeLogin(profileId) { 
    State.activeProfile = profileId; 
    localStorage.setItem('nexus_session', profileId); 
    showToast("Accesso Consentito. Benvenuto ROOT.", "success"); 
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

// Avvio applicazione PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

// Innesco del Big Bang
window.onload = bootSystem;
