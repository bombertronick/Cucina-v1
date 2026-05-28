// File: js/core/ledger.js
import { State } from './state.js';
import { lazzaro_saveState } from './lazzaro.js';

/**
 * ============================================================================
 * MOTORE LEDGER (TRACCIABILITÀ E AUDIT LOG DELLE OPERAZIONI)
 * ============================================================================
 */
export const Ledger = {
    /**
     * Registra un'operazione operativa nella memoria di Stato.
     * @param {string} profileId - ID dell'operatore che esegue l'azione
     * @param {string} actionType - Tipologia di azione (es. 'MODIFICA_QTA', 'LOGIN')
     * @param {Object} details - Dati specifici dell'operazione
     */
    logAction: async (profileId, actionType, details) => {
        if (!State.ledgerHistory) {
            State.ledgerHistory = [];
        }
        
        const logEntry = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            profileId: profileId,
            action: actionType,
            details: details
        };
        
        // Inserisce in testa all'array (LIFO per la cronologia)
        State.ledgerHistory.unshift(logEntry);
        
        // Anello di memoria circolare: mantiene solo gli ultimi 1000 eventi
        // per prevenire la saturazione dell'IndexedDB (Lazzaro)
        if (State.ledgerHistory.length > 1000) {
            State.ledgerHistory.pop();
        }
        
        // Salva asincronicamente
        await lazzaro_saveState();
    },
    
    getLogs: () => {
        return State.ledgerHistory || [];
    },
    
    clearLogs: async () => {
        State.ledgerHistory = [];
        await lazzaro_saveState();
        console.warn("[LEDGER] Registro Audit svuotato dall'amministratore.");
    }
};

// Esposizione per l'accesso da console in caso di debugging estremo
window.Ledger = Ledger;
