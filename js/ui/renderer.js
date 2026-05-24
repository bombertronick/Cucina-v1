// File: js/ui/renderer.js

import { State, sanitize, PALETTE } from '../core/state.js';

/**
 * ============================================================================
 * MOTORE DI RENDERING VIRTUALIZZATO (DOM Management)
 * ============================================================================
 * Disegna l'interfaccia a blocchi isolati. Utilizza `data-action` al posto 
 * degli eventi inline per delegare l'ascolto al controller globale,
 * preservando la RAM e i listener attivi.
 */

// Observer Hardware per il Lazy Loading (Evita il collasso della CPU)
const domObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
                renderTableForSection(sectionId, entry.target);
                observer.unobserve(entry.target); // Rilascia la memoria una volta renderizzato
            }
        }
    });
}, { rootMargin: '200px 0px' }); // Pre-carica 200px prima che appaia a schermo


export function applyRolePermissions() { 
    const isManager = (State.activeProfile === 'admin'); 
    document.querySelectorAll('.manager-only').forEach(el => el.style.display = isManager ? 'flex' : 'none'); 
    
    const label = document.getElementById('current-user-label'); 
    if (label) { 
        if (isManager) { 
            label.innerText = "ROOT"; 
            State.activeCatFilter = 'tutti'; 
        } else { 
            const role = State.appStructure.sedi[State.activeSede]?.roles.find(x => x.id === State.activeProfile); 
            label.innerText = role ? role.name.toUpperCase() : "OPERATORE"; 
            if (role && role.allowedCats && role.allowedCats.length > 0) {
                State.activeCatFilter = role.allowedCats[0]; 
            }
        } 
    } 
}

export function renderApp() { 
    renderSidebar(); 
    renderFolders(); 
    renderCategories(); 
    renderContentCore(); 
}

export function renderSidebar() { 
    const container = document.getElementById('sedi-menu'); 
    if (!container) return; 
    container.innerHTML = ''; 
    
    Object.values(State.appStructure.sedi).forEach(sede => { 
        const activeClass = sede.id === State.activeSede ? 'active' : '';
        let mngBtns = State.editMode ? `
            <div style="display:flex; gap:12px;">
                <i class="fa-solid fa-pen" style="color:var(--warning);" data-action="openSedeModal" data-id="${sede.id}"></i>
                <i class="fa-solid fa-trash" style="color:var(--danger);" data-action="deleteSede" data-id="${sede.id}"></i>
            </div>` : '';
            
        container.innerHTML += `
        <div class="nav-item ${activeClass}" data-action="selectSede" data-id="${sede.id}">
            <i class="fa-solid fa-shield"></i> 
            <span style="flex:1; pointer-events:none;">${sanitize(sede.name)}</span> 
            ${mngBtns}
        </div>`; 
    }); 
    
    if (State.editMode) {
        container.innerHTML += `<div class="nav-item" style="color:var(--success); border: 2px dashed var(--success);" data-action="openSedeModal"><i class="fa-solid fa-plus"></i> Inizializza Nuova Sede</div>`; 
    }
}

