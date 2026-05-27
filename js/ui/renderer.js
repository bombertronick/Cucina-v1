// File: js/ui/renderer.js
import { State } from '../core/state.js';
import { Cerbero } from '../core/cerbero.js';
import { lazzaro_stampMutation, lazzaro_saveState } from '../core/lazzaro.js';

/**
 * ============================================================================
 * 1. CONTROLLER ACCESSO (LOGIN MATRIOSKA, LOCKOUT E PERSISTENZA)
 * ============================================================================
 */
window.performLogin = () => {
    const profileId = window._selectedLoginProfile;
    
    if (!profileId) {
        if (window.showToast) window.showToast("Seleziona il tuo Profilo/Reparto prima di inserire il PIN.", "error");
        else alert("Seleziona il tuo Profilo/Reparto prima di inserire il PIN.");
        return;
    }

    const pinInput = document.getElementById('login-password').value;
    
    let actualPin = '';
    if (profileId === 'admin') {
        actualPin = '2002'; 
    } else {
        const sede = State.appStructure.sedi[State.activeSede || Object.keys(State.appStructure.sedi)[0]];
        const role = sede ? sede.roles.find(r => r.id === profileId) : null;
        if (role) actualPin = role.pin;
    }

    const auth = Cerbero.cerbero_validatePin(profileId, pinInput, actualPin);

    if (auth.success) {
        State.activeProfile = profileId;
        
        // Sigillo di sessione volatile per immunizzare l'app dal refresh
        sessionStorage.setItem('scutum_active_session', profileId);
        
        document.getElementById('login-password').value = '';
        document.getElementById('login-lockout-msg').style.display = 'none';
        
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('app-wrapper').classList.add('active');
        
        window.renderApp();
    } else {
        document.getElementById('login-password').value = '';
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
            else alert(`PIN ERRATO. Tentativi rimasti: ${auth.attemptsLeft}`);
        }
    }
};

/**
 * CONTROLLER DISCONNESSIONE (DISTRUZIONE TIMEOUT E FLUSH AGENT)
 */
window.performLogout = () => {
    if (!confirm("Sei sicuro di voler chiudere la sessione operativa?")) return;
    
    sessionStorage.removeItem('scutum_active_session');
    window._selectedLoginProfile = null;
    State.activeProfile = null;
    
    window.location.reload(true);
};

/**
 * ============================================================================
 * 2. UTILITY DI SISTEMA, SUPPORTO CARICO E PEAK OVERRIDE
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
    if (window.showToast) window.showToast(State.peakOverride ? "MODALITÀ ALTO CARICO ATTIVATA (Soglie MAX)" : "MODALITÀ STANDARD RIPRISTINATA", State.peakOverride ? "error" : "info");
};

window.shareApp = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Scutum ERP V20',
                text: 'Accedi al gestionale operativo Scutum ERP',
                url: window.location.href
            });
            if (window.showToast) window.showToast("Link di condivisione generato.", "success");
        } catch (err) {
            console.log("Condivisione annullata.");
        }
    } else {
        navigator.clipboard.writeText(window.location.href);
        if (window.showToast) window.showToast("Link copiato negli appunti.", "info");
    }
};

/**
 * ============================================================================
 * 3. STRATO TRANSAZIONALE OPERATIVO (INPUT MUTATORS)
 * ============================================================================
 */
window.hf_stepQty = (stateKey, amount) => {
    let current = Cerbero.cerbero_sanitizeNumber(State.appState[stateKey]?.n_op || '0');
    current += amount;
    if (current < 0) current = 0;
    lazzaro_stampMutation(stateKey, 'n_op', current.toString());
    window.renderApp();
    if (window.haptic) window.haptic(15);
};

window.hf_updateQty = (stateKey, value) => {
    const cleanValue = Cerbero.cerbero_sanitizeNumber(value);
    lazzaro_stampMutation(stateKey, 'n_op', cleanValue.toString());
    window.renderApp();
};

