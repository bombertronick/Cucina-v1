// File: js/ui/renderer.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js'; // FIX: Importazione stabile in cima

/**
 * ============================================================================
 * CONTROLLER DI ACCESSO E PERMESSI (RBAC)
 * ============================================================================
 */
function applyRolePermissions() {
    const isAdmin = State.activeProfile === 'admin';
    const pasteBtn = document.getElementById('floating-paste-btn');
    if (pasteBtn) {
        pasteBtn.style.display = (isAdmin && State.clipboardSection) ? 'flex' : 'none';
    }
    
    const userLabel = document.getElementById('current-user-label');
    if (userLabel) {
        if (isAdmin) {
            userLabel.innerText = 'ROOT (AMMINISTRATORE)';
        } else {
            let opName = 'OPERATORE STANDARD';
            if (State.activeSede && State.appStructure.sedi[State.activeSede].roles) {
                const op = State.appStructure.sedi[State.activeSede].roles.find(r => r.id === State.activeProfile);
                if (op) opName = op.name.toUpperCase();
            }
            userLabel.innerText = opName;
        }
    }
}

/**
 * ============================================================================
 * STEPPER MATEMATICO DINAMICO PER TIPOLOGIA MAGAZZINO
 * ============================================================================
 */
window.hf_stepQty = async (stateKey, amount) => {
    if (!State.appState[stateKey]) {
        State.appState[stateKey] = { done: false, n_op: '0', note: '' };
    }
    let current = parseFloat(State.appState[stateKey].n_op) || 0;
    current += amount;
    if (current < 0) current = 0;
    State.appState[stateKey].n_op = current.toString();
    
    window.renderApp();
    await saveState(); // FIX: Salvataggio istantaneo sicuro
    if (window.haptic) window.haptic(15);
};

// FIX: PONTE DI COMPATIBILITÀ PER INDEX.HTML
window.renderNexusHub = () => {
    if (window.hf_renderNexusHub) window.hf_renderNexusHub();
};

/**
 * ============================================================================
 * RENDERER PRINCIPALE
 * ============================================================================
 */
window.renderApp = () => {
    if (!State.activeSede && Object.keys(State.appStructure.sedi).length > 0) {
        State.activeSede = Object.keys(State.appStructure.sedi)[0];
    }
    
    applyRolePermissions();
    renderSidebar();
    renderFolders();
    renderMainContent();
};

/**
 * ============================================================================
 * RENDERER: SIDEBAR LOGISTICA INTERATTIVA
 * ============================================================================
 */