export function renderFolders() { 
    const container = document.getElementById('folders-menu'); 
    if (!container || !State.activeSede || !State.appStructure.sedi[State.activeSede].folders) return; 
    
    container.innerHTML = ''; 
    const headerTitle = document.getElementById('header-title'); 
    if (headerTitle) headerTitle.innerText = sanitize(State.appStructure.sedi[State.activeSede].name); 
    
    Object.values(State.appStructure.sedi[State.activeSede].folders).forEach(folder => { 
        const isSelected = folder.id === State.activeFolder;
        const bgStyle = isSelected ? 'var(--accent-glow)' : 'var(--input-bg)';
        const bdStyle = isSelected ? 'var(--accent)' : 'var(--border)';
        const txStyle = isSelected ? 'var(--accent)' : 'var(--text)';
        
        let editBtns = State.editMode ? `
            <i class="fa-solid fa-pen" style="color:var(--warning); margin-left:12px;" data-action="openFolderModal" data-id="${folder.id}"></i>
            <i class="fa-solid fa-xmark" style="color:var(--danger); margin-left:12px;" data-action="deleteFolder" data-id="${folder.id}"></i>` : '';
            
        container.innerHTML += `
        <div style="padding:14px 24px; border-radius:14px; font-size:0.95rem; font-weight:800; white-space:nowrap; border:2px solid ${bdStyle}; background:${bgStyle}; color:${txStyle}; cursor:pointer; display:flex; align-items:center; transition:0.3s;" data-action="selectFolder" data-id="${folder.id}">
            <span style="pointer-events:none;">${sanitize(folder.name).toUpperCase()}</span> ${editBtns}
        </div>`; 
    }); 
    
    if (State.editMode) {
        container.innerHTML += `<div style="padding:14px 24px; border-radius:14px; font-size:0.95rem; font-weight:800; border:2px dashed var(--success); color:var(--success); cursor:pointer; white-space:nowrap;" data-action="openFolderModal"><i class="fa-solid fa-plus"></i> NUOVO TURNO</div>`; 
    }
}

export function renderCategories() { 
    const container = document.getElementById('categories-filter-menu'); 
    if (!container) return; 
    container.innerHTML = ''; 
    
    const isManager = (State.activeProfile === 'admin'); 
    const role = !isManager ? State.appStructure.sedi[State.activeSede]?.roles.find(x => x.id === State.activeProfile) : null; 
    
    if (isManager) {
        const actClass = State.activeCatFilter === 'tutti' ? 'active' : '';
        container.innerHTML = `<div class="nav-item ${actClass}" data-action="setCatFilter" data-id="tutti"><i class="fa-solid fa-border-all"></i> Spazio Globale</div>`; 
    }
    
    (State.appStructure.sedi[State.activeSede]?.categories || []).forEach(cat => { 
        if (!isManager && (!role || !role.allowedCats.includes(cat.id))) return; 
        const actClass = State.activeCatFilter === cat.id ? 'active' : '';
        container.innerHTML += `<div class="nav-item ${actClass}" data-action="setCatFilter" data-id="${cat.id}"><i class="fa-solid fa-circle" style="color:${cat.color};"></i> ${sanitize(cat.name)}</div>`; 
    }); 
}

export function checkExpiry(dateString) { 
    if (!dateString) return ""; 
    let expiryDate = new Date(dateString); 
    let today = new Date(); 
    today.setHours(0,0,0,0); 
    
    let deltaDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)); 
    if (deltaDays < 0) return "<span style='font-size:0.8rem; padding:4px 10px; border-radius:6px; background:var(--danger); color:white; font-weight:800;'>SCADUTO</span>"; 
    if (deltaDays === 0) return "<span style='font-size:0.8rem; padding:4px 10px; border-radius:6px; background:var(--warning); color:black; font-weight:800;'>OGGI</span>"; 
    if (deltaDays <= 2) return `<span style='font-size:0.8rem; padding:4px 10px; border-radius:6px; background:var(--warning); color:black; font-weight:800;'>${deltaDays}gg</span>`; 
    return `<span style='font-size:0.8rem; padding:4px 10px; border-radius:6px; background:var(--card); border:1px solid var(--border); color:var(--text-muted); font-weight:800;'>Scad: ${expiryDate.toLocaleDateString('it-IT')}</span>`; 
}

/**
 * L'Architetto dei Gusci: Crea le carte visive e delega il rendering 
 * dei contenuti pesanti all'IntersectionObserver.
 */
