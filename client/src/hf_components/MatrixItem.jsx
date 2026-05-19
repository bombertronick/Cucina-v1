import React, { useState } from 'react';
import { Check, ShoppingCart, Minus, Plus, Info, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useArchStore } from '../arch_store/store';

export default function MatrixItem({ item, sectionId }) {
  const editMode = useArchStore((state) => state.editMode);
  
  // STATO LOCALE TEMPORANEO (Nella Fase 5 verrà connesso a Lazzaro/Zustand per la persistenza)
  const [fare, setFare] = useState(false);
  const [comprare, setComprare] = useState(false);
  const [qty, setQty] = useState(item.idealQty || 0);
  const [noteFare, setNoteFare] = useState('');
  const [noteComprare, setNoteComprare] = useState('');

  // Riconoscimento del tipo di reparto (Standard o Magazzino)
  const isMagazzino = item.catType === 'magazzino';

  return (
    <tr className={`border-b-2 border-hf_border transition-all duration-300 ${fare && !isMagazzino ? 'opacity-40 bg-black/10' : ''}`}>
      {/* COLONNA 1: IDENTITÀ E METADATI */}
      <td className="py-4 pr-4 align-middle w-1/3">
        <span className={`block font-extrabold text-lg mb-1 tracking-tight ${fare && !isMagazzino ? 'line-through text-hf_success' : 'text-hf_text'}`}>
          {item.name}
          <span className="ml-3 px-2 py-1 rounded-md text-[10px] uppercase font-extrabold border border-white/10" style={{ backgroundColor: item.catColor }}>
            {item.catName}
          </span>
        </span>
        
        <div className="flex flex-wrap gap-2 text-xs font-bold text-hf_text_muted mt-2">
          {!isMagazzino ? (
            <>
              {item.line && <span className="bg-hf_input px-2 py-1 border border-hf_border rounded-md">L: {item.line}</span>}
              {item.stock && <span className="bg-hf_input px-2 py-1 border border-hf_border rounded-md">S: {item.stock}</span>}
            </>
          ) : (
            <>
              <span className="bg-hf_accent_glow text-hf_accent border border-hf_accent/30 px-2 py-1 rounded-md">Target: {item.idealQty}</span>
              {item.uom && <span className="bg-hf_input border border-hf_border px-2 py-1 rounded-md">{item.uom}</span>}
            </>
          )}
          {item.supplier && (
            <span className="bg-hf_input px-2 py-1 border border-hf_border rounded-md opacity-80">{item.supplier}</span>
          )}
          {item.info && (
            <button className="bg-hf_accent_glow text-hf_accent border border-hf_accent/30 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-hf_accent hover:text-hf_bg transition-colors">
              <Info size={12} /> Info
            </button>
          )}
        </div>

        {/* CONTROLLI EDIT MODE (Solo visibili se l'Editor è sbloccato) */}
        {editMode && (
          <div className="flex gap-2 mt-4">
            <button className="p-2 bg-hf_input border border-hf_border rounded-lg text-hf_text hover:text-hf_accent transition-colors"><ArrowUp size={16} /></button>
            <button className="p-2 bg-hf_input border border-hf_border rounded-lg text-hf_text hover:text-hf_accent transition-colors"><ArrowDown size={16} /></button>
            <button className="p-2 bg-hf_warning rounded-lg text-black hover:scale-95 transition-transform"><Edit2 size={16} /></button>
            <button className="p-2 bg-hf_danger rounded-lg text-white hover:scale-95 transition-transform"><Trash2 size={16} /></button>
          </div>
        )}
      </td>

      {/* COLONNA 2: NOTE OPERATIVE */}
      <td className="py-4 px-4 align-middle w-1/3">
        <div className="flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Note Acquisto..." 
            value={noteComprare}
            onChange={(e) => setNoteComprare(e.target.value)}
            className="hf-input !py-2 !text-sm border-l-4 !border-l-hf_success" 
          />
          <input 
            type="text" 
            placeholder="Note Operative..." 
            value={noteFare}
            onChange={(e) => setNoteFare(e.target.value)}
            className="hf-input !py-2 !text-sm border-l-4 !border-l-hf_warning" 
          />
        </div>
      </td>

      {/* COLONNA 3: AZIONI (SPUNTE O CONTATORI) */}
      <td className="py-4 pl-4 align-middle text-right">
        {isMagazzino ? (
          // INTERFACCIA MAGAZZINO (+ e -)
          <div className="inline-flex items-center gap-1 bg-hf_input border-2 border-hf_border p-1 rounded-xl">
            <button onClick={() => setQty(Math.max(0, qty - 1))} className="w-10 h-10 flex items-center justify-center bg-hf_card rounded-lg text-hf_text font-extrabold active:scale-90 transition-transform">
              <Minus size={18} />
            </button>
            <input 
              type="number" 
              value={qty} 
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              className="w-14 text-center bg-transparent border-none text-hf_accent font-extrabold text-xl outline-none"
            />
            <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center bg-hf_accent_glow border border-hf_accent text-hf_accent rounded-lg font-extrabold active:scale-90 transition-transform">
              <Plus size={18} />
            </button>
          </div>
        ) : (
          // INTERFACCIA STANDARD (Spunte)
          <div className="inline-flex gap-2">
            <button 
              onClick={() => setComprare(!comprare)}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${comprare ? 'bg-[#356E3B]/20 border-hf_success text-hf_success' : 'bg-hf_input border-hf_border text-hf_text_muted hover:text-hf_success'}`}
            >
              <ShoppingCart size={20} />
            </button>
            <button 
              onClick={() => setFare(!fare)}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${fare ? 'bg-hf_accent_glow border-hf_warning text-hf_warning' : 'bg-hf_input border-hf_border text-hf_text_muted hover:text-hf_warning'}`}
            >
              <Check size={24} strokeWidth={3} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
