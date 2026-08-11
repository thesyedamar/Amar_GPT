import React from 'react';
import { motion, Variants } from 'framer-motion';
import { BookIcon, QuizIcon, ChatBubbleIcon } from '../components/icons';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';

interface LandingPageProps {
  onLogin: (mode?: 'login' | 'signup') => void;
  isLoggingIn?: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => {
    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="bg-white border border-[#E9E7E0] p-8 sm:p-10 text-left rounded-xl shadow-sm transition-all duration-200"
        >
            <div className="flex flex-col h-full">
                <div className="w-12 h-12 bg-neutral-50 border border-[#E9E7E0] text-[#151515] rounded-lg flex items-center justify-center mb-6">
                    {icon}
                </div>
                <h3 className="text-lg font-sans font-semibold text-[#151515] mb-2">{title}</h3>
                <p className="text-neutral-500 text-sm font-sans font-normal leading-relaxed">
                    {children}
                </p>
            </div>
        </motion.div>
    );
};

const HeroContent: React.FC<{ onLogin: (mode?: 'login' | 'signup') => void; isLoggingIn?: boolean }> = ({ onLogin, isLoggingIn }) => {
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative max-w-4xl mx-auto">
            <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 mb-8 text-[10px] font-mono uppercase tracking-[0.2em] text-[#151515] bg-white border border-[#E9E7E0] rounded">
                ✦ Interactive Workspace
            </motion.div>
            
            <motion.h1 
                variants={itemVariants} 
                className="text-5xl sm:text-7xl lg:text-8xl font-display font-medium tracking-tight text-[#151515] leading-[1.08] py-2"
            >
                Master Your Studies <br />
                <span className="font-light italic text-[#6E6D6A]">with elegant intelligence.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="mt-8 max-w-2xl mx-auto text-base sm:text-lg text-[#6E6D6A] font-sans font-normal leading-relaxed">
                AmarGPT turns textbook literature, reports, and academic research papers into active mental spaces. Let a precise, beautifully organized AI assist you on every document.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
                <motion.button
                    onClick={() => onLogin('signup')}
                    disabled={isLoggingIn}
                    whileTap={isLoggingIn ? {} : { scale: 0.98 }}
                    className={`inline-flex items-center justify-center rounded-lg font-sans font-semibold tracking-wide transition-all duration-150 px-10 py-4 text-base bg-[#151515] text-white hover:bg-neutral-800 shadow-sm ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isLoggingIn ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : 'Create Space'}
                </motion.button>
                
                <button 
                    onClick={() => onLogin('login')}
                    className="inline-flex items-center justify-center rounded-lg font-sans font-semibold tracking-wide transition-all duration-150 px-10 py-4 text-base bg-white border border-[#D5D3CC] text-[#151515] hover:bg-neutral-50 shadow-sm"
                >
                    Log In
                </button>
            </motion.div>
        </motion.div>
    );
};

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, isLoggingIn }) => {
  return (
    <div className="min-h-screen w-full bg-[#F9F8F6] text-[#151515] overflow-hidden relative font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-[#E9E7E0]">
        <div className="container mx-auto px-6 sm:px-10 py-5 flex justify-between items-center">
          <Logo />
          <nav className="hidden lg:flex items-center space-x-10">
              {[
                { name: 'Library', href: '#' },
                { name: 'Workspace', href: '#' },
                { name: 'Quizzes', href: '#' },
                { name: 'Analytics', href: '#' }
              ].map((item) => (
                  <a key={item.name} href={item.href} className="text-sm font-sans font-medium text-[#6E6D6A] hover:text-[#151515] transition-colors">
                      {item.name}
                  </a>
              ))}
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => onLogin('login')}
                  className="text-sm font-sans font-medium text-[#6E6D6A] hover:text-[#151515] transition-colors cursor-pointer"
                >
                  Login
                </button>
                <motion.button
                  onClick={() => onLogin('signup')}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center rounded-lg font-sans font-semibold px-5 py-2 text-sm bg-[#151515] text-white hover:bg-neutral-800 shadow-sm"
                >
                  Sign Up
                </motion.button>
              </div>
          </nav>
          <div className="lg:hidden flex items-center space-x-3">
            <button 
              onClick={() => onLogin('login')}
              className="text-xs font-sans font-semibold text-neutral-500 hover:text-black transition-colors cursor-pointer"
            >
              Login
            </button>
            <motion.button
              onClick={() => onLogin('signup')}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center rounded-lg font-sans font-semibold px-4 py-2 text-xs bg-[#151515] text-white hover:bg-neutral-800 shadow-sm"
            >
              Sign Up
            </motion.button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 sm:px-10 pt-44 pb-32 text-center">
        <HeroContent onLogin={onLogin} isLoggingIn={isLoggingIn} />

        <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-32 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6"
        >
            <FeatureCard title="Curated Library" icon={<BookIcon className="w-5 h-5" />}>
                Organize every relevant course note, research paper, and module material. Index files natively with extreme clarity.
            </FeatureCard>
            <FeatureCard title="Comprehensive Quizzes" icon={<QuizIcon className="w-5 h-5" />}>
                Compose intuitive testing structures gathered entirely from your books. Reinforce critical concepts on your own terms.
            </FeatureCard>
            <FeatureCard title="Intellectual Chat" icon={<ChatBubbleIcon className="w-5 h-5" />}>
                A beautiful dialog engine made to hold long, deeply responsive exchanges referencing your documents.
            </FeatureCard>
        </motion.div>
      </main>
      
      <footer className="relative z-10 border-t border-[#E9E7E0] py-16 px-6 sm:px-10 bg-[#FAF9F6]">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <Logo />
                <p className="mt-4 text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
                    © 2026 AmarGPT Study Companion
                </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
                {['Privacy', 'Terms', 'GitHub', 'Support'].map(item => (
                    <a key={item} href="#" className="text-xs font-sans font-medium text-neutral-400 hover:text-black transition-colors">
                        {item}
                    </a>
                ))}
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
