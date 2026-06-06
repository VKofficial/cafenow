import React, { useState } from 'react';
import { User, Clock, AlertTriangle, Calendar, Plus, ExternalLink, Pause, Play, ShoppingBag, Check, X, Pencil, Trash2, Coffee } from 'lucide-react';
import { motion } from 'motion/react';
import { SnookerTable, Member, HappyHourSettings, Booking, AdminRole } from '../types';
import { Zap } from 'lucide-react';

interface TableCardProps {
  table: SnookerTable;
  bookings?: Booking[];
  hhSettings?: HappyHourSettings | null;
  onEndSession?: (table: SnookerTable) => void;
  onStartSession?: (table: SnookerTable, playerName: string, memberId: string | null) => void;
  onReserve?: (table: SnookerTable) => void;
  onOpenCafe?: (table: SnookerTable) => void;
  onTogglePause?: (table: SnookerTable) => void;
  onSetTime?: (table: SnookerTable) => void;
  onUpdateNote?: (tableId: string, note: string) => void;
  onAssignMember?: (table: SnookerTable) => void;
  onSetAvailable?: (table: SnookerTable) => void;
  onQuickCheckout?: (table: SnookerTable) => void;
  onEditTable?: (table: SnookerTable) => void;
  onDeleteTable?: (table: SnookerTable) => void;
  onToggleMaintenance?: (table: SnookerTable) => void;
  members: Member[];
  role?: AdminRole;
  permissions?: 'CAFE' | 'SNOOKER' | 'BOTH';
  key?: string | number;
  pendingBillsCount?: number;
  onRedirectToPendingBills?: () => void;
  subscriptionPlan?: 'cafe_only' | 'snooker_only' | 'full';
}

