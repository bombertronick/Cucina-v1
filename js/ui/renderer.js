// File: js/ui/renderer.js
import { State } from '../core/state.js';
import { Cerbero } from '../core/cerbero.js';
import { lazzaro_stampMutation, lazzaro_saveState } from '../core/lazzaro.js';
import { Ledger } from '../core/ledger.js';

/**
 * ============================================================================
 * 1. CONTROLLER ACCESSO (LOGIN MATRIOSKA CON HARD-BYPASS ROOT E AUDIT LOG)
 * ============================================================================
 */
window.performLogin = async () => {
    console.log("[AUTH] Sequenza di innesco avviata...");
    
    const profileId = window._selectedLoginProfile || 'admin';
    const pinInput = document.getElementById('login-password').value;

    // HARD-BYPASS ROOT
    if (profileId === 'admin' && pinInput === '2002') {
        State.activeProfile = 'admin';
        sessionStorage.setItem('scutum_active_session', 'admin');
        await Ledger.logAction('admin', 'LOGIN_ROOT', { method: 'Master Override' });
        
        document.getElementById('login-password').value = '';
        document.getElementById('login-lockout-msg').style.display = 'none';
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('app-wrapper').classList.add('active');
        
        window.renderApp();
        if (window.showToast) window.showToast("Terminale ROOT sbloccato.", "success");
        return; 
    }

    // FLUSSO OPERATORI STANDARD
    if (!profileId) {
        if (window.showToast) window.showToast("Seleziona la Squadra Operativa prima di inserire il PIN.", "error");
        return;
    }

    let actualPin = '';
    try {
        const sede = State.appStructure.sedi[State.activeSede || Object.keys(State.appStructure.sedi || {})[0]];
        const role = sede ? sede.roles.find(r => r.id === profileId) : null;
        if (role) actualPin = role.pin;
    } catch (err) {
        if (window.showToast) window.showToast("Errore critico lettura matrice dati.", "error");
        return;
    }

    const auth = Cerbero.cerbero_validatePin(profileId, pinInput, actualPin);

    if (auth.success) {
        State.activeProfile = profileId;
        sessionStorage.setItem('scutum_active_session', profileId);
        await Ledger.logAction(profileId, 'LOGIN_OPERATORE', { status: 'Autorizzato' });
        
        document.getElementById('login-password').value = '';
        document.getElementById('login-lockout-msg').style.display = 'none';
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('app-wrapper').classList.add('active');
        
        window.renderApp();
        if (window.showToast) window.showToast("Accesso autorizzato.", "success");
    } else {
        document.getElementById('login-password').value = '';
        await Ledger.logAction(profileId, 'LOGIN_FALLITO', { reason: auth.reason });
        
        if (auth.reason === 'LOCKOUT_TRIGGERED' || auth.reason === 'LOCKED') {
            const lockoutMsg = document.getElementById('login-lockout-msg');
            const btnLogin = document.getElementById('btn-login');
            const inputPassword = document.getElementById('login-password');

            if (btnLogin) { btnLogin.style.pointerEvents = 'none'; btnLogin.style.opacity = '0.5'; }
            if (inputPassword) inputPassword.disabled = true;

            lockoutMsg.style.display = 'block';
            document.getElementById('lockout-timer').innerText = auth.timeLeft;
            if (window.haptic) window.haptic([100, 50, 100]); 
            
            if (window._cerberoLockInterval) clearInterval(window._cerberoLockInterval);
            
            let timeLeft = auth.timeLeft;
            window._cerberoLockInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(window._cerberoLockInterval);
                    lockoutMsg.style.display = 'none';
                    if (btnLogin) { btnLogin.style.pointerEvents = 'auto'; btnLogin.style.opacity = '1'; }
                    if (inputPassword) inputPassword.disabled = false;
                } else {
                    document.getElementById('lockout-timer').innerText = timeLeft;
                }
            }, 1000);
        } else {
            if (window.showToast) window.showToast(`PIN ERRATO. Tentativi rimasti: ${auth.attemptsLeft}`, "error");
        }
    }
};

window.performLogout = async () => {
    if (!confirm("Sei sicuro di voler chiudere la sessione operativa?")) return;
    if (State.activeProfile) await Ledger.logAction(State.activeProfile, 'LOGOUT', {});
    sessionStorage.removeItem('scutum_active_session');
    window._selectedLoginProfile = null;
    State.activeProfile = null;
    window.location.reload(true);
};

