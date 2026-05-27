// File: js/ui/nexus.js
import { State } from '../core/state.js';
import { lazzaro_stampMutation, lazzaro_saveState } from '../core/lazzaro.js';
import { Cerbero } from '../core/cerbero.js';

window.closeModals = () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); };
window.hf_closeModals = window.closeModals;

/**
 * ============================================================================
 * 1. HUB CENTRALIZZATO NEXUS (VISTA CUOCHI E CALCOLO OMNI-REPARTO)
 * ============================================================================
 */
window.hf_renderNexusHub = () => {
    const content = document.getElementById('nexus-content');
    const actionsContainer = document.getElementById('nexus-actions-container');
    if (!content || !actionsContainer) return;
    
    let globalDeficits = [];
    const currentDay = new Date().getDay();

    Object.keys(State.appStructure.sedi).forEach(sedeId => {
        const sede = State.appStructure.sedi[sedeId];
        Object.keys(sede.folders).forEach(folderId => {
            const folder = sede.folders[folderId];
            Object.keys(folder.sections).forEach(sectionId => {
                const section = folder.sections[sectionId];
                
                section.items.forEach(item => {
                    const stateKey = `${sedeId}_${folderId}_${sectionId}_${item.id}`;
                    const itemState = State.appState[stateKey] || { done: false, n_op: '0', note: '' };
                    
                    let isDeficit = false;
                    let localDeficitQty = 0;
                    let centralDeficitQty = 0;
                    let targetIdeal = 0;

                    if (item.type === 'magazzino') {
                        if (item.dailyIdeals && item.dailyIdeals.length === 7) {
                            targetIdeal = State.peakOverride ? Math.max(...item.dailyIdeals) : item.dailyIdeals[currentDay];
                        } else {
                            targetIdeal = parseFloat(item.idealQty) || 0;
                        }

                        const actualQty = parseFloat(itemState.n_op) || 0;
                        if (actualQty < targetIdeal) {
                            isDeficit = true;
                            localDeficitQty = targetIdeal - actualQty;
                            const conversion = parseFloat(item.conversionRate) || 1;
                            centralDeficitQty = Number((localDeficitQty * conversion + Number.EPSILON).toFixed(2));
                        }
                    } else {
                        if (itemState.done || (itemState.n_op && parseFloat(itemState.n_op) > 0)) {
                            isDeficit = true;
                        }
                    }

                    if (isDeficit) {
                        globalDeficits.push({
                            sedeId, sedeName: sede.name, sectionName: section.name, sectionColor: section.color,
                            itemName: item.name, itemType: item.type, localQty: localDeficitQty, uom: item.uom || 'pz',
                            centralQty: centralDeficitQty, centralUom: item.centralUom || 'Kg',
                            warehouse: item.centralWarehouseId || 'MAGAZZINO GENERALE',
                            recipe: item.recipe || '', note: itemState.note || ''
                        });
                    }
                });
            });
        });
    });

    if (globalDeficits.length === 0) {
        actionsContainer.innerHTML = '';
        content.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-check-circle" style="font-size: 3rem; margin-bottom:16px; opacity:0.2;"></i><br>Matrice Logistica Allineata.<br>Nessun deficit rilevato per i magazzini centrali.</div>';
        return;
    }

    let rawReport = `*SCUTUM LOGISTIC ERP V20*\nData: ${new Date().toLocaleDateString('it-IT')}\n\n`;
    let html = '';
    const groupedByWarehouse = globalDeficits.reduce((acc, curr) => { (acc[curr.warehouse] = acc[curr.warehouse] || []).push(curr); return acc; }, {});
    
    Object.keys(groupedByWarehouse).forEach(whName => {
        rawReport += `📦 *ORIGINE PRELIEVO: ${whName.toUpperCase()}*\n`;
        html += `<div style="margin-bottom: 32px; border: 1px solid var(--border); border-radius: 8px; padding: 20px; background: rgba(0,0,0,0.15);">
                    <h3 style="color: var(--nexus); margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px; font-weight:800;">
                        <i class="fa-solid fa-boxes-stacked"></i> REPARTO: ${whName.toUpperCase()}
                    </h3>`;
        
        groupedByWarehouse[whName].forEach(def => {
            if (def.itemType === 'magazzino') {
                rawReport += `  ▪️ ${def.itemName} -> *${def.centralQty} ${def.centralUom}* per Sede *${def.sedeName}*\n`;
                if(def.note) rawReport += `     [Nota: ${def.note}]\n`;
            } else {
                rawReport += `  ▪️ TASK/RIFORNIMENTO: ${def.itemName} per Sede *${def.sedeName}*\n`;
            }

            let recipeBtn = def.recipe ? `<button class="btn-action" style="padding:4px 10px; font-size:0.75rem; width:auto; border-color:#3498db; color:#3498db;" onclick="window.hf_openRecipeView('${btoa(def.itemName)}', '${btoa(def.recipe)}')"><i class="fa-solid fa-book-open"></i> RICETTA</button>` : '';
            let noteHtml = def.note ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; font-style:italic;"><i class="fa-solid fa-comment"></i> ${def.note}</div>` : '';
            let dispQty = def.itemType === 'magazzino' ? `<div><span style="color:var(--danger); font-weight:700; font-size:0.9rem;">${def.localQty} ${def.uom}</span> &rarr; <span style="color:var(--success); font-weight:800; font-size:1.2rem;">${def.centralQty} ${def.centralUom}</span></div>` : `<span style="background:var(--accent); color:var(--bg); font-weight:800; padding:4px 12px; border-radius:4px; font-size:0.9rem;">RIFORNIRE</span>`;

            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                        <div>
                            <div style="font-weight: 800; font-size: 1.1rem;">${def.itemName}</div>
                            <div style="font-size: 0.8rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">DESTINAZIONE: <span style="color:var(--accent);">${def.sedeName}</span> (${def.sectionName})</div>
                            ${noteHtml}
                        </div>
                        <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                            ${dispQty}
                            ${recipeBtn}
                        </div>
                     </div>`;
        });
        rawReport += `\n`;
        html += '</div>';
    });

    window._cachedRawReport = rawReport.trim();
    
    actionsContainer.innerHTML = `
        <button class="btn-action" style="flex:1; padding:14px;" onclick="window.hf_copyClipboardReport()"><i class="fa-solid fa-copy"></i> COPIA MATRICE</button>
        <button class="btn-action solid" style="flex:1; padding:14px; background:#25D366; color:#000; border:none;" onclick="window.hf_exportWhatsApp()"><i class="fa-brands fa-whatsapp"></i> INVIA A CENTRALE</button>
    `;
    content.innerHTML = html;
};

window.hf_openRecipeView = (titleBase64, recipeBase64) => {
    alert(`📖 SCHEDA TECNICA: ${atob(titleBase64)}\n\nISTRUZIONI DI PREPARAZIONE:\n${atob(recipeBase64)}`);
};

window.hf_copyClipboardReport = () => {
    if (!window._cachedRawReport) return;
    navigator.clipboard.writeText(window._cachedRawReport).then(() => alert("Report logistico copiato negli appunti."));
};

window.hf_exportWhatsApp = () => {
    if (!window._cachedRawReport) return;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(window._cachedRawReport)}`, '_blank');
};

/**
 * ============================================================================
 * 2. COMPILATORE MODALE CRUD AVANZATO PRODOTTI
 * ============================================================================
 */
function hf_injectItemModal() {
    if (document.getElementById('modal-item')) return;
    const modalHTML = `
    <div id="modal-item" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
        <div class="modal-box" style="max-height: 92vh; overflow-y: auto; width:100%; max-width:550px;">
            <h2 id="item-modal-title" style="margin-bottom: 20px; color: var(--accent); font-weight:800;">SCHEDA ARTICOLO Avanzata</h2>
            
            <div class="input-group"><label>Nome Prodotto</label><input type="text" id="input-item-name"></div>
            <div class="input-group"><label>Descrizione / Uso Logistico</label><input type="text" id="input-item-description" placeholder="Es. Per farcitura teglie"></div>
            <div class="input-group"><label>Tipologia Funzionale</label>
                <select id="input-item-type" onchange="window.hf_toggleMagazzinoFields()">
                    <option value="standard">STANDARD (Task Binario / Spunta)</option>
                    <option value="magazzino">MAGAZZINO (Ideale Dinamico & Conversione)</option>
                </select>
            </div>

            <div id="magazzino-fields" style="display:none; background:rgba(52,152,219,0.05); border:1px dashed #3498db; padding:16px; border-radius:8px; margin-bottom:16px;">
                <div style="font-weight:800; color:#3498db; margin-bottom:12px; font-size:0.8rem;"><i class="fa-solid fa-calculator"></i> MATRICE DELLE SOGLIE GIORNALIERE (IDEALE DINAMICO)</div>
                <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; margin-bottom:16px;">
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">DOM</label><input type="number" id="ideal-0" style="padding:6px; text-align:center;"></div>
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">LUN</label><input type="number" id="ideal-1" style="padding:6px; text-align:center;"></div>
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">MAR</label><input type="number" id="ideal-2" style="padding:6px; text-align:center;"></div>
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">MER</label><input type="number" id="ideal-3" style="padding:6px; text-align:center;"></div>
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">GIO</label><input type="number" id="ideal-4" style="padding:6px; text-align:center;"></div>
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">VEN</label><input type="number" id="ideal-5" style="padding:6px; text-align:center;"></div>
                    <div><label style="font-size:0.65rem; text-align:center; display:block;">SAB</label><input type="number" id="ideal-6" style="padding:6px; text-align:center;"></div>
                </div>
                <div style="display:flex; gap:12px; margin-bottom:12px;">
                    <div class="input-group" style="flex:1; margin:0;"><label>UoM Pizzeria</label><input type="text" id="input-item-uom" placeholder="Es. Vaschette"></div>
                    <div class="input-group" style="flex:1; margin:0;"><label>Moltiplicatore</label><input type="number" step="0.01" id="input-item-conversion" placeholder="Es. 0.6"></div>
                    <div class="input-group" style="flex:1; margin:0;"><label>UoM Laboratorio</label><input type="text" id="input-item-central-uom" placeholder="Es. Kg"></div>
                </div>
                <div class="input-group"><label>Magazzino Centrale di Prelievo (Sorgente)</label><input type="text" id="input-item-warehouse" placeholder="Es. Cella Frigo Carni / Magazzino Secco"></div>
                <div class="input-group"><label>Ricetta Tecnica / Istruzioni Cuochi</label><textarea id="input-item-recipe" rows="3" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid var(--border); color:#fff; border-radius:6px; padding:8px; font-family:inherit;"></textarea></div>
            </div>

            <div style="border-top:1px dashed var(--border); padding-top:12px; margin-bottom:20px;">
                <label style="font-weight:800; color:var(--accent); font-size:0.75rem; display:block; margin-bottom:8px;">GIORNI DI ATTIVITÀ IN MATRICE (TIME-GATING)</label>
                <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px;">
                    <label><input type="checkbox" id="day-0"> D</label><label><input type="checkbox" id="day-1"> L</label><label><input type="checkbox" id="day-2"> M</label><label><input type="checkbox" id="day-3"> M</label><label><input type="checkbox" id="day-4"> G</label><label><input type="checkbox" id="day-5"> V</label><label><input type="checkbox" id="day-6"> S</label>
                </div>
            </div>

            <div style="display:flex; gap:12px; margin-bottom:20px;">
                <div class="input-group" style="flex:1; margin:0;"><label>Fornitore</label><input type="text" id="input-item-supplier"></div>
                <div class="input-group" style="flex:1; margin:0;"><label>Scadenza HACCP (FIFO)</label><input type="date" id="input-item-expiry"></div>
            </div>

            <div style="display: flex; gap: 16px;">
                <button class="btn-action" onclick="window.closeModals();">ANNULLA</button>
                <button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-item" onclick="window.lazzaro_deleteItem()"><i class="fa-solid fa-trash"></i></button>
                <button class="btn-action solid" onclick="window.lazzaro_saveItem()">CONFERMA ARTICOLO</button>
            </div>
        </div>
    </div>`;
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
}

window.hf_toggleMagazzinoFields = () => {
    document.getElementById('magazzino-fields').style.display = (document.getElementById('input-item-type').value === 'magazzino') ? 'block' : 'none';
};

window.hf_openItemModal = (sectionId) => {
    hf_injectItemModal();
    window._editContext = { type: 'item', sectionId, isNew: true };
    document.getElementById('item-modal-title').innerText = 'NUOVO ARTICOLO OMNI-REPARTO';
    document.getElementById('input-item-name').value = '';
    document.getElementById('input-item-description').value = '';
    document.getElementById('input-item-type').value = 'standard';
    document.getElementById('input-item-uom').value = 'pz';
    document.getElementById('input-item-conversion').value = '';
    document.getElementById('input-item-central-uom').value = 'Kg';
    document.getElementById('input-item-warehouse').value = '';
    document.getElementById('input-item-recipe').value = '';
    document.getElementById('input-item-supplier').value = '';
    document.getElementById('input-item-expiry').value = '';
    for(let i=0; i<7; i++) { document.getElementById(`ideal-${i}`).value = ''; document.getElementById(`day-${i}`).checked = true; }
    document.getElementById('btn-delete-item').style.display = 'none';
    window.hf_toggleMagazzinoFields();
    document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-item').style.display = 'flex';
};

window.hf_editItemModal = (sectionId, itemId) => {
    hf_injectItemModal();
    window._editContext = { type: 'item', sectionId, itemId, isNew: false };
    document.getElementById('item-modal-title').innerText = 'MODIFICA PRODOTTO STRUTTURALE';
    
    const item = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId].items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('input-item-name').value = item.name || '';
    document.getElementById('input-item-description').value = item.description || '';
    document.getElementById('input-item-type').value = item.type || 'standard';
    document.getElementById('input-item-uom').value = item.uom || 'pz';
    document.getElementById('input-item-conversion').value = item.conversionRate || '';
    document.getElementById('input-item-central-uom').value = item.centralUom || 'Kg';
    document.getElementById('input-item-warehouse').value = item.centralWarehouseId || '';
    document.getElementById('input-item-recipe').value = item.recipe || '';
    document.getElementById('input-item-supplier').value = item.supplier || '';
    document.getElementById('input-item-expiry').value = item.expiry || '';
    
    for(let i=0; i<7; i++) {
        document.getElementById(`ideal-${i}`).value = item.dailyIdeals ? (item.dailyIdeals[i] || '') : '';
        document.getElementById(`day-${i}`).checked = item.days ? item.days.includes(i) : true;
    }
    
    document.getElementById('btn-delete-item').style.display = 'block';
    window.hf_toggleMagazzinoFields();
    document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-item').style.display = 'flex';
};

window.lazzaro_saveItem = async () => {
    const name = Cerbero.cerbero_sanitizeText(document.getElementById('input-item-name').value);
    const type = document.getElementById('input-item-type').value;
    if (!name) return alert("Inserire identificativo valido per il prodotto.");

    let dailyIdeals = [];
    let days = [];
    for(let i=0; i<7; i++) {
        dailyIdeals.push(Cerbero.cerbero_sanitizeNumber(document.getElementById(`ideal-${i}`).value));
        if(document.getElementById(`day-${i}`).checked) days.push(i);
    }

    const payload = {
        id: window._editContext.isNew ? 'itm_' + Date.now() : window._editContext.itemId,
        name, type, description: Cerbero.cerbero_sanitizeText(document.getElementById('input-item-description').value),
        supplier: Cerbero.cerbero_sanitizeText(document.getElementById('input-item-supplier').value),
        expiry: document.getElementById('input-item-expiry').value, days,
        uom: Cerbero.cerbero_sanitizeText(document.getElementById('input-item-uom').value) || 'pz'
    };

    if (type === 'magazzino') {
        payload.dailyIdeals = dailyIdeals;
        payload.conversionRate = Cerbero.cerbero_sanitizeNumber(document.getElementById('input-item-conversion').value) || 1;
        payload.centralUom = Cerbero.cerbero_sanitizeText(document.getElementById('input-item-central-uom').value) || 'Kg';
        payload.centralWarehouseId = Cerbero.cerbero_sanitizeText(document.getElementById('input-item-warehouse').value) || 'MAGAZZINO GENERALE';
        payload.recipe = Cerbero.cerbero_sanitizeText(document.getElementById('input-item-recipe').value);
    }

    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    if (window._editContext.isNew) section.items.push(payload);
    else {
        const idx = section.items.findIndex(i => i.id === window._editContext.itemId);
        if (idx !== -1) section.items[idx] = payload;
    }

    window.closeModals(); window.renderApp(); await lazzaro_saveState();
};

window.lazzaro_deleteItem = async () => {
    if (!confirm("Eliminare definitivamente la referenza dalla matrice logistica?")) return;
    window.lazzaro_purgeGhosts(State.activeSede + '_' + State.activeFolder + '_' + window._editContext.sectionId + '_' + window._editContext.itemId);
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.sectionId];
    section.items = section.items.filter(i => i.id !== window._editContext.itemId);
    window.closeModals(); window.renderApp(); await lazzaro_saveState();
};
/**
 * ============================================================================
 * 3. GESTIONE OPERATORI (CON LIVELLO SQUADRE REPARTO) E KILL SWITCH
 * ============================================================================
 */
function injectOperatorModals() {
    if (document.getElementById('modal-operator-list')) return;
    const modalHTML = `
    <div id="modal-operator-list" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
        <div class="modal-box" style="max-height: 90vh; overflow-y: auto;">
            <h2 style="margin-bottom: 24px; color: var(--accent); font-weight:800;"><i class="fa-solid fa-users"></i> DIPENDENTI E SQUADRE</h2>
            <div id="operator-list-container" style="margin-bottom: 24px; max-height: 45vh; overflow-y: auto;"></div>
            <button class="btn-action" style="margin-bottom: 16px; border: 1px dashed var(--border);" onclick="window.openOperatorDetailModal()"><i class="fa-solid fa-plus"></i> AGGIUNGI OPERATORE</button>
            <button class="btn-action solid" onclick="window.closeModals();">CHIUDI PANNELLO</button>
        </div>
    </div>
    <div id="modal-operator-detail" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
        <div class="modal-box">
            <h2 id="op-modal-title" style="margin-bottom: 24px; color: var(--accent); font-weight:800;">SCHEDA OPERATORE</h2>
            <div class="input-group"><label>Nome Visualizzato</label><input type="text" id="input-op-name" placeholder="Es. Mario Rossi"></div>
            <div class="input-group"><label>Squadra / Reparto Personalizzato</label><input type="text" id="input-op-squadra" placeholder="Es. Squadra Fritti / Cucina / Grill"></div>
            <div class="input-group"><label>PIN di Accesso (Solo Numeri)</label><input type="number" pattern="[0-9]*" inputmode="numeric" id="input-op-pin" placeholder="Es. 1234"></div>
            <div class="input-group"><label>URL Checklist Apertura</label><input type="url" id="input-op-apertura" placeholder="https://..."></div>
            <div class="input-group"><label>URL Checklist Chiusura</label><input type="url" id="input-op-chiusura" placeholder="https://..."></div>
            <div style="display: flex; gap: 16px; margin-top: auto;">
                <button class="btn-action" onclick="window.closeModals();">ANNULLA</button>
                <button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-op" onclick="window.deleteOperatorLogic()"><i class="fa-solid fa-trash"></i> RIMUOVI</button>
                <button class="btn-action solid" onclick="window.saveOperatorLogic()">SALVA</button>
            </div>
        </div>
    </div>`;
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
}

window.openOperatorListModal = () => { 
    if (!State.activeSede) return; 
    injectOperatorModals(); 
    const sede = State.appStructure.sedi[State.activeSede]; 
    if (!sede.roles) sede.roles = []; 
    const container = document.getElementById('operator-list-container'); 
    container.innerHTML = ''; 
    
    if (sede.roles.length === 0) { 
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Nessun operatore configurato.</div>'; 
    } else { 
        sede.roles.forEach(op => { 
            const div = document.createElement('div'); 
            div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.2); border-radius:8px; margin-bottom:8px;"; 
            let squadBadge = op.squadra ? `<span style="font-size:0.7rem; background:var(--accent); color:#000; padding:2px 6px; border-radius:4px; font-weight:800; text-transform:uppercase; margin-left:8px;">${op.squadra}</span>` : '';
            div.innerHTML = `<div><div style="font-weight:700; display:flex; align-items:center;">${op.name} ${squadBadge}</div><div style="font-size:0.8rem; color:var(--text-muted);">PIN: ${op.pin}</div></div><i class="fa-solid fa-pen" style="cursor:pointer; color:var(--accent); padding:8px;" onclick="window.openOperatorDetailModal('${op.id}')"></i>`; 
            container.appendChild(div); 
        }); 
    } 
    document.getElementById('modal-layer').style.display = 'flex'; 
    document.getElementById('modal-operator-list').style.display = 'flex'; 
};

