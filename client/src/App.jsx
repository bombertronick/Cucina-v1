import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useArchStore } from './arch_store/store.js';

// =====================================================================
// IMPORTIAMO I COMPONENTI REALI (Addio Placeholder!)
// =====================================================================
import LoginGateway from './hf_views/LoginGateway';
import DashboardCore from './hf_views/DashboardCore'; // <-- Il file che hai appena creato
import InstallBanner from './hf_components/InstallBanner';

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

      {/* Protocollo Cerbero: Banner Installazione */}
      <InstallBanner />

      <div className="min-h-screen w-full bg-hf_bg text-hf_text font-sans overflow-hidden flex transition-colors duration-300">
        <Routes>
          {/* Rotta Pubblica: Gateway Login */}
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginGateway /> : <Navigate to="/app" replace />} 
          />
          
          {/* Rotta Privata: Gestionale Core (Ora usa il componente VERO) */}
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
