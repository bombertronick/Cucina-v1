// File: js/app.js
import { State } from './core/state.js';
import { lazzaro_loadState } from './core/lazzaro.js';
import './core/cerbero.js';
import './ui/renderer.js';
import './ui/nexus.js';

async function initializeSystem() {
    console.log("[SYSTEM] Inizializzazione protocolli...");
    
    const dbLoaded = await lazzaro_loadState();
    
    if (!dbLoaded) {
        throw new Error("LocalForage Fallito. Impossibile leggere il database.");
    }

    // Popolamento dinamico della tendina di Login
    const loginSelect = document.getElementById('login-profile');
    if (loginSelect) {
        loginSelect.innerHTML = '<option value="admin">ROOT (AMMINISTRATORE)</option>';
        
        // Cerca la prima sede disponibile per estrarre l'organigramma operatori
        const firstSedeId = Object.keys(State.appStructure.sedi)[0];
        if (firstSedeId && State.appStructure.sedi[firstSedeId].roles) {
            State.appStructure.sedi[firstSedeId].roles.forEach(role => {
                const opt = document.createElement('option');
                opt.value = role.id;
                opt.innerText = role.name.toUpperCase();
                loginSelect.appendChild(opt);
            });
        }
    }

    // Sblocco Interfaccia Visiva
    const profileContainer = document.getElementById('login-profile-container');
    if (profileContainer) profileContainer.style.display = 'block';
    
    console.log("[SYSTEM] V20 Motore Operativo. In attesa di PIN.");
}

// Innesco immediato all'importazione
initializeSystem();