function renderSidebar() {
    const sediMenu = document.getElementById('sedi-menu');
    if (!sediMenu) return;
    
    const isAdmin = State.activeProfile === 'admin';
    sediMenu.innerHTML = '';

    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        const div = document.createElement('div');
        div.className = 'nav-item ' + (State.activeSede === sedeId ? 'active' : '');
        div.innerHTML = '<i class="fa-solid fa-shield"></i> ' + sede.name;
        
        div.onclick = () => {
            State.activeSede = sedeId;
            State.activeFolder = Object.keys(State.appStructure.sedi[sedeId].folders)[0] || null;
            State.activeFilter = null; 
            window.renderApp();
            if(window.innerWidth <= 768) document.getElementById('main-sidebar').classList.remove('open');
        };

        if (isAdmin) {
            let pressTimer;
            div.onmousedown = div.ontouchstart = () => { pressTimer = window.setTimeout(() => window.editSede(sedeId), 800); };
            div.onmouseup = div.ontouchend = () => { clearTimeout(pressTimer); };
        }
        sediMenu.appendChild(div);
    });

    if (isAdmin) {
        const addSedeBtn = document.createElement('div');
        addSedeBtn.className = 'nav-item add-btn';
        addSedeBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Nuova Rete (Sede)';
        addSedeBtn.onclick = () => window.openSedeModal();
        sediMenu.appendChild(addSedeBtn);

        const operatorBtn = document.createElement('div');
        operatorBtn.className = 'nav-item';
        operatorBtn.style.marginTop = '16px';
        operatorBtn.style.color = 'var(--accent)';
        operatorBtn.style.border = '1px solid rgba(201, 164, 100, 0.3)';
        operatorBtn.style.background = 'rgba(201, 164, 100, 0.05)';
        operatorBtn.innerHTML = '<i class="fa-solid fa-users"></i> GESTIONE OPERATORI';
        operatorBtn.onclick = () => { 
            window.openOperatorListModal(); 
            if(window.innerWidth <= 768) document.getElementById('main-sidebar').classList.remove('open');
        };
        sediMenu.appendChild(operatorBtn);

        const cloudBtn = document.createElement('div');
        cloudBtn.className = 'nav-item';
        cloudBtn.style.marginTop = '8px';
        cloudBtn.style.color = 'var(--nexus)';
        cloudBtn.style.border = '1px solid rgba(155, 89, 182, 0.3)';
        cloudBtn.style.background = 'rgba(155, 89, 182, 0.05)';
        cloudBtn.innerHTML = '<i class="fa-solid fa-database"></i> CONFIGURA CLOUD VAULT';
        cloudBtn.onclick = () => { 
            window.openCloudModal(); 
            if(window.innerWidth <= 768) document.getElementById('main-sidebar').classList.remove('open');
        };
        sediMenu.appendChild(cloudBtn);
    }

    const filtersMenu = document.getElementById('categories-filter-menu');
    if (!filtersMenu) return;
    filtersMenu.innerHTML = '';
    
    const allFilter = document.createElement('div');
    allFilter.className = 'nav-item ' + (!State.activeFilter ? 'active' : '');
    allFilter.innerHTML = '<i class="fa-solid fa-border-all"></i> Spazio Globale';
    allFilter.onclick = () => { State.activeFilter = null; window.renderApp(); };
    filtersMenu.appendChild(allFilter);

    const categories = getUniqueCategories(State.activeSede);
    categories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'nav-item ' + (State.activeFilter === cat.name ? 'active' : '');
        catDiv.innerHTML = '<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:' + cat.color + '; margin-right:12px;"></span> ' + cat.name;
        catDiv.onclick = () => { State.activeFilter = cat.name; window.renderApp(); };
        filtersMenu.appendChild(catDiv);
    });
}

/**
 * ============================================================================
 * RENDERER: TURNI OPERATIVI (FOLDERS)
 * ============================================================================
 */
function renderFolders() {
    const foldersMenu = document.getElementById('folders-menu');
    if (!foldersMenu) return;
    
    const isAdmin = State.activeProfile === 'admin';
    foldersMenu.innerHTML = '';

    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) return;

    const folders = State.appStructure.sedi[State.activeSede].folders;

    Object.keys(folders).forEach(folderId => {
        const folder = folders[folderId];
        const btn = document.createElement('button');
        btn.className = 'folder-tab ' + (State.activeFolder === folderId ? 'active' : '');
        btn.innerText = folder.name;
        
        btn.onclick = () => {
            State.activeFolder = folderId;
            State.activeFilter = null;
            window.renderApp();
        };

        if (isAdmin) {
            let pressTimer;
            btn.onmousedown = btn.ontouchstart = () => { pressTimer = window.setTimeout(() => window.editFolder(folderId), 800); };
            btn.onmouseup = btn.ontouchend = () => { clearTimeout(pressTimer); };
        }
        foldersMenu.appendChild(btn);
    });

    if (isAdmin) {
        const addFolderBtn = document.createElement('button');
        addFolderBtn.className = 'folder-tab add';
        addFolderBtn.style.borderStyle = 'dashed';
        addFolderBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Nuovo Turno';
        addFolderBtn.onclick = () => window.openFolderModal();
        foldersMenu.appendChild(addFolderBtn);
    }
}

