import React, { useState } from 'react';
import { Menu, Moon, RotateCcw, Search, Eye, ArrowDownAZ } from 'lucide-react';
import { useArchStore } from '../arch_store/store';

export default function MatrixGrid({ onOpenSidebar }) {
  const toggleTheme = useArchStore((state) => state.toggleTheme);
  const activeFolderId = useArchStore((state) => state.activeFolderId);
  const setActiveFolder = useArchStore((state) => state.setActiveFolder);
  const editMode = useArchStore((state) => state.editMode);

  // Stati locali per la ricerca e i filtri della griglia
  const [searchQuery, setSearchQuery] = useState('');
  const [isFifo, setIsFifo] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // MOCK DATA TEMPORANEO (In attesa della Fase 5)
  const mockFolders = [
    { id: 'f1', name: 'TURNO MATTINA' },
    { id: 'f2', name: 'TURNO SERALE' }
  ];

  return (
    <div className="flex-1 flex flex-col w-full h-full p-6 pt-safe-top pb-[calc(120px+env(safe-area-inset-bottom))] overflow-y-auto scroll-smooth">
      
      {/* TOP BAR NAVIGAZIONALE */}
      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenSidebar}
            className="md:hidden w-12 h-12 flex items-center justify-center rounded-xl bg-hf_card border border-hf_border text-hf_text hover:border-hf_accent transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-extrabold text-xl md:text-2xl text-hf_text uppercase tracking-tight truncate max-w-[200px] md:max-w-md">
            COMANDO CENTRALE
          </h1>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={toggleTheme}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-hf_card border border-hf_border text-hf_text hover:text-hf_accent hover:border-hf_accent transition-all"
          >
            <Moon size={20} />
          </button>
          <button 
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-hf_danger/10 border border-hf_danger text-hf_danger hover:bg-hf_danger hover:text-white transition-all"
            title="Purga Operazioni Odierne"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* MOTORE DI RICERCA */}
      <div className="w-full max-w-3xl mx-auto mb-8 relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-hf_accent" size={20} />
        <input 
          type="text" 
          placeholder="Scansiona matrice per prodotto o nota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-4 pl-14 pr-6 rounded-full border-2 border-hf_border bg-hf_card text-hf_text font-bold text-base transition-all focus:border-hf_accent focus:bg-hf_bg focus:shadow-glow outline-none"
        />
      </div>

      {/* FILTRI ORIZZONTALI (TURNI & OVERRIDE) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 pb-6 border-b border-hf_border">
        
        {/* Selettore Turni Scorrevoli */}
        <div className="flex gap-3 overflow-x-auto w-full xl:w-auto pb-2 scrollbar-hide">
          {mockFolders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`px-5 py-3 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all border-2 ${
                activeFolderId === folder.id || (!activeFolderId && folder.id === 'f1') 
                ? 'bg-hf_accent_glow border-hf_accent text-hf_accent' 
                : 'bg-hf_input border-hf_border text-hf_text hover:border-hf_text_muted'
              }`}
            >
              {folder.name}
            </button>
          ))}
          {editMode && (
            <button className="px-5 py-3 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all border-2 border-dashed border-hf_success text-hf_success hover:bg-hf_success/10">
              + NUOVO TURNO
            </button>
          )}
        </div>

        {/* Toggle di Ordinamento */}
        <div className="flex gap-3 shrink-0">
          <button 
            onClick={() => setShowHidden(!showHidden)}
            className={`px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-bold border transition-colors ${showHidden ? 'bg-hf_accent border-hf_accent text-hf_bg' : 'bg-hf_card border-hf_border text-hf_text_muted hover:text-hf_text'}`}
          >
            <Eye size={16} /> OVERRIDE
          </button>
          <button 
            onClick={() => setIsFifo(!isFifo)}
            className={`px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-bold border transition-colors ${isFifo ? 'bg-hf_accent border-hf_accent text-hf_bg' : 'bg-hf_card border-hf_border text-hf_text_muted hover:text-hf_text'}`}
          >
            <ArrowDownAZ size={16} /> F.I.F.O.
          </button>
        </div>
      </div>

      {/* CONTENITORE PRODOTTI (Area di iniezione delle Categorie/Prodotti) */}
      <div className="flex-1 w-full border-2 border-dashed border-hf_border rounded-2xl flex flex-col items-center justify-center text-hf_text_muted p-8 text-center bg-hf_card/50">
         <p className="font-bold text-lg mb-2">Matrice pronta per l'innesto.</p>
         <p className="text-sm">Il render dei Componenti Prodotto (Le Celle e le Tabelle) avverrà non appena i Modali di costruzione saranno finalizzati.</p>
      </div>

    </div>
  );
}
