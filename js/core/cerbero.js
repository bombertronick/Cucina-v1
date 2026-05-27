// File: js/core/cerbero.js

/**
 * CERBERO SECURITY ENGINE - SANITIZZAZIONE E CONTROLLO BRUTE-FORCE PERSISTENTE
 */
export const Cerbero = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_TIME_SEC: 60, // 1 minuto di isolamento per saturazione tentativi

    /**
     * Recupera il registro dei fallimenti direttamente dal LocalStorage del dispositivo
     */
    _getRegistry() {
        try {
            const data = localStorage.getItem('scutum_cerbero_registry');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    /**
     * Salva il registro dei fallimenti in modo persistente
     */
    _saveRegistry(registry) {
        try {
            localStorage.setItem('scutum_cerbero_registry', JSON.stringify(registry));
        } catch (e) {
            console.error("[CERBERO ERROR] Impossibile scrivere nel LocalStorage", e);
        }
    },

    /**
     * Svuota i caratteri speciali per prevenire attacchi di iniezione di codice base
     */
    cerbero_sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[<>`"'\\]/g, '').trim();
    },

    /**
     * Sgombra qualsiasi carattere non numerico o non decimale dagli input di quantità
     */
    cerbero_sanitizeNumber(value) {
        if (value === null || value === undefined) return 0;
        const stringValue = value.toString().replace(/,/g, '.');
        const parsed = parseFloat(stringValue);
        return isNaN(parsed) ? 0 : parsed;
    },

    /**
     * Valida il PIN fornito verificando lo stato di Lockout persistente sul LocalStorage
     */
    cerbero_validatePin(profileId, inputPin, actualPin) {
        const registry = this._getRegistry();
        const now = Date.now();

        // Inizializzazione record di sicurezza per il profilo specifico se inesistente
        if (!registry[profileId]) {
            registry[profileId] = { attempts: 0, lockoutUntil: 0 };
        }

        const profileRecord = registry[profileId];

        // Caso Limite 1: Profilo attualmente in stato di Lockout attivo
        if (profileRecord.lockoutUntil > now) {
            const timeLeft = Math.ceil((profileRecord.lockoutUntil - now) / 1000);
            return { success: false, reason: 'LOCKED', timeLeft: timeLeft };
        }

        // Caso Limite 2: Il tempo di Lockout è scaduto, reset automatico dei tentativi
        if (profileRecord.lockoutUntil > 0 && profileRecord.lockoutUntil <= now) {
            profileRecord.attempts = 0;
            profileRecord.lockoutUntil = 0;
            this._saveRegistry(registry);
        }

        // Sanitizzazione e confronto stringa del PIN immesso
        const cleanInput = inputPin.toString().trim();
        const cleanActual = actualPin.toString().trim();

        if (cleanInput === cleanActual && cleanActual !== '') {
            // Successo: Azzeramento definitivo dello storico fallimenti per l'utenza
            profileRecord.attempts = 0;
            profileRecord.lockoutUntil = 0;
            this._saveRegistry(registry);
            return { success: true };
        } else {
            // Fallimento: Incremento geometrico dei tentativi
            profileRecord.attempts++;
            
            if (profileRecord.attempts >= this.MAX_ATTEMPTS) {
                // Raggiungimento della soglia critica: calcolo e marcatura del timestamp di blocco
                profileRecord.lockoutUntil = now + (this.LOCKOUT_TIME_SEC * 1000);
                this._saveRegistry(registry);
                return { 
                    success: false, 
                    reason: 'LOCKOUT_TRIGGERED', 
                    timeLeft: this.LOCKOUT_TIME_SEC 
                };
            } else {
                this._saveRegistry(registry);
                return { 
                    success: false, 
                    reason: 'BAD_PIN', 
                    attemptsLeft: this.MAX_ATTEMPTS - profileRecord.attempts 
                };
            }
        }
    }
};

// Iniezione nello spazio globale per consentire l'interoperabilità asincrona con gli altri moduli UI
window.Cerbero = Cerbero;
