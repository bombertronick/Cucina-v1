import helmet from 'helmet';

const cerbero_headers = helmet({
    // Abilita la Content Security Policy (CSP) per bloccare script dannosi iniettati dall'esterno
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Consente script React locali
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:"], // Consente l'emblema Scutum locale o immagini di report
            connectSrc: ["'self'", "https://api.jsonbin.io", "https://keyvalue.immanuel.co"], // Whitelist per il Bypass Quantico
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    // Impedisce il caricamento del sito all'interno di <iframe> esterni (Anti-Clickjacking)
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    expectCt: { enforce: true, maxAge: 86400 },
    frameguard: { action: 'deny' },
    hidePoweredBy: true, // Nasconde "X-Powered-By: Express" per confondere i crawler maliziosi
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Forzo HTTPS permanente
    ieNoOpen: true,
    noSniff: true, // Blocco sniffing del tipo MIME
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true // Abilita il filtro XSS nativo del browser
});

export default cerbero_headers;
