// File: js/ui/nexus.js
import { State } from '../core/state.js';
import { Cerbero } from '../core/cerbero.js';
import { lazzaro_saveState } from '../core/lazzaro.js';
import { Ledger } from '../core/ledger.js';

const getModalLayer = () => {
    let layer = document.getElementById('modal-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'modal-layer';
        layer.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); z-index:9999; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';
        document.body.appendChild(layer);
    }
    return layer;
};

const closeModal = () => { getModalLayer().style.display = 'none'; };

/**
 * ============================================================================
 * 1. GESTIONE SEDI (HUB)
 * ============================================================================
 */
window.openModal_Sede = () => {
    if (State.activeProfile !== 'admin') return;
    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:400px; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0;">NUOVA SEDE OPERATIVA</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
                <input type="text" id="sede-name" placeholder="Nome Sede (es. Fiumicino)" style="width:100%;">
                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:8px;">
                    <button onclick="window.closeModal()" class="btn-action" style="background:var(--surface-variant); flex:1;">Annulla</button>
                    <button onclick="window.saveSede()" class="btn-action solid" style="flex:1;">Salva</button>
                </div>
            </div>
        </div>
    `;
    const layer = getModalLayer(); layer.innerHTML = html; layer.style.display = 'flex';
};

window.saveSede = async () => {
    const name = document.getElementById('sede-name').value.trim();
    if (!name) return;
    const id = 'sede_' + Date.now();
    State.appStructure.sedi[id] = { id, name, folders: {}, roles: [] };
    State.activeSede = id;
    await lazzaro_saveState();
    await Ledger.logAction('admin', 'CREAZIONE_SEDE', { id, name });
    closeModal(); window.renderApp();
};

window.switchSede = (sedeId) => {
    State.activeSede = sedeId;
    State.activeFolder = null; // Resetta il turno quando cambi sede
    window.renderApp();
    if (window.toggleMobileMenu) {
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && sidebar.classList.contains('open')) window.toggleMobileMenu();
    }
};

/**
 * ============================================================================
 * 2. GESTIONE OPERATORI E SQUADRE (MATRIOSKA ROLES)
 * ============================================================================
 */
window.openModal_Roles = () => {
    if (State.activeProfile !== 'admin') return;
    const sede = State.appStructure.sedi[State.activeSede];
    if (!sede) { if (window.showToast) window.showToast("Crea prima una Sede.", "error"); return; }
    
    let rolesHtml = '';
    (sede.roles || []).forEach(r => {
        rolesHtml += `
        <div style="background:var(--surface-variant); padding:12px; border-radius:var(--radius-sm); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:900; color:var(--text-main);">${r.name.toUpperCase()}</div>
                <div style="font-size:0.75rem; color:var(--accent);">${r.squadra ? r.squadra.toUpperCase() : 'Nessuna Squadra'}</div>
            </div>
            <button onclick="window.deleteRole('${r.id}')" class="btn-action" style="padding:6px 12px; background:rgba(255,180,171,0.1); color:var(--danger); border:none;"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    });

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:400px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="color:var(--accent); margin:0;">GESTIONE SQUADRE</h3>
                <button onclick="window.closeModal()" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem;">&times;</button>
            </div>
            
            <div style="background:rgba(0,0,0,0.2); padding:16px; border-radius:var(--radius-md); margin-bottom:16px;">
                <div style="font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:8px;">AGGIUNGI OPERATORE</div>
                <input type="text" id="role-name" placeholder="Nome Operatore" style="width:100%; margin-bottom:8px;">
                <input type="text" id="role-team" placeholder="Squadra (es. Cucina, Sala)" style="width:100%; margin-bottom:8px;">
                <input type="password" inputmode="numeric" id="role-pin" placeholder="PIN Numerico" style="width:100%; margin-bottom:12px;">
                <button onclick="window.saveRole()" class="btn-action solid" style="width:100%;"><i class="fa-solid fa-plus"></i> AGGIUNGI AL DATABASE</button>
            </div>

            <div style="overflow-y:auto; flex:1;">
                ${rolesHtml.length > 0 ? rolesHtml : '<div style="text-align:center; color:var(--text-muted); font-size:0.9rem;">Nessun operatore configurato.</div>'}
            </div>
        </div>
    `;
    const layer = getModalLayer(); layer.innerHTML = html; layer.style.display = 'flex';
};

window.saveRole = async () => {
    const name = document.getElementById('role-name').value.trim();
    const team = document.getElementById('role-team').value.trim();
    const pin = document.getElementById('role-pin').value.trim();
    
    if (!name || !pin) { if (window.showToast) window.showToast("Nome e PIN sono obbligatori.", "error"); return; }
    
    const sede = State.appStructure.sedi[State.activeSede];
    const id = 'op_' + Cerbero.cerbero_hashSimple(name + Date.now());
    
    sede.roles.push({ id, name, squadra: team, pin });
    await lazzaro_saveState();
    await Ledger.logAction('admin', 'CREAZIONE_OPERATORE', { name, team });
    
    window.openModal_Roles(); // Ricarica il modale
};

window.deleteRole = async (roleId) => {
    if (!confirm("Rimuovere definitivamente questo operatore?")) return;
    const sede = State.appStructure.sedi[State.activeSede];
    sede.roles = sede.roles.filter(r => r.id !== roleId);
    await lazzaro_saveState();
    window.openModal_Roles();
};

/**
 * ============================================================================
 * 3. GESTIONE TURNI (FOLDERS)
 * ============================================================================
 */
window.openModal_Folder = () => {
    if (State.activeProfile !== 'admin') return;
    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:400px; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0;">NUOVO TURNO OPERATIVO</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
                <input type="text" id="folder-name" placeholder="Nome Turno (es. Mattina, Serale)" style="width:100%;">
                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:8px;">
                    <button onclick="window.closeModal()" class="btn-action" style="background:var(--surface-variant); flex:1;">Annulla</button>
                    <button onclick="window.saveFolder()" class="btn-action solid" style="flex:1;">Salva</button>
                </div>
            </div>
        </div>
    `;
    const layer = getModalLayer(); layer.innerHTML = html; layer.style.display = 'flex';
};

