// File: js/core/state.js

/**
 * MATRIX STATE ENGINE - REGISTRO UNIFICATO GLOBALE
 */
export const State = {
    appStructure: {
        sedi: {}
    },
    appState: {},
    syncQueue: [],
    activeSede: null,
    activeFolder: null,
    activeProfile: null,
    activeFilter: null,
    clipboardSection: null,
    peakOverride: false, 
    currentTheme: 'dark'
};