export function renderContentCore() {
    const container = document.getElementById('main-content'); 
    if (!container) return; 
    container.innerHTML = ''; 
    
    if (!State.activeSede || !State.activeFolder || !State.appStructure.sedi[State.activeSede].folders[State.activeFolder]) return;
    
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder]; 
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const btnPaste = document.getElementById('floating-paste-btn'); 
    if (btnPaste) btnPaste.style.display = (State.clipboardSection && State.editMode) ? 'flex' : 'none';
    
    folder.sections.forEach(sec => {
        // Filtro rapido per decidere se la sezione ha elementi validi
        const hasVisibleItems = sec.items.some(item => {
            const matchCat = State.activeCatFilter === 'tutti' || item.catId === State.activeCatFilter; 
            const matchSearch = query === '' || item.n.toLowerCase().includes(query) || (item.info?.toLowerCase().includes(query)); 
            const matchSched = !item.days || item.days.length === 0 || item.days.includes(new Date().getDay()); 
            return matchCat && matchSearch && (State.editMode || State.showHiddenTimeGated || matchSched); 
        });

        if (!hasVisibleItems && !State.editMode) return;

        // Creazione sicura del nodo Card (Guscio Vuoto)
        const card = document.createElement('div'); 
        card.className = 'card';
        card.setAttribute('data-section-id', sec.id);
        
        let editBtns = (State.editMode && query === '' && !State.isFifo) ? `
            <div style="display:flex; gap:16px;">
                <i class="fa-solid fa-copy" style="cursor:pointer; color:var(--accent);" data-action="copySection" data-id="${sec.id}"></i>
                <i class="fa-solid fa-arrow-up" style="cursor:pointer; color:var(--text-muted);" data-action="moveSection" data-id="${sec.id}" data-dir="-1"></i>
                <i class="fa-solid fa-arrow-down" style="cursor:pointer; color:var(--text-muted);" data-action="moveSection" data-id="${sec.id}" data-dir="1"></i>
                <i class="fa-solid fa-pen" style="cursor:pointer; color:var(--warning);" data-action="openSectionModal" data-id="${sec.id}"></i>
                <i class="fa-solid fa-trash" style="cursor:pointer; color:var(--danger);" data-action="deleteSection" data-id="${sec.id}"></i>
            </div>` : '';

        card.innerHTML = `
            <div class="card-header">
                <span style="color:${sec.color}">${sanitize(sec.name)}</span>
                ${editBtns}
                <div class="card-progress-bg"><div class="card-progress-fill" id="prog-${sec.id}"></div></div>
            </div>
            <div class="table-container" style="min-height: 100px; display:flex; justify-content:center; align-items:center;">
                <i class="fa-solid fa-spinner fa-spin" style="color:var(--border);"></i>
            </div>
        `;
        
        container.appendChild(card);
        domObserver.observe(card); // Affida il riempimento all'Hardware Observer
    });
    
    if (State.editMode && query === '') { 
        const btnNewSec = document.createElement('button'); 
        btnNewSec.className = 'btn-action'; 
        btnNewSec.style.background = 'var(--bg)'; 
        btnNewSec.style.border = '2px dashed var(--success)'; 
        btnNewSec.style.color = 'var(--success)'; 
        btnNewSec.innerHTML = '<i class="fa-solid fa-plus"></i> COSTRUISCI CELLA LOGICA'; 
        btnNewSec.setAttribute('data-action', 'openSectionModal');
        container.appendChild(btnNewSec); 
    }
}

/**
 * Renderizza fisicamente la tabella dei prodotti quando la Card diventa visibile.
 * Costruisce stringhe sicure usando data-action. Nessun `onclick` inline.
 */
