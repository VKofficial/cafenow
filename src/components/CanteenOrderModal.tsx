import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Hash, Table as TableIcon, Plus, Minus } from 'lucide-react';
import { SnookerTable, AdminRole, AdminAccount } from '../types';

interface CafeOrderModalProps {
  isOpen: boolean;
  item: { name: string; price: number } | null;
  tables: SnookerTable[];
  onClose: () => void;
  onConfirm: (tableId: string, quantity: number) => void;
  role?: AdminRole;
  permissions?: AdminAccount['permissions'];
}

export default function CafeOrderModal({ isOpen, item, tables, onClose, onConfirm, role, permissions }: CafeOrderModalProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const finalPermissions = permissions || (role === 'admin2' ? 'CAFE' : role === 'admin1' ? 'SNOOKER' : 'BOTH');
  const isAdmin2 = finalPermissions === 'CAFE';

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTableId && quantity > 0) {
      onConfirm(selectedTableId, quantity);
      setQuantity(1);
      setSelectedTableId('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glass-technical p-8 rounded-2xl border-cyber-lime/20 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-cyber-lime uppercase tracking-tight">Cafe Dispatch</h3>
                <p className="font-mono text-[10px] text-on-surface-variant/60 uppercase tracking-widest mt-1">
                  Item: {item.name}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-on-surface-variant/40 hover:text-pulse-red transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Table Selection */}
              <div className="space-y-3">
                <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1">
                  Target Destination ({isAdmin2 ? 'Bill No.' : 'Table'})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelectedTableId(table.id)}
                      className={`py-3 rounded-lg border font-mono text-[10px] uppercase transition-all ${
                        selectedTableId === table.id
                          ? 'bg-cyber-lime/10 border-cyber-lime text-cyber-lime shadow-[0_0_15px_rgba(188,255,95,0.2)]'
                          : 'bg-obsidian-950/40 border-white/5 text-on-surface-variant/40 hover:border-white/20'
                      }`}
                    >
                      {isAdmin2 ? `Bill ${table.billNumber || table.number}` : table.number}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-3">
                <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1">
                  Resource Quantity
                </label>
                <div className="flex items-center justify-between bg-obsidian-950/60 border border-white/5 rounded-xl p-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-2xl font-mono font-bold text-on-surface">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="font-mono text-[10px] text-on-surface-variant/60 uppercase tracking-widest">Total Surcharge</span>
                  <span className="text-xl font-mono font-bold text-cyber-lime">₹{(item.price * quantity).toFixed(2)}</span>
                </div>
                
                <button 
                  type="submit"
                  disabled={!selectedTableId}
                  className="w-full py-5 bg-cyber-lime text-black font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(188,255,95,0.2)] hover:shadow-[0_0_40px_rgba(188,255,95,0.4)] disabled:opacity-20 disabled:shadow-none transition-all"
                >
                  Confirm Dispatch <ShoppingBag size={18} />
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5">
               <p className="text-[9px] font-mono text-on-surface-variant/30 uppercase tracking-[0.2em] leading-relaxed text-center">
                 Automated point-of-sale synchronization active. Inventory levels will adjust upon confirmation.
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