/**
 * ============================================================================
 * 2. UTILITY DI SISTEMA E MUTATORI OPERATIVI (CON TRACKING LIBRERIA)
 * ============================================================================
 */
window.toggleTheme = async () => {
    State.currentTheme = State.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', State.currentTheme);
    await lazzaro_saveState();
};

window.togglePeakOverride = async () => {
    State.peakOverride = !State.peakOverride;
    await lazzaro_saveState();
    window.renderApp();
    if (window.showToast) window.showToast(State.peakOverride ? "ALTO CARICO ATTIVO (Soglie Max)" : "MODALITÀ STANDARD", State.peakOverride ? "warning" : "info");
};

window.shareApp = async () => {
    if (navigator.share) {
        try { await navigator.share({ title: 'Scutum ERP', text: 'Accesso Nodo Operativo', url: window.location.href }); } 
        catch (err) { console.log("Condivisione annullata."); }
    } else {
        navigator.clipboard.writeText(window.location.href);
        if (window.showToast) window.showToast("Link di sistema copiato negli appunti.", "info");
    }
};

window.hf_stepQty = (stateKey, amount) => {
    let current = Cerbero.cerbero_sanitizeNumber(State.appState[stateKey]?.n_op || '0');
    current += amount;
    if (current < 0) current = 0;
    
    lazzaro_stampMutation(stateKey, 'n_op', current.toString());
    window.renderApp();
    
    if (window.haptic) window.haptic(15);
    Ledger.logAction(State.activeProfile || 'Sconosciuto', 'VARIAZIONE_INVENTARIO_RAPIDA', { key: stateKey, qty: current });
};

window.hf_updateQty = (stateKey, value) => {
    const cleanValue = Cerbero.cerbero_sanitizeNumber(value);
    lazzaro_stampMutation(stateKey, 'n_op', cleanValue.toString());
    window.renderApp();
    Ledger.logAction(State.activeProfile || 'Sconosciuto', 'MODIFICA_INVENTARIO', { key: stateKey, qty: cleanValue });
};

window.hf_updateNote = (stateKey, value) => {
    const cleanNote = Cerbero.cerbero_sanitizeText(value);
    lazzaro_stampMutation(stateKey, 'note', cleanNote);
    Ledger.logAction(State.activeProfile || 'Sconosciuto', 'MODIFICA_NOTA', { key: stateKey });
};

window.toggleDone = (stateKey) => {
    const currentState = State.appState[stateKey]?.done || false;
    lazzaro_stampMutation(stateKey, 'done', !currentState);
    window.renderApp();
    
    if (window.haptic) window.haptic(20);
    Ledger.logAction(State.activeProfile || 'Sconosciuto', 'STATO_TASK_ALTERATO', { key: stateKey, done: !currentState });
};
/**
 * ============================================================================
 * 3. SPOKE ENGINE (MOTORE DI RENDERING DOM E VIRTUALIZZAZIONE)
 * ============================================================================
 */
