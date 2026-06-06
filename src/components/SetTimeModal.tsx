import React, { useState, useEffect } from 'react';
import { X, Clock, Check, ChevronUp, ChevronDown, Play, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SnookerTable, Member } from '../types';

interface SetTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: SnookerTable | null;
  onSave: (tableId: string, newStartTimeUnix: number, playerName?: string, memberId?: string | null) => void;
  members: Member[];
}

export default function SetTimeModal({ isOpen, onClose, table, onSave, members }: SetTimeModalProps) {
  const [selHour, setSelHour] = useState(12);
  const [selMinute, setSelMinute] = useState(0);
  const [selAmPm, setSelAmPm] = useState<'AM' | 'PM'>('AM');
  const [activeTab, setActiveTab] = useState<'HOURS' | 'MINUTES'>('HOURS');
  const [sessionMemberId, setSessionMemberId] = useState<string>('GUEST');
  const [customPlayerName, setCustomPlayerName] = useState<string>('');

  // Load current start time when opening
  useEffect(() => {
    if (isOpen && table) {
      let dateTimestamp = table.startTimeUnix ? Number(table.startTimeUnix) : Date.now();
      if (isNaN(dateTimestamp) || dateTimestamp <= 0) {
        dateTimestamp = Date.now();
      }
      const date = new Date(dateTimestamp);
      let h = date.getHours();
      const m = date.getMinutes();
      
      const safeH = isNaN(h) ? 12 : h;
      const safeM = isNaN(m) ? 0 : m;
      
      const ampm = safeH >= 12 ? 'PM' : 'AM';
      let displayH = safeH % 12;
      displayH = displayH || 12; // convert 0 to 12
      
      setSelHour(displayH);
      setSelMinute(safeM);
      setSelAmPm(ampm);
      setActiveTab('HOURS');
      setSessionMemberId('GUEST');
      setCustomPlayerName('');
    }
  }, [isOpen, table]);

  if (!table) return null;

  // Visual dial positioning helper
  const radius = 80;
  const getCoordinates = (value: number, max: number) => {
    const safeValue = isNaN(value) ? 0 : value;
    const safeMax = isNaN(max) || max <= 0 ? 1 : max;
    const angle = ((safeValue / safeMax) * 2 * Math.PI) - (Math.PI / 2);
    return {
      x: isNaN(angle) ? 0 : Math.round(Math.cos(angle) * radius),
      y: isNaN(angle) ? 0 : Math.round(Math.sin(angle) * radius)
    };
  };

  const handleHourClick = (hour: number) => {
    setSelHour(hour);
    // Auto switch to minutes to ease selection flow
    setActiveTab('MINUTES');
  };

  const handleMinuteClick = (minute: number) => {
    setSelMinute(minute);
  };

  const incrementHour = () => {
    setSelHour(prev => (prev === 12 ? 1 : prev + 1));
  };

  const decrementHour = () => {
    setSelHour(prev => (prev === 1 ? 12 : prev - 1));
  };

  const incrementMinute = () => {
    setSelMinute(prev => (prev === 59 ? 0 : prev + 1));
  };

  const decrementMinute = () => {
    setSelMinute(prev => (prev === 0 ? 59 : prev - 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;

    // Build the updated start date maintaining original date portion
    const originalDate = new Date(table.startTimeUnix || Date.now());
    let militaryHour = selHour;
    if (selAmPm === 'PM' && militaryHour < 12) {
      militaryHour += 12;
    } else if (selAmPm === 'AM' && militaryHour === 12) {
      militaryHour = 0;
    }

    originalDate.setHours(militaryHour);
    originalDate.setMinutes(selMinute);
    originalDate.setSeconds(0);
    originalDate.setMilliseconds(0);

    if (table.status !== 'RUNNING') {
      const selectedMember = members.find(m => m.id === sessionMemberId);
      const chosenPlayerName = sessionMemberId === 'GUEST' 
        ? (customPlayerName.trim() || 'Guest') 
        : (selectedMember ? selectedMember.name : 'Guest');
      const chosenMemberId = sessionMemberId === 'GUEST' ? null : sessionMemberId;
      onSave(table.id, originalDate.getTime(), chosenPlayerName, chosenMemberId);
    } else {
      onSave(table.id, originalDate.getTime());
    }
    
    onClose();
  };

  // Render hand on the analog clock face
  const activePosition = activeTab === 'HOURS' 
    ? getCoordinates(selHour, 12) 
    : getCoordinates(selMinute, 60);

  return (
    <AnimatePresence>
      {isOpen && table && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-obsidian-900 border border-white/10 w-full max-w-sm rounded-2xl relative z-10 p-6 md:p-8 shadow-2xl text-white"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyber-lime/10 border border-cyber-lime/10 flex items-center justify-center text-cyber-lime">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white">
                    {table.status === 'RUNNING' ? 'Start Time Adjustment' : 'Set Start Time & Start'}
                  </h2>
                  <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">{table.number}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-on-surface-variant"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Optional Player / Member Selection (only if starting the table session) */}
              {table.status !== 'RUNNING' && (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={12} className="text-cyber-lime" />
                    <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Assign Player / Member</span>
                  </div>
                  <div>
                    <select 
                      value={sessionMemberId}
                      onChange={(e) => {
                        setSessionMemberId(e.target.value);
                        if (e.target.value !== 'GUEST') {
                          const m = members.find(mem => mem.id === e.target.value);
                          setCustomPlayerName(m ? m.name : '');
                        } else {
                          setCustomPlayerName('');
                        }
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-lime/50 transition-all font-bold tracking-wide"
                    >
                      <option value="GUEST" className="bg-obsidian-900 text-white font-bold uppercase tracking-widest">GUEST / NON-MEMBER</option>
                      {members && members.map(m => (
                        <option key={m.id} value={m.id} className="bg-obsidian-900 text-white font-bold uppercase tracking-widest">{m.name} ({m.contact})</option>
                      ))}
                    </select>
                  </div>
                  {sessionMemberId === 'GUEST' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Enter Player/Group Name..."
                        value={customPlayerName}
                        onChange={(e) => setCustomPlayerName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-cyber-lime/50 transition-all"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Gorgeous Digital Display & Tweak Area */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-4">
                  {/* Hours controller */}
                  <div className="flex flex-col items-center">
                    <button 
                      type="button" 
                      onClick={incrementHour}
                      className="p-1 hover:text-cyber-lime text-on-surface-variant transition-colors"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('HOURS')}
                      className={`text-3xl font-mono font-extrabold px-3 py-1.5 rounded-lg transition-all ${activeTab === 'HOURS' ? 'text-cyber-lime bg-cyber-lime/10 shadow-[0_0_15px_rgba(202,255,0,0.15)]Scale-105' : 'text-on-surface-variant'}`}
                    >
                      {selHour.toString().padStart(2, '0')}
                    </button>
                    <button 
                      type="button" 
                      onClick={decrementHour}
                      className="p-1 hover:text-cyber-lime text-on-surface-variant transition-colors"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  <span className="text-3xl font-mono text-on-surface-variant/50 font-bold">:</span>

                  {/* Minutes controller */}
                  <div className="flex flex-col items-center">
                    <button 
                      type="button" 
                      onClick={incrementMinute}
                      className="p-1 hover:text-cyber-lime text-on-surface-variant transition-colors"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('MINUTES')}
                      className={`text-3xl font-mono font-extrabold px-3 py-1.5 rounded-lg transition-all ${activeTab === 'MINUTES' ? 'text-cyber-lime bg-cyber-lime/10 shadow-[0_0_15px_rgba(202,255,0,0.15)]Scale-105' : 'text-on-surface-variant'}`}
                    >
                      {selMinute.toString().padStart(2, '0')}
                    </button>
                    <button 
                      type="button" 
                      onClick={decrementMinute}
                      className="p-1 hover:text-cyber-lime text-on-surface-variant transition-colors"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* AM/PM toggle */}
                  <div className="flex flex-col gap-1 pl-2">
                    <button
                      type="button"
                      onClick={() => setSelAmPm('AM')}
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold rounded-md border transition-all ${selAmPm === 'AM' ? 'bg-cyber-lime text-black border-cyber-lime font-extrabold' : 'border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelAmPm('PM')}
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold rounded-md border transition-all ${selAmPm === 'PM' ? 'bg-cyber-lime text-black border-cyber-lime font-extrabold' : 'border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                    >
                      PM
                    </button>
                  </div>
                </div>
                
                {/* Active selection helper line */}
                <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest mt-2 mt-4 text-center">
                  Editing: <span className="text-cyber-lime font-extrabold">{activeTab}</span>
                </p>
              </div>

              {/* Classic Clock Face Interactive Dial */}
              <div className="flex justify-center py-2">
                <div className="relative w-48 h-48 rounded-full bg-black/40 border border-white/5 shadow-inner flex items-center justify-center">
                  {/* Center Dot */}
                  <div className="absolute w-2 h-2 rounded-full bg-cyber-lime z-20" />

                  {/* Clock Hand Pointer SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 192 192">
                    <line 
                      x1="96" 
                      y1="96" 
                      x2={96 + activePosition.x} 
                      y2={96 + activePosition.y} 
                      stroke="#9eff00" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                    <circle 
                      cx={96 + activePosition.x} 
                      cy={96 + activePosition.y} 
                      r="14" 
                      fill="rgba(158, 255, 0, 0.15)"
                      stroke="#9eff00"
                      strokeWidth="1.5"
                    />
                  </svg>

                  {/* Hours Face (1 - 12) */}
                  {activeTab === 'HOURS' && [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                    const coords = getCoordinates(h, 12);
                    const isSelected = selHour === h;
                    return (
                      <button
                        key={`hour-${h}`}
                        type="button"
                        onClick={() => handleHourClick(h)}
                        style={{
                          transform: `translate(${coords.x}px, ${coords.y}px)`,
                        }}
                        className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all hover:scale-110 active:scale-95 ${isSelected ? 'text-black bg-cyber-lime font-extrabold scale-110 z-10 shadow-[0_0_10px_rgba(158,255,0,0.4)]' : 'text-on-surface hover:text-white hover:bg-white/5'}`}
                      >
                        {h}
                      </button>
                    );
                  })}

                  {/* Minutes Face (00, 05, 10, ..., 55) */}
                  {activeTab === 'MINUTES' && [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                    const coords = getCoordinates(m, 60);
                    const isSelected = selMinute === m;
                    return (
                      <button
                        key={`minute-${m}`}
                        type="button"
                        onClick={() => handleMinuteClick(m)}
                        style={{
                          transform: `translate(${coords.x}px, ${coords.y}px)`,
                        }}
                        className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all hover:scale-110 active:scale-95 ${isSelected ? 'text-black bg-cyber-lime font-extrabold scale-110 z-10 shadow-[0_0_10px_rgba(158,255,0,0.4)]' : 'text-on-surface hover:text-white hover:bg-white/5'}`}
                      >
                        {m.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode Toggle Bar */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('HOURS')}
                  className={`py-2 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'HOURS' ? 'bg-white/10 text-white font-extrabold' : 'text-on-surface-variant hover:text-white'}`}
                >
                  Adjust Hours
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MINUTES')}
                  className={`py-2 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'MINUTES' ? 'bg-white/10 text-white font-extrabold' : 'text-on-surface-variant hover:text-white'}`}
                >
                  Adjust Minutes
                </button>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10 transition-all rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest bg-cyber-lime text-black hover:bg-cyber-lime/90 transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)] flex items-center justify-center gap-1.5 rounded-xl"
                >
                  {table.status !== 'RUNNING' ? (
                    <>
                      <Play size={14} />
                      Start
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Change Time
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
