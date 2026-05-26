// File: js/core/state.js

/**
 * ============================================================================
 * MATRIX STATE ENGINE - REGISTRO UNIFICATO GLOBAL
 * ============================================================================
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
    peakOverride: false, // Modalità Alto Carico per forzatura soglie
    currentTheme: 'dark'
};
