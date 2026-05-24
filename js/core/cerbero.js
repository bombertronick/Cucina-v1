// File: js/core/cerbero.js

/**
 * ============================================================================
 * PROTOCOLLO CERBERO (Security Layer)
 * ============================================================================
 * Modulo ES6 incaricato di crittografare, validare e sigillare ogni dato.
 * Si appoggia a CryptoJS (caricato in modo sincrono nell'Head).
 */

const SYSTEM_SALT = "Scutum_V15.8_Absolute_Crypto_Salt_X91_Monolith"; 
const VAULT_KEY = "nexus_cloud_vault_crypted"; 
const ROOT_PIN_KEY = "nexus_root_hash_absolute";

/**
 * Esegue il Key Stretching (1000 iterazioni).
 * Protegge il database contro gli attacchi di forza bruta offline prolungando 
 * esponenzialmente il tempo di calcolo richiesto per craccare gli hash.
 */
function stretchKey(text) {
    if (!text) return null;
    if (typeof window.CryptoJS === 'undefined') throw new Error("[Cerbero] Motore AES non agganciato.");
    
    let hash = window.CryptoJS.SHA256(text + SYSTEM_SALT).toString(window.CryptoJS.enc.Hex);
    for (let i = 0; i < 1000; i++) {
        hash = window.CryptoJS.SHA256(hash + SYSTEM_SALT).toString(window.CryptoJS.enc.Hex);
    }
    return hash;
}

function encryptAES(payload, secretKey) {
    if (!payload || !secretKey) return null;
    return window.CryptoJS.AES.encrypt(payload, stretchKey(secretKey)).toString();
}

function decryptAES(cipherText, secretKey) {
    if (!cipherText || !secretKey) return null;
    try {
        return window.CryptoJS.AES.decrypt(cipherText, stretchKey(secretKey)).toString(window.CryptoJS.enc.Utf8) || null;
    } catch (e) {
        return null;
    }
}

export const Cerbero = {
    setupRootSignature(pin) { 
        localStorage.setItem(ROOT_PIN_KEY, stretchKey(pin)); 
        return true; 
    },
    
    verifyRootSignature(pin) { 
        const storedHash = localStorage.getItem(ROOT_PIN_KEY); 
        return storedHash ? stretchKey(pin) === storedHash : false; 
    },
    
    isSystemVirgin() { 
        return localStorage.getItem(ROOT_PIN_KEY) === null; 
    },
    
    hashOperatorPin(pin) { 
        return stretchKey(pin); 
    },
    
    verifyOperatorSignature(pinAttempt, storedHash) { 
        return storedHash ? stretchKey(pinAttempt) === storedHash : false; 
    },
    
    storeCloudVault(apiKey, rootPin) { 
        if (!this.verifyRootSignature(rootPin)) throw new Error("Firma Root respinta dal Firewall."); 
        localStorage.setItem(VAULT_KEY, encryptAES(apiKey, rootPin)); 
        return true; 
    },
    
    unlockCloudVault(rootPin) { 
        const encryptedKey = localStorage.getItem(VAULT_KEY); 
        if (!encryptedKey) return null; 
        
        const decryptedKey = decryptAES(encryptedKey, rootPin); 
        if (!decryptedKey) throw new Error("Violazione Vault. PIN di sblocco errato."); 
        
        return decryptedKey; 
    },
    
    isCloudVaultSealed() { 
        return localStorage.getItem(VAULT_KEY) !== null; 
    }
};