function renderTableForSection(secId, cardElement) {
    const tableContainer = cardElement.querySelector('.table-container');
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    const sec = folder.sections.find(s => s.id === secId);
    if (!sec) return;

    const query = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const currentDay = new Date().getDay();
    
    let itemsToShow = sec.items.filter(item => { 
        const matchCat = State.activeCatFilter === 'tutti' || item.catId === State.activeCatFilter; 
        const matchSearch = query === '' || item.n.toLowerCase().includes(query) || (item.info?.toLowerCase().includes(query)); 
        const matchSched = !item.days || item.days.length === 0 || item.days.includes(currentDay); 
        return matchCat && matchSearch && (State.editMode || State.showHiddenTimeGated || matchSched); 
    });
    
    if (State.isFifo) itemsToShow.sort((a,b) => { 
        let tA = a.expiry ? new Date(a.expiry).getTime() : 9999999999999; 
        let tB = b.expiry ? new Date(b.expiry).getTime() : 9999999999999; 
        return tA - tB; 
    });

    let html = `<table style="width:100%; border-collapse:collapse;">`;
    
    itemsToShow.forEach(item => {
        const stateKey = `${State.activeSede}_${State.activeFolder}_${sec.id}_${item.id}`; 
        let st = State.appState[stateKey] || { done: false, q: 0, n_op: '' };
        const cat = State.appStructure.sedi[State.activeSede].categories.find(x => x.id === item.catId) || { name: 'ERR', color: '#ccc', type: 'action' };
        
        let roleBadge = `<span class="role-badge" style="background:${cat.color}; border-color:${cat.color};">${sanitize(cat.name).toUpperCase()}</span>`; 
        let meta = "";
        let deficit = 0;
        
        if (cat.type === 'inventory') {
            deficit = Math.max(0, (item.idealQty || 0) - st.q);
            meta += `<span class="target-badge"><i class="fa-solid fa-bullseye"></i> Target: ${item.idealQty}</span> `;
        } else if (cat.type === 'central_stock') {
            if (item.uom) meta += `<span class="uom-badge">${sanitize(item.uom)}</span> `;
        }

        if (item.info?.trim() !== "") {
            meta += `<span class="info-badge" data-action="openInfoModal" data-sec="${sec.id}" data-item="${item.id}" style="padding:4px 8px; border-radius:6px; background:var(--accent-glow); border:1px solid rgba(201, 164, 100, 0.3); color:var(--accent); cursor:pointer;"><i class="fa-solid fa-book-open"></i> Info</span> `;
        }
        
        const isOutOfSched = !State.editMode && item.days?.length > 0 && !item.days.includes(currentDay); 
        if (isOutOfSched) meta += ` <span style="font-size:0.75rem; color:var(--warning); font-weight:800; border:1px solid var(--warning); padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-eye"></i> EXTRA</span>`;
        if (item.expiry) meta += checkExpiry(item.expiry);
        
        let actionHtml = '';
        let isFulfilled = false;

        if (cat.type === 'action') {
            const doneClass = st.done ? 'done' : '';
            const btnText = st.done ? '<i class="fa-solid fa-check-double"></i> COMPLETATO' : '<i class="fa-regular fa-square"></i> FATTO?';
            actionHtml = `<button id="btn-act-${stateKey}" class="btn-massive-action ${doneClass}" data-action="toggleDone" data-key="${stateKey}" data-sec="${sec.id}">${btnText}</button>`;
        } 
        else if (cat.type === 'inventory') {
            let containerClass = "qty-container" + (deficit > 0 ? (item.nexusSedeId ? " is-nexus-deficit" : " is-deficit") : "");
            if (item.nexusSedeId && st.done) {
                isFulfilled = true;
                actionHtml = `<div class="fulfilled-stamp"><i class="fa-solid fa-truck-ramp-box"></i> IN ARRIVO</div>`;
            } else {
                actionHtml = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="font-size:0.8rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Giacenza Linea?</div>
                    <div class="${containerClass}" id="box-${stateKey}">
                        <button class="qty-btn minus" data-action="updateQty" data-delta="-1" data-key="${stateKey}" data-sec="${sec.id}"><i class="fa-solid fa-minus" style="pointer-events:none;"></i></button>
                        <input type="number" class="qty-input" id="qty-${stateKey}" value="${st.q || 0}" data-action="updateQtyDirect" data-key="${stateKey}" data-sec="${sec.id}">
                        <button class="qty-btn plus" data-action="updateQty" data-delta="1" data-key="${stateKey}" data-sec="${sec.id}"><i class="fa-solid fa-plus" style="pointer-events:none;"></i></button>
                    </div>
                </div>`;
            }
        } 
        else if (cat.type === 'central_stock') {
            actionHtml = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="font-size:0.8rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Giacenza Centrale</div>
                <div class="qty-container" style="border-color:var(--accent);">
                    <button class="qty-btn minus" data-action="updateQty" data-delta="-1" data-key="${stateKey}" data-sec="${sec.id}"><i class="fa-solid fa-minus" style="pointer-events:none;"></i></button>
                    <input type="number" class="qty-input" id="qty-${stateKey}" value="${st.q || 0}" data-action="updateQtyDirect" data-key="${stateKey}" data-sec="${sec.id}">
                    <button class="qty-btn plus" data-action="updateQty" data-delta="1" data-key="${stateKey}" data-sec="${sec.id}"><i class="fa-solid fa-plus" style="pointer-events:none;"></i></button>
                </div>
            </div>`;
        }
        
        let rowClass = ((st.done && cat.type === 'action') || isFulfilled) ? 'is-fulfilled' : '';
        if (isOutOfSched) rowClass += ' out-of-schedule';

        let editBtns = (State.editMode && query === '' && !State.isFifo) ? `
            <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
                <button class="btn-action" style="padding:12px; width:auto; background:var(--input-bg); border:1px solid var(--border); color:var(--text);" data-action="moveItem" data-sec="${sec.id}" data-item="${item.id}" data-dir="-1"><i class="fa-solid fa-arrow-up" style="pointer-events:none;"></i></button>
                <button class="btn-action" style="padding:12px; width:auto; background:var(--input-bg); border:1px solid var(--border); color:var(--text);" data-action="moveItem" data-sec="${sec.id}" data-item="${item.id}" data-dir="1"><i class="fa-solid fa-arrow-down" style="pointer-events:none;"></i></button>
                <button class="btn-action" style="padding:12px; width:auto; background:var(--warning); border:none; color:#000;" data-action="openItemModal" data-sec="${sec.id}" data-item="${item.id}"><i class="fa-solid fa-pen" style="pointer-events:none;"></i></button>
                <button class="btn-action" style="padding:12px; width:auto; background:var(--danger); border:none; color:white;" data-action="deleteItem" data-sec="${sec.id}" data-item="${item.id}"><i class="fa-solid fa-trash" style="pointer-events:none;"></i></button>
            </div>` : '';

        html += `
        <tr id="row-${stateKey}" class="${rowClass}">
            <td>
                <span class="prod-name">${sanitize(item.n)} ${roleBadge}</span>
                <span class="prod-meta">${meta}</span>
                ${editBtns}
                <input type="text" class="note-input" value="${sanitize(st.n_op)}" data-action="updateNote" data-key="${stateKey}" placeholder="Aggiungi nota operativa visibile...">
            </td>
            <td style="text-align:right;">${actionHtml}</td>
        </tr>`;
    });
    
    html += `</table>`;
    
    if (State.editMode && query === '') {
        html += `<button class="btn-action solid" style="width:100%; border-radius:0 0 var(--radius-main) var(--radius-main); margin-top:0; padding:24px;" data-action="openItemModal" data-sec="${sec.id}"><i class="fa-solid fa-plus"></i> AGGIUNGI NODO PRODOTTO</button>`;
    }
    
    tableContainer.innerHTML = html;
    tableContainer.style.display = 'block'; // Rimuove spinner
    updateProgressBarUI(secId);
}

export function updateProgressBarUI(secId) { 
    const pBar = document.getElementById(`prog-${secId}`); 
    if (!pBar || !State.activeSede || !State.activeFolder) return; 
    
    const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections.find(x => x.id === secId); 
    if (!sec) return; 
    
    let d = 0, t = 0; 
    sec.items.forEach(i => { 
        const cat = State.appStructure.sedi[State.activeSede].categories.find(x => x.id === i.catId) || {}; 
        if (cat.type === 'action') { 
            t++; 
            const st = State.appState[`${State.activeSede}_${State.activeFolder}_${secId}_${i.id}`]; 
            if (st?.done) d++; 
        } 
    }); 
    
    if (t > 0) { 
        const pct = Math.round((d / t) * 100); 
        pBar.style.width = pct + '%'; 
        pBar.style.background = pct === 100 ? 'var(--success)' : 'var(--warning)'; 
    } else {
        pBar.style.width = '0%'; 
    }
}
