import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import AccordionLogin from '../hf_components/AccordionLogin';
import { useArchStore } from '../arch_store/store';

export default function LoginGateway() {
  const [selectedUser, setSelectedUser] = useState({ id: null, name: '' });
  const [pin, setPin] = useState('');
  const [groups, setGroups] = useState({});
  const login = useArchStore((state) => state.login);

  // In un'implementazione reale, qui faremmo una fetch per ottenere la lista pubblica dei ruoli (senza PIN)
  // Per ora mockiamo la struttura per garantire il mount visivo perfetto.
  useEffect(() => {
    // Mock Data - verrà sostituito dalla chiamata Axios a Lazzaro
    setGroups({
      'BRIGATA CUCINA': [
        { id: 'user_1', name: 'Mario Rossi', type: 'erp' },
        { id: 'user_2', name: 'Luigi Verdi', type: 'checklist' }
      ],
      'SALA E CASSA': [
        { id: 'user_3', name: 'Giulia Bianchi', type: 'erp' }
      ]
    });
  }, []);

  const handleLogin = async () => {
    if (!selectedUser.id) {
      return toast.error("Seleziona prima un'identità dall'elenco.");
    }
    if (!pin) {
      return toast.error("Inserisci la Firma Criptografica (PIN).");
    }

    try {
      // TODO: Integrazione Axios col backend (FASE 5)
      // const res = await axios.post('/api/v1/auth/login', { userId: selectedUser.id, pin });
      
      // Simulazione Login Approvato (Cerbero Client-Side bypass temporaneo)
      if (pin === '0000' || pin === '1234') {
        login('mock_jwt_token_15_4', { id: selectedUser.id, name: selectedUser.name, role: selectedUser.id === 'admin' ? 'admin' : 'user' });
        toast.success("Accesso Consentito. Benvenuto.");
      } else {
        toast.error("Firma Respinta dal Gateway.");
      }
    } catch (err) {
      toast.error("Errore di comunicazione col Server.");
    }
  };

  return (
    <div className="flex w-full h-full items-center justify-center p-6 relative">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-[420px] bg-hf_card border-2 border-hf_border rounded-2xl p-8 pt-12 relative shadow-hard flex flex-col items-center"
      >
        {/* Emblema Scutum Assoluto */}
        <div className="absolute -top-[65px] w-[130px] h-[130px] rounded-full bg-hf_bg border-[4px] border-hf_accent flex items-center justify-center overflow-hidden shadow-glow">
           <img src="/logo.png" alt="Scutum ERP" className="object-cover w-full h-full" onError={(e) => e.target.style.display='none'} />
        </div>

        <h2 className="font-extrabold text-3xl text-hf_accent uppercase tracking-tighter mt-4">Scutum ERP</h2>
        <p className="text-sm text-hf_text_muted font-extrabold uppercase tracking-widest mb-8">Protocollo Accesso</p>

        {/* Selezione Identità (Accordion) */}
        <div className="w-full mb-6 text-left">
          <label className="block text-xs font-extrabold text-hf_text_muted uppercase tracking-wider mb-2">Identità Operativa</label>
          <AccordionLogin 
            groups={groups} 
            selectedUserId={selectedUser.id} 
            onSelectUser={(id, name) => setSelectedUser({ id, name })} 
          />
          
          {selectedUser.id && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-[#356E3B]/10 border border-hf_success p-4 rounded-xl text-center"
            >
              <span className="text-xs text-hf_success font-extrabold uppercase block mb-1">Operatore Autorizzato</span>
              <span className="text-hf_text font-extrabold text-lg">{selectedUser.name.toUpperCase()}</span>
            </motion.div>
          )}
        </div>

        {/* Input PIN */}
        <div className="w-full mb-10 text-left">
          <label className="block text-xs font-extrabold text-hf_text_muted uppercase tracking-wider mb-2">Firma Criptografica (PIN)</label>
          <input 
            type="password" 
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="hf-input text-center text-3xl tracking-[1em]"
            maxLength={8}
          />
        </div>

        <button onClick={handleLogin} className="hf-btn-action hf-btn-solid">
          INIZIALIZZA SESSIONE <Zap size={20} className="ml-2" />
        </button>
      </motion.div>
    </div>
  );
}
