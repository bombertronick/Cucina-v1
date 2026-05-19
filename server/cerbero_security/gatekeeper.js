import jwt from 'jsonwebtoken';
import arch_config from '../arch_config/config.js';

const cerbero_gatekeeper = {
    // Middleware 1: Verifica l'autenticità della sessione dell'operatore
    verifyToken: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        
        // Il token deve seguire lo standard industriale "Bearer <TOKEN>"
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                code: 'UNAUTHORIZED',
                message: 'Firma digitale mancante o non valida. Gateway bloccato.'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, arch_config.security.jwtSecret);
            // Iniettiamo i metadati dell'operatore criptati direttamente nell'oggetto req per i middleware successivi
            req.operatore = {
                id: decoded.id,
                role: decoded.role,
                sedeId: decoded.sedeId,
                allowedCats: decoded.allowedCats || []
            };
            next();
        } catch (err) {
            return res.status(403).json({
                success: false,
                code: 'INVALID_TOKEN',
                message: 'Sessione corrotta o scaduta. Autenticazione respinta.'
            });
        }
    },
    
    // Middleware 2: Restringe l'accesso alle sole funzioni ROOT / AREA MANAGER
    isRoot: (req, res, next) => {
        if (!req.operatore || req.operatore.role !== 'admin') {
            console.error(`[Cerbero Violazione Accesso]: Tentativo di violazione privilegi Root da parte dell'ID: ${req.operatore?.id}`);
            return res.status(403).json({
                success: false,
                code: 'FORBIDDEN_ACCESS',
                message: 'Livello di autorizzazione insufficiente nell\'Organigramma Matrioska.'
            });
        }
        next();
    },
    
    // Middleware 3: Restringe l'accesso a un compartimento stagno (Isolamento Sede)
    enforceSedeIsolment: (req, res, next) => {
        const requestedSedeId = req.params.sedeId || req.body.sedeId;
        
        // Se l'operatore non è Root e sta tentando di accedere o manipolare i dati di un'altra sede, scatta l'allarme
        if (req.operatore.role !== 'admin' && req.operatore.sedeId !== requestedSedeId) {
            console.error(`[Cerbero Intercettazione]: Operatore ${req.operatore.id} ha tentato di superare il perimetro della Sede: ${requestedSedeId}`);
            return res.status(403).json({
                success: false,
                code: 'COMPARTMENT_VIOLATION',
                message: 'Violazione del Compartimento Stagno. I dati di questa sede sono inaccessibili al tuo profilo.'
            });
        }
        next();
    }
};

export default cerbero_gatekeeper;
