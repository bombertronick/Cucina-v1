import arch_config from '../arch_config/config.js';

// Mappa in memoria volatile per il tracciamento dei client (IP -> { count, resetTime })
const cerbero_ip_cache = new Map();

// Purga automatica della cache ogni 15 minuti per prevenire perdite di memoria (Memory Leaks)
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of cerbero_ip_cache.entries()) {
        if (now > data.resetTime) {
            cerbero_ip_cache.delete(ip);
        }
    }
}, arch_config.rateLimiting.windowMs);

const cerbero_limiter = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!cerbero_ip_cache.has(ip)) {
        cerbero_ip_cache.set(ip, {
            count: 1,
            resetTime: now + arch_config.rateLimiting.windowMs
        });
        return next();
    }
    
    const clientData = cerbero_ip_cache.get(ip);
    
    if (now > clientData.resetTime) {
        // La finestra temporale è scaduta, ricalibriamo il contatore
        clientData.count = 1;
        clientData.resetTime = now + arch_config.rateLimiting.windowMs;
        return next();
    }
    
    clientData.count++;
    
    if (clientData.count > arch_config.rateLimiting.maxRequests) {
        console.warn(`[Cerbero Anti-Intrusione]: Rilevato potenziale DDoS o Brute-Force dall'IP: ${ip}`);
        return res.status(429).json({
            success: false,
            code: 'TOO_MANY_REQUESTS',
            message: 'Soglia massima di richieste superata. Accesso bloccato dal Protocollo Cerbero per 15 minuti.'
        });
    }
    
    next();
};

export default cerbero_limiter;
