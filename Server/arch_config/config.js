import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Risoluzione della directory per garantire un caricamento affidabile del file .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const arch_config = {
    // Configurazione Server Fisico
    server: {
        port: parseInt(process.env.PORT || '5000', 10),
        env: process.env.NODE_ENV || 'development',
        apiUrl: process.env.API_URL || 'http://localhost:5000'
    },
    
    // Configurazione del Motore di Persistenza (Lazzaro Cloud)
    database: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:2017/scutum_absolute',
        options: {
            autoIndex: true,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        }
    },
    
    // Configurazione Criptografica e Token Sessione (Cerbero Core)
    security: {
        jwtSecret: process.env.JWT_SECRET || 'scutum_absolute_quantum_jwt_secret_key_v15_4',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
        cookieSecret: process.env.COOKIE_SECRET || 'scutum_absolute_secure_cookie_signature_hash',
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)
    },
    
    // Compartimenti Stagni e Regole di Limitazione del traffico
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 Minuti
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
    }
};

// Congeliamo l'oggetto per prevenire mutazioni a runtime da parte di codice terzo o moduli esterni
Object.freeze(arch_config);
Object.freeze(arch_config.server);
Object.freeze(arch_config.database);
Object.freeze(arch_config.security);
Object.freeze(arch_config.rateLimiting);

export default arch_config;