window.openOperatorDetailModal = (opId = null) => {
    window.closeModals();
    injectOperatorModals();
    window._editContext = opId ? { type: 'operator', id: opId, isNew: false } : { type: 'operator', isNew: true };
    document.getElementById('op-modal-title').innerText = opId ? 'MODIFICA PROFILO OPERATIVO' : 'NUOVO OPERATORE RETE';
    
    const inputName = document.getElementById('input-op-name');
    const inputSquadra = document.getElementById('input-op-squadra');
    const inputPin = document.getElementById('input-op-pin');

    if (opId) {
        const op = State.appStructure.sedi[State.activeSede].roles.find(r => r.id === opId);
        inputName.value = op.name || '';
        inputSquadra.value = op.squadra || '';
        inputPin.value = op.pin || '';
        document.getElementById('input-op-apertura').value = op.linkApertura || '';
        document.getElementById('input-op-chiusura').value = op.linkChiusura || '';
        document.getElementById('btn-delete-op').style.display = 'block';
    } else {
        inputName.value = ''; inputSquadra.value = ''; inputPin.value = '';
        document.getElementById('input-op-apertura').value = ''; document.getElementById('input-op-chiusura').value = '';
        document.getElementById('btn-delete-op').style.display = 'none';
    }
    document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-operator-detail').style.display = 'flex';
};

