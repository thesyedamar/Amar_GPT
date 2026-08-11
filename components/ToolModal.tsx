import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons';

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const ToolModal: React.FC<ToolModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            className="bg-card border border-border cyber-chamfer shadow-neon-lg w-full max-lg relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="terminal-header">
                <div className="terminal-dot bg-red-500"></div>
                <div className="terminal-dot bg-yellow-500"></div>
                <div className="terminal-dot bg-green-500"></div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-4">{title}</span>
                <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-accent transition-colors">
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="p-8">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToolModal;