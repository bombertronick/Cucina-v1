import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, X, Power, Unlock, Share2, Tags, Users, Link, Key, ChartLine, Cloud, Clock, FileDown, LayoutGrid, Circle } from 'lucide-react';
import { useArchStore } from '../arch_store/store';

export default function Sidebar({ isOpen, onClose }) {
  const logout = useArchStore((state) => state.logout);
  const operator = useArchStore((state) => state.hf_operator);
  const isRoot = useArchStore((state) => state.isRoot());
  const activeCatFilter = useArchStore((state) => state.activeCategoryFilter);
  const setCatFilter = useArchStore((state) => state.setCategoryFilter);
  const editMode = useArchStore((state) => state.editMode);
  const toggleEditMode = useArchStore((state) => state.toggleEditMode);

  // MOCK DATA TEMPORANEO (Nella Fase 5 arriveranno da Lazzaro via Axios)
  const mockCategories = [
    { id: 'c1', name: 'Pizzeria', color: '#C9A464' },
    { id: 'c2', name: 'Cucina', color: '#8C2222' }
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ x: isOpen ? 0 : '0%' }} // Su desktop è sempre 0%
      className={`fixed md:relative top-0 left-0 h-full w-[280px] bg-hf_sidebar backdrop-blur-md border-r-2 border-hf_border p-6 flex flex-col z-[1000] transition-transform duration-300 ease-[var(--bezier)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* HEADER LOGO E CHIUSURA MOBILE */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div className="font-extrabold text-2xl flex items-center gap-3 text-hf_accent uppercase tracking-tighter">
          <ShieldAlert size={28} /> SCUTUM
        </div>
        <button onClick={onClose} className="md:hidden text-hf_text_muted hover:text-hf_accent">
          <X size={28} />
        </button>
      </div>

      {/* BADGE OPERATORE */}
      <div className="bg-hf_input border border-hf_border p-4 rounded-main mb-8 flex items-center gap-4 relative z-10">
        <img src="/logo.png" alt="Operatore" className="w-12 h-12 rounded-xl border-2 border-hf_accent object-cover" onError={(e) => e.target.style.display='none'} />
        <div>
          <div className="text-[10px] text-hf_accent font-extrabold tracking-[2px] uppercase">Operatore</div>
          <div className="font-extrabold text-lg text-hf_text uppercase leading-tight truncate w-[140px]">
            {operator?.name || 'ROOT'}
          </div>
        </div>
      </div>

      {/* MENU SCORREVOLE */}
      <div className="flex-1 overflow-y-auto pr-2 relative z-10 scrollbar-hide flex flex-col gap-8">
        
        {/* SEZIONE 1: FILTRO REPARTI */}
        <div>
          <div className="text-xs font-extrabold text-hf_text_muted mb-3 tracking-widest">FILTRO REPARTI</div>
          {isRoot && (
            <button
              onClick={() => setCatFilter('all')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm mb-2 transition-all ${
                activeCatFilter === 'all' ? 'bg-hf_border text-hf_accent border border-hf_accent_glow' : 'text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text border border-transparent'
              }`}
            >
              <LayoutGrid size={18} /> Spazio Globale
            </button>
          )}
          {mockCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCatFilter(cat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm mb-2 transition-all ${
                activeCatFilter === cat.id ? 'bg-hf_border text-hf_accent border border-hf_accent_glow' : 'text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text border border-transparent'
              }`}
            >
              <Circle size={14} fill={cat.color} color={cat.color} /> {cat.name}
            </button>
          ))}
        </div>

        {/* SEZIONE 2: AZIONI E REPORT (Visualizzabile da tutti) */}
        <div>
          <div className="text-xs font-extrabold text-hf_text_muted mb-3 tracking-widest">AZIONI DI LINEA</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text transition-all border border-transparent">
            <FileDown size={18} className="text-hf_success" /> Sintesi Report
          </button>
        </div>

        {/* SEZIONE 3: SISTEMA ASSOLUTO (Solo Root) */}
        {isRoot && (
          <div>
            <div className="text-xs font-extrabold text-hf_accent mb-3 tracking-widest">SISTEMA ASSOLUTO</div>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text transition-all">
              <ChartLine size={18} /> Telemetria KPI
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text transition-all">
              <Cloud size={18} /> Sync Rete Globale
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text transition-all">
              <Clock size={18} /> Macchina del Tempo
            </button>

            {editMode && (
              <div className="mt-4 pt-4 border-t border-hf_border">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text transition-all">
                  <Tags size={18} /> Struttura Reparti
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-hf_text_muted hover:bg-hf_accent_glow hover:text-hf_text transition-all">
                  <Users size={18} /> Organigramma Sede
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PANNELLO INFERIORE */}
      <div className="mt-6 flex flex-col gap-3 relative z-10">
        {isRoot && (
          <>
            <button 
              onClick={toggleEditMode}
              className={`hf-btn-action !text-sm !p-3 ${editMode ? '!bg-hf_warning !text-black !border-hf_warning' : '!bg-hf_bg !text-hf_text !border-hf_border'}`}
            >
              {editMode ? <Unlock size={18}/> : <Shield size={18}/>} 
              {editMode ? 'Blocca Modifiche' : 'Sblocca Matrice'}
            </button>
          </>
        )}
        <button 
          onClick={logout}
          className="hf-btn-action !text-sm !p-3 !bg-hf_danger/10 !border-hf_danger !text-hf_danger"
        >
          <Power size={18} /> Disconnetti
        </button>
      </div>
    </motion.aside>
  );
}
