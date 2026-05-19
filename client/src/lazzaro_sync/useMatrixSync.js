import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import lazzaro_api from './api.js';
import { lazzaro_localDB } from './dexieDB.js';
import { useArchStore } from '../arch_store/store.js';

export default function useMatrixSync() {
  const activeSedeId = useArchStore((state) => state.activeSedeId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitoraggio continuo dello stato dell'hardware di rete del dispositivo
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); toast.success("Canale di rete ripristinato. Sincronizzazione in corso..."); svuotaCodaOffline(); };
    const goOffline = () => { setIsOnline(false); toast.error("Connessione Cloud interrotta. Modalità Isolamento Locale attiva."); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // 1. DOWNLOAD: Scarica i dati dal Cloud Server e aggiorna IndexedDB
  const scaricaDalCloud = async (sedeId) => {
    if (!sedeId) return;
    if (!navigator.onLine) {
        console.log("[Lazzaro Sync]: Dispositivo Offline. Caricamento dati di emergenza da IndexedDB.");
        return;
    }

    setIsSyncing(true);
    try {
      const res = await lazzaro_api.get(`/lazzaro/sync/${sedeId}`);
      if (res.data && res.data.success) {
        const { infrastruttura, matrice } = res.data.data;

        // Sovrascriviamo la cache locale atomica con i dati freschi del server
        await lazzaro_localDB.infrastruttura.put(infrastruttura);
        
        // Eseguiamo un'operazione di bulk put per massimizzare la velocità di scrittura su disco
        await lazzaro_localDB.items.bulkPut(matrice);
        
        console.log("[Lazzaro Sync]: Allineamento Cloud -> Locale completato con successo.");
      }
    } catch (err) {
      console.error("[Lazzaro Sync Error]: Impossibile scaricare la matrice remota.", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. UPLOAD: Salva una modifica (Check o Nota) sia in locale che sul Server
  const inviaMutazioneNodo = async (itemId, field, value) => {
    const timestamp = Date.now();
    const activeSede = useArchStore.getState().activeSedeId;

    // Aggiornamento istantaneo del database locale Dexie (Fattore Umano - Risposta UI immediata)
    await lazzaro_localDB.items.update(itemId, { [field]: value });

    if (navigator.onLine) {
      try {
        // Il dispositivo è online: inviamo la patch direttamente a MongoDB via API
        const itemCompleto = await lazzaro_localDB.items.get(itemId);
        await lazzaro_api.post('/lazzaro/item', itemCompleto);
        console.log(`[Lazzaro Sync]: Mutazione del nodo ${itemId} sincronizzata in Cloud.`);
      } catch (err) {
        // Se la chiamata fallisce nonostante fossimo online, accodiamo per sicurezza
        await lazzaro_localDB.coda_sincronizzazione.add({ itemId, field, value, timestamp, status: 'pending' });
      }
    } else {
      // Dispositivo offline: accodiamo la richiesta nella memoria protetta di Dexie
      await lazzaro_localDB.coda_sincronizzazione.add({ itemId, field, value, timestamp, status: 'pending' });
      console.log(`[Lazzaro Offline Guard]: Rete assente. Mutazione inserita nella coda protetta locale.`);
    }
  };

  // 3. BACKGROUND WORKER: Svuota la coda dei dati salvati in assenza di rete
  const svuotaCodaOffline = async () => {
    const coda = await lazzaro_localDB.coda_sincronizzazione.where('status').equals('pending').toArray();
    if (coda.length === 0) return;

    console.log(`[Lazzaro Auto-Recovery]: Rilevati ${coda.length} nodi da elaborare. Avvio svuotamento...`);

    for (const operazione of coda) {
      try {
        const itemCompleto = await lazzaro_localDB.items.get(operazione.itemId);
        if (itemCompleto) {
          await lazzaro_api.post('/lazzaro/item', itemCompleto);
          // Rimuoviamo l'operazione dalla coda se il server la accetta
          await lazzaro_localDB.coda_sincronizzazione.delete(operazione.id);
        }
      } catch (err) {
        console.error(`[Lazzaro Recovery Blocked]: Impossibile sincronizzare nodo ${operazione.itemId}. Slitterà alla prossima finestra.`);
        break; // Interrompiamo il ciclo in caso di fallimento persistente del server
      }
    }
    console.log("[Lazzaro Auto-Recovery]: Svuotamento completato.");
  };

  return {
    isSyncing,
    isOnline,
    scaricaDalCloud,
    inviaMutazioneNodo,
    forzaSvuotamentoCoda: svuotaCodaOffline
  };
}