window.saveFolder = async () => {
    const name = document.getElementById('folder-name').value.trim();
    if (!name) return;
    const sede = State.appStructure.sedi[State.activeSede];
    if (!sede.folders) sede.folders = {};
    const id = 'fld_' + Date.now();
    sede.folders[id] = { id, name, sections: {} };
    State.activeFolder = id;
    await lazzaro_saveState();
    await Ledger.logAction('admin', 'CREAZIONE_TURNO', { name });
    closeModal(); window.renderApp();
};

window.switchFolder = (folderId) => {
    State.activeFolder = folderId;
    window.renderApp();
};
/**
 * ============================================================================
 * 4. GESTIONE CELLE LOGICHE (SECTIONS) E COPIA-INCOLLA STRUTTURALE
 * ============================================================================
 */
window.openModal_Section = () => {
    if (State.activeProfile !== 'admin') return;
    const folder = State.appStructure.sedi[State.activeSede]?.folders[State.activeFolder];
    if (!folder) { if (window.showToast) window.showToast("Seleziona o crea un Turno prima di aggiungere una Cella.", "error"); return; }

    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:400px; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0;">NUOVA CELLA LOGICA</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
                <input type="text" id="sec-name" placeholder="Nome (es. Frigo Pizze, Forno)" style="width:100%;">
                <div style="display:flex; gap:12px; align-items:center;">
                    <label style="color:var(--text-muted); font-size:0.8rem; font-weight:800;">COLORE RIFERIMENTO:</label>
                    <input type="color" id="sec-color" value="#A8C7FA" style="width:50px; height:40px; border:none; border-radius:8px; cursor:pointer; background:transparent;">
                </div>
                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:8px;">
                    <button onclick="window.closeModal()" class="btn-action" style="background:var(--surface-variant); flex:1;">Annulla</button>
                    <button onclick="window.saveSection()" class="btn-action solid" style="flex:1;">Salva</button>
                </div>
            </div>
        </div>
    `;
    const layer = getModalLayer(); layer.innerHTML = html; layer.style.display = 'flex';
};

window.saveSection = async () => {
    const name = document.getElementById('sec-name').value.trim();
    const color = document.getElementById('sec-color').value;
    if (!name) return;
    
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    const id = 'sec_' + Date.now();
    folder.sections[id] = { id, name, color, items: {} };
    
    await lazzaro_saveState();
    await Ledger.logAction('admin', 'CREAZIONE_CELLA_LOGICA', { name });
    closeModal(); window.renderApp();
};

window.deleteSection = async (secId) => {
    if (!confirm("Rimuovere l'intera cella logica e tutto il suo contenuto?")) return;
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    delete folder.sections[secId];
    await lazzaro_saveState();
    await Ledger.logAction('admin', 'ELIMINAZIONE_CELLA', { secId });
    window.renderApp();
};

window.copySectionLogic = (secId) => {
    const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
    const secData = folder.sections[secId];
    if (secData) {
        sessionStorage.setItem('scutum_clipboard_section', JSON.stringify(secData));
        const btn = document.getElementById('floating-paste-btn');
        if (btn) btn.style.display = 'flex';
        if (window.showToast) window.showToast("Cella copiata. Seleziona un altro turno per incollarla.", "info");
    }
};

window.pasteSectionLogic = async () => {
    const clip = sessionStorage.getItem('scutum_clipboard_section');
    if (!clip) return;
    try {
        const secData = JSON.parse(clip);
        const folder = State.appStructure.sedi[State.activeSede].folders[State.activeFolder];
        if (!folder) return;
        
        const newSecId = 'sec_' + Date.now();
        const clonedSec = JSON.parse(JSON.stringify(secData));
        clonedSec.id = newSecId;
        
        // Rigenera ID degli item per evitare collisioni di stato
        const newItems = {};
        Object.keys(clonedSec.items).forEach((oldItemId, idx) => {
            const newItemId = 'it_' + Date.now() + '_' + idx;
            newItems[newItemId] = clonedSec.items[oldItemId];
            newItems[newItemId].id = newItemId;
        });
        clonedSec.items = newItems;
        
        folder.sections[newSecId] = clonedSec;
        await lazzaro_saveState();
        await Ledger.logAction('admin', 'INCOLLA_CELLA', { originalName: clonedSec.name });
        
        sessionStorage.removeItem('scutum_clipboard_section');
        const btn = document.getElementById('floating-paste-btn');
        if (btn) btn.style.display = 'none';
        
        window.renderApp();
        if (window.showToast) window.showToast("Cella incollata con successo.", "success");
    } catch (e) {
        console.error(e);
        if (window.showToast) window.showToast("Errore durante l'incollatura.", "error");
    }
};

/**
 * ============================================================================
 * 5. GESTIONE PRODOTTI E TASK (INVENTORY MODE & SOGLIE DINAMICHE)
 * ============================================================================
 */
window.openModal_Item = (secId) => {
    if (State.activeProfile !== 'admin') return;
    const html = `
        <div style="background:var(--surface); padding:24px; border-radius:var(--radius-lg); width:100%; max-width:400px; max-height:90vh; overflow-y:auto; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:var(--accent); margin-top:0;">AGGIUNGI PRODOTTO/TASK</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
                <input type="hidden" id="item-secId" value="${secId}">
                
                <div>
                    <label style="font-size:0.7rem; color:var(--text-muted); font-weight:800;">NOME IDENTIFICATIVO</label>
                    <input type="text" id="item-name" placeholder="Es. Impasto Biga, Mozzarella..." style="width:100%; margin-top:4px;">
                </div>
                
                <div>
                    <label style="font-size:0.7rem; color:var(--text-muted); font-weight:800;">TIPO ELEMENTO</label>
                    <select id="item-type" onchange="window.toggleItemTypeUI()" style="width:100%; margin-top:4px;">
                        <option value="magazzino">Magazzino (Calcolo Quantità)</option>
                        <option value="task">Azione / Task (Checklist)</option>
                    </select>
                </div>

                <div id="magazzino-ui" style="display:flex; flex-direction:column; gap:12px; background:var(--surface-variant); padding:16px; border-radius:var(--radius-md);">
                    <div style="font-size:0.8rem; font-weight:800; color:var(--accent);">SOGLIE OPERATIVE</div>
                    
                    <div>
                        <label style="font-size:0.7rem; color:var(--text-muted);">Unità di Misura</label>
                        <input type="text" id="item-unit" placeholder="pz, kg, lt..." value="pz" style="width:100%; margin-top:4px;">
                    </div>
                    
                    <div style="display:flex; gap:12px;">
                        <div style="flex:1;">
                            <label style="font-size:0.7rem; color:var(--text-muted);">Target Standard</label>
                            <input type="number" id="item-th-std" placeholder="Es. 100" style="width:100%; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.7rem; color:var(--danger); font-weight:800;">Alto Carico (Peak)</label>
                            <input type="number" id="item-th-peak" placeholder="Es. 170" style="width:100%; margin-top:4px; border-bottom:2px solid var(--danger);">
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:16px;">
                    <button onclick="window.closeModal()" class="btn-action" style="background:var(--surface-variant); flex:1;">Annulla</button>
                    <button onclick="window.saveItem()" class="btn-action solid" style="flex:1;">Salva Elemento</button>
                </div>
            </div>
        </div>
    `;
    const layer = getModalLayer(); layer.innerHTML = html; layer.style.display = 'flex';
    window.toggleItemTypeUI();
};

window.toggleItemTypeUI = () => {
    const type = document.getElementById('item-type').value;
    const magUI = document.getElementById('magazzino-ui');
    if (magUI) magUI.style.display = type === 'magazzino' ? 'flex' : 'none';
};

window.saveItem = async () => {
    const secId = document.getElementById('item-secId').value;
    const name = document.getElementById('item-name').value.trim();
    const type = document.getElementById('item-type').value;
    
    if (!name) return;

    const unit = document.getElementById('item-unit')?.value.trim() || 'pz';
    const th_std = parseInt(document.getElementById('item-th-std')?.value || '0', 10);
    const th_peak = parseInt(document.getElementById('item-th-peak')?.value || '0', 10);

    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[secId];
    const id = 'it_' + Date.now();
    const order = Object.keys(section.items).length;

    section.items[id] = { id, name, type, unit, th_std, th_peak, order };
    
    await lazzaro_saveState();
    await Ledger.logAction('admin', 'AGGIUNTA_PRODOTTO', { name, type });
    closeModal(); window.renderApp();
};

window.deleteItem = async (secId, itemId) => {
    if (!confirm("Rimuovere definitivamente questo elemento?")) return;
    const section = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections[secId];
    delete section.items[itemId];
    await lazzaro_saveState();
    window.renderApp();
};
