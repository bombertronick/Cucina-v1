// File: js/ui/nexus.js
import { State } from '../core/state.js';
import { saveState } from '../core/lazzaro.js';

window.closeModals = () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); };
window.hf_closeModals = window.closeModals;

/**
 * ============================================================================
 * 1. LAZZARO NEXUS CALCULATOR (MOTORE HUB & SPOKE)
 * ============================================================================
 */
window.hf_renderNexusHub = () => {
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
                    const stateKey = sedeId + '_' + folderId + '_' + sectionId + '_' + item.id;
                    const itemState = State.appState[stateKey] || { done: false, n_op: 0, note: '' };
                    
                    let isDeficit = false;
                    let localDeficitQty = 0;
                    let centralDeficitQty = 0;
                    let displayString = '';

                    // LOGICA 'MAGAZZINO' (Conversione Matematica)
                    if (item.type === 'magazzino') {
                        const actualQty = parseFloat(itemState.n_op) || 0;
                        const idealQty = parseFloat(item.idealQty) || 0;
                        
                        if (actualQty < idealQty) {
                            isDeficit = true;
                            localDeficitQty = idealQty - actualQty;
                            
                            // Decurtamento per Sede Centrale
                            const conversion = parseFloat(item.conversionRate) || 1;
                            centralDeficitQty = localDeficitQty * conversion;
                            
                            displayString = `<div style="font-size: 0.9rem; color: var(--danger); font-weight: 800;">MANCANO: ${localDeficitQty} ${item.uom}</div>
                                             <div style="font-size: 1.2rem; color: var(--success); font-weight: 800; margin-top: 4px;">
                                                <i class="fa-solid fa-industry"></i> PRODURRE: ${centralDeficitQty.toFixed(2)} ${item.centralUom}
                                             </div>`;
                        }
                    } 
                    // LOGICA 'STANDARD' (Spunta Binaria)
                    else {
                        if (itemState.done || (itemState.n_op && parseFloat(itemState.n_op) > 0)) {
                            isDeficit = true;
                            displayString = `<div style="background: var(--accent); color: var(--bg); font-weight: 800; font-size: 1.2rem; padding: 6px 16px; border-radius: 8px;">
                                                ${itemState.n_op || 'RIFORNIRE'} <span style="font-size: 0.8rem;">${item.uom || 'pz'}</span>
                                             </div>`;
                        }
                    }

                    if (isDeficit) {
                        globalDeficits.push({
                            sedeName: sede.name, folderName: folder.name, sectionName: section.name,
                            sectionColor: section.color, itemName: item.name, supplier: item.supplier || '',
                            sku: item.sku || '', displayHtml: displayString, note: itemState.note || ''
                        });
                    }
                });
            });
        });
    });

    if (globalDeficits.length === 0) {
        content.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-check-circle" style="font-size: 3rem; margin-bottom:16px; opacity:0.2;"></i><br>Matrice Logistica Allineata.<br>Nessun deficit verso la Sede Centrale.</div>';
        return;
    }

    let html = '';
    const grouped = globalDeficits.reduce((acc, curr) => { (acc[curr.sedeName] = acc[curr.sedeName] || []).push(curr); return acc; }, {});
    
    Object.keys(grouped).forEach(sedeName => {
        html += `<div style="margin-bottom: 24px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.2);">
                    <h3 style="color: var(--accent); margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                        <i class="fa-solid fa-shield"></i> HUB: ${sedeName}
                    </h3>`;
        grouped[sedeName].forEach(def => {
            let suppHtml = def.supplier ? `<div style="font-size: 0.85rem; color: var(--accent); margin-top: 4px; font-weight: 700;"><i class="fa-solid fa-truck"></i> ${def.supplier} ${def.sku ? '[SKU: '+def.sku+']' : ''}</div>` : '';
            let noteHtml = def.note ? `<div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-comment"></i> ${def.note}</div>` : '';
            
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                        <div>
                            <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">${def.itemName}</div>
                            <div style="font-size: 0.8rem; color: ${def.sectionColor}; font-weight: 800;">${def.sectionName} (${def.folderName})</div>
                            ${suppHtml} ${noteHtml}
                        </div>
                        <div style="text-align: right;">${def.displayHtml}</div>
                     </div>`;
        });
        html += '</div>';
    });
    content.innerHTML = html;
};

/**
 * ============================================================================
 * 2. ITEM CRUD (LOGICA CONDIZIONALE MAGAZZINO/STANDARD)
 * ============================================================================
 */
function hf_injectItemModal() {
    if (document.getElementById('modal-item')) return;
    const modalHTML = `
    <div id="modal-item" class="modal-overlay" onclick="if(event.target===this) window.hf_closeModals();">
        <div class="modal-box" style="max-height: 90vh; overflow-y: auto;">
            <h2 id="item-modal-title" style="margin-bottom: 24px; color: var(--accent);">SCHEDA PRODOTTO</h2>
            
            <div class="input-group" style="margin-bottom: 16px;">
                <label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted);">Nome Articolo</label>
                <input type="text" id="input-item-name" placeholder="Es. Prosciutto Cotto">
            </div>

            <div class="input-group" style="margin-bottom: 16px;">
                <label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted);">Tipologia Logistica</label>
                <select id="input-item-type" onchange="window.hf_toggleMagazzinoFields()" style="background: rgba(0,0,0,0.5); border: 1px solid var(--border); color: var(--accent); padding: 12px; border-radius: 8px; width: 100%; font-weight: 800;">
                    <option value="standard">STANDARD (Generico / Spunta)</option>
                    <option value="magazzino">MAGAZZINO (Conversione Hub & Spoke)</option>
                </select>
            </div>

            <div id="magazzino-fields" style="display: none; background: rgba(52, 152, 219, 0.05); border: 1px dashed rgba(52, 152, 219, 0.3); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-size: 0.8rem; font-weight: 800; color: #3498db; margin-bottom: 12px;"><i class="fa-solid fa-calculator"></i> MOTORE DI CONVERSIONE</div>
                
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <div class="input-group" style="flex: 1; margin: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Soglia Pizzeria (Ideal)</label>
                        <input type="number" id="input-item-ideal" placeholder="Es. 4">
                    </div>
                    <div class="input-group" style="flex: 1; margin: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Unità Pizzeria (UoM)</label>
                        <input type="text" id="input-item-uom" placeholder="Es. Vaschette" value="pz">
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <div class="input-group" style="flex: 1; margin: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Moltiplicatore Centrale</label>
                        <input type="number" step="0.01" id="input-item-conversion" placeholder="Es. 0.6">
                    </div>
                    <div class="input-group" style="flex: 1; margin: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Unità Sede Centrale</label>
                        <input type="text" id="input-item-central-uom" placeholder="Es. Kg">
                    </div>
                </div>
            </div>

            <div style="border-top: 1px dashed var(--border); padding-top: 16px; margin-bottom: 24px;">
                <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent); margin-bottom: 12px; letter-spacing:1px;">REFERENZE (OPZIONALE)</div>
                <div class="input-group" style="margin-bottom: 12px;">
                    <input type="text" id="input-item-supplier" placeholder="Nome Fornitore (Es. Metro)">
                </div>
                <div class="input-group">
                    <input type="text" id="input-item-sku" placeholder="Codice Articolo / SKU">
                </div>
            </div>

            <div style="display: flex; gap: 16px; margin-top: auto;">
                <button class="btn-action" onclick="window.hf_closeModals();">ANNULLA</button>
                <button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-item" onclick="window.lazzaro_deleteItem()"><i class="fa-solid fa-trash"></i></button>
                <button class="btn-action solid" onclick="window.lazzaro_saveItem()">SALVA</button>
            </div>
        </div>
    </div>`;
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
}

window.hf_toggleMagazzinoFields = () => {
    const type = document.getElementById('input-item-type').value;
    document.getElementById('magazzino-fields').style.display = (type === 'magazzino') ? 'block' : 'none';
};

window.hf_openItemModal = (sectionId) => {
    hf_injectItemModal();
    window._editContext = { type: 'item', sectionId: sectionId, isNew: true };
    document.getElementById('item-modal-title').innerText = 'NUOVO PRODOTTO';
    document.getElementById('input-item-name').value = '';
    document.getElementById('input-item-type').value = 'standard';
    document.getElementById('input-item-uom').value = 'pz';
    document.getElementById('input-item-ideal').value = '';
    document.getElementById('input-item-conversion').value = '';
    document.getElementById('input-item-central-uom').value = '';
    document.getElementById('input-item-supplier').value = '';
    document.getElementById('input-item-sku').value = '';
    document.getElementById('btn-delete-item').style.display = 'none';
    
    window.hf_toggleMagazzinoFields();
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-item').style.display = 'flex';
};

window.hf_editItemModal = (sectionId, itemId) => {
    hf_injectItemModal();
    window._editContext = { type: 'item', sectionId: sectionId, itemId: itemId, isNew: false };
    document.getElementById('item-modal-title').innerText = 'MODIFICA PRODOTTO';
    
    const item = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId].items.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('input-item-name').value = item.name || '';
    document.getElementById('input-item-type').value = item.type || 'standard';
    document.getElementById('input-item-uom').value = item.uom || 'pz';
    document.getElementById('input-item-ideal').value = item.idealQty || '';
    document.getElementById('input-item-conversion').value = item.conversionRate || '';
    document.getElementById('input-item-central-uom').value = item.centralUom || '';
    document.getElementById('input-item-supplier').value = item.supplier || '';
    document.getElementById('input-item-sku').value = item.sku || '';
    document.getElementById('btn-delete-item').style.display = 'block';
    
    window.hf_toggleMagazzinoFields();
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-item').style.display = 'flex';
};

window.lazzaro_saveItem = async () => {
    const name = document.getElementById('input-item-name').value.trim();
    const type = document.getElementById('input-item-type').value;
    if (!name) { window.showToast("Nome prodotto mancante", "error"); return; }
    
    const payload = {
        id: window._editContext.isNew ? 'itm_' + Date.now() : window._editContext.itemId,
        name: name, type: type,
        uom: document.getElementById('input-item-uom').value.trim() || 'pz',
        supplier: document.getElementById('input-item-supplier').value.trim(),
        sku: document.getElementById('input-item-sku').value.trim()
    };

    if (type === 'magazzino') {
        payload.idealQty = document.getElementById('input-item-ideal').value;
        payload.conversionRate = document.getElementById('input-item-conversion').value;
        payload.centralUom = document.getElementById('input-item-central-uom').value.trim() || 'Kg';
    }

    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    if (window._editContext.isNew) section.items.push(payload);
    else {
        const idx = section.items.findIndex(i => i.id === window._editContext.itemId);
        if (idx !== -1) section.items[idx] = payload;
    }
    
    window.hf_closeModals(); window.renderApp(); await saveState(); window.haptic(20);
};

window.lazzaro_deleteItem = async () => {
    if (!confirm("Eliminare definitivamente questo prodotto?")) return;
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    section.items = section.items.filter(i => i.id !== window._editContext.itemId);
    window.hf_closeModals(); window.renderApp(); await saveState(); window.showToast("Prodotto eliminato", "info");
};

/**
 * ============================================================================
 * 3. KILL SWITCH & CLOUD NODO
 * ============================================================================
 */
window.nukeCurrentTurnLogic = async () => {
    if (!State.activeSede || !State.activeFolder) return;
    if (!confirm("ATTENZIONE: Stai per svuotare completamente tutte le spunte e le quantità di questo turno.\nVuoi procedere?")) return;
    const prefix = State.activeSede + '_' + State.activeFolder + '_';
    Object.keys(State.appState).forEach(key => { if (key.startsWith(prefix)) { State.appState[key].done = false; State.appState[key].n_op = ''; } });
    window.showToast("Turno svuotato.", "info"); if (window.renderApp) window.renderApp(); await saveState();
};

window.openCloudModal = () => {
    if (!document.getElementById('modal-cloud')) {
        const html = `<div id="modal-cloud" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 style="color:var(--nexus); margin-bottom:24px;"><i class="fa-solid fa-cloud"></i> NODO CLOUD</h2><div class="input-group"><label>Bin ID (JSONBin)</label><input type="text" id="input-cloud-bin" placeholder="Es. 65a7f..."></div><div class="input-group"><label>Master API Key</label><input type="password" id="input-cloud-key" placeholder="Es. $2a$10$..."></div><div style="display:flex; gap:16px; margin-top:24px;"><button class="btn-action" onclick="window.syncPushCloud()"><i class="fa-solid fa-cloud-arrow-up"></i> PUSH</button><button class="btn-action solid" style="background:var(--nexus);" onclick="window.syncPullCloud()"><i class="fa-solid fa-cloud-arrow-down"></i> PULL</button></div><hr style="border-color:var(--border); margin: 24px 0;"><div style="display:flex; gap:16px;"><button class="btn-action" onclick="window.exportLocalBackup()"><i class="fa-solid fa-download"></i> EXPORT JSON</button><button class="btn-action" onclick="document.getElementById('import-file').click()"><i class="fa-solid fa-upload"></i> IMPORT JSON</button><input type="file" id="import-file" style="display:none" onchange="window.importLocalBackup(event)"></div><button class="btn-action" style="width:100%; margin-top:16px;" onclick="window.closeModals()">CHIUDI</button></div></div>`;
        document.getElementById('modal-layer').insertAdjacentHTML('beforeend', html);
    }
    document.getElementById('input-cloud-bin').value = localStorage.getItem('nexus_bin_id') || '';
    document.getElementById('input-cloud-key').value = localStorage.getItem('nexus_api_key') || '';
    document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-cloud').style.display = 'flex';
};

/**
 * ============================================================================
 * 4. STRUTTURA E OPERATORI (CRUD PREESISTENTE)
 * ============================================================================
 */
function injectStructuralModals() {
    const layer = document.getElementById('modal-layer');
    if (!layer) return;

    if (!document.getElementById('modal-sede')) {
        layer.insertAdjacentHTML('beforeend', '<div id="modal-sede" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 id="sede-modal-title" style="margin-bottom: 24px; color: var(--accent);">RETE LOGISTICA</h2><div class="input-group"><label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">Nome Sede</label><input type="text" id="input-sede-name" placeholder="Nome sede..."></div><div style="display: flex; gap: 16px; margin-top: auto;"><button class="btn-action" onclick="window.closeModals();">ANNULLA</button><button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-sede" onclick="window.deleteSedeLogic()"><i class="fa-solid fa-trash"></i></button><button class="btn-action solid" onclick="window.saveSedeLogic()">SALVA</button></div></div></div>');
    }
    if (!document.getElementById('modal-folder')) {
        layer.insertAdjacentHTML('beforeend', '<div id="modal-folder" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 id="folder-modal-title" style="margin-bottom: 24px; color: var(--accent);">TURNO OPERATIVO</h2><div class="input-group"><label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">Nome Turno</label><input type="text" id="input-folder-name" placeholder="Nome turno..."></div><div style="display: flex; gap: 16px; margin-top: auto;"><button class="btn-action" onclick="window.closeModals();">ANNULLA</button><button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-folder" onclick="window.deleteFolderLogic()"><i class="fa-solid fa-trash"></i></button><button class="btn-action solid" onclick="window.saveFolderLogic()">SALVA</button></div></div></div>');
    }
    if (!document.getElementById('modal-section')) {
        layer.insertAdjacentHTML('beforeend', '<div id="modal-section" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 id="section-modal-title" style="margin-bottom: 24px; color: var(--accent);">CELLA LOGICA</h2><div class="input-group" style="margin-bottom: 16px;"><label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">Nome Cella</label><input type="text" id="input-section-name" placeholder="Nome cella..."></div><div class="input-group"><label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">Linea di appartenenza (Colore)</label><select id="input-section-color"><option value="#3498db" style="color:#3498db;">LINEA BLU (STANDARD)</option><option value="#2ecc71" style="color:#2ecc71;">LINEA VERDE (FRESCHI)</option><option value="#e74c3c" style="color:#e74c3c;">LINEA ROSSA (CARNI/FRITTI)</option><option value="#9b59b6" style="color:#9b59b6;">LINEA VIOLA (PANIFICAZIONE)</option><option value="#f1c40f" style="color:#f1c40f;">LINEA GIALLA (DRY GOODS)</option></select></div><div style="display: flex; gap: 16px; margin-top: auto;"><button class="btn-action" onclick="window.closeModals();">ANNULLA</button><button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-section" onclick="window.deleteSectionLogic()"><i class="fa-solid fa-trash"></i></button><button class="btn-action solid" onclick="window.saveSectionLogic()">SALVA</button></div></div></div>');
    }
}

// SEDI
window.openSedeModal = () => { injectStructuralModals(); window._editContext = { type: 'sede', isNew: true }; document.getElementById('sede-modal-title').innerText = 'NUOVA RETE LOGISTICA'; document.getElementById('input-sede-name').value = ''; document.getElementById('btn-delete-sede').style.display = 'none'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-sede').style.display = 'flex'; };
window.editSede = (sedeId) => { injectStructuralModals(); window._editContext = { type: 'sede', id: sedeId, isNew: false }; document.getElementById('sede-modal-title').innerText = 'MODIFICA RETE LOGISTICA'; document.getElementById('input-sede-name').value = State.appStructure.sedi[sedeId].name; document.getElementById('btn-delete-sede').style.display = 'block'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-sede').style.display = 'flex'; };
window.saveSedeLogic = async () => { const name = document.getElementById('input-sede-name').value.trim(); if (!name) return; if (!window._editContext.isNew) { State.appStructure.sedi[window._editContext.id].name = name; } else { const newId = 'sede_' + Date.now(); State.appStructure.sedi[newId] = { name: name, roles: [], folders: {} }; State.activeSede = newId; } window.closeModals(); window.renderApp(); await saveState(); };
window.deleteSedeLogic = async () => { if (!confirm("Eliminando questa Sede perderai TUTTI i Turni, Prodotti e Operatori. Procedere?")) return; delete State.appStructure.sedi[window._editContext.id]; if (State.activeSede === window._editContext.id) { State.activeSede = Object.keys(State.appStructure.sedi)[0] || null; State.activeFolder = State.activeSede ? (Object.keys(State.appStructure.sedi[State.activeSede].folders)[0] || null) : null; } window.closeModals(); window.renderApp(); await saveState(); window.showToast("Rete disintegrata.", "info"); };

// TURNI
window.openFolderModal = () => { injectStructuralModals(); window._editContext = { type: 'folder', isNew: true }; document.getElementById('folder-modal-title').innerText = 'NUOVO TURNO OPERATIVO'; document.getElementById('input-folder-name').value = ''; document.getElementById('btn-delete-folder').style.display = 'none'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-folder').style.display = 'flex'; };
window.editFolder = (folderId) => { injectStructuralModals(); window._editContext = { type: 'folder', id: folderId, isNew: false }; document.getElementById('folder-modal-title').innerText = 'MODIFICA TURNO'; document.getElementById('input-folder-name').value = State.appStructure.sedi[State.activeSede].folders[folderId].name; document.getElementById('btn-delete-folder').style.display = 'block'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-folder').style.display = 'flex'; };
window.saveFolderLogic = async () => { const name = document.getElementById('input-folder-name').value.trim(); if (!name || !State.activeSede) return; if (!window._editContext.isNew) { State.appStructure.sedi[State.activeSede].folders[window._editContext.id].name = name; } else { const newId = 'fold_' + Date.now(); State.appStructure.sedi[State.activeSede].folders[newId] = { name: name, sections: {} }; State.activeFolder = newId; } window.closeModals(); window.renderApp(); await saveState(); };
window.deleteFolderLogic = async () => { if (!confirm("Radere al suolo questo Turno e tutte le sue celle?")) return; delete State.appStructure.sedi[State.activeSede].folders[window._editContext.id]; if (State.activeFolder === window._editContext.id) State.activeFolder = Object.keys(State.appStructure.sedi[State.activeSede].folders)[0] || null; window.closeModals(); window.renderApp(); await saveState(); };

// CELLE
window.openSectionModal = () => { injectStructuralModals(); window._editContext = { type: 'section', isNew: true }; document.getElementById('section-modal-title').innerText = 'NUOVA CELLA LOGICA'; document.getElementById('input-section-name').value = ''; document.getElementById('btn-delete-section').style.display = 'none'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-section').style.display = 'flex'; };
window.editSection = (sectionId) => { injectStructuralModals(); window._editContext = { type: 'section', id: sectionId, isNew: false }; document.getElementById('section-modal-title').innerText = 'MODIFICA CELLA LOGICA'; const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId]; document.getElementById('input-section-name').value = sec.name; document.getElementById('input-section-color').value = sec.color; document.getElementById('btn-delete-section').style.display = 'block'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-section').style.display = 'flex'; };
window.saveSectionLogic = async () => { const name = document.getElementById('input-section-name').value.trim(); const color = document.getElementById('input-section-color').value; if (!name || !State.activeSede || !State.activeFolder) return; if (!window._editContext.isNew) { const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.id]; sec.name = name; sec.color = color; } else { const newId = 'sec_' + Date.now(); State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[newId] = { name: name, color: color, items: [] }; } window.closeModals(); window.renderApp(); await saveState(); };
window.deleteSectionLogic = async () => { if (!confirm("Vuoi eliminare questa Cella Logica e tutti i prodotti al suo interno?")) return; delete State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.id]; window.closeModals(); window.renderApp(); await saveState(); };

// OPERATORI
function injectOperatorModals() {
    if (document.getElementById('modal-operator-list')) return;
    const modalHTML = '<div id="modal-operator-list" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 style="margin-bottom: 24px; color: var(--accent);"><i class="fa-solid fa-users"></i> DIPENDENTI SEDE</h2><div id="operator-list-container" style="margin-bottom: 24px; max-height: 40vh; overflow-y: auto;"></div><button class="btn-action" style="margin-bottom: 16px; border: 1px dashed var(--border);" onclick="window.openOperatorDetailModal()"><i class="fa-solid fa-plus"></i> AGGIUNGI OPERATORE</button><button class="btn-action solid" onclick="window.closeModals();">CHIUDI PANNELLO</button></div></div><div id="modal-operator-detail" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 id="op-modal-title" style="margin-bottom: 24px; color: var(--accent);">SCHEDA OPERATORE</h2><div class="input-group"><label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">Nome Visualizzato</label><input type="text" id="input-op-name" placeholder="Es. Mario Rossi"></div><div class="input-group"><label style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">PIN di Accesso (Solo Numeri)</label><input type="number" pattern="[0-9]*" inputmode="numeric" id="input-op-pin" placeholder="Es. 1234"></div><div style="display: flex; gap: 16px; margin-top: auto;"><button class="btn-action" onclick="window.closeModals();">ANNULLA</button><button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-op" onclick="window.deleteOperatorLogic()"><i class="fa-solid fa-trash"></i> RIMUOVI</button><button class="btn-action solid" onclick="window.saveOperatorLogic()">SALVA</button></div></div></div>';
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
}
window.openOperatorListModal = () => { if (!State.activeSede) return; injectOperatorModals(); const sede = State.appStructure.sedi[State.activeSede]; if (!sede.roles) sede.roles = []; const container = document.getElementById('operator-list-container'); container.innerHTML = ''; if (sede.roles.length === 0) { container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Nessun operatore configurato.</div>'; } else { sede.roles.forEach(op => { const div = document.createElement('div'); div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.2); border-radius:8px; margin-bottom:8px;"; div.innerHTML = '<div><div style="font-weight:700;">' + op.name + '</div><div style="font-size:0.8rem; color:var(--text-muted);">PIN: ' + op.pin + '</div></div><i class="fa-solid fa-pen" style="cursor:pointer; color:var(--accent); padding:8px;" onclick="window.openOperatorDetailModal(\'' + op.id + '\')"></i>'; container.appendChild(div); }); } document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-operator-list').style.display = 'flex'; };
window.openOperatorDetailModal = (opId = null) => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); window._editContext = opId ? { type: 'operator', id: opId, isNew: false } : { type: 'operator', isNew: true }; document.getElementById('op-modal-title').innerText = opId ? 'MODIFICA OPERATORE' : 'NUOVO OPERATORE'; const btnDelete = document.getElementById('btn-delete-op'); const inputName = document.getElementById('input-op-name'); const inputPin = document.getElementById('input-op-pin'); if (opId) { const op = State.appStructure.sedi[State.activeSede].roles.find(r => r.id === opId); inputName.value = op.name; inputPin.value = op.pin; btnDelete.style.display = 'block'; } else { inputName.value = ''; inputPin.value = ''; btnDelete.style.display = 'none'; } document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-operator-detail').style.display = 'flex'; };
window.saveOperatorLogic = async () => { const name = document.getElementById('input-op-name').value.trim(); const pin = document.getElementById('input-op-pin').value.trim(); if (!name || !pin) return; const sede = State.appStructure.sedi[State.activeSede]; if (window.Cerbero && window.Cerbero.verifyRootSignature(pin)) return window.showToast("PIN riservato all'Amministratore.", "error"); if (window._editContext.isNew && sede.roles.some(r => r.pin === pin)) return window.showToast("PIN già in uso.", "error"); if (window._editContext.isNew) { sede.roles.push({ id: 'op_' + Date.now(), name: name, pin: pin }); } else { const idx = sede.roles.findIndex(r => r.id === window._editContext.id); if (idx !== -1) { sede.roles[idx].name = name; sede.roles[idx].pin = pin; } } window.closeModals(); await saveState(); window.showToast("Operatore salvato.", "success"); };
window.deleteOperatorLogic = async () => { if (!confirm("Vuoi davvero revocare l'accesso a questo operatore?")) return; const sede = State.appStructure.sedi[State.activeSede]; sede.roles = sede.roles.filter(r => r.id !== window._editContext.id); window.closeModals(); await saveState(); window.showToast("Operatore rimosso.", "info"); };
