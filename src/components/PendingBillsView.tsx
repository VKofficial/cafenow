import React, { useState } from 'react';
import { AlertTriangle, Clock, Trash2, CreditCard, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { PendingBill, SnookerTable } from '../types';

interface PendingBillsViewProps {
  pendingBills: PendingBill[];
  tables: SnookerTable[];
  onSelectPendingBillForCheckout: (reconstructedTable: SnookerTable) => void;
  onDeletePendingBill: (id: string) => Promise<void>;
}

export default function PendingBillsView({
  pendingBills,
  tables,
  onSelectPendingBillForCheckout,
  onDeletePendingBill
}: PendingBillsViewProps) {
  const [billToDelete, setBillToDelete] = useState<PendingBill | null>(null);
  
  // Group pending bills by table number / name
  const tablesMap = React.useMemo(() => {
    const grouped: Record<string, PendingBill[]> = {};
    pendingBills.forEach((bill) => {
      const key = bill.tableNumber;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(bill);
    });
    return grouped;
  }, [pendingBills]);

  // Sort table numbers numerically
  const sortedTableNumbers = React.useMemo(() => {
    return Object.keys(tablesMap).sort((a, b) => {
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (isNaN(aNum) || isNaN(bNum)) return a.localeCompare(b);
      return aNum - bNum;
    });
  }, [tablesMap]);

  const handleCheckoutClick = (bill: PendingBill) => {
    const matchTable = tables.find(t => t.id === bill.tableId) || tables[0] || {
      id: bill.tableId,
      number: bill.tableNumber,
      type: 'Snooker',
      rate: 200,
      rateUnit: 'hr'
    };

    const reconstructed: SnookerTable = {
      ...matchTable,
      status: 'RUNNING',
      player: bill.player,
      cost: bill.amount,
      sessionCost: bill.sessionCost,
      cafeCost: bill.cafeCost,
      elapsedTime: bill.elapsedTime,
      currentMemberId: bill.memberId || null,
      currentCart: (bill.cart || []).map(ci => ({
        item: {
          id: ci.item?.id || '',
          name: ci.item?.name || 'Item',
          price: Number(ci.item?.price || 0),
          category: ci.item?.category || 'Other'
        },
        quantity: ci.quantity
      })),
      pendingBillId: bill.id // custom field so we know it's a pending bill checkout!
    };

    onSelectPendingBillForCheckout(reconstructed);
  };

  if (pendingBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-on-surface/5 flex items-center justify-center mb-6 border border-outline/15 shadow-inner">
          <AlertTriangle size={24} className="text-on-surface-variant opacity-40" />
        </div>
        <h3 className="text-xl font-bold font-sans tracking-tight text-on-surface mb-2">No Pending Bills</h3>
        <p className="text-on-surface-variant/70 text-xs font-mono uppercase tracking-widest max-w-sm">
          All slots are clear. Any minimized sessions will appear here as drafts waiting for settlement.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-10 max-w-7xl mx-auto space-y-10 mb-20">
      {sortedTableNumbers.map((tableNum) => {
        const bills = tablesMap[tableNum];
        // Find table type from tables list
        const tableType = tables.find(t => t.number === tableNum)?.type || 'Game Table';

        return (
          <motion.div
            key={tableNum}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-technical p-6 rounded-xl border border-outline/15 relative overflow-hidden"
          >
            {/* Header segment */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline/10 mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2.5">
                  <span className="text-neon-blue font-sans">{tableNum}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-on-surface/5 border border-outline/15 text-on-surface-variant rounded">
                    {tableType}
                  </span>
                </h2>
                <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase tracking-widest mt-1">
                  Active pending drafts: {bills.length}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded font-mono text-xs uppercase font-bold tracking-wider">
                <AlertTriangle size={12} className="stroke-[2.5]" />
                <span>PENDING</span>
              </div>
            </div>

            {/* List of bills for this table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-on-surface/[0.02] hover:bg-on-surface/[0.04] p-5 rounded-lg border border-outline/10 hover:border-amber-500/25 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="font-mono text-[9px] text-on-surface-variant/40 block leading-none uppercase tracking-widest mb-1.5">Player</span>
                        <h4 className="text-lg font-bold text-on-surface tracking-tight leading-none uppercase">
                          {bill.player}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[9px] text-on-surface-variant/40 block leading-none uppercase tracking-widest mb-1">Time Elapsed</span>
                        <div className="flex items-center gap-1 text-on-surface font-mono text-xs font-bold leading-none uppercase">
                          <Clock size={11} className="text-on-surface-variant/50" />
                          <span>{bill.elapsedTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost split up */}
                    <div className="space-y-1.5 py-3 border-y border-outline/10 mb-4 font-mono text-[11px] text-on-surface-variant/70 uppercase tracking-widest">
                      <div className="flex justify-between">
                        <span>Session Cost:</span>
                        <span>₹{bill.sessionCost.toFixed(2)}</span>
                      </div>
                      {bill.cafeCost > 0 && (
                        <div className="flex justify-between text-cyber-lime">
                          <span>+ Cafe Orders:</span>
                          <span>₹{bill.cafeCost.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {/* Cart item breakdown */}
                      {bill.cart && bill.cart.length > 0 && (
                        <div className="pl-3 mt-1.5 space-y-1 border-l border-outline/15 text-[10px] normal-case tracking-normal text-on-surface-variant/55 italic">
                          {bill.cart.map((ci, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>• {ci.item?.name || 'Item'} (x{ci.quantity})</span>
                              <span>₹{(Number(ci.item?.price || 0) * ci.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 flex justify-between items-center mt-3">
                    <div>
                      <span className="font-mono text-[9px] text-on-surface-variant/40 block leading-none uppercase tracking-widest mb-1">Total Bill</span>
                      <span className="text-2xl font-bold font-mono text-cyber-lime leading-none">
                        ₹{bill.amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setBillToDelete(bill)}
                        className="p-2.5 rounded bg-on-surface/5 hover:bg-red-500/10 border border-outline/25 hover:border-red-500/30 text-on-surface-variant hover:text-red-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="Delete bill"
                      >
                        <Trash2 size={13} />
                      </button>

                      <button
                        onClick={() => handleCheckoutClick(bill)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-4 py-2.5 font-bold font-mono text-[10px] uppercase tracking-wider rounded shadow-md hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        title="Checkout and Pay"
                      >
                        <CreditCard size={11} className="stroke-[2.5]" />
                        <span>Settle Bill</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Custom Draft Bill Deletion Confirmation Modal */}
      {billToDelete && (
        <div id="draft-bill-delete-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-950 border border-outline/20 p-8 rounded-2xl shadow-2xl relative"
          >
            <div className="flex items-center gap-4 text-red-400 mb-6 font-sans">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">BILL SATELLITE SAFEGUARD</h3>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Decommission Draft?</h2>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant/90 mb-6 leading-relaxed">
              Are you sure you want to cancel and clear the draft pending bill for <span className="text-white font-semibold">Table {billToDelete.tableNumber}</span>?
              All item configurations and time records under draft UUID <span className="font-mono text-cyan-400 text-xs">{billToDelete.id.slice(0, 8)}</span> will be permanently purged.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                id="cancel-draft-delete-btn"
                onClick={() => setBillToDelete(null)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-colors text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-draft-delete-btn"
                onClick={async () => {
                  await onDeletePendingBill(billToDelete.id);
                  setBillToDelete(null);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-red-650 hover:bg-red-700 text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
              >
                <Trash2 size={12} />
                Cancel Draft
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
