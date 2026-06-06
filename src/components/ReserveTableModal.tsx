import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, Clock, User, Phone, Users, 
  Banknote, FileText, Award 
} from 'lucide-react';
import { SnookerTable, Member, Booking } from '../types';

interface ReserveTableModalProps {
  isOpen: boolean;
  table: SnookerTable | null;
  onClose: () => void;
  onConfirm: (newBooking: Omit<Booking, 'id' | 'createdAt'>) => void;
  members: Member[];
}

export default function ReserveTableModal({ 
  isOpen, 
  table, 
  onClose, 
  onConfirm,
  members 
}: ReserveTableModalProps) {
  const [formData, setFormData] = useState({
    playerName: '',
    contact: '',
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    note: '',
    memberId: '',
    numberOfPlayers: 1,
    advancePaid: '' as string | number,
    depositPaymentMethod: 'UPI' as Booking['depositPaymentMethod'],
    status: 'CONFIRMED' as Booking['status']
  });

  // Reset/prefill when modal opens
  useEffect(() => {
    if (isOpen && table) {
      // Set default start time near current hour
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      setFormData({
        playerName: '',
        contact: '',
        bookingDate: new Date().toISOString().split('T')[0],
        startTime: `${hours}:${minutes}`,
        endTime: '',
        note: '',
        memberId: '',
        numberOfPlayers: 1,
        advancePaid: '',
        depositPaymentMethod: 'UPI',
        status: 'CONFIRMED'
      });
    }
  }, [isOpen, table]);

  if (!table) return null;

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

    const depositAmt = Number(formData.advancePaid) || 0;

    onConfirm({
      tableId: table.id,
      tableNumber: table.number,
      playerName: formData.playerName.trim(),
      contact: formData.contact.trim(),
      bookingDate: formData.bookingDate,
      startTime: formData.startTime,
      endTime: formData.endTime || undefined,
      status: formData.status,
      note: formData.note.trim() || undefined,
      memberId: formData.memberId || null,
      numberOfPlayers: Number(formData.numberOfPlayers) || 1,
      advancePaid: depositAmt > 0 ? depositAmt : 0,
      depositPaymentMethod: depositAmt > 0 ? formData.depositPaymentMethod : null,
      createdByAdmin: 'Counter Board'
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-surface border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl my-8 text-on-surface"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-neon-blue uppercase tracking-tight">
                  Book {table.number}
                </h3>
                <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mt-1">
                  Terminal Type: {table.type} • Quick booking & Board Reservation
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-full transition-all text-on-surface-variant"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Optional Smart Member linking */}
              <div className="bg-on-surface/5 border border-white/5 p-4 rounded-xl space-y-1.5">
                <label className="block font-mono text-[9px] text-neon-blue uppercase tracking-widest ml-0.5 font-bold">
                  Link Existing Club Member (Optional Smart Autofill)
                </label>
                <select
                  value={formData.memberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full bg-surface/40 border border-outline/25 rounded-lg px-3 py-2 text-xs font-mono text-on-surface"
                >
                  <option className="bg-surface text-on-surface" value="">-- Direct Visitor / Not linked --</option>
                  {members.map(m => (
                    <option key={m.id} className="bg-surface text-on-surface font-semibold" value={m.id}>
                      {m.name.toUpperCase()} (Ph: {m.contact})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Player / Group Name
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="text"
                      value={formData.playerName}
                      onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-9 pr-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs uppercase font-semibold text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Contact Phone Reference
                  </label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="e.g. 9988776655"
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-9 pr-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Booking Date
                  </label>
                  <input 
                    type="date"
                    value={formData.bookingDate}
                    onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                    required
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Start Time (From)
                  </label>
                  <input 
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    End Time (Optional)
                  </label>
                  <input 
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface"
                  />
                </div>
              </div>

              {/* Group size & deposit details */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5 col-span-1">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Players Size
                  </label>
                  <div className="relative">
                    <Users size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
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
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-8 pr-2.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-bold text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Advance (Optional) (₹)
                  </label>
                  <div className="relative">
                    <Banknote size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
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
                      placeholder="e.g. 200"
                      className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-8 pr-2.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-bold text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                    Payment Method
                  </label>
                  <select
                    value={formData.depositPaymentMethod || 'UPI'}
                    disabled={!(Number(formData.advancePaid) > 0)}
                    onChange={(e) => setFormData({ ...formData, depositPaymentMethod: e.target.value as any })}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface font-semibold text-center disabled:opacity-40"
                  >
                    <option className="bg-surface text-on-surface" value="UPI">UPI</option>
                    <option className="bg-surface text-on-surface" value="CASH font-semibold">CASH</option>
                    <option className="bg-surface text-on-surface" value="CARD font-semibold">CARD</option>
                  </select>
                </div>
              </div>

              {/* Status controller for Quick Board booking */}
              <div className="grid grid-cols-2 gap-4 bg-on-surface/5 p-4 rounded-xl border border-white/5">
                <div className="flex flex-col justify-center">
                  <label className="block font-mono text-[9px] text-neon-blue uppercase tracking-widest font-bold">
                    Initial Booking Status
                  </label>
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase mt-1 leading-normal">
                    {formData.status === 'CONFIRMED' ? 'Immediately reserves physical board slot' : 'Placed under waitlist queue'}
                  </span>
                </div>
                <div className="flex gap-1.5 items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'PENDING' })}
                    className={`px-3 py-2 font-mono text-[10px] uppercase font-bold tracking-wider rounded-lg border transition-all ${formData.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-extrabold' : 'border-white/10 text-on-surface-variant'}`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'CONFIRMED' })}
                    className={`px-3 py-2 font-mono text-[10px] uppercase font-bold tracking-wider rounded-lg border transition-all ${formData.status === 'CONFIRMED' ? 'bg-neon-blue/15 border-neon-blue text-neon-blue font-extrabold' : 'border-white/10 text-on-surface-variant'}`}
                  >
                    Confirmed
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest ml-0.5">
                  Instructional Booking Notes
                </label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 top-3 text-on-surface-variant/40" />
                  <textarea 
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Enter special instructions or tournament links..."
                    rows={2}
                    className="w-full bg-on-surface/5 border border-outline/20 rounded-lg pl-9 pr-3.5 py-2.5 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface uppercase resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-on-surface-variant font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all font-mono rounded-xl"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-neon-blue text-on-primary font-bold uppercase tracking-widest text-[10px] hover:bg-neon-blue-glow transition-all border border-neon-blue/30 shadow-[0_0_15px_rgba(0,195,255,0.2)] font-mono rounded-xl"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
