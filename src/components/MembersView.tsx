import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MoreVertical, Edit2, Trash2, Mail, Phone, Calendar, User, X, Check, Wallet, Plus, Upload, AlertCircle, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member } from '../types';
import MemberUsageHistory from './MemberUsageHistory';

interface MembersViewProps {
  members: Member[];
  onAddMember: (member: Omit<Member, 'id' | 'joinedDate'>) => any;
  onEditMember: (member: Member) => void | Promise<void>;
  onDeleteMember: (id: string) => void | Promise<void>;
  onClearMemberDue?: (memberId: string, method: 'CASH' | 'UPI', customAmount?: number) => void | Promise<void>;
}

export default function MembersView({ members, onAddMember, onEditMember, onDeleteMember, onClearMemberDue }: MembersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [clearingDueId, setClearingDueId] = useState<string | null>(null);
  const [addingDueMemberId, setAddingDueMemberId] = useState<string | null>(null);
  const [customDueAmount, setCustomDueAmount] = useState<string>('');
  const [settlingAmount, setSettlingAmount] = useState<string>('');
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    status: 'Inactive' as 'Active' | 'Inactive'
  });

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    if (!csvText.trim()) {
      setImportError('Please paste some CSV data first.');
      return;
    }

    const lines = csvText.split('\n');
    const parsedMembers: Omit<Member, 'id' | 'joinedDate'>[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();
      if (!trimmed) continue; // skip blank lines

      // Split columns by comma and trim each column
      const cols = trimmed.split(',').map(c => c.trim());

      // Skip the headers row if it looks like one
      if (lineNumber === 1 && 
          (cols[0].toLowerCase() === 'name' || 
           cols[1]?.toLowerCase() === 'contact' || 
           cols[2]?.toLowerCase() === 'dueamount' || 
           cols[2]?.toLowerCase() === 'due amount')) {
        continue;
      }

      if (cols.length < 2) {
        setImportError(`Row ${lineNumber}: Row must have at least Name and Contact. Value: "${trimmed}"`);
        return;
      }

      const name = cols[0];
      const contact = cols[1];
      const dueStr = cols[2] || '0';

      if (!name) {
        setImportError(`Row ${lineNumber}: Name cannot be empty.`);
        return;
      }
      if (!contact) {
        setImportError(`Row ${lineNumber}: Contact/Phone cannot be empty.`);
        return;
      }

      const parsedDue = parseFloat(dueStr.replace(/[^\d.-]/g, ''));
      const dueAmount = isNaN(parsedDue) ? 0 : parsedDue;

      parsedMembers.push({
        name,
        contact,
        status: 'Active',
        dueAmount
      });
    }

    if (parsedMembers.length === 0) {
      setImportError('No valid rows found to import.');
      return;
    }

    setIsImporting(true);
    try {
      for (const m of parsedMembers) {
        await onAddMember(m);
      }
      setIsImportModalOpen(false);
      setCsvText('');
    } catch (error) {
      console.error(error);
      setImportError('An error occurred during bulk import. Please check your network and format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddPendingAmount = async (member: Member) => {
    const parsedAmount = parseFloat(customDueAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAddingDueMemberId(null);
      return;
    }
    const currentDue = member.dueAmount || 0;
    const updatedMember: Member = {
      ...member,
      dueAmount: currentDue + parsedAmount
    };
    await onEditMember(updatedMember);
    setAddingDueMemberId(null);
    setCustomDueAmount('');
  };

  const filteredMembers = members.filter(m => 
    (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.contact || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormData({ name: '', contact: '', status: 'Inactive' });
    setSearchQuery(''); // Clear search to ensure user sees the new member being added
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({ name: member.name, contact: member.contact, status: member.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      await onEditMember({ ...editingMember, ...formData });
    } else {
      setSearchQuery(''); // Clear search first so results show up
      await onAddMember(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="px-4 lg:px-10">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
          <input 
            type="text" 
            placeholder="Search members by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-on-surface/5 border border-outline/20 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:bg-on-surface/10 transition-all font-mono text-on-surface"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => {
              setImportError(null);
              setCsvText('');
              setIsImportModalOpen(true);
            }}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface hover:text-white font-bold text-xs tracking-[0.2em] uppercase rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            <span>Bulk Import</span>
          </button>
          
          <button 
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-6 py-3 bg-neon-blue-glow text-on-primary font-bold text-xs tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            <span>Add New Member</span>
          </button>
        </div>
      </div>

      {/* Members Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {paginatedMembers.map((member) => (
            <motion.div
              layout
              key={member.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass p-6 rounded-2xl border border-outline/20 relative group hover:border-neon-blue/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                    <User size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg group-hover:text-neon-blue transition-colors text-on-surface">
                        {member.name}
                      </h3>
                      {addingDueMemberId !== member.id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingDueMemberId(member.id);
                            setCustomDueAmount('');
                          }}
                          className="p-1 hover:bg-neon-blue/10 rounded text-neon-blue/70 hover:text-neon-blue transition-all"
                          title="Add Custom Pending Amount"
                        >
                          <Plus size={14} className="stroke-[3]" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            placeholder="₹ Amount"
                            value={customDueAmount}
                            onChange={(e) => setCustomDueAmount(e.target.value)}
                            className="bg-background border border-outline/30 rounded px-1.5 py-0.5 text-xs text-on-surface w-20 font-mono focus:outline-none focus:border-neon-blue/50"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddPendingAmount(member);
                              if (e.key === 'Escape') setAddingDueMemberId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPendingAmount(member)}
                            className="p-1 bg-cyber-lime/20 border border-cyber-lime/40 rounded text-cyber-lime hover:bg-cyber-lime/30 transition-all"
                            title="Confirm"
                          >
                            <Check size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingDueMemberId(null)}
                            className="p-1 bg-red-500/10 border border-red-500/20 rounded text-red-400 hover:bg-red-500/20 transition-all"
                            title="Cancel"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'Active' ? 'bg-cyber-lime glow-lime-sm' : 'bg-red-500'}`} />
                       <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-on-surface-variant">
                         {member.status} Member
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEditModal(member)}
                    className="p-2 hover:bg-on-surface/5 rounded-lg text-on-surface-variant hover:text-neon-blue transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDeleteMember(member.id)}
                    className="p-2 hover:bg-on-surface/5 rounded-lg text-on-surface-variant hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-outline/20">
                {member.dueAmount && member.dueAmount > 0 ? (
                  <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 text-xs font-mono text-red-400">
                        <Wallet size={14} />
                        <span className="font-bold">DUE: ₹{member.dueAmount.toFixed(2)}</span>
                      </div>
                      {clearingDueId !== member.id ? (
                        <button 
                          onClick={() => {
                            setClearingDueId(member.id);
                            setSettlingAmount(String(member.dueAmount));
                          }}
                          className="text-[10px] font-bold text-red-400 hover:text-white transition-colors underline uppercase tracking-tighter"
                        >
                          Clear
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setClearingDueId(null);
                            setSettlingAmount('');
                          }}
                          className="text-[10px] font-bold text-on-surface-variant hover:text-white transition-colors uppercase tracking-tighter"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {clearingDueId === member.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-2.5 pt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-wider">Amount:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-on-surface-variant/80">₹</span>
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={settlingAmount}
                                  onChange={(e) => setSettlingAmount(e.target.value)}
                                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 pl-4 text-xs text-white font-mono focus:outline-none focus:border-neon-blue/50 transition-all font-bold"
                                  max={member.dueAmount}
                                  min={1}
                                  autoFocus
                                />
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const amt = parseFloat(settlingAmount);
                                  if (isNaN(amt) || amt <= 0) return;
                                  onClearMemberDue?.(member.id, 'CASH', amt);
                                  setClearingDueId(null);
                                  setSettlingAmount('');
                                }}
                                className="flex-1 py-2 bg-cyber-lime/25 border border-cyber-lime/40 hover:bg-cyber-lime text-[9px] font-mono font-bold text-cyber-lime hover:text-black uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>Cash</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const amt = parseFloat(settlingAmount);
                                  if (isNaN(amt) || amt <= 0) return;
                                  onClearMemberDue?.(member.id, 'UPI', amt);
                                  setClearingDueId(null);
                                  setSettlingAmount('');
                                }}
                                className="flex-1 py-2 bg-neon-blue/25 border border-neon-blue/40 hover:bg-neon-blue text-[9px] font-mono font-bold text-neon-blue hover:text-white uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>UPI</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-mono">
                  <Phone size={12} className="text-neon-blue/40" />
                  <span className="truncate">{member.contact}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-mono">
                  <Calendar size={12} className="text-neon-blue/40" />
                  <span>Joined {member.joinedDate}</span>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistoryMember(member);
                  }}
                  className="w-full mt-3 py-2 bg-neon-blue/10 border border-neon-blue/30 hover:bg-neon-blue/20 hover:border-neon-blue/50 text-neon-blue hover:text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.05)]"
                >
                  <History size={11} className="animate-pulse" />
                  <span>View History</span>
                </button>
              </div>
              
              <div className="absolute bottom-2 right-4 text-[8px] font-mono text-on-surface-variant/20 tracking-widest">
                ID_{member.id.toUpperCase().slice(-6)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-on-surface/5 border border-outline/25 rounded-xl p-4 font-mono text-xs">
          <div className="text-on-surface-variant font-bold uppercase tracking-wider">
            Showing <span className="text-neon-blue">{startIndex + 1}</span> to <span className="text-neon-blue">{endIndex}</span> of <span className="text-on-surface">{totalItems}</span> members
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

      {filteredMembers.length === 0 && (
        <div className="py-20 text-center glass rounded-2xl border border-white/5 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-on-surface-variant/20 shadow-inner">
             <User size={32} />
          </div>
          <h3 className="text-xl font-bold text-on-surface uppercase tracking-widest mb-2 font-mono">No Members Found</h3>
          <p className="text-sm text-on-surface-variant/60 mb-8 max-w-sm mx-auto">We couldn't find any member matching "{searchQuery}". Would you like to register them now?</p>
          
          <button 
            type="button"
            onClick={() => {
              const currentQuery = searchQuery;
              const isPhoneNumber = /^[0-9+() -]+$/.test(currentQuery);
              setEditingMember(null);
              setFormData({ 
                name: isPhoneNumber ? '' : currentQuery, 
                contact: isPhoneNumber ? currentQuery : '', 
                status: 'Inactive' 
              });
              setSearchQuery('');
              setIsModalOpen(true);
            }}
            className="px-8 py-4 bg-neon-blue-glow text-on-primary font-bold text-xs tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-3 mx-auto rounded-xl"
          >
            <UserPlus size={18} />
            <span>Register "{searchQuery}"</span>
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              className="bg-surface border border-outline/20 w-full max-w-md rounded-2xl relative z-10 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    {editingMember ? <Edit2 size={20} /> : <UserPlus size={20} />}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-on-surface">
                    {editingMember ? 'Edit Member Profile' : 'Register New Member'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-colors text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-neon-blue/50 font-sans transition-all"
                    placeholder="Enter member name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block">Phone Number</label>
                  <input
                    required
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-neon-blue/50 font-sans transition-all"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block">Membership Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Active', 'Inactive'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: status as any })}
                        className={`py-3 rounded-xl border text-xs font-bold tracking-widest uppercase transition-all ${
                          formData.status === status 
                          ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,219,233,0.1)]' 
                          : 'bg-on-surface/5 border-outline/20 text-on-surface-variant hover:border-black/20'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-xl border border-outline/20 text-on-surface font-bold hover:bg-on-surface/5 transition-all text-xs tracking-widest uppercase font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-xl bg-neon-blue-glow text-on-primary font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 text-xs tracking-widest uppercase font-mono"
                  >
                    <Check size={16} />
                    <span>{editingMember ? 'Update' : 'Register'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isImporting) setIsImportModalOpen(false);
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-outline/20 w-full max-w-lg rounded-2xl relative z-10 p-6 md:p-8 shadow-2xl text-white"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-on-surface">
                      Bulk Import Members
                    </h2>
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">Paste CSV-formatted Member data</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!isImporting) setIsImportModalOpen(false);
                  }}
                  disabled={isImporting}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-colors text-on-surface-variant disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBulkImport} className="space-y-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-on-surface-variant space-y-2">
                  <div className="font-bold text-neon-blue uppercase tracking-wider">CSV Data Format Requirements:</div>
                  <p>Line 1: <code className="text-white bg-black/30 px-1 py-0.5 rounded">Name, Contact, DueAmount</code> (Optional headers line)</p>
                  <p>Line 2+: <code className="text-white bg-black/30 px-1 py-0.5 rounded">Player Name, Phone/Contact, OutstandingBalance</code></p>
                  <div className="pt-1.5 border-t border-white/5 text-[10px] opacity-80">
                    <span className="text-cyber-lime font-bold">EXAMPLE:</span>
                    <pre className="mt-1 bg-black/40 p-2 rounded text-white overflow-x-auto whitespace-pre leading-relaxed">
{`Name, Contact, DueAmount
Amit Sharma, +91 98765 43210, 1500
Rajesh Kumar, 9988776655, 0
Pooja Patel, 9123456789, 450`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">CSV Content</label>
                  <textarea
                    required
                    rows={8}
                    disabled={isImporting}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Paste your comma-separated lines here..."
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/20 focus:outline-none focus:border-neon-blue/50 font-mono text-xs transition-all leading-relaxed"
                  />
                </div>

                {importError && (
                  <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="font-mono leading-relaxed">{importError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => setIsImportModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-xl border border-outline/20 text-on-surface font-bold hover:bg-on-surface/5 transition-all text-xs tracking-widest uppercase font-mono disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="flex-1 px-6 py-4 rounded-xl bg-neon-blue-glow text-on-primary font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 text-xs tracking-widest uppercase font-mono"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Run Import</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyMember && (
          <MemberUsageHistory 
            isOpen={true} 
            onClose={() => setHistoryMember(null)} 
            member={historyMember} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
