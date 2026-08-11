import React from 'react';
import Logo from './Logo';
import { DashboardIcon, BookIcon, PlannerIcon, ProgressIcon, ToolsIcon, CloseIcon, LogoutIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';

type View = 'dashboard' | 'books' | 'book-detail' | 'planner' | 'progress' | 'tools';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  isOpen?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 rounded-lg text-[13px] font-sans font-medium transition-all duration-150 group ${
      isActive
        ? 'bg-[#151515] text-white'
        : 'text-[#6E6D6A] hover:bg-[#F3F2EE] hover:text-[#151515]'
    }`}
  >
    <div className={`w-4.5 h-4.5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-[#8E899B] group-hover:text-[#151515]'}`}>{icon}</div>
    <span>{label}</span>
  </button>
);

const SidebarContent: React.FC<SidebarProps> = ({ currentView, setView, onClose, user, onLogout }) => {
    const handleNavClick = (view: View) => {
        setView(view);
        if (onClose) onClose();
    };

    return (
        <div className="flex flex-col h-full bg-[#FAF9F6] border-r border-[#E9E7E0] pt-8 px-6 pb-8 relative overflow-y-auto scrollbar-none">
            <div className="flex justify-between items-center mb-10">
                <Logo />
                {onClose && (
                    <button onClick={onClose} className="md:hidden p-2.5 bg-white border border-[#E9E7E0] rounded-lg shadow-sm text-neutral-500 hover:text-black transition-colors">
                        <CloseIcon />
                    </button>
                )}
            </div>
            
            <div className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-[0.2em] mb-4 ml-1">
                Workspace
            </div>
            
            <nav className="space-y-1.5 flex-shrink-0">
                <NavItem
                    icon={<DashboardIcon />}
                    label="Dashboard"
                    isActive={currentView === 'dashboard'}
                    onClick={() => handleNavClick('dashboard')}
                />
                <NavItem
                    icon={<BookIcon />}
                    label="Library"
                    isActive={currentView === 'books' || currentView === 'book-detail'}
                    onClick={() => handleNavClick('books')}
                />
                <NavItem
                    icon={<PlannerIcon />}
                    label="Planner"
                    isActive={currentView === 'planner'}
                    onClick={() => handleNavClick('planner')}
                />
                <NavItem
                    icon={<ProgressIcon />}
                    label="Progress"
                    isActive={currentView === 'progress'}
                    onClick={() => handleNavClick('progress')}
                />
                <NavItem
                    icon={<ToolsIcon />}
                    label="Tools"
                    isActive={currentView === 'tools'}
                    onClick={() => handleNavClick('tools')}
                />
            </nav>

            {user && (
                <div className="mt-auto pt-6 border-t border-[#E9E7E0]">
                    <div className="bg-white border border-[#E9E7E0] p-4 rounded-xl shadow-sm mb-4">
                        <div className="flex items-center mb-3">
                            <div className="w-9 h-9 rounded border border-[#E9E7E0] overflow-hidden flex-shrink-0">
                                <img 
                                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="ml-3 overflow-hidden">
                                <p className="text-xs font-sans font-semibold text-foreground truncate">{user.displayName || 'STUDENT'}</p>
                                <p className="text-[9px] font-mono text-neutral-400 truncate tracking-wider uppercase">STUDENT</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center justify-center w-full px-4 py-2 rounded-lg text-xs font-sans font-semibold text-red-600 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <LogoutIcon className="w-4 h-4 mr-2" />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-2 text-center">
                <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">AmarGPT // v2.5</p>
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 flex-shrink-0">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {props.isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={props.onClose}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
                />
                <motion.aside
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 left-0 w-[85vw] max-w-[300px] z-[70] md:hidden shadow-2xl"
                >
                    <SidebarContent {...props} />
                </motion.aside>
            </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;