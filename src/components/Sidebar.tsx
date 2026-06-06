import { LayoutDashboard, Users, CreditCard, Utensils, BarChart3, HelpCircle, History, X, TrendingDown, Settings, LogOut, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminRole, AdminAccount } from '../types';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: LayoutDashboard, label: 'Tables', domain: 'SNOOKER', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: Calendar, label: 'Bookings', domain: 'SNOOKER', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: AlertTriangle, label: 'Pending Bills', domain: 'SNOOKER', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: Users, label: 'Members', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: CreditCard, label: 'Billing', domain: 'SNOOKER', hidden: true, roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: Utensils, label: 'Cafe', domain: 'CAFE', roles: ['admin', 'admin2', 'admin3'] },
  { icon: CreditCard, label: 'Bills', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: BarChart3, label: 'Reports', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: BarChart3, label: 'Analytics', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: History, label: 'Billing History', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: TrendingDown, label: 'Expenditure', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
  { icon: ShieldCheck, label: 'Admin Management', domain: 'BOTH', roles: ['super_admin', 'owner'] },
  { icon: Settings, label: 'Settings', domain: 'BOTH', roles: ['admin', 'admin1', 'admin2', 'admin3'] },
];

interface SidebarProps {
  currentView: string;
  onToggleView: (view: any) => void;
  isOpen: boolean;
  onClose: () => void;
  role: AdminRole;
  permissions: AdminAccount['permissions'];
  subscriptionPlan?: 'cafe_only' | 'snooker_only' | 'full';
}

export default function Sidebar({ currentView, onToggleView, isOpen, onClose, role, permissions, subscriptionPlan = 'full' }: SidebarProps) {
  const visibleNavItems = navItems.filter(item => {
    const isRoleAllowed = item.label === 'Admin Management'
      ? item.roles.includes(role)
      : (role === 'super_admin' || role === 'owner' || role === 'club_admin' || item.roles.includes(role));
    const isDomainAllowed = permissions === 'BOTH' || item.domain === 'BOTH' || item.domain === permissions;

    // Subscription Feature Gating Check
    if (subscriptionPlan === 'cafe_only') {
      const allowedViews = ['Dashboard', 'Members', 'Cafe', 'Bills', 'Expenditure', 'Reports', 'Settings', 'Billing'];
      if (!allowedViews.includes(item.label)) return false;
    } else if (subscriptionPlan === 'snooker_only') {
      const allowedViews = [
        'Dashboard', 
        'Tables', 
        'Bookings', 
        'Pending Bills', 
        'Members', 
        'Bills', 
        'Billing History', 
        'Expenditure', 
        'Reports', 
        'Settings',
        'Billing'
      ];
      if (!allowedViews.includes(item.label)) return false;
    } else {
      // FULL plan or default: show standard items (Hide Standalone Menu, Bills, and Reports - show Analytics instead)
      const allowedViews = ['Tables', 'Bookings', 'Pending Bills', 'Members', 'Billing History', 'Expenditure', 'Cafe', 'Analytics', 'Settings'];
      if (!allowedViews.includes(item.label)) return false;
    }

    return (!item.hidden || currentView === item.label) && isRoleAllowed && isDomainAllowed;
  });

  const userName = role.toUpperCase();
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside 
        className={`fixed left-0 top-0 h-screen w-64 bg-surface border-r border-outline/20 flex flex-col p-6 z-[100] transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-neon-blue-glow font-sans">COMMAND</h1>
            <p className="font-mono text-[10px] text-neon-blue/60 uppercase tracking-widest">{permissions === 'CAFE' ? 'CAFE_POS' : 'CUE_CONTROL'} ACTIVE</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-on-surface/5 rounded-full transition-all text-on-surface lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

      <nav className="flex-1 space-y-2">
        {visibleNavItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onToggleView(item.label as any)}
            className={`w-full flex items-center gap-4 px-4 py-3 border-l-4 transition-all duration-300 group ${
              currentView === item.label 
                ? 'bg-neon-blue/10 text-neon-blue border-neon-blue shadow-[0_0_15px_rgba(0,219,233,0.1)]' 
                : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-on-surface/5 hover:translate-x-1'
            }`}
          >
            <item.icon size={18} className={currentView === item.label ? 'text-neon-blue' : 'group-hover:text-neon-blue/80'} />
            <span className="font-mono text-sm uppercase tracking-wider">
              {item.label === 'Tables' && permissions === 'CAFE' ? 'Active Bills' : item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="pt-4 mt-auto space-y-6">
        <div className="pt-6 border-t border-outline/20 space-y-3">
          <button className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-on-surface text-xs font-mono uppercase transition-colors">
            <HelpCircle size={14} />
            <span>Support</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-on-surface text-xs font-mono uppercase transition-colors">
            <History size={14} />
            <span>Logs</span>
          </button>
          
          <div className="flex items-center gap-3 px-4 py-3 mt-4 bg-on-surface/5 rounded-lg border border-outline/20">
            <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border border-outline/20 shrink-0">
               <div className="w-full h-full bg-gradient-to-br from-neon-blue/20 to-cyber-lime/20" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-on-surface truncate">{userName}</p>
              <p className="text-[8px] text-neon-blue/60 uppercase tracking-tighter">
                {role === 'super_admin' ? 'Super Overseer' : role === 'owner' ? 'SaaS Owner' : role === 'club_admin' ? 'Club Administrator' : role === 'admin3' ? 'System Overseer' : role === 'admin' ? 'Root Access' : 'Limited Access Node'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </>
);
}