window.hf_updateNote = (stateKey, value) => {
    const cleanNote = Cerbero.cerbero_sanitizeText(value);
    lazzaro_stampMutation(stateKey, 'note', cleanNote);
};

window.toggleDone = (stateKey) => {
    const currentState = State.appState[stateKey]?.done || false;
    lazzaro_stampMutation(stateKey, 'done', !currentState);
    window.renderApp();
    if (window.haptic) window.haptic(20);
};

window.switchSpaView = (viewId) => {
    document.querySelectorAll('.spa-view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = viewId === 'app-wrapper' ? 'flex' : 'block';
        target.classList.add('active');
    }
};
/**
 * ============================================================================
 * 4. RENDERER PRINCIPALE (SPOKE ENGINE CON PATCH ANTI-AMNESIA)
 * ============================================================================
 */
window.renderApp = () => {
    // 1. Auto-Recovery della Sede
    if (!State.activeSede && Object.keys(State.appStructure.sedi).length > 0) {
        State.activeSede = Object.keys(State.appStructure.sedi)[0];
    }
    
    // 2. PATCH: Auto-Recovery del Turno Operativo (Previene schermata vuota al refresh)
    if (State.activeSede && !State.activeFolder && State.appStructure.sedi[State.activeSede].folders) {
        State.activeFolder = Object.keys(State.appStructure.sedi[State.activeSede].folders)[0] || null;
    }

    document.documentElement.setAttribute('data-theme', State.currentTheme || 'dark');
    
    applyRolePermissions();
    renderSidebar();
    renderFolders();
    renderMainContent();
};

function applyRolePermissions() {
    const isAdmin = State.activeProfile === 'admin';
    const sedeStr = State.appStructure.sedi[State.activeSede];
    const profile = isAdmin ? null : (sedeStr ? sedeStr.roles.find(r => r.id === State.activeProfile) : null);
    
    const userLabel = document.getElementById('current-user-label');
    if (userLabel) userLabel.innerText = isAdmin ? 'ROOT (AMMINISTRATORE)' : (profile ? profile.name.toUpperCase() : 'OPERATORE');

    const checklistContainer = document.getElementById('spoke-checklists-container');
    if(checklistContainer) {
        checklistContainer.innerHTML = '';
        if (profile && (profile.linkApertura || profile.linkChiusura)) {
            checklistContainer.style.display = 'flex';
            if (profile.linkApertura) {
                checklistContainer.innerHTML += `<button class="btn-action solid" style="flex:1; padding:16px; background:var(--success); color:#000; font-weight:800;" onclick="window.open('${profile.linkApertura}', '_blank')"><i class="fa-solid fa-sun"></i> CHECKLIST APERTURA</button>`;
            }
            if (profile.linkChiusura) {
                checklistContainer.innerHTML += `<button class="btn-action solid" style="flex:1; padding:16px; background:var(--danger); color:#fff; font-weight:800;" onclick="window.open('${profile.linkChiusura}', '_blank')"><i class="fa-solid fa-moon"></i> CHECKLIST CHIUSURA</button>`;
            }
        } else {
            checklistContainer.style.display = 'none';
        }
    }

    const pasteBtn = document.getElementById('floating-paste-btn');
    if (pasteBtn) {
        pasteBtn.style.display = (isAdmin && State.clipboardSection) ? 'flex' : 'none';
    }
}

