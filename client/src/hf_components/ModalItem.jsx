import React, { useState } from 'react';
import ModalBase from './ModalBase';
import toast from 'react-hot-toast';

export default function ModalItem({ isOpen, onClose, itemToEdit = null, categories = [], suppliers = [] }) {
  // Gestione reattiva dello stato dell'input (Fattore Umano - Riduzione Carico Cognitivo)
  const [name, setName] = useState(itemToEdit?.name || '');
  const [catId, setCatId] = useState(itemToEdit?.catId || (categories[0]?.id || ''));
  const [supplierCatId, setSupplierCatId] = useState(itemToEdit?.supplierCatId || '');
  const [line, setLine] = useState(itemToEdit?.line || '');
  const [stock, setStock] = useState(itemToEdit?.stock || '');
  const [idealQty, setIdealQty] = useState(itemToEdit?.idealQty || 0);
  const [uom, setUom] = useState(itemToEdit?.uom || '');
  const [cost, setCost] = useState(itemToEdit?.cost || 0);
  const [expiry, setExpiry] = useState(itemToEdit?.expiry || '');
  const [info, setInfo] = useState(itemToEdit?.info || '');
  const [selectedDays, setSelectedDays] = useState(itemToEdit?.days || []);

  // Riconoscimento dinamico del tipo di reparto selezionato nel form
  const selectedCategory = categories.find(c => c.id === catId);
  const isMagazzino = selectedCategory?.type === 'magazzino';

  const daysMatrix = [
    { value: 1, label: 'LU' },
    { value: 2, label: 'MA' },
    { value: 3, label: 'ME' },
    { value: 4, label: 'GI' },
    { value: 5, label: 'VE' },
    { value: 6, label: 'SA' },
    { value: 0, label: 'DO' }
  ];

  const handleDayToggle = (dayValue) => {
    if (selectedDays.includes(dayValue)) {
      setSelectedDays(selectedDays.filter(d => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue]);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      return toast.error("L'identificativo assoluto del prodotto è obbligatorio.");
    }
    if (cost < 0 || idealQty < 0) {
      return toast.error("Impossibile inserire metriche fisiche negative.");
    }

    const payload = {
      itemId: itemToEdit?.itemId || 'i_' + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      catId,
      supplierCatId: supplierCatId || null,
      cost,
      expiry: expiry || null,
      info: info.trim(),
      days: selectedDays,
      ...(isMagazzino ? { idealQty, uom: uom.trim(), line: '', stock: '' } : { line: line.trim(), stock: stock.trim(), idealQty: 0, uom: '' })
    };

    console.log("[Cerbero Validator Frontend Passed]: ", payload);
    toast.success("Dati pronti per la persistenza su database cloud.");
    onClose();
  };

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} title={itemToEdit ? "Modifica Nodo Prodotto" : "Costruisci Nuovo Prodotto"}>
      <div className="flex flex-col gap-5">
        
        {/* NOME PRODOTTO */}
        <div className="input-group">
          <label>Identificativo Assoluto *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Mozzarella tagliata a cubetti" className="hf-input" />
        </div>

        {/* REPARTO E FORNITORE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="input-group">
            <label>Reparto di Appartenenza</label>
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className="hf-input">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Fornitore Collegato</label>
            <select value={supplierCatId} onChange={(e) => setSupplierCatId(e.target.value)} className="hf-input">
              <option value="">-- Nessun Fornitore --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* CAMPI DINAMICI ERGONOMICI (UX ADATTIVA) */}
        {!isMagazzino ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label>Linea di Produzione Standard (L)</label>
              <input type="text" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Es. 4 Vasche" className="hf-input" />
            </div>
            <div className="input-group">
              <label>Scorta di Emergenza (S)</label>
              <input type="text" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Es. 2 Casse chiuse" className="hf-input" />
            </div>
          </div>
        ) : (
          <div className="bg-hf_success/5 border border-hf_success/20 p-4 rounded-xl flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="input-group">
                <label className="!text-hf_success">Target Giacenza (N°)</label>
                <input type="number" value={idealQty} onChange={(e) => setIdealQty(Math.max(0, parseInt(e.target.value) || 0))} className="hf-input text-center font-black text-xl text-hf_success" />
              </div>
              <div className="input-group">
                <label className="!text-hf_success">Unità di Misura (UoM)</label>
                <input type="text" value={uom} onChange={(e) => setUom(e.target.value)} placeholder="Es. Kg, Sacchi, Casse" className="hf-input" />
              </div>
            </div>
          </div>
        )}

        {/* COSTI E SCADENZA HACCP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="input-group">
            <label>Costo Unitario Lordo (€)</label>
            <input type="number" step="0.01" value={cost} onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))} className="hf-input" />
          </div>
          <div className="input-group">
            <label>Scadenza Time-Bomb (HACCP)</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="hf-input" />
          </div>
        </div>

        {/* NOTE E DIRETTIVE OPERATIVE */}
        <div className="input-group">
          <label>Note e Direttive per la Brigata</label>
          <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={3} placeholder="Inserisci ricette, pesi o avvisi HACCP particolari..." className="hf-input resize-none" />
        </div>

        {/* MATRICE TEMPORALE DEI GIORNI */}
        <div className="input-group">
          <label>Giorni di Visibilità in Griglia</label>
          <p className="text-xs text-hf_text_muted mb-3">Se non selezioni alcun giorno, il prodotto sarà visibile sempre (7/7).</p>
          <div className="flex flex-wrap gap-2">
            {daysMatrix.map(day => {
              const isSelected = selectedDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`w-11 h-11 rounded-xl text-xs font-black border-2 transition-all active:scale-90 flex items-center justify-center ${
                    isSelected 
                    ? 'bg-hf_accent border-hf_accent text-hf_bg' 
                    : 'bg-hf_bg border-hf_border text-hf_text_muted hover:border-hf_text_muted'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTONE INNESTO */}
        <button onClick={handleSave} className="hf-btn-action hf-btn-solid mt-4">
          Salva nel Database Temporaneo
        </button>

      </div>
    </ModalBase>
  );
}
