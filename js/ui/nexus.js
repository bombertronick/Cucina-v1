// File: js/ui/nexus.js

import { State, sanitize, safeFloat } from '../core/state.js';
import { switchSpaView, haptic, showToast } from './events.js'; // Verranno definiti nel controller globale
import { saveState } from '../core/lazzaro.js';

/**
 * ============================================================================
 * MOTORE LOGISTICO NEXUS (Aggregatore Deficit)
 * ============================================================================
 * Scansiona passivamente l'intero database in RAM per rilevare le richieste 
 * delle pizzerie periferiche e convertirle in ordini di produzione centralizzati.
 */

export function renderNexusHub() {
    const container = document.getElementById('nexus-content'); 
    if (!State.activeSede || !State.appStructure.sedi[State.activeSede] || !container) return;
    
    let magazzinoItems = {}; 
    
    // Mappa le materie prime in magazzino centrale locale
    Object.keys(State.appStructure.sedi[State.activeSede].folders).forEach(fid => { 
        State.appStructure.sedi[State.activeSede].folders[fid].sections.forEach(sec => { 
            sec.items.forEach(item => { 
                const cat = State.appStructure.sedi[State.activeSede].categories.find(c => c.id === item.catId); 
                if (cat?.type === 'central_stock') { 
                    magazzinoItems[item.id] = { item: item, fid: fid, sid: sec.id, totalReq: 0, details: [] }; 
                } 
            }); 
        }); 
    });

    // Scansione topologica sedi remote
    Object.keys(State.appStructure.sedi).forEach(remoteSedeId => {
        if (remoteSedeId === State.activeSede) return; 
        
        Object.keys(State.appStructure.sedi[remoteSedeId].folders).forEach(rfid => { 
            State.appStructure.sedi[remoteSedeId].folders[rfid].sections.forEach(rsec => { 
                rsec.items.forEach(ritem => {
                    if (ritem.nexusSedeId === State.activeSede && magazzinoItems[ritem.nexusTargetItemId]) {
                        const stateKey = `${remoteSedeId}_${rfid}_${rsec.id}_${ritem.id}`; 
                        const st = State.appState[stateKey];
                        
                        if (st && !st.done) { 
                            let deficit = Math.max(0, safeFloat(ritem.idealQty) - safeFloat(st.q));
                            if (deficit > 0) {
                                let qtyToProduce = deficit * safeFloat(ritem.nexusMultiplier, 1); 
                                let targetMag = magazzinoItems[ritem.nexusTargetItemId]; 
                                
                                targetMag.totalReq += qtyToProduce;
                                targetMag.details.push({ 
                                    remoteSedeName: State.appStructure.sedi[remoteSedeId].name, 
                                    remoteItemName: ritem.n, 
                                    reqContainers: deficit, 
                                    stateKeyToClear: stateKey 
                                });
                            }
                        }
                    }
                }); 
            }); 
        });
    });

    // Render Markup (Zero Eventi Inline)
    let html = ''; 
    let hasRequests = false;
    
    for (let magItemId in magazzinoItems) {
        let magData = magazzinoItems[magItemId];
        if (magData.totalReq > 0) {
            hasRequests = true; 
            let uomStr = magData.item.uom ? ` ${sanitize(magData.item.uom)}` : '';
            let keysToClear = magData.details.map(d => d.stateKeyToClear).join(',');
            
            let detailsHtml = magData.details.map(d => `
                <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px dashed var(--border); font-size:1.1rem;">
                    <span style="color:var(--text-muted);"><i class="fa-solid fa-store" style="margin-right:8px;"></i> ${sanitize(d.remoteSedeName)}</span>
                    <span>${sanitize(d.remoteItemName)} <b>(Dcf: ${d.reqContainers})</b></span>
                </div>`).join('');
            
            html += `
            <div class="card" style="border: 2px solid var(--nexus); box-shadow: 0 4px 20px rgba(138, 43, 226, 0.15); margin-bottom: 32px;">
                <div class="card-header" style="background: rgba(138, 43, 226, 0.1); border-bottom: none; color:var(--text); padding:32px;">
                    <div style="display:flex; align-items:center; gap:20px;">
                        <i class="fa-solid fa-fire-burner" style="color:var(--nexus); font-size:2.5rem;"></i>
                        <div>
                            <div style="font-weight:800; font-size:1.6rem;">${sanitize(magData.item.n)}</div>
                            <div style="font-size:1rem; color:var(--text-muted);">Produzione Totale Richiesta</div>
                        </div>
                    </div>
                    <div style="font-size:3rem; font-weight:800; color:var(--nexus);">${magData.totalReq.toFixed(2)}${uomStr}</div>
                </div>
                <div style="padding: 32px; background:var(--bg);">
                    <div style="margin-bottom: 32px;">${detailsHtml}</div>
                    <button class="btn-action nexus" style="width:100%; border-radius:16px; padding: 24px;" data-action="fulfillNexusOrder" data-fid="${magData.fid}" data-sid="${magData.sid}" data-itemid="${magData.item.id}" data-qty="${magData.totalReq}" data-keys="${keysToClear}">
                        <i class="fa-solid fa-check-double" style="pointer-events:none;"></i> EVADI E SCALA MAGAZZINO
                    </button>
                </div>
            </div>`;
        }
    }

    if (!hasRequests) {
        html = `
        <div style="text-align:center; padding:100px 20px; border:2px dashed var(--border); border-radius:16px; color:var(--text-muted);">
            <i class="fa-solid fa-check-circle" style="font-size:6rem; color:var(--success); margin-bottom:20px;"></i><br>
            <b style="font-size:1.5rem;">Nessun Ordine Pendente.</b><br>Tutte le reti logistiche sono a Target.
        </div>`;
    }
    container.innerHTML = html;
}

export async function fulfillNexusOrder(fid, sid, itemId, totalQty, keysToClearStr) {
    haptic(50);
    if (!confirm(`Confermi l'evasione? Verranno scaricati ${totalQty} dal magazzino centrale.`)) return;
    
    // Deduzione magazzino centrale locale
    const localKey = `${State.activeSede}_${fid}_${sid}_${itemId}`;
    if (!State.appState[localKey]) State.appState[localKey] = { done: false, q: 0, n_op: '' };
    State.appState[localKey].q = Math.max(0, safeFloat(State.appState[localKey].q) - safeFloat(totalQty));

    // Congelamento deficit pizzerie remote (Marcatura "In Arrivo")
    const keysToClear = keysToClearStr.split(',');
    keysToClear.forEach(remoteKey => { 
        if (remoteKey && State.appState[remoteKey]) { 
            State.appState[remoteKey].done = true; 
        } 
    });
    
    await saveState(); 
    showToast("Produzione evasa. Stock periferico aggiornato.", "success"); 
    renderNexusHub(); 
}
