// File: js/core/cloud.js

/**
 * ============================================================================
 * CLOUD VAULT (Motore API JSONBin V3)
 * ============================================================================
 * Modulo di rete puro. Isolato per prevenire dipendenze circolari.
 * Gestisce esclusivamente il fetch e il push dei dati crittografati o in chiaro.
 */

export const CloudVault = {
    
    // Recupera le chiavi API dalla memoria locale del dispositivo
    getCredentials: () => {
        return {
            binId: localStorage.getItem('scutum_bin_id') || '',
            apiKey: localStorage.getItem('scutum_api_key') || ''
        };
    },

    // Annota le chiavi API fornite dall'operatore ROOT
    saveCredentials: (binId, apiKey) => {
        if (!binId || !apiKey) return false;
        localStorage.setItem('scutum_bin_id', binId.trim());
        localStorage.setItem('scutum_api_key', apiKey.trim());
        return true;
    },

    // Verifica diagnostica della presenza delle chiavi
    isConfigured: () => {
        const creds = CloudVault.getCredentials();
        return creds.binId !== '' && creds.apiKey !== '';
    },

    // Scarica l'ultimo snapshot disponibile dal cloud (Metodo GET)
    pull: async () => {
        const { binId, apiKey } = CloudVault.getCredentials();
        if (!binId || !apiKey) {
            throw new Error("Credenziali Cloud mancanti o corrotte.");
        }

        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP Fallito: ${response.status} - Codice di risposta anomalo.`);
            }

            const data = await response.json();
            return data.record; 
        } catch (error) {
            console.error("[Cloud Vault] Errore critico durante il PULL:", error);
            throw error; // Rilancia l'errore per farlo gestire a Lazzaro (Fallback su IndexedDB)
        }
    },

    // Sovrascrive lo snapshot in cloud con i nuovi dati (Metodo PUT)
    push: async (payload) => {
        const { binId, apiKey } = CloudVault.getCredentials();
        if (!binId || !apiKey) {
            throw new Error("Credenziali Cloud mancanti o corrotte.");
        }

        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP Fallito: ${response.status} - Impossibile scrivere sul Vault.`);
            }

            const data = await response.json();
            return data.record;
        } catch (error) {
            console.error("[Cloud Vault] Errore critico durante il PUSH:", error);
            throw error; // Rilancia l'errore per il gestore offline
        }
    }
};
