import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Club, UserProfile } from '../types';
import { ShieldAlert, Users, Plus, ShieldCheck, Mail, Lock, Layers, Landmark, Power, Compass, ArrowRight, Zap, Ban, RefreshCw, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SaaSProps {
  userRole: 'super_admin' | 'owner';
  activeAdminUsername: string;
  onEnterClub: (clubId: string, clubName: string) => void;
  onLogout: () => void;
}

export default function SaaSDashboards({ userRole, activeAdminUsername, onEnterClub, onLogout }: SaaSProps) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Owner fields
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  
  // New Club fields
  const [newClubName, setNewClubName] = useState('');
  const [newClubOwnerId, setNewClubOwnerId] = useState('');
  const [newClubSubscriptionPlan, setNewClubSubscriptionPlan] = useState<'cafe_only' | 'snooker_only' | 'full'>('full');

  // New Club Admin fields
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminClubId, setNewAdminClubId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allClubs = await supabaseService.getClubs();
      const allProfiles = await supabaseService.getProfiles();
      setClubs(allClubs);
      setProfiles(allProfiles);
    } catch (err) {
      console.error('Error loading SaaS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!newOwnerEmail || !newOwnerPassword) {
      setMessage({ text: 'Please fill in all owner fields.', type: 'error' });
      return;
    }
    try {
      await supabaseService.createOwnerAccount(newOwnerEmail, newOwnerPassword);
      setMessage({ text: `Owner account provisioned successfully: ${newOwnerEmail}`, type: 'success' });
      setNewOwnerEmail('');
      setNewOwnerPassword('');
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error occurred while creating owner account', type: 'error' });
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!newClubName || !newAdminEmail || !newAdminPassword) {
      setMessage({ text: 'Please fill out all fields, including Administrator Email and Password.', type: 'error' });
      return;
    }
    try {
      const ownerId = userRole === 'owner' ? undefined : newClubOwnerId || undefined;
      await supabaseService.createClubAndAdmin(
        newClubName,
        newClubSubscriptionPlan,
        newAdminEmail,
        newAdminPassword,
        ownerId
      );
      setMessage({ text: `Club "${newClubName}" and administrator "${newAdminEmail}" provisioned successfully!`, type: 'success' });
      setNewClubName('');
      setNewClubOwnerId('');
      setNewClubSubscriptionPlan('full');
      setNewAdminEmail('');
      setNewAdminPassword('');
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error occurred while establishing club tenant', type: 'error' });
    }
  };

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    clubId: string;
    clubName: string;
    status: 'active' | 'suspended' | 'pending_deletion' | 'deleted';
    title: string;
    message: string;
  } | null>(null);

  const triggerConfirmSubscriptionStatus = (
    clubId: string,
    clubName: string,
    status: 'active' | 'suspended' | 'pending_deletion' | 'deleted'
  ) => {
    let title = '';
    let message = '';
    if (status === 'active') {
      title = 'Reactivate Club Tenant';
      message = `Are you sure you want to reactivate the subscription for the club "${clubName}"? All administrators and operators will regain full operations access immediately.`;
    } else if (status === 'suspended') {
      title = 'Suspend Club Tenant';
      message = `Are you sure you want to suspend the subscription for "${clubName}"? Active sessions will be automatically terminated, and login permissions revoked immediately.`;
    } else if (status === 'pending_deletion') {
      title = 'Schedule Deletion (Level 2 Safeguard)';
      message = `Are you sure you want to schedule "${clubName}" for deletion? The club is hidden from standard dashboards, access is immediately blocked, but data remains intact temporarily.`;
    } else if (status === 'deleted') {
      title = 'PERMANENT DATA PURGE (UNRECOVERABLE)';
      message = `ARE YOU ABSOLUTELY SURE? You are about to permanently decommission "${clubName}" and purge all related tables, member accounts, bookings, invoices, and configurations from the database. This action is irreversible.`;
    }

    setConfirmModal({
      clubId,
      clubName,
      status,
      title,
      message,
    });
  };

  const handleUpdateSubscriptionStatus = async (clubId: string, status: 'active' | 'suspended' | 'pending_deletion' | 'deleted') => {
    setMessage(null);
    try {
      await supabaseService.updateClubSubscription(clubId, status);
      setMessage({ text: `Club subscription status successfully set to: ${status.toUpperCase()}!`, type: 'success' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update subscription', type: 'error' });
    } finally {
      setConfirmModal(null);
    }
  };

  // Derived filter variables
  const ownersProfiles = profiles.filter(p => p.role === 'owner');
  const activeClubsCount = clubs.filter(c => c.subscription_status === 'active').length;
  const suspendedClubsCount = clubs.filter(c => c.subscription_status === 'suspended').length;

  return (
    <div className="min-h-screen bg-background text-on-surface p-8 max-w-7xl mx-auto flex flex-col gap-8 relative select-none">
      {/* Mesh Background Accent */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-neon-blue/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyber-lime/5 blur-[150px] pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-outline/20 pb-8 relative z-10">
        <div>
          <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-full font-mono text-[9px] uppercase tracking-widest font-bold">
            MASTER SaaS COMMAND
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mt-3 flex items-center gap-3">
            Cue Control SaaS <span className="text-neon-blue font-light">Engine</span>
          </h1>
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-widest mt-1">
            Role: {userRole.replace('_', ' ').toUpperCase()} • Active: {activeAdminUsername}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            title="Refresh System State"
            className="p-3 bg-on-surface/5 hover:bg-on-surface/10 border border-outline/25 rounded-xl transition-all text-on-surface"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={onLogout}
            className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-pulse-red border border-red-500/25 rounded-xl text-xs font-bold font-mono tracking-widest uppercase transition-all"
          >
            Logout session
          </button>
        </div>
      </div>

      {/* System Toast State feedback */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl border font-mono text-xs tracking-wider flex items-center gap-3 relative z-20 ${
              message.type === 'success' ? 'bg-secondary/10 border-secondary/25 text-secondary' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <ShieldAlert size={16} />
            <span>{message.text.toUpperCase()}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Metrics Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="glass-technical p-6 rounded-xl border border-outline/20">
          <div className="text-on-surface-variant font-mono text-[10px] uppercase tracking-wider mb-2">Platform Clubs</div>
          <div className="text-3xl font-extrabold text-white">{clubs.length}</div>
          <div className="text-[10px] font-mono text-neon-blue mt-1">TOTAL CONNECTED INSTANCES</div>
        </div>
        <div className="glass-technical p-6 rounded-xl border border-outline/20">
          <div className="text-on-surface-variant font-mono text-[10px] uppercase tracking-wider mb-2">Active Subscriptions</div>
          <div className="text-3xl font-extrabold text-secondary">{activeClubsCount}</div>
          <div className="text-[10px] font-mono text-secondary mt-1">UNRESTRICTED ACCESS LIVE</div>
        </div>
        <div className="glass-technical p-6 rounded-xl border border-outline/20">
          <div className="text-on-surface-variant font-mono text-[10px] uppercase tracking-wider mb-2">Disabled Units</div>
          <div className="text-3xl font-extrabold text-red-400">{suspendedClubsCount}</div>
          <div className="text-[10px] font-mono text-red-400 mt-1">SUBSCRIPTION STOPPED</div>
        </div>
        <div className="glass-technical p-6 rounded-xl border border-outline/20">
          <div className="text-on-surface-variant font-mono text-[10px] uppercase tracking-wider mb-2">Owners Registered</div>
          <div className="text-3xl font-extrabold text-cyan-400">{ownersProfiles.length || 1}</div>
          <div className="text-[10px] font-mono text-cyan-400 mt-1">ROLE ISOLATED PROFILE HOLDER</div>
        </div>
      </div>

      {/* Primary Panels Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Left Columns - Tables List */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-technical p-6 rounded-xl border border-outline/20 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-4 border-b border-outline/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="text-neon-blue" size={18} /> Available Clubs & Tenants
              </h3>
              <span className="font-mono text-xs text-on-surface-variant">ACTIVE INJECTORS</span>
            </div>

            {loading ? (
              <div className="py-20 text-center font-mono text-xs text-on-surface-variant uppercase tracking-widest">
                Rebuilding SaaS Data matrix...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active and Suspended Tenants List */}
                <div className="space-y-4">
                  {clubs
                    .filter((club) => {
                      if (club.subscription_status === 'deleted') return false;
                      if (userRole === 'owner') {
                        // Hidden from primary owner dashboards except for dedicated management screens or sections
                        return club.subscription_status === 'active' || club.subscription_status === 'suspended';
                      }
                      return true; // Super admins see all including pending_deletion in main listing
                    })
                    .map((club) => {
                      const isSuspended = club.subscription_status === 'suspended';
                      const isPendingDeletion = club.subscription_status === 'pending_deletion';

                      return (
                        <div 
                          key={club.id}
                          className={`p-5 rounded-lg border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                            isPendingDeletion
                              ? 'border-red-500/30 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                              : isSuspended 
                                ? 'border-yellow-600/30 bg-yellow-900/5' 
                                : 'border-outline/10 hover:border-neon-blue/30 bg-on-surface/5'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-base text-white">{club.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase tracking-widest ${
                                isPendingDeletion
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : isSuspended 
                                    ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' 
                                    : 'bg-secondary/15 text-secondary border border-secondary/20'
                              }`}>
                                {club.subscription_status}
                              </span>
                              <span className="px-2 py-0.5 bg-neon-blue/10 text-cyan-400 border border-neon-blue/20 rounded text-[8px] font-bold font-mono uppercase tracking-widest">
                                {club.subscription_plan === 'cafe_only' ? 'Cafe Only' : club.subscription_plan === 'snooker_only' ? 'Snooker Only' : 'Full Suite'}
                              </span>
                            </div>
                            <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">
                              Club UUID: {club.id}
                            </p>
                            <p className="font-mono text-[9px] text-cyan-400 uppercase tracking-tight">
                              Owner Account ID: {club.owner_id || 'unassigned'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            {userRole === 'super_admin' && (
                              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-outline/10 mr-2">
                                {/* Reactivate Button */}
                                {(isSuspended || isPendingDeletion) && (
                                  <button
                                    onClick={() => triggerConfirmSubscriptionStatus(club.id, club.name, 'active')}
                                    className="p-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-md transition-all text-xs font-bold"
                                    title="Reactivate Club"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                )}
                                
                                {/* Suspend Button */}
                                {!isSuspended && !isPendingDeletion && (
                                  <button
                                    onClick={() => triggerConfirmSubscriptionStatus(club.id, club.name, 'suspended')}
                                    className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-md transition-all text-xs font-bold"
                                    title="Suspend Club"
                                  >
                                    <Ban size={14} />
                                  </button>
                                )}

                                {/* Mark for Deletion Button */}
                                {!isPendingDeletion && (
                                  <button
                                    onClick={() => triggerConfirmSubscriptionStatus(club.id, club.name, 'pending_deletion')}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-all text-xs font-bold"
                                    title="Schedule Deletion"
                                  >
                                    <AlertTriangle size={14} />
                                  </button>
                                )}

                                {/* Permanently Delete Button */}
                                {isPendingDeletion && (
                                  <button
                                    onClick={() => triggerConfirmSubscriptionStatus(club.id, club.name, 'deleted')}
                                    className="p-2 bg-red-650 hover:bg-red-700 text-white rounded-md transition-all text-xs font-bold shadow-[0_0_10px_rgba(220,38,38,0.3)] animate-pulse"
                                    title="PERMANENTLY PURGE DATA"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}

                            <button
                              onClick={() => onEnterClub(club.id, club.name)}
                              disabled={isSuspended || isPendingDeletion}
                              className={`w-full md:w-auto px-5 py-2.5 font-bold uppercase font-mono text-[10px] tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${
                                isSuspended || isPendingDeletion
                                  ? 'bg-on-surface/5 border border-outline/10 text-on-surface-variant/40 cursor-not-allowed'
                                  : 'bg-neon-blue text-on-primary shadow-lg shadow-neon-blue/20 hover:shadow-neon-blue/40'
                              }`}
                            >
                              Manage Club Operations <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Designated Owner-Only Management Section for Pending Deletions */}
                {userRole === 'owner' && clubs.some(c => c.subscription_status === 'pending_deletion') && (
                  <div className="mt-8 border-t border-red-500/20 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="text-red-400 animate-pulse" size={16} />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
                        PENDING DECOMMISSIONS (MANAGEMENT VIEW)
                      </h4>
                    </div>
                    
                    <div className="space-y-3">
                      {clubs
                        .filter(c => c.subscription_status === 'pending_deletion')
                        .map(club => (
                          <div 
                            key={club.id}
                            className="p-4 rounded-lg border border-red-500/20 bg-red-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                          >
                            <div>
                              <h5 className="font-bold text-sm text-white">{club.name}</h5>
                              <p className="text-[10px] text-red-300 uppercase font-mono mt-1">
                                Access Revoked • Marked for Deletion. Retained safely under security clearance.
                              </p>
                              <p className="font-mono text-[9px] text-on-surface-variant uppercase mt-1">
                                Club UUID: {club.id}
                              </p>
                            </div>
                            <div className="text-xs font-semibold text-on-surface-variant select-text bg-black/40 px-3 py-2 rounded-lg border border-outline/10">
                              Contact level 3 system admin to reactivate or cancel deletion flow.
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns - Form Controls */}
        <div className="flex flex-col gap-6">
          {/* Form 1: Super Admin actions */}
          {userRole === 'super_admin' && (
            <div className="glass-technical p-6 rounded-xl border border-outline/20 space-y-6">
              <div className="pb-3 border-b border-outline/10">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="text-cyan-400" size={16} /> Provision Partner Owner
                </h3>
                <p className="text-[10px] font-mono text-on-surface-variant uppercase mt-1">Level 2 SaaS Partner Account</p>
              </div>

              <form onSubmit={handleCreateOwner} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Partner Owner Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="email"
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      placeholder="owner@cuecontrol.com"
                      className="w-full bg-on-surface/5 border border-outline/25 rounded-lg pl-10 pr-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Access Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="password"
                      value={newOwnerPassword}
                      onChange={(e) => setNewOwnerPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-on-surface/5 border border-outline/25 rounded-lg pl-10 pr-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-on-primary font-bold text-[10px] font-mono tracking-widest uppercase transition-all rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Provision Owner Profile
                </button>
              </form>
            </div>
          )}

          {/* Unified Form: Provision Snooker Club Tenant & Administrator */}
          <div className="glass-technical p-6 rounded-xl border border-outline/20 space-y-6">
            <div className="pb-3 border-b border-outline/10">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Landmark className="text-secondary" size={16} /> Provision Club Tenant
              </h3>
              <p className="text-[10px] font-mono text-on-surface-variant uppercase mt-1">Tenant Registration & Operator Auth Setup</p>
            </div>

            <form onSubmit={handleCreateClub} className="space-y-4">
              <div className="space-y-1">
                <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Club Brand Name</label>
                <input 
                  type="text"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  placeholder="Relax Snooker Club"
                  className="w-full bg-on-surface/5 border border-outline/25 rounded-lg px-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Subscription Plan</label>
                <select
                  value={newClubSubscriptionPlan}
                  onChange={(e) => setNewClubSubscriptionPlan(e.target.value as any)}
                  className="w-full bg-on-surface/5 border border-outline/25 rounded-lg px-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface appearance-none"
                  required
                >
                  <option value="full">Full SaaS Suite (Snooker, Members, Cafe & Billing)</option>
                  <option value="snooker_only">Snooker Only (Tables, Bookings, Member Management)</option>
                  <option value="cafe_only">Cafe Only (Billing Systems, Custom Menu, Item Management)</option>
                </select>
              </div>

              {userRole === 'super_admin' && (
                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Assign Partner Owner</label>
                  <select
                    value={newClubOwnerId}
                    onChange={(e) => setNewClubOwnerId(e.target.value)}
                    className="w-full bg-on-surface/5 border border-outline/25 rounded-lg px-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-on-surface appearance-none"
                  >
                    <option value="">Unassigned (Super-Admin default)</option>
                    {ownersProfiles.map((p) => (
                      <option key={p.id} value={p.id}>Owner: {p.id.slice(0,8)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-outline/10 my-4 pt-4 space-y-4">
                <span className="font-mono text-[10px] text-purple-400 uppercase tracking-wider font-bold block">
                  Club Admin Login Credentials
                </span>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Operator Admin Email</label>
                  <input 
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="operator@cuecontrol.com"
                    className="w-full bg-on-surface/5 border border-outline/25 rounded-lg px-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Access Password</label>
                  <input 
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-on-surface/5 border border-outline/25 rounded-lg px-3 py-2.5 focus:border-neon-blue outline-none transition-all font-mono text-xs text-white"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-secondary hover:bg-secondary/90 text-on-primary font-bold text-[10px] font-mono tracking-widest uppercase transition-all rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Establish Club Tenant & Operator
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Custom SaaS Destination Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div id="saas-confirm-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-950 border border-outline/20 p-8 rounded-2xl shadow-2xl relative"
            >
              <div className="flex items-center gap-4 text-white mb-6">
                <div className={`p-3 rounded-lg ${
                  confirmModal.status === 'deleted' 
                    ? 'bg-red-500/10 text-red-500' 
                    : confirmModal.status === 'pending_deletion'
                      ? 'bg-red-500/10 text-red-400' 
                      : confirmModal.status === 'suspended'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-secondary/10 text-secondary'
                }`}>
                  {confirmModal.status === 'deleted' ? (
                    <Trash2 size={24} />
                  ) : confirmModal.status === 'pending_deletion' ? (
                    <AlertTriangle size={24} />
                  ) : confirmModal.status === 'suspended' ? (
                    <Ban size={24} />
                  ) : (
                    <RotateCcw size={24} />
                  )}
                </div>
                <div>
                  <h3 className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">SaaS Administrative Clearance</h3>
                  <h2 className="text-md font-bold text-white uppercase tracking-tight">{confirmModal.title}</h2>
                </div>
              </div>

              <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1 font-semibold">
                Target: {confirmModal.clubName}
              </p>
              <p className="text-sm text-on-surface-variant/85 mb-8 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 justify-end animate-in fade-in zoom-in-95 duration-200">
                <button
                  id="cancel-saas-btn"
                  onClick={() => setConfirmModal(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-colors text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-saas-btn"
                  onClick={() => handleUpdateSubscriptionStatus(confirmModal.clubId, confirmModal.status)}
                  className={`px-5 py-2.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    confirmModal.status === 'deleted'
                      ? 'bg-red-650 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                      : confirmModal.status === 'pending_deletion'
                        ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                        : confirmModal.status === 'suspended'
                          ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                          : 'bg-secondary hover:bg-secondary/95 text-on-primary'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
