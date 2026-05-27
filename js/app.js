// File: js/app.js
import { lazzaro_init } from './core/lazzaro.js';
import { State } from './core/state.js';
import './ui/renderer.js';
import './ui/nexus.js';

/**
 * BOOTLOADER PRINCIPALE - INIZIALIZZAZIONE SISTEMA E SICUREZZA
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[BOOTLOADER] Avvio sequenza di innesco Scutum ERP V20...");

    // Registrazione Service Worker per cache offline e protocollo PWA
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
            console.log("[BOOTLOADER] Service Worker registrato e allineato.");
        } catch (err) {
            console.warn("[BOOTLOADER ERROR] Registrazione Service Worker fallita:", err);
        }
    }

    // Inizializzazione Motore di Persistenza (Database Quantico IndexedDB)
    const dbReady = await lazzaro_init();
    
    if (!dbReady) {
        alert("ERRORE CRITICO: Database locale inaccessibile. L'app non può avviarsi.");
        return;
    }

    // Popolamento dinamico delle opzioni di login in base alla struttura caricata e alle squadre
    const profileSelect = document.getElementById('login-profile');
    if (profileSelect) {
        profileSelect.innerHTML = '<option value="admin">ROOT (Amministratore)</option>';
        
        // Selettore profilato per la sede attiva di default
        const defaultSedeId = State.activeSede || Object.keys(State.appStructure.sedi)[0];
        if (defaultSedeId && State.appStructure.sedi[defaultSedeId]) {
            const sede = State.appStructure.sedi[defaultSedeId];
            if (sede.roles) {
                sede.roles.forEach(role => {
                    // Inclusione dinamica della taglia squadra nel nome a tendina
                    const teamLabel = role.squadra ? ` [${role.squadra.toUpperCase()}]` : '';
                    profileSelect.innerHTML += `<option value="${role.id}">${role.name.toUpperCase()}${teamLabel}</option>`;
                });
            }
        }
    }

    // Sigillo di sicurezza: Esposizione forzata dell'interfaccia di Login e nascondimento App
    const authScreen = document.getElementById('auth-screen');
    const appWrapper = document.getElementById('app-wrapper');
    
    if (authScreen && appWrapper) {
        appWrapper.style.display = 'none';
        authScreen.style.display = 'flex';
        authScreen.classList.add('active');
    }

    console.log("[BOOTLOADER] Sistema armato e pronto per l'autenticazione.");
});
