import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import compression from 'compression';
import arch_config from './arch_config/config.js';

// Inizializzazione dell'applicazione Express
const app = express();

// 1. ENGINE DI OTTIMIZZAZIONE E LOGGING (ARCHITETTO CORE)
if (arch_config.server.env === 'development') {
    app.use(morgan('dev')); // Log concisi per lo sviluppo
} else {
    app.use(morgan('combined')); // Log estesi in formato Apache per produzione
}

// Compressione gzip attiva per ottimizzare il throughput dei dati e ridurre il carico sui dispositivi mobili
app.use(compression());

// Analizzatori sintattici (Parsers) integrati per i payload in ingresso
app.use(express.json({ limit: '10mb' })); // Protezione da payload massivi
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. CONFIGURAZIONE CONTROLLO ACCESSI (CORS PRE-CERBERO)
const whitelist = ['http://localhost:3000', 'http://localhost:5173']; // URL tipici di React/Vite
const corsOptions = {
    origin: function (origin, callback) {
        // Consente richieste senza origine (es. Mobile App native o strumenti di test come Postman)
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Accesso negato dalle policy di sicurezza CORS dell\'Architetto.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// 3. DIX (DIAGNOSTICA DI INTEGRITÀ DELL'INFRATRUTTURA)
app.get('/api/v1/arch-health', (req, res) => {
    res.status(200).json({
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
        environment: arch_config.server.env,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
    });
});

// 4. PREPARAZIONE HOOK STRUTTURALI (Verranno popolati nelle Fasi successive)
// TODO: Iniezione Middleware di Sicurezza Globale (Protocollo Cerbero)
// TODO: Iniezione Router delle API Compartimentate (Protocollo Lazzaro)

// 5. GESTORE GLOBALE DEI FALLIMENTI (ERROR HANDLING FALLBACK)
app.use((err, req, res, next) => {
    const errorResponse = {
        success: false,
        message: err.message || 'Errore interno dell\'infrastruttura server.',
        code: err.code || 'INTERNAL_SERVER_ERROR'
    };
    
    // Nascondiamo lo stack di tracciamento in produzione per evitare la fuga di informazioni di sistema
    if (arch_config.server.env === 'development') {
        errorResponse.stack = err.stack;
    }
    
    console.error(`[Architetto Critical Error]: ${err.stack}`);
    res.status(err.status || 500).json(errorResponse);
});

// 6. AVVIO HARDWARE
const arch_server_instance = app.listen(arch_config.server.port, () => {
    console.log(`================================================================`);
    console.log(` LOGICA ACCETTATA: CORE SERVER SCUTUM ABSOLUTE IS INIZIALIZZATO `);
    console.log(` PORTA OPERATIVA: ${arch_config.server.port}                             `);
    console.log(` MODALITÀ AMBIENTE: ${arch_config.server.env.toUpperCase()}                `);
    console.log(`================================================================`);
});

export { app, arch_server_instance };
