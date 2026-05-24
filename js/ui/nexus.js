// File: js/ui/nexus.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js';

/**
 * ============================================================================
 * MOTORE NEXUS (Calcolo Deficit Centralizzato)
 * ============================================================================
 */
window.renderNexusHub = () => {
    const content = document.getElementById('nexus-content');
    if (!content) return;
    
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
        content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-check-circle" style="font-size: 3rem; margin-bottom:16px; opacity:0.2;"></i><br>
            Matrice Logistica Stabile.<br>Nessun deficit rilevato.</div>`;
        return;
    }

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
};

/**
 * ============================================================================
 * MOTORE DI EDITING E SALVATAGGIO (CRUD)
 * ============================================================================
 */
window.saveSedeLogic = async () => {
    const name = document.getElementById('input-sede-name').value.trim();
    if (!name) { window.showToast("Nome sede obbligatorio", "error"); return; }
    
    if (window._editContext && window._editContext.type === 'sede') {
        State.appStructure.sedi[window._editContext.id].name = name;
        window.showToast("Sede aggiornata", "success");
    } else {
        const newId = 'sede_' + Date.now();
        State.appStructure.sedi[newId] = { name: name, roles: [], folders: {} };
        State.activeSede = newId;
        window.showToast("Nuova rete creata", "success");
    }
    window.closeModals(); window.renderApp(); await saveState();
};

window.editSede = (sedeId) => {
    window._editContext = { type: 'sede', id: sedeId };
    window.openSedeModal();
    document.getElementById('input-sede-name').value = State.appStructure.sedi[sedeId].name;
};

window.saveFolderLogic = async () => {
    const name = document.getElementById('input-folder-name').value.trim();
    if (!name || !State.activeSede) return;
    
    if (window._editContext && window._editContext.type === 'folder') {
        State.appStructure.sedi[State.activeSede].folders[window._editContext.id].name = name;
    } else {
        const newId = 'fold_' + Date.now();
        State.appStructure.sedi[State.activeSede].folders[newId] = { name: name, sections: {} };
        State.activeFolder = newId;
    }
    window.closeModals(); window.renderApp(); await saveState();
};

window.editFolder = (folderId) => {
    window._editContext = { type: 'folder', id: folderId };
    window.openFolderModal();
    document.getElementById('input-folder-name').value = State.appStructure.sedi[State.activeSede].folders[folderId].name;
};

window.saveSectionLogic = async () => {
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
    window.closeModals(); window.renderApp(); await saveState();
};

window.editSection = (sectionId) => {
    window._editContext = { type: 'section', id: sectionId };
    window.openSectionModal();
    const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    document.getElementById('input-section-name').value = sec.name;
    document.getElementById('input-section-color').value = sec.color;
};

// APERTURA MODALI
window.openSedeModal = () => {
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-sede').style.display = 'flex';
    document.getElementById('input-sede-name').value = '';
};

window.openFolderModal = () => {
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-folder').style.display = 'flex';
    document.getElementById('input-folder-name').value = '';
};

window.openSectionModal = () => {
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-section').style.display = 'flex';
    document.getElementById('input-section-name').value = '';
    
    const select = document.getElementById('input-section-color');
    select.innerHTML = `
        <option value="#3498db" style="color:#3498db;">LINEA BLU (STANDARD)</option>
        <option value="#2ecc71" style="color:#2ecc71;">LINEA VERDE (FRESCHI)</option>
        <option value="#e74c3c" style="color:#e74c3c;">LINEA ROSSA (CARNI/FRITTI)</option>
        <option value="#9b59b6" style="color:#9b59b6;">LINEA VIOLA (PANIFICAZIONE)</option>
        <option value="#f1c40f" style="color:#f1c40f;">LINEA GIALLA (DRY GOODS)</option>
    `;
};

/**
 * ============================================================================
 * INIEZIONE E GESTIONE PRODOTTO
 * ============================================================================
 */
function injectItemModal() {
    if (document.getElementById('modal-item')) return;
    const modalHTML = `
        <div id="modal-item" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
            <div class="modal-box">
                <h2 id="item-modal-title" style="margin-bottom: 24px; color: var(--accent);">PRODOTTO</h2>
                <div class="input-group">
                    <input type="text" id="input-item-name" placeholder="Es. Pomodori Pelati...">
                </div>
                <div class="input-group">
                    <input type="text" id="input-item-unit" placeholder="Unità (pz, kg, box...)" value="pz">
                </div>
                <label style="display:flex; align-items:center; gap:12px; margin-bottom: 24px; cursor:pointer;">
                    <input type="checkbox" id="input-item-systemic" style="width:24px; height:24px;">
                    <span style="font-weight:700;">Segnala in HUB NEXUS</span>
                </label>
                <div style="display: flex; gap: 16px; margin-top: auto;">
                    <button class="btn-action" onclick="window.closeModals();">ANNULLA</button>
                    <button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-item" onclick="window.deleteItemLogic()"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-action solid" onclick="window.saveItemLogic()">SALVA</button>
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
    document.getElementById('btn-delete-item').style.display = 'block';
    
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-item').style.display = 'flex';
};

window.saveItemLogic = async () => {
    const name = document.getElementById('input-item-name').value.trim();
    const unit = document.getElementById('input-item-unit').value.trim();
    const isSystemic = document.getElementById('input-item-systemic').checked;
    
    if (!name) { window.showToast("Nome prodotto mancante", "error"); return; }
    
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
    
    window.closeModals(); window.renderApp(); await saveState(); window.haptic(20);
};

window.deleteItemLogic = async () => {
    if (!confirm("Radere al suolo questo prodotto dalla matrice?")) return;
    
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    section.items = section.items.filter(i => i.id !== window._editContext.itemId);
    
    window.closeModals(); window.renderApp(); await saveState(); window.showToast("Prodotto eliminato", "info"); window.haptic(50);
};
