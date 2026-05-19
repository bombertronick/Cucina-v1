import { z } from 'zod';

// Schema di validazione per i Nodi Prodotto (Fase 5 Front-End)
const itemPayloadSchema = z.object({
    name: z.string().min(1, "L'identificativo del prodotto è obbligatorio.").max(100).trim(),
    catId: z.string().min(1),
    sedeId: z.string().min(1),
    supplierCatId: z.string().optional().nullable(),
    line: z.string().max(50).optional().nullable(),
    stock: z.string().max(50).optional().nullable(),
    idealQty: z.number().nonnegative().default(0),
    uom: z.string().max(20).optional().nullable(),
    cost: z.number().nonnegative().default(0),
    expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data HACCP non valido (YYYY-MM-DD).").optional().nullable(),
    info: z.string().max(1000).optional().nullable(),
    days: z.array(z.number().min(0).max(6)).default([])
});

const cerbero_validators = {
    validateItem: (req, res, next) => {
        const result = itemPayloadSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                errors: result.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
            });
        }
        // Sostituiamo il body con i dati sanitizzati e validati da Zod
        req.body = result.data;
        next();
    }
};

export default cerbero_validators;