window.saveOperatorLogic = async () => {
    const name = Cerbero.cerbero_sanitizeText(document.getElementById('input-op-name').value);
    const squadra = Cerbero.cerbero_sanitizeText(document.getElementById('input-op-squadra').value);
    const pin = document.getElementById('input-op-pin').value.trim();
    const linkApertura = document.getElementById('input-op-apertura').value.trim();
    const linkChiusura = document.getElementById('input-op-chiusura').value.trim();
    if (!name || !pin) return;
    
    const sede = State.appStructure.sedi[State.activeSede];
    if (window._editContext.isNew && sede.roles.some(r => r.pin === pin)) return alert("PIN già assegnato.");

    const payload = { 
        id: window._editContext.isNew ? 'op_' + Date.now() : window._editContext.id, 
        name, squadra, pin, linkApertura, linkChiusura 
    };

    if (window._editContext.isNew) sede.roles.push(payload);
    else { const idx = sede.roles.findIndex(r => r.id === window._editContext.id); if (idx !== -1) sede.roles[idx] = payload; }
    
    window.closeModals(); await lazzaro_saveState(); window.openOperatorListModal();
};

window.deleteOperatorLogic = async () => {
    if (!confirm("Vuoi davvero revocare l'accesso a questo operatore?")) return;
    const sede = State.appStructure.sedi[State.activeSede];
    sede.roles = sede.roles.filter(r => r.id !== window._editContext.id);
    window.closeModals(); await lazzaro_saveState(); window.openOperatorListModal();
};

