// File: js/core/cerbero.js

/**
 * ============================================================================
 * PROTOCOLLO CERBERO (Sicurezza e Crittografia)
 * ============================================================================
 */
export const Cerbero = {
    
    // Verifica se è il primissimo accesso assoluto al sistema
    isSystemVirgin: () => {
        return !localStorage.getItem('nexus_root_hash_absolute');
    },

    // Salva il PIN crittografato (SHA-256) per non lasciarlo in chiaro nel telefono
    setupRootSignature: (pin) => {
        // Fallback di sicurezza: se CryptoJS non è caricato usa una codifica base
        if (typeof CryptoJS !== 'undefined') {
            const hash = CryptoJS.SHA256(pin).toString();
            localStorage.setItem('nexus_root_hash_absolute', hash);
        } else {
            localStorage.setItem('nexus_root_hash_absolute', btoa(pin));
        }
        console.info("[Cerbero] Master Password ROOT ancorata con successo.");
    },

    // Verifica il PIN immesso contro l'hash salvato
    verifyRootSignature: (pin) => {
        const savedHash = localStorage.getItem('nexus_root_hash_absolute');
        if (!savedHash) return false;

        if (typeof CryptoJS !== 'undefined') {
            const inputHash = CryptoJS.SHA256(pin).toString();
            return inputHash === savedHash;
        } else {
            return btoa(pin) === savedHash;
        }
    }
};
