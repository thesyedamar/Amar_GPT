import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, Spinner } from './icons';
import { loginWithGoogle, loginWithEmail, signUpWithEmail, sendPasswordReset } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot-password';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>(initialMode);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
      setEmail('');
      setPassword('');
      setDisplayName('');
    }
  }, [isOpen, initialMode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'signup') {
        if (!displayName.trim()) throw new Error('Display name is required');
        await signUpWithEmail(email, password, displayName);
        onClose();
      } else {
        await sendPasswordReset(email);
        setSuccessMessage('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-blocked' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#151515]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white border border-[#E9E7E0] p-0 overflow-hidden my-8 rounded-xl shadow-[0_12px_40px_rgba(30,30,30,0.08)]"
            >
            <div className="bg-[#FAF9F6] border-b border-[#E9E7E0] px-8 py-3.5 flex items-center justify-between">
                <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-neutral-200 border border-neutral-300"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-200 border border-neutral-300"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-200 border border-neutral-300"></div>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    {mode === 'login' ? 'Secure Gateway' : mode === 'signup' ? 'New Space' : 'Recovery Link'}
                </span>
            </div>
            
            <div className="p-8 sm:p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-medium text-[#151515] tracking-tight">
                  {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Space' : 'Reset Password'}
                </h2>
                <button onClick={onClose} className="p-2 text-neutral-400 hover:text-[#151515] hover:bg-neutral-50 border border-[#E9E7E0] rounded-lg transition-colors shadow-sm">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-xs font-sans font-medium text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-sans font-medium text-emerald-700">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Display Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="clay-input"
                      placeholder="Your name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="clay-input"
                    placeholder="name@email.com"
                  />
                </div>
                {mode !== 'forgot-password' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-sans font-semibold text-neutral-700 tracking-tight">Password</label>
                      {mode === 'login' && (
                        <button 
                          type="button"
                          onClick={() => setMode('forgot-password')}
                          className="text-[11px] font-sans font-medium text-[#6E6D6A] hover:text-[#151515] transition-colors"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="clay-input"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 inline-flex items-center justify-center rounded-lg font-sans font-semibold tracking-wide transition-all duration-150 text-sm bg-[#151515] text-white hover:bg-neutral-800 shadow-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? <Spinner className="w-5 h-5 mr-3 animate-spin" /> : null}
                  {mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Space' : 'Send Reset Link'}
                </button>
              </form>

              {mode === 'forgot-password' && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setMode('login')}
                    className="text-xs font-sans font-semibold text-[#6E6D6A] hover:text-[#151515] transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              )}

              {mode !== 'forgot-password' && (
                <>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E9E7E0]"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                      <span className="px-4 bg-white">Or continue with</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 bg-white border border-[#D5D3CC] text-neutral-800 rounded-lg shadow-sm font-sans font-semibold text-sm flex items-center justify-center hover:bg-neutral-50 transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google Account
                  </button>

                  <p className="mt-8 text-center text-xs font-sans text-neutral-500">
                    {mode === 'login' ? "Don't have an space yet?" : "Already configured a space?"}{' '}
                    <button
                      onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                      className="font-semibold text-[#151515] hover:underline"
                    >
                      {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                  </p>
                </>
              )}
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