window.nukeCurrentTurnLogic = async () => {
    if (!confirm("ATTENZIONE OPERATIVA: Svuotare completamente tutte le quantità registrate in questo turno?\nQuesta operazione non è reversibile.")) return;
    const prefix = `${State.activeSede}_${State.activeFolder}_`;
    Object.keys(State.appState).forEach(key => { if (key.startsWith(prefix)) { State.appState[key].done = false; State.appState[key].n_op = ''; } });
    window.renderApp(); await lazzaro_saveState();
};

/**
 * ============================================================================
 * 4. STRUTTURA E GERARCHIA DINAMICA (COLORE E CATEGORIE LIBERE)
 * ============================================================================
 */
function injectStructuralModals() {
    const layer = document.getElementById('modal-layer');
    if (!layer) return;

    if (!document.getElementById('modal-sede')) {
        layer.insertAdjacentHTML('beforeend', `<div id="modal-sede" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 id="sede-modal-title" style="margin-bottom: 24px; color: var(--accent); font-weight:800;">RETE LOGISTICA</h2><div class="input-group"><label>Nome Sede</label><input type="text" id="input-sede-name" placeholder="Es. Fiumicino"></div><div style="display: flex; gap: 16px; margin-top: auto;"><button class="btn-action" onclick="window.closeModals();">ANNULLA</button><button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-sede" onclick="window.deleteSedeLogic()"><i class="fa-solid fa-trash"></i></button><button class="btn-action solid" onclick="window.saveSedeLogic()">SALVA</button></div></div></div>`);
    }
    if (!document.getElementById('modal-folder')) {
        layer.insertAdjacentHTML('beforeend', `<div id="modal-folder" class="modal-overlay" onclick="if(event.target===this) window.closeModals();"><div class="modal-box"><h2 id="folder-modal-title" style="margin-bottom: 24px; color: var(--accent); font-weight:800;">TURNO OPERATIVO</h2><div class="input-group"><label>Nome Turno</label><input type="text" id="input-folder-name" placeholder="Es. Mattina"></div><div style="display: flex; gap: 16px; margin-top: auto;"><button class="btn-action" onclick="window.closeModals();">ANNULLA</button><button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-folder" onclick="window.deleteFolderLogic()"><i class="fa-solid fa-trash"></i></button><button class="btn-action solid" onclick="window.saveFolderLogic()">SALVA</button></div></div></div>`);
    }
    if (!document.getElementById('modal-section')) {
        layer.insertAdjacentHTML('beforeend', `
        <div id="modal-section" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
            <div class="modal-box">
                <h2 id="section-modal-title" style="margin-bottom: 24px; color: var(--accent); font-weight:800;">CELLA LOGICA REPARTO</h2>
                <div class="input-group" style="margin-bottom: 16px;">
                    <label>Nome Cella Logica (Categoria Libera)</label>
                    <input type="text" id="input-section-name" placeholder="Es. Frigo Carni / Squadra Fritti">
                </div>
                <div class="input-group">
                    <label>Colore Identificativo Linea</label>
                    <input type="color" id="input-section-color" value="#3498db" style="width:100%; height:44px; padding:0; border:1px solid var(--border); background:none; cursor:pointer; border-radius:6px;">
                </div>
                <div style="display: flex; gap: 16px; margin-top: auto;">
                    <button class="btn-action" onclick="window.closeModals();">ANNULLA</button>
                    <button class="btn-action solid" style="background:var(--danger); display:none;" id="btn-delete-section" onclick="window.deleteSectionLogic()"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-action solid" onclick="window.saveSectionLogic()">SALVA CELLA</button>
                </div>
            </div>
        </div>`);
    }
}

