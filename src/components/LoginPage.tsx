import React, { useState } from 'react';
import { Fingerprint, Lock, ChevronDown, Bolt, Shield, Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabaseService } from '../services/supabaseService';
import { AdminRole, AdminAccount } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginPageProps {
  onLogin: (role: AdminRole, permissions: AdminAccount['permissions'], username: string, adminId?: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [operatorId, setOperatorId] = useState('');
  const [cipher, setCipher] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showViteExplanation, setShowViteExplanation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Check Supabase for admin
      const matchedAdmin = await supabaseService.login(operatorId, cipher);
      
      if (matchedAdmin) {
        supabaseService.setActiveAdminUsername(matchedAdmin.username);
        if (matchedAdmin.id) {
          supabaseService.setActiveAdminId(matchedAdmin.id);
        }
        onLogin(matchedAdmin.role, matchedAdmin.permissions, matchedAdmin.username, matchedAdmin.id);
        return;
      }

      setError('INVALID ACCESS SECRETS');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'SYSTEM ERROR DURING AUTHENTICATION');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 bg-background" />

      {/* Header Info */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-12 flex flex-col items-center text-center"
      >
        <h1 className="text-5xl font-black tracking-tighter text-neon-blue-glow font-sans mb-4">
          CUE_CONTROL
        </h1>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#bcff5f]" />
          CORE SYSTEMS ONLINE
        </div>
      </motion.header>

      {/* Login Card */}
      <motion.main 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 w-full max-w-[480px]"
      >
        <div className="glass-technical p-10 rounded-xl relative overflow-hidden border border-outline/20">
          
          <div className="mb-8 border-b border-outline/20 pb-6">
            <h2 className="text-2xl font-bold text-neon-blue-bright mb-1 uppercase tracking-tight font-sans">Obsidian Access</h2>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
              SECURE TERMINAL AUTHENTICATION REQUIRED
            </p>
          </div>

          {/* Missing Supabase Configuration System Warning */}
          {!isSupabaseConfigured && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs text-left font-sans"
            >
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-yellow-400 mb-2 font-mono text-[10px]">
                <AlertTriangle size={14} />
                <span>Supabase Offline Warning</span>
              </div>
              <p className="mb-2 leading-relaxed text-[11px]">
                Your client is calling the database, but <span className="font-semibold text-white underline">your Supabase environment variables are missing</span> or still have placeholder values.
              </p>
              <p className="mb-3 leading-relaxed text-[11px] text-on-surface-variant">
                <strong>Why you get "Bad Request" / "Content Too Large":</strong> Without your live Supabase credentials, the app's requests fallback to relative URLs (like your local web server) which don't support SQL operations, causing these errors in your browser console.
              </p>
              <div className="bg-background/40 p-2 rounded border border-outline/10 font-mono text-[10px] space-y-1 mb-2 text-on-surface-variant">
                <p className="font-bold text-white uppercase text-[9px] tracking-widest text-yellow-400">Resolution:</p>
                <ol className="list-decimal list-inside space-y-1 text-on-surface select-text">
                  <li>Open the AI Studio <span className="font-bold text-yellow-400">Settings</span> menu.</li>
                  <li>Click on <span className="font-bold text-yellow-400">Secrets / Environment Variables</span>.</li>
                  <li>Add <code className="bg-on-surface/10 px-1 rounded text-white">VITE_SUPABASE_URL</code> and <code className="bg-on-surface/10 px-1 rounded text-white">VITE_SUPABASE_ANON_KEY</code>.</li>
                </ol>
              </div>
            </motion.div>
          )}

          {/* Vite WebSocket Fail explanation */}
          <div className="mb-6">
            <button 
              type="button"
              onClick={() => setShowViteExplanation(!showViteExplanation)}
              className="w-full py-1.5 px-3 bg-secondary/5 hover:bg-secondary/10 border border-outline/15 rounded text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant hover:text-white transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <HelpCircle size={12} className="text-secondary" />
                <span>Websocket Connection Warning?</span>
              </span>
              <span className="text-secondary font-bold">{showViteExplanation ? '▲ HIDE' : '▼ EXPLAIN'}</span>
            </button>
            
            {showViteExplanation && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 p-3 bg-on-surface/5 border border-outline/10 rounded font-mono text-[10px] text-on-surface-variant leading-relaxed text-left"
              >
                <p className="text-white font-bold mb-1">💡 COGNITIVE EXPLANATION:</p>
                <p className="mb-1 text-[9px]">
                  Vite tries to establish a WebSocket back-channel to push Hot Module Replacement (HMR) updates.
                </p>
                <p className="mb-1 text-[9px]">
                  Since HMR is disabled by this secure, sandboxed container runtime (<code className="text-yellow-400">DISABLE_HMR=true</code>), the network socket is closed by default.
                </p>
                <p className="text-[9px] font-bold text-secondary">
                  ✓ This red console warning is completely harmless, benign, and can be safely ignored.
                </p>
              </motion.div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest text-center"
              >
                {error}
              </motion.div>
            )}
            <div className="space-y-2">
              <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">
                Email / Admin Username
              </label>
              <div className="relative group">
                <Fingerprint size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-neon-blue transition-colors" />
                <input 
                  type="text" 
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-12 pr-4 py-4 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all placeholder:text-on-surface-variant/40 font-mono text-sm text-on-surface font-bold"
                  placeholder="operator@cuecontrol.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">
                Access Password
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-neon-blue transition-colors" />
                <input 
                  type="password" 
                  value={cipher}
                  onChange={(e) => setCipher(e.target.value)}
                  className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-12 pr-4 py-4 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all placeholder:text-on-surface-variant/40 font-mono text-sm text-on-surface font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>



            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-neon-blue-glow text-on-primary font-bold text-lg uppercase tracking-[.2em] rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_35px_rgba(0,240,255,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  Authenticating...
                  <Loader2 size={20} className="animate-spin" />
                </>
              ) : (
                <>
                  Login
                  <Bolt size={20} fill="currentColor" />
                </>
              )}
            </button>
          </form>

          <footer className="mt-8 flex items-center justify-between">
            <button className="font-mono text-[10px] text-on-surface-variant hover:text-neon-blue transition-colors uppercase tracking-widest font-bold">
              Trouble Logging In?
            </button>
            <div className="h-[1px] flex-grow mx-4 bg-outline/20" />
            <button className="font-mono text-[10px] text-on-surface-variant hover:text-neon-blue transition-colors uppercase tracking-widest font-bold">
              Protocol Support
            </button>
          </footer>
        </div>
      </motion.main>

      {/* Bottom HUD info */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-auto py-10 w-full max-w-[1400px] px-10 flex justify-between items-end border-t border-outline/20"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-secondary" fill="currentColor" fillOpacity={0.2} />
            <span className="font-mono text-[10px] text-secondary tracking-[0.2em] font-bold">SYSTEM SECURE</span>
          </div>
          <div className="text-on-surface-variant/40 text-[8px] font-mono tracking-widest">ENCRYPTION LEVEL: AES-256 GCM ACTIVE</div>
        </div>

        <div className="flex items-center gap-10">
          <div className="text-right">
            <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Node Deployment</div>
            <div className="font-mono text-neon-blue-bright text-xs uppercase font-bold">V2.0.4</div>
          </div>
          <div className="h-10 w-px bg-outline/20" />
          <div className="text-right">
            <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Cluster Status</div>
            <div className="font-mono text-secondary text-xs uppercase font-bold">STABLE</div>
          </div>
        </div>
      </motion.footer>

      {/* Carbon Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay"
           style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />
    </div>
  );
}
