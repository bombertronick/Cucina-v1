import axios from 'axios';
import { useArchStore } from '../arch_store/store.js';

// Configurazione dell'istanza centralizzata Axios collegata all'Architetto Backend
const lazzaro_api = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    timeout: 10000, // Disconnessione automatica dopo 10 secondi per prevenire attese infinite
    headers: {
        'Content-Type': 'application/json'
    }
});

// INTERCETTATORE CERBERO: Prima di inviare la richiesta, verifica e inietta il Token JWT
lazzaro_api.interceptors.request.use(
    (config) => {
        const token = useArchStore.getState().hf_token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// GESTORE DEGLI ERRORI DI RETE CORRETI
lazzaro_api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Se il server risponde con 401 o 403, la sessione è scaduta o manomessa: forziamo il logout
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.error("[Cerbero Interception]: Token non valido o scaduto. Forzatura della chiusura sessione.");
            useArchStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default lazzaro_api;
