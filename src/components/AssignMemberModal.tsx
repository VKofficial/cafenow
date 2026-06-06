import React, { useState } from 'react';
import { Search, X, User, Check, Smartphone, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, SnookerTable } from '../types';

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (member: any) => void;
  onAddMember?: (member: Omit<Member, 'id' | 'joinedDate'>) => Promise<Member | null>;
  members: Member[];
  table: SnookerTable | null;
}

export default function AssignMemberModal({ isOpen, onClose, onConfirm, onAddMember, members, table }: AssignMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredMembers = members.filter(m => 
    (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.contact || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartCreate = () => {
    setNewName(searchQuery);
    setNewContact('');
    setIsCreatingNew(true);
  };

  const handleSaveAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      if (onAddMember) {
        const created = await onAddMember({
          name: newName.trim(),
          contact: newContact.trim(),
          status: 'Active'
        });
        if (created) {
          onConfirm(created);
          // Reset states
          setIsCreatingNew(false);
          setSearchQuery('');
          onClose();
        }
      }
    } catch (err) {
      console.error('Error creating member inline:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalClose = () => {
    setIsCreatingNew(false);
    setSearchQuery('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-obsidian-900 border border-white/10 w-full max-w-md rounded-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Assign Member</h2>
                  <p className="text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-widest">{table?.number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isCreatingNew && onAddMember && (
                  <button
                    onClick={handleStartCreate}
                    className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-neon-blue hover:text-neon-blue/85 transition-colors flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider pr-2"
                    title="Quick Add Member"
                  >
                    <UserPlus size={12} />
                    <span>Quick Add</span>
                  </button>
                )}
                <button 
                  onClick={handleModalClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {isCreatingNew ? (
              <form onSubmit={handleSaveAndAssign} className="p-6 space-y-4 flex flex-col justify-between flex-1">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">
                      Member Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter member's name..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:bg-white/10 transition-all font-mono text-white"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">
                      Contact / Phone
                    </label>
                    <input
                      type="text"
                      placeholder="Enter phone number..."
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:bg-white/10 transition-all font-mono text-white"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-on-surface-variant/60 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold font-mono tracking-widest uppercase"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !newName.trim()}
                    className="flex-1 py-3 bg-neon-blue text-black font-bold uppercase font-mono text-xs tracking-widest rounded-xl hover:bg-neon-blue/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Saving...' : 'Add & Assign'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Currently Assigned Members Header */}
                {(() => {
                  if (!table || !table.player) return null;
                  const names = table.player.split(',').map(s => s.trim()).filter(Boolean);
                  const ids = (table.currentMemberId || '').split(',').map(s => s.trim()).filter(Boolean);
                  const assigned = names.map((name, index) => ({
                    name,
                    id: ids[index] || null
                  })).filter(p => p.name.toLowerCase() !== 'guest');

                  if (assigned.length === 0) return null;

                  return (
                    <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                      <h4 className="font-mono text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold mb-2 ml-1">
                        Currently Assigned
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {assigned.map((p, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 bg-neon-blue/10 border border-neon-blue/20 text-neon-blue px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider"
                          >
                            {p.name}
                            <button
                              type="button"
                              onClick={() => onConfirm({ name: p.name, id: p.id, isAction: 'REMOVE' })}
                              className="p-0.5 rounded-full hover:bg-neon-blue/20 text-on-surface-variant hover:text-white transition-all cursor-pointer"
                              title="Remove Member"
                            >
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="p-4 bg-white/[0.01]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search by name or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:bg-white/10 transition-all font-mono text-white"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[40vh]">
                  {/* Quick Assign Guest Option if search query exits */}
                  {searchQuery.trim().length > 0 && !members.some(m => m.name.toLowerCase() === searchQuery.toLowerCase().trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        onConfirm({ name: searchQuery.trim(), id: null, isAction: 'ADD' });
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-dashed border-cyber-lime/30 bg-cyber-lime/5 hover:bg-cyber-lime/10 transition-all group/guest text-left"
                    >
                      <div>
                        <p className="font-bold text-cyber-lime font-mono text-xs uppercase tracking-wider">Assign Guest Player</p>
                        <p className="text-[10px] text-on-surface-variant/70 font-mono mt-0.5 uppercase">Directly add "{searchQuery.trim()}" as Guest</p>
                      </div>
                      <span className="text-cyber-lime font-mono text-[10px] font-bold bg-cyber-lime/20 border border-cyber-lime/35 px-2 py-0.5 rounded tracking-widest">ASSIGN</span>
                    </button>
                  )}

                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          onConfirm({ name: member.name, id: member.id, isAction: 'ADD' });
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-neon-blue/5 hover:border-neon-blue/30 transition-all group"
                      >
                        <div className="text-left">
                          <p className="font-bold text-white group-hover:text-neon-blue transition-colors">{member.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Smartphone size={10} className="text-on-surface-variant/40" />
                            <span className="text-[10px] font-mono text-on-surface-variant/60">{member.contact}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-neon-blue/20 group-hover:border-neon-blue/50 transition-all">
                          <Check size={14} className="text-neon-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-10 text-center space-y-4">
                      <p className="text-sm font-mono text-on-surface-variant/40">No matching members found</p>
                      {onAddMember && searchQuery.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={handleStartCreate}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20 hover:border-neon-blue/40 text-neon-blue font-mono text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          <UserPlus size={14} />
                          Add "{searchQuery}" as New Member
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                    <button 
                      onClick={handleModalClose}
                      className="w-full py-3 rounded-xl border border-neon-blue/20 text-neon-blue hover:text-white hover:bg-neon-blue/10 transition-all text-[11px] font-bold font-mono tracking-widest uppercase"
                    >
                      DONE / CLOSE
                    </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
