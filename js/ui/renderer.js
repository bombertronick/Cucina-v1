// File: js/ui/renderer.js
import { State } from '../core/state.js';
import { Cerbero } from '../core/cerbero.js';
import { lazzaro_stampMutation, lazzaro_saveState } from '../core/lazzaro.js';

/**
 * CONTROLLER ACCESSO (LOGIN A FISARMONICA & LOCKOUT)
 */
window.performLogin = () => {
    const profileId = document.getElementById('login-profile').value;
    const pinInput = document.getElementById('login-password').value;
    
    let actualPin = '';
    if (profileId === 'admin') {
        actualPin = '2002'; // Hardcoded backdoor di sicurezza per Root
    } else {
        const sede = State.appStructure.sedi[State.activeSede || Object.keys(State.appStructure.sedi)[0]];
        const role = sede ? sede.roles.find(r => r.id === profileId) : null;
        if (role) actualPin = role.pin;
    }

    const auth = Cerbero.cerbero_validatePin(profileId, pinInput, actualPin);

    if (auth.success) {
        State.activeProfile = profileId;
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
            lockoutMsg.style.display = 'block';
            document.getElementById('lockout-timer').innerText = auth.timeLeft;
            if(window.haptic) window.haptic([100, 50, 100]); 
            
            let timeLeft = auth.timeLeft;
            const timerInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    lockoutMsg.style.display = 'none';
                } else {
                    document.getElementById('lockout-timer').innerText = timeLeft;
                }
            }, 1000);
        } else {
            if(window.showToast) window.showToast(`PIN ERRATO. Tentativi rimasti: ${auth.attemptsLeft}`, "error");
        }
    }
};

/**
 * GESTIONE TEMA E OVERRIDE DI CARICO
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
    if(window.showToast) window.showToast(State.peakOverride ? "MODALITÀ ALTO CARICO ATTIVATA (Soglie MAX)" : "MODALITÀ STANDARD RIPRISTINATA", State.peakOverride ? "error" : "info");
};

/**
 * INPUT IBRIDO BRUTALISTA (STEPPER + TESTO) E MUTAZIONI ASINCRONE
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
 * RENDERER PRINCIPALE (SPOKE ENGINE E FATTORE UMANO)
 */
window.renderApp = () => {
    if (!State.activeSede && Object.keys(State.appStructure.sedi).length > 0) {
        State.activeSede = Object.keys(State.appStructure.sedi)[0];
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

    const pasteBtn = document.getElementById('floating-paste-btn');
    if (pasteBtn) {
        pasteBtn.style.display = (isAdmin && State.clipboardSection) ? 'flex' : 'none';
    }
}

function renderSidebar() {
    const sediMenu = document.getElementById('sedi-menu');
    const isAdmin = State.activeProfile === 'admin';
    sediMenu.innerHTML = '';

    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        const div = document.createElement('div');
        div.className = 'nav-item ' + (State.activeSede === sedeId ? 'active' : '');
        div.innerHTML = `<i class="fa-solid fa-shield"></i> ${sede.name}`;
        
        div.onclick = () => {
            State.activeSede = sedeId;
            State.activeFolder = Object.keys(sede.folders)[0] || null;
            State.activeFilter = null; 
            window.renderApp();
            if(window.innerWidth <= 768) document.getElementById('main-sidebar').classList.remove('open');
        };
        if (isAdmin) {
            let pressTimer;
            div.onmousedown = div.ontouchstart = () => { pressTimer = setTimeout(() => window.editSede(sedeId), 800); };
            div.onmouseup = div.ontouchend = () => clearTimeout(pressTimer);
        }
        sediMenu.appendChild(div);
    });

    if (isAdmin) {
        sediMenu.innerHTML += `<div class="nav-item add-btn" onclick="window.openSedeModal()"><i class="fa-solid fa-plus"></i> Nuova Sede</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:16px; color:var(--accent); border:1px solid rgba(201,164,100,0.3); background:rgba(201,164,100,0.05);" onclick="window.openOperatorListModal()"><i class="fa-solid fa-users"></i> GESTIONE OPERATORI</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:8px; color:var(--nexus); border:1px solid rgba(155,89,182,0.3); background:rgba(155,89,182,0.05);" onclick="window.openCloudModal()"><i class="fa-solid fa-database"></i> CONFIGURA CLOUD VAULT</div>`;
        sediMenu.innerHTML += `<div class="nav-item" style="margin-top:8px; color:var(--danger); border:1px solid rgba(231,76,60,0.3); background:rgba(231,76,60,0.05);" onclick="window.togglePeakOverride()"><i class="fa-solid fa-fire"></i> ${State.peakOverride ? 'DISATTIVA ALTO CARICO' : 'FORZA ALTO CARICO (PEAK)'}</div>`;
    }

    const filtersMenu = document.getElementById('categories-filter-menu');
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

function renderFolders() {
    const foldersMenu = document.getElementById('folders-menu');
    const isAdmin = State.activeProfile === 'admin';
    foldersMenu.innerHTML = '';

    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) return;

    Object.entries(State.appStructure.sedi[State.activeSede].folders).forEach(([folderId, folder]) => {
        const btn = document.createElement('button');
        btn.className = 'folder-tab ' + (State.activeFolder === folderId ? 'active' : '');
        btn.innerText = folder.name;
        btn.onclick = () => { State.activeFolder = folderId; State.activeFilter = null; window.renderApp(); };
        if (isAdmin) {
            let pressTimer;
            btn.onmousedown = btn.ontouchstart = () => { pressTimer = setTimeout(() => window.editFolder(folderId), 800); };
            btn.onmouseup = btn.ontouchend = () => clearTimeout(pressTimer);
        }
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
        
        // Risoluzione logica Time-Gating
        itemsToRender = itemsToRender.filter(item => {
            if (State.peakOverride) return true; 
            if (!item.days || item.days.length === 0) return true; 
            return item.days.includes(currentDay);
        });

        // Ordinamento F.I.F.O. HACCP
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
            itemDiv.innerHTML = `
                <div class="item-main">
                    <div class="item-name-group">
                        <span class="item-name">${item.name}</span>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">${typeBadge} ${supplierBadge} ${expiryBadge}</div>
                    </div>
                    ${controlsHtml}
                </div>
                <div class="item-sub" style="margin-top: 8px;">
                    <input type="text" class="note-input" value="${itemState.note || ''}" placeholder="Aggiungi nota operativa..." onchange="window.hf_updateNote('${stateKey}', this.value)">
                </div>`;

            if (isAdmin) {
                let pressTimer;
                itemDiv.onmousedown = itemDiv.ontouchstart = () => { pressTimer = setTimeout(() => window.hf_editItemModal(sectionId, item.id), 800); };
                itemDiv.onmouseup = itemDiv.ontouchend = () => clearTimeout(pressTimer);
            }

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
