import React from 'react';
import { SnookerTable, Member, HappyHourSettings, Booking, AdminRole, AdminAccount } from '../types';
import TableCard from './TableCard';

interface TableGridProps {
  tables: SnookerTable[];
  bookings?: Booking[];
  hhSettings?: HappyHourSettings | null;
  onEndSession: (table: SnookerTable) => void;
  onStartSession: (table: SnookerTable) => void;
  onReserve: (table: SnookerTable) => void;
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
  permissions?: AdminAccount['permissions'];
  pendingBillsCountMap?: Record<string, number>;
  onRedirectToPendingBills?: () => void;
  subscriptionPlan?: 'cafe_only' | 'snooker_only' | 'full';
}

export default function TableGrid({ tables, bookings = [], hhSettings, onEndSession, onStartSession, onReserve, onOpenCafe, onTogglePause, onSetTime, onUpdateNote, onAssignMember, onSetAvailable, onQuickCheckout, onEditTable, onDeleteTable, onToggleMaintenance, members, role, permissions, pendingBillsCountMap = {}, onRedirectToPendingBills, subscriptionPlan = 'full' }: TableGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter mb-20 px-4 lg:px-10">
      {tables.map((table) => (
        <TableCard 
          key={table.id} 
          table={table} 
          bookings={bookings}
          hhSettings={hhSettings}
          onEndSession={onEndSession} 
          onStartSession={onStartSession}
          onQuickCheckout={onQuickCheckout}
          onReserve={onReserve}
          onOpenCafe={onOpenCafe}
          onTogglePause={onTogglePause}
          onSetTime={onSetTime}
          onUpdateNote={onUpdateNote}
          onAssignMember={onAssignMember}
          onSetAvailable={onSetAvailable}
          onEditTable={onEditTable}
          onDeleteTable={onDeleteTable}
          onToggleMaintenance={onToggleMaintenance}
          members={members}
          role={role}
          permissions={permissions}
          pendingBillsCount={pendingBillsCountMap[table.id] || 0}
          onRedirectToPendingBills={onRedirectToPendingBills}
          subscriptionPlan={subscriptionPlan}
        />
      ))}
    </div>
  );
}
