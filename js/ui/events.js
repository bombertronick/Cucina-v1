// File: js/ui/events.js

import { State, sanitize, safeFloat, generateUUID, PALETTE } from '../core/state.js';
import { saveStructure, saveState, executeRestore, fetchBackups } from '../core/lazzaro.js';
import { renderApp, renderContentCore, updateProgressBarUI, renderSidebar, renderFolders, renderCategories } from './renderer.js';
import { renderNexusHub, fulfillNexusOrder } from './nexus.js';

/**
 * ============================================================================
 * UTILITY VISIVE E FEEDBACK APTICO
 * ============================================================================
 */
export function haptic(ms = 20) { 
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

export function showToast(message, type = 'info') { 
    const container = document.getElementById('toast-container'); 
    if (!container) return; 
    const toast = document.createElement('div'); 
    toast.className = 'toast'; 
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const borderColor = isSuccess ? 'var(--success)' : (isError ? 'var(--danger)' : 'var(--accent)');
    const iconClass = isSuccess ? 'fa-circle-check' : (isError ? 'fa-triangle-exclamation' : 'fa-info-circle');
    
    toast.style.borderLeft = `4px solid ${borderColor}`; 
    toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color:${borderColor}; margin-right:12px;"></i> ${message}`; 
    container.appendChild(toast); 
    
    setTimeout(() => { 
        toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)'; 
        setTimeout(() => toast.remove(), 300); 
    }, 3500); 
}

export function switchSpaView(id) { 
    document.querySelectorAll('.spa-view').forEach(v => v.classList.remove('active')); 
    const target = document.getElementById(id); 
    if (target) target.classList.add('active'); 
}

export function closeModals(triggerHistoryBack = true) { 
    let modalFound = false; 
    document.querySelectorAll('.modal-overlay').forEach(modal => { 
        if (modal.style.display === 'flex') { 
            modalFound = true; modal.style.animation = 'none'; modal.style.opacity = '0'; 
            setTimeout(() => { 
                modal.style.display = 'none'; modal.style.opacity = '1'; 
                modal.style.animation = 'modalIn 0.3s var(--bezier) forwards'; 
            }, 250); 
        } 
    }); 
    document.body.classList.remove('modal-open'); 
    if (modalFound && triggerHistoryBack) history.back(); 
}

export function showModal(id) { 
    haptic(10); 
    const modal = document.getElementById(id); 
    if (modal) { 
        modal.style.display = 'flex'; document.body.classList.add('modal-open'); 
        history.pushState({ modal: id }, null, window.location.href); 
    } 
}

window.addEventListener('popstate', () => closeModals(false));

/**
 * ============================================================================
 * OPTIMISTIC UI UPDATERS (Zero-Lag UX)
 * ============================================================================
 */
async function handleToggleDone(stateKey, secId, btnElement) {
    haptic(40);
    if (!State.appState[stateKey]) State.appState[stateKey] = { done: false, q: 0, n_op: '' };
    State.appState[stateKey].done = !State.appState[stateKey].done;
    
    // Optimistic Update visivo immediato
    const isDone = State.appState[stateKey].done;
    btnElement.className = `btn-massive-action ${isDone ? 'done' : ''}`;
    btnElement.innerHTML = isDone ? '<i class="fa-solid fa-check-double"></i> COMPLETATO' : '<i class="fa-regular fa-square"></i> FATTO?';
    
    const row = document.getElementById(`row-${stateKey}`);
    if (row) {
        isDone ? row.classList.add('is-fulfilled') : row.classList.remove('is-fulfilled');
    }
    
    updateProgressBarUI(secId);
    
    // Salvataggio asincrono in background
    try { await saveState(); } 
    catch (e) { showToast("Errore di sincronizzazione disco.", "error"); }
}

