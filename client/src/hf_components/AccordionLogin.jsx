import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Users, ShieldAlert } from 'lucide-react';

export default function AccordionLogin({ groups, selectedUserId, onSelectUser }) {
  const [openGroup, setOpenGroup] = useState(null);

  const toggleGroup = (groupName) => {
    setOpenGroup(openGroup === groupName ? null : groupName);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Gruppo Root Sempre Presente */}
      <div className="border-2 border-hf_border rounded-xl overflow-hidden bg-hf_bg">
        <button
          onClick={() => toggleGroup('ROOT')}
          className="w-full p-4 bg-hf_card text-hf_text font-extrabold flex justify-between items-center hover:bg-hf_border transition-colors"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="text-hf_accent" size={18} />
            SISTEMA ASSOLUTO
          </span>
          <motion.div animate={{ rotate: openGroup === 'ROOT' ? 180 : 0 }}>
            <ChevronDown size={18} className="text-hf_text_muted" />
          </motion.div>
        </button>
        
        <AnimatePresence>
          {openGroup === 'ROOT' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-hf_input"
            >
              <button
                onClick={() => onSelectUser('admin', 'Root / Area Manager')}
                className={`w-full p-4 text-left border-b border-hf_border font-bold transition-all ${
                  selectedUserId === 'admin' ? 'bg-hf_accent_glow text-hf_accent pl-6' : 'text-hf_text_muted hover:text-hf_accent hover:pl-6'
                }`}
              >
                Root / Area Manager
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Render Dinamico dei Gruppi (Matrioska) forniti dalle props */}
      {Object.entries(groups).map(([groupName, users]) => (
        <div key={groupName} className="border-2 border-hf_border rounded-xl overflow-hidden bg-hf_bg">
          <button
            onClick={() => toggleGroup(groupName)}
            className="w-full p-4 bg-hf_card text-hf_text font-extrabold flex justify-between items-center hover:bg-hf_border transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users className="text-hf_text_muted" size={18} />
              {groupName}
            </span>
            <motion.div animate={{ rotate: openGroup === groupName ? 180 : 0 }}>
              <ChevronDown size={18} className="text-hf_text_muted" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openGroup === groupName && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-hf_input"
              >
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user.id, user.name)}
                    className={`w-full p-4 text-left border-b border-hf_border font-bold transition-all ${
                      selectedUserId === user.id ? 'bg-hf_accent_glow text-hf_accent pl-6' : 'text-hf_text_muted hover:text-hf_accent hover:pl-6'
                    }`}
                  >
                    {user.name}
                    {user.type === 'checklist' && (
                      <span className="ml-2 text-xs text-hf_warning">[Isolato]</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
