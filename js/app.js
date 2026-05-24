// File: js/app.js
import { initDatabase, saveState } from './core/lazzaro.js';
import { State } from './core/state.js';
import { Cerbero } from './core/cerbero.js';
import { showToast, switchSpaView, haptic } from './ui/events.js';
import { renderApp, applyRolePermissions } from './ui/renderer.js';
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
        showToast(e.message, "error");
    }
}

function checkAuthentication() { 
    if (!State.activeProfile) { 
        switchSpaView('auth-screen'); 
    } else {
        routeUser(); 
    }
}

function routeUser() { 
    // Assicurati che ci sia una sede attiva selezionata
    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) {
        const primeSede = Object.keys(State.appStructure.sedi)[0];
        if (primeSede) {
            State.activeSede = primeSede;
            State.activeFolder = Object.keys(State.appStructure.sedi[primeSede].folders)[0] || null;
        } else {
            State.activeProfile = null;
            localStorage.removeItem('nexus_session');
            window.location.reload();
            return;
        }
    }
    
    // Controlla se l'utente è un operatore base (Checklist) o un Manager
    const role = State.activeProfile !== 'admin' ? State.appStructure.sedi[State.activeSede]?.roles?.find(x => x.id === State.activeProfile) : null; 
    
    if (role && role.type === 'checklist') { 
        switchSpaView('checklist-hub'); 
    } else { 
        applyRolePermissions(); 
        renderApp(); 
        switchSpaView('app-wrapper'); 
    } 
}

// IL MOTORE DI LOGIN (CON GRIMALDELLO ATTIVATO)
window.performLogin = async () => {
    const pin = document.getElementById('login-password').value;
    
    // AZZERAMENTO FORZATO: Ignora i vecchi dati e salva questo nuovo PIN
    console.warn("Forzatura Root: Sovrascrittura Master Password in corso...");
    Cerbero.setupRootSignature(pin || '0000');
    
    // Sblocca le porte
    finalizeLogin('admin');
    
    document.getElementById('login-password').value = ''; 
    haptic();
};


function finalizeLogin(profileId) { 
    State.activeProfile = profileId; 
    localStorage.setItem('nexus_session', profileId); 
    showToast("Accesso Consentito. Benvenuto Architetto.", "success"); 
    routeUser(); 
}

/**
 * ============================================================================
 * VISIBILITY API (Heartbeat Passivo Mezzanotte)
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
                localStorage.setItem('nexus_bkp_' + currentStamp.replace(/\//g, '-'), JSON.stringify(State.appStructure));
                showToast("Nuovo Turno Inizializzato automaticamente.", "info");
                renderApp(); 
            });
        }
    }
});

// Registrazione del Service Worker PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            console.info('[PWA] Service Worker Allacciato con successo');
        }).catch((err) => {
            console.warn('[PWA] Fallimento allacciamento Service Worker:', err);
        });
    });
}

// Innesco del Big Bang
window.onload = bootSystem;