window.renderApp = () => {
    if (!State.activeProfile) return;

    // 1. Sidebar: Info Utente
    const profileName = State.activeProfile === 'admin' ? 'ROOT (DIREZIONE)' : State.activeProfile.toUpperCase();
    const userLabel = document.getElementById('current-user-label');
    if (userLabel) userLabel.innerText = profileName;

    // 2. Sidebar: Menu Sedi e Strumenti Amministrativi
    const sediMenu = document.getElementById('sedi-menu');
    if (sediMenu) {
        let html = '';
        Object.keys(State.appStructure.sedi || {}).forEach(sedeId => {
            const s = State.appStructure.sedi[sedeId];
            const isActive = State.activeSede === sedeId ? 'active' : '';
            html += `<div class="nav-item ${isActive}" onclick="window.switchSede('${sedeId}')"><i class="fa-solid fa-location-dot" style="width:20px;"></i> ${s.name.toUpperCase()}</div>`;
        });

        if (State.activeProfile === 'admin') {
            html += `
            <div style="margin-top:16px; border-top:1px dashed var(--surface-variant); padding-top:16px; display:flex; flex-direction:column; gap:6px;">
                <div style="font-size:0.65rem; color:var(--danger); font-weight:800; letter-spacing:1.5px; margin-bottom:4px;"><i class="fa-solid fa-lock"></i> ROOT VAULT</div>
                <div class="nav-item" onclick="window.openSystemSettings()"><i class="fa-solid fa-gear" style="width:20px;"></i> Impostazioni Sistema</div>
                <div class="nav-item" onclick="window.openLedgerModal()"><i class="fa-solid fa-book-journal-whills" style="width:20px;"></i> Libro Mastro</div>
                <div class="nav-item" onclick="window.openModal_Sede()"><i class="fa-solid fa-plus" style="width:20px;"></i> Nuova Sede (Hub)</div>
                <div class="nav-item" onclick="window.openModal_Roles()"><i class="fa-solid fa-users-gear" style="width:20px;"></i> Gestione Operatori</div>
            </div>`;
        }

        html += `
        <div style="margin-top:16px; border-top:1px dashed var(--surface-variant); padding-top:16px;">
            <button onclick="window.performLogout()" class="btn-action" style="width:100%; background:rgba(255,180,171,0.1); color:var(--danger); justify-content:flex-start; border:1px dashed var(--danger);"><i class="fa-solid fa-power-off"></i> DISCONNETTI</button>
        </div>`;
        sediMenu.innerHTML = html;
    }

    // 3. Verifica Integrità Selezione Sede
    if (!State.activeSede && Object.keys(State.appStructure.sedi || {}).length > 0) {
        State.activeSede = Object.keys(State.appStructure.sedi)[0];
    }
    const sedeData = State.activeSede ? State.appStructure.sedi[State.activeSede] : null;
    
    // 4. Intestazione Principale
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.innerText = sedeData ? sedeData.name : 'SISTEMA VERGINE';
    }

    // 5. Menu Turni (Folder Tabs)
    const foldersMenu = document.getElementById('folders-menu');
    const mainContent = document.getElementById('main-content');
    
    if (!sedeData) {
        if (foldersMenu) foldersMenu.innerHTML = '';
        if (mainContent) mainContent.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; margin-bottom:16px; color:var(--accent);"></i><br>Nessuna Sede configurata.<br>Accedi come ROOT per inizializzare il sistema.</div>`;
        return;
    }

    if (foldersMenu) {
        let fHtml = '';
        const folders = sedeData.folders || {};
        Object.keys(folders).forEach(fId => {
            const isActive = State.activeFolder === fId ? 'active' : '';
            fHtml += `<div class="folder-tab ${isActive}" onclick="window.switchFolder('${fId}')">${folders[fId].name.toUpperCase()}</div>`;
        });
        if (State.activeProfile === 'admin') {
            fHtml += `<div class="folder-tab" onclick="window.openModal_Folder()" style="background:transparent; border:1px dashed var(--accent); color:var(--accent); cursor:pointer;"><i class="fa-solid fa-plus"></i> NUOVO TURNO</div>`;
        }
        foldersMenu.innerHTML = fHtml;
    }

    if (!State.activeFolder && Object.keys(sedeData.folders || {}).length > 0) {
        State.activeFolder = Object.keys(sedeData.folders)[0];
    }

    const folderData = State.activeFolder ? sedeData.folders[State.activeFolder] : null;

    if (!folderData) {
        if (mainContent) mainContent.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Seleziona o crea un Turno per iniziare.</div>`;
        return;
    }

    // 6. Generazione Celle Logiche (Sezioni e Prodotti)
    if (mainContent) {
        let mHtml = '';
        const sections = folderData.sections || {};
        const activeFilter = State.activeCategoryFilter || 'ALL'; // Filtro visivo
        
        Object.keys(sections).forEach(secId => {
            const sec = sections[secId];
            if (activeFilter !== 'ALL' && activeFilter !== sec.name) return; // Salta se escluso dal filtro

            const sColor = sec.color || 'var(--accent)';
            
            mHtml += `<div class="section-container" style="border-left: 4px solid ${sColor};">
                <div class="section-header">
                    <h3 style="color:${sColor}; font-weight:900; font-size:1.2rem; text-transform:uppercase; margin:0; display:flex; align-items:center; gap:8px;">
                        ${sec.icon ? `<i class="${sec.icon}"></i>` : ''} ${sec.name}
                    </h3>
                    ${State.activeProfile === 'admin' ? `
                        <div style="display:flex; gap:8px;">
                            <button onclick="window.openModal_Item('${secId}')" class="btn-action solid" style="padding:8px 16px; font-size:0.8rem;"><i class="fa-solid fa-plus"></i> AGGIUNGI</button>
                            <button onclick="window.copySectionLogic('${secId}')" class="btn-action" style="padding:8px; background:var(--surface-variant);"><i class="fa-solid fa-copy"></i></button>
                            <button onclick="window.deleteSection('${secId}')" class="btn-action" style="padding:8px; background:var(--danger); color:#000;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    ` : ''}
                </div>
                <div class="items-container">`;

            const items = sec.items || {};
            const sortedItems = Object.keys(items).sort((a,b) => (items[a].order||0) - (items[b].order||0));
            
            sortedItems.forEach(itemId => {
                const it = items[itemId];
                const stateKey = `${State.activeSede}_${State.activeFolder}_${secId}_${itemId}`;
                const itState = State.appState[stateKey] || { n_op: '', done: false, note: '' };
                const isDoneClass = itState.done ? 'done' : '';
                
                mHtml += `<div class="item-row ${isDoneClass}">
                    <div class="item-main">
                        <div class="item-name-group">
                            <span class="item-name" style="color:var(--text-main);">${it.name.toUpperCase()}</span>
                            ${it.type === 'magazzino' ? `<span style="font-size:0.75rem; color:var(--accent); font-weight:800;">TARGET TARGET: ${State.peakOverride ? (it.th_peak||0) : (it.th_std||0)} ${it.unit||'pz'}</span>` : ''}
                        </div>`;

                if (it.type === 'magazzino') {
                    mHtml += `
                        <div class="item-controls">
                            <button class="btn-action" onclick="window.hf_stepQty('${stateKey}', -1)" style="padding:10px 16px; background:var(--surface); border:1px solid var(--surface-variant);"><i class="fa-solid fa-minus"></i></button>
                            <input type="number" inputmode="numeric" value="${itState.n_op}" onchange="window.hf_updateQty('${stateKey}', this.value)" style="width:70px; text-align:center; font-size:1.1rem; font-weight:900; background:var(--bg); border:none; border-radius:var(--radius-sm); color:var(--text-main); padding:10px;">
                            <button class="btn-action" onclick="window.hf_stepQty('${stateKey}', 1)" style="padding:10px 16px; background:var(--surface); border:1px solid var(--surface-variant);"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    `;
                } else if (it.type === 'task') {
                    mHtml += `
                        <div class="item-controls">
                            <div class="custom-checkbox ${itState.done ? 'checked' : ''}" onclick="window.toggleDone('${stateKey}')">
                                ${itState.done ? '<i class="fa-solid fa-check"></i>' : ''}
                            </div>
                        </div>
                    `;
                }

                mHtml += `</div>`; // Chiude item-main

                if (State.activeProfile === 'admin') {
                    mHtml += `
                    <div style="display:flex; gap:8px; margin-top:8px; border-top:1px dashed rgba(255,255,255,0.05); padding-top:8px;">
                        <button onclick="window.deleteItem('${secId}', '${itemId}')" class="btn-action" style="padding:6px 12px; font-size:0.75rem; background:rgba(255,180,171,0.1); color:var(--danger); border:none;"><i class="fa-solid fa-trash"></i> Rimuovi</button>
                    </div>`;
                }
                
                mHtml += `</div>`; // Chiude item-row
            });

            mHtml += `</div></div>`; // Chiude items-container e section-container
        });

        if (State.activeProfile === 'admin') {
            mHtml += `
            <div style="margin-top:24px; text-align:center;">
                <button onclick="window.openModal_Section()" class="btn-action" style="border:2px dashed var(--surface-variant); background:transparent; color:var(--text-muted); width:100%; padding:16px;">
                    <i class="fa-solid fa-plus"></i> CREA NUOVA CELLA LOGICA
                </button>
            </div>`;
        }

        mainContent.innerHTML = mHtml;
        
        // 7. Render Filtri Categorie nella Sidebar
        const catMenu = document.getElementById('categories-filter-menu');
        if (catMenu) {
            let catHtml = `<div class="nav-item ${activeFilter === 'ALL' ? 'active' : ''}" onclick="window.setCategoryFilter('ALL')"><i class="fa-solid fa-layer-group" style="width:20px;"></i> MOSTRA TUTTO</div>`;
            Object.keys(sections).forEach(secId => {
                const sec = sections[secId];
                catHtml += `<div class="nav-item ${activeFilter === sec.name ? 'active' : ''}" onclick="window.setCategoryFilter('${sec.name}')" style="border-left:3px solid ${sec.color || 'var(--accent)'}; margin-left:4px;"><i class="fa-solid fa-filter" style="width:20px; font-size:0.8em;"></i> ${sec.name.toUpperCase()}</div>`;
            });
            catMenu.innerHTML = catHtml;
        }
    }
};

window.setCategoryFilter = (filterName) => {
    State.activeCategoryFilter = filterName;
    window.renderApp();
};