async function handleUpdateQty(stateKey, delta, secId) {
    haptic(20);
    if (!State.appState[stateKey]) State.appState[stateKey] = { done: false, q: 0, n_op: '' };
    State.appState[stateKey].q = Math.max(0, safeFloat(State.appState[stateKey].q) + delta);
    
    // Optimistic Update
    const input = document.getElementById(`qty-${stateKey}`);
    if (input) input.value = State.appState[stateKey].q;
    
    // Ricalcolo visivo del deficit per inventario
    const ids = stateKey.split('_');
    const itemId = ids[3];
    const item = State.appStructure.sedi[ids[0]].folders[ids[1]].sections.find(s => s.id === ids[2])?.items.find(i => i.id === itemId);
    const cat = State.appStructure.sedi[ids[0]].categories.find(c => c.id === item?.catId);
    
    if (cat && cat.type === 'inventory' && item) {
        const deficit = Math.max(0, safeFloat(item.idealQty) - State.appState[stateKey].q);
        const box = document.getElementById(`box-${stateKey}`);
        if (box) {
            box.classList.remove('is-deficit', 'is-nexus-deficit');
            if (deficit > 0) box.classList.add(item.nexusSedeId ? 'is-nexus-deficit' : 'is-deficit');
        }
    }
    
    try { await saveState(); } catch (e) { showToast("Salvataggio fallito.", "error"); }
}

/**
 * ============================================================================
 * EVENT DELEGATION GLOBALE (Controller Mutex)
 * ============================================================================
 * Sostituisce tutti gli onclick inline. Impedisce memory leak e garantisce
 * il funzionamento dei pulsanti anche dopo re-render virtuali.
 */
let isProcessingClick = false; // Mutex per prevenire doppi tocchi accidentali

document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    if (!action) return;

    if (isProcessingClick && !['toggleDone', 'updateQty'].includes(action)) return;
    isProcessingClick = true;

    try {
        switch (action) {
            case 'toggleDone':
                await handleToggleDone(target.dataset.key, target.dataset.sec, target);
                break;
            case 'updateQty':
                await handleUpdateQty(target.dataset.key, safeFloat(target.dataset.delta), target.dataset.sec);
                break;
            case 'fulfillNexusOrder':
                await fulfillNexusOrder(target.dataset.fid, target.dataset.sid, target.dataset.itemid, safeFloat(target.dataset.qty), target.dataset.keys);
                break;
            case 'selectSede':
                State.activeSede = target.dataset.id;
                State.activeFolder = Object.keys(State.appStructure.sedi[State.activeSede]?.folders || {})[0] || null;
                renderApp();
                break;
            case 'selectFolder':
                State.activeFolder = target.dataset.id;
                renderFolders(); renderContentCore();
                break;
            case 'setCatFilter':
                State.activeCatFilter = target.dataset.id;
                renderCategories(); renderContentCore();
                break;
            case 'openSedeModal':
                State.currentEdit = { action: target.dataset.id ? 'edit' : 'new', id: target.dataset.id }; 
                document.getElementById('input-sede-name').value = target.dataset.id ? State.appStructure.sedi[target.dataset.id].name : ''; 
                showModal('modal-sede');
                break;
            case 'openFolderModal':
                State.currentEdit = { action: target.dataset.id ? 'edit' : 'new', id: target.dataset.id }; 
                document.getElementById('input-folder-name').value = target.dataset.id ? State.appStructure.sedi[State.activeSede].folders[target.dataset.id].name : ''; 
                showModal('modal-folder');
                break;
            case 'openSectionModal':
                State.currentEdit = { action: target.dataset.id ? 'edit' : 'new', id: target.dataset.id }; 
                const sc = document.getElementById('input-section-color'); sc.innerHTML = ''; 
                State.appStructure.sedi[State.activeSede].categories.forEach(c => sc.innerHTML += `<option value="${c.color}">${sanitize(c.name)}</option>`);
                if(target.dataset.id) { 
                    const s = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections.find(x => x.id === target.dataset.id); 
                    document.getElementById('input-section-name').value = s.name; sc.value = s.color; 
                } else { 
                    document.getElementById('input-section-name').value = ''; 
                }
                showModal('modal-section');
                break;
            case 'deleteSection':
                if (confirm("Disintegrare questa Cella Logica?")) {
                    State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections.filter(x => x.id !== target.dataset.id);
                    await saveStructure(); renderContentCore();
                }
                break;
            case 'deleteItem':
                if(confirm("Rimuovere Permanentemente il prodotto?")) { 
                    const s = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections.find(x => x.id === target.dataset.sec); 
                    s.items = s.items.filter(x => x.id !== target.dataset.item); 
                    await saveStructure(); renderContentCore(); 
                }
                break;
            case 'moveSection':
                let arrS = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections; 
                let iS = arrS.findIndex(x => x.id === target.dataset.id); 
                let dirS = parseInt(target.dataset.dir);
                if(iS < 0 || (dirS === -1 && iS === 0) || (dirS === 1 && iS === arrS.length - 1)) break; 
                [arrS[iS], arrS[iS+dirS]] = [arrS[iS+dirS], arrS[iS]]; 
                await saveStructure(); renderContentCore();
                break;
            case 'moveItem':
                let arrI = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections.find(x => x.id === target.dataset.sec).items; 
                let iI = arrI.findIndex(x => x.id === target.dataset.item); 
                let dirI = parseInt(target.dataset.dir);
                if(iI < 0 || (dirI === -1 && iI === 0) || (dirI === 1 && iI === arrI.length - 1)) break; 
                [arrI[iI], arrI[iI+dirI]] = [arrI[iI+dirI], arrI[iI]]; 
                await saveStructure(); renderContentCore();
                break;
            case 'openInfoModal':
                const infoSec = State.appStructure.sedi[State.activeSede].folders[State.activeFolder].sections.find(x => x.id === target.dataset.sec);
                const infoItem = infoSec?.items.find(x => x.id === target.dataset.item);
                if(infoItem && infoItem.info) {
                    document.getElementById('read-info-title').innerText = sanitize(infoItem.n); 
                    document.getElementById('read-info-content').innerHTML = sanitize(infoItem.info).replace(/\n/g, '<br>'); 
                    showModal('modal-info');
                }
                break;
            case 'openItemModal':
                // Nota: implementazione ridotta per brevità. Nel codice reale invoca il reset del form modale
                showToast("Modale Prodotto Attivato (Funzionalità limitata nel frammento)", "info");
                break;
        }
    } catch (e) {
        console.error(e);
        showToast("Operazione fallita a causa di un'anomalia di sistema.", "error");
    } finally {
        setTimeout(() => { isProcessingClick = false; }, 50); // Rilascio Mutex
    }
});