/**
 * ============================================================================
 * RENDERER: MATRICE BRUTALISTA E CONTROLLI CONDIZIONALI
 * ============================================================================
 */
function renderMainContent() {
    const content = document.getElementById('main-content');
    const headerTitle = document.getElementById('header-title');
    if (!content || !headerTitle) return;
    
    const isAdmin = State.activeProfile === 'admin';
    content.innerHTML = '';

    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) {
        headerTitle.innerText = "SISTEMA VERGINE - CREA UNA SEDE";
        return;
    }

    if (!State.activeFolder || !State.appStructure.sedi[State.activeSede].folders[State.activeFolder]) {
        headerTitle.innerText = "NESSUN TURNO ATTIVO";
        return;
    }

    const currentSedeName = State.appStructure.sedi[State.activeSede].name;
    const currentFolderName = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].name;
    
    let killSwitchHtml = '';
    if (isAdmin) {
        killSwitchHtml = '<button class="btn-action solid" style="background:var(--danger); color:var(--bg); border:none; padding:6px 12px; margin-left:16px; font-size:0.75rem; width:auto; display:inline-block;" onclick="window.nukeCurrentTurnLogic()"><i class="fa-solid fa-radiation"></i> RESET</button>';
    }

    headerTitle.innerHTML = currentSedeName + ' // ' + currentFolderName + killSwitchHtml;

    const sections = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections;

    Object.keys(sections).forEach(sectionId => {
        const section = sections[sectionId];
        
        if (State.activeFilter && section.name !== State.activeFilter) return;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.style.borderTop = '4px solid ' + section.color;
        
        let adminActions = '';
        if (isAdmin) {
            adminActions = '<div style="display:flex; gap:16px;">' +
                           '<i class="fa-solid fa-copy" style="cursor:pointer; color:var(--text-muted);" onclick="window.copySection(\'' + sectionId + '\')"></i>' +
                           '<i class="fa-solid fa-pen" style="cursor:pointer; color:var(--text-muted);" onclick="window.editSection(\'' + sectionId + '\')"></i>' +
                           '</div>';
        }

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.innerHTML = '<h3 style="color: ' + section.color + '; text-transform: uppercase; letter-spacing: 1px; margin:0;">' + section.name + '</h3>' + adminActions;
        sectionDiv.appendChild(sectionHeader);

        section.items.forEach((item) => {
            const stateKey = State.activeSede + '_' + State.activeFolder + '_' + sectionId + '_' + item.id;
            const itemState = State.appState[stateKey] || { done: false, n_op: '', note: '' };
            
            let typeBadge = '';
            if (item.type === 'magazzino') {
                typeBadge = '<span style="font-size:0.7rem; font-weight:800; padding:2px 6px; border-radius:4px; background:#3498db20; color:#3498db;"><i class="fa-solid fa-calculator"></i> CONVERSIONE (Ideal: ' + (item.idealQty || 0) + ' ' + (item.uom || 'pz') + ')</span>';
            }

            let supplierBadge = '';
            if (item.supplier) {
                supplierBadge = '<span style="font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); color:var(--text-muted);"><i class="fa-solid fa-truck"></i> ' + item.supplier + (item.sku ? ' ['+item.sku+']' : '') + '</span>';
            }
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-row ' + (itemState.done ? 'done' : '');
            
            let controlsHtml = '';
            
            if (item.type === 'magazzino') {
                controlsHtml = `
                <div class="item-controls">
                    <div style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:2px 4px;">
                        <button onclick="window.hf_stepQty('${stateKey}', -1)" style="background:none; border:none; color:var(--accent); font-size:1.2rem; font-weight:800; width:32px; height:32px; cursor:pointer;">-</button>
                        <input type="number" class="qty-input" value="${itemState.n_op || ''}" placeholder="0" style="width:50px; text-align:center; border:none; background:none; color:var(--text-main); font-weight:700; font-size:1.1rem;" onchange="window.updateItemData('${stateKey}', 'n_op', this.value); window.renderApp();">
                        <button onclick="window.hf_stepQty('${stateKey}', 1)" style="background:none; border:none; color:var(--accent); font-size:1.2rem; font-weight:800; width:32px; height:32px; cursor:pointer;">+</button>
                    </div>
                    <span class="unit-label" style="font-weight:700; color:var(--text-muted); min-width:30px;">${item.uom || 'pz'}</span>
                </div>`;
            } else {
                let checkboxHtml = itemState.done ? '<i class="fa-solid fa-check"></i>' : '';
                controlsHtml = `
                <div class="item-controls">
                    <div class="input-group-inline">
                        <input type="number" class="qty-input" value="${itemState.n_op || ''}" placeholder="Qt." onchange="window.updateItemData('${stateKey}', 'n_op', this.value)">
                        <span class="unit-label">${item.uom || 'pz'}</span>
                    </div>
                    <div class="custom-checkbox ${itemState.done ? 'checked' : ''}" onclick="window.toggleDone('${stateKey}')">${checkboxHtml}</div>
                </div>`;
            }

            itemDiv.innerHTML = `
                <div class="item-main">
                    <div class="item-name-group">
                        <span class="item-name">${item.name}</span>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">${typeBadge} ${supplierBadge}</div>
                    </div>
                    ${controlsHtml}
                </div>
                <div class="item-sub" style="margin-top: 8px;">
                    <input type="text" class="note-input" value="${itemState.note || ''}" placeholder="Aggiungi nota di deficit..." onchange="window.updateItemData('${stateKey}', 'note', this.value)">
                </div>`;

            if (isAdmin) {
                let pressTimer;
                itemDiv.onmousedown = itemDiv.ontouchstart = () => { pressTimer = window.setTimeout(() => window.hf_editItemModal(sectionId, item.id), 800); };
                itemDiv.onmouseup = itemDiv.ontouchend = () => { clearTimeout(pressTimer); };
            }

            sectionDiv.appendChild(itemDiv);
        });

        if (isAdmin) {
            const addItemBtn = document.createElement('button');
            addItemBtn.className = 'btn-action';
            addItemBtn.style.margin = '16px';
            addItemBtn.style.width = 'calc(100% - 32px)';
            addItemBtn.style.border = '1px dashed var(--border)';
            addItemBtn.innerHTML = '<i class="fa-solid fa-plus"></i> AGGIUNGI PRODOTTO';
            addItemBtn.onclick = () => window.hf_openItemModal(sectionId);
            sectionDiv.appendChild(addItemBtn);
        }

        content.appendChild(sectionDiv);
    });

    if (isAdmin && !State.activeFilter) {
        const addSectionBtn = document.createElement('button');
        addSectionBtn.className = 'btn-action';
        addSectionBtn.style.width = '100%';
        addSectionBtn.style.marginTop = '24px';
        addSectionBtn.style.border = '1px dashed var(--text-muted)';
        addSectionBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i> CREA NUOVA CELLA LOGICA';
        addSectionBtn.onclick = () => window.openSectionModal();
        content.appendChild(addSectionBtn);
    }
}

/**
 * ============================================================================
 * UTILITY STRUTTURALI CROMATICHE
 * ============================================================================
 */
function getUniqueCategories(sedeId) {
    if (!sedeId || !State.appStructure.sedi[sedeId]) return [];
    const categoriesMap = new Map();
    const folders = State.appStructure.sedi[sedeId].folders;
    
    Object.values(folders).forEach(folder => {
        if (folder.sections) {
            Object.values(folder.sections).forEach(section => {
                if (!categoriesMap.has(section.name)) {
                    categoriesMap.set(section.name, section.color);
                }
            });
        }
    });
    
    return Array.from(categoriesMap, ([name, color]) => ({ name, color }));
}
