import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Terminal, Box, IndianRupee, Clock, Save } from 'lucide-react';
import { SnookerTable, AdminRole, AdminAccount } from '../types';

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (table: Omit<SnookerTable, 'id' | 'status'>) => void;
  onEdit?: (id: string, updates: Partial<SnookerTable>) => void;
  nextSuggestedNumber: number;
  role?: AdminRole;
  permissions?: AdminAccount['permissions'];
  tableToEdit?: SnookerTable | null;
}

export default function AddTableModal({ isOpen, onClose, onAdd, onEdit, nextSuggestedNumber, role, permissions, tableToEdit }: AddTableModalProps) {
  const finalPermissions = permissions || (role === 'admin2' ? 'CAFE' : role === 'admin1' ? 'SNOOKER' : 'BOTH');
  const isAdmin2 = finalPermissions === 'CAFE';
  const [number, setNumber] = useState(String(nextSuggestedNumber));
  const [type, setType] = useState<SnookerTable['type']>(isAdmin2 ? 'Other Games' : 'Pool');
  const [rate, setRate] = useState(isAdmin2 ? 0 : 5);
  const [rateUnit, setRateUnit] = useState<'min' | 'hr'>(isAdmin2 ? 'min' : 'min');
  const [ps5Costs, setPs5Costs] = useState({ p1: 10, p2: 15, p3: 20, p4: 25 });

  React.useEffect(() => {
    if (isOpen) {
      if (tableToEdit) {
        setNumber(tableToEdit.number);
        setType(tableToEdit.type);
        setRate(tableToEdit.rate);
        setRateUnit(tableToEdit.rateUnit || 'min');
        if (tableToEdit.ps5Costs) {
          setPs5Costs(tableToEdit.ps5Costs);
        }
      } else {
        setNumber(String(nextSuggestedNumber));
        setType(isAdmin2 ? 'Other Games' : 'Pool');
        setRate(isAdmin2 ? 0 : 5);
        setRateUnit('min');
        setPs5Costs({ p1: 10, p2: 15, p3: 20, p4: 25 });
      }
    }
  }, [isOpen, tableToEdit, nextSuggestedNumber, isAdmin2]);

  const types: SnookerTable['type'][] = ['Snooker', 'Pool', 'PS5', 'Mini Snooker', 'Other Games'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tableToEdit) {
      onEdit?.(tableToEdit.id, {
        number,
        type,
        rate,
        rateUnit,
        ps5Costs: type === 'PS5' ? ps5Costs : undefined,
      });
    } else {
      onAdd({
        number,
        type,
        rate,
        rateUnit,
        ps5Costs: type === 'PS5' ? ps5Costs : undefined,
      });
    }
    onClose();
  };

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
            className="relative w-full max-w-md glass-technical p-8 rounded-xl border-neon-blue/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex justify-between items-center mb-8 border-b border-outline/20 pb-6">
              <div>
                <h3 className="text-xl font-bold text-neon-blue-bright uppercase tracking-tight">
                  {tableToEdit
                    ? (isAdmin2 ? 'Modify Bill Register' : 'Reconfigure Node') 
                    : (isAdmin2 ? 'New Bill Registration' : 'Provision New Node')}
                </h3>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                  {tableToEdit
                    ? (isAdmin2 ? 'Point-of-Sale Configuration Update' : 'System Resource Parameter Re-Allocation')
                    : (isAdmin2 ? 'Point-of-Sale Billing Utility' : 'System Resource Allocation System')}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-on-surface-variant hover:text-pulse-red transition-colors"
                id="close-add-modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={`grid ${isAdmin2 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div className="space-y-3">
                  <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">
                    {isAdmin2 ? 'Bill Number' : 'Node ID'}
                  </label>
                  <div className="relative">
                    <Terminal size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      required
                      placeholder={isAdmin2 ? "Enter Bill No." : "e.g. Royal Pool or Add..."}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-sm text-on-surface"
                    />
                  </div>
                </div>

                {!isAdmin2 && (
                  <div className="space-y-3">
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">
                      System Rate (₹)
                    </label>
                    {type === 'PS5' ? (
                      <div className="grid grid-cols-2 gap-2">
                         {([1, 2, 3, 4] as const).map(p => (
                           <div key={p} className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neon-blue">{p}P</span>
                              <input 
                                type="number"
                                value={isNaN(ps5Costs[`p${p}` as keyof typeof ps5Costs]) ? '' : ps5Costs[`p${p}` as keyof typeof ps5Costs]}
                                onChange={(e) => setPs5Costs({...ps5Costs, [`p${p}`]: parseFloat(e.target.value)})}
                                className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-9 pr-2 py-2 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface"
                                placeholder="₹"
                              />
                           </div>
                         ))}
                         <div className="col-span-2">
                            <p className="text-[8px] font-mono text-on-surface-variant uppercase tracking-widest text-center">Cost per minute for 1-4 players</p>
                         </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                          <input 
                            type="number"
                            step="0.01"
                            value={isNaN(rate) ? '' : rate}
                            onChange={(e) => setRate(parseFloat(e.target.value))}
                            required
                            className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-9 pr-2 py-3 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-sm text-on-surface"
                          />
                        </div>
                        <select 
                          value={rateUnit}
                          onChange={(e) => setRateUnit(e.target.value as 'min' | 'hr')}
                          className="bg-on-surface/5 border border-outline/20 rounded-lg px-3 py-3 font-mono text-[10px] uppercase tracking-widest outline-none focus:border-neon-blue text-neon-blue"
                        >
                          <option value="min">/min</option>
                          <option value="hr">/hr</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isAdmin2 && (
                <div className="space-y-3">
                  <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest ml-1 font-bold">
                    Hardware Specification (Type)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {types.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          type === t 
                            ? 'bg-neon-blue/10 border-neon-blue text-neon-blue'
                            : 'bg-on-surface/5 border-outline/20 text-on-surface-variant hover:border-neon-blue/30'
                        }`}
                      >
                        <Box size={14} />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-4 bg-neon-blue-glow text-on-primary font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_35px_rgba(0,240,255,0.4)] transition-all active:scale-[0.98]"
                >
                  {tableToEdit
                    ? (isAdmin2 ? 'Update Bill Entry' : 'Apply Specifications')
                    : (isAdmin2 ? 'Register Bill Entry' : 'Allocate Hardware')}
                  {tableToEdit ? <Save size={16} /> : <Plus size={16} />}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
