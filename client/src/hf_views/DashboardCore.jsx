import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../hf_components/Sidebar';
import MatrixGrid from '../hf_components/MatrixGrid';

export default function DashboardCore() {
  // Stato locale per gestire l'apertura della Sidebar su schermi piccoli (Mobile)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-hf_bg text-hf_text relative">
      
      {/* OVERLAY MOBILE: Si attiva solo se la sidebar è aperta su smartphone */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileSidebar}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[900] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR COMPONENT */}
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={toggleMobileSidebar} 
      />

      {/* MATRICE CENTRALE (VIEWPORT) */}
      <main className="flex-1 h-full flex flex-col min-w-0 z-10 relative">
        <MatrixGrid onOpenSidebar={toggleMobileSidebar} />
      </main>

    </div>
  );
}
