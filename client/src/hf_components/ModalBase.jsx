import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function ModalBase({ isOpen, onClose, title, children, maxWidth = 'max-w-[600px]' }) {
  
  // Blocca lo scroll del body (la pagina dietro) quando il modale è aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          
          {/* OVERLAY SCURO (Cliccare fuori NON chiude il modale per evitare perdite di dati) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* BOX DEL MODALE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className={`relative w-full ${maxWidth} bg-hf_card border border-hf_border rounded-[var(--radius-main)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden`}
          >
            {/* HEADER DEL MODALE */}
            <div className="flex justify-between items-center p-6 border-b border-hf_border shrink-0 bg-hf_bg/50">
              <h3 className="font-extrabold text-xl text-hf_accent tracking-tight">{title}</h3>
              <button 
                onClick={onClose}
                className="text-hf_text_muted hover:text-hf_accent transition-colors p-2 -mr-2"
              >
                <ArrowLeft size={24} />
              </button>
            </div>

            {/* CORPO DEL MODALE (Contenuto iniettato dal componente figlio) */}
            <div className="p-6 overflow-y-auto scroll-smooth">
              {children}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
