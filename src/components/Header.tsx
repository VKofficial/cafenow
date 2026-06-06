import { Bell, Settings, Menu } from 'lucide-react';

import { AdminRole, AdminAccount } from '../types';

interface HeaderProps {
  liveRevenue: number;
  occupancy: number;
  activeCount: number;
  totalCount: number;
  role?: AdminRole;
  permissions?: AdminAccount['permissions'];
  onOpenSidebar?: () => void;
  subscriptionPlan?: 'cafe_only' | 'snooker_only' | 'full';
}

export default function Header({ liveRevenue, occupancy, activeCount, totalCount, role, permissions, onOpenSidebar, subscriptionPlan = 'full' }: HeaderProps) {
  const isCafeOnly = subscriptionPlan === 'cafe_only';
  
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline/20 px-4 lg:px-10 py-5 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 bg-on-surface/5 rounded-lg text-on-surface hover:text-neon-blue transition-all"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-xl lg:text-2xl font-black tracking-tighter text-neon-blue-glow font-sans">
          {permissions === 'CAFE' || isCafeOnly ? 'CAFE_POS' : 'CUE_CONTROL'}
        </h2>
      </div>
      
      <div className="flex items-center gap-4 lg:gap-12">
        <div className="hidden md:flex flex-col items-end">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Live Revenue</span>
          <span className="font-mono text-lg font-bold text-cyber-lime">₹{liveRevenue.toLocaleString()}</span>
        </div>
        
        {!isCafeOnly && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Occupancy</span>
            <span className="font-mono text-lg font-bold text-cyber-lime">{occupancy}%</span>
          </div>
        )}
        
        {!isCafeOnly && (
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Active Pool</span>
            <span className="font-mono text-lg font-bold text-cyber-lime">{activeCount}/{totalCount}</span>
          </div>
        )}

        <div className="hidden xs:block h-10 w-px bg-outline/20 mx-2" />

        <div className="flex gap-1 lg:gap-4">
          <button className="p-2 text-on-surface hover:text-neon-blue transition-colors">
            <Bell size={20} />
          </button>
          <button className="hidden xs:block p-2 text-on-surface hover:text-neon-blue transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
