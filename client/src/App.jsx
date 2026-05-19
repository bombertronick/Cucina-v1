import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useArchStore } from './arch_store/store.js';

// Placeholder temporanei per le View che scriveremo nella FASE 4.2
const LoginGateway = () => <div className="p-8 text-hf_accent">Gateway Login in costruzione...</div>;
const DashboardCore = () => <div className="p-8 text-hf_success">Matrice Operativa in costruzione...</div>;

function App() {
  const theme = useArchStore((state) => state.theme);
  const isAuthenticated = useArchStore((state) => state.isAuthenticated());

  // Iniezione forzata del tema nel DOM al variare dello stato
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      {/* Sistema di Notifiche Toast Globale */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--text)',
            border: '2px solid var(--border)',
            fontWeight: 'bold',
          }
        }} 
      />

      <div className="min-h-screen w-full bg-hf_bg text-hf_text font-sans overflow-hidden flex transition-colors duration-300">
        <Routes>
          {/* Rotta Pubblica: Gateway Login */}
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginGateway /> : <Navigate to="/app" replace />} 
          />
          
          {/* Rotta Privata: Gestionale Core */}
          <Route 
            path="/app/*" 
            element={isAuthenticated ? <DashboardCore /> : <Navigate to="/login" replace />} 
          />
          
          {/* Fallback Assoluto */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/app" : "/login"} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
