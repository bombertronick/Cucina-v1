// File: js/core/cerbero.js

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000; // 60 secondi di blocco totale
const lockoutRegistry = {}; // Registro volatile in RAM dei tentativi falliti

export const Cerbero = {
    /**
     * Valida il PIN e gestisce la logica di blocco in caso di tentativi di forza bruta.
     * @param {string} profileId - ID del ruolo operativo
     * @param {string} inputPin - PIN digitato dall'utente
     * @param {string} actualPin - PIN reale salvato nell'albero logistico
     * @returns {Object} { success: boolean, reason?: string, timeLeft?: number, attemptsLeft?: number }
     */
    cerbero_validatePin: (profileId, inputPin, actualPin) => {
        const now = Date.now();
        
        // Inizializza registro isolato per il profilo se non esiste
        if (!lockoutRegistry[profileId]) {
            lockoutRegistry[profileId] = { failedAttempts: 0, lockUntil: 0 };
        }
        
        const registry = lockoutRegistry[profileId];

        // 1. Verifica preventiva: il profilo è attualmente in blocco criogenico?
        if (now < registry.lockUntil) {
            const timeLeft = Math.ceil((registry.lockUntil - now) / 1000);
            return { success: false, reason: 'LOCKED', timeLeft: timeLeft };
        }

        // 2. Verifica crittografica (Confronto stringhe rigoroso)
        if (inputPin === actualPin) {
            // Autenticazione riuscita: azzera la memoria dei fallimenti
            registry.failedAttempts = 0;
            registry.lockUntil = 0;
            return { success: true };
        } else {
            // 3. Fallimento: incrementa il contatore
            registry.failedAttempts += 1;
            
            // Innesco Lockout se viene superata la soglia massima
            if (registry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
                registry.lockUntil = now + LOCKOUT_DURATION_MS;
                const timeLeft = Math.ceil(LOCKOUT_DURATION_MS / 1000);
                return { success: false, reason: 'LOCKOUT_TRIGGERED', timeLeft: timeLeft };
            }
            
            const attemptsLeft = MAX_FAILED_ATTEMPTS - registry.failedAttempts;
            return { success: false, reason: 'INVALID_PIN', attemptsLeft: attemptsLeft };
        }
    },

    /**
     * Filtro di decostruzione HTML per input stringa (Previene XSS Stored)
     * @param {string} input - Testo grezzo inserito dall'utente
     * @returns {string} Testo sanificato
     */
    cerbero_sanitizeText: (input) => {
        if (!input && input !== 0) return '';
        const str = String(input);
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    },

    /**
     * Normalizzatore matematico rigido per le quantità del magazzino
     * @param {any} input - Valore da calcolare
     * @returns {number} Numero in virgola mobile ripulito o 0
     */
    cerbero_sanitizeNumber: (input) => {
        if (input === null || input === undefined || input === '') return 0;
        const parsed = parseFloat(input);
        return isNaN(parsed) ? 0 : parsed;
    }
};
