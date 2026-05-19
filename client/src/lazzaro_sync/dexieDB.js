import Dexie from 'dexie';

// Inizializzazione dell'istanza Dexie local database
export const lazzaro_localDB = new Dexie('scutum_absolute_local_db');

// Definizione dello schema architetturale e degli indici di ricerca rapidi
lazzaro_localDB.version(1).stores({
    // Memorizza le informazioni generali sulla sede (ruoli autorizzati, categorie reparti)
    infrastruttura: 'sedeId, name',
    
    // Memorizza i nodi prodotto fisici scaricati o creati localmente
    items: 'itemId, sedeId, turnoId, sectionId, name, catId',
    
    // La coda di sincronizzazione: memorizza le modifiche fatte in modalità offline (Check, Spunte, Note)
    coda_sincronizzazione: '++id, itemId, field, value, timestamp, status'
});

// Funzione helper per ripulire la cache locale in caso di formattazione o logout completo
export async function lazzaro_clearLocalCache() {
    await lazzaro_localDB.infrastruttura.clear();
    await lazzaro_localDB.items.clear();
    await lazzaro_localDB.coda_sincronizzazione.clear();
    console.log("[Lazzaro Local Storage]: Cache hardware ripulita con successo.");
}
