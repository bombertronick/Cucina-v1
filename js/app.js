// File: js/app.js
import { lazzaro_init } from './core/lazzaro.js';
import { State } from './core/state.js';
import './ui/renderer.js';
import './ui/nexus.js';

// FORZATURA ASSOLUTA: Il profilo ROOT è sempre il default all'avvio.
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
        alert("ERRORE CRITICO: Database locale inaccessibile. L'app non può avviarsi.");
        return;
    }

    // Bypass sessione se già loggato
    const activeSession = sessionStorage.getItem('scutum_active_session');
    if (activeSession) {
        State.activeProfile = activeSession;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('app-wrapper').classList.add('active');
        window.renderApp();
        return;
    }

    // COSTRUTTORE MODALE LOGIN A MATRIOSKA
    const profileSelect = document.getElementById('login-profile');
    if (profileSelect) {
        profileSelect.style.display = 'none'; 

        let container = document.getElementById('matryoshka-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'matryoshka-container';
            container.style.width = '100%';
            container.style.marginBottom = '20px';
            profileSelect.parentNode.insertBefore(container, profileSelect.nextSibling);
        }

        let html = '';
        const defaultSedeId = State.activeSede || Object.keys(State.appStructure.sedi)[0];

        // Profilo Root integrato con sfondo già attivo (auto-selected)
        html += `<div class="matryoshka-op" id="matryoshka-admin" onclick="window.selectProfileMatryoshka('admin', this)" style="padding:14px; margin-bottom:12px; border:2px dashed var(--danger); border-radius:6px; font-weight:800; color:var(--danger); cursor:pointer; text-align:center; transition:all 0.2s; background:rgba(231,76,60,0.1);"><i class="fa-solid fa-user-shield"></i> ROOT (AMMINISTRATORE)</div>`;

        if (defaultSedeId && State.appStructure.sedi[defaultSedeId]) {
            const sede = State.appStructure.sedi[defaultSedeId];
            if (sede.roles && sede.roles.length > 0) {
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
        container.innerHTML = html;
    }

    const authScreen = document.getElementById('auth-screen');
    const appWrapper = document.getElementById('app-wrapper');
    if (authScreen && appWrapper) {
        appWrapper.style.display = 'none';
        authScreen.style.display = 'flex';
        authScreen.classList.add('active');
    }

    console.log("[BOOTLOADER] Sistema armato e pre-selezionato su ROOT.");
});

// === MOTORE LOGICO MATRIOSKA ===
window.toggleMatryoshka = (teamId) => {
    const content = document.getElementById(`content-${teamId}`);
    const icon = document.getElementById(`icon-${teamId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
};

window.selectProfileMatryoshka = (profileId, element) => {
    window._selectedLoginProfile = profileId;
    
    document.querySelectorAll('.matryoshka-op').forEach(el => {
        if (el.id === 'matryoshka-admin') {
            el.style.background = 'transparent';
        } else {
            el.style.borderColor = 'transparent';
            el.style.background = 'rgba(255,255,255,0.03)';
            const userIcon = el.querySelector('.fa-user');
            if (userIcon) userIcon.style.color = 'var(--text-muted)';
        }
    });

    if (profileId === 'admin') {
        if (element) element.style.background = 'rgba(231,76,60,0.1)';
    } else {
        if (element) {
            element.style.borderColor = 'var(--accent)';
            element.style.background = 'rgba(201,164,100,0.1)';
            const userIcon = element.querySelector('.fa-user');
            if (userIcon) userIcon.style.color = 'var(--accent)';
        }
    }
};