window.openSedeModal = () => { injectStructuralModals(); window._editContext = { type: 'sede', isNew: true }; document.getElementById('sede-modal-title').innerText = 'NUOVA RETE LOGISTICA'; document.getElementById('input-sede-name').value = ''; document.getElementById('btn-delete-sede').style.display = 'none'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-sede').style.display = 'flex'; };
window.editSede = (sedeId) => { injectStructuralModals(); window._editContext = { type: 'sede', id: sedeId, isNew: false }; document.getElementById('sede-modal-title').innerText = 'MODIFICA RETE LOGISTICA'; document.getElementById('input-sede-name').value = State.appStructure.sedi[sedeId].name; document.getElementById('btn-delete-sede').style.display = 'block'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-sede').style.display = 'flex'; };
window.saveSedeLogic = async () => { const name = Cerbero.cerbero_sanitizeText(document.getElementById('input-sede-name').value); if (!name) return; if (!window._editContext.isNew) { State.appStructure.sedi[window._editContext.id].name = name; } else { const newId = 'sede_' + Date.now(); State.appStructure.sedi[newId] = { name: name, roles: [], folders: {} }; State.activeSede = newId; } window.closeModals(); window.renderApp(); await lazzaro_saveState(); };
window.deleteSedeLogic = async () => { if (!confirm("ATTENZIONE: Eliminando la Sede perderai TUTTI i dati. Procedere?")) return; window.lazzaro_purgeGhosts(window._editContext.id + '_'); delete State.appStructure.sedi[window._editContext.id]; if (State.activeSede === window._editContext.id) { State.activeSede = Object.keys(State.appStructure.sedi)[0] || null; State.activeFolder = State.activeSede ? (Object.keys(State.appStructure.sedi[State.activeSede].folders)[0] || null) : null; } window.closeModals(); window.renderApp(); await lazzaro_saveState(); };

window.openFolderModal = () => { injectStructuralModals(); window._editContext = { type: 'folder', isNew: true }; document.getElementById('folder-modal-title').innerText = 'NUOVO TURNO OPERATIVO'; document.getElementById('input-folder-name').value = ''; document.getElementById('btn-delete-folder').style.display = 'none'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-folder').style.display = 'flex'; };
window.editFolder = (folderId) => { injectStructuralModals(); window._editContext = { type: 'folder', id: folderId, isNew: false }; document.getElementById('folder-modal-title').innerText = 'MODIFICA TURNO'; document.getElementById('input-folder-name').value = State.appStructure.sedi[State.activeSede].folders[folderId].name; document.getElementById('btn-delete-folder').style.display = 'block'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-folder').style.display = 'flex'; };
window.saveFolderLogic = async () => { const name = Cerbero.cerbero_sanitizeText(document.getElementById('input-folder-name').value); if (!name || !State.activeSede) return; if (!window._editContext.isNew) { State.appStructure.sedi[State.activeSede].folders[window._editContext.id].name = name; } else { const newId = 'fold_' + Date.now(); State.appStructure.sedi[State.activeSede].folders[newId] = { name: name, sections: {} }; State.activeFolder = newId; } window.closeModals(); window.renderApp(); await lazzaro_saveState(); };
window.deleteFolderLogic = async () => { if (!confirm("Vuoi eliminare questo Turno e tutte le sue celle?")) return; window.lazzaro_purgeGhosts(State.activeSede + '_' + window._editContext.id + '_'); delete State.appStructure.sedi[State.activeSede].folders[window._editContext.id]; if (State.activeFolder === window._editContext.id) State.activeFolder = Object.keys(State.appStructure.sedi[State.activeSede].folders)[0] || null; window.closeModals(); window.renderApp(); await lazzaro_saveState(); };

window.openSectionModal = () => { injectStructuralModals(); window._editContext = { type: 'section', isNew: true }; document.getElementById('section-modal-title').innerText = 'CREA CELLA LOGICA LIBERA'; document.getElementById('input-section-name').value = ''; document.getElementById('input-section-color').value = '#3498db'; document.getElementById('btn-delete-section').style.display = 'none'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-section').style.display = 'flex'; };
window.editSection = (sectionId) => { injectStructuralModals(); window._editContext = { type: 'section', id: sectionId, isNew: false }; document.getElementById('section-modal-title').innerText = 'MODIFICA CELLA LOGICA'; const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[sectionId]; document.getElementById('input-section-name').value = sec.name; document.getElementById('input-section-color').value = sec.color; document.getElementById('btn-delete-section').style.display = 'block'; document.getElementById('modal-layer').style.display = 'flex'; document.getElementById('modal-section').style.display = 'flex'; };
window.saveSectionLogic = async () => { const name = Cerbero.cerbero_sanitizeText(document.getElementById('input-section-name').value); const color = document.getElementById('input-section-color').value; if (!name || !State.activeSede || !State.activeFolder) return; if (!window._editContext.isNew) { const sec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.id]; sec.name = name; sec.color = color; } else { const newId = 'sec_' + Date.now(); State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[newId] = { name: name, color: color, items: [] }; } window.closeModals(); window.renderApp(); await lazzaro_saveState(); };
window.deleteSectionLogic = async () => { if (!confirm("Vuoi eliminare questa Cella Logica e tutti i prodotti al suo interno?")) return; delete State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[window._editContext.id]; window.closeModals(); window.renderApp(); await lazzaro_saveState(); };

/**
 * ============================================================================
 * 5. MACCHINA DEL TEMPO INTERNA (AUTOMATED MEMORY VAULT SYSTEM)
 * ============================================================================
 */
window.saveInternalSnapshot = async () => {
    try {
        const snapshots = await localforage.getItem('internalSnapshots') || [];
        const newSnapshot = {
            id: 'snap_' + Date.now(),
            dateStr: new Date().toLocaleString('it-IT'),
            appStructure: JSON.parse(JSON.stringify(State.appStructure)),
            appState: JSON.parse(JSON.stringify(State.appState))
        };
        snapshots.unshift(newSnapshot);
        if (snapshots.length > 8) snapshots.pop(); // Mantiene gli ultimi 8 punti di ripristino per ottimizzazione spazio
        await localforage.setItem('internalSnapshots', snapshots);
        if(window.showToast) window.showToast("Snapshot interno sigillato in memoria profonda.", "success");
        window.loadInternalSnapshotList();
    } catch (err) {
        if(window.showToast) window.showToast("Errore di scrittura nella Macchina del Tempo.", "error");
    }
};

window.loadInternalSnapshotList = async () => {
    const container = document.getElementById('internal-snapshots-container');
    if (!container) return;
    container.innerHTML = '';
    try {
        const snapshots = await localforage.getItem('internalSnapshots') || [];
        if (snapshots.length === 0) {
            container.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:12px; border:1px dashed var(--border); border-radius:6px;">Nessun punto di ripristino rilevato. Clicca su "SCATTA SNAPSHOT".</div>';
            return;
        }
        snapshots.forEach(snap => {
            const div = document.createElement('div');
            div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02); margin-bottom:8px; border-radius:6px;";
            div.innerHTML = `
                <div style="font-size:0.85rem; font-weight:700;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent); margin-right:6px;"></i> ${snap.dateStr}</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-action solid" style="padding:4px 10px; font-size:0.75rem; background:var(--success); color:#000; width:auto;" onclick="window.restoreInternalSnapshot('${snap.id}')">RIPRISTINA</button>
                    <button class="btn-action" style="padding:4px 8px; font-size:0.75rem; border-color:var(--danger); color:var(--danger); width:auto;" onclick="window.deleteInternalSnapshot('${snap.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = '<div style="color:var(--danger); font-size:0.8rem;">Errore di scansione IndexedDB.</div>';
    }
};

window.restoreInternalSnapshot = async (id) => {
    if(!confirm("ATTENZIONE: Ripristinare questo punto temporale? I dati attuali non salvati andranno sovrascritti.")) return;
    try {
        const snapshots = await localforage.getItem('internalSnapshots') || [];
        const target = snapshots.find(s => s.id === id);
        if (target) {
            State.appStructure = target.appStructure;
            State.appState = target.appState;
            await lazzaro_saveState();
            if(window.showToast) window.showToast("Linea temporale riallineata. Riavvio in corso...", "success");
            setTimeout(() => window.location.reload(), 1000);
        }
    } catch (err) {
        alert("Errore critico durante il ripristino.");
    }
};

window.deleteInternalSnapshot = async (id) => {
    try {
        let snapshots = await localforage.getItem('internalSnapshots') || [];
        snapshots = snapshots.filter(s => s.id !== id);
        await localforage.setItem('internalSnapshots', snapshots);
        window.loadInternalSnapshotList();
        if(window.showToast) window.showToast("Punto di ripristino rimosso.", "info");
    } catch (err) {
        console.error(err);
    }
};

/**
 * CONTAINER CLOUD MODAL (GITHUB GISTS & MACCHINA DEL TEMPO INTERNAL VIEW)
 */
window.openCloudModal = () => {
    if (document.getElementById('modal-cloud-vault')) {
        document.getElementById('modal-layer').style.display = 'flex';
        document.getElementById('modal-cloud-vault').style.display = 'flex';
        window.loadInternalSnapshotList();
        return;
    }
    const html = `
    <div id="modal-cloud-vault" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
        <div class="modal-box" style="max-height:90vh; overflow-y:auto; width:100%; max-width:500px;">
            <h2 style="margin-bottom: 20px; color: var(--nexus); font-weight:800;"><i class="fa-solid fa-cloud-arrow-up"></i> GITHUB GIST CLOUD VAULT</h2>
            <div class="input-group"><label>GitHub Personal Access Token (PAT)</label><input type="password" id="input-cloud-key"></div>
            <div class="input-group"><label>Gist ID Corrente</label><input type="text" id="input-cloud-bin"></div>
            <div style="display:flex; gap:12px; margin-bottom:24px;">
                <button class="btn-action" style="border-color:var(--success); color:var(--success);" onclick="window.syncPullCloud()"><i class="fa-solid fa-cloud-arrow-down"></i> PULL GLOBAL</button>
                <button class="btn-action solid" style="background:var(--nexus);" onclick="window.syncPushCloud()"><i class="fa-solid fa-cloud-arrow-up"></i> PUSH STRUCTURE</button>
            </div>
            <div style="border-top:1px dashed var(--border); padding-top:16px; margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div style="font-weight:800; color:var(--accent); font-size:0.85rem;"><i class="fa-solid fa-timeline"></i> MACCHINA DEL TEMPO AUTONOMA</div>
                    <button class="btn-action solid" style="width:auto; padding:6px 12px; font-size:0.75rem; background:var(--accent); color:#000;" onclick="window.saveInternalSnapshot()">SCATTA SNAPSHOT</button>
                </div>
                <div id="internal-snapshots-container" style="max-height:200px; overflow-y:auto; padding-right:4px;"></div>
            </div>
            <button class="btn-action solid" onclick="window.closeModals();">CHIUDI PANNELLO CENTRALIZZATO</button>
        </div>
    </div>`;
    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', html);
    
    document.getElementById('input-cloud-key').value = localStorage.getItem('nexus_api_key') || '';
    document.getElementById('input-cloud-bin').value = localStorage.getItem('nexus_bin_id') || '';
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-cloud-vault').style.display = 'flex';
    window.loadInternalSnapshotList();
};
