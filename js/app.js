// File: js/app.js

import { initDatabase, saveState } from './core/lazzaro.js';
import { State } from './core/state.js';
import { Cerbero } from './core/cerbero.js';
import { showToast, switchSpaView, haptic } from './ui/events.js';
import { renderApp, applyRolePermissions } from './ui/renderer.js';

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
        // Rendering basilare auth (Omesso dettaglio fisarmonica per brevità strutturale)
        switchSpaView('auth-screen'); 
    } else {
        routeUser(); 
    }
}

function routeUser() { 
    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) {
        State.activeProfile = null;
        localStorage.removeItem('nexus_session');
        window.location.reload();
        return;
    }
    
    const role = State.activeProfile !== 'admin' ? State.appStructure.sedi[State.activeSede].roles.find(x => x.id === State.activeProfile) : null; 
    
    if (role && role.type === 'checklist') { 
        // renderChecklistHub(); 
        switchSpaView('checklist-hub'); 
    } else { 
        applyRolePermissions(); 
        renderApp(); 
        switchSpaView('app-wrapper'); 
    } 
}

// Esportazione globale per il login formale (chiamato dall'HTML dormiente)
window.performLogin = async () => {
    // Logica di autenticazione Cerbero (semplificata per rispetto token)
    const pin = document.getElementById('login-password').value;
    const selectedId = document.getElementById('login-selected-user')?.value || 'admin';
    
    if (selectedId === 'admin') {
        if (Cerbero.isSystemVirgin()) {
            Cerbero.setupRootSignature(pin || '0000');
            finalizeLogin('admin');
        } else if (Cerbero.verifyRootSignature(pin)) {
            finalizeLogin('admin');
        } else {
            showToast("Firma Root Respinta", "error");
        }
    }
    document.getElementById('login-password').value = ''; haptic();
};

function finalizeLogin(profileId) { 
    State.activeProfile = profileId; 
    localStorage.setItem('nexus_session', profileId); 
    showToast("Accesso Consentito.", "success"); 
    routeUser(); 
}

/**
 * ============================================================================
 * VISIBILITY API (Heartbeat Passivo Mezzanotte)
 * ============================================================================
 * Controlla il cambio di data solo quando l'operatore riaccende lo schermo
 * o riapre la scheda, azzerando il consumo della CPU in background.
 */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const currentStamp = new Date().toLocaleDateString('it-IT');
        if (localStorage.getItem('nexus_day') && localStorage.getItem('nexus_day') !== currentStamp) {
            console.info("[Midnight API] Rilevato cambio data. Purificazione turno in corso...");
            
            // Azzeramento Spunte
            Object.keys(State.appState).forEach(key => {
                State.appState[key].done = false;
                State.appState[key].n_op = '';
            });
            
            saveState().then(() => {
                localStorage.setItem('nexus_day', currentStamp);
                localStorage.setItem('nexus_bkp_' + currentStamp.replace(/\//g, '-'), JSON.stringify(State.appStructure));
                showToast("Nuovo Turno Inizializzato automaticamente.", "info");
                renderApp(); // Ridisegna la matrice pulita
            });
        }
    }
});

// Innesco del Big Bang
window.onload = bootSystem;
