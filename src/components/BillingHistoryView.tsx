import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Calendar, CreditCard, Banknote, QrCode, ArrowUpRight, History, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, AdminRole, AdminAccount, Member } from '../types';

interface BillingHistoryViewProps {
  transactions: Transaction[];
  role?: AdminRole;
  permissions?: AdminAccount['permissions'];
  members?: Member[];
}

export default function BillingHistoryView({ transactions, role, permissions, members }: BillingHistoryViewProps) {
  const finalPermissions = permissions || (role === 'admin2' ? 'CAFE' : role === 'admin1' ? 'SNOOKER' : 'BOTH');
  const isCafeOnly = finalPermissions === 'CAFE';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | 'CASH' | 'UPI' | 'PAY_LATER'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const handleQuickRange = (rangeType: '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'clear') => {
    if (rangeType === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (rangeType === '7days') {
      start.setDate(today.getDate() - 6);
    } else if (rangeType === '30days') {
      start.setDate(today.getDate() - 29);
    } else if (rangeType === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (rangeType === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.tableNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.playerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.paymentMethod || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
    
    // Parse transaction date for filtering
    const txDateObj = new Date(t.date);
    const txDateStr = isNaN(txDateObj.getTime()) ? '' : txDateObj.toISOString().split('T')[0];
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && txDateStr >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && txDateStr <= endDate;
    }
    
    return matchesSearch && matchesMethod && matchesDate;
  });

  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Table / Bill No.',
      'Player Name',
      'Duration',
      'Payment Method',
      'Amount (INR)'
    ];

    const rows = filteredTransactions.map(t => {
      const formattedDate = new Date(t.date).toISOString().replace('T', ' ').substring(0, 19);
      const cleanPlayerName = (t.playerName || '').replace(/"/g, '""');
      const tableInfo = t.tableNumber === 'MEMBER_DUE' ? 'Due Settlement' : `${t.tableNumber}`;
      const cleanTableInfo = tableInfo.replace(/"/g, '""');
      const cleanPaymentMethod = (t.paymentMethod || '').replace(/"/g, '""');
      const cleanDuration = (t.duration || '').replace(/"/g, '""');

      return [
        `"TXN_${t.id.toUpperCase().slice(-6)}"`,
        `"${formattedDate}"`,
        `"${cleanTableInfo}"`,
        `"${cleanPlayerName}"`,
        `"${cleanDuration}"`,
        `"${cleanPaymentMethod}"`,
        t.amount.toFixed(2)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `billing_history_export_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMethod, startDate, endDate]);

  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const filteredRevenue = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="px-4 lg:px-10">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass p-5 rounded-2xl border border-outline/20">
          <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2 font-bold">Selected Revenue</p>
          <h3 className="text-2xl font-bold text-cyber-lime font-mono">₹{filteredRevenue.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</h3>
          <p className="text-[8px] font-mono text-on-surface-variant/40 mt-1 uppercase tracking-wider">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })} historical total</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-outline/20">
          <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2 font-bold">Selected Transactions</p>
          <h3 className="text-2xl font-bold text-neon-blue font-mono">{filteredTransactions.length}</h3>
          <p className="text-[8px] font-mono text-on-surface-variant/40 mt-1 uppercase tracking-wider">{transactions.length} historical total</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-outline/20">
          <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2 font-bold">Average Ticket</p>
          <h3 className="text-2xl font-bold text-on-surface font-mono">₹{filteredTransactions.length > 0 ? (filteredRevenue / filteredTransactions.length).toFixed(0) : '0'}</h3>
          <p className="text-[8px] font-mono text-on-surface-variant/40 mt-1 uppercase tracking-wider">average of filtered range</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-outline/20 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-1 font-bold">Data Export</p>
            <p className="text-[8px] font-mono text-on-surface-variant/50 uppercase tracking-widest leading-normal">Download current list to spreadsheet formats</p>
          </div>
          <button 
            onClick={handleExportCSV}
            className="w-full mt-3 py-2.5 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:border-neon-blue rounded-xl text-[9px] font-bold font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
        {/* Left column: Search and Method Filters */}
        <div className="xl:col-span-5 flex flex-col justify-between gap-5 bg-on-surface/5 border border-outline/20 p-5 rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-blue/10 rounded-lg text-neon-blue">
                <Search size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Search & Filter</h4>
                <p className="text-on-surface-variant font-mono text-[9px] uppercase tracking-widest mt-0.5">Find specific billing items</p>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input 
                type="text" 
                placeholder={isCafeOnly ? "Search bill, player..." : "Search table, player..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-on-surface/5 border border-outline/20 hover:border-outline/30 focus:border-neon-blue/50 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:bg-on-surface/10 transition-all font-mono text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="text-[8px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Payment Method</label>
            <div className="flex flex-wrap gap-1 bg-on-surface/5 p-1 rounded-xl border border-outline/10">
              {(['ALL', 'CASH', 'UPI', 'PAY_LATER'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={`flex-1 text-center py-2 rounded-lg text-[9px] font-bold font-mono tracking-wider transition-all cursor-pointer ${
                    selectedMethod === method
                      ? 'bg-neon-blue text-on-primary shadow-lg shadow-neon-blue/20'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                  }`}
                >
                  {(method || '').replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Beautiful Date Filter Card */}
        <div className="xl:col-span-7 flex flex-col md:flex-row gap-5 bg-on-surface/5 border border-outline/20 p-5 rounded-2xl">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyber-lime/10 rounded-lg text-cyber-lime">
                <Calendar size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Billing Date Range</h4>
                <p className="text-on-surface-variant font-mono text-[9px] uppercase tracking-widest mt-0.5">
                  {startDate && endDate 
                    ? `Active Range: ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Displaying All-time transaction data'}
                </p>
              </div>
            </div>

            {/* From & To Date Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-on-surface/5 border border-outline/10 hover:border-outline/30 focus:border-neon-blue/50 text-on-surface py-2 px-3 rounded-xl text-xs font-mono focus:outline-none transition-all [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-on-surface/5 border border-outline/10 hover:border-outline/30 focus:border-neon-blue/50 text-on-surface py-2 px-3 rounded-xl text-xs font-mono focus:outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2.5 md:min-w-[180px]">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { type: '7days', label: 'Last 7 Days' },
                { type: '30days', label: 'Last 30 Days' },
                { type: 'thisMonth', label: 'This Month' },
                { type: 'lastMonth', label: 'Last Month' }
              ].map(preset => (
                <button
                  key={preset.type}
                  onClick={() => handleQuickRange(preset.type as any)}
                  className="px-2 py-1.5 rounded-lg text-[9px] font-bold font-mono tracking-wider uppercase border border-outline/10 hover:border-outline/30 hover:bg-on-surface/5 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer text-center"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => handleQuickRange('clear')}
                className="w-full py-2 rounded-xl text-[9px] font-bold font-mono tracking-widest uppercase bg-neon-pink/15 hover:bg-neon-pink/25 border border-neon-pink/30 text-neon-pink transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-outline/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline/20 bg-on-surface/5">
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Transaction ID</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">
                  {isCafeOnly ? 'Bill No.' : 'Table'} | Player
                </th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Duration</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Method</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/20">
              <AnimatePresence mode="popLayout">
                {paginatedTransactions.map((tx) => (
                  <motion.tr 
                    layout
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-on-surface/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] text-neon-blue font-bold">TXN_{tx.id.toUpperCase().slice(-6)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-cyber-lime">
                          {tx.tableNumber === 'MEMBER_DUE' ? 'Due Settlement' : tx.tableNumber}
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant lowercase flex items-center gap-1.5 flex-wrap">
                          {tx.playerName}
                          {tx.memberId && (() => {
                            const foundM = members?.find(m => m.id === tx.memberId);
                            return foundM ? (
                              <span className="text-[9.5px] text-neon-blue font-mono font-bold uppercase tracking-wider">
                                [👤 {foundM.name}]
                              </span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono text-on-surface-variant">{tx.duration}</span>
                    </td>
                     <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {tx.paymentMethod === 'UPI' && <QrCode size={12} className="text-neon-blue" />}
                        {tx.paymentMethod === 'CASH' && <Banknote size={12} className="text-cyber-lime" />}
                        {(tx.paymentMethod as string) === 'CARD' && <CreditCard size={12} className="text-amber-500" />}
                        {tx.paymentMethod === 'PAY_LATER' && <History size={12} className="text-red-400" />}
                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-on-surface">
                          {(tx.paymentMethod || '').replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold text-on-surface group-hover:text-neon-blue transition-colors">₹{tx.amount.toFixed(2)}</span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-on-surface/5 rounded-full flex items-center justify-center mx-auto mb-4 text-on-surface-variant/20">
               <History size={32} />
            </div>
            <h3 className="text-xl font-mono text-on-surface-variant uppercase tracking-widest">No Transactions Found</h3>
            <p className="text-sm text-on-surface-variant mt-2">Adjust your filters or wait for and new checkout.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-on-surface/5 border border-outline/25 rounded-xl p-4 font-mono text-xs">
          <div className="text-on-surface-variant font-bold uppercase tracking-wider">
            Showing <span className="text-neon-blue">{startIndex + 1}</span> to <span className="text-neon-blue">{endIndex}</span> of <span className="text-on-surface">{totalItems}</span> transactions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-outline/25 rounded-lg text-on-surface-variant hover:text-neon-blue disabled:opacity-30 disabled:hover:text-on-surface-variant transition-all hover:bg-on-surface/5"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-on-surface font-bold uppercase tracking-wider px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-outline/25 rounded-lg text-on-surface-variant hover:text-neon-blue disabled:opacity-30 disabled:hover:text-on-surface-variant transition-all hover:bg-on-surface/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
