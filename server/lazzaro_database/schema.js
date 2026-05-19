import mongoose from 'mongoose';

// -----------------------------------------------------------------------------
// SOTTO-SCHEMI (Subdocuments) PER IL COMPARTIMENTO STAGNO (SEDE)
// -----------------------------------------------------------------------------
const lazzaro_RoleSchema = new mongoose.Schema({
    roleId: { type: String, required: true },
    name: { type: String, required: true, uppercase: true },
    group: { type: String, default: 'BRIGATA' }, // Per la fisarmonica Login
    pin: { type: String, required: true },
    type: { type: String, enum: ['erp', 'checklist'], default: 'erp' },
    allowedCats: [{ type: String }] // Restrizioni di visibilità
}, { _id: false });

const lazzaro_CategorySchema = new mongoose.Schema({
    catId: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#C9A464' },
    type: { type: String, enum: ['standard', 'magazzino'], default: 'standard' }
}, { _id: false });

// -----------------------------------------------------------------------------
// MODELLO PRINCIPALE 1: SEDE (Infrastruttura)
// -----------------------------------------------------------------------------
const lazzaro_sedeSchemaDefinition = new mongoose.Schema({
    sedeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, uppercase: true },
    categories: [lazzaro_CategorySchema],
    roles: [lazzaro_RoleSchema],
    checklists: [{
        ckId: String, name: String, url: String, color: String
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const lazzaro_SedeModel = mongoose.model('Sede', lazzaro_sedeSchemaDefinition);

// -----------------------------------------------------------------------------
// MODELLO PRINCIPALE 2: ITEM (Nodi Prodotto della Matrice)
// -----------------------------------------------------------------------------
const lazzaro_itemSchemaDefinition = new mongoose.Schema({
    itemId: { type: String, required: true, unique: true, index: true },
    sedeId: { type: String, required: true, index: true }, // Chiave esterna per il Compartimento Stagno
    turnoId: { type: String, required: true }, // A quale Turno/Folder appartiene
    sectionId: { type: String, required: true }, // A quale Cella (Frigo, Scaffale) appartiene
    name: { type: String, required: true },
    catId: { type: String, required: true },
    supplierCatId: { type: String, default: null },
    
    // Metriche fisiche
    line: { type: String, default: '' },
    stock: { type: String, default: '' },
    idealQty: { type: Number, default: 0 },
    uom: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    expiry: { type: String, default: null }, // Data HACCP YYYY-MM-DD
    info: { type: String, default: '' },
    days: [{ type: Number, min: 0, max: 6 }] // Matrice temporale visibilità
    
}, { timestamps: true });

const lazzaro_ItemModel = mongoose.model('Item', lazzaro_itemSchemaDefinition);

export { lazzaro_SedeModel, lazzaro_ItemModel };
