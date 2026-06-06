import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Calendar, Clock, Phone, User, Trash2, 
  CheckCircle2, XCircle, Play, Info, Users, Banknote, 
  Award, FileText, Check, ShieldCheck, ChevronLeft, ChevronRight,
  Download, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, SnookerTable, Member } from '../types';

interface BookingsViewProps {
  bookings: Booking[];
  tables: SnookerTable[];
  members: Member[];
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  onUpdateBookingStatus: (id: string, status: Booking['status']) => void;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => void;
  onDeleteBooking: (id: string) => void;
  onStartSessionFromBooking: (tableId: string, playerName: string, memberId?: string | null, advancePaid?: number, depositPaymentMethod?: string | null) => void;
}

export default function BookingsView({
  bookings,
  tables,
  members,
  onAddBooking,
  onUpdateBookingStatus,
  onUpdateBooking,
  onDeleteBooking,
  onStartSessionFromBooking,
}: BookingsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterTable, setFilterTable] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [formData, setFormData] = useState({
    tableId: '',
    playerName: '',
    contact: '',
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    note: '',
    memberId: '',
    numberOfPlayers: 1,
    advancePaid: '' as string | number,
    depositPaymentMethod: 'UPI' as Booking['depositPaymentMethod']
  });

  const handleStartEdit = (b: Booking) => {
    setEditingBooking(b);
    setFormData({
      tableId: b.tableId,
      playerName: b.playerName,
      contact: b.contact || '',
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime || '',
      note: b.note || '',
      memberId: b.memberId || '',
      numberOfPlayers: b.numberOfPlayers || 1,
      advancePaid: b.advancePaid !== undefined && b.advancePaid !== null ? b.advancePaid : '',
      depositPaymentMethod: b.depositPaymentMethod || 'UPI'
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
    setFormData({
      tableId: '',
      playerName: '',
      contact: '',
      bookingDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      note: '',
      memberId: '',
      numberOfPlayers: 1,
      advancePaid: '',
      depositPaymentMethod: 'UPI'
    });
  };

  const activeTables = tables.filter(t => t.status !== 'MAINTENANCE');

  const parseBookingToICSDateTime = (dateStr: string, timeStr: string): string => {
    const cleanDate = dateStr.replace(/-/g, '');
    const [hhStr, mmStr] = timeStr.split(':');
    const hh = (hhStr || '0').padStart(2, '0');
    const mm = (mmStr || '0').padStart(2, '0');
    return `${cleanDate}T${hh}${mm}00`;
  };

  const downloadICSFile = () => {
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    if (confirmedBookings.length === 0) {
      alert("No confirmed bookings found to export.");
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Snooker Club Booking System//NONSGML v1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const now = new Date();
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    confirmedBookings.forEach(b => {
      try {
        const startDateTime = parseBookingToICSDateTime(b.bookingDate, b.startTime);
        
        let endDateTime = '';
        if (b.endTime) {
          endDateTime = parseBookingToICSDateTime(b.bookingDate, b.endTime);
        } else {
          const [hhStr, mmStr] = b.startTime.split(':');
          const hh = parseInt(hhStr, 10);
          const mm = parseInt(mmStr || '0', 10);
          const start = new Date(b.bookingDate + 'T' + hh.toString().padStart(2, '0') + ':' + mm.toString().padStart(2, '0') + ':00');
          start.setHours(start.getHours() + 1);
          const endHH = start.getHours().toString().padStart(2, '0');
          const endMM = start.getMinutes().toString().padStart(2, '0');
          const endCleanDate = start.toISOString().split('T')[0].replace(/-/g, '');
          endDateTime = `${endCleanDate}T${endHH}${endMM}00`;
        }

        const tableText = b.tableNumber ? b.tableNumber : 'Snooker Table';
        const summary = `Snooker Booking: ${tableText} (${b.playerName})`;
        const description = `Player: ${b.playerName}\\nContact: ${b.contact || 'N/A'}\\nNote: ${b.note || 'None'}`;
        
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:booking-${b.id}@snookerclub.com`);
        icsContent.push(`DTSTAMP:${dtStamp}`);
        icsContent.push(`DTSTART:${startDateTime}`);
        icsContent.push(`DTEND:${endDateTime}`);
        icsContent.push(`SUMMARY:${summary}`);
        icsContent.push(`DESCRIPTION:${description}`);
        icsContent.push('STATUS:CONFIRMED');
        icsContent.push('END:VEVENT');
      } catch (err) {
        console.error('Error formatting booking for calendar:', b, err);
      }
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'confirmed_bookings.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      (b.playerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.note || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    const matchesTable = filterTable === 'All' || b.tableId === filterTable;

    return matchesSearch && matchesStatus && matchesTable;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const statusWeight = { PENDING: 0, CONFIRMED: 1, COMPLETED: 2, CANCELLED: 3 };
    const weightDiff = (statusWeight[a.status] ?? 0) - (statusWeight[b.status] ?? 0);
    if (weightDiff !== 0) return weightDiff;
    
    return new Date(`${a.bookingDate}T${a.startTime}`).getTime() - new Date(`${b.bookingDate}T${b.startTime}`).getTime();
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterTable]);

  const totalItems = sortedBookings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedBookings = sortedBookings.slice(startIndex, endIndex);

  const totalAdvanceCollected = bookings
    .filter(b => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + (b.advancePaid || 0), 0);

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CONFIRMED':
        return 'bg-neon-blue/10 text-neon-blue border-neon-blue/20';
      case 'COMPLETED':
        return 'bg-cyber-lime/10 text-cyber-lime border-cyber-lime/20';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  const handleMemberChange = (memberId: string) => {
    if (!memberId) {
      setFormData(prev => ({
        ...prev,
        memberId: '',
        playerName: '',
        contact: ''
      }));
      return;
    }
    const selectedMember = members.find(m => m.id === memberId);
    if (selectedMember) {
      setFormData(prev => ({
        ...prev,
        memberId,
        playerName: selectedMember.name,
        contact: selectedMember.contact
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tableId) {
      alert('Please select a Table');
      return;
    }
    if (!formData.playerName.trim()) {
      alert('Please enter Player Name');
      return;
    }
    if (!formData.bookingDate) {
      alert('Please select Booking Date');
      return;
    }
    if (!formData.startTime) {
      alert('Please select Start Time');
      return;
    }

    const selectedTable = tables.find(t => t.id === formData.tableId);
    const depositAmt = Number(formData.advancePaid) || 0;
    
    if (editingBooking) {
      onUpdateBooking(editingBooking.id, {
        tableId: formData.tableId,
        tableNumber: selectedTable?.number || '',
        playerName: formData.playerName.trim(),
        contact: formData.contact.trim(),
        bookingDate: formData.bookingDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        note: formData.note.trim() || undefined,
        memberId: formData.memberId || null,
        numberOfPlayers: Number(formData.numberOfPlayers) || 1,
        advancePaid: depositAmt > 0 ? depositAmt : 0,
        depositPaymentMethod: depositAmt > 0 ? formData.depositPaymentMethod : null,
      });
    } else {
      onAddBooking({
        tableId: formData.tableId,
        tableNumber: selectedTable?.number || '',
        playerName: formData.playerName.trim(),
        contact: formData.contact.trim(),
        bookingDate: formData.bookingDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        status: 'PENDING',
        note: formData.note.trim() || undefined,
        memberId: formData.memberId || null,
        numberOfPlayers: Number(formData.numberOfPlayers) || 1,
        advancePaid: depositAmt > 0 ? depositAmt : 0,
        depositPaymentMethod: depositAmt > 0 ? formData.depositPaymentMethod : null,
        createdByAdmin: 'Counter Agent'
      });
    }

    handleCloseModal();
  };

  return (
    <div className="px-4 lg:px-10">
      {/* Enhanced Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass p-5 rounded-2xl border border-outline/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-1 font-bold">Total Bookings</p>
            <h3 className="text-3xl font-bold text-on-surface font-mono">{bookings.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-on-surface/5 border border-outline/10 flex items-center justify-center text-on-surface/70">
            <Calendar size={18} />
          </div>
        </div>
        
        <div className="glass p-5 rounded-2xl border border-outline/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-1 font-bold">Pending Booking</p>
            <h3 className="text-3xl font-bold text-amber-500 font-mono">{bookings.filter(b => b.status === "PENDING").length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Info size={18} />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-outline/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-1 font-bold">Confirmed Slots</p>
            <h3 className="text-3xl font-bold text-neon-blue font-mono">{bookings.filter(b => b.status === "CONFIRMED").length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-outline/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-1 font-bold">Deposits Saved</p>
            <h3 className="text-3xl font-bold text-cyber-lime font-mono">₹{totalAdvanceCollected}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyber-lime/10 border border-cyber-lime/20 flex items-center justify-center text-cyber-lime">
            <Banknote size={18} />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by player, card details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-on-surface/5 border border-outline/20 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-blue/50 focus:bg-on-surface/10 transition-all font-mono text-on-surface"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-on-surface/5 border border-outline/25 rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface"
          >
            <option className="bg-surface text-on-surface" value="All">All Statuses</option>
            <option className="bg-surface text-on-surface" value="PENDING">Pending</option>
            <option className="bg-surface text-on-surface" value="CONFIRMED">Confirmed</option>
            <option className="bg-surface text-on-surface" value="COMPLETED">Completed</option>
            <option className="bg-surface text-on-surface" value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="bg-on-surface/5 border border-outline/25 rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface"
          >
            <option className="bg-surface text-on-surface" value="All">All Resources</option>
            {tables.map(t => (
              <option key={t.id} className="bg-surface text-on-surface" value={t.id}>{t.number} ({t.type})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={downloadICSFile}
            className="w-full sm:w-auto px-5 py-3 bg-white/5 border border-white/10 hover:border-cyber-lime/40 hover:text-cyber-lime text-on-surface font-bold text-xs font-mono tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(188,255,95,0.15)]"
            title="Download iCalendar format (.ics) for all confirmed slots to sync with Google Calendar, iCal, or Outlook"
          >
            <Download size={14} /> Sync Calendar (.ics)
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-neon-blue text-on-primary font-bold text-xs font-mono tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 border border-neon-blue/30 shadow-[0_0_15px_rgba(0,195,255,0.25)] hover:shadow-[0_0_25px_rgba(0,195,255,0.4)] transition-all cursor-pointer"
          >
            <Plus size={16} /> New Booking
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {sortedBookings.length === 0 ? (
        <div className="glass rounded-2xl border border-outline/10 p-12 text-center text-on-surface-variant">
          <Calendar className="mx-auto text-on-surface-variant/30 mb-4" size={40} />
          <h4 className="text-lg font-bold tracking-tight text-on-surface uppercase font-mono">No Bookings Found</h4>
          <p className="text-xs font-mono mt-1">Adjust your filter sliders or create a new slot schedule.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedBookings.map((b) => {
                const bookingTable = tables.find(t => t.id === b.tableId);
                const isVIPMember = !!b.memberId;
                
                return (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-technical border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status bar */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="font-mono text-[10px] text-on-surface-variant/70 uppercase tracking-widest block font-bold">
                            {b.tableNumber}
                          </span>
                          <span className="text-[11px] font-mono font-extrabold text-neon-blue uppercase">
                            {bookingTable?.type || 'Snooker'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 text-[8px] font-mono font-bold uppercase tracking-wider rounded-md border ${getStatusStyle(b.status)}`}>
                          {b.status}
                        </span>
                      </div>

                      {/* Customer info */}
                      <div className="space-y-2.5 mb-5 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-3 text-on-surface">
                          <User size={15} className="text-on-surface-variant/60" />
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-sans font-extrabold text-base uppercase truncate leading-none">{b.playerName}</span>
                            {isVIPMember && (
                              <span className="flex items-center gap-0.5 bg-neon-blue text-black font-mono font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap scale-90 origin-left" title="Verified System Member">
                                <Award size={8} /> Member
                              </span>
                            )}
                          </div>
                        </div>

                        {b.contact && (
                          <div className="flex items-center gap-3 text-on-surface">
                            <Phone size={14} className="text-on-surface-variant/60" />
                            <span className="font-mono text-xs text-on-surface-variant">{b.contact}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-on-surface">
                          <Calendar size={14} className="text-on-surface-variant/60" />
                          <span className="font-mono text-xs text-on-surface-variant">
                            {new Date(b.bookingDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-on-surface">
                          <Clock size={14} className="text-on-surface-variant/60" />
                          <span className="font-mono text-xs text-cyber-lime font-extrabold tracking-wide">
                            {b.startTime} {b.endTime ? ` - ${b.endTime}` : ''}
                          </span>
                        </div>

                        {/* Group and deposit enhancements rendering */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/5">
                          <div className="bg-on-surface/5 border border-white/5 p-2 rounded flex flex-col justify-center">
                            <span className="text-[8px] font-mono uppercase text-on-surface-variant/60 tracking-wider">Group Size</span>
                            <span className="text-xs font-mono text-on-surface font-extrabold flex items-center gap-1 mt-0.5">
                              <Users size={12} className="text-on-surface-variant/40" />
                              {b.numberOfPlayers || 1} {b.numberOfPlayers === 1 ? 'Player' : 'Players'}
                            </span>
                          </div>

                          <div className="bg-on-surface/5 border border-white/5 p-2 rounded flex flex-col justify-center">
                            <span className="text-[8px] font-mono uppercase text-on-surface-variant/60 tracking-wider">Advance Paid</span>
                            <span className={`text-xs font-mono font-extrabold flex items-center gap-1 mt-0.5 ${(b.advancePaid || 0) > 0 ? 'text-cyber-lime' : 'text-on-surface-variant/40'}`}>
                              <Banknote size={12} className="opacity-60" />
                              ₹{b.advancePaid || 0}
                              {(b.advancePaid || 0) > 0 && b.depositPaymentMethod && (
                                <span className="text-[7px] text-zinc-400 border border-white/10 px-1 rounded ml-auto scale-90">
                                  {b.depositPaymentMethod}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {b.note && (
                          <div className="flex items-start gap-2.5 mt-2 bg-on-surface/5 p-2.5 rounded border border-white/5">
                            <FileText size={11} className="text-on-surface-variant/50 shrink-0 mt-0.5" />
                            <span className="font-mono text-[9px] text-on-surface-variant/90 uppercase leading-normal tracking-wide block truncate max-w-[240px]">
                              {b.note}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="border-t border-white/5 pt-4 mt-auto flex flex-wrap gap-2 justify-between items-center">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onDeleteBooking(b.id)}
                          className="p-2 bg-pulse-red/15 border border-pulse-red/20 text-pulse-red hover:bg-pulse-red hover:text-black rounded-lg transition-all cursor-pointer"
                          title="Remove Record"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleStartEdit(b)}
                          className="p-2 bg-neon-blue/15 border border-neon-blue/20 text-neon-blue lg:hover:bg-neon-blue lg:hover:text-black rounded-lg transition-all cursor-pointer"
                          title="Edit Booking"
                        >
                          <Edit size={13} />
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        {b.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => onUpdateBookingStatus(b.id, 'CANCELLED')}
                              className="bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-on-surface-variant hover:text-red-500 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => onUpdateBookingStatus(b.id, 'CONFIRMED')}
                              className="bg-neon-blue/15 border border-neon-blue/30 hover:bg-neon-blue hover:text-black text-neon-blue px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(0,195,255,0.15)]"
                            >
                              Confirm
                            </button>
                          </>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <>
                            <button 
                              onClick={() => onUpdateBookingStatus(b.id, 'CANCELLED')}
                              className="bg-white/5 border border-white/10 hover:bg-red-500/15 hover:text-red-500 hover:border-red-500/30 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => {
                                onUpdateBookingStatus(b.id, 'COMPLETED');
                                onStartSessionFromBooking(b.tableId, b.playerName, b.memberId, b.advancePaid, b.depositPaymentMethod);
                              }}
                              className="bg-cyber-lime/15 border border-cyber-lime/30 hover:bg-cyber-lime hover:text-black text-cyber-lime px-3.5 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(207,255,0,0.15)]"
                            >
                              <Play size={9} fill="currentColor" /> Play Game
                            </button>
                          </>
                        )}

                        {b.status === 'COMPLETED' && (
                          <span className="text-[9px] font-mono text-cyber-lime/60 uppercase font-extrabold flex items-center gap-1.5 px-3 py-1.5">
                            <ShieldCheck size={12} className="text-cyber-lime" /> Completed
                          </span>
                        )}

                        {b.status === 'CANCELLED' && (
                          <span className="text-[9px] font-mono text-red-500/50 uppercase font-extrabold flex items-center gap-1.5 px-3 py-1.5">
                            <XCircle size={12} className="text-red-500/60" /> Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-on-surface/5 border border-outline/25 rounded-xl p-4 font-mono text-xs">
              <div className="text-on-surface-variant font-bold uppercase tracking-wider">
                Showing <span className="text-neon-blue">{startIndex + 1}</span> to <span className="text-neon-blue">{endIndex}</span> of <span className="text-on-surface">{totalItems}</span> bookings
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
      )}

      {/* Sophisticated New Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-xl bg-surface border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-neon-blue uppercase tracking-tight">
                    {editingBooking ? 'Edit Booking' : 'Create Booking'}
                  </h3>
                  <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mt-1">
                    {editingBooking ? 'Update player name, status, links, and advance deposit values' : 'Configure player, links, and security advance deposit values'}
                  </p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-white/5 rounded-full transition-all text-on-surface-variant"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* VIP member link optional dropdown */}
                <div className="bg-on-surface/5 border border-white/5 p-4 rounded-xl space-y-1.5">
                  <label className="block font-mono text-[9px] text-neon-blue uppercase tracking-widest ml-0.5 font-bold">
                    Link Existing Member (Optional Smart Autofill)
                  </label>
                  <select
                    value={formData.memberId}
                    onChange={(e) => handleMemberChange(e.target.value)}
                    className="w-full bg-surface/40 border border-outline/25 rounded-lg px-3 py-2 text-xs font-mono text-on-surface"
                  >
                    <option className="bg-surface text-on-surface" value="">-- Direct Visitor / Not linked --</option>
                    {members
                      .map(m => (
                        <option key={m.id} className="bg-surface text-on-surface font-semibold" value={m.id}>
                          {m.name.toUpperCase()} (Ph: {m.contact})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Target Terminal / Screen
                    </label>
                    <select
                      value={formData.tableId}
                      onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                      required
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold"
                    >
                      <option className="bg-surface text-on-surface" value="">Select Table...</option>
                      {activeTables.map(t => (
                        <option key={t.id} className="bg-surface text-on-surface font-semibold" value={t.id}>
                          {t.number} ({t.type === 'Mini Snooker' ? 'Mini Snk' : t.type}) - ₹{t.rate}/{t.rateUnit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Player / Group Name
                    </label>
                    <input 
                      type="text"
                      value={formData.playerName}
                      onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs uppercase text-on-surface font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Contact Phone Reference
                    </label>
                    <input 
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="e.g. +91 99999 88888"
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Booking Date
                    </label>
                    <input 
                      type="date"
                      value={formData.bookingDate}
                      onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                      required
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      From (Start Time)
                    </label>
                    <input 
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      To (Expected End)
                    </label>
                    <input 
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface"
                    />
                  </div>
                </div>

                {/* Enhanced fields: Group size, deposit details */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1.5 col-span-1">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Players Size
                    </label>
                    <input 
                      type="number"
                      min="1"
                      max="12"
                      value={formData.numberOfPlayers}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ 
                          ...formData, 
                          numberOfPlayers: val === '' ? 1 : Math.max(1, Number(val)) 
                        });
                      }}
                      required
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Deposit Paid (Optional) (₹)
                    </label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.advancePaid}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setFormData({ ...formData, advancePaid: '' });
                        } else {
                          const num = Number(val);
                          setFormData({ 
                            ...formData, 
                            advancePaid: isNaN(num) ? '' : Math.max(0, num) 
                          });
                        }
                      }}
                      placeholder="e.g. 100"
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                      Deposit Mode
                    </label>
                    <select
                      value={formData.depositPaymentMethod || 'UPI'}
                      disabled={!(Number(formData.advancePaid) > 0)}
                      onChange={(e) => setFormData({ ...formData, depositPaymentMethod: e.target.value as any })}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold text-center disabled:opacity-40"
                    >
                      <option className="bg-surface text-on-surface" value="UPI">UPI</option>
                      <option className="bg-surface text-on-surface" value="CASH">CASH</option>
                      <option className="bg-surface text-on-surface" value="CARD">CARD</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Instructional Booking Notes
                  </label>
                  <textarea 
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Enter preferences e.g. needs extra sticks, link tournament brackets..."
                    rows={2}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface uppercase resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3.5 bg-white/5 border border-white/10 text-on-surface-variant font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all font-mono rounded-xl"
                  >
                    {editingBooking ? 'Cancel Edit' : 'Discard Layout'}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-neon-blue text-on-primary font-bold uppercase tracking-widest text-[10px] hover:bg-neon-blue-glow transition-all border border-neon-blue/30 shadow-[0_0_15px_rgba(0,195,255,0.2)] font-mono rounded-xl"
                  >
                    {editingBooking ? 'Save Changes' : 'Confirm Booking'}
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
