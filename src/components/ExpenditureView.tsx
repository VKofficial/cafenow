import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Calendar, IndianRupee, Tag, ShoppingBag, Wrench, Home, Zap, Users, MoreHorizontal, X, Check, Filter, ChevronDown, ChevronLeft, ChevronRight, Wallet, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expenditure } from '../types';

interface ExpenditureViewProps {
  expenditures: Expenditure[];
  onAddExpenditure: (expenditure: Omit<Expenditure, 'id' | 'date'>) => void;
  onDeleteExpenditure: (id: string) => void;
  onUpdateExpenditure: (id: string, updates: Partial<Omit<Expenditure, 'id' | 'date'>>) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Supplies: <ShoppingBag size={14} />,
  Maintenance: <Wrench size={14} />,
  Rent: <Home size={14} />,
  Utilities: <Zap size={14} />,
  Salaries: <Users size={14} />,
  Other: <MoreHorizontal size={14} />,
};

export default function ExpenditureView({ expenditures, onAddExpenditure, onDeleteExpenditure, onUpdateExpenditure }: ExpenditureViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenditure, setEditingExpenditure] = useState<Expenditure | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Supplies' as Expenditure['category'],
    paymentMethod: 'CASH' as 'CASH' | 'UPI' | 'PAY_LATER'
  });

  const handleStartEdit = (exp: Expenditure) => {
    setEditingExpenditure(exp);
    setFormData({
      description: exp.description || '',
      amount: String(exp.amount),
      category: exp.category,
      paymentMethod: exp.paymentMethod || 'CASH'
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingExpenditure(null);
    setFormData({ description: '', amount: '', category: 'Supplies', paymentMethod: 'CASH' });
  };

  const filteredExpenditures = expenditures.filter(e => {
    const matchesSearch = (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
    const matchesPaymentMethod = filterPaymentMethod === 'All' || (e.paymentMethod || 'CASH') === filterPaymentMethod;
    
    const expDate = new Date(e.date);
    const matchesStartDate = !startDate || expDate >= new Date(startDate);
    const matchesEndDate = !endDate || expDate <= new Date(endDate);
    
    return matchesSearch && matchesCategory && matchesPaymentMethod && matchesStartDate && matchesEndDate;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterPaymentMethod, startDate, endDate]);

  const totalItems = filteredExpenditures.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedExpenditures = filteredExpenditures.slice(startIndex, endIndex);

  const totalSpent = filteredExpenditures.reduce((acc, e) => acc + e.amount, 0);

  const categoryTotals = filteredExpenditures.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    
    // Explicit validation as per requirements
    if (isNaN(amount) || amount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }
    
    if (!formData.category) {
      alert('Category is required');
      return;
    }

    if (!formData.description.trim()) {
      alert('Description is required');
      return;
    }

    if (editingExpenditure) {
      onUpdateExpenditure(editingExpenditure.id, {
        description: formData.description.trim(),
        amount: amount,
        category: formData.category,
        paymentMethod: formData.paymentMethod
      });
    } else {
      onAddExpenditure({
        description: formData.description.trim(),
        amount: amount,
        category: formData.category,
        paymentMethod: formData.paymentMethod
      });
    }
    handleClose();
  };

  return (
    <div className="px-4 lg:px-10">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass p-6 rounded-2xl border border-outline/20">
          <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2 font-bold">Total Expenditure</p>
          <h3 className="text-3xl font-bold text-red-500 font-mono">₹{totalSpent.toLocaleString()}</h3>
        </div>
        <div className="glass p-6 rounded-2xl border border-outline/20">
          <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2 font-bold">Items Tracked</p>
          <h3 className="text-3xl font-bold text-on-surface font-mono">{filteredExpenditures.length}</h3>
        </div>
      </div>

      {/* Category Summary */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="flex flex-wrap gap-4 mb-8">
          {Object.entries(categoryTotals).map(([category, amount]) => (
            <div key={category} className="glass px-4 py-3 rounded-xl border border-outline/10 flex items-center gap-3">
              <div className="text-neon-blue bg-neon-blue/10 p-1.5 rounded-lg">
                {CATEGORY_ICONS[category]}
              </div>
              <div>
                <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest leading-none mb-1">{category}</p>
                <p className="text-xs font-bold text-on-surface font-mono leading-none">₹{amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
              <input 
                type="text" 
                placeholder="Search spendings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-on-surface/5 border border-outline/20 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:bg-on-surface/10 transition-all font-mono text-on-surface"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest font-bold ${showFilters ? 'bg-neon-blue/10 border-neon-blue text-neon-blue' : 'bg-on-surface/5 border-outline/20 text-on-surface-variant hover:border-outline/40'}`}
            >
              <Filter size={16} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-6 py-3 bg-neon-blue-glow text-on-primary font-bold text-xs tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>Record Spending</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="glass p-6 rounded-2xl border border-outline/20 bg-on-surface/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Category</label>
                  <div className="relative">
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-surface border border-outline/20 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-neon-blue/50 text-on-surface font-mono uppercase"
                    >
                      <option value="All">All Categories</option>
                      <option value="Supplies">Supplies</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Rent">Rent</option>
                      <option value="Salaries">Salaries</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Payment Method</label>
                  <div className="relative">
                    <select 
                      value={filterPaymentMethod}
                      onChange={(e) => setFilterPaymentMethod(e.target.value)}
                      className="w-full bg-surface border border-outline/20 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-neon-blue/50 text-on-surface font-mono uppercase"
                    >
                      <option value="All">All Methods</option>
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="PAY_LATER">PAY LATER</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">From Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40" />
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-surface border border-outline/20 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-neon-blue/50 text-on-surface font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">To Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40" />
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-surface border border-outline/20 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-neon-blue/50 text-on-surface font-mono"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expenditures Table */}
      <div className="glass rounded-2xl border border-outline/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline/20 bg-on-surface/5">
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Date</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Description</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Category</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold">Payment</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest text-right font-bold">Amount</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/20">
              <AnimatePresence mode="popLayout">
                {paginatedExpenditures.map((exp) => (
                  <motion.tr 
                    layout
                    key={exp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-on-surface/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
                        <Calendar size={12} className="text-neon-blue/40" />
                        <span>{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-on-surface uppercase tracking-tight">{exp.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-neon-blue bg-neon-blue/10 p-1.5 rounded-lg border border-neon-blue/20">
                          {CATEGORY_ICONS[exp.category]}
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">{exp.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-1 rounded border uppercase ${
                        (exp.paymentMethod || 'CASH') === 'CASH' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        (exp.paymentMethod || 'CASH') === 'UPI' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/20' :
                        ((exp.paymentMethod || 'CASH') as string) === 'CARD' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {exp.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold text-red-500">₹{exp.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-1.5 font-mono">
                        <button 
                          onClick={() => handleStartEdit(exp)}
                          className="p-2 hover:bg-neon-blue/10 rounded-lg text-on-surface-variant hover:text-neon-blue transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Edit Expenditure"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteExpenditure(exp.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-on-surface-variant hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete Expenditure"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredExpenditures.length === 0 && (
          <div className="py-20 text-center">
             <div className="w-16 h-16 bg-on-surface/5 rounded-full flex items-center justify-center mx-auto mb-4 text-on-surface-variant/20">
               <ShoppingBag size={32} />
            </div>
            <h3 className="text-xl font-mono text-on-surface-variant uppercase tracking-widest">No Expenditures Found</h3>
            <p className="text-sm text-on-surface-variant mt-2">Start tracking your business spendings today.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-on-surface/5 border border-outline/25 rounded-xl p-4 font-mono text-xs">
          <div className="text-on-surface-variant font-bold uppercase tracking-wider">
            Showing <span className="text-neon-blue">{startIndex + 1}</span> to <span className="text-neon-blue">{endIndex}</span> of <span className="text-on-surface">{totalItems}</span> expenditures
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

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-outline/20 w-full max-w-md rounded-2xl relative z-10 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    {editingExpenditure ? <Edit size={20} /> : <Plus size={20} />}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-on-surface">
                    {editingExpenditure ? 'Edit Expenditure' : 'Record Expenditure'}
                  </h2>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-colors text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Description</label>
                  <input
                    required
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-neon-blue/50 font-sans transition-all"
                    placeholder="e.g., Cafe Supplies, New Cues"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Amount (₹)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                      <IndianRupee size={16} />
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-xl pl-10 pr-4 py-3 text-on-surface focus:outline-none focus:border-neon-blue/50 font-sans transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Category</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                      <Tag size={16} />
                    </div>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-xl pl-10 pr-10 py-3 text-on-surface focus:outline-none focus:border-neon-blue/50 font-sans transition-all appearance-none cursor-pointer"
                    >
                      <option value="Supplies" className="bg-surface text-on-surface">Supplies</option>
                      <option value="Maintenance" className="bg-surface text-on-surface">Maintenance</option>
                      <option value="Utilities" className="bg-surface text-on-surface">Utilities</option>
                      <option value="Rent" className="bg-surface text-on-surface">Rent</option>
                      <option value="Salaries" className="bg-surface text-on-surface">Salaries</option>
                      <option value="Other" className="bg-surface text-on-surface">Other</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">Payment Method</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                      <Wallet size={16} />
                    </div>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-xl pl-10 pr-10 py-3 text-on-surface focus:outline-none focus:border-neon-blue/50 font-sans transition-all appearance-none cursor-pointer"
                    >
                      <option value="CASH" className="bg-surface text-on-surface">CASH</option>
                      <option value="UPI" className="bg-surface text-on-surface">UPI</option>
                      <option value="PAY_LATER" className="bg-surface text-on-surface">PAY LATER</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-6 py-4 rounded-xl border border-outline/20 text-on-surface font-bold hover:bg-on-surface/5 transition-all text-xs tracking-widest uppercase font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-xl bg-neon-blue-glow text-on-primary font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 text-xs tracking-widest uppercase font-mono"
                  >
                    <Check size={16} />
                    <span>{editingExpenditure ? 'Update' : 'Submit'}</span>
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
