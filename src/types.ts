export type AdminRole = 'admin' | 'admin1' | 'admin2' | 'admin3' | 'super_admin' | 'owner' | 'club_admin';

export interface Club {
  id: string;
  name: string;
  owner_id: string | null;
  subscription_plan?: 'cafe_only' | 'snooker_only' | 'full';
  subscription_status: 'active' | 'suspended';
  created_at?: string;
}

export interface UserProfile {
  id: string;
  role: 'super_admin' | 'owner' | 'club_admin';
  owner_id: string | null;
  club_id: string | null;
  created_at?: string;
}

export interface AdminAccount {
  id: string;
  role: AdminRole;
  username: string;
  cipher: string;
  permissions: 'CAFE' | 'SNOOKER' | 'BOTH';
}

export type TableStatus = 'RUNNING' | 'AVAILABLE' | 'MAINTENANCE' | 'RESERVED';

export interface SnookerTable {
  id: string;
  number: string;
  billNumber?: string;
  type: 'Snooker' | 'Pool' | 'PS5' | 'Mini Snooker' | 'Other Games';
  status: TableStatus;
  rate: number;
  rateUnit: 'min' | 'hr';
  player?: string;
  startTime?: string;
  elapsedTime?: string;
  cost?: number;
  sessionCost?: number;
  cafeCost?: number;
  currentCart?: { item: MenuItem; quantity: number }[];
  isPaused?: boolean;
  pauseStartTimeUnix?: number;
  totalPausedSeconds?: number;
  startTimeUnix?: number;
  lastPausedAt?: number;
  totalPausedTime?: number;
  maintenanceNote?: string;
  reservationTime?: string;
  note?: string;
  ps5Costs?: { p1: number; p2: number; p3: number; p4: number };
  playersCount?: 1 | 2 | 3 | 4;
  currentMemberId?: string | null;
  pendingBillId?: string;
}

export interface Member {
  id: string;
  name: string;
  contact: string;
  joinedDate: string;
  status: 'Active' | 'Inactive';
  dueAmount?: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'PAY_LATER';
  tableNumber: string;
  playerName: string;
  memberId?: string | null;
  items?: { name: string; price: number; quantity: number }[];
  duration: string;
}

export interface ClubStats {
  liveRevenue: number;
  occupancy: number;
  activeCount: number;
  totalCount: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available?: boolean;
}

export interface Expenditure {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: 'Supplies' | 'Maintenance' | 'Rent' | 'Utilities' | 'Salaries' | 'Other';
  paymentMethod?: 'CASH' | 'UPI' | 'PAY_LATER';
}

export interface HappyHourSettings {
  id: string;
  isEnabled: boolean;
  snookerRate: number;
  poolRate: number;
  ps5Rate: number;
  miniSnookerRate: number;
  otherRate: number;
  lastEnabledAt?: string;
  cumulativeDurationSeconds?: number;
  updatedAt: string;
}

export interface PendingBill {
  id: string;
  tableId: string;
  tableNumber: string;
  player: string;
  amount: number;
  sessionCost: number;
  cafeCost: number;
  elapsedTime: string;
  memberId?: string | null;
  cart?: { item: { id: string; name: string; price: number; category: string }; quantity: number }[];
  createdAt: string;
}

export interface Booking {
  id: string;
  tableId: string;
  tableNumber: string;
  playerName: string;
  contact: string;
  bookingDate: string; // e.g. "YYYY-MM-DD"
  startTime: string;   // e.g. "14:00"
  endTime?: string;    // e.g. "16:00"
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  note?: string;
  createdAt: string;

  // Schema Enhancements
  memberId?: string | null;
  numberOfPlayers?: number;
  advancePaid?: number;
  depositPaymentMethod?: 'UPI' | 'CASH' | null;
  createdByAdmin?: string;
}

export interface CafeBill {
  id: string;
  club_id: string;
  member_id?: string | null;
  bill_number: string;
  customer_name: string;
  total_amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  items?: CafeBillItem[];
}

export interface CafeBillItem {
  id: string;
  bill_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  menu_item_name?: string;
}

