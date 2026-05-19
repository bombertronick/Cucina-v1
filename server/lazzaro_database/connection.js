import mongoose from 'mongoose';
import arch_config from '../arch_config/config.js';

const lazzaro_connectDB = async () => {
    try {
        // Opzioni di resilienza per il database
        const lazzaro_options = {
            ...arch_config.database.options,
            serverSelectionTimeoutMS: 5000,
            family: 4 // Forza l'uso di IPv4 per prevenire lag di risoluzione DNS
        };

        // Aggancio gli eventi del driver per il monitoraggio continuo
        mongoose.connection.on('connected', () => {
            console.log('[Lazzaro Protocol]: Connessione stabilita con la Matrice Dati (MongoDB).');
        });

        mongoose.connection.on('error', (err) => {
            console.error(`[Lazzaro Critical]: Rottura del canale dati. Errore: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('[Lazzaro Warning]: Disconnessione rilevata. Avvio protocollo di auto-ripristino...');
        });

        // Esecuzione della connessione
        const conn = await mongoose.connect(arch_config.database.uri, lazzaro_options);
        console.log(`[Lazzaro Protocol]: Operativo su Cluster -> ${conn.connection.host}`);
        
        return conn;

    } catch (error) {
        console.error(`[Lazzaro Fatal Error]: Impossibile inizializzare il Database. Dettagli: ${error.message}`);
        // Uscita forzata (Exit 1) per permettere ai gestori di processi (es. PM2/Docker) di riavviare il server
        process.exit(1); 
    }
};

export default lazzaro_connectDB;
