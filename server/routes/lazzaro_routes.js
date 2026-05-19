import express from 'express';
import cerbero_gatekeeper from '../cerbero_security/gatekeeper.js';
import { lazzaro_SedeModel, lazzaro_ItemModel } from '../lazzaro_database/schema.js';

const router = express.Router();

// ==============================================================================
// GET: SINCRONIZZAZIONE DOWNLOAD (Recupera i dati completi di una Sede)
// PROTEZIONI: Verifica Token JWT -> Verifica Isolamento Sede
// ==============================================================================
router.get('/sync/:sedeId', 
    cerbero_gatekeeper.verifyToken, 
    cerbero_gatekeeper.enforceSedeIsolment, 
    async (req, res, next) => {
        try {
            const { sedeId } = req.params;

            // 1. Estrazione Struttura Base
            const lazzaro_sede = await lazzaro_SedeModel.findOne({ sedeId, isActive: true }).lean();
            if (!lazzaro_sede) {
                return res.status(404).json({ success: false, message: 'Compartimento Sede non trovato.' });
            }

            // 2. Estrazione Matrice Prodotti
            const lazzaro_items = await lazzaro_ItemModel.find({ sedeId }).lean();

            // Ritorna il pacchetto dati assemblato
            res.status(200).json({
                success: true,
                data: {
                    infrastruttura: lazzaro_sede,
                    matrice: lazzaro_items
                }
            });
        } catch (error) {
            next(error); // Invia l'errore al gestore globale di Express
        }
    }
);

// ==============================================================================
// POST: SALVATAGGIO ELEMENTO (Upsert di un Nodo Prodotto)
// PROTEZIONI: Verifica Token JWT -> Solo Operatori autorizzati
// ==============================================================================
router.post('/item', 
    cerbero_gatekeeper.verifyToken, 
    async (req, res, next) => {
        try {
            const payload = req.body; 
            
            // Verifica di Sicurezza extra: l'operatore può operare su questa sede?
            if (req.operatore.role !== 'admin' && req.operatore.sedeId !== payload.sedeId) {
                return res.status(403).json({ success: false, message: 'Operazione respinta. Isolamento sede violato.' });
            }

            // Upsert (Update se esiste, Insert se non esiste)
            const lazzaro_savedItem = await lazzaro_ItemModel.findOneAndUpdate(
                { itemId: payload.itemId }, 
                { $set: payload },
                { new: true, upsert: true }
            );

            res.status(200).json({
                success: true,
                message: 'Nodo Prodotto innestato con successo.',
                item: lazzaro_savedItem
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
