import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostra il banner dopo un breve delay per non essere invasivo al caricamento istantaneo
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    setShowBanner(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Installazione nativa avviata con successo.');
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed bottom-0 left-0 w-full bg-hf_card border-t-2 border-hf_accent p-5 z-[9999] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-4 pb-[calc(20px+env(safe-area-inset-bottom))] "
        >
          <div className="flex items-center gap-4 w-full md:w-auto">
            <img src="/logo.png" alt="App Icon" className="w-14 h-14 rounded-xl border-2 border-hf_accent object-cover" onError={(e) => e.target.style.display='none'} />
            <div className="text-left">
              <b className="text-hf_text text-lg block mb-1">Installa Scutum ERP</b>
              <span className="text-hf_text_muted text-sm font-semibold">Aggiungi alla Home per schermo intero e prestazioni native.</span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowBanner(false)} 
              className="flex-1 md:flex-none px-4 py-2 border-2 border-hf_border bg-hf_bg text-hf_text_muted font-bold rounded-lg uppercase text-sm"
            >
              Ignora
            </button>
            <button 
              onClick={handleInstallClick} 
              className="flex-1 md:flex-none px-4 py-2 bg-hf_accent text-hf_bg font-extrabold rounded-lg uppercase text-sm flex justify-center items-center gap-2"
            >
              <Download size={16} /> Installa
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