function renderSidebar() {
    const sediMenu = document.getElementById('sedi-menu');
    const isAdmin = State.activeProfile === 'admin';
    if(!sediMenu) return;
    sediMenu.innerHTML = '';

    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        const div = document.createElement('div');
        div.className = 'nav-item ' + (State.activeSede === sedeId ? 'active' : '');
        
        let editIcon = isAdmin ? `<i class="fa-solid fa-pen" style="margin-left:auto; color:var(--accent); padding:4px; font-size: 0.9rem;" onclick="event.stopPropagation(); window.editSede('${sedeId}');"></i>` : '';
        div.innerHTML = `<div style="display:flex; align-items:center; width:100%;"><i class="fa-solid fa-shield" style="margin-right:8px;"></i> ${sede.name} ${editIcon}</div>`;
        
        div.onclick = () => {
            State.activeSede = sedeId;
            State.activeFolder = Object.keys(sede.folders)[0] || null;
            State.activeFilter = null; 
            window.renderApp();
            if(window.innerWidth <= 768) {
                const sidebar = document.getElementById('main-sidebar');
                if(sidebar) sidebar.classList.remove('open');
            }
        };
        sediMenu.appendChild(div);
    });

    if (isAdmin) {
        sediMenu.innerHTML += `<div class="nav-item add-btn" onclick="window.openSedeModal()"><i class="fa-solid fa-plus"></i> Nuova Sede</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:16px; color:var(--accent); border:1px solid rgba(201,164,100,0.3); background:rgba(201,164,100,0.05);" onclick="window.openOperatorListModal()"><i class="fa-solid fa-users"></i> GESTIONE OPERATORI</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:8px; color:var(--nexus); border:1px solid rgba(155,89,182,0.3); background:rgba(155,89,182,0.05);" onclick="window.openCloudModal()"><i class="fa-solid fa-database"></i> CONFIGURA CLOUD VAULT</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:8px; color:var(--danger); border:1px solid rgba(231,76,60,0.3); background:rgba(231,76,60,0.05);" onclick="window.togglePeakOverride()"><i class="fa-solid fa-fire"></i> ${State.peakOverride ? 'DISATTIVA ALTO CARICO' : 'FORZA ALTO CARICO (PEAK)'}</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:8px; color:var(--success); border:1px solid rgba(46, 204, 113, 0.3); background:rgba(46, 204, 113, 0.05);" onclick="window.shareApp()"><i class="fa-solid fa-share-nodes"></i> CONDIVIDI APP</div>`;
    }

    sediMenu.innerHTML += `<div class="nav-item" style="margin-top:16px; color:var(--danger); border:1px dashed var(--danger); background:rgba(231,76,60,0.1);" onclick="window.performLogout()"><i class="fa-solid fa-right-from-bracket"></i> DISCONNETTI</div>`;

    const filtersMenu = document.getElementById('categories-filter-menu');
    if(filtersMenu) {
        filtersMenu.innerHTML = `<div class="nav-item ${!State.activeFilter ? 'active' : ''}" onclick="State.activeFilter=null; window.renderApp();"><i class="fa-solid fa-border-all"></i> Spazio Globale</div>`;
        
        if (State.activeSede && State.appStructure.sedi[State.activeSede]) {
            const catMap = new Map();
            Object.values(State.appStructure.sedi[State.activeSede].folders).forEach(f => {
                if(f.sections) Object.values(f.sections).forEach(s => catMap.set(s.name, s.color));
            });
            catMap.forEach((color, name) => {
                filtersMenu.innerHTML += `<div class="nav-item ${State.activeFilter === name ? 'active' : ''}" onclick="State.activeFilter='${name}'; window.renderApp();"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${color}; margin-right:12px;"></span> ${name}</div>`;
            });
        }
    }
}

