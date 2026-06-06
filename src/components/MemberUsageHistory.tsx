import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Calendar, CreditCard, Banknote, QrCode, History, Trash2, ArrowUpRight, DollarSign, RefreshCw, Layers, Award, FileText, ChevronLeft, ChevronRight, Utensils, Coffee, TrendingUp } from 'lucide-react';
import { Member, Transaction } from '../types';
import { supabaseService } from '../services/supabaseService';

interface MemberUsageHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
}

export default function MemberUsageHistory({ isOpen, onClose, member }: MemberUsageHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | 'CASH' | 'UPI' | 'PAY_LATER'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Fetch transactions
  useEffect(() => {
    if (isOpen && member) {
      fetchMemberTransactions();
    }
  }, [isOpen, member]);

  const fetchMemberTransactions = async () => {
    if (!member) return;
    setLoading(true);
    try {
      const allTx = await supabaseService.getTransactions();
      // Filter transactions for this specific member
      const memberTx = allTx.filter(t => {
        // Match by member uuid or fallback match by name if memberId isn't recorded but player matches
        const matchesId = t.memberId === member.id;
        const matchesName = !t.memberId && t.playerName?.toLowerCase() === member.name?.toLowerCase();
        return matchesId || matchesName;
      });
      setTransactions(memberTx);
    } catch (err) {
      console.error('Error fetching member transaction history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  // Filter transactions based on query and method
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      (t.tableNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.duration || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
    return matchesSearch && matchesMethod;
  });

  // Pagination logic
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Summary Metrics
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const averageSpent = transactions.length > 0 ? totalSpent / transactions.length : 0;

  // Aggregate most frequently ordered items (top 5 Canteen/Cafe items)
  const topItems = React.useMemo(() => {
    const itemMap: { [name: string]: { name: string; count: number; totalSpent: number } } = {};
    
    transactions.forEach(tx => {
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          const name = item.name;
          const qty = Number(item.quantity || 0);
          const price = Number(item.price || 0);
          if (name) {
            if (!itemMap[name]) {
              itemMap[name] = { name, count: 0, totalSpent: 0 };
            }
            itemMap[name].count += qty;
            itemMap[name].totalSpent += qty * price;
          }
        });
      }
    });

    return Object.values(itemMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [transactions]);

  // Determine maximum count for progress bars
  const maxCount = React.useMemo(() => {
    if (topItems.length === 0) return 1;
    return Math.max(...topItems.map(i => i.count), 1);
  }, [topItems]);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface border border-outline/20 w-full max-w-5xl rounded-3xl relative z-10 p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyber-lime/10 flex items-center justify-center text-cyber-lime border border-cyber-lime/20 shadow-[0_0_15px_rgba(202,255,0,0.1)] animate-pulse">
              <Award size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                  {member.name}
                </h2>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider border font-bold ${
                  member.status === 'Active' 
                    ? 'bg-cyber-lime/10 text-cyber-lime border-cyber-lime/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {member.status}
                </span>
              </div>
              <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mt-0.5">
                MEMBER HISTORY • ID: {member.id.toUpperCase().slice(-6)} • {member.contact}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-on-surface/5 rounded-full transition-colors text-on-surface-variant hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Highlight Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/[0.02] border border-outline/10 p-4 rounded-2xl">
            <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] font-bold">Total Contribution</p>
            <h3 className="text-2xl font-bold text-cyber-lime font-mono mt-1">₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="bg-white/[0.02] border border-outline/10 p-4 rounded-2xl">
            <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] font-bold">Total Sessions / Orders</p>
            <h3 className="text-2xl font-bold text-neon-blue font-mono mt-1">{transactions.length}</h3>
          </div>
          <div className="bg-white/[0.02] border border-outline/10 p-4 rounded-2xl">
            <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] font-bold">Average Ticket Size</p>
            <h3 className="text-2xl font-bold text-on-surface font-mono mt-1">₹{averageSpent.toFixed(2)}</h3>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search history by Table or Duration..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-on-surface/5 border border-outline/20 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-neon-blue/50 focus:bg-on-surface/10 transition-all font-mono text-on-surface"
            />
          </div>

          <div className="flex gap-1.5 self-center md:self-auto bg-on-surface/5 p-1 rounded-xl border border-outline/20">
            {(['ALL', 'CASH', 'UPI', 'PAY_LATER'] as const).map((method) => (
              <button
                key={method}
                onClick={() => {
                  setSelectedMethod(method);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold tracking-widest uppercase transition-all ${
                  selectedMethod === method
                    ? 'bg-neon-blue text-black shadow-md shadow-neon-blue/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Split Content Area */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 mb-4 overflow-y-auto md:overflow-hidden">
          {/* Left Column: List Body & Pagination */}
          <div className="flex-1 flex flex-col min-h-[350px] md:min-h-0">
            <div className="flex-1 overflow-y-auto mb-4 border border-outline/10 rounded-2xl bg-black/20">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-t-transparent border-cyber-lime rounded-full animate-spin mb-3" />
                  <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant">Loading usage history...</p>
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <FileText className="text-on-surface-variant/20 mb-4" size={40} />
                  <h4 className="font-bold text-on-surface uppercase tracking-widest text-sm font-mono mb-1">No Transactions Found</h4>
                  <p className="text-xs text-on-surface-variant/60 max-w-xs">
                    {transactions.length === 0 
                      ? `${member.name} has no logged usage transactions in the system.`
                      : "No transactions match your search filter criteria."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-outline/10">
                  {paginatedTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-on-surface/[0.02] transition-colors"
                    >
                      <div className="flex items-start gap-3.5 mb-2 sm:mb-0">
                        <div className="w-9 h-9 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20 shrink-0 font-mono text-[9px] font-bold uppercase">
                          TXN
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-neon-blue lowercase">
                              ID: {tx.id.toUpperCase().slice(-6)}
                            </span>
                            <span className="text-[10px] font-mono text-on-surface-variant/60">•</span>
                            <span className="text-[10px] font-mono text-on-surface-variant">
                              {tx.duration} duration
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-bold text-cyber-lime font-mono">
                              {tx.tableNumber === 'MEMBER_DUE' ? 'Member Due Payment' : tx.tableNumber}
                            </span>
                            {tx.items && tx.items.length > 0 && (
                              <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-on-surface-variant" title={tx.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}>
                                {tx.items.length} order items
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-outline/5 sm:border-0 pt-2 sm:pt-0">
                        <div className="flex flex-col sm:items-end">
                          <span className="text-on-surface text-xs font-bold">
                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-mono text-on-surface-variant">
                            {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-outline/10 py-1.5 px-3 rounded-xl">
                            {tx.paymentMethod === 'UPI' && <QrCode size={11} className="text-neon-blue" />}
                            {tx.paymentMethod === 'CASH' && <Banknote size={11} className="text-cyber-lime" />}
                            {(tx.paymentMethod as string) === 'CARD' && <CreditCard size={11} className="text-amber-500" />}
                            {tx.paymentMethod === 'PAY_LATER' && <History size={11} className="text-red-400" />}
                            <span className="text-[10px] font-mono font-bold tracking-wider text-on-surface uppercase pr-0.5">
                              {tx.paymentMethod}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-cyber-lime text-sm sm:w-20 sm:text-right">
                            ₹{tx.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-1 bg-on-surface/5 border border-outline/10 rounded-xl p-3 font-mono text-[10px] select-none text-on-surface-variant">
                <div>
                  Showing <span className="text-neon-blue">{startIndex + 1}</span>-
                  <span className="text-neon-blue">{endIndex}</span> of <span className="text-on-surface">{totalItems}</span> txs
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-outline/20 rounded-lg text-on-surface hover:text-neon-blue disabled:opacity-30 disabled:hover:text-on-surface transition-all hover:bg-on-surface/5 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-bold text-on-surface px-1.5">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-outline/20 rounded-lg text-on-surface hover:text-neon-blue disabled:opacity-30 disabled:hover:text-on-surface transition-all hover:bg-on-surface/5 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Most Frequently Ordered Items Sidebar */}
          <div className="w-full md:w-80 shrink-0 bg-white/[0.015] border border-outline/15 rounded-2xl p-5 flex flex-col min-h-[300px] md:min-h-0 overflow-y-auto">
            <div className="flex items-center gap-2.5 pb-3 border-b border-outline/10 mb-4 shrink-0">
              <TrendingUp size={16} className="text-cyber-lime" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Frequent Orders</h4>
                <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest mt-0.5">Top 5 Canteen Items</p>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <RefreshCw size={18} className="text-cyber-lime animate-spin mb-2" />
                <span className="text-[10px] font-mono text-on-surface-variant uppercase">Aggregating...</span>
              </div>
            ) : topItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Coffee size={24} className="text-on-surface-variant/20 mb-2" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/60">No cafe orders yet</p>
                <p className="text-[9px] text-on-surface-variant/40 mt-1 max-w-[180px]">
                  Canteen items purchased in member sessions will appear here as trends.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-3.5 pr-0.5">
                {topItems.map((item, index) => {
                  const percentage = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.name} className="relative overflow-hidden p-3 rounded-xl border border-outline/10 bg-on-surface/[0.01] hover:bg-on-surface/[0.03] transition-all flex flex-col gap-2">
                      <div 
                        className="absolute left-0 bottom-0 top-0 bg-cyber-lime/5 rounded-l-xl transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex justify-between items-start gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-cyber-lime/10 border border-cyber-lime/20 text-cyber-lime font-mono text-[9px] font-extrabold shrink-0 mt-0.5">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-on-surface block truncate font-sans leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[9px] font-mono text-on-surface-variant uppercase mt-1 block">
                              {item.count} {item.count === 1 ? 'qty purchased' : 'qty purchased'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-cyber-lime block">
                            ₹{item.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4 border-t border-outline/10 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-neon-blue text-on-primary font-bold text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(0,195,255,0.2)] hover:shadow-[0_0_25px_rgba(0,195,255,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <span>Close History</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
