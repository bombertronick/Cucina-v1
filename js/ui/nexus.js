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
// File: js/ui/nexus.js (CONTINUAZIONE)

/**
 * ============================================================================
 * 3. MOTORE GESTIONE OPERATORI E CONTROLLO INTEGRITÀ (FIXED)
 * ============================================================================
 */
window.openOperatorListModal = () => {
    // INTERCETTORE DI SICUREZZA: Verifica esistenza Sede
    if (!State.activeSede || !State.appStructure.sedi[State.activeSede]) {
        console.warn("[NEXUS] Tentativo di accesso Operatori bloccato: Nessuna Sede attiva.");
        alert("ATTENZIONE: Prima di gestire gli operatori, devi aver creato o selezionato una Sede attiva.\n\nFlusso logico: [Configurazione Sede] -> [Associazione Squadre] -> [Gestione Operatori].");
        return;
    }

    if (document.getElementById('modal-operators')) return;
    
    const sede = State.appStructure.sedi[State.activeSede];
    const modalHTML = `
    <div id="modal-operators" class="modal-overlay" onclick="if(event.target===this) window.closeModals();">
        <div class="modal-box" style="width:100%; max-width:600px;">
            <h2 style="color:var(--accent); margin-bottom:20px;">
                <i class="fa-solid fa-users-gear"></i> GESTIONE OPERATORI: ${sede.name.toUpperCase()}
            </h2>
            
            <div id="operators-list" style="max-height: 400px; overflow-y:auto; margin-bottom:20px; border:1px solid var(--border); padding:10px;">
                ${sede.roles.map(op => `
                    <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span><strong>${op.name}</strong> <small>(${op.squadra})</small></span>
                        <button class="btn-action" style="background:var(--danger); border:none;" onclick="window.lazzaro_removeOperator('${op.id}')">ELIMINA</button>
                    </div>
                `).join('')}
            </div>

            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                <div class="input-group"><label>Nome Operatore</label><input type="text" id="new-op-name"></div>
                <div class="input-group"><label>Squadra / Reparto</label><input type="text" id="new-op-team" placeholder="Es. Squadra Mattino"></div>
                <button class="btn-action solid" onclick="window.lazzaro_addOperator()">AGGIUNGI A MATRICE</button>
            </div>
        </div>
    </div>`;

    document.getElementById('modal-layer').insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('modal-layer').style.display = 'flex';
    document.getElementById('modal-operators').style.display = 'flex';
};

window.lazzaro_addOperator = async () => {
    const name = Cerbero.cerbero_sanitizeText(document.getElementById('new-op-name').value);
    const squadra = Cerbero.cerbero_sanitizeText(document.getElementById('new-op-team').value);
    
    if (!name) return alert("Inserire nome operatore.");
    
    const sede = State.appStructure.sedi[State.activeSede];
    sede.roles.push({ id: 'op_' + Date.now(), name, squadra });
    
    window.closeModals();
    await lazzaro_saveState();
    window.openOperatorListModal(); // Riapre per feedback immediato
};

window.lazzaro_removeOperator = async (opId) => {
    const sede = State.appStructure.sedi[State.activeSede];
    sede.roles = sede.roles.filter(op => op.id !== opId);
    
    await lazzaro_saveState();
    window.closeModals();
    window.openOperatorListModal();
};
