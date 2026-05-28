// File: js/core/state.js

export const State = {
    // Struttura fissa: { sedi: { id_sede: { name, roles:[], folders: { id_folder: { name, sections: { id_section: { name, color, items:[] } } } } } } }
    appStructure: {
        sedi: {}
    },
    // Dati dinamici: chiave es. "sede1_folder1_section1_item1" -> { n_op: '10', done: true, note: '...' }
    appState: {},
    
    // Indicatori di navigazione
    activeSede: null,
    activeFolder: null,
    activeFilter: null,
    activeProfile: null,
    
    // Impostazioni Globali
    currentTheme: 'dark',
    peakOverride: false, // Se true, forza le soglie giornaliere massime ignorando i giorni impostati
    
    // Buffer per Copia/Incolla Celle Logiche
    clipboardSection: null
};

// Esposizione Forzata nel contesto Window per prevenire "ReferenceError" nei sottomoduli
window.State = State;