function renderFolders() {
    const foldersMenu = document.getElementById('folders-menu');
    const isAdmin = State.activeProfile === 'admin';
    if(!foldersMenu) return;
    foldersMenu.innerHTML = '';

    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) return;

    Object.entries(State.appStructure.sedi[State.activeSede].folders).forEach(([folderId, folder]) => {
        const btn = document.createElement('button');
        btn.className = 'folder-tab ' + (State.activeFolder === folderId ? 'active' : '');
        
        let editIconHtml = isAdmin ? `<i class="fa-solid fa-pen" style="margin-left:8px; font-size:0.8rem; opacity:0.7;" onclick="event.stopPropagation(); window.editFolder('${folderId}');"></i>` : '';
        btn.innerHTML = `${folder.name} ${editIconHtml}`;
        
        btn.onclick = () => { State.activeFolder = folderId; State.activeFilter = null; window.renderApp(); };
        foldersMenu.appendChild(btn);
    });

    if (isAdmin) {
        foldersMenu.innerHTML += `<button class="folder-tab add" style="border-style:dashed;" onclick="window.openFolderModal()"><i class="fa-solid fa-plus"></i> Nuovo Turno</button>`;
    }
}

function renderMainContent() {
    const content = document.getElementById('main-content');
    const headerTitle = document.getElementById('header-title');
    const isAdmin = State.activeProfile === 'admin';
    if(!content || !headerTitle) return;
    content.innerHTML = '';

    if (!State.activeSede || !State.activeFolder) {
        headerTitle.innerText = "SISTEMA VERGINE / NESSUN TURNO";
        return;
    }

    const sedeName = State.appStructure.sedi[State.activeSede].name;
    const folderName = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].name;
    
    let killSwitchHtml = isAdmin ? `<button class="btn-action solid" style="background:var(--danger); color:var(--bg); border:none; padding:6px 12px; margin-left:16px; font-size:0.75rem; width:auto; display:inline-block;" onclick="window.nukeCurrentTurnLogic()"><i class="fa-solid fa-radiation"></i> RESET TURNO</button>` : '';
    headerTitle.innerHTML = `${sedeName} // ${folderName} ${killSwitchHtml}`;

    const currentDay = new Date().getDay(); 
    const sections = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections;

    Object.entries(sections).forEach(([sectionId, section]) => {
        if (State.activeFilter && section.name !== State.activeFilter) return;

        let itemsToRender = [...(section.items || [])];
        
        itemsToRender = itemsToRender.filter(item => {
            if (State.peakOverride) return true; 
            if (!item.days || item.days.length === 0) return true; 
            return item.days.includes(currentDay);
        });

        itemsToRender.sort((a, b) => {
            if (!a.expiry) return 1;
            if (!b.expiry) return -1;
            return new Date(a.expiry) - new Date(b.expiry);
        });

        if (itemsToRender.length === 0 && !isAdmin) return; 

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.style.borderTop = `4px solid ${section.color}`;
        
        let adminActions = isAdmin ? `<div style="display:flex; gap:16px;"><i class="fa-solid fa-copy" style="cursor:pointer; color:var(--text-muted);" onclick="window.copySection('${sectionId}')"></i><i class="fa-solid fa-pen" style="cursor:pointer; color:var(--text-muted);" onclick="window.editSection('${sectionId}')"></i></div>` : '';
        sectionDiv.innerHTML = `<div class="section-header"><h3 style="color:${section.color}; text-transform:uppercase; letter-spacing:1px; margin:0;">${section.name}</h3>${adminActions}</div>`;

        itemsToRender.forEach(item => {
            const stateKey = `${State.activeSede}_${State.activeFolder}_${sectionId}_${item.id}`;
            const itemState = State.appState[stateKey] || { done: false, n_op: '', note: '' };
            
            let targetIdeal = 0;
            if (item.type === 'magazzino') {
                if (item.dailyIdeals && item.dailyIdeals.length === 7) {
                    targetIdeal = State.peakOverride ? Math.max(...item.dailyIdeals) : item.dailyIdeals[currentDay];
                } else {
                    targetIdeal = item.idealQty || 0; 
                }
            }

            let typeBadge = item.type === 'magazzino' ? `<span style="font-size:0.7rem; font-weight:800; padding:2px 6px; border-radius:4px; background:#3498db20; color:#3498db;"><i class="fa-solid fa-calculator"></i> SOGLIA: ${targetIdeal} ${item.uom || 'pz'}</span>` : '';
            let supplierBadge = item.supplier ? `<span style="font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); color:var(--text-muted);"><i class="fa-solid fa-truck"></i> ${item.supplier}</span>` : '';
            let expiryBadge = item.expiry ? `<span style="font-size:0.7rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(231,76,60,0.1); color:var(--danger);"><i class="fa-regular fa-clock"></i> SCAD: ${new Date(item.expiry).toLocaleDateString('it-IT')}</span>` : '';

            let controlsHtml = '';
            if (item.type === 'magazzino') {
                controlsHtml = `
                <div class="item-controls">
                    <div style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:2px 4px;">
                        <button onclick="window.hf_stepQty('${stateKey}', -1)" style="background:none; border:none; color:var(--accent); font-size:1.2rem; font-weight:800; width:32px; height:32px; cursor:pointer;">-</button>
                        <input type="number" inputmode="decimal" class="qty-input" value="${itemState.n_op || ''}" placeholder="0" style="width:50px; text-align:center; border:none; background:none; color:var(--text-main); font-weight:700; font-size:1.1rem;" onchange="window.hf_updateQty('${stateKey}', this.value)">
                        <button onclick="window.hf_stepQty('${stateKey}', 1)" style="background:none; border:none; color:var(--accent); font-size:1.2rem; font-weight:800; width:32px; height:32px; cursor:pointer;">+</button>
                    </div>
                    <span class="unit-label" style="font-weight:700; color:var(--text-muted); min-width:30px;">${item.uom || 'pz'}</span>
                </div>`;
            } else {
                let checkboxHtml = itemState.done ? '<i class="fa-solid fa-check"></i>' : '';
                controlsHtml = `
                <div class="item-controls">
                    <div class="input-group-inline">
                        <input type="number" inputmode="decimal" class="qty-input" value="${itemState.n_op || ''}" placeholder="Qt." onchange="window.hf_updateQty('${stateKey}', this.value)">
                        <span class="unit-label">${item.uom || 'pz'}</span>
                    </div>
                    <div class="custom-checkbox ${itemState.done ? 'checked' : ''}" onclick="window.toggleDone('${stateKey}')">${checkboxHtml}</div>
                </div>`;
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `item-row ${itemState.done ? 'done' : ''}`;
            
            let itemEditBtn = isAdmin ? `<button style="background:none; border:none; color:var(--accent); margin-left:auto; padding:8px; cursor:pointer;" onclick="window.hf_editItemModal('${sectionId}', '${item.id}')"><i class="fa-solid fa-pen"></i></button>` : '';

            itemDiv.innerHTML = `
                <div class="item-main">
                    <div class="item-name-group" style="flex:1;">
                        <span class="item-name">${item.name}</span>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">${typeBadge} ${supplierBadge} ${expiryBadge}</div>
                    </div>
                    ${itemEditBtn}
                    ${controlsHtml}
                </div>
                <div class="item-sub" style="margin-top: 8px;">
                    <input type="text" class="note-input" value="${itemState.note || ''}" placeholder="Aggiungi nota operativa..." onchange="window.hf_updateNote('${stateKey}', this.value)">
                </div>`;

            sectionDiv.appendChild(itemDiv);
        });

        if (isAdmin) {
            sectionDiv.innerHTML += `<button class="btn-action" style="margin:16px; width:calc(100% - 32px); border:1px dashed var(--border);" onclick="window.hf_openItemModal('${sectionId}')"><i class="fa-solid fa-plus"></i> AGGIUNGI PRODOTTO</button>`;
        }
        content.appendChild(sectionDiv);
    });

    if (isAdmin && !State.activeFilter) {
        content.innerHTML += `<button class="btn-action" style="width:100%; margin-top:24px; border:1px dashed var(--text-muted);" onclick="window.openSectionModal()"><i class="fa-solid fa-layer-group"></i> CREA NUOVA CELLA LOGICA</button>`;
    }
}
