/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { supabaseService } from "./services/supabaseService";
import Sidebar from "./components/Sidebar";
import CafeBillsView from "./components/CafeBillsView";
import Header from "./components/Header";
import LoginPage from "./components/LoginPage";
import TableGrid from "./components/TableGrid";
import SaaSDashboards from "./components/SaaSDashboards";
import ReserveTableModal from "./components/ReserveTableModal";
import TableCafeModal from "./components/TableCafeModal";
import AddTableModal from "./components/AddTableModal";
import CafeMenu from "./components/CanteenMenu";
import SetTimeModal from "./components/SetTimeModal";
import MembersView from "./components/MembersView";
import BillingHistoryView from "./components/BillingHistoryView";
import AssignMemberModal from "./components/AssignMemberModal";
import ExpenditureView from "./components/ExpenditureView";
import AnalyticsView from "./components/AnalyticsView";
import AdminManagement from "./components/AdminManagement";
import StartPS5Modal from "./components/StartPS5Modal";
import SettingsView from "./components/SettingsView";
import {
  SnookerTable,
  ClubStats,
  MenuItem,
  Member,
  Transaction,
  Expenditure,
  AdminRole,
  AdminAccount,
  HappyHourSettings,
  PendingBill,
  Booking,
} from "./types";
import PendingBillsView from "./components/PendingBillsView";
import BookingsView from "./components/BookingsView";
import {
  Plus,
  CreditCard,
  Banknote,
  QrCode,
  Menu,
  History,
  Minus,
  Calendar,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Helper to calculate split bill breakdown per person
export const calculateSplitBill = (table: SnookerTable, discountAmount: number = 0) => {
  const players = (table.player || '').split(',').map(s => s.trim()).filter(Boolean);
  const playerIds = (table.currentMemberId || '').split(',').map(s => s.trim()).filter(Boolean);
  
  const numPlayers = Math.max(1, players.length);
  const baseSessionCost = Number(table.sessionCost || 0);
  const baseCafeCost = Number(table.cafeCost || 0);
  
  const sessionCostPerPerson = baseSessionCost / numPlayers;
  
  const breakdowns = players.map((name, index) => ({
    name,
    memberId: playerIds[index] || null,
    sessionCost: sessionCostPerPerson,
    cafeCost: 0,
    items: [] as { name: string; price: number; quantity: number }[],
    discount: 0,
    total: 0
  }));

  if (breakdowns.length === 0) {
    breakdowns.push({
      name: 'Guest',
      memberId: null,
      sessionCost: baseSessionCost,
      cafeCost: baseCafeCost,
      items: (table.currentCart || []).map((ci: any) => ({
        name: ci.item?.name ?? ci.name ?? 'Unknown Item',
        price: Number(ci.item?.price ?? ci.price ?? 0),
        quantity: Number(ci.quantity ?? 1)
      })),
      discount: discountAmount,
      total: Math.max(0, (baseSessionCost + baseCafeCost) - discountAmount)
    });
    return breakdowns;
  }

  const cartItems = table.currentCart || [];
  let unassignedCafeCost = 0;
  const sharedItems: { name: string; price: number; quantity: number }[] = [];

  for (const ci of cartItems as any[]) {
    const itemName = ci.item?.name ?? ci.name ?? 'Unknown Item';
    const itemPrice = Number(ci.item?.price ?? ci.price ?? 0);
    const itemQty = Number(ci.quantity ?? 1);
    const itemTotal = itemPrice * itemQty;
    
    const assignedPlayerName = (ci as any).assignedToPlayerName;
    
    if (assignedPlayerName && assignedPlayerName !== 'All') {
      const bPlayer = breakdowns.find(b => b.name.toLowerCase() === assignedPlayerName.toLowerCase());
      if (bPlayer) {
        bPlayer.cafeCost += itemTotal;
        bPlayer.items.push({ name: itemName, price: itemPrice, quantity: itemQty });
      } else {
        unassignedCafeCost += itemTotal;
        sharedItems.push({ name: itemName, price: itemPrice, quantity: itemQty });
      }
    } else {
      unassignedCafeCost += itemTotal;
      sharedItems.push({ name: itemName, price: itemPrice, quantity: itemQty });
    }
  }

  const sharedCafeCostPerPerson = unassignedCafeCost / numPlayers;
  
  breakdowns.forEach(b => {
    b.cafeCost += sharedCafeCostPerPerson;
    sharedItems.forEach(item => {
      b.items.push({
        name: `${item.name} (Shared)`,
        price: item.price,
        quantity: item.quantity / numPlayers
      });
    });
  });

  const totalSubtotal = baseSessionCost + baseCafeCost;
  breakdowns.forEach(b => {
    const subtotal = b.sessionCost + b.cafeCost;
    const shareRatio = totalSubtotal > 0 ? (subtotal / totalSubtotal) : (1 / numPlayers);
    b.discount = discountAmount * shareRatio;
    b.total = Math.max(0, subtotal - b.discount);
  });

  return breakdowns;
};

export default function App() {
  const [activeClubId, setActiveClubId] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('active_club_id') || '') : '';
  });
  const [activeClubName, setActiveClubName] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('active_club_name') || '') : '';
  });
  const [activeClubPlan, setActiveClubPlan] = useState<'cafe_only' | 'snooker_only' | 'full'>('full');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<AdminRole>("admin");
  const [userPermissions, setUserPermissions] =
    useState<AdminAccount["permissions"]>("BOTH");
  const [currentView, setCurrentView] = useState<
    | "Tables"
    | "Bookings"
    | "Members"
    | "Billing"
    | "Cafe"
    | "Analytics"
    | "Billing History"
    | "Expenditure"
    | "Settings"
    | "Admin Management"
    | "Pending Bills"
    | "SaaS Dashboard"
  >("Tables");
  const [nextBillNumber, setNextBillNumber] = useState(1001);

  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [tables, setTables] = useState<SnookerTable[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [deletingMenuItemId, setDeletingMenuItemId] = useState<string | null>(null);
  const [menuCategories, setMenuCategories] = useState<string[]>([
    "Beverage",
    "Snack",
    "Dessert",
  ]);
  const [hhSettings, setHhSettings] = useState<HappyHourSettings | null>(null);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [isTenantLoading, setIsTenantLoading] = useState(false);

  const clearActiveTenantData = () => {
    setTables([]);
    setMembers([]);
    setBookings([]);
    setTransactions([]);
    setPendingBills([]);
    setExpenditures([]);
    setMenuItems([]);
    setIsTenantLoading(true);
  };

  const [notifications, setNotifications] = useState<{
    id: string;
    bookingId: string;
    message: string;
    tableNumber: string;
    playerName: string;
    startTime: string;
  }[]>([]);
  const notifiedBookingRef = useRef<Set<string>>(new Set());

  const loadMenuItems = async (): Promise<MenuItem[]> => {
    try {
      const fetchedItems = await supabaseService.getMenuItems();
      // If we got items from DB, use them.
      if (fetchedItems && fetchedItems.length > 0) {
        setMenuItems(fetchedItems);
        localStorage.setItem("cafe_initialized", "true");
        return fetchedItems;
      }

      // If DB returned empty list, check if we've ever initialized it
      const initialized = localStorage.getItem("cafe_initialized");
      if (initialized) {
        setMenuItems([]); // Truly empty
        return [];
      } else {
        // First time ever, use constants
        const { CAFE_MENU } = await import("./constants");
        setMenuItems(CAFE_MENU);
        return CAFE_MENU;
      }
    } catch (err) {
      console.error("Error loading menu items:", err);
      const { CAFE_MENU } = await import("./constants");
      setMenuItems(CAFE_MENU);
      return CAFE_MENU;
    }
  };

  const checkActiveClubStatus = async (): Promise<boolean> => {
    if (!activeClubId) return true;
    try {
      const clubsList = await supabaseService.getClubs().catch(() => []);
      const currentClub = clubsList.find((c: any) => c.id === activeClubId);
      if (currentClub) {
        const status = currentClub.subscription_status || 'active';
        if (status === 'suspended') {
          alert("Protected Operation Blocked: Subscription suspended. Contact support.");
          return false;
        }
        if (status === 'pending_deletion') {
          alert("Protected Operation Blocked: Club scheduled for deletion. Access revoked.");
          return false;
        }
        if (status === 'deleted') {
          alert("Protected Operation Blocked: The club has been permanently deleted.");
          return false;
        }
      }
    } catch {
      // safe fallback
    }
    return true;
  };

  const fetchData = async () => {
    if (!activeClubId) {
      setIsTenantLoading(false);
      return;
    }
    setIsTenantLoading(true);
    try {
      if (activeClubId) {
        const clubsList = await supabaseService.getClubs().catch(() => []);
        const currentClub = clubsList.find((c: any) => c.id === activeClubId);
        if (currentClub) {
          const status = currentClub.subscription_status || 'active';
          
          if (status === 'suspended' || status === 'pending_deletion' || status === 'deleted') {
            // Automatically sign out suspended or pending_deletion users.
            if (userRole !== 'super_admin' && userRole !== 'owner') {
              const msg = status === 'suspended'
                ? "Subscription suspended. Contact support."
                : status === 'pending_deletion'
                  ? "Club scheduled for deletion. Access revoked."
                  : "Club has been permanently deleted.";
              alert(msg);
              handleLogout();
              return;
            } else {
              // Redirect owner or super_admin back to SaaS Dashboard
              alert(`Warning: This club subscription status is currently ${status.toUpperCase()}. Access is restricted.`);
              setCurrentView("SaaS Dashboard");
              setActiveClubId('');
              setActiveClubName('');
              return;
            }
          }
          
          if (currentClub.subscription_plan) {
            setActiveClubPlan(currentClub.subscription_plan);
          } else {
            setActiveClubPlan('full');
          }
        }
      }

      const [
        fetchedTables,
        fetchedMembers,
        fetchedTransactions,
        fetchedExpenditures,
        fetchedAdmins,
        fetchedHH,
        fetchedPendingBills,
        fetchedBookings,
      ] = await Promise.all([
        supabaseService.getTables().catch(() => []),
        supabaseService.getMembers().catch(() => []),
        supabaseService.getTransactions().catch(() => []),
        supabaseService.getExpenditures().catch(() => []),
        supabaseService.getAdmins().catch(() => []),
        supabaseService.getHappyHourSettings().catch(() => null),
        supabaseService.getPendingBills().catch(() => []),
        supabaseService.getBookings().catch(() => []),
      ]);

      const loadedItems = await loadMenuItems();

      const fetchedCategories = await supabaseService
        .getMenuCategories()
        .catch(() => []);
      const itemCategories = (loadedItems || [])
        .map((itm) => itm.category)
        .filter(Boolean);
      const unifiedCategories = Array.from(
        new Set([...(fetchedCategories || []), ...itemCategories]),
      );

      if (unifiedCategories && unifiedCategories.length > 0) {
        setMenuCategories(unifiedCategories);
      } else {
        setMenuCategories(["Beverage", "Snack", "Dessert"]);
      }

      if (fetchedTables && fetchedTables.length > 0) {
        setTables(fetchedTables);
      } else if (fetchedTables) {
        setTables([]);
      }

      setMembers(fetchedMembers || []);
      setTransactions(fetchedTransactions || []);
      setExpenditures(fetchedExpenditures || []);
      setAdminAccounts(fetchedAdmins || []);
      setHhSettings(fetchedHH);
      setPendingBills(fetchedPendingBills || []);
      setBookings(fetchedBookings || []);

      if (fetchedTables && fetchedTables.length > 0) {
        const maxTableNum = Math.max(
          ...fetchedTables.map((t) => parseInt(t.number) || 0),
        );
        setNextBillNumber(Math.max(1001, maxTableNum + 1));
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
    } finally {
      setIsTenantLoading(false);
    }
  };

  // Always start with a completely clean authentication state on initial load/refresh
  useEffect(() => {
    localStorage.removeItem('active_admin_username');
    localStorage.removeItem('active_admin_role');
    localStorage.removeItem('active_admin_permissions');
    localStorage.removeItem('active_admin_id');
    localStorage.removeItem('active_club_id');
    localStorage.removeItem('active_club_name');
    localStorage.removeItem('obsidian_admins_local_v1');
    localStorage.removeItem('obsidian_admins_local');
    localStorage.removeItem('cue_control_admins');
    supabaseService.setActiveAdminUsername('');
    supabaseService.setActiveAdminRole('');
    supabaseService.setActiveAdminPermissions('');
    supabaseService.setActiveAdminId('');
    supabaseService.setActiveClubId('');
    setActiveClubId('');
    setActiveClubName('');
    setIsAuthenticated(false);
  }, []);

  // Rigorous active session subscription lifecycle enforcement loop
  useEffect(() => {
    if (!isAuthenticated || !activeClubId) return;

    let isMounted = true;
    const verifyStatus = async () => {
      try {
        const clubsList = await supabaseService.getClubs().catch(() => []);
        const currentClub = clubsList.find((c: any) => c.id === activeClubId);
        if (currentClub) {
          const status = currentClub.subscription_status || 'active';
          if (status === 'suspended' || status === 'pending_deletion' || status === 'deleted') {
            if (!isMounted) return;
            if (userRole !== 'super_admin' && userRole !== 'owner') {
              const msg = status === 'suspended'
                ? "Subscription suspended. Contact support."
                : status === 'pending_deletion'
                  ? "Club scheduled for deletion. Access revoked."
                  : "Club has been permanently deleted.";
              alert(msg);
              handleLogout();
            } else {
              alert(`Warning: This club subscription status is currently ${status.toUpperCase()}. Access is restricted.`);
              setCurrentView("SaaS Dashboard");
              setActiveClubId('');
              setActiveClubName('');
            }
          }
        }
      } catch (e) {
        console.error("Failed to verify active club status:", e);
      }
    };

    // Verify immediately on transition or load
    verifyStatus();

    // Verify every 5 seconds to terminate sessions instantly if status changes
    const interval = setInterval(verifyStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, activeClubId, userRole]);

  // Initial Fetch & Real-time Database Sync
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Perform load of all data
    fetchData();

    // Listen to Supabase Realtime schema events across all public tables
    if (isSupabaseConfigured) {
      console.log("Setting up Supabase Realtime database listeners...");
      const channel = supabase
        .channel("schema-db-realtime-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public" },
          (payload) => {
            console.log("Sync event registered:", payload);
            fetchData();
          }
        )
        .subscribe((status) => {
          console.log(`Realtime connection status: ${status}`);
        });

      return () => {
        console.log("Disconnecting Realtime listeners...");
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, activeClubId]);

  // Redirect to permitted view based on subscription features
  useEffect(() => {
    if (!isAuthenticated || !activeClubId) return;

    if (activeClubPlan === 'cafe_only') {
      const allowedCafeViews = ['Dashboard', 'Members', 'Cafe', 'Bills', 'Expenditure', 'Reports', 'Settings', 'Billing'];
      if (!allowedCafeViews.includes(currentView)) {
        setCurrentView('Cafe');
      }
    } else if (activeClubPlan === 'snooker_only') {
      const allowedSnookerViews = [
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
      if (!allowedSnookerViews.includes(currentView)) {
        setCurrentView('Tables');
      }
    }
  }, [activeClubPlan, currentView, isAuthenticated, activeClubId]);

  const addAdmin = async (details: Omit<AdminAccount, "id">) => {
    if (!await checkActiveClubStatus()) return;
    const newAdmin = await supabaseService.addAdmin(details);
    if (newAdmin) {
      setAdminAccounts([...adminAccounts, newAdmin]);
    }
  };

  const addMenuItem = async (item: Omit<MenuItem, "id">) => {
    if (!await checkActiveClubStatus()) return;
    // Ensure category exists first, caching database-related errors so they don't block item insertion
    try {
      await supabaseService.addMenuCategory(item.category);
    } catch (e) {
      console.warn("Silent category add fallback triggered:", e);
    }

    if (!menuCategories.includes(item.category)) {
      setMenuCategories((prev) =>
        Array.from(new Set([...prev, item.category])),
      );
    }

    let newItem: MenuItem | null = null;
    try {
      newItem = await supabaseService.addMenuItem({
        ...item,
        is_available: true,
      });
    } catch (e) {
      console.error("Failed to save menu item to Supabase:", e);
    }

    if (newItem) {
      setMenuItems((current) => [...current, newItem]);
      localStorage.setItem("cafe_initialized", "true");
    } else {
      // Show explicit error for category constraint if possible
      alert(
        `Failed to add item. This usually happens if the category "${item.category}" is not supported by your database settings. \n\nPlease run the SQL command to remove the category constraint in Supabase.`,
      );

      // Still allow local preview but warn it won't persist
      setMenuItems((current) => [
        ...current,
        { ...item, id: Date.now().toString(), is_available: true },
      ]);
    }
  };

  const deleteMenuItem = async (id: string) => {
    setDeletingMenuItemId(id);
    try {
      await supabaseService.deleteMenuItem(id);
      // Correctly filter menuItems state after a successful database deletion
      setMenuItems((current) => current.filter((item) => item.id !== id));
    } catch (e: any) {
      console.warn("Delete menu item failed on database service, attempting soft-delete fallback on is_available flag.", e);
      // Soft-delete fallback
      try {
        const existing = menuItems.find(item => item.id === id);
        if (existing) {
          await supabaseService.updateMenuItem({ ...existing, is_available: false });
        }
        // Properly filter state after successful fallback
        setMenuItems((current) => current.filter((item) => item.id !== id));
      } catch (innerErr) {
        console.error("Failed to apply is_available: false fallback:", innerErr);
      }
    } finally {
      setDeletingMenuItemId(null);
    }
  };

  const updateMenuItem = async (item: MenuItem) => {
    try {
      await supabaseService.addMenuCategory(item.category);
    } catch (e) {
      console.warn("Silent category add fallback triggered:", e);
    }

    if (!menuCategories.includes(item.category)) {
      setMenuCategories((prev) =>
        Array.from(new Set([...prev, item.category])),
      );
    }

    let updated: MenuItem | null = null;
    try {
      updated = await supabaseService.updateMenuItem(item);
    } catch (e) {
      console.error("Failed to update menu item to Supabase:", e);
    }

    if (updated) {
      setMenuItems((current) =>
        current.map((itm) => (itm.id === item.id ? updated! : itm)),
      );
    } else {
      setMenuItems((current) =>
        current.map((itm) => (itm.id === item.id ? item : itm)),
      );
    }
  };

  const deleteMenuCategory = async (name: string) => {
    await supabaseService.deleteMenuCategory(name);
    setMenuCategories((current) => current.filter((cat) => cat !== name));
  };

  const deleteAdmin = async (id: string) => {
    await supabaseService.deleteAdmin(id);
    setAdminAccounts(adminAccounts.filter((a) => a.id !== id));
  };

  const updateAdminPermissions = async (
    id: string,
    permissions: AdminAccount["permissions"],
  ) => {
    await supabaseService.updateAdmin(id, { permissions });
    setAdminAccounts(
      adminAccounts.map((a) => (a.id === id ? { ...a, permissions } : a)),
    );
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("admin");
    setCurrentView("Tables");
    supabaseService.logout();
    setActiveClubId('');
    setActiveClubName('');
  };

  const handleLogin = async (
    role: AdminRole,
    permissions: AdminAccount["permissions"],
    username: string,
    adminId?: string,
  ) => {
    clearActiveTenantData();
    supabaseService.setActiveAdminUsername(username);
    supabaseService.setActiveAdminRole(role);
    supabaseService.setActiveAdminPermissions(permissions);
    if (adminId) {
      supabaseService.setActiveAdminId(adminId);
    }

    const cId = await supabaseService.getActiveClubId();
    if (cId && role !== "super_admin" && role !== "owner") {
      try {
        const clubsList = await supabaseService.getClubs().catch(() => []);
        const currentClub = clubsList.find((c: any) => c.id === cId);
        if (currentClub) {
          const status = currentClub.subscription_status || 'active';
          if (status === 'suspended' || status === 'pending_deletion' || status === 'deleted') {
            const msg = status === 'suspended'
              ? "Subscription suspended. Contact support."
              : status === 'pending_deletion'
                ? "Club scheduled for deletion. Access revoked."
                : "Club has been permanently deleted.";
            alert(msg);
            handleLogout();
            return;
          }
        }
      } catch (err) {
        console.error("Error verifying club status during handleLogin:", err);
      }
    }

    setUserRole(role);
    setUserPermissions(permissions);
    setIsAuthenticated(true);
    setActiveClubId(cId);

    if (role === "super_admin" || role === "owner") {
      if (!cId) {
        setCurrentView("SaaS Dashboard");
      } else {
        setCurrentView("Tables");
      }
    } else {
      const isCafe = permissions === "CAFE";
      if (isCafe) {
        setCurrentView("Cafe");
      } else if (role === "admin3") {
        setCurrentView("Tables");
      } else {
        setCurrentView("Tables");
      }
    }

    if (isSupabaseConfigured && !adminId) {
      try {
        await supabaseService.ensureActiveAdminExistsInDb(username, role, permissions);
      } catch (err) {
        console.error("Failed to sync active admin database record:", err);
      }
    }
  };

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem("cue-control-accent-color") || "#00dbe9";
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<SnookerTable | null>(null);
  const [selectedTableForMember, setSelectedTableForMember] =
    useState<SnookerTable | null>(null);

  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [isStartPS5ModalOpen, setIsStartPS5ModalOpen] = useState(false);
  const [selectedTableForPS5, setSelectedTableForPS5] =
    useState<SnookerTable | null>(null);

  const [tableToReserve, setTableToReserve] = useState<SnookerTable | null>(
    null,
  );
  const [tableForCafe, setTableForCafe] = useState<SnookerTable | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isCafeModalOpen, setIsCafeModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<SnookerTable | null>(null);
  const [isSetTimeModalOpen, setIsSetTimeModalOpen] = useState(false);
  const [selectedTableForSetTime, setSelectedTableForSetTime] =
    useState<SnookerTable | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "UPI" | "PAY_LATER"
  >("UPI");
  const [individualPayments, setIndividualPayments] = useState<
    Record<string, "CASH" | "UPI" | "PAY_LATER">
  >({});

  useEffect(() => {
    if (selectedTable) {
      const players = (selectedTable.player || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const playerIds = (selectedTable.currentMemberId || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      setIndividualPayments(prev => {
        const next = { ...prev };
        players.forEach((p, idx) => {
          if (!next[p]) {
            const isMember = !!(playerIds[idx] || members.some(m => m.name === p));
            const defaultMethod = paymentMethod === 'PAY_LATER' && !isMember ? 'UPI' : paymentMethod;
            next[p] = defaultMethod;
          }
        });
        return next;
      });
    } else {
      setIndividualPayments({});
    }
  }, [selectedTable?.id, selectedTable?.player, members]);

  const handleGlobalPaymentMethodChange = (method: "CASH" | "UPI" | "PAY_LATER") => {
    setPaymentMethod(method);
    if (selectedTable) {
      const players = (selectedTable.player || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const playerIds = (selectedTable.currentMemberId || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      
      const updated: Record<string, "CASH" | "UPI" | "PAY_LATER"> = {};
      players.forEach((p, idx) => {
        const isMember = !!(playerIds[idx] || members.some(m => m.name === p));
        const defaultMethod = method === 'PAY_LATER' && !isMember ? 'UPI' : method;
        updated[p] = defaultMethod;
      });
      setIndividualPayments(updated);
    }
  };

  const [discount, setDiscount] = useState<number>(0);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<any>(null);

  useEffect(() => {
    if (receiptToPrint) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error("Browser print call failed:", err);
        }
        setReceiptToPrint(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptToPrint]);

  useEffect(() => {
    // Apply light/dark theme to document root
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("cue-control-accent-color", accentColor);
    
    // Smooth custom mappings of primary, bright and glow highlight codes
    let bright = "#7df4ff";
    let glow = "#00f0ff";
    
    switch (accentColor) {
      case "#0eaa60": // Snooker Felt Green
        bright = "#2dfaa0";
        glow = "#10e078";
        break;
      case "#c59b27": // Cue Wood Gold
        bright = "#fcd34d";
        glow = "#fbbf24";
        break;
      case "#00dbe9": // Original Cyan
        bright = "#7df4ff";
        glow = "#00f0ff";
        break;
      case "#1e60ff": // Chalk Ocean Blue
        bright = "#60a5fa";
        glow = "#3b82f6";
        break;
      case "#ff2a5f": // Pocket Red
        bright = "#f87171";
        glow = "#ef4444";
        break;
      case "#bc00dd": // Lounge Royal Purple
        bright = "#f472b6";
        glow = "#ec4899";
        break;
      default:
        break;
    }

    document.documentElement.style.setProperty("--color-neon-blue", accentColor);
    document.documentElement.style.setProperty("--color-neon-blue-bright", bright);
    document.documentElement.style.setProperty("--color-neon-blue-glow", glow);
  }, [accentColor]);

  const stats: ClubStats = {
    liveRevenue: tables.reduce((acc, t) => acc + (t.cost || 0), 0),
    occupancy:
      tables.length > 0
        ? Math.round(
            (tables.filter((t) => t.status === "RUNNING").length /
              tables.length) *
              100,
          )
        : 0,
    activeCount: tables.filter((t) => t.status === "RUNNING").length,
    totalCount: tables.length,
  };

  const addTable = async (details: Omit<SnookerTable, "id" | "status">) => {
    const isNodeAdmin = userPermissions === "CAFE";
    const newTableData: Omit<SnookerTable, "id"> = {
      number: details.number,
      type: details.type,
      rate: details.rate,
      rateUnit: details.rateUnit,
      ps5Costs: details.ps5Costs,
      status: isNodeAdmin ? "RUNNING" : "AVAILABLE",
      billNumber: isNodeAdmin ? details.number : undefined,
      player: isNodeAdmin ? "Guest" : "",
      startTimeUnix: isNodeAdmin ? Date.now() : undefined,
      startTime: isNodeAdmin
        ? new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : undefined,
      elapsedTime: isNodeAdmin ? "00:00:00" : "00:00:00",
      sessionCost: 0,
      cafeCost: 0,
      cost: 0,
      isPaused: false,
      totalPausedSeconds: 0,
    };

    const newTable = await supabaseService.addTable(newTableData);
    if (newTable) {
      setTables([...tables, newTable]);
      if (isNodeAdmin && !isNaN(Number(details.number))) {
        setNextBillNumber(Math.max(nextBillNumber, Number(details.number) + 1));
      }
    }
    setIsAddModalOpen(false);
  };

  const handleEditTable = (table: SnookerTable) => {
    setTableToEdit(table);
    setIsAddModalOpen(true);
  };

  const handleDeleteTable = async (table: SnookerTable) => {
    const success = await supabaseService.deleteTable(table.id);
    if (success) {
      setTables((prev) => prev.filter((t) => t.id !== table.id));
    }
  };

  const handleToggleMaintenance = async (table: SnookerTable) => {
    if (table.status === 'RUNNING') return;
    if (table.status === 'MAINTENANCE') {
      await handleSetAvailable(table);
    } else {
      const updates: Partial<SnookerTable> = {
        status: "MAINTENANCE",
      };
      await supabaseService.updateTable(table.id, updates);
      setTables((current) =>
        current.map((t) => (t.id === table.id ? { ...t, ...updates } : t))
      );
    }
  };

  const handleUpdateTableSpecs = async (id: string, updates: Partial<SnookerTable>) => {
    await supabaseService.updateTable(id, updates);
    setTables((current) =>
      current.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    setTableToEdit(null);
  };

  const handleSetAvailable = async (table: SnookerTable) => {
    const updates: Partial<SnookerTable> = {
      status: "AVAILABLE",
      player: "",
      currentMemberId: null,
      startTimeUnix: null,
      startTime: null,
      elapsedTime: "00:00:00",
      sessionCost: 0,
      cafeCost: 0,
      cost: 0,
      currentCart: [],
      billNumber: null,
      isPaused: false,
      totalPausedSeconds: 0,
      pauseStartTimeUnix: null,
    };

    await supabaseService.updateTable(table.id, updates);

    // If there was a member, set them to Inactive
    if (table.currentMemberId) {
      await supabaseService.updateMember(table.currentMemberId, {
        status: "Inactive",
      });
    }

    setTables((current) =>
      current.map((t) => (t.id === table.id ? { ...t, ...updates } : t)),
    );

    if (table.currentMemberId) {
      setMembers((current) =>
        current.map((m) =>
          m.id === table.currentMemberId ? { ...m, status: "Inactive" } : m,
        ),
      );
    }
  };

  const handleEndSession = (table: SnookerTable) => {
    setSelectedTable(table);
    setPaymentMethod("UPI");
    setDiscount(0);
    setCurrentView("Billing");
  };

  const handleMinimizeCheckout = async () => {
    if (!selectedTable) return;
    try {
      setIsCheckoutLoading(true);
      setCheckoutError(null);

      const pAmount = Number(selectedTable.cost || 0);
      const pPlayer = selectedTable.player || "Guest";
      const pDuration = selectedTable.elapsedTime || "00:00:00";
      const pMemberId = selectedTable.currentMemberId || null;
      const pCartNormalized = (selectedTable.currentCart || []).map((ci) => ({
        item: {
          id: ci.item?.id ?? "",
          name: ci.item?.name ?? (ci as any).name ?? "Item",
          price: Number(ci.item?.price ?? (ci as any).price ?? 0),
          category: ci.item?.category ?? "Other",
        },
        quantity: ci.quantity,
      }));

      // Add to database/localstorage pending_bills list
      await supabaseService.addPendingBill({
        tableId: selectedTable.id,
        tableNumber: selectedTable.number,
        player: pPlayer,
        amount: pAmount,
        sessionCost: Number(selectedTable.sessionCost || 0),
        cafeCost: Number(selectedTable.cafeCost || 0),
        elapsedTime: pDuration,
        memberId: pMemberId,
        cart: pCartNormalized,
      });

      // Reset Table to AVAILABLE status with completely empty note
      const resetUpdates: Partial<SnookerTable> = {
        status: "AVAILABLE",
        player: "",
        currentMemberId: null,
        currentCart: [],
        startTimeUnix: undefined,
        startTime: undefined,
        elapsedTime: "00:00:00",
        sessionCost: 0,
        cafeCost: 0,
        cost: 0,
        billNumber: undefined,
        isPaused: false,
        totalPausedSeconds: 0,
        pauseStartTimeUnix: undefined,
        note: "",
      };

      await supabaseService.updateTable(selectedTable.id, resetUpdates);

      // Also update the active members to Inactive when session is terminated
      if (selectedTable.currentMemberId) {
        const ids = String(selectedTable.currentMemberId).split(',').map(s => s.trim()).filter(Boolean);
        for (const id of ids) {
          if (id) {
            await supabaseService.updateMember(id, {
              status: "Inactive",
            });
          }
        }
      }

      await fetchData();
      setSelectedTable(null);
      setCurrentView("Tables");
    } catch (e: any) {
      console.error("Failed to minimize checkout:", e);
      setCheckoutError(`Minimize failed: ${e.message || e}`);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleQuickCheckout = async (table: SnookerTable) => {
    console.log("Quick checkout initiated for table:", table.number);
    const transaction = await supabaseService.completeSession(table.id, "CASH");

    if (transaction) {
      console.log("Quick checkout session completed, refreshing data.");
      await fetchData();
    } else {
      console.error("Quick checkout failed to complete session.");
    }
  };

  const handleStartSession = async (
    table: SnookerTable,
    playerName: string = "Guest",
    memberId: string | null = null,
  ) => {
    if (!await checkActiveClubStatus()) return;
    if (userPermissions !== "CAFE" && table.type === "PS5") {
      setSelectedTableForPS5(table);
      // We might want to pass the selected member here too if we're in the PS5 modal
      // but for now let's keep it simple
      setIsStartPS5ModalOpen(true);
      return;
    }

    const billId = String(nextBillNumber);
    const updatedTable = await supabaseService.startSession(
      table.id,
      playerName,
      userPermissions === "CAFE" ? billId : undefined,
      memberId,
    );

    if (updatedTable) {
      setTables((current) =>
        current.map((t) => (t.id === table.id ? updatedTable : t)),
      );

      if (userPermissions === "CAFE") {
        setNextBillNumber((prev) => prev + 1);
      }

      // If it's a member, we can mark them active too
      if (memberId) {
        setMembers((current) =>
          current.map((m) =>
            m.id === memberId ? { ...m, status: "Active" } : m,
          ),
        );
      }
    }
  };

  const confirmStartPS5Session = async (
    players: 1 | 2 | 3 | 4,
    memberId: string | null,
  ) => {
    if (!selectedTableForPS5) return;
    if (!await checkActiveClubStatus()) return;

    // We should probably update the table with players count too in the service
    // But for now let's just use the General logic and update players count locally or add a param
    const member = memberId ? members.find((m) => m.id === memberId) : null;
    const updatedTable = await supabaseService.startSession(
      selectedTableForPS5.id,
      member ? member.name : "Guest",
      undefined,
      memberId,
    );

    if (updatedTable) {
      const finalTable = { ...updatedTable, playersCount: players };
      await supabaseService.updateTable(selectedTableForPS5.id, {
        playersCount: players,
      } as any);

      setTables((current) =>
        current.map((t) => (t.id === selectedTableForPS5.id ? finalTable : t)),
      );

      if (memberId) {
        setMembers((current) =>
          current.map((m) =>
            m.id === memberId ? { ...m, status: "Active" } : m,
          ),
        );
      }
    }
    setIsStartPS5ModalOpen(false);
    setSelectedTableForPS5(null);
  };

  const handleReserveTable = (table: SnookerTable) => {
    setTableToReserve(table);
    setIsReserveModalOpen(true);
  };

  const handleAddBooking = async (newB: Omit<Booking, "id" | "createdAt">) => {
    if (!await checkActiveClubStatus()) return;
    const added = await supabaseService.addBooking(newB);
    if (added) {
      setBookings((prev) => [...prev, added]);

      // Automatically sync table reservation details to/from main floor tables if CONFIRMED
      if (added.status === "CONFIRMED") {
        const formattedTime = new Date(`${added.bookingDate}T${added.startTime}`).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        await supabaseService.updateTable(added.tableId, {
          player: added.playerName,
          reservationTime: formattedTime,
        });
        setTables((current) =>
          current.map((t) =>
            t.id === added.tableId
              ? {
                  ...t,
                  player: added.playerName,
                  reservationTime: formattedTime,
                }
              : t,
          ),
        );
      }
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: Booking["status"]) => {
    const success = await supabaseService.updateBooking(id, { status });
    if (success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      );

      // Automatically sync table reservation details to/from main floor tables
      const bk = bookings.find((b) => b.id === id);
      if (bk) {
        if (status === "CONFIRMED") {
          const formattedTime = new Date(`${bk.bookingDate}T${bk.startTime}`).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          await supabaseService.updateTable(bk.tableId, {
            player: bk.playerName,
            reservationTime: formattedTime,
          });
          setTables((current) =>
            current.map((t) =>
              t.id === bk.tableId
                ? {
                    ...t,
                    player: bk.playerName,
                    reservationTime: formattedTime,
                  }
                : t,
            ),
          );
        } else if (status === "CANCELLED" || status === "COMPLETED") {
          await supabaseService.updateTable(bk.tableId, {
            player: "",
            reservationTime: "",
          });
          setTables((current) =>
            current.map((t) =>
              t.id === bk.tableId
                ? {
                    ...t,
                    player: "",
                    reservationTime: "",
                  }
                : t,
            ),
          );
        }
      }
    }
  };

  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => {
    const success = await supabaseService.updateBooking(id, updates);
    if (success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      );

      // Automatically sync table reservation details to/from main floor tables if confirmed
      const bk = bookings.find((b) => b.id === id);
      if (bk) {
        const mergedBooking = { ...bk, ...updates };
        if (mergedBooking.status === "CONFIRMED") {
          const formattedTime = new Date(`${mergedBooking.bookingDate}T${mergedBooking.startTime}`).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          // Clean up old table if target table changed
          if (updates.tableId && updates.tableId !== bk.tableId) {
            await supabaseService.updateTable(bk.tableId, {
              player: "",
              reservationTime: "",
            });
            setTables((current) =>
              current.map((t) =>
                t.id === bk.tableId
                  ? {
                      ...t,
                      player: "",
                      reservationTime: "",
                    }
                  : t,
              ),
            );
          }

          await supabaseService.updateTable(mergedBooking.tableId, {
            player: mergedBooking.playerName,
            reservationTime: formattedTime,
          });
          setTables((current) =>
            current.map((t) =>
              t.id === mergedBooking.tableId
                ? {
                    ...t,
                    player: mergedBooking.playerName,
                    reservationTime: formattedTime,
                  }
                : t,
            ),
          );
        } else if (mergedBooking.status === "CANCELLED" || mergedBooking.status === "COMPLETED") {
          await supabaseService.updateTable(mergedBooking.tableId, {
            player: "",
            reservationTime: "",
          });
          setTables((current) =>
            current.map((t) =>
              t.id === mergedBooking.tableId
                ? {
                    ...t,
                    player: "",
                    reservationTime: "",
                  }
                : t,
            ),
          );
        }
      }
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const bk = bookings.find((b) => b.id === id);
    const success = await supabaseService.deleteBooking(id);
    if (success) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
      if (bk) {
        await supabaseService.updateTable(bk.tableId, {
          player: "",
          reservationTime: "",
        });
        setTables((current) =>
          current.map((t) =>
            t.id === bk.tableId
              ? {
                  ...t,
                  player: "",
                  reservationTime: "",
                }
              : t,
          ),
        );
      }
    }
  };

  const handleStartSessionFromBooking = async (
    tableId: string,
    playerName: string,
    memberId?: string | null,
    advancePaid?: number,
    depositPaymentMethod?: string | null,
  ) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      await handleStartSession(table, playerName, memberId || null);
      
      if (advancePaid && advancePaid > 0) {
        const noteMsg = `Booking Advance Paid: ₹${advancePaid} via ${depositPaymentMethod || 'UPI'}`;
        await supabaseService.updateTable(tableId, { note: noteMsg });
        setTables((current) =>
          current.map((t) =>
            t.id === tableId ? { ...t, note: noteMsg } : t
          )
        );
      }
      setCurrentView("Tables");
    }
  };

  const handleOpenTableCafe = (table: SnookerTable) => {
    setTableForCafe(table);
    setIsCafeModalOpen(true);
  };

  const handleAddOrder = async (
    tableId: string,
    orderItems: { item: MenuItem; quantity: number }[] | MenuItem,
    maybeQuantity?: number,
  ) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    let updatedCart = [...(table.currentCart || [])];

    if (Array.isArray(orderItems)) {
      // It's a full cart replacement or batch addition (used by TableCafeModal)
      updatedCart = orderItems;
    } else {
      // It's a single item addition (used by CanteenMenu)
      const existingItemIndex = updatedCart.findIndex(
        (i) => i.item.id === orderItems.id,
      );
      if (existingItemIndex > -1) {
        updatedCart[existingItemIndex].quantity += maybeQuantity || 1;
      } else {
        updatedCart.push({ item: orderItems, quantity: maybeQuantity || 1 });
      }
    }

    const newCafeCost = updatedCart.reduce(
      (acc, i) => acc + i.item.price * i.quantity,
      0,
    );

    await supabaseService.updateTable(tableId, {
      cafeCost: newCafeCost,
      cost: (table.sessionCost || 0) + newCafeCost,
      currentCart: updatedCart,
    });

    setTables((current) =>
      current.map((t) => {
        if (t.id === tableId) {
          return {
            ...t,
            cafeCost: newCafeCost,
            cost: (t.sessionCost || 0) + newCafeCost,
            currentCart: updatedCart,
          };
        }
        return t;
      }),
    );
  };

  const confirmReservation = async (
    tableId: string,
    playerName: string,
    time: string,
  ) => {
    const formattedTime = new Date(time).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await supabaseService.updateTable(tableId, {
      player: playerName,
      reservationTime: formattedTime,
    });

    setTables((current) =>
      current.map((t) =>
        t.id === tableId
          ? {
              ...t,
              player: playerName,
              reservationTime: formattedTime,
            }
          : t,
      ),
    );
    setIsReserveModalOpen(false);
    setTableToReserve(null);
  };

  const togglePause = async (table: SnookerTable) => {
    const now = Date.now();
    let updates: Partial<SnookerTable> = {};

    if (!table.isPaused) {
      updates = { isPaused: true, pauseStartTimeUnix: now };
    } else {
      const pausedLast = Math.floor(
        (now - (table.pauseStartTimeUnix || now)) / 1000,
      );
      updates = {
        isPaused: false,
        pauseStartTimeUnix: undefined,
        totalPausedSeconds: (table.totalPausedSeconds || 0) + pausedLast,
      };
    }

    await supabaseService.updateTable(table.id, updates);

    setTables((current) =>
      current.map((t) => {
        if (t.id === table.id) {
          return { ...t, ...updates };
        }
        return t;
      }),
    );
  };

  const handleUpdateTimer = async (
    tableId: string,
    newStartTimeUnix: number,
    playerName?: string,
    memberId?: string | null,
  ) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    if (table.status !== 'RUNNING') {
      const billId = String(nextBillNumber);
      const updatedTable = await supabaseService.startSession(
        table.id,
        playerName || 'Guest',
        userPermissions === "CAFE" ? billId : undefined,
        memberId,
        newStartTimeUnix
      );
      if (updatedTable) {
        setTables((current) =>
          current.map((t) => (t.id === table.id ? updatedTable : t)),
        );
        if (userPermissions === "CAFE") {
          setNextBillNumber((prev) => prev + 1);
        }
      }
    } else {
      const newStartTime = new Date(newStartTimeUnix).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      await supabaseService.updateTable(tableId, {
        startTimeUnix: newStartTimeUnix,
        startTime: newStartTime,
      });

      setTables((current) =>
        current.map((t) => {
          if (t.id === tableId) {
            return {
              ...t,
              startTimeUnix: newStartTimeUnix,
              startTime: newStartTime,
            };
          }
          return t;
        }),
      );
    }
  };

  const handleUpdateNote = async (tableId: string, note: string) => {
    await supabaseService.updateTable(tableId, { note });
    setTables((current) =>
      current.map((t) => (t.id === tableId ? { ...t, note } : t)),
    );
  };

  const handleAssignMember = (table: SnookerTable) => {
    setSelectedTableForMember(table);
    setIsAssignMemberModalOpen(true);
  };

  const confirmAssignMember = async (
    member: Member | { name: string; id: string | null; isAction: "ADD" | "REMOVE" }
  ) => {
    if (!selectedTableForMember) return;

    let updatedPlayer = selectedTableForMember.player || "";
    let updatedMemberId = selectedTableForMember.currentMemberId || "";

    let currentNames = updatedPlayer
      ? updatedPlayer.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    let currentIds = updatedMemberId
      ? updatedMemberId.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (currentNames.length === 1 && currentNames[0].toLowerCase() === "guest") {
      currentNames = [];
      currentIds = [];
    }

    const isActionObj = "isAction" in member;

    if (isActionObj) {
      if (member.isAction === "REMOVE") {
        const index = currentNames.indexOf(member.name);
        if (index > -1) {
          currentNames.splice(index, 1);
          const idIndex = member.id ? currentIds.indexOf(member.id) : index;
          if (idIndex > -1 && idIndex < currentIds.length) {
            currentIds.splice(idIndex, 1);
          }
        }
      } else if (member.isAction === "ADD") {
        if (!currentNames.includes(member.name)) {
          currentNames.push(member.name);
          if (member.id) {
            currentIds.push(member.id);
          }
        }
      }
    } else {
      if (!currentNames.includes(member.name)) {
        currentNames.push(member.name);
        if (member.id) {
          currentIds.push(member.id);
        }
      }
    }

    const finalPlayerStr = currentNames.length > 0 ? currentNames.join(", ") : "Guest";
    const finalMemberIdStr = currentIds.length > 0 ? currentIds.join(",") : null;

    await supabaseService.updateTable(selectedTableForMember.id, {
      player: finalPlayerStr,
      currentMemberId: finalMemberIdStr,
    });

    if (!isActionObj || member.isAction === "ADD") {
      if (member.id) {
        await supabaseService.updateMember(member.id, { status: "Active" });
        setMembers((current) =>
          current.map((m) => (m.id === member.id ? { ...m, status: "Active" } : m)),
        );
      }
    } else if (isActionObj && member.isAction === "REMOVE" && member.id) {
      await supabaseService.updateMember(member.id, { status: "Inactive" });
      setMembers((current) =>
        current.map((m) => (m.id === member.id ? { ...m, status: "Inactive" } : m)),
      );
    }

    setTables((current) =>
      current.map((t) =>
        t.id === selectedTableForMember.id
          ? { ...t, player: finalPlayerStr, currentMemberId: finalMemberIdStr }
          : t,
      ),
    );

    setSelectedTableForMember((current) => {
      if (!current) return null;
      return {
        ...current,
        player: finalPlayerStr,
        currentMemberId: finalMemberIdStr,
      };
    });

    // Do NOT close the modal on ADD or REMOVE actions so that the admin can assign multiple members dynamically
    if (!isActionObj) {
      setIsAssignMemberModalOpen(false);
      setSelectedTableForMember(null);
    }
  };

  const addMember = async (
    details: Omit<Member, "id" | "joinedDate">,
  ): Promise<Member | null> => {
    const newMemberData: Omit<Member, "id"> = {
      name: details.name,
      contact: details.contact,
      status: details.status,
      dueAmount: details.dueAmount || 0,
      joinedDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };

    const newMember = await supabaseService.addMember(newMemberData);
    if (newMember) {
      setMembers((current) => [...current, newMember]);
      return newMember;
    }
    return null;
  };

  const updateHappyHourSettings = async (
    updates: Partial<HappyHourSettings>,
  ) => {
    // Optimistic update
    if (hhSettings) {
      setHhSettings({ ...hhSettings, ...updates });
    }

    await supabaseService.updateHappyHourSettings(updates);

    // Refresh to get server-side calculated fields (duration, timestamps)
    const refreshed = await supabaseService.getHappyHourSettings();
    if (refreshed) {
      setHhSettings(refreshed);
    }
  };

  const editMember = async (updatedMember: Member) => {
    await supabaseService.updateMember(updatedMember.id, updatedMember);
    setMembers(
      members.map((m) => (m.id === updatedMember.id ? updatedMember : m)),
    );
  };

  const handleClearMemberDue = async (
    memberId: string,
    method: "CASH" | "UPI",
    customAmount?: number,
  ) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    try {
      const currentDue = member.dueAmount || 0;
      const amountToClear = customAmount !== undefined ? customAmount : currentDue;
      const nextDue = Math.max(0, currentDue - amountToClear);

      // 1. Update dueAmount for the member in the database
      await supabaseService.updateMember(memberId, { dueAmount: nextDue });

      // 2. Set database transactions for this member to completed method proportional to amount cleared
      await supabaseService.settleMemberTransactions(
        memberId,
        member.name,
        method,
        amountToClear,
      );

      // 3. Update locally for fast optimistic UI feedback
      setMembers((current) =>
        current.map((m) => (m.id === memberId ? { ...m, dueAmount: nextDue } : m)),
      );

      // 4. Fully refresh our application states to make sure we stay perfectly in sync
      await fetchData();
    } catch (err) {
      console.error("Error settling member due amount:", err);
    }
  };

  const deleteMember = async (id: string) => {
    if (!await checkActiveClubStatus()) return;
    await supabaseService.deleteMember(id);
    setMembers(members.filter((m) => m.id !== id));
  };

  const addExpenditure = async (details: Omit<Expenditure, "id" | "date">) => {
    if (!await checkActiveClubStatus()) return;
    const newExpData: Omit<Expenditure, "id"> = {
      date: new Date().toISOString(),
      ...details,
    };

    const newExpenditure = await supabaseService.addExpenditure(newExpData);
    if (newExpenditure) {
      setExpenditures([newExpenditure, ...expenditures]);
    }
  };

  const deleteExpenditure = async (id: string) => {
    if (!await checkActiveClubStatus()) return;
    await supabaseService.deleteExpenditure(id);
    setExpenditures(expenditures.filter((e) => e.id !== id));
  };

  const updateExpenditure = async (id: string, updates: Partial<Omit<Expenditure, "id" | "date">>) => {
    const updated = await supabaseService.updateExpenditure(id, updates);
    if (updated) {
      setExpenditures(expenditures.map((e) => (e.id === id ? updated : e)));
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setTables((currentTables) =>
        currentTables.map((table) => {
          if (table.status === "RUNNING" && table.startTimeUnix) {
            const now = Date.now();
            const totalPaused = table.totalPausedSeconds || 0;
            const currentPauseSession =
              table.isPaused && table.pauseStartTimeUnix
                ? Math.floor((now - table.pauseStartTimeUnix) / 1000)
                : 0;

            const totalPausedToSubtract = totalPaused + currentPauseSession;

            const rawElapsedSeconds = Math.floor(
              (now - table.startTimeUnix) / 1000,
            );
            const elapsedSeconds = Math.max(
              0,
              rawElapsedSeconds - totalPausedToSubtract,
            );

            const h = Math.floor(elapsedSeconds / 3600)
              .toString()
              .padStart(2, "0");
            const m = Math.floor((elapsedSeconds % 3600) / 60)
              .toString()
              .padStart(2, "0");
            const s = (elapsedSeconds % 60).toString().padStart(2, "0");

            // Cost calculation based on table rate
            let currentRate =
              typeof table.rate === "number"
                ? table.rate
                : parseFloat((table.rate as any) || "0");
            const isHappyHourActive = !!(hhSettings && hhSettings.isEnabled);

            if (isHappyHourActive) {
              // Normalizing type for lookup
              const normalizedType = (table.type || "").trim().toLowerCase();

              const typeToRateKey: Record<string, keyof HappyHourSettings> = {
                snooker: "snookerRate",
                pool: "poolRate",
                ps5: "ps5Rate",
                "mini snooker": "miniSnookerRate",
                "other games": "otherRate",
              };

              const rateKey = typeToRateKey[normalizedType];
              if (rateKey) {
                const hhRateValue = hhSettings[rateKey];
                if (typeof hhRateValue === "number" && hhRateValue > 0) {
                  currentRate = hhRateValue;
                }
              }
            }

            let sessionCost = 0;
            if (!table.isPaused && userPermissions !== "CAFE") {
              // Special case for PS5 per-player cost: only applies if HAPPY HOUR IS OFF
              const normalizedType = (table.type || "").trim().toLowerCase();
              if (
                normalizedType === "ps5" &&
                table.ps5Costs &&
                table.playersCount &&
                !isHappyHourActive
              ) {
                const playerRate =
                  table.ps5Costs[
                    `p${table.playersCount}` as keyof typeof table.ps5Costs
                  ] ?? 0;
                sessionCost = (elapsedSeconds / 60) * playerRate;
              } else if (table.rateUnit === "min") {
                sessionCost = (elapsedSeconds / 60) * (currentRate || 5);
              } else {
                // Default to hourly rate
                sessionCost = (elapsedSeconds / 3600) * (currentRate || 300);
              }
            } else {
              sessionCost = table.sessionCost || 0;
            }

            const cafeCost = table.cafeCost || 0;

            return {
              ...table,
              elapsedTime: `${h}:${m}:${s}`,
              sessionCost: sessionCost,
              cafeCost: cafeCost,
              cost: sessionCost + cafeCost,
            };
          }
          return table;
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, hhSettings, userRole]);

  useEffect(() => {
    if (!isAuthenticated || bookings.length === 0) return;

    const checkReservations = () => {
      const now = new Date();
      bookings.forEach((b) => {
        if (b.status !== "CONFIRMED" && b.status !== "PENDING") return;

        try {
          let timeStr = b.startTime;
          if (timeStr.length === 5) {
            timeStr += ":00";
          }
          const bDateTime = new Date(`${b.bookingDate}T${timeStr}`);
          const diffMs = bDateTime.getTime() - now.getTime();
          const diffMins = diffMs / (1000 * 60);

          // Auto delete if 10 minutes past start time has gone (diffMins <= -10)
          if (diffMins <= -10) {
            handleDeleteBooking(b.id);
            return;
          }

          // Trigger notification if booking is starting in 15 minutes or less, up to start time
          if (b.status === "CONFIRMED" && diffMins <= 15 && diffMins > 0) {
            if (!notifiedBookingRef.current.has(b.id)) {
              const tbl = tables.find((t) => t.id === b.tableId);
              const tblNum = tbl ? tbl.number : "?";

              const newNotif = {
                id: `${b.id}-${Date.now()}`,
                bookingId: b.id,
                message: `${tblNum} reservation for ${b.playerName} starts in ${Math.ceil(diffMins)} minutes (${b.startTime}).`,
                tableNumber: tblNum,
                playerName: b.playerName,
                startTime: b.startTime,
              };

              setNotifications((prev) => {
                if (prev.some((n) => n.bookingId === b.id)) return prev;
                // Auto dismiss in 30 seconds
                setTimeout(() => {
                  setNotifications((curr) => curr.filter((n) => n.id !== newNotif.id));
                }, 30000);
                return [...prev, newNotif];
              });

              notifiedBookingRef.current.add(b.id);
            }
          }
        } catch (e) {
          console.error("Error checking bookings:", e);
        }
      });
    };

    checkReservations();
    const alertInterval = setInterval(checkReservations, 10000);

    return () => clearInterval(alertInterval);
  }, [bookings, isAuthenticated, tables]);

  const handleNotificationClick = (notif: { id: string; bookingId: string }) => {
    setCurrentView("Bookings");
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if ((userRole === "super_admin" || userRole === "owner") && !activeClubId) {
    return (
      <SaaSDashboards
        userRole={userRole}
        activeAdminUsername={supabaseService.getActiveAdminUsername()}
        onEnterClub={async (clubId, clubName) => {
          clearActiveTenantData();
          try {
            const clubsList = await supabaseService.getClubs().catch(() => []);
            const club = clubsList.find((c: any) => c.id === clubId);
            if (club) {
              const status = club.subscription_status || 'active';
              if (status === 'suspended' || status === 'pending_deletion' || status === 'deleted') {
                alert(`Host Clearance Refused: This club is in ${status.toUpperCase()} state. Please restore or activate first.`);
                return;
              }
            }
          } catch (e) {
            console.error("Failed to verify subscription status on enter:", e);
          }
          supabaseService.setActiveClubId(clubId);
          setActiveClubId(clubId);
          localStorage.setItem('active_club_name', clubName);
          setActiveClubName(clubName);
          setCurrentView("Tables");
          fetchData();
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-neon-blue/30 overflow-x-hidden">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-neon-blue/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyber-lime/5 blur-[120px]" />
      </div>

      <Sidebar
        currentView={currentView}
        onToggleView={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        role={userRole}
        permissions={userPermissions}
        subscriptionPlan={activeClubPlan}
      />

      <main className="lg:pl-64 relative flex flex-col min-h-screen">
        {/* Host Supervision Sticky Banner */}
        {(userRole === "super_admin" || userRole === "owner") && activeClubId && (
          <div className="bg-gradient-to-r from-neon-blue/20 via-cyber-lime/20 to-neon-blue/20 border-b border-neon-blue/30 px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3 relative z-50 shadow-[0_0_20px_rgba(0,219,233,0.15)]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neon-blue animate-pulse" />
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface font-semibold text-center sm:text-left">
                🌐 Host Active • Managing <span className="text-neon-blue font-bold">{activeClubName || "Acquired Club"}</span>
              </p>
            </div>
            <button
              onClick={() => {
                supabaseService.setActiveClubId("");
                setActiveClubId("");
                setActiveClubName("");
                setCurrentView("SaaS Dashboard");
              }}
              className="px-4 py-1.5 bg-neon-blue hover:bg-neon-blue/80 text-on-primary font-bold font-mono text-[9px] uppercase tracking-widest rounded transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Exit to SaaS Panel ↩
            </button>
          </div>
        )}
        <Header
          liveRevenue={stats.liveRevenue}
          occupancy={stats.occupancy}
          activeCount={stats.activeCount}
          totalCount={stats.totalCount}
          role={userRole}
          permissions={userPermissions}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          subscriptionPlan={activeClubPlan}
        />

        <div className="flex-1 py-10">
          <div className="px-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-on-surface">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                {currentView === "Tables"
                  ? userPermissions === "CAFE"
                    ? "Active Bills"
                    : "Table Management"
                  : currentView}
              </h1>
              <p className="text-on-surface-variant font-mono text-xs uppercase tracking-[0.3em]">
                {userPermissions === "CAFE"
                  ? "Terminal Operator | Node-Cafe-AIS"
                  : "System Monitoring | Node-442-AIS"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {userPermissions === "CAFE" && currentView === "Tables" && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-6 py-3 bg-neon-blue text-on-primary rounded-lg text-xs font-bold font-mono tracking-widest uppercase hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> New Bill Slot
                </button>
              )}
              {userPermissions === "CAFE" && activeClubPlan !== "cafe_only" && (
                <div className="flex bg-on-surface/5 p-1 rounded-xl border border-outline/20 mr-2">
                  <button
                    onClick={() => setCurrentView("Cafe")}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold font-mono tracking-widest uppercase transition-all ${currentView === "Cafe" ? "bg-neon-blue text-on-primary shadow-lg" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    Cafe Menu
                  </button>
                  <button
                    onClick={() => setCurrentView("Tables")}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold font-mono tracking-widest uppercase transition-all ${currentView === "Tables" ? "bg-neon-blue text-on-primary shadow-lg" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    Open Bills
                  </button>
                </div>
              )}
              <button className="px-6 py-3 glass rounded-lg border border-outline/20 text-xs font-bold font-mono tracking-widest uppercase hover:bg-on-surface/5 transition-all text-on-surface">
                Filter View
              </button>
            </div>
          </div>

          {isTenantLoading ? (
            <div className="px-10 py-20 flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-neon-blue/20 border-t-neon-blue animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-neon-blue/10 animate-ping" />
                </div>
              </div>
              <p className="font-mono text-neon-blue text-xs uppercase tracking-[0.3em] animate-pulse">
                Syncing Active Tenant Nodes...
              </p>
              <p className="font-mono text-on-surface-variant/60 text-[9px] uppercase tracking-widest mt-2">
                Initializing Secure Club Sandbox Isolation
              </p>
            </div>
          ) : (
            <>
              {currentView === "Tables" && (
                <>
              <div className="px-10 mb-6 flex flex-wrap items-center gap-2.5 text-xs font-mono">
                <span className="text-on-surface-variant/60 uppercase tracking-[0.25em] text-[9px] font-semibold mr-1.5">
                  STATUS KEY:
                </span>
                <div className="flex items-center gap-1.5 bg-on-surface/5 border border-outline/15 px-2.5 py-1 rounded whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60"></span>
                  <span className="text-on-surface-variant font-bold text-[9px] uppercase tracking-wider">Available</span>
                </div>
                <div className="flex items-center gap-1.5 bg-cyber-lime/10 border border-cyber-lime/20 px-2.5 py-1 rounded whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-lime animate-pulse"></span>
                  <span className="text-cyber-lime font-bold text-[9px] uppercase tracking-wider">Running</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neon-blue/10 border border-neon-blue/20 px-2.5 py-1 rounded whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-blue"></span>
                  <span className="text-neon-blue font-bold text-[9px] uppercase tracking-wider">Reserved</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-amber-500 font-bold text-[9px] uppercase tracking-wider">Paused</span>
                </div>
                <div className="flex items-center gap-1.5 bg-pulse-red/10 border border-pulse-red/20 px-2.5 py-1 rounded whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-pulse-red"></span>
                  <span className="text-pulse-red font-bold text-[9px] uppercase tracking-wider">Maintenance</span>
                </div>
              </div>

              <TableGrid
                tables={tables}
                bookings={bookings}
                hhSettings={hhSettings}
                onEndSession={handleEndSession}
                onStartSession={handleStartSession}
                onQuickCheckout={handleQuickCheckout}
                onReserve={handleReserveTable}
                onOpenCafe={handleOpenTableCafe}
                onTogglePause={togglePause}
                onSetTime={(table) => {
                  setSelectedTableForSetTime(table);
                  setIsSetTimeModalOpen(true);
                }}
                onUpdateNote={handleUpdateNote}
                onAssignMember={handleAssignMember}
                onSetAvailable={handleSetAvailable}
                onEditTable={handleEditTable}
                onDeleteTable={handleDeleteTable}
                onToggleMaintenance={handleToggleMaintenance}
                members={members}
                role={userRole}
                permissions={userPermissions}
                pendingBillsCountMap={(() => {
                  const mapping: Record<string, number> = {};
                  pendingBills.forEach((b) => {
                    mapping[b.tableId] = (mapping[b.tableId] || 0) + 1;
                  });
                  return mapping;
                })()}
                onRedirectToPendingBills={() => setCurrentView("Pending Bills")}
                subscriptionPlan={activeClubPlan}
              />
            </>
          )}

          {currentView === "Pending Bills" && (
            <PendingBillsView
              pendingBills={pendingBills}
              tables={tables}
              onSelectPendingBillForCheckout={(reconstructed) => {
                setSelectedTable(reconstructed);
                setPaymentMethod("UPI");
                setDiscount(0);
                setCurrentView("Billing");
              }}
              onDeletePendingBill={async (id) => {
                await supabaseService.deletePendingBill(id);
                await fetchData();
              }}
            />
          )}
          {currentView === "Billing" && (
            <div className="px-10">
              {selectedTable ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-technical p-10 max-w-2xl mx-auto rounded-xl border-neon-blue/30 glow-blue"
                >
                  <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-neon-blue-bright">
                        {userPermissions === "CAFE"
                          ? "CHECKOUT: BILL"
                          : "CHECKOUT: TABLE"}{" "}
                        {selectedTable.number}
                      </h2>
                      <p className="font-mono text-xs text-on-surface-variant uppercase tracking-widest mt-1">
                        Player: {selectedTable.player}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <button
                        type="button"
                        disabled={isCheckoutLoading}
                        onClick={handleMinimizeCheckout}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black rounded border border-amber-500/30 hover:border-amber-400 transition-all font-mono text-[9px] uppercase tracking-wider font-bold mb-3 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:pointer-events-none"
                        title="Minimize Checkout (Save as Pending Bill)"
                      >
                        <Minus size={11} className="stroke-[3]" />
                        Minimize
                      </button>
                      <span className="font-mono text-[10px] text-on-surface-variant/40 block mb-1">
                        SESSION_ID
                      </span>
                      <span className="font-mono text-sm text-neon-blue">
                        {String(Math.random()).slice(2, 10)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-on-surface-variant/70">
                      <span className="font-sans uppercase text-xs tracking-widest">
                        Base Session Cost
                      </span>
                      <span className="font-mono text-lg">
                        ₹{(selectedTable.sessionCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-on-surface-variant/70">
                      <span className="font-sans uppercase text-xs tracking-widest">
                        Cafe Orders
                      </span>
                      <span className="font-mono text-lg">
                        ₹{(selectedTable.cafeCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-on-surface-variant/70 pt-2 border-t border-white/5">
                      <span className="font-sans uppercase text-xs tracking-widest text-amber-400">
                        Discount (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={Number(selectedTable.cost || 0)}
                        value={discount || ""}
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            Math.min(
                              Number(selectedTable.cost || 0),
                              Number(e.target.value),
                            ),
                          );
                          setDiscount(val);
                        }}
                        className="w-24 bg-on-surface/5 border border-outline/20 rounded px-2.5 py-1 text-right text-sm font-mono text-on-surface focus:outline-none focus:border-neon-blue/50 transition-all font-bold tracking-wide"
                        placeholder="0"
                      />
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-neon-blue-glow">
                      <span className="font-bold uppercase tracking-[0.2em]">
                        Total Amount
                      </span>
                      <span className="text-4xl font-mono font-bold">
                        ₹{Math.max(0, (selectedTable.cost || 0) - discount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Person-wise Share Breakdown */}
                  {(() => {
                    const breakdowns = calculateSplitBill(selectedTable, discount);
                    if (breakdowns.length <= 1) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="p-5 rounded-xl border border-white/10 bg-white/[0.02] mb-8 space-y-4"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <h4 className="font-mono text-[10px] text-cyber-lime uppercase tracking-[0.2em] font-bold">
                            Person-wise Share Breakdown
                          </h4>
                          <span className="font-mono text-[9px] text-on-surface-variant/40 font-bold">
                            ({breakdowns.length} PLAYERS)
                          </span>
                        </div>
                        <div className="space-y-5 divide-y divide-white/5">
                          {breakdowns.map((b, idx) => {
                            const selectedIndividualMethod = individualPayments[b.name] || 'UPI';
                            const isMember = !!(b.memberId || members.some(m => m.name === b.name));

                            return (
                              <div key={idx} className={`${idx > 0 ? 'pt-5' : ''} space-y-3`}>
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-lime inline-block"></span>
                                    {b.name}
                                    {b.memberId && (
                                      <span className="text-[8px] bg-neon-blue/15 text-neon-blue border border-neon-blue/20 px-1 py-0.2 rounded font-mono font-bold font-normal uppercase leading-none">
                                        Member
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-sm font-bold text-cyber-lime">
                                    ₹{b.total.toFixed(2)}
                                  </span>
                                </div>

                                {/* Individual Payment Selector */}
                                <div className="flex items-center gap-2 pl-3 flex-wrap">
                                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/40">Method:</span>
                                  <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/5 gap-1">
                                    {[
                                      { id: "UPI", icon: QrCode },
                                      { id: "CASH", icon: Banknote },
                                      ...(isMember ? [{ id: "PAY_LATER", icon: History }] : []),
                                    ].map((m) => {
                                      const isSelected = selectedIndividualMethod === m.id;
                                      return (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => {
                                            setIndividualPayments(prev => ({
                                              ...prev,
                                              [b.name]: m.id as any
                                            }));
                                          }}
                                          className={`flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[9px] font-bold uppercase transition-all ${
                                            isSelected
                                              ? "bg-neon-blue/20 border-neon-blue/45 text-neon-blue shadow-[0_0_8px_rgba(0,219,233,0.1)]"
                                              : "border-transparent text-on-surface-variant/40 hover:text-white/60"
                                          }`}
                                        >
                                          <m.icon size={10} />
                                          <span>{m.id === 'PAY_LATER' ? 'Later' : m.id}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="pl-3 space-y-1 font-mono text-[10px] text-on-surface-variant/60">
                                  <div className="flex justify-between">
                                    <span>Table Session Share</span>
                                    <span>₹{b.sessionCost.toFixed(2)}</span>
                                  </div>
                                  {b.cafeCost > 0 && (
                                    <div className="flex justify-between">
                                      <span>Cafe Orders Share / Direct</span>
                                      <span>₹{b.cafeCost.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {b.discount > 0 && (
                                    <div className="flex justify-between text-amber-500/75 font-semibold">
                                      <span>Applied Discount (Pro-rata)</span>
                                      <span>-₹{b.discount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {b.items.length > 0 && (
                                    <div className="pt-2 mt-2 border-t border-white/[0.03] pl-2 text-[9px] opacity-40 italic space-y-0.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                                      {b.items.map((it, itIdx) => (
                                        <div key={itIdx} className="flex justify-between">
                                          <span>{it.quantity.toFixed(1)}x {it.name}</span>
                                          <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {selectedIndividualMethod === "PAY_LATER" && b.memberId && (
                                    <div className="mt-1 flex items-center gap-1 text-[8px] text-amber-500 uppercase tracking-widest font-semibold font-mono">
                                      <span>● To be logged as Club Due</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })()}

                  <div className="mb-10">
                    <h4 className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-4">
                      Payment Method
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: "UPI", icon: QrCode },
                        { id: "CASH", icon: Banknote },
                        ...(selectedTable?.currentMemberId ||
                        members.some((m) => m.name === selectedTable?.player)
                          ? [{ id: "PAY_LATER", icon: History }]
                          : []),
                      ].map((method) => (
                        <button
                          key={method.id}
                          onClick={() => handleGlobalPaymentMethodChange(method.id as any)}
                          className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all ${
                            paymentMethod === method.id
                              ? "bg-neon-blue/10 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,219,233,0.1)]"
                              : "bg-obsidian-950/40 border-white/5 text-on-surface-variant/50 hover:border-white/20"
                          }`}
                        >
                          <method.icon size={20} />
                          <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-center">
                            {(method.id || "").replace("_", " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="p-4 mb-6 border border-rose-500/20 bg-rose-500/10 text-rose-200 text-xs font-mono rounded-lg flex flex-col gap-1">
                      <span className="font-bold uppercase tracking-wider text-rose-400">
                        Checkout System Warning
                      </span>
                      <span>{checkoutError}</span>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            try {
                              setIsCheckoutLoading(true);
                              setCheckoutError(null);
                              // Fallback table release
                              await supabaseService.updateTable(
                                selectedTable.id,
                                { status: "AVAILABLE" },
                              );
                              await fetchData();
                              setSelectedTable(null);
                            } catch (fError: any) {
                              setCheckoutError(
                                `Force Release failed: ${fError.message || fError}`,
                              );
                            } finally {
                              setIsCheckoutLoading(false);
                            }
                          }}
                          className="px-2 py-1 bg-rose-500/25 border border-rose-500/40 rounded hover:bg-rose-500/40 text-[10px] uppercase tracking-wider text-rose-200 font-bold"
                        >
                          Force Release Table (Clear State)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      disabled={isCheckoutLoading}
                      onClick={async () => {
                        if (selectedTable) {
                          setIsCheckoutLoading(true);
                          setCheckoutError(null);
                          try {
                            console.log(
                              "Final checkout initiated for table:",
                              selectedTable.number,
                            );

                            const assocMember = selectedTable.currentMemberId
                              ? members.find(
                                  (m) => m.id === selectedTable.currentMemberId,
                                )
                              : members.find(
                                  (m) => m.name === selectedTable.player,
                                );

                            const groupBreakdowns = calculateSplitBill(selectedTable, discount);
                            const individualPaymentsList = groupBreakdowns.map((b) => ({
                              name: b.name,
                              memberId: b.memberId,
                              amount: b.total,
                              paymentMethod: (groupBreakdowns.length > 1 && individualPayments[b.name]) 
                                ? individualPayments[b.name] 
                                : paymentMethod,
                              items: b.items
                            }));

                            const checkoutOverrides = {
                              amount: Math.max(0, Number(selectedTable.cost || 0) - discount),
                              duration: selectedTable.elapsedTime || "00:00:00",
                              items: (selectedTable.currentCart || []).map(
                                (ci) => ({
                                  name:
                                    ci.item?.name ?? ci.name ?? "Unknown Item",
                                  price: Number(
                                    ci.item?.price ?? ci.price ?? 0,
                                  ),
                                  quantity: Number(ci.quantity ?? 1),
                                }),
                              ),
                              playerName:
                                assocMember?.name ??
                                selectedTable.player ??
                                "Guest",
                              memberId: assocMember?.id ?? selectedTable.currentMemberId ?? null,
                              individualPayments: individualPaymentsList,
                              multipleDuesToApply: calculateSplitBill(selectedTable, discount)
                                .filter((b) => b.memberId)
                                .map((b) => ({
                                  memberId: b.memberId!,
                                  dueAmount: b.total,
                                })),
                            };

                            let transaction;
                            if (selectedTable.pendingBillId) {
                              if (groupBreakdowns.length > 1) {
                                for (const b of groupBreakdowns) {
                                  const singlePaymentMethod = individualPayments[b.name] || paymentMethod;
                                  let indivItems = b.items;
                                  if (!indivItems || indivItems.length === 0) {
                                    indivItems = [
                                      {
                                        name: `Split Bill Share (${b.name})`,
                                        price: b.total,
                                        quantity: 1
                                      }
                                    ];
                                  }
                                  transaction = await supabaseService.addTransaction({
                                    date: new Date().toISOString(),
                                    amount: b.total,
                                    paymentMethod: singlePaymentMethod,
                                    tableNumber: selectedTable.number,
                                    playerName: b.name,
                                    memberId: b.memberId || null,
                                    items: indivItems,
                                    duration: selectedTable.elapsedTime || "00:00:00",
                                  });
                                }
                              } else {
                                transaction =
                                  await supabaseService.addTransaction({
                                    date: new Date().toISOString(),
                                    amount: Math.max(0, Number(selectedTable.cost || 0) - discount),
                                    paymentMethod,
                                    tableNumber: selectedTable.number,
                                    playerName: selectedTable.player || "Guest",
                                    memberId:
                                      selectedTable.currentMemberId || null,
                                    items: (selectedTable.currentCart || []).map(
                                      (ci) => ({
                                        name:
                                          ci.item?.name ??
                                          (ci as any).name ??
                                          "Item",
                                        price: Number(
                                          ci.item?.price ??
                                            (ci as any).price ??
                                            0,
                                        ),
                                        quantity: Number(ci.quantity ?? 1),
                                      }),
                                    ),
                                    duration:
                                      selectedTable.elapsedTime || "00:00:00",
                                  });
                              }
                              if (transaction) {
                                await supabaseService.deletePendingBill(
                                  selectedTable.pendingBillId,
                                );
                              }
                            } else {
                              transaction =
                                await supabaseService.completeSession(
                                  selectedTable.id,
                                  paymentMethod,
                                  checkoutOverrides,
                                );
                            }

                            if (transaction) {
                              console.log(
                                "Checkout success, registering bill and refreshing all records.",
                              );

                              try {
                                const checkoutReceipt = {
                                  billNumber: selectedTable.billNumber || selectedTable.number || String(Math.floor(1001 + Math.random() * 9000)),
                                  tableName: (userPermissions === "CAFE" ? "Bill" : "Table") + " " + selectedTable.number,
                                  player: selectedTable.player || "Guest",
                                  type: selectedTable.type,
                                  startTime: selectedTable.startTime || "N/A",
                                  endTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
                                  duration: selectedTable.elapsedTime || "00:00:00",
                                  sessionCost: selectedTable.sessionCost || 0,
                                  cafeCost: selectedTable.cafeCost || 0,
                                  discount: discount,
                                  totalAmount: Math.max(0, (selectedTable.cost || 0) - discount),
                                  paymentMethod: paymentMethod,
                                  breakdowns: calculateSplitBill(selectedTable, discount),
                                  items: (selectedTable.currentCart || []).map((ci) => ({
                                    name: ci.item?.name ?? (ci as any).name ?? "Item",
                                    price: Number(ci.item?.price ?? (ci as any).price ?? 0),
                                    quantity: Number(ci.quantity ?? 1)
                                  })),
                                  date: new Date().toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                };
                                setReceiptToPrint(checkoutReceipt);
                              } catch (recErr) {
                                console.error("Error setting printable receipt layout:", recErr);
                              }

                              // Terminate table session explicitly by resetting local state
                              if (!selectedTable.pendingBillId) {
                                setTables((current) =>
                                  current.map((t) =>
                                    t.id === selectedTable.id
                                      ? {
                                          ...t,
                                          status: "AVAILABLE",
                                          player: "",
                                          currentMemberId: null,
                                          currentCart: [],
                                          startTimeUnix: undefined,
                                          startTime: undefined,
                                          elapsedTime: "00:00:00",
                                          sessionCost: 0,
                                          cafeCost: 0,
                                          cost: 0,
                                          billNumber: undefined,
                                          isPaused: false,
                                          totalPausedSeconds: 0,
                                          pauseStartTimeUnix: undefined,
                                        }
                                      : t,
                                  ),
                                );
                              }

                              await fetchData();
                              setSelectedTable(null);
                              setCurrentView("Tables");
                            } else {
                              console.error("Checkout failed in service.");
                              setCheckoutError(
                                "Checkout failed. Please check if session was already closed or if tables are out of sync.",
                              );
                            }
                          } catch (err: any) {
                            console.error("Error in checkout:", err);
                            const errMsg = err?.message || String(err);
                            setCheckoutError(
                              `Error completing session: ${errMsg}`,
                            );
                          } finally {
                            setIsCheckoutLoading(false);
                          }
                        }
                      }}
                      className="py-5 bg-neon-blue-glow text-on-primary font-bold uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans shadow-lg flex items-center justify-center gap-2"
                    >
                      {isCheckoutLoading ? "Processing..." : "Confirm & Print"}
                    </button>
                    <button
                      disabled={isCheckoutLoading}
                      onClick={() => {
                        setSelectedTable(null);
                        setCheckoutError(null);
                      }}
                      className="py-5 border border-white/10 text-on-surface-variant/60 font-bold uppercase tracking-[0.2em] hover:bg-white/5 disabled:opacity-50 transition-all font-sans"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="px-10 py-20 text-center glass-technical rounded-xl">
                  <h2 className="text-2xl text-neon-blue font-mono mb-4 text-primary-fixed">
                    BILLING_TERMINAL_IDLE
                  </h2>
                  <p className="text-on-surface-variant/60 uppercase text-xs tracking-widest">
                    No active checkout session selected from table hub.
                  </p>
                </div>
              )}
            </div>
          )}
          {currentView === "Bookings" && (
            <BookingsView
              bookings={bookings}
              tables={tables}
              members={members}
              onAddBooking={handleAddBooking}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onUpdateBooking={handleUpdateBooking}
              onDeleteBooking={handleDeleteBooking}
              onStartSessionFromBooking={handleStartSessionFromBooking}
            />
          )}
          {currentView === "Cafe" && (
            <CafeMenu
              tables={tables}
              onAddOrder={handleAddOrder}
              menuItems={menuItems}
              categories={menuCategories}
              onAddMenuItem={addMenuItem}
              onDeleteMenuItem={deleteMenuItem}
              onUpdateMenuItem={updateMenuItem}
              onDeleteCategory={deleteMenuCategory}
              role={userRole}
              transactions={transactions}
              deletingMenuItemId={deletingMenuItemId}
            />
          )}
          {currentView === "Members" && (
            <MembersView
              members={members}
              onAddMember={addMember}
              onEditMember={editMember}
              onDeleteMember={deleteMember}
              onClearMemberDue={handleClearMemberDue}
            />
          )}
          {currentView === "Billing History" && (
            <BillingHistoryView transactions={transactions} role={userRole} permissions={userPermissions} members={members} />
          )}
          {currentView === "Expenditure" && (
            <ExpenditureView
              expenditures={expenditures}
              onAddExpenditure={addExpenditure}
              onDeleteExpenditure={deleteExpenditure}
              onUpdateExpenditure={updateExpenditure}
            />
          )}
          {currentView === "Analytics" && (
            <AnalyticsView
              transactions={transactions}
              expenditures={expenditures}
              subscriptionPlan={activeClubPlan}
            />
          )}
          {currentView === "Reports" && (
            <AnalyticsView
              transactions={transactions}
              expenditures={expenditures}
              subscriptionPlan={activeClubPlan}
            />
          )}
          {currentView === "Bills" && (
            <div className="px-10">
              <CafeBillsView onNotify={(msg) => alert(msg)} members={members} />
            </div>
          )}
          {currentView === "Dashboard" && (
            <div className="px-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 col-span-full">
                <div className="glass-technical border-white/5 p-6 rounded-2xl">
                  <h4 className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-widest font-bold">Total Sales Revenue</h4>
                  <p className="text-3xl font-extrabold font-mono text-cyber-lime mt-1">
                    ₹{(() => {
                      return transactions.reduce((sum, t) => {
                        const cafeItems = (t.items || []).filter(item => {
                          if (!item || !item.name) return false;
                          const nameLower = item.name.toLowerCase();
                          return !(nameLower.includes('split bill share') ||
                            nameLower.includes('member due') ||
                            nameLower.includes('due settle') ||
                            nameLower.includes('pay later') ||
                            nameLower.includes('fallback') ||
                            (nameLower.startsWith('split') && !nameLower.includes('(shared)')));
                        });
                        const cafeAmount = cafeItems.reduce((s, item) => s + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
                        let rev = t.amount;
                        if (activeClubPlan === 'snooker_only') {
                          rev = Math.max(0, t.amount - cafeAmount);
                        } else if (activeClubPlan === 'cafe_only') {
                          rev = cafeAmount;
                        }
                        return sum + rev;
                      }, 0).toLocaleString('en-IN', { minimumFractionDigits: 1 });
                    })()}
                  </p>
                </div>
                {activeClubPlan !== 'cafe_only' && (
                  <div className="glass-technical border-white/5 p-6 rounded-2xl">
                    <h4 className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-widest font-bold">Active Snooker Tables</h4>
                    <p className="text-3xl font-extrabold font-mono text-neon-blue mt-1">{tables.filter(t => t.status === 'RUNNING').length}</p>
                  </div>
                )}
                {activeClubPlan !== 'cafe_only' && (
                  <div className="glass-technical border-white/5 p-6 rounded-2xl">
                    <h4 className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-widest font-bold">Registered Members</h4>
                    <p className="text-3xl font-extrabold font-mono text-cyber-lime mt-1">{members.length}</p>
                  </div>
                )}
                {activeClubPlan !== 'snooker_only' && (
                  <div className="glass-technical border-white/5 p-6 rounded-2xl">
                    <h4 className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-widest font-bold">Menu Items Catalog</h4>
                    <p className="text-3xl font-extrabold font-mono text-neon-blue mt-1">{menuItems.length}</p>
                  </div>
                )}
              </div>
              <div className={`grid grid-cols-1 ${activeClubPlan === 'cafe_only' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
                <div className="glass-technical border-white/5 p-6 rounded-2xl">
                  <h3 className="text-xs font-mono tracking-widest uppercase font-bold text-white mb-4">RECENT TRANSACTION LOG</h3>
                  <div className="space-y-3 font-mono text-[11px] text-on-surface-variant">
                    {transactions
                      .map(t => {
                        const cafeItems = (t.items || []).filter(item => {
                          if (!item || !item.name) return false;
                          const nameLower = item.name.toLowerCase();
                          return !(nameLower.includes('split bill share') ||
                            nameLower.includes('member due') ||
                            nameLower.includes('due settle') ||
                            nameLower.includes('pay later') ||
                            nameLower.includes('fallback') ||
                            (nameLower.startsWith('split') && !nameLower.includes('(shared)')));
                        });
                        const cafeAmount = cafeItems.reduce((s, item) => s + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
                        let finalAmt = t.amount;
                        if (activeClubPlan === 'snooker_only') {
                          finalAmt = Math.max(0, t.amount - cafeAmount);
                        } else if (activeClubPlan === 'cafe_only') {
                          finalAmt = cafeAmount;
                        }
                        return { ...t, finalAmt };
                      })
                      .filter(t => t.finalAmt > 0)
                      .slice(0, 5)
                      .map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-white capitalize">{t.description || "General invoice settled"}</span>
                          <span className="text-cyber-lime font-bold">₹{t.finalAmt}</span>
                        </div>
                      ))}
                    {transactions.length === 0 && (
                      <p className="italic text-center py-4">No transactions logged yet.</p>
                    )}
                  </div>
                </div>
                {activeClubPlan !== 'cafe_only' && (
                  <div className="glass-technical border-white/5 p-6 rounded-2xl">
                    <h3 className="text-xs font-mono tracking-widest uppercase font-bold text-white mb-4">RESERVATIONS BREAKDOWN</h3>
                    <div className="space-y-3 font-mono text-[11px] text-on-surface-variant">
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span>Total Bookings Registered:</span>
                        <span className="text-neon-blue font-bold">{bookings.length}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span>Pending Confirmed:</span>
                        <span className="text-amber-400 font-bold">{bookings.filter(b => b.status === "PENDING").length}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span>Confirmed Matches:</span>
                        <span className="text-emerald-400 font-bold">{bookings.filter(b => b.status === "CONFIRMED").length}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {currentView === "Settings" && (
            <SettingsView
              theme={theme}
              onThemeChange={setTheme}
              hhSettings={hhSettings}
              onUpdateHappyHour={updateHappyHourSettings}
              accentColor={accentColor}
              onAccentColorChange={setAccentColor}
              onLogout={handleLogout}
            />
          )}
           {currentView === "Admin Management" && (userRole === "super_admin" || userRole === "owner") && (
            <AdminManagement
              admins={adminAccounts.filter(a => userRole === 'super_admin' ? true : (a.role !== 'super_admin' && a.role !== 'owner'))}
              onAddAdmin={addAdmin}
              onDeleteAdmin={deleteAdmin}
              onUpdatePermissions={updateAdminPermissions}
            />
          )}
          </>
          )}
        </div>

        <ReserveTableModal
          isOpen={isReserveModalOpen}
          table={tableToReserve}
          onClose={() => setIsReserveModalOpen(false)}
          onConfirm={handleAddBooking}
          members={members}
        />

        <TableCafeModal
          isOpen={isCafeModalOpen}
          table={tableForCafe}
          onClose={() => setIsCafeModalOpen(false)}
          onAddOrder={handleAddOrder}
          menuItems={menuItems}
          categories={menuCategories}
          onAddMenuItem={addMenuItem}
        />

        <AddTableModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setTableToEdit(null);
          }}
          onAdd={addTable}
          onEdit={handleUpdateTableSpecs}
          tableToEdit={tableToEdit}
          nextSuggestedNumber={
            userPermissions === "CAFE" ? nextBillNumber : tables.length + 1
          }
          role={userRole}
          permissions={userPermissions}
        />

        <AssignMemberModal
          isOpen={isAssignMemberModalOpen}
          onClose={() => setIsAssignMemberModalOpen(false)}
          onConfirm={confirmAssignMember}
          onAddMember={addMember}
          members={members}
          table={selectedTableForMember}
        />

        <StartPS5Modal
          isOpen={isStartPS5ModalOpen}
          onClose={() => setIsStartPS5ModalOpen(false)}
          onConfirm={confirmStartPS5Session}
          table={selectedTableForPS5}
          members={members}
        />

        <SetTimeModal
          isOpen={isSetTimeModalOpen}
          onClose={() => setIsSetTimeModalOpen(false)}
          table={selectedTableForSetTime}
          onSave={handleUpdateTimer}
          members={members}
        />

        {/* FAB */}
        {userPermissions !== "CAFE" && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAddModalOpen(true)}
            className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-neon-blue-glow text-on-primary flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_40px_rgba(0,240,255,0.6)] z-50 transition-all font-bold"
          >
            <Plus size={32} />
          </motion.button>
        )}

        <footer className="mt-auto px-10 py-8 border-t border-white/5 flex justify-between items-center bg-obsidian-950/40">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyber-lime shadow-[0_0_8px_#bcff5f]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant/40">
              Network Cluster Status: STABLE
            </span>
          </div>

          <div className="text-[10px] font-mono text-on-surface-variant/20 uppercase tracking-[0.2em]">
            © 2024 Obsidian Tech Group | Secure Terminal
          </div>
        </footer>
      </main>

      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              onClick={() => handleNotificationClick(notif)}
              className="glass-technical border border-neon-blue/40 bg-black/90 backdrop-blur-md p-4 rounded-xl shadow-[0_0_25px_rgba(0,195,255,0.2)] flex gap-3 items-start cursor-pointer group hover:border-cyber-lime/60 hover:shadow-[0_0_30px_rgba(0,195,255,0.3)] transition-all duration-300 pointer-events-auto"
            >
              <div className="w-8 h-8 rounded-lg bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center shrink-0 group-hover:border-cyber-lime/40 group-hover:bg-cyber-lime/10 transition-all text-neon-blue group-hover:text-cyber-lime animate-pulse">
                <Calendar size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold text-cyber-lime uppercase tracking-widest">
                    RESERVATION_ALERT
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notif.id);
                    }}
                    className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[11px] text-on-surface/90 font-mono mt-1 leading-normal">
                  {notif.message}
                </p>
                <div className="flex items-center gap-1 mt-2 text-[9px] font-mono text-neon-blue uppercase tracking-widest font-bold group-hover:text-cyber-lime transition-colors">
                  <span>JUMP TO BOOKINGS TAB</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hidden Thermal Printer 80mm Custom Bill Layout */}
      {receiptToPrint && (
        <div id="printable-invoice" className="hidden print:block bg-white text-black p-4 font-mono text-[10px] uppercase tracking-wide leading-relaxed">
          <div className="text-center font-bold text-xs border-b border-dashed border-black pb-3 mb-3">
            <p className="text-sm tracking-wider uppercase font-extrabold mb-1">OBSIDIAN SNOOKER LOUNGE</p>
            <p className="text-[8px] font-normal tracking-wide lowercase mb-0.5">premium billiard-felt parlor</p>
            <p className="text-[9px] font-normal tracking-widest mt-1">DUPLICATE CUSTOMER INVOICE</p>
          </div>

          <div className="space-y-1 mb-4 border-b border-dashed border-black pb-3">
            <div className="flex justify-between">
              <span>BILL ID:</span>
              <span className="font-bold">#INV-{receiptToPrint.billNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>DATE/TIME:</span>
              <span>{receiptToPrint.date}</span>
            </div>
            <div className="flex justify-between">
              <span>OPERATOR:</span>
              <span>{supabaseService.getActiveAdminUsername() || "ADMIN"}</span>
            </div>
            <div className="flex justify-between">
              <span>CUSTOMER:</span>
              <span className="font-bold">{receiptToPrint.player}</span>
            </div>
            <div className="flex justify-between">
              <span>ITEM/UNIT:</span>
              <span className="font-bold">{receiptToPrint.tableName} ({receiptToPrint.type})</span>
            </div>
          </div>

          <div className="mb-4">
            <p className="font-bold border-b border-dashed border-black pb-1 mb-2 tracking-widest">SESSION TIMELOG</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>START TIME:</span>
                <span>{receiptToPrint.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span>END TIME:</span>
                <span>{receiptToPrint.endTime}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-black/20">
                <span>ELAPSED DURATION:</span>
                <span>{receiptToPrint.duration}</span>
              </div>
            </div>
          </div>

          {receiptToPrint.items && receiptToPrint.items.length > 0 && (
            <div className="mb-4">
              <p className="font-bold border-b border-dashed border-black pb-1 mb-2 tracking-widest">CAFE CONSOLIDATED ORDERS</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dashed border-black/40">
                    <th className="font-bold pb-1 text-left">ITEM</th>
                    <th className="font-bold text-center pb-1">QTY</th>
                    <th className="font-bold text-right pb-1">AMT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-black/20">
                  {receiptToPrint.items.map((it: any, idx: number) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 pr-1">{it.name}</td>
                      <td className="py-1 text-center font-bold">x{it.quantity.toFixed(1)}</td>
                      <td className="py-1 text-right">₹{(it.price * it.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {receiptToPrint.breakdowns && receiptToPrint.breakdowns.length > 1 && (
            <div className="mb-4 border-t border-dashed border-black pt-3">
              <p className="font-bold border-b border-dashed border-black pb-1 mb-2 tracking-widest">PLAYER-WISE SHARE SUMMARY</p>
              <div className="space-y-2">
                {receiptToPrint.breakdowns.map((b: any, idx: number) => (
                  <div key={idx} className="border-b border-dashed border-black/10 pb-1.5 last:border-b-0">
                    <div className="flex justify-between font-bold text-[9px]">
                      <span>{b.name} ({b.memberId ? "MEMBER" : "GUEST"})</span>
                      <span>₹{b.total.toFixed(2)}</span>
                    </div>
                    <div className="pl-2 space-y-0.5 mt-0.5 text-[8px] text-black/60 font-mono">
                      <div className="flex justify-between">
                        <span>- Table Session Charge (Pro-rata)</span>
                        <span>₹{b.sessionCost.toFixed(2)}</span>
                      </div>
                      {b.cafeCost > 0 && (
                        <div className="flex justify-between">
                          <span>- Cafe Direct/Share Charge</span>
                          <span>₹{b.cafeCost.toFixed(2)}</span>
                        </div>
                      )}
                      {b.discount > 0 && (
                        <div className="flex justify-between">
                          <span>- Applied Discount (Pro-rata)</span>
                          <span>-₹{b.discount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-black pt-3 space-y-1 mt-6 text-xs font-bold font-mono">
            <div className="flex justify-between text-[11px] font-normal text-black/80">
              <span>BASE SESSION CHARGE:</span>
              <span>₹{receiptToPrint.sessionCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-normal text-black/80 border-b border-dashed border-black/20 pb-1">
              <span>TOTAL CAFE BILL:</span>
              <span>₹{receiptToPrint.cafeCost.toFixed(2)}</span>
            </div>
            {receiptToPrint.discount > 0 && (
              <div className="flex justify-between text-black/80 text-[11px]">
                <span>APPLIED DISC:</span>
                <span>-₹{receiptToPrint.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold border-t border-b-2 border-black border-dashed py-1.5 uppercase my-2 tracking-[0.1em]">
              <span>TOTAL DUE PAID:</span>
              <span>₹{receiptToPrint.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono tracking-wide font-normal pt-1 text-black/75">
              <span>SETTLE METHOD:</span>
              <span className="font-bold">{receiptToPrint.paymentMethod}</span>
            </div>
          </div>

          <div className="text-center font-normal text-[8px] leading-relaxed mt-8 border-t border-dashed border-black/40 pt-4 pb-2">
            <p className="font-bold">*** COMPLETED TRANSACTION ***</p>
            <p className="mt-1">THANK YOU FOR PLAYING AT THE OBSIDIAN!</p>
            <p>CONV: {receiptToPrint.billNumber} | SYSTEM CLUE-CONTROL V1</p>
          </div>
        </div>
      )}
    </div>
  );
}
