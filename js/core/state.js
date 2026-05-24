// File: js/core/state.js

/**
 * ============================================================================
 * STATE MANAGER GLOBALE (Single Source of Truth)
 * ============================================================================
 * Centralizza tutte le variabili operative dell'applicazione per impedire
 * mutazioni non controllate e race-conditions tra moduli.
 */
export const State = {
    appStructure: { sedi: {} },
    appState: {},
    
    // Puntatori di navigazione
    activeSede: null,
    activeFolder: null,
    activeCatFilter: 'tutti',
    
    // Flag logici UI e rendering
    editMode: false,
    isFifo: false,
    showHiddenTimeGated: false,
    
    // Registri temporanei editor
    selectedColor: "#C9A464",
    currentEdit: {},
    activeItemDays: [],
    clipboardSection: null,
    currentReportTab: 'fare',
    
    // Token Sessione Corrente (dal layer di persistenza OS)
    activeProfile: localStorage.getItem('nexus_session') || null
};

// Costanti Cromatiche Globali
export const PALETTE = [
    "#C9A464", "#8C2222", "#356E3B", "#D2A850", 
    "#4A1218", "#201311", "#8A7270", "#F2E8E4", "#8A2BE2"
];

/**
 * ============================================================================
 * CORE UTILITIES MATEMATICHE E DI SICUREZZA
 * ============================================================================
 */

/**
 * Genera un UUID v4 crittograficamente sicuro basato sull'entropia hardware.
 * Risolve la collisione di ID in ambienti distribuiti multi-sede.
 */
export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
    // Fallback pseudo-casuale estremo se Web Crypto API è assente (vecchi OS)
    return 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Purifica le stringhe di input per neutralizzare vettori XSS secondari.
 */
export function sanitize(str) {
    if (str === null || str === undefined) return "";
    return str.toString().replace(/[<>"]/g, "'").trim();
}

/**
 * Converte stringhe in numeri interi sicuri per i contatori, respingendo NaN.
 */
export function safeInt(val, fallback = 0) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * Converte stringhe in float sicuri per calcoli monetari o materie prime.
 */
export function safeFloat(val, fallback = 0) {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
}