// Listener per i campi di Input dinamici (Note e Quantità diretta)
document.addEventListener('change', async (e) => {
    const target = e.target;
    if (target.dataset.action === 'updateQtyDirect') {
        const stateKey = target.dataset.key;
        if (!State.appState[stateKey]) State.appState[stateKey] = { done: false, q: 0, n_op: '' }; 
        State.appState[stateKey].q = Math.max(0, safeFloat(target.value)); 
        await saveState(); 
        
        // Ricalcolo deficit visivo immediato senza distruggere la tabella
        const ids = stateKey.split('_');
        const item = State.appStructure.sedi[ids[0]].folders[ids[1]].sections.find(s => s.id === ids[2])?.items.find(i => i.id === ids[3]);
        const cat = State.appStructure.sedi[ids[0]].categories.find(c => c.id === item?.catId);
        if (cat && cat.type === 'inventory' && item) {
            const box = document.getElementById(`box-${stateKey}`);
            if (box) {
                box.classList.remove('is-deficit', 'is-nexus-deficit');
                if (Math.max(0, safeFloat(item.idealQty) - State.appState[stateKey].q) > 0) box.classList.add(item.nexusSedeId ? 'is-nexus-deficit' : 'is-deficit');
            }
        }
    }
    else if (target.dataset.action === 'updateNote') {
        const stateKey = target.dataset.key;
        if (!State.appState[stateKey]) State.appState[stateKey] = { done: false, q: 0, n_op: '' }; 
        State.appState[stateKey].n_op = sanitize(target.value); 
        await saveState(); 
    }
});
