// File: js/app.js
import { lazzaro_init } from './core/lazzaro.js';
import { State } from './core/state.js';
import './core/ledger.js';
import './ui/renderer.js';
import './ui/nexus.js';

window._selectedLoginProfile = 'admin';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

        const dbReady = await lazzaro_init();
        if (!dbReady) { alert("ERRORE AVVIO DATABASE"); return; }

        if (!State.appStructure) State.appStructure = { sedi: {} };
        if (!State.appStructure.sedi) State.appStructure.sedi = {};

        const activeSession = sessionStorage.getItem('scutum_active_session');
        if (activeSession) {
            State.activeProfile = activeSession;
            const authScreen = document.getElementById('auth-screen');
            const appWrapper = document.getElementById('app-wrapper');
            if (authScreen && appWrapper) {
                authScreen.style.display = 'none';
                appWrapper.style.display = 'flex';
                appWrapper.classList.add('active');
            }
            window.renderApp();
            return;
        }

        const passInput = document.getElementById('login-password');
        if (passInput) {
            let container = document.getElementById('matryoshka-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'matryoshka-container';
                container.style.width = '100%';
                passInput.parentNode.insertBefore(container, passInput);
            }

            let html = `<div id="root-auth-vault" style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed var(--surface-variant);"><div style="font-size: 0.7rem; color: var(--danger); font-weight: 800; letter-spacing: 1.5px; margin-bottom: 10px;">DIREZIONE GENERALE</div><div class="matryoshka-op" id="matryoshka-admin" onclick="window.selectProfileMatryoshka('admin', this)" style="padding:16px; border:2px dashed var(--danger); border-radius:var(--radius-md); font-weight:800; color:var(--danger); cursor:pointer; text-align:center; background:rgba(255,180,171,0.1);">TERMINALE ROOT (ADMIN)</div></div><div id="operators-auth-vault"><div style="font-size: 0.7rem; color: var(--accent); font-weight: 800; letter-spacing: 1.5px; margin-bottom: 12px;">SQUADRE OPERATIVE</div>`;

            let hasOperators = false;
            const defaultSedeId = State.activeSede || Object.keys(State.appStructure.sedi)[0];

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
                        html += `<div class="matryoshka-team" style="margin-bottom:8px; border-radius:var(--radius-md); background:var(--surface-variant); overflow:hidden;"><div onclick="window.toggleMatryoshka('${safeTeamId}')" style="padding:16px; font-weight:800; color:var(--text-main); cursor:pointer; display:flex; justify-content:space-between; align-items:center;"><span>${team}</span><i class="fa-solid fa-chevron-down" id="icon-${safeTeamId}" style="color:var(--accent);"></i></div><div id="content-${safeTeamId}" style="display:none; flex-direction:column; gap:6px; padding:8px 12px 12px 12px; background:rgba(0,0,0,0.1);">`;
                        teams[team].forEach(op => {
                            html += `<div class="matryoshka-op" onclick="window.selectProfileMatryoshka('${op.id}', this)" style="padding:14px; background:transparent; border-radius:var(--radius-sm); cursor:pointer; border:2px solid transparent; font-weight:700;">${op.name.toUpperCase()}</div>`;
                        });
                        html += `</div></div>`;
                    });
                }
            }

            if (!hasOperators) {
                html += `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:20px; border-radius:var(--radius-md); background:var(--surface-variant);">Nessun operatore configurato. Accedere come ROOT.</div>`;
            }

            html += `</div>`;
            container.innerHTML = html;
            passInput.placeholder = "PIN ROOT";
        }

        const authScreen = document.getElementById('auth-screen');
        if (authScreen) { authScreen.style.display = 'flex'; authScreen.classList.add('active'); }
    } catch (error) {
        console.error("[FATAL ERROR]", error);
    }
});

window.toggleMatryoshka = (teamId) => {
    const c = document.getElementById(`content-${teamId}`);
    const i = document.getElementById(`icon-${teamId}`);
    if (!c) return;
    if (c.style.display === 'none') { c.style.display = 'flex'; if (i) i.style.transform = 'rotate(180deg)'; }
    else { c.style.display = 'none'; if (i) i.style.transform = 'rotate(0deg)'; }
};

window.selectProfileMatryoshka = (id, el) => {
    window._selectedLoginProfile = id;
    const pass = document.getElementById('login-password');
    document.querySelectorAll('.matryoshka-op').forEach(e => {
        if (e.id === 'matryoshka-admin') { e.style.background = 'rgba(255,180,171,0.1)'; e.style.borderColor = 'dashed var(--danger)'; }
        else { e.style.borderColor = 'transparent'; e.style.background = 'transparent'; }
    });
    if (id === 'admin') {
        if (el) { el.style.background = 'rgba(255,180,171,0.2)'; el.style.borderColor = 'solid var(--danger)'; }
        if (pass) pass.placeholder = "PIN ROOT";
    } else {
        if (el) { el.style.borderColor = 'var(--accent)'; el.style.background = 'rgba(168,199,250,0.15)'; }
        if (pass) pass.placeholder = "PIN Operatore";
    }
};
