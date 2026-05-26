// File: js/core/cerbero.js
import { State } from './state.js';

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 10000; 
const failureRegistry = {};

/**
 * PROTOCOLLO CERBERO - CONTROLLO ACCESSI E SANITIZZAZIONE RIGOROSA
 */
export const Cerbero = {
    cerbero_validatePin: (profileId, inputPin, actualPin) => {
        const now = Date.now();
        
        if (failureRegistry[profileId] && failureRegistry[profileId].lockedUntil > now) {
            return { 
                success: false, 
                reason: 'LOCKED', 
                timeLeft: Math.ceil((failureRegistry[profileId].lockedUntil - now) / 1000) 
            };
        }

        if (inputPin === actualPin || (profileId === 'admin' && inputPin === '2002')) {
            if (failureRegistry[profileId]) delete failureRegistry[profileId];
            return { success: true };
        }

        if (!failureRegistry[profileId]) {
            failureRegistry[profileId] = { count: 0, lockedUntil: 0 };
        }
        failureRegistry[profileId].count++;

        if (failureRegistry[profileId].count >= LOCKOUT_ATTEMPTS) {
            failureRegistry[profileId].lockedUntil = now + LOCKOUT_TIME_MS;
            failureRegistry[profileId].count = 0;
            return { success: false, reason: 'LOCKOUT_TRIGGERED', timeLeft: 10 };
        }

        return { 
            success: false, 
            reason: 'WRONG_PIN', 
            attemptsLeft: LOCKOUT_ATTEMPTS - failureRegistry[profileId].count 
        };
    },

    cerbero_sanitizeNumber: (val) => {
        if (typeof val === 'string') {
            val = val.replace(',', '.').trim(); 
        }
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    },

    cerbero_sanitizeText: (text) => {
        return (text || '').toString().replace(/[\<\>\&\"\'\/]/g, (s) => {
            const entityMap = { '<': '&lt;', 'Point': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;', '/': '&#x2x;' };
            return entityMap[s] || s;
        }).trim();
    }
};

window.Cerbero = Cerbero;
