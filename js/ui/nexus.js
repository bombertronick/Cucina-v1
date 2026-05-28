// File: js/ui/nexus.js
import { State } from '../core/state.js';
import { lazzaro_saveState, lazzaro_wipeVault } from '../core/lazzaro.js';

/**
 * ============================================================================
 * MOTORE MODALI (INIEZIONE DINAMICA SUL LAYER OVERLAY)
 * ============================================================================
 */
function showModal(htmlContent) {
    const layer = document.getElementById('modal-layer');
    if (layer) {
        layer.innerHTML = htmlContent;
        layer.style.display = 'flex';
    }
}

window.closeModal = () => {
    const layer = document.getElementById('modal-layer');
    if (layer) {
        layer.style.display = 'none';
        layer.innerHTML = '';
    }
};

/**
 * Funzione di utilità per generare ID univoci per i nuovi elementi
 */
function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

/**
 * ============================================================================
 * GESTIONE RETE DISTRIBUITA (SEDI / HUB)
 * ============================================================================
 */
window.openSedeModal = (sedeId = null) => {
    const sede = sedeId ? State.appStructure.sedi[sedeId] : null;
    const title = sedeId ? 'MODIFICA SEDE' : 'NUOVA SEDE';
    const nameVal = sede ? sede.name : '';

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0; font-weight:900;"><i class="fa-solid fa-shield"></i> ${title}</h3>
            <div class="input-group" style="margin-bottom:20px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">NOME HUB OPERATIVO</label>
                <input type="text" id="modal-sede-name" placeholder="Es. Roma Centro" value="${nameVal}" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
            </div>
            <div style="display:flex; justify-content:space-between; gap:12px;">
                ${sedeId ? `<button onclick="window.deleteSede('${sedeId}')" style="background:rgba(231,76,60,0.1); color:var(--danger); border:1px dashed var(--danger); padding:10px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : '<div></div>'}
                <div style="display:flex; gap:8px;">
                    <button onclick="window.closeModal()" style="background:none; color:var(--text-muted); border:1px solid var(--border); padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:800;">ANNULLA</button>
                    <button onclick="window.saveSede('${sedeId || ''}')" style="background:var(--accent); color:#000; font-weight:900; border:none; padding:10px 16px; border-radius:6px; cursor:pointer;">SALVA</button>
                </div>
            </div>
        </div>
    `;
    showModal(html);
};

window.editSede = (sedeId) => { window.openSedeModal(sedeId); };

window.saveSede = async (sedeId) => {
    const nameInput = document.getElementById('modal-sede-name').value.trim();
    if (!nameInput) { alert("Il nome della Sede è obbligatorio."); return; }

    if (sedeId) {
        State.appStructure.sedi[sedeId].name = nameInput;
    } else {
        const newId = generateId('sede');
        State.appStructure.sedi[newId] = {
            name: nameInput,
            roles: [],
            folders: {}
        };
        State.activeSede = newId;
        State.activeFolder = null;
    }

    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

window.deleteSede = async (sedeId) => {
    if (!confirm("ATTENZIONE: Eliminare la Sede distruggerà irreversibilmente tutti i Turni, i Prodotti e gli Operatori associati. Procedere?")) return;
    
    delete State.appStructure.sedi[sedeId];
    if (State.activeSede === sedeId) {
        State.activeSede = Object.keys(State.appStructure.sedi)[0] || null;
        State.activeFolder = null;
    }
    
    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

/**
 * ============================================================================
 * GESTIONE TURNI OPERATIVI (FOLDERS)
 * ============================================================================
 */
window.openFolderModal = (folderId = null) => {
    if (!State.activeSede) { alert("Devi prima creare o selezionare una Sede."); return; }
    
    const sede = State.appStructure.sedi[State.activeSede];
    const folder = folderId ? sede.folders[folderId] : null;
    const title = folderId ? 'MODIFICA TURNO' : 'NUOVO TURNO OPERATIVO';
    const nameVal = folder ? folder.name : '';

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0; font-weight:900;"><i class="fa-solid fa-folder-open"></i> ${title}</h3>
            <div class="input-group" style="margin-bottom:20px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">NOME TURNO</label>
                <input type="text" id="modal-folder-name" placeholder="Es. Mattina / Chiusura" value="${nameVal}" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
            </div>
            <div style="display:flex; justify-content:space-between; gap:12px;">
                ${folderId ? `<button onclick="window.deleteFolder('${folderId}')" style="background:rgba(231,76,60,0.1); color:var(--danger); border:1px dashed var(--danger); padding:10px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : '<div></div>'}
                <div style="display:flex; gap:8px;">
                    <button onclick="window.closeModal()" style="background:none; color:var(--text-muted); border:1px solid var(--border); padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:800;">ANNULLA</button>
                    <button onclick="window.saveFolder('${folderId || ''}')" style="background:var(--accent); color:#000; font-weight:900; border:none; padding:10px 16px; border-radius:6px; cursor:pointer;">SALVA</button>
                </div>
            </div>
        </div>
    `;
    showModal(html);
};

window.editFolder = (folderId) => { window.openFolderModal(folderId); };

window.saveFolder = async (folderId) => {
    const nameInput = document.getElementById('modal-folder-name').value.trim();
    if (!nameInput) { alert("Il nome del Turno è obbligatorio."); return; }

    const sede = State.appStructure.sedi[State.activeSede];
    if (!sede.folders) sede.folders = {};

    if (folderId) {
        sede.folders[folderId].name = nameInput;
    } else {
        const newId = generateId('fld');
        sede.folders[newId] = {
            name: nameInput,
            sections: {}
        };
        State.activeFolder = newId;
    }

    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

window.deleteFolder = async (folderId) => {
    if (!confirm("ATTENZIONE: Eliminare il Turno distruggerà irreversibilmente tutte le Celle Logiche (Sezioni) e i Prodotti in esso contenuti. Procedere?")) return;
    
    const sede = State.appStructure.sedi[State.activeSede];
    delete sede.folders[folderId];
    
    if (State.activeFolder === folderId) {
        State.activeFolder = Object.keys(sede.folders)[0] || null;
    }
    
    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

window.nukeCurrentTurnLogic = async () => {
    if (!State.activeSede || !State.activeFolder) return;
    if (!confirm("PERICOLO: Questa azione azzererà TUTTE LE QUANTITÀ, gli stati (fatto/non fatto) e le note inserite dagli operatori in questo specifico turno. Vuoi procedere?")) return;
    
    const prefix = `${State.activeSede}_${State.activeFolder}_`;
    Object.keys(State.appState).forEach(key => {
        if (key.startsWith(prefix)) {
            delete State.appState[key];
        }
    });

    await lazzaro_saveState();
    window.renderApp();
    if (window.showToast) window.showToast("Dati operativi del turno azzerati.", "success");
};
/**
 * ============================================================================
 * GESTIONE CELLE LOGICHE (SEZIONI/CATEGORIE)
 * ============================================================================
 */
window.openSectionModal = (sectionId = null) => {
    if (!State.activeSede || !State.activeFolder) return;
    const sede = State.appStructure.sedi[State.activeSede];
    const section = sectionId ? sede.folders[State.activeFolder].sections[sectionId] : null;
    const title = sectionId ? 'MODIFICA CELLA LOGICA' : 'NUOVA CELLA LOGICA';
    const nameVal = section ? section.name : '';
    const colorVal = section ? section.color : '#3498db';

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0; font-weight:900;"><i class="fa-solid fa-layer-group"></i> ${title}</h3>
            
            <div class="input-group" style="margin-bottom:12px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">NOME REPARTO/CATEGORIA</label>
                <input type="text" id="modal-sec-name" value="${nameVal}" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
            </div>
            
            <div class="input-group" style="margin-bottom:20px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">COLORE IDENTIFICATIVO</label>
                <input type="color" id="modal-sec-color" value="${colorVal}" style="width:100%; height:40px; border:none; border-radius:6px; cursor:pointer; background:none;">
            </div>

            <div style="display:flex; justify-content:space-between; gap:12px;">
                ${sectionId ? `<button onclick="window.deleteSection('${sectionId}')" style="background:rgba(231,76,60,0.1); color:var(--danger); border:1px dashed var(--danger); padding:10px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : '<div></div>'}
                <div style="display:flex; gap:8px;">
                    <button onclick="window.closeModal()" style="background:none; color:var(--text-muted); border:1px solid var(--border); padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:800;">ANNULLA</button>
                    <button onclick="window.saveSection('${sectionId || ''}')" style="background:var(--accent); color:#000; font-weight:900; border:none; padding:10px 16px; border-radius:6px; cursor:pointer;">SALVA</button>
                </div>
            </div>
        </div>
    `;
    showModal(html);
};

window.editSection = (sectionId) => { window.openSectionModal(sectionId); };

window.saveSection = async (sectionId) => {
    const nameInput = document.getElementById('modal-sec-name').value.trim();
    const colorInput = document.getElementById('modal-sec-color').value;
    if (!nameInput) { alert("Il nome della Cella è obbligatorio."); return; }

    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    if (!folder.sections) folder.sections = {};

    if (sectionId) {
        folder.sections[sectionId].name = nameInput;
        folder.sections[sectionId].color = colorInput;
    } else {
        const newId = generateId('sec');
        folder.sections[newId] = {
            name: nameInput,
            color: colorInput,
            items: []
        };
    }

    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

window.deleteSection = async (sectionId) => {
    if (!confirm("ATTENZIONE: Eliminare questa Cella Logica distruggerà tutti i Prodotti al suo interno. Procedere?")) return;
    
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    delete folder.sections[sectionId];
    
    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

window.copySection = (sectionId) => {
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    State.clipboardSection = JSON.parse(JSON.stringify(section)); // Clonazione profonda
    window.renderApp();
    if (window.showToast) window.showToast("Cella Logica copiata negli appunti di sistema.", "info");
};

window.pasteSectionLogic = async () => {
    if (!State.clipboardSection || !State.activeSede || !State.activeFolder) return;
    
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    if (!folder.sections) folder.sections = {};
    
    const newId = generateId('sec');
    const newSection = JSON.parse(JSON.stringify(State.clipboardSection));
    newSection.name = newSection.name + " (Copia)";
    
    // Rigenera tutti gli ID interni dei prodotti per evitare collisioni di stato
    if (newSection.items) {
        newSection.items.forEach(item => { item.id = generateId('itm'); });
    }
    
    folder.sections[newId] = newSection;
    await lazzaro_saveState();
    window.renderApp();
    if (window.showToast) window.showToast("Cella Logica incollata con successo.", "success");
};

/**
 * ============================================================================
 * GESTIONE PRODOTTI / TASK (ITEMS)
 * ============================================================================
 */
window.hf_openItemModal = (sectionId, itemId = null) => {
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    const item = itemId ? section.items.find(i => i.id === itemId) : null;
    const title = itemId ? 'MODIFICA ELEMENTO' : 'NUOVO ELEMENTO';
    
    const iName = item ? item.name : '';
    const iType = item ? item.type : 'magazzino';
    const iUom = item ? item.uom : 'pz';
    const iSupplier = item ? (item.supplier || '') : '';
    const iExpiry = item ? (item.expiry || '') : '';
    
    const dIdeals = item && item.dailyIdeals && item.dailyIdeals.length === 7 ? item.dailyIdeals : [0,0,0,0,0,0,0];
    const days = item && item.days ? item.days : [0,1,2,3,4,5,6]; // Default: tutti i giorni

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0; font-weight:900;"><i class="fa-solid fa-cube"></i> ${title}</h3>
            
            <div class="input-group" style="margin-bottom:12px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">NOME PRODOTTO / TASK</label>
                <input type="text" id="modal-item-name" value="${iName}" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
            </div>

            <div style="display:flex; gap:12px; margin-bottom:12px;">
                <div class="input-group" style="flex:1;">
                    <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">TIPO</label>
                    <select id="modal-item-type" onchange="window.hf_toggleItemTypeUi()" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px;">
                        <option value="magazzino" ${iType === 'magazzino' ? 'selected' : ''}>Controllo Magazzino</option>
                        <option value="task" ${iType === 'task' ? 'selected' : ''}>Operazione (Task)</option>
                    </select>
                </div>
                <div class="input-group" style="flex:1;">
                    <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">UNITÀ DI MISURA</label>
                    <input type="text" id="modal-item-uom" value="${iUom}" placeholder="es. pz, kg, ct" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
                </div>
            </div>

            <div style="display:flex; gap:12px; margin-bottom:16px;">
                <div class="input-group" style="flex:1;">
                    <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">FORNITORE (Opzionale)</label>
                    <input type="text" id="modal-item-supplier" value="${iSupplier}" placeholder="es. MARR" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
                </div>
                <div class="input-group" style="flex:1;">
                    <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">SCADENZA (Opzionale)</label>
                    <input type="date" id="modal-item-expiry" value="${iExpiry}" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
                </div>
            </div>

            <div id="modal-item-ideals-container" style="${iType === 'magazzino' ? 'display:block;' : 'display:none;'} background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
                <label style="color:var(--accent); font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;"><i class="fa-solid fa-calendar-week"></i> SOGLIE IDEALI GIORNALIERE</label>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px;">
                    ${['DOM','LUN','MAR','MER','GIO','VEN','SAB'].map((d, idx) => `
                        <div style="text-align:center;">
                            <div style="font-size:0.65rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">${d}</div>
                            <input type="number" id="ideal-${idx}" value="${dIdeals[idx]}" style="width:100%; padding:6px; text-align:center; background:rgba(0,0,0,0.4); border:1px solid var(--border); color:var(--text-main); border-radius:4px; box-sizing:border-box; font-size:0.9rem;">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border:1px solid var(--border); margin-bottom:20px;">
                <label style="color:var(--accent); font-size:0.8rem; font-weight:900; display:block; margin-bottom:8px;"><i class="fa-solid fa-eye"></i> GIORNI DI VISIBILITÀ (PROGRAMMAZIONE)</label>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${['DOM','LUN','MAR','MER','GIO','VEN','SAB'].map((d, idx) => `
                        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-main); cursor:pointer;">
                            <input type="checkbox" class="modal-item-day" value="${idx}" ${days.includes(idx) ? 'checked' : ''}> ${d}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; gap:12px;">
                ${itemId ? `<button onclick="window.hf_deleteItem('${sectionId}', '${itemId}')" style="background:rgba(231,76,60,0.1); color:var(--danger); border:1px dashed var(--danger); padding:10px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : '<div></div>'}
                <div style="display:flex; gap:8px;">
                    <button onclick="window.closeModal()" style="background:none; color:var(--text-muted); border:1px solid var(--border); padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:800;">ANNULLA</button>
                    <button onclick="window.hf_saveItem('${sectionId}', '${itemId || ''}')" style="background:var(--accent); color:#000; font-weight:900; border:none; padding:10px 16px; border-radius:6px; cursor:pointer;">SALVA</button>
                </div>
            </div>
        </div>
    `;
    showModal(html);
};

window.hf_editItemModal = (sectionId, itemId) => { window.hf_openItemModal(sectionId, itemId); };

window.hf_toggleItemTypeUi = () => {
    const type = document.getElementById('modal-item-type').value;
    const container = document.getElementById('modal-item-ideals-container');
    if (container) container.style.display = type === 'magazzino' ? 'block' : 'none';
};

window.hf_saveItem = async (sectionId, itemId) => {
    const nameInput = document.getElementById('modal-item-name').value.trim();
    if (!nameInput) { alert("Il nome dell'elemento è obbligatorio."); return; }

    const typeInput = document.getElementById('modal-item-type').value;
    const uomInput = document.getElementById('modal-item-uom').value.trim() || 'pz';
    const supplierInput = document.getElementById('modal-item-supplier').value.trim();
    const expiryInput = document.getElementById('modal-item-expiry').value;

    const dailyIdeals = [];
    for (let i = 0; i < 7; i++) {
        const val = parseFloat(document.getElementById(`ideal-${i}`).value);
        dailyIdeals.push(isNaN(val) ? 0 : val);
    }

    const days = [];
    document.querySelectorAll('.modal-item-day').forEach(cb => {
        if (cb.checked) days.push(parseInt(cb.value));
    });

    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    if (!section.items) section.items = [];

    const itemData = {
        name: nameInput,
        type: typeInput,
        uom: uomInput,
        supplier: supplierInput,
        expiry: expiryInput,
        dailyIdeals: dailyIdeals,
        days: days
    };

    if (itemId) {
        const idx = section.items.findIndex(i => i.id === itemId);
        if (idx > -1) {
            itemData.id = itemId;
            section.items[idx] = itemData;
        }
    } else {
        itemData.id = generateId('itm');
        section.items.push(itemData);
    }

    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

window.hf_deleteItem = async (sectionId, itemId) => {
    if (!confirm("Eliminare definitivamente questo elemento?")) return;
    
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId];
    section.items = section.items.filter(i => i.id !== itemId);
    
    await lazzaro_saveState();
    window.closeModal();
    window.renderApp();
};

/**
 * ============================================================================
 * GESTIONE OPERATORI (ROLES) E CLOUD VAULT
 * ============================================================================
 */
window.openOperatorListModal = () => {
    if (!State.activeSede) return;
    const sede = State.appStructure.sedi[State.activeSede];
    const roles = sede.roles || [];

    let html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:400px; max-height:80vh; overflow-y:auto; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="color:var(--accent); margin:0; font-weight:900;"><i class="fa-solid fa-users"></i> OPERATORI HUB</h3>
                <button onclick="window.closeModal()" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
    `;

    if (roles.length === 0) {
        html += `<div style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding:20px;">Nessun operatore configurato per questa sede.</div>`;
    } else {
        roles.forEach(r => {
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px;">
                <div>
                    <div style="font-weight:800; color:var(--text-main);">${r.name.toUpperCase()}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);"><i class="fa-solid fa-layer-group"></i> ${r.squadra || 'Nessuna squadra'}</div>
                </div>
                <button onclick="window.openRoleModal('${r.id}')" style="background:none; border:none; color:var(--accent); cursor:pointer; padding:8px;"><i class="fa-solid fa-pen"></i></button>
            </div>`;
        });
    }

    html += `
            </div>
            <button onclick="window.openRoleModal()" class="btn-action solid" style="width:100%; padding:12px; background:var(--accent); color:#000; font-weight:800;"><i class="fa-solid fa-plus"></i> AGGIUNGI OPERATORE</button>
        </div>
    `;
    showModal(html);
};

window.openRoleModal = (roleId = null) => {
    const sede = State.appStructure.sedi[State.activeSede];
    const role = roleId ? sede.roles.find(r => r.id === roleId) : null;
    const title = roleId ? 'MODIFICA OPERATORE' : 'NUOVO OPERATORE';
    
    const rName = role ? role.name : '';
    const rPin = role ? role.pin : '';
    const rSquadra = role ? (role.squadra || '') : '';

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0; font-weight:900;"><i class="fa-solid fa-user-plus"></i> ${title}</h3>
            
            <div class="input-group" style="margin-bottom:12px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">NOME OPERATORE / RUOLO</label>
                <input type="text" id="modal-role-name" value="${rName}" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
            </div>
            
            <div class="input-group" style="margin-bottom:12px;">
                <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">SQUADRA / REPARTO</label>
                <input type="text" id="modal-role-squadra" value="${rSquadra}" placeholder="es. Cucina, Sala, Delivery" style="width:100%; padding:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:var(--text-main); border-radius:6px; box-sizing:border-box;">
            </div>

            <div class="input-group" style="margin-bottom:20px;">
                <label style="color:var(--danger); font-size:0.8rem; font-weight:800;">PIN DI ACCESSO (Numerico)</label>
                <input type="text" inputmode="numeric" id="modal-role-pin" value="${rPin}" placeholder="es. 1234" style="width:100%; padding:12px; background:rgba(231,76,60,0.1); border:1px solid var(--danger); color:var(--danger); font-weight:900; letter-spacing:2px; border-radius:6px; box-sizing:border-box;">
            </div>

            <div style="display:flex; justify-content:space-between; gap:12px;">
                ${roleId ? `<button onclick="window.deleteRole('${roleId}')" style="background:rgba(231,76,60,0.1); color:var(--danger); border:1px dashed var(--danger); padding:10px 16px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : '<div></div>'}
                <div style="display:flex; gap:8px;">
                    <button onclick="window.openOperatorListModal()" style="background:none; color:var(--text-muted); border:1px solid var(--border); padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:800;">ANNULLA</button>
                    <button onclick="window.saveRole('${roleId || ''}')" style="background:var(--accent); color:#000; font-weight:900; border:none; padding:10px 16px; border-radius:6px; cursor:pointer;">SALVA</button>
                </div>
            </div>
        </div>
    `;
    showModal(html);
};

window.saveRole = async (roleId) => {
    const nameInput = document.getElementById('modal-role-name').value.trim();
    const squadraInput = document.getElementById('modal-role-squadra').value.trim();
    const pinInput = document.getElementById('modal-role-pin').value.trim();

    if (!nameInput || !pinInput) { alert("Nome e PIN sono obbligatori."); return; }

    const sede = State.appStructure.sedi[State.activeSede];
    if (!sede.roles) sede.roles = [];

    const roleData = {
        name: nameInput,
        squadra: squadraInput,
        pin: pinInput
    };

    if (roleId) {
        const idx = sede.roles.findIndex(r => r.id === roleId);
        if (idx > -1) {
            roleData.id = roleId;
            sede.roles[idx] = roleData;
        }
    } else {
        roleData.id = generateId('role');
        sede.roles.push(roleData);
    }

    await lazzaro_saveState();
    window.openOperatorListModal(); 
};

window.deleteRole = async (roleId) => {
    if (!confirm("Rimuovere definitivamente questo operatore?")) return;
    
    const sede = State.appStructure.sedi[State.activeSede];
    sede.roles = sede.roles.filter(r => r.id !== roleId);
    
    await lazzaro_saveState();
    window.openOperatorListModal();
};

window.openCloudModal = () => {
    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:12px; width:100%; max-width:400px; border:1px solid var(--nexus); box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--nexus); margin-top:0; font-weight:900;"><i class="fa-solid fa-database"></i> CLOUD VAULT & SICUREZZA</h3>
            <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.5;">Il modulo Cloud per la sincronizzazione centralizzata (Firebase/AWS) richiede l'innesco del nodo server. Attualmente il sistema opera in modalità <b>ISOLATA (Local-First)</b>.</p>
            <button onclick="window.wipeLocalDatabase()" class="btn-action" style="width:100%; padding:14px; background:rgba(231,76,60,0.1); color:var(--danger); border:1px dashed var(--danger); font-weight:900; margin-top:16px;"><i class="fa-solid fa-skull"></i> DISTRUGGI DATABASE LOCALE</button>
            <button onclick="window.closeModal()" class="btn-action solid" style="width:100%; padding:14px; background:var(--text-muted); color:#000; font-weight:900; margin-top:12px; border:none;">CHIUDI</button>
        </div>
    `;
    showModal(html);
};

window.wipeLocalDatabase = async () => {
    if (prompt("ATTENZIONE CRITICA: Questa operazione distruggerà irrimediabilmente l'intero database gestionale dal dispositivo. Scrivi 'DISTRUGGI' per confermare.") === 'DISTRUGGI') {
        const success = await lazzaro_wipeVault();
        if (success) {
            sessionStorage.clear();
            localStorage.clear();
            alert("Database annientato. Riavvio in corso...");
            window.location.reload(true);
        } else {
            alert("Errore critico durante la distruzione del database.");
        }
    }
};
