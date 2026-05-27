// File: js/app.js
import { lazzaro_init } from './core/lazzaro.js';
import { State } from './core/state.js';
import './ui/renderer.js';
import './ui/nexus.js';

// FORZATURA ASSOLUTA: Il profilo ROOT è sempre il default all'avvio.
window._selectedLoginProfile = 'admin';

/**
 * ============================================================================
 * 1. PWA INSTALL ENGINE (CATTURA EVENTO E INIEZIONE POPUP)
 * ============================================================================
 */
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Previene il banner mini-infobar nativo di Chrome/Android
    e.preventDefault();
    deferredPrompt = e;

    console.log("[PWA] Dispositivo idoneo. Iniettando popup di installazione...");

    if (!document.getElementById('pwa-install-popup')) {
        const popupHTML = `
        <div id="pwa-install-popup" style="position:fixed; bottom:24px; left:50%; transform:translateX(-50%); width:90%; max-width:400px; background:var(--bg); border:2px solid var(--accent); border-radius:12px; padding:20px; box-shadow:0 10px 40px rgba(0,0,0,0.9); z-index:9999; display:flex; flex-direction:column; gap:16px; animation: slideUp 0.4s ease-out;">
            <style>@keyframes slideUp { from { bottom: -100px; opacity: 0; } to { bottom: 24px; opacity: 1; } }</style>
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h3 style="color:var(--accent); margin:0 0 6px 0; font-size:1.2rem; font-weight:800;"><i class="fa-solid fa-download"></i> INSTALLA SCUTUM ERP</h3>
                    <p style="color:var(--text-main); font-size:0.85rem; margin:0; line-height:1.4;">Aggiungi l'app alla Schermata Home per l'accesso offline e la modalità a schermo intero.</p>
                </div>
                <button onclick="document.getElementById('pwa-install-popup').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; font-weight:800; cursor:pointer; padding:0 0 0 16px;">&times;</button>
            </div>
            <button id="btn-pwa-install" class="btn-action solid" style="background:var(--accent); color:#000; font-weight:800; padding:14px; font-size:1rem;"><i class="fa-solid fa-mobile-screen-button"></i> AGGIUNGI ALLA HOME</button>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', popupHTML);

        document.getElementById('btn-pwa-install').addEventListener('click', async () => {
            const popup = document.getElementById('pwa-install-popup');
            popup.style.display = 'none';
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`[PWA] Esito interazione utente: ${outcome}`);
                deferredPrompt = null;
            }
        });
    } else {
        document.getElementById('pwa-install-popup').style.display = 'flex';
    }
});

window.addEventListener('appinstalled', () => {
    const popup = document.getElementById('pwa-install-popup');
    if(popup) popup.style.display = 'none';
    deferredPrompt = null;
    console.log('[PWA] Scutum ERP installata fisicamente sul dispositivo.');
    if(window.showToast) window.showToast("App installata con successo!", "success");
});

/**
 * ============================================================================
 * 2. BOOTLOADER PRINCIPALE - INIZIALIZZAZIONE SISTEMA E MATRIOSKA
 * ============================================================================
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
        alert("ERRORE CRITICO: Database locale inaccessibile. L'app non può avviarsi.");
        return;
    }

    const activeSession = sessionStorage.getItem('scutum_active_session');
    if (activeSession) {
        State.activeProfile = activeSession;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('app-wrapper').classList.add('active');
        window.renderApp();
        return;
    }

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

        html += `
        <div id="root-auth-vault" style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed var(--border);">
            <div style="font-size: 0.7rem; color: var(--danger); font-weight: 800; letter-spacing: 1.5px; margin-bottom: 10px; text-transform: uppercase;"><i class="fa-solid fa-unlock-keyhole"></i> Autenticazione Direzione Generale</div>
            <div class="matryoshka-op" id="matryoshka-admin" onclick="window.selectProfileMatryoshka('admin', this)" style="padding:16px; border:2px dashed var(--danger); border-radius:8px; font-weight:800; color:var(--danger); cursor:pointer; text-align:center; transition:all 0.2s; background:rgba(231,76,60,0.12);"><i class="fa-solid fa-user-shield"></i> TERMINALE ROOT (ADMIN)</div>
        </div>`;

        html += `
        <div id="operators-auth-vault">
            <div style="font-size: 0.7rem; color: var(--accent); font-weight: 800; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;"><i class="fa-solid fa-network-wired"></i> Selezione Squadre e Personale Rete</div>`;

        let hasOperators = false;

        if (defaultSedeId && State.appStructure.sedi[defaultSedeId]) {
            const sede = State.appStructure.sedi[defaultSedeId];
            if (sede.roles && sede.roles.length > 0) {
                hasOperators = true;
                const teams = {};
                
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
