// File: js/core/state.js

/**
 * ============================================================================
 * STATE MANAGER (Memoria Volatile Centrale)
 * ============================================================================
 * L'unico punto di verità dell'applicazione. Tutte le modifiche vengono
 * apportate qui e poi congelate nel database da Lazzaro.
 */
export const State = {
    activeProfile: null,     // 'admin' o ID operatore base
    activeSede: null,        // ID della Sede selezionata
    activeFolder: null,      // ID del Turno selezionato
    activeFilter: null,      // Categoria Croma attualmente filtrata
    clipboardSection: null,  // Appunti per il Copia-Incolla delle Celle Logiche
    
    // Struttura Architetturale (Sedi, Turni, Sezioni, Prodotti)
    appStructure: {
        sedi: {}
    },
    
    // Stato Operativo (Quantità, Spunte, Note) - Chiave: sedeId_folderId_sectionId_itemId
    appState: {}
};
