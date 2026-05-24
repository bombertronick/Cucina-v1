// File: js/ui/nexus.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js';
import { renderApp } from './renderer.js';
import { showToast, switchSpaView, haptic } from './events.js';

/**
 * ============================================================================
 * 1. MOTORE NEXUS LOGISTICO (Calcolo Deficit Centralizzato)
 * ============================================================================
 */
export function renderNexusHub() {
    const content = document.getElementById('nexus-content');
    if (!content) return;
    
    // Raccoglie tutti i prodotti sistemici o con scorte alterate
    let globalDeficits = [];
    
    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        Object.keys(sede.folders).forEach(folderId => {
            const folder = sede.folders[folderId];
            Object.keys(folder.sections).forEach(sectionId => {
                const section = folder.sections[sectionId];
                section.items.forEach(item => {
                    const stateKey = `${sedeId}_${folderId}_${sectionId}_${item.id}`;
                    const itemState = State.appState[stateKey];
                    
                    // Condizione Deficit: Se è spuntato (fatto) o se ha una Qt > 0
                    if (itemState && (itemState.done || (itemState.n_op && parseFloat(itemState.n_op) > 0))) {
                        globalDeficits.push({
                            sedeName: sede.name,
                            folderName: folder.name,
                            sectionName: section.name,
                            sectionColor: section.color,
                            itemName: item.name,
                            qty: itemState.n_op || 'Rifornire',
                            unit: item.unit || 'pz',
                            note: itemState.note || ''
                        });
                    }
                });
            });
        });
    });

    if (globalDeficits.length === 0) {
        content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-check-circle" style="font-size: 3rem; margin-bottom:16px; opacity:0.2;"></i><br>Matrice Logistica Stabile.<br>Nessun deficit rilevato.</div>`;
        return;
    }

    // Raggruppa i deficit per Sede Logistica
    let html = '';
    const grouped = globalDeficits.reduce((acc, curr) => {
        (acc[curr.sedeName] = acc[curr.sedeName] || []).push(curr);
        return acc;
    }, {});
    
    Object.keys(grouped).forEach(sedeName => {
        html += `<div style="margin-bottom: 24px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.2);">
                    <h3 style="color: var(--accent); margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                        <i class="fa-solid fa-shield"></i> ${sedeName}
                    </h3>`;
        
        grouped[sedeName].forEach(def => {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                        <div>
                            <div style="font-weight: 700; font-size: 1.1rem;">${def.itemName}</div>
                            <div style="font-size: 0.8rem; color: ${def.sectionColor}; font-weight: 800;">${def.sectionName} (${def.folderName})</div>
                            ${def.note ? `<div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-comment"></i> ${def.note}</div>` : ''}
                        </div>
                        <div style="background: var(--accent); color: var(--bg); font-weight: 800; font-size: 1.2rem; padding: 6px 16px; border-radius: 8px;">
                            ${def.qty} <span style="font-size: 0.8rem;">${def.unit}</span>
                        </div>
                     </div>`;
        });
        html += `</div>`;
    });
    
    content.innerHTML = html;
}

window.renderNexusHub = renderNexusHub;


/**
 * ============================================================================
 * 2. MOTORE DI EDITING E SALVATAGGIO (CRUD)
 * ============================================================================
 */

// Ascoltatore globale per i bottoni di salvataggio dei Modali
document.addEventListener('click', async (e) => {
    const actionTarget = e.target.closest('[data-action]');
    if (!actionTarget) return;
    
    const action = actionTarget.getAttribute('data-action');
    
    switch(action) {
        case 'saveSedeConfirm': await saveSedeLogic(); break;
        case 'saveFolderConfirm': await saveFolderLogic(); break;
        case 'saveSectionConfirm': await saveSectionLogic(); break;
        case 'saveItemConfirm': await saveItemLogic(); break;
        case 'deleteItemConfirm': await deleteItemLogic(); break;
    }
});

// -- LOGICHE SEDE --
async function saveSedeLogic() {
    const name = document.getElementById('input-sede-name').value.trim();
    if (!name) return showToast("Nome sede obbligatorio", "error");
    
    if (window._editContext && window._editContext.type === 'sede') {
        State.appStructure.sedi[window._editContext.id].name = name;
        showToast("Sede aggiornata", "success");
    } else {
        const newId = 'sede_' + Date.now();
        State.appStructure.sedi[newId] = { name: name, roles: [], folders: {} };
        State.activeSede = newId;
        showToast("Nuova rete creata", "success");
    }
    closeModals(); renderApp(); await saveState();
}

window.editSede = (sedeId) => {
    window._editContext = { type: 'sede', id: sedeId };
    window.openSedeModal();
    document.getElementById('input-sede-name').value = State.appStructure.sedi[sedeId].name;
};

// -- LOGICHE REPARTI (CARTELLE) --
async function saveFolderLogic() {
    const name = document.getElementById('input-folder-name').value.trim();
    if (!name || !State.activeSede) return;
    
    if (window._editContext && window._editContext.type === 'folder') {
        State.appStructure.sedi[State.activeSede].folders[window._editContext.id].name = name;
    } else {
        const newId = 'fold_' + Date.now();
        State.appStructure.sedi[State.activeSede].folders[newId] = { name: name, sections: {} };
        State.activeFolder = newId;
    }
    closeModals(); renderApp(); await saveState();
}

window.editFolder = (folderId) => {
    window._editContext = { type: 'folder', id: folderId };
    window.openFolderModal();
    document.getElementById('input-folder-name').value = State.appStructure.sedi[State.activeSede].folders[folderId].name;
};

// -- LOGICHE CELLE LOGICHE (SEZIONI) --
async function saveSectionLogic() {
    const name = document.getElementById('input-section-name').value.trim();
    const color = document.getElementById('input-section-color').value;
    if (!name || !State.activeSede || !State.activeFolder) return;
    
    if (window._editContext && window._editContext.type === 'section') {
        const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.id];
        sec.name = name;
        sec.color = color;
    } else {
        const newId = 'sec_' + Date.now();
        State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[newId] = { name: name, color: color, items: [] };
    }
    closeModals(); renderApp(); await saveState();
}

window.editSection = (sectionId) => {
    window._editContext = { type: 'section', id: sectionId };
    window.openSectionModal();
    const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    document.getElementById('input-section-name').value = sec.name;
    document.getElementById('input-section-color').value = sec.color;
};

/**
 * ============================================================================
 * 3. INIEZIONE DINAMICA DEL MODALE PRODOTTO E GESTIONE DATI
 * ============================================================================
 */
function injectItemModal() {
    if (document.getElementById('modal-item')) return;
    const modalHTML = `
        <div id="modal-item" class="modal-overlay" onclick="if(event.target===this) closeModals();">
            <div class="modal-box">
                <h2 id="item-modal-title" style="margin-bottom: 24px; color: var(--accent);">PRODOTTO</h2>
                <div class="input-group">
                    <label>Nome Prodotto / Operazione</label>
                    <input type="text" id="input-item-name" placeholder="Es. Pomodori Pelati...">
                </div>
                <div class="input-group">
                    <label>Unità di Misura</label>
                    <input type="text" id="input-item-unit" placeholder="pz, kg, lt, box..." value="pz">
                </div>
                <label style="display:flex; align-items:center; gap:12px; margin-bottom: 24px; cursor:pointer;">
                    <input type="checkbox" id="input-item-systemic" style="width:24px; height:24px;">
                    <span style="font-weight:700;">Segnala sempre in HUB NEXUS</span>
                </label>
                <div style="display: flex; gap: 16px; margin-top: auto;">
                    <button class="btn-action" onclick="closeModals();">ANNULLA</button>
                    <button class="btn-action solid" style="background:#e74c3c; display:none;" id="btn-delete-item" data-action="deleteItemConfirm"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-action solid" data-action="saveItemConfirm">SALVA DATI</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
}

window.openItemModal = (sectionId) => {
    injectItemModal();
    window._editContext = { type: 'item', sectionId: sectionId, isNew: true };
    document.getElementById('item-modal-title').innerText = 'NUOVO PRODOTTO';
    document.getElementById('input-item-name').value = '';
    document.getElementById('input-item-unit').value = 'pz';
    document.getElementById('input-item-systemic').checked = false;
    document.getElementById('btn-delete-item').style.display = 'none';
    
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-item').style.display = 'flex';
    window.location.hash = 'modal-open';
};

window.editItem = (sectionId, itemId) => {
    injectItemModal();
    window._editContext = { type: 'item', sectionId: sectionId, itemId: itemId, isNew: false };
    document.getElementById('item-modal-title').innerText = 'MODIFICA PRODOTTO';
    
    const item = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId].items.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('input-item-name').value = item.name;
    document.getElementById('input-item-unit').value = item.unit || 'pz';
    document.getElementById('input-item-systemic').checked = item.isSystemic || false;
    document.getElementById('btn-delete-item').style.display = 'flex'; // Mostra tasto elimina
    
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-item').style.display = 'flex';
    window.location.hash = 'modal-open';
};

async function saveItemLogic() {
    const name = document.getElementById('input-item-name').value.trim();
    const unit = document.getElementById('input-item-unit').value.trim();
    const isSystemic = document.getElementById('input-item-systemic').checked;
    
    if (!name) return showToast("Nome prodotto mancante", "error");
    
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    
    if (window._editContext.isNew) {
        section.items.push({ id: 'itm_' + Date.now(), name: name, unit: unit || 'pz', isSystemic: isSystemic });
    } else {
        const idx = section.items.findIndex(i => i.id === window._editContext.itemId);
        if (idx !== -1) {
            section.items[idx].name = name;
            section.items[idx].unit = unit;
            section.items[idx].isSystemic = isSystemic;
        }
    }
    
    closeModals(); renderApp(); await saveState(); haptic(20);
}

async function deleteItemLogic() {
    if (!confirm("Radere al suolo questo prodotto dalla matrice?")) return;
    
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    section.items = section.items.filter(i => i.id !== window._editContext.itemId);
    
    closeModals(); renderApp(); await saveState(); showToast("Prodotto eliminato", "info"); haptic(50);
}

function closeModals() {
    window._editContext = null;
    history.back(); // Sfrutta l'hash URL per chiudere i popup garantendo il funzionamento del tasto "Indietro" di Android
}
window.closeModals = closeModals;
