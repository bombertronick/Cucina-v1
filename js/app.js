// File: js/app.js
import { lazzaro_init } from './core/lazzaro.js';
import { State } from './core/state.js';
import './ui/renderer.js';
import './ui/nexus.js';

// Configurazione di sicurezza standard al boot: Root pre-selezionato
window._selectedLoginProfile = 'admin';

/**
 * BOOTLOADER PRINCIPALE - INIZIALIZZAZIONE SISTEMA E SICUREZZA
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[BOOTLOADER] Avvio sequenza di innesco Scutum ERP V20...");

    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
            console.log("[BOOTLOADER] Service Worker registrato e allineato.");
        } catch (err) {
            console.warn("[BOOTLOADER ERROR] Registrazione Service Worker fallita:", err);
        }
    }

    const dbReady = await lazzaro_init();
    if (!dbReady) {
        alert("ERRORE CRITICO: Database locale inaccessibile. Impossibile avviare il bootloader.");
        return;
    }

    // Ripristino automatico della sessione attiva (Anti-Refresh)
    const activeSession = sessionStorage.getItem('scutum_active_session');
    if (activeSession) {
        State.activeProfile = activeSession;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('app-wrapper').classList.add('active');
        window.renderApp();
        return;
    }

    // COSTRUTTORE INTERFACCIA DI AUTENTICAZIONE SEPARATA
    const profileSelect = document.getElementById('login-profile');
    if (profileSelect) {
        profileSelect.style.display = 'none'; 

        let container = document.getElementById('matryoshka-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'matryoshka-container';
            container.style.width = '100%';
            profileSelect.parentNode.insertBefore(container, profileSelect.nextSibling);
        }

        let html = '';
        const defaultSedeId = State.activeSede || Object.keys(State.appStructure.sedi)[0];

        // ARCHITETTURA VISIVA 1: Blocco di Accesso Amministrativo Separato (ROOT)
        html += `
        <div id="root-auth-vault" style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed var(--border);">
            <div style="font-size: 0.7rem; color: var(--danger); font-weight: 800; letter-spacing: 1.5px; margin-bottom: 10px; text-transform: uppercase;">
                <i class="fa-solid fa-unlock-keyhole"></i> Autenticazione Direzione Generale
            </div>
            <div class="matryoshka-op" id="matryoshka-admin" onclick="window.selectProfileMatryoshka('admin', this)" style="padding:16px; border:2px dashed var(--danger); border-radius:8px; font-weight:800; color:var(--danger); cursor:pointer; text-align:center; transition:all 0.2s; background:rgba(231,76,60,0.12);">
                <i class="fa-solid fa-user-shield"></i> TERMINALE ROOT (ADMIN)
            </div>
        </div>`;

        // ARCHITETTURA VISIVA 2: Sezione Reparti Operativi e Squadre a Matrioska
        html += `
        <div id="operators-auth-vault">
            <div style="font-size: 0.7rem; color: var(--accent); font-weight: 800; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">
                <i class="fa-solid fa-network-wired"></i> Selezione Squadre e Personale Rete
            </div>`;

        let hasOperators = false;

        if (defaultSedeId && State.appStructure.sedi[defaultSedeId]) {
            const sede = State.appStructure.sedi[defaultSedeId];
            if (sede.roles && sede.roles.length > 0) {
                hasOperators = true;
                const teams = {};
                
                // Raggruppamento per squadre inserite liberamente
                sede.roles.forEach(role => {
                    const teamName = role.squadra ? role.squadra.toUpperCase() : 'SENZA REPARTO';
                    if (!teams[teamName]) teams[teamName] = [];
                    teams[teamName].push(role);
                });

                Object.keys(teams).forEach(team => {
                    const safeTeamId = btoa(team).replace(/[^a-zA-Z0-9]/g, '');
                    html += `
                    <div class="matryoshka-team" style="margin-bottom:8px; border:1px solid var(--border); border-radius:6px; background:rgba(0,0,0,0.3); overflow:hidden;">
                        <div onclick="window.toggleMatryoshka('${safeTeamId}')" style="padding:14px; font-weight:800; color:var(--accent); cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                            <span><i class="fa-solid fa-layer-group"></i> ${team}</span>
                            <i class="fa-solid fa-chevron-down" id="icon-${safeTeamId}" style="transition:transform 0.3s;"></i>
                        </div>
                        <div id="content-${safeTeamId}" style="display:none; flex-direction:column; gap:6px; padding:8px 12px 12px 12px; background:rgba(0,0,0,0.2);">`;

                    teams[team].forEach(op => {
                        html += `<div class="matryoshka-op" onclick="window.selectProfileMatryoshka('${op.id}', this)" style="padding:12px; background:rgba(255,255,255,0.03); border-radius:4px; cursor:pointer; border:1px solid transparent; font-weight:700; transition:all 0.2s;"><i class="fa-solid fa-user" style="color:var(--text-muted); margin-right:8px;"></i> ${op.name.toUpperCase()}</div>`;
                    });

                    html += `</div></div>`;
                });
            }
        }

        if (!hasOperators) {
            html += `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:20px; border:1px dashed var(--border); border-radius:6px; background:rgba(0,0,0,0.15);">Nessun profilo rete rilevato. Effettuare il login come ROOT per configurare la matrice logistica della Sede.</div>`;
        }

        html += `</div>`; 
        container.innerHTML = html;

        // Regolazione dinamica del placeholder iniziale per l'input PIN
        const passInput = document.getElementById('login-password');
        if (passInput) passInput.placeholder = "Inserisci PIN Amministratore (ROOT)";
    }

    const authScreen = document.getElementById('auth-screen');
    const appWrapper = document.getElementById('app-wrapper');
    if (authScreen && appWrapper) {
        appWrapper.style.display = 'none';
        authScreen.style.display = 'flex';
        authScreen.classList.add('active');
    }
});

// === MOTORE LOGICO DI INTERAZIONE MATRIOSKA ===

window.toggleMatryoshka = (teamId) => {
    const content = document.getElementById(`content-${teamId}`);
    const icon = document.getElementById(`icon-${teamId}`);
    if (!content) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

window.selectProfileMatryoshka = (profileId, element) => {
    window._selectedLoginProfile = profileId;
    const passInput = document.getElementById('login-password');
    
    // Ripristino degli stati visivi di tutti gli elementi opziali
    document.querySelectorAll('.matryoshka-op').forEach(el => {
        if (el.id === 'matryoshka-admin') {
            el.style.background = 'rgba(231,76,60,0.05)';
            el.style.borderColor = 'dashed var(--danger)';
        } else {
            el.style.borderColor = 'transparent';
            el.style.background = 'rgba(255,255,255,0.03)';
            const userIcon = el.querySelector('.fa-user');
            if (userIcon) userIcon.style.color = 'var(--text-muted)';
        }
    });

    // Applicazione del focus e riscrittura placeholder dinamica
    if (profileId === 'admin') {
        if (element) {
            element.style.background = 'rgba(231,76,60,0.15)';
            element.style.borderColor = 'solid var(--danger)';
        }
        if (passInput) passInput.placeholder = "Inserisci PIN Amministratore (ROOT)";
    } else {
        if (element) {
            element.style.borderColor = 'var(--accent)';
            element.style.background = 'rgba(201,164,100,0.15)';
            const userIcon = element.querySelector('.fa-user');
            if (userIcon) userIcon.style.color = 'var(--accent)';
        }
        if (passInput) passInput.placeholder = "Inserisci PIN Operatore";
    }
};
