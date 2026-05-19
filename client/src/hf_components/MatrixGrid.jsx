import React, { useState } from 'react';
import { Menu, Moon, RotateCcw, Search, Eye, ArrowDownAZ, Plus } from 'lucide-react';
import { useArchStore } from '../arch_store/store';
import MatrixItem from './MatrixItem';

export default function MatrixGrid({ onOpenSidebar }) {
  const toggleTheme = useArchStore((state) => state.toggleTheme);
  const activeFolderId = useArchStore((state) => state.activeFolderId);
  const setActiveFolder = useArchStore((state) => state.setActiveFolder);
  const activeCategoryFilter = useArchStore((state) => state.activeCategoryFilter);
  const editMode = useArchStore((state) => state.editMode);

  // Stati logici del Fattore Umano (UX)
  const [searchQuery, setSearchQuery] = useState('');
  const [isFifo, setIsFifo] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  // MOCK DATA STRUTTURALE (Verrà intercettato da Lazzaro Cloud nella Fase 5)
  const mockFolders = [
    { id: 'f1', name: 'TURNO MATTINA' },
    { id: 'f2', name: 'TURNO SERALE' }
  ];

  const mockSections = [
    {
      id: 'sec_1',
      name: 'Frigo Pasticceria / Latticini',
      color: '#C9A464',
      items: [
        { itemId: 'i_1', name: 'Fiordilatte Tagliato', catId: 'c1', catName: 'Pizzeria', catColor: '#C9A464', catType: 'standard', line: '3 Vasche', stock: '2 Casse', idealQty: 0, uom: '', supplier: 'Rossi Caseificio', expiry: '2026-05-22', info: 'Mantenere a 4°C costanti.', days: [1, 2, 3, 4, 5, 6, 0] },
        { itemId: 'i_2', name: 'Gorgonzola DOP', catId: 'c1', catName: 'Pizzeria', catColor: '#C9A464', catType: 'standard', line: '1 Vasca', stock: '1 Pezzo', idealQty: 0, uom: '', supplier: 'Rossi Caseificio', expiry: '2026-05-25', info: '', days: [2, 4, 6] }
      ]
    },
    {
      id: 'sec_2',
      name: 'Dispensa Secca / Farine',
      color: '#8C2222',
      items: [
        { itemId: 'i_3', name: 'Farina Tipo 00 (Sacco 25kg)', catId: 'c2', catName: 'Magazzino Farine', catColor: '#8C2222', catType: 'magazzino', line: '', stock: '', idealQty: 10, uom: 'Sacchi', supplier: 'Molino Caputo', expiry: null, info: 'Umidità max 15%.', days: [] }
      ]
    }
  ];

  // Otteniamo il giorno della settimana corrente (0 = Domenica, 1 = Lunedì, ecc.)
  const currentDay = new Date().getDay();

  return (
    <div className="flex-1 flex flex-col w-full h-full p-6 pt-safe-top pb-[calc(40px+env(safe-area-inset-bottom))] overflow-y-auto scroll-smooth">
      
      {/* TOP BAR NAVIGAZIONALE */}
      <div className="flex justify-between items-center mb-8 gap-4 shrink-0">
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
            <motion.div whileTap={{ rotate: 180 }}><Moon size={20} /></motion.div>
          </button>
          <button 
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-hf_danger/10 border border-hf_danger text-hf_danger hover:bg-hf_danger hover:text-white transition-all"
            title="Purga Operazioni Odierne"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* MOTORE DI RICERCA UNIVERSALE */}
      <div className="w-full max-w-3xl mx-auto mb-8 relative shrink-0">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-hf_accent" size={20} />
        <input 
          type="text" 
          placeholder="Scansiona matrice per prodotto, nota o fornitore..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-4 pl-14 pr-6 rounded-full border-2 border-hf_border bg-hf_card text-hf_text font-bold text-base transition-all focus:border-hf_accent focus:bg-hf_bg focus:shadow-glow outline-none"
        />
      </div>

      {/* FILTRI ORIZZONTALI (TURNI & OVERRIDE UX) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 pb-6 border-b border-hf_border shrink-0">
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

        <div className="flex gap-3 shrink-0 w-full sm:w-auto justify-end">
          <button 
            onClick={() => setShowOverride(!showOverride)}
            className={`px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-bold border transition-colors ${showOverride ? 'bg-hf_accent border-hf_accent text-hf_bg' : 'bg-hf_card border-hf_border text-hf_text_muted hover:text-hf_text'}`}
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

      {/* RENDER COMPARTIMENTATO DELLA GRIGLIA UTENTE */}
      <div className="flex-1 flex flex-col gap-6">
        {mockSections.map((section) => {
          // Filtriamo i prodotti della cella logica in base alla ricerca, categoria e pianificazione temporale
          let filteredItems = section.items.filter(item => {
            const matchQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchCategory = activeCategoryFilter === 'all' || item.catId === activeCategoryFilter;
            const isScheduledForToday = item.days.length === 0 || item.days.includes(currentDay);
            const matchTimeGate = editMode || showOverride || isScheduledForToday;

            return matchQuery && matchCategory && matchTimeGate;
          });

          // Ordinamento FIFO temporale basato sulle scadenze HACCP
          if (isFifo) {
            filteredItems.sort((a, b) => {
              const dateA = a.expiry ? new Date(a.expiry).getTime() : Infinity;
              const dateB = b.expiry ? new Date(b.expiry).getTime() : Infinity;
              return dateA - dateB;
            });
          }

          // Se non ci sono prodotti da mostrare in questa sezione e non siamo in modifica, nascondiamo l'intera scheda
          if (filteredItems.length === 0 && !editMode) return null;

          return (
            <div key={section.id} className="bg-hf_card border border-hf_border rounded-main overflow-hidden shadow-hard flex flex-col">
              {/* Intestazione Cella Logica */}
              <div className="p-5 font-extrabold text-base border-b-2 border-hf_border bg-hf_bg/40 flex justify-between items-center" style={{ borderLeft: `4px solid ${section.color}` }}>
                <span style={{ color: section.color }} className="uppercase tracking-wider">{section.name}</span>
                <span className="text-xs text-hf_text_muted bg-hf_input px-3 py-1 rounded-full border border-hf_border">
                  {filteredItems.length} Nodi
                </span>
              </div>

              {/* Tabella dei Prodotti */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {filteredItems.map((item) => (
                      <MatrixItem key={item.itemId} item={item} sectionId={section.id} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tasto rapido di aggiunta se la matrice è sbloccata */}
              {editMode && searchQuery === '' && (
                <button className="w-full py-4 bg-hf_bg hover:bg-hf_accent_glow border-t border-hf_border text-sm font-extrabold text-hf_success flex items-center justify-center gap-2 transition-colors">
                  <Plus size={16} /> AGGIUNGI NODO PRODOTTO
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
