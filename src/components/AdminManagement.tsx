import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Key, User, ToggleLeft, ToggleRight, Check, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminAccount, AdminRole } from '../types';

interface AdminManagementProps {
  admins: AdminAccount[];
  onAddAdmin: (admin: Omit<AdminAccount, 'id'>) => void;
  onDeleteAdmin: (id: string) => void;
  onUpdatePermissions: (id: string, permissions: AdminAccount['permissions']) => void;
}

export default function AdminManagement({ admins, onAddAdmin, onDeleteAdmin, onUpdatePermissions }: AdminManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    cipher: '',
    role: 'club_admin' as AdminRole,
    permissions: 'BOTH' as AdminAccount['permissions']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAdmin({
      username: formData.username,
      cipher: formData.cipher,
      role: formData.role,
      permissions: formData.permissions
    });
    setIsModalOpen(false);
    setFormData({ username: '', cipher: '', role: 'club_admin', permissions: 'BOTH' });
  };

  return (
    <div className="px-10 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">Admin & Operator Control</h2>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.3em] mt-1">Management of system access nodes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-neon-blue-glow text-on-primary font-bold text-xs tracking-widest uppercase transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]"
        >
          <Plus size={16} /> New Admin Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((admin) => (
          <motion.div 
            key={admin.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-technical p-6 rounded-xl border border-outline/20 relative group overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onDeleteAdmin(admin.id)}
                className="p-2 text-pulse-red hover:bg-pulse-red/10 rounded-lg transition-colors"
                title="Decommission Node"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-on-surface">{admin.username}</h4>
                <p className="font-mono text-[10px] text-neon-blue uppercase tracking-widest">{admin.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-on-surface/5 p-3 rounded-lg border border-outline/10">
                <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">Access Cipher</span>
                <span className="font-mono text-xs text-on-surface font-bold tracking-widest">••••{admin.cipher.slice(-2)}</span>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Domain Permissions</label>
                <div className="flex bg-on-surface/10 rounded-lg p-1">
                  {(['SNOOKER', 'CAFE', 'BOTH'] as AdminAccount['permissions'][]).map((perm) => (
                    <button
                      key={perm}
                      onClick={() => onUpdatePermissions(admin.id, perm)}
                      className={`flex-1 py-2 rounded-md font-mono text-[9px] font-bold tracking-widest transition-all ${
                        admin.permissions === perm 
                          ? 'bg-neon-blue text-on-primary shadow-lg shadow-neon-blue/20' 
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {perm}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_#bcff5f]" />
                <span className="font-mono text-[8px] text-on-surface-variant uppercase tracking-widest">Node Online</span>
              </div>
              <span className="font-mono text-[10px] text-on-surface-variant/40">UID-{admin.id.slice(0, 8)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-technical p-10 rounded-xl border border-outline/20 overflow-hidden"
            >
              <div className="mb-8 border-b border-outline/20 pb-6">
                <h3 className="text-xl font-bold text-neon-blue-bright uppercase tracking-tight">Provision New Admin</h3>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">System Access Authorization</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">Node Operator Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="text" 
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-sm text-on-surface"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">Access Role</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-4 py-3 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-sm text-on-surface appearance-none"
                    >
                      <option value="club_admin">Club Administrator</option>
                      <option value="owner">Club Owner</option>
                      <option value="super_admin">Platform Overseer</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">Cipher Code</label>
                    <div className="relative">
                      <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input 
                        type="password" 
                        value={formData.cipher}
                        onChange={(e) => setFormData({ ...formData, cipher: e.target.value })}
                        className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-sm text-on-surface"
                        required
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">Assign Capability Domain</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['SNOOKER', 'CAFE', 'BOTH'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, permissions: p })}
                        className={`py-3 rounded-lg border font-mono text-[9px] font-bold tracking-widest transition-all ${
                          formData.permissions === p 
                            ? 'bg-neon-blue/10 border-neon-blue text-neon-blue shadow-lg' 
                            : 'bg-on-surface/5 border-outline/20 text-on-surface-variant hover:border-outline/40'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-neon-blue-glow text-on-primary font-bold uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_35px_rgba(0,240,255,0.4)]"
                  >
                    Authorize Node
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-4 border border-outline/20 text-on-surface-variant font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-on-surface/5"
                  >
                    Abort
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
