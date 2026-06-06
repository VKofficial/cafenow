import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gamepad2, Check } from 'lucide-react';
import { SnookerTable, Member } from '../types';

interface StartPS5ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (players: 1 | 2 | 3 | 4, memberId: string | null) => void;
  table: SnookerTable | null;
  members: Member[];
}

export default function StartPS5Modal({ isOpen, onClose, onConfirm, table, members }: StartPS5ModalProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<1 | 2 | 3 | 4>(1);
  const [sessionMemberId, setSessionMemberId] = useState<string>('GUEST');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm glass-technical p-10 rounded-xl border-neon-blue/30 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8 border-b border-outline/20 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20 glow-blue-sm">
                  <Gamepad2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface uppercase tracking-tight">Select Players</h3>
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                    PS5 Node: {table?.number}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {([1, 2, 3, 4] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlayers(p)}
                  className={`relative p-8 rounded-xl border transition-all flex flex-col items-center gap-3 ${
                    selectedPlayers === p 
                      ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                      : 'bg-on-surface/5 border-outline/20 text-on-surface-variant hover:border-black/20'
                  }`}
                >
                  <span className="text-2xl font-mono font-bold">{p}P</span>
                  <span className="text-[8px] font-mono uppercase tracking-widest">Players</span>
                  {selectedPlayers === p && (
                    <div className="absolute top-2 right-2">
                      <Check size={14} />
                    </div>
                  )}
                  <div className="text-[10px] font-mono mt-2 text-on-surface-variant font-bold">
                    ₹{table?.ps5Costs?.[`p${p}` as keyof typeof table.ps5Costs] || 0}/min
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-2">Assign Player/Member</label>
              <select 
                value={sessionMemberId}
                onChange={(e) => setSessionMemberId(e.target.value)}
                className="w-full bg-on-surface/5 border border-outline/20 rounded px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-neon-blue/50 transition-all"
              >
                <option value="GUEST" className="bg-obsidian-900">GUEST / NON-MEMBER</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className="bg-obsidian-900">{m.name} ({m.contact})</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => onConfirm(selectedPlayers, sessionMemberId === 'GUEST' ? null : sessionMemberId)}
              className="w-full py-5 bg-neon-blue-glow text-on-primary font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_35px_rgba(0,240,255,0.4)] transition-all"
            >
              Start Session <Check size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