export default function TableCard({
  table,
  bookings = [],
  hhSettings,
  onEndSession,
  onStartSession,
  onReserve,
  onOpenCafe,
  onTogglePause,
  onSetTime,
  onUpdateNote,
  onAssignMember,
  onSetAvailable,
  onQuickCheckout,
  onEditTable,
  onDeleteTable,
  onToggleMaintenance,
  members,
  role,
  permissions,
  pendingBillsCount = 0,
  onRedirectToPendingBills,
  subscriptionPlan = 'full'
}: TableCardProps) {
  const [confirmAction, setConfirmAction] = useState<'START' | 'END' | 'AVAILABLE' | 'QUICK' | null>(null);
  const [sessionMemberId, setSessionMemberId] = useState<string>('GUEST');
  const isRunning = table.status === 'RUNNING';
  const isAvailable = table.status === 'AVAILABLE' || table.status === 'RESERVED';
  const isMaintenance = table.status === 'MAINTENANCE';
  const isReserved = table.status === 'RESERVED';
  const finalPermissions = permissions || (role === 'admin2' ? 'CAFE' : role === 'admin1' ? 'SNOOKER' : 'BOTH');
  const isAdmin2 = finalPermissions === 'CAFE';

  const [pressTimer, setPressTimer] = useState<any>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('input') || 
      target.closest('option') || 
      target.closest('a')
    ) {
      return;
    }

    if (isRunning) return;

    setIsPressing(true);
    setLongPressActive(false);

    const timer = setTimeout(() => {
      onToggleMaintenance?.(table);
      setLongPressActive(true);
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(80);
      }
    }, 800);
    setPressTimer(timer);
  };

  const endPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setIsPressing(false);
    if (longPressActive) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setIsPressing(false);
  };

  const confirmedBookingsForTable = (bookings || []).filter(
    b => b.tableId === table.id && b.status === "CONFIRMED"
  );

  const formatPausedTime = () => {
    const now = Date.now();
    const totalPaused = table.totalPausedSeconds || 0;
    const currentPauseSession = (table.isPaused && table.pauseStartTimeUnix) 
      ? Math.floor((now - table.pauseStartTimeUnix) / 1000) 
      : 0;
    
    const seconds = totalPaused + currentPauseSession;
    if (seconds <= 0) return null;

    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const pausedTimeDisplay = formatPausedTime();

  const handleEndSessionClick = () => {
    setConfirmAction('END');
  };

  const handleQuickCheckoutClick = () => {
    setConfirmAction('QUICK');
  };

  const handleStartSessionClick = () => {
    setConfirmAction('START');
  };

  const handleSetAvailableClick = () => {
    setConfirmAction('AVAILABLE');
  };

  const cancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction(null);
  };

  const proceedConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmAction === 'START') {
      const member = members.find(m => m.id === sessionMemberId);
      onStartSession?.(table, member ? member.name : 'Guest', member ? member.id : null);
    }
    if (confirmAction === 'END') onEndSession?.(table);
    if (confirmAction === 'AVAILABLE') onSetAvailable?.(table);
    if (confirmAction === 'QUICK') onQuickCheckout?.(table);
    setConfirmAction(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isPressing ? 0.98 : 1
      }}
      whileHover={{ y: isPressing ? 0 : -4 }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      onContextMenu={(e) => {
        if (longPressActive || isPressing) {
          e.preventDefault();
        }
      }}
      className={`glass-technical p-6 flex flex-col gap-5 relative group transition-all duration-300 select-none ${
        isRunning ? (table.isPaused ? 'animate-breathing-amber' : 'animate-breathing-lime') : 
        isMaintenance ? 'border-pulse-red/30 glow-red' : 
        isReserved ? 'border-neon-blue/30 glow-blue' : 'border-outline/20'
      } ${!isRunning ? 'cursor-grab active:cursor-grabbing hover:shadow-[0_0_15px_rgba(255,255,255,0.02)]' : ''}`}
    >
      {isPressing && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.8, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-1 rounded-b-xl z-50 ${
            isMaintenance 
              ? 'bg-gradient-to-r from-neon-blue to-cyber-lime shadow-[0_0_10px_#bcff5f]' 
              : 'bg-gradient-to-r from-pulse-red to-orange-500 shadow-[0_0_10px_#ffb4ab]'
          }`}
        />
      )}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          {(isRunning || isAvailable) && !isAdmin2 && (
            <button 
              onClick={() => onSetTime?.(table)}
              className="mt-1 p-2 bg-on-surface/5 border border-outline/20 rounded-lg hover:border-cyber-lime/30 hover:text-cyber-lime transition-all group/btn text-on-surface"
              title={isAvailable ? "Set Custom Start Time & Start" : "Set Timer"}
            >
              <Clock size={14} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          )}
          <div>
            <span className={`font-mono text-[10px] px-2 py-0.5 font-bold tracking-widest ${
              isRunning ? (table.isPaused ? 'bg-amber-500/10 text-amber-500' : 'bg-cyber-lime/10 text-cyber-lime') : 
              isMaintenance ? 'bg-pulse-red/10 text-pulse-red' :
              isReserved ? 'bg-neon-blue/10 text-neon-blue' : 'bg-on-surface/5 text-on-surface-variant'
            }`}>
              {table.isPaused ? 'PAUSED' : isAdmin2 && isRunning ? 'BILL OPEN' : table.status}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <h3 className="text-xl font-bold font-sans tracking-tight text-on-surface">
                {isAdmin2 ? `Bill No. ${table.billNumber || table.number}` : `${table.number}`}
              </h3>
              {pendingBillsCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRedirectToPendingBills?.();
                  }}
                  className="flex items-center gap-1 bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-black rounded border border-amber-500/35 hover:border-amber-400 px-1.5 py-0.5 animate-pulse transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  title={`${pendingBillsCount} Pending Bill(s) - Click to view`}
                >
                  <AlertTriangle size={11} className="stroke-[3]" />
                  <span className="text-[10px] font-bold font-mono">{pendingBillsCount}</span>
                </button>
              )}
            </div>
            {!isAdmin2 && <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">{table.type}</p>}
            {hhSettings?.isEnabled && (
              <div className="flex items-center gap-1 mt-1 text-cyber-lime">
                <Zap size={10} className="fill-current" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest">Happy Hour Active</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning && finalPermissions !== 'SNOOKER' && subscriptionPlan !== 'snooker_only' ? (
            <button 
              onClick={() => onOpenCafe?.(table)}
              className="p-2 bg-on-surface/5 border border-outline/20 rounded-lg hover:border-cyber-lime/30 hover:text-cyber-lime transition-all group/btn text-on-surface cursor-pointer"
              title="Open Cafe Menu"
            >
              <Coffee size={14} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          ) : !isRunning ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => onEditTable?.(table)}
                className="p-1.5 bg-on-surface/5 border border-outline/20 rounded-lg hover:border-neon-blue/40 hover:text-neon-blue transition-all group/btn text-on-surface-variant hover:text-on-surface cursor-pointer"
                title="Edit Table"
              >
                <Pencil size={12} className="group-hover/btn:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => onDeleteTable?.(table)}
                className="p-1.5 bg-on-surface/5 border border-outline/20 rounded-lg hover:border-pulse-red/40 hover:text-pulse-red transition-all group/btn text-on-surface-variant hover:text-pulse-red/80 cursor-pointer"
                title="Delete Table"
              >
                <Trash2 size={12} className="group-hover/btn:scale-110 transition-transform" />
              </button>
            </div>
          ) : null}
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? (table.isPaused ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-cyber-lime shadow-[0_0_8px_#bcff5f]') : 
            isMaintenance ? 'bg-pulse-red pulse-lime shadow-[0_0_8px_#ffb4ab]' :
            isReserved ? 'bg-neon-blue shadow-[0_0_8px_#00dbe9]' : 'bg-surface-variant'
          }`} />
        </div>
      </div>

      <div className={`py-6 border-y border-outline/20 flex flex-col items-center justify-center min-h-[120px] ${
        isAvailable ? 'bg-gradient-to-b from-transparent to-on-surface/[0.02]' : ''
      }`}>
        {isRunning ? (
          <>
            {table.startTime && (
              <div className="flex items-center gap-1.5 mb-2 text-on-surface-variant font-mono text-[9px] uppercase tracking-widest">
                <Clock size={10} /> {isAdmin2 ? 'Opened at' : 'Started at'}: {table.startTime}
              </div>
            )}
            
            {!isAdmin2 && (
              <span className={`font-mono text-3xl font-bold tracking-tighter ${table.isPaused ? 'text-amber-500/50 animate-pulse' : 'text-neon-blue-glow'}`}>
                {table.elapsedTime}
              </span>
            )}

            <div className={`flex flex-col items-center ${isAdmin2 ? 'mt-0' : 'mt-1'}`}>
              <span className="font-mono text-lg font-bold text-cyber-lime glow-lime-sm">
                ₹{(isAdmin2 ? (table.cost || 0) : (table.sessionCost !== undefined ? table.sessionCost : ((table.cost || 0) - (table.cafeCost || 0)))).toFixed(2)}
              </span>
              <span className="font-mono text-[8px] text-cyber-lime/40 uppercase tracking-[0.2em] -mt-1">{isAdmin2 ? 'Total Payable' : 'Session Cost'}</span>
            </div>
            <div className="flex flex-col items-center gap-3 mt-3 text-on-surface-variant w-full">
              <div className="flex flex-col items-center gap-1.5 group/player relative w-full px-2">
                <div className="flex items-center justify-center gap-1 text-on-surface-variant/70">
                  <button 
                    onClick={() => onAssignMember?.(table)}
                    className="p-1 hover:bg-neon-blue/15 rounded transition-all text-on-surface-variant hover:text-neon-blue flex items-center gap-1 shadow-sm border border-outline/5 hover:border-neon-blue/20 bg-on-surface/5"
                    title="Assign Members"
                  >
                    <User size={12} />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Assign Members</span>
                  </button>
                </div>
                <div className="font-mono text-xs uppercase tracking-widest text-on-surface flex flex-wrap gap-1.5 items-center justify-center max-w-full py-1">
                  {(() => {
                    const names = (table.player || '').split(',').map(s => s.trim()).filter(Boolean);
                    if (names.length === 0 || (names.length === 1 && names[0].toLowerCase() === 'guest')) {
                      return <span className="text-on-surface-variant/40 text-[10px]">GUEST</span>;
                    }
                    return names.map((name, idx) => (
                      <span key={idx} className="bg-neon-blue/10 text-neon-blue px-2 py-0.5 rounded border border-neon-blue/20 text-[9px] font-bold tracking-normal shrink-0">
                        {name}
                      </span>
                    ));
                  })()}
                  {!isAdmin2 && table.type === 'PS5' && table.playersCount && ` (${table.playersCount}P)`}
                </div>
              </div>
              
              <div className="w-full flex justify-center mt-1">
                <input
                  type="text"
                  placeholder="Add note..."
                  value={table.note || ''}
                  onChange={(e) => onUpdateNote?.(table.id, e.target.value)}
                  className="w-full max-w-[150px] bg-on-surface/5 border border-outline/15 rounded px-2.5 py-1 text-[10px] font-mono text-on-surface focus:outline-none focus:border-neon-blue/50 focus:bg-on-surface/10 transition-all text-center placeholder-on-surface-variant/30"
                />
              </div>

              {table.cafeCost !== undefined && table.cafeCost > 0 && subscriptionPlan !== 'snooker_only' && (
                <div className="font-mono text-[10px] text-cyber-lime uppercase tracking-widest bg-cyber-lime/5 px-2 py-0.5 rounded">
                  + Cafe: ₹{table.cafeCost.toFixed(2)}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
             {isMaintenance ? (
               <AlertTriangle size={32} className="text-pulse-red" />
             ) : isReserved ? (
               <Calendar size={32} className="text-neon-blue" />
             ) : (
               <Plus size={48} className="text-on-surface-variant opacity-40" />
             )}
             <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
               {isMaintenance ? 'Under Maintenance' : isReserved ? `Reserved: ${table.player}` : (isAdmin2 ? 'New Bill Slot' : 'Ready for Session')}
             </span>
             {isReserved && <p className="text-[9px] font-mono text-on-surface-variant/60 uppercase">{table.reservationTime}</p>}
          </div>
        )}

        {confirmedBookingsForTable.length > 0 && (
          <div className="w-full mt-4 px-3 py-2 bg-neon-blue/5 border border-neon-blue/15 rounded-lg text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-neon-blue mb-1">
              <Calendar size={11} className="animate-pulse" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest leading-none">Upcoming Bookings</span>
            </div>
            <div className="flex flex-col gap-1">
              {confirmedBookingsForTable.map(b => (
                <div key={b.id} className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/80 border-t border-white/5 pt-1 mt-0.5">
                  <span className="font-bold truncate max-w-[124px]">{b.playerName}</span>
                  <span className="text-cyber-lime font-bold">{b.startTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        {confirmAction && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
             <div 
               className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
               onClick={cancelConfirm}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="relative z-10 glass-technical p-6 rounded-xl border border-neon-blue/30 shadow-2xl text-center w-full"
             >
                <AlertTriangle size={24} className="mx-auto mb-3 text-neon-blue" />
                <h4 className="font-bold text-on-surface text-sm uppercase tracking-wider mb-2">
                  Confirm {confirmAction === 'START' ? (isAdmin2 ? 'OPEN BILL' : 'START') : 
                          confirmAction === 'QUICK' ? 'FAST SETTLE' : confirmAction}?
                </h4>
                <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest mb-6">
                  {confirmAction === 'START' && (isAdmin2 ? `Open bill for Bill No. ${table.number}?` : `Start session on ${table.number}?`)}
                  {confirmAction === 'END' && (isAdmin2 ? `Close and invoice Bill No. ${table.number}?` : `End session for ${table.number}?`)}
                  {confirmAction === 'AVAILABLE' && `Set ${table.number} available?`}
                  {confirmAction === 'QUICK' && `Settle Bill No. ${table.number} with CASH INSTANTLY?`}
                </p>

                {confirmAction === 'START' && (
                  <div className="mb-6 text-left">
                    <label className="block font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-2">Assign Player/Member</label>
                    <select 
                      value={sessionMemberId}
                      onChange={(e) => setSessionMemberId(e.target.value)}
                      className="w-full bg-on-surface/5 border border-outline/20 rounded px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-neon-blue/50 transition-all font-bold tracking-wide"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="GUEST" className="bg-obsidian-900 font-bold uppercase tracking-widest">GUEST / NON-MEMBER</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id} className="bg-obsidian-900 font-bold uppercase tracking-widest">{m.name} ({m.contact})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={cancelConfirm}
                     className="py-3 border border-outline/20 text-[10px] font-bold uppercase tracking-widest hover:bg-on-surface/5 transition-all text-on-surface cursor-pointer"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={proceedConfirm}
                     className="py-3 bg-neon-blue-glow text-on-primary text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-neon-blue/20 cursor-pointer"
                   >
                     Confirm
                   </button>
                </div>
             </motion.div>
          </div>
        )}

        {isRunning && pausedTimeDisplay && (
          <div className="flex justify-center items-center gap-2 text-[10px] font-mono text-amber-500 border-b border-outline/20 pb-2 mb-1 uppercase tracking-widest">
            <Clock size={12} /> Paused: {pausedTimeDisplay}
          </div>
        )}
        
        <div className="flex gap-2 w-full">
          {isRunning ? (
            <>
              {isAdmin2 ? (
                <>
                  <button 
                    onClick={handleQuickCheckoutClick}
                    className="flex-1 bg-cyber-lime text-black py-3 font-bold text-[10px] tracking-widest uppercase hover:shadow-[0_0_20px_rgba(188,255,95,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={14} /> Fast Settle
                  </button>
                  <button 
                    onClick={handleEndSessionClick}
                    className="flex-1 border border-pulse-red text-pulse-red py-3 font-bold text-[10px] tracking-widest uppercase hover:bg-pulse-red/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag size={14} /> Invoice
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest leading-none mb-1">Total Bill</span>
                    <span className="text-xl font-bold text-cyber-lime font-mono leading-none">₹{(table.cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onTogglePause?.(table)}
                      className={`p-2 border transition-all cursor-pointer ${
                        table.isPaused 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                          : 'bg-on-surface/5 border-outline/20 text-on-surface-variant hover:border-neon-blue hover:text-neon-blue'
                      }`}
                    >
                      {table.isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                    </button>
                    <button 
                      onClick={handleEndSessionClick}
                      className="bg-pulse-red-deep text-on-primary px-4 py-2 font-bold text-[10px] tracking-widest uppercase hover:opacity-80 transition-all shadow-lg cursor-pointer"
                    >
                      Checkout
                    </button>
                  </div>
                </>
              )}
            </>
          ) : isAvailable ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 w-full">
                <button 
                  onClick={handleStartSessionClick}
                  className="flex-1 bg-neon-blue-glow text-on-primary py-3 font-bold text-[10px] tracking-[0.15em] uppercase shadow-lg transition-all hover:translate-y-[-1px] cursor-pointer"
                >
                  {isAdmin2 ? 'Open Bill' : 'Start'}
                </button>
                {!isAdmin2 && (
                  <button 
                    onClick={() => onReserve?.(table)}
                    className="flex-1 border border-neon-blue/30 text-neon-blue py-3 font-bold text-[10px] tracking-[0.15em] uppercase hover:bg-neon-blue/10 transition-all cursor-pointer"
                  >
                    Book
                  </button>
                )}
              </div>
            </div>
          ) : isMaintenance ? (
            <button 
              onClick={handleSetAvailableClick}
              className="w-full border border-outline/20 text-on-surface-variant py-3 font-bold text-[10px] tracking-widest uppercase hover:bg-on-surface/5 transition-all cursor-pointer"
            >
              Set Available
            </button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <button 
                onClick={handleStartSessionClick}
                className="w-full bg-neon-blue-glow text-on-primary py-3 font-bold text-[10px] tracking-widest uppercase shadow-lg transition-all cursor-pointer"
              >
                {isAdmin2 ? 'New Bill' : 'Check In'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
