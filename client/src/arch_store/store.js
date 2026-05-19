import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Creazione del Global Store (Architetto Store)
export const useArchStore = create(
  persist(
    (set, get) => ({
      // STATO: Tema Visivo
      theme: 'dark', // 'dark' | 'light'
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // STATO: Autenticazione (Cerbero Client-Side)
      hf_token: null,
      hf_operator: null, // { id, name, role, sedeId }
      
      login: (token, operatorData) => set({ 
        hf_token: token, 
        hf_operator: operatorData 
      }),
      
      logout: () => set({ 
        hf_token: null, 
        hf_operator: null, 
        activeSedeId: null, 
        activeFolderId: null 
      }),

      // STATO: Navigazione Gestionale (Matrice)
      activeSedeId: null,
      activeFolderId: null,
      activeCategoryFilter: 'all',
      editMode: false,

      setActiveSede: (sedeId) => set({ activeSedeId: sedeId, activeFolderId: null }),
      setActiveFolder: (folderId) => set({ activeFolderId: folderId }),
      setCategoryFilter: (catId) => set({ activeCategoryFilter: catId }),
      toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
      
      // Getter computati
      isAuthenticated: () => !!get().hf_token,
      isRoot: () => get().hf_operator?.role === 'admin'
    }),
    {
      name: 'scutum_absolute_storage', // Persistenza in localStorage per sopravvivere al refresh
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        theme: state.theme, 
        hf_token: state.hf_token, 
        hf_operator: state.hf_operator // Salviamo solo dati sicuri, il resto si resetta
      }),
    }
  )
);
