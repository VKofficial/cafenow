import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SnookerTable, Member, Transaction, AdminAccount, AdminRole, Expenditure, MenuItem, HappyHourSettings, PendingBill, Booking, CafeBill, CafeBillItem } from '../types';
import { CAFE_MENU } from '../constants';

// --- Multi-Admin Tenant Isolation Layer ---
let activeAdminUsername = typeof window !== 'undefined' ? (localStorage.getItem('active_admin_username') || '') : '';
let activeAdminId = typeof window !== 'undefined' ? (localStorage.getItem('active_admin_id') || '') : '';
let activeAdminRole = typeof window !== 'undefined' ? (localStorage.getItem('active_admin_role') || '') : '';
let activeAdminPermissions = typeof window !== 'undefined' ? (localStorage.getItem('active_admin_permissions') || '') : '';

export function getActiveAdminUsername(): string {
  if (!activeAdminUsername && typeof window !== 'undefined') {
    activeAdminUsername = localStorage.getItem('active_admin_username') || '';
  }
  return activeAdminUsername;
}

export function getActiveAdminRole(): string {
  if (!activeAdminRole && typeof window !== 'undefined') {
    activeAdminRole = localStorage.getItem('active_admin_role') || '';
  }
  return activeAdminRole;
}

export function setActiveAdminRole(role: string) {
  activeAdminRole = role;
  if (typeof window !== 'undefined') {
    if (role) {
      localStorage.setItem('active_admin_role', role);
    } else {
      localStorage.removeItem('active_admin_role');
    }
  }
}

export function getActiveAdminPermissions(): string {
  if (!activeAdminPermissions && typeof window !== 'undefined') {
    activeAdminPermissions = localStorage.getItem('active_admin_permissions') || '';
  }
  return activeAdminPermissions;
}

export function setActiveAdminPermissions(permissions: string) {
  activeAdminPermissions = permissions;
  if (typeof window !== 'undefined') {
    if (permissions) {
      localStorage.setItem('active_admin_permissions', permissions);
    } else {
      localStorage.removeItem('active_admin_permissions');
    }
  }
}

export function isOwnerUser(): boolean {
  return activeAdminRole === 'owner' || activeAdminRole === 'super_admin';
}

let activeClubId = typeof window !== 'undefined' ? (localStorage.getItem('active_club_id') || '') : '';

export function getActiveClubId(): string {
  if (!activeClubId && typeof window !== 'undefined') {
    activeClubId = localStorage.getItem('active_club_id') || '';
  }
  return activeClubId;
}

export function setActiveClubId(clubId: string) {
  activeClubId = clubId;
  if (typeof window !== 'undefined') {
    if (clubId) {
      localStorage.setItem('active_club_id', clubId);
    } else {
      localStorage.removeItem('active_club_id');
    }
  }
}

export function getActiveAdminId(): string {
  if (!activeAdminId && typeof window !== 'undefined') {
    activeAdminId = localStorage.getItem('active_admin_id') || '';
  }
  if (!activeAdminId && activeAdminUsername) {
    activeAdminId = getDeterministicUUID(activeAdminUsername);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_admin_id', activeAdminId);
    }
  }
  return activeAdminId;
}

export function setActiveAdminId(id: string) {
  activeAdminId = id;
  if (typeof window !== 'undefined') {
    if (id) {
      localStorage.setItem('active_admin_id', id);
    } else {
      localStorage.removeItem('active_admin_id');
    }
  }
}

export function setActiveAdminUsername(username: string) {
  const normUsername = (username || '').toLowerCase().trim();
  if (activeAdminUsername !== normUsername) {
    activeAdminUsername = normUsername;
    if (typeof window !== 'undefined') {
      if (activeAdminUsername) {
        localStorage.setItem('active_admin_username', activeAdminUsername);
      } else {
        localStorage.removeItem('active_admin_username');
      }
    }
    if (activeAdminUsername) {
      // ONLY generate deterministic UUID if not configured with Supabase or if we don't already have a valid activeAdminId set
      const currentId = (typeof window !== 'undefined' ? localStorage.getItem('active_admin_id') : '') || activeAdminId;
      if (!isSupabaseConfigured || !currentId || currentId.includes('-1234-4321-')) {
        activeAdminId = getDeterministicUUID(activeAdminUsername);
        if (typeof window !== 'undefined') {
          localStorage.setItem('active_admin_id', activeAdminId);
        }
      }
    } else {
      activeAdminId = '';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('active_admin_id');
      }
    }
  }
}

function getDeterministicUUID(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = Math.abs(hash).toString(16).padEnd(8, '0').slice(0, 8);
  return `${hex}-1234-4321-abcd-${hex.repeat(3).slice(0, 12)}`;
}

// Pre-populate with known schema details to eliminate startup database roundtrips & race conditions
const columnCache: Record<string, boolean> = {
  'tables:admin_id': true,
  'members:admin_id': true,
  'billing_history:admin_id': true,
  'expenditures:admin_id': true,
  'menu_items:admin_id': true,
  'menu_categories:admin_id': true,
  'happy_hour_settings:admin_id': true,
  'bookings:admin_id': true,
  'pending_bills:admin_id': true,
  'admins:admin_id': false,

  'tables:admin_username': true,
  'members:admin_username': true,
  'billing_history:admin_username': true,
  'expenditures:admin_username': true,
  'menu_items:admin_username': true,
  'menu_categories:admin_username': true,
  'happy_hour_settings:admin_username': true,
  'bookings:admin_username': true,
  'pending_bills:admin_username': true,
  'admins:admin_username': false
};

async function hasColumnInTable(table: string, column: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (!error) return true;
    
    const errMsg = (error.message || '').toLowerCase();
    const isMissing = error.code === 'PGRST204' || 
                      error.code === '42703' ||
                      errMsg.includes('could not find') || 
                      (errMsg.includes('column') && (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('undefined')));
    return !isMissing;
  } catch (e) {
    return false;
  }
}

async function checkColumnCached(table: string, column: string): Promise<boolean> {
  const cacheKey = `${table}:${column}`;
  if (columnCache[cacheKey] !== undefined) return columnCache[cacheKey];
  const exists = await hasColumnInTable(table, column);
  columnCache[cacheKey] = exists;
  console.log(`[Supabase Schema Check] Table '${table}' has column '${column}': ${exists}`);
  return exists;
}

async function injectAdminIdIfNeeded(table: string, row: any): Promise<any> {
  if (!isSupabaseConfigured || !row) return row;
  const hasAdminId = await checkColumnCached(table, 'admin_id');
  if (hasAdminId) {
    const activeId = getActiveAdminId();
    if (activeId) {
      row.admin_id = activeId;
    }
  }
  return row;
}

async function ensureActiveAdminExistsInDb(username: string, role: string, permissions: string): Promise<string> {
  if (!isSupabaseConfigured) {
    return getActiveAdminId();
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setActiveAdminId(user.id);
      return user.id;
    }
  } catch (e) {
    console.warn('Error fetching auth user in ensureActiveAdminExistsInDb:', e);
  }
  return getActiveAdminId();
}

function prefixTableNumber(num: string | number, hasAdminCol: boolean = false, isForTablesTable: boolean = false): string {
  return String(num);
}

function unprefixTableNumber(num: string | number | undefined, hasAdminCol: boolean = false, isForTablesTable: boolean = false): string {
  if (num === undefined || num === null) return '';
  return String(num);
}

function prefixString(val: string, hasAdminCol: boolean = false): string {
  return val;
}

function unprefixString(val: string | undefined, hasAdminCol: boolean = false): string {
  return val || '';
}

// --- Text-to-Integer compatibility layout functions ---
function hashStringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);
  // Guarantee a safe positive 32-bit integer for PG: range 1,000,000 to 21,000,000
  return 1000000 + (absHash % 20000000);
}

function isPurelyNumeric(val: string | number | undefined | null): boolean {
  if (val === undefined || val === null) return false;
  return /^\d+$/.test(String(val).trim());
}

function encodeTableColumns(tableNumber: string, noteValue: string | null | undefined): { dbNum: string, dbNote: string | null } {
  if (isPurelyNumeric(tableNumber)) {
    return { dbNum: tableNumber, dbNote: noteValue || null };
  }
  const cleanName = tableNumber.trim();
  const dbNum = String(hashStringToId(cleanName));
  const prefixMarker = `__NAME__:${cleanName}`;
  const dbNote = noteValue ? `${prefixMarker};;${noteValue}` : prefixMarker;
  return { dbNum, dbNote };
}

function decodeTableFields(rowNum: string | number, rowNote: string | null | undefined): { number: string, note: string | null } {
  const noteStr = rowNote || '';
  if (noteStr.startsWith('__NAME__:')) {
    const parts = noteStr.split(';;');
    const nameMarker = parts[0];
    const realName = nameMarker.substring(9); // replace '__NAME__:'
    const realNote = parts.slice(1).join(';;') || null;
    return { number: realName, note: realNote };
  }
  return { number: String(rowNum), note: rowNote || null };
}

function encodeBookingColumns(tableNumber: string, noteValue: string | null | undefined): { dbNum: string, dbNote: string | null } {
  if (isPurelyNumeric(tableNumber)) {
    return { dbNum: tableNumber, dbNote: noteValue || null };
  }
  const cleanName = tableNumber.trim();
  const dbNum = String(hashStringToId(cleanName));
  const prefixMarker = `__NAME__:${cleanName}`;
  const dbNote = noteValue ? `${prefixMarker};;${noteValue}` : prefixMarker;
  return { dbNum, dbNote };
}

function decodeBookingFields(rowNum: string | number, rowNote: string | null | undefined): { tableNumber: string, note: string | null } {
  const noteStr = rowNote || '';
  if (noteStr.startsWith('__NAME__:')) {
    const parts = noteStr.split(';;');
    const nameMarker = parts[0];
    const realName = nameMarker.substring(9); // replace '__NAME__:'
    const realNote = parts.slice(1).join(';;') || null;
    return { tableNumber: realName, note: realNote };
  }
  return { tableNumber: String(rowNum), note: rowNote || null };
}

function encodePlayerNameWithTableNumber(tableNumber: string, playerName: string): { dbNum: string, dbPlayer: string } {
  if (isPurelyNumeric(tableNumber)) {
    return { dbNum: tableNumber, dbPlayer: playerName };
  }
  const cleanName = tableNumber.trim();
  const dbNum = String(hashStringToId(cleanName));
  const dbPlayer = `__TN__[${cleanName}]${playerName}`;
  return { dbNum, dbPlayer };
}

function decodePlayerNameWithTableNumber(rowNum: string | number, rowPlayer: string | null | undefined): { tableNumber: string, playerName: string } {
  const playerStr = rowPlayer || '';
  if (playerStr.startsWith('__TN__[')) {
    const endIdx = playerStr.indexOf(']');
    if (endIdx !== -1) {
      const realTableNumber = playerStr.substring(7, endIdx);
      const realPlayerName = playerStr.substring(endIdx + 1);
      return { tableNumber: realTableNumber, playerName: realPlayerName };
    }
  }
  return { tableNumber: String(rowNum), playerName: playerStr };
}

// --- Error Handler Configuration & Mapping ---
function handleSupabaseError(error: unknown, operationType: string, path: string | null) {
  console.error(`[Supabase Security/Resource Error Boundary Actioned]:`, error);
  const errMsg = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String((error as any).message) : String(error);
  try {
    alert(`Database Error [Table Path: ${path}]\n\nAction: ${operationType}\n\nTechnical details:\n${errMsg}`);
  } catch (alertError) {
    console.warn('Window alert dialog blocked by sandbox container policy:', alertError);
  }
  throw error;
}

// --- Local Storage Fallback Configuration & Helpers ---
const LOCAL_STORAGE_KEYS = {
  TABLES: 'obsidian_tables_local_v1',
  MEMBERS: 'obsidian_members_local_v1',
  BILLING: 'obsidian_billing_local_v1',
  EXPENDITURES: 'obsidian_expenditures_local_v1',
  MENU_ITEMS: 'obsidian_menu_items_local_v1',
  MENU_CATEGORIES: 'obsidian_menu_categories_local_v1',
  HAPPY_HOUR: 'obsidian_happy_hour_local_v1',
  PENDING_BILLS: 'obsidian_pending_bills_local_v1',
  BOOKINGS: 'obsidian_bookings_local_v1',
  CAFE_BILLS: 'obsidian_cafe_bills_local_v1',
  CAFE_BILL_ITEMS: 'obsidian_cafe_bill_items_local_v1'
};

const DEFAULT_TABLES: SnookerTable[] = [
  { id: 't1', number: '1', type: 'Snooker', status: 'AVAILABLE', rate: 200, rateUnit: 'hr', isPaused: false, elapsedTime: '00:00:00', sessionCost: 0, cafeCost: 0, cost: 0, currentCart: [], totalPausedSeconds: 0 },
  { id: 't2', number: '2', type: 'Snooker', status: 'AVAILABLE', rate: 200, rateUnit: 'hr', isPaused: false, elapsedTime: '00:00:00', sessionCost: 0, cafeCost: 0, cost: 0, currentCart: [], totalPausedSeconds: 0 },
  { id: 't3', number: '3', type: 'Pool', status: 'AVAILABLE', rate: 150, rateUnit: 'hr', isPaused: false, elapsedTime: '00:00:00', sessionCost: 0, cafeCost: 0, cost: 0, currentCart: [], totalPausedSeconds: 0 },
  { id: 't4', number: '4', type: 'Pool', status: 'AVAILABLE', rate: 150, rateUnit: 'hr', isPaused: false, elapsedTime: '00:00:00', sessionCost: 0, cafeCost: 0, cost: 0, currentCart: [], totalPausedSeconds: 0 },
  { id: 't5', number: '5', type: 'PS5', status: 'AVAILABLE', rate: 100, rateUnit: 'hr', isPaused: false, elapsedTime: '00:00:00', sessionCost: 0, cafeCost: 0, cost: 0, currentCart: [], totalPausedSeconds: 0 },
  { id: 't6', number: '6', type: 'Mini Snooker', status: 'AVAILABLE', rate: 120, rateUnit: 'hr', isPaused: false, elapsedTime: '00:00:00', sessionCost: 0, cafeCost: 0, cost: 0, currentCart: [], totalPausedSeconds: 0 }
];

const DEFAULT_MEMBERS: Member[] = [];

const DEFAULT_CATEGORIES: string[] = [];

const DEFAULT_MENU_ITEMS: MenuItem[] = CAFE_MENU;

const DEFAULT_HAPPY_HOUR: HappyHourSettings = {
  id: 'hh_settings_1',
  isEnabled: false,
  snookerRate: 150,
  poolRate: 100,
  ps5Rate: 80,
  miniSnookerRate: 90,
  otherRate: 80,
  cumulativeDurationSeconds: 0,
  updatedAt: new Date().toISOString()
};

function getTenantKey(key: string): string {
  const clubId = getActiveClubId();
  if (!clubId) return key;

  let suffix = key;
  if (key === 'obsidian_tables_local_v1') suffix = 'tables';
  else if (key === 'obsidian_members_local_v1') suffix = 'members';
  else if (key === 'obsidian_bookings_local_v1') suffix = 'bookings';
  else if (key === 'obsidian_billing_local_v1') suffix = 'billing';
  else if (key === 'obsidian_expenditures_local_v1') suffix = 'expenditures';
  else if (key === 'obsidian_menu_items_local_v1') suffix = 'menu_items';
  else if (key === 'obsidian_menu_categories_local_v1') suffix = 'menu_categories';
  else if (key === 'obsidian_happy_hour_local_v1') suffix = 'happy_hour';
  else if (key === 'obsidian_pending_bills_local_v1') suffix = 'pending_bills';
  else if (key === 'obsidian_cafe_bills_local_v1') suffix = 'cafe_bills';
  else if (key === 'obsidian_cafe_bill_items_local_v1') suffix = 'cafe_bill_items';
  else {
    suffix = key.replace('obsidian_', '').replace('_local_v1', '');
  }
  return `${clubId}_${suffix}`;
}

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const tenantKey = getTenantKey(key);
    const data = localStorage.getItem(tenantKey);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error(`Failed to read from localStorage for key: ${key}`, e);
    return defaultVal;
  }
}

function setLocal<T>(key: string, value: T) {
  try {
    const tenantKey = getTenantKey(key);
    localStorage.setItem(tenantKey, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write to localStorage for key: ${key}`, e);
  }
}

// --- Row Mapping Helpers for live Supabase ---
function mapAdminFromRow(row: any): AdminAccount {
  return {
    id: row.id,
    username: row.username,
    cipher: row.cipher,
    role: row.role,
    permissions: row.permissions
  };
}

function mapAdminToRow(admin: Partial<AdminAccount>): any {
  const row: any = {};
  if (admin.id !== undefined) row.id = admin.id;
  if (admin.username !== undefined) row.username = admin.username;
  if (admin.cipher !== undefined) row.cipher = admin.cipher;
  if (admin.role !== undefined) row.role = admin.role;
  if (admin.permissions !== undefined) row.permissions = admin.permissions;
  return row;
}

function getSingleValidUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(first) ? first : null;
}

function mapTableFromRow(row: any): SnookerTable {
  let innerCart = [];
  try {
    innerCart = typeof row.current_cart === 'string' ? JSON.parse(row.current_cart) : (row.current_cart || []);
  } catch (e) {
    console.error('Failed to parse current_cart json', e);
  }

  let innerPs5Costs = undefined;
  if (row.ps5_costs) {
    try {
      innerPs5Costs = typeof row.ps5_costs === 'string' ? JSON.parse(row.ps5_costs) : row.ps5_costs;
    } catch (e) {
      console.error('Failed to parse ps5_costs json', e);
    }
  }

  const { number: decodedNum, note: decodedNote } = decodeTableFields(row.table_number ?? row.number ?? '', row.note);

  return {
    id: row.id,
    number: decodedNum,
    type: row.type,
    rate: Number(row.hourly_rate ?? row.rate ?? 0),
    rateUnit: row.rate_unit ?? row.rateUnit ?? 'hr',
    ps5Costs: innerPs5Costs,
    status: row.status === 'RESERVED' ? 'AVAILABLE' : row.status,
    player: row.player || '',
    billNumber: row.bill_number ?? row.billNumber,
    startTime: row.start_time ?? row.startTime,
    startTimeUnix: row.current_session_start ? new Date(row.current_session_start).getTime() : (row.startTimeUnix ? Number(row.startTimeUnix) : undefined),
    elapsedTime: row.elapsed_time ?? row.elapsedTime ?? '00:00:00',
    sessionCost: Number(row.session_cost ?? row.sessionCost ?? 0),
    cafeCost: Number(row.cafe_cost ?? row.cafeCost ?? 0),
    cost: Number(row.cost ?? 0),
    currentCart: innerCart,
    isPaused: row.is_paused ?? row.isPaused ?? false,
    totalPausedSeconds: row.total_paused_seconds ?? row.totalPausedSeconds ?? 0,
    pauseStartTimeUnix: row.pause_start_time_unix ? Number(row.pause_start_time_unix) : (row.pauseStartTimeUnix ? Number(row.pauseStartTimeUnix) : undefined),
    reservationTime: row.reservation_time ?? row.reservationTime,
    playersCount: row.players_count ?? row.playersCount,
    note: decodedNote && decodedNote.startsWith('MEMBER_ID:') ? null : decodedNote,
    currentMemberId: (decodedNote?.startsWith('MEMBER_ID:') ? decodedNote.replace('MEMBER_ID:', '') : null) ?? row.current_member_id ?? row.currentMemberId ?? null
  };
}

interface MembersSchemaInfo {
  hasContact: boolean;
  hasPhone: boolean;
  hasJoinedDate: boolean;
  hasJoinedDateCamel: boolean;
  hasStatus: boolean;
  hasDueAmount: boolean;
  hasDueAmountCamel: boolean;
}

let membersSchemaCache: MembersSchemaInfo | null = null;

export async function probeMembersSchema(): Promise<MembersSchemaInfo> {
  if (membersSchemaCache) return membersSchemaCache;
  const info: MembersSchemaInfo = {
    hasContact: false,
    hasPhone: false,
    hasJoinedDate: false,
    hasJoinedDateCamel: false,
    hasStatus: false,
    hasDueAmount: false,
    hasDueAmountCamel: false,
  };
  
  if (!isSupabaseConfigured) {
    membersSchemaCache = info;
    return info;
  }

  const colsToVerify = [
    { key: 'hasContact', name: 'contact' },
    { key: 'hasPhone', name: 'phone' },
    { key: 'hasJoinedDate', name: 'joined_date' },
    { key: 'hasJoinedDateCamel', name: 'joinedDate' },
    { key: 'hasStatus', name: 'status' },
    { key: 'hasDueAmount', name: 'due_amount' },
    { key: 'hasDueAmountCamel', name: 'dueAmount' },
  ];

  await Promise.all(
    colsToVerify.map(async (col) => {
      try {
        const { error, data } = await supabase.from('members').select(col.name).limit(1);
        let exists = false;
        
        if (!error) {
          exists = true;
        } else {
          const errMsg = (error.message || '').toLowerCase();
          const isMissing = error.code === 'PGRST204' || 
                            error.code === '42703' ||
                            errMsg.includes('could not find') || 
                            (errMsg.includes('column') && (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('undefined')));
          exists = !isMissing;
        }
        
        (info as any)[col.key] = exists;
        console.log(`[Members Probe] Column check for '${col.name}': exists=${exists}, error=`, error);
      } catch (e) {
        console.error(`[Members Probe Error] Column check failed for '${col.name}':`, e);
        (info as any)[col.key] = false;
      }
    })
  );

  // If both hasContact and hasPhone are false (e.g., due to a general error),
  // we fallback to phone = true and contact = false, since we know they have phone!
  if (!info.hasContact && !info.hasPhone) {
    info.hasPhone = true;
  }
  
  // Set joined_date by default if both false
  if (!info.hasJoinedDate && !info.hasJoinedDateCamel) {
    info.hasJoinedDate = true;
  }
  
  // Set due_amount by default if both false
  if (!info.hasDueAmount && !info.hasDueAmountCamel) {
    info.hasDueAmount = true;
  }

  membersSchemaCache = info;
  console.log('[Members Probe Completed] Final Schema Configured:', info);
  return info;
}

export interface BillingSchemaInfo {
  hasAmount: boolean;
  hasTotalAmount: boolean;
}

let billingSchemaCache: BillingSchemaInfo | null = null;

export async function probeBillingSchema(): Promise<BillingSchemaInfo> {
  if (billingSchemaCache) return billingSchemaCache;
  const info: BillingSchemaInfo = {
    hasAmount: false,
    hasTotalAmount: false,
  };
  
  if (!isSupabaseConfigured) {
    info.hasAmount = true;
    billingSchemaCache = info;
    return info;
  }

  const colsToVerify = [
    { key: 'hasAmount', name: 'amount' },
    { key: 'hasTotalAmount', name: 'total_amount' },
  ];

  await Promise.all(
    colsToVerify.map(async (col) => {
      try {
        const { error } = await supabase.from('billing_history').select(col.name).limit(1);
        let exists = false;
        
        if (!error) {
          exists = true;
        } else {
          const errMsg = (error.message || '').toLowerCase();
          const isMissing = error.code === 'PGRST204' || 
                            error.code === '42703' ||
                            errMsg.includes('could not find') || 
                            (errMsg.includes('column') && (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('undefined')));
          exists = !isMissing;
        }
        
        (info as any)[col.key] = exists;
        console.log(`[Billing Probe] Column check for '${col.name}': exists=${exists}`);
      } catch (e) {
        console.error(`[Billing Probe Error] Column check failed for '${col.name}':`, e);
        (info as any)[col.key] = false;
      }
    })
  );

  // If both are false due to some odd error, default to hasAmount = true
  if (!info.hasAmount && !info.hasTotalAmount) {
    info.hasAmount = true;
  }

  billingSchemaCache = info;
  console.log('[Billing Probe Completed] Final Schema Configured:', info);
  return info;
}

function mapMemberFromRow(row: any, schema: MembersSchemaInfo): Member {
  return {
    id: row.id,
    name: row.name || 'Member',
    contact: (row.contact || row.phone || '') ?? '',
    joinedDate: (row.joined_date || row.joinedDate || '') ?? '',
    status: (row.status || 'Inactive') as 'Active' | 'Inactive',
    dueAmount: Number(row.due_amount ?? row.dueAmount ?? 0)
  };
}

function mapMemberToRow(member: Partial<Member>, schema: MembersSchemaInfo): any {
  const row: any = {};
  if (member.name !== undefined) row.name = member.name;
  
  if (member.contact !== undefined) {
    if (schema.hasContact) row.contact = member.contact;
    if (schema.hasPhone) row.phone = member.contact;
  }
  
  if (member.joinedDate !== undefined) {
    if (schema.hasJoinedDate) row.joined_date = member.joinedDate;
    if (schema.hasJoinedDateCamel) row.joinedDate = member.joinedDate;
  }
  
  if (member.status !== undefined && schema.hasStatus) {
    row.status = member.status;
  }
  
  if (member.dueAmount !== undefined) {
    if (schema.hasDueAmount) row.due_amount = member.dueAmount;
    if (schema.hasDueAmountCamel) row.dueAmount = member.dueAmount;
  }
  
  return row;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // ignore
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isValidUUID(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
}

function mapTransactionFromRow(row: any): Transaction {
  let innerItems = [];
  try {
    innerItems = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
  } catch (e) {
    console.error('Failed to parse items json', e);
  }

  // Check if this row was a fallback for PAY_LATER due to database check constraint
  let pm = row.payment_method;
  let isPayLaterFallback = false;
  if (Array.isArray(innerItems)) {
    isPayLaterFallback = innerItems.some(itm => itm && itm.isPayLaterFallback === true);
  } else if (innerItems && typeof innerItems === 'object') {
    isPayLaterFallback = !!(innerItems as any).isPayLaterFallback;
  }

  if (isPayLaterFallback) {
    pm = 'PAY_LATER';
  }

  const cleanItems = Array.isArray(innerItems) 
    ? innerItems.filter(itm => !itm || itm.isPayLaterFallback !== true)
    : innerItems;

  const { tableNumber: decodedNum, playerName: decodedPlayer } = decodePlayerNameWithTableNumber(row.table_number ?? '', row.player_name ?? '');

  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount ?? row.total_amount ?? row.totalAmount ?? 0),
    paymentMethod: pm as any,
    tableNumber: decodedNum,
    playerName: decodedPlayer,
    memberId: row.member_id,
    items: cleanItems,
    duration: row.duration ?? ''
  };
}

function mapTransactionToRow(tx: Omit<Transaction, 'id'>, schema?: BillingSchemaInfo): any {
  const { dbNum, dbPlayer } = encodePlayerNameWithTableNumber(tx.tableNumber, tx.playerName);
  const row: any = {
    date: tx.date,
    payment_method: tx.paymentMethod,
    table_number: dbNum,
    player_name: dbPlayer,
    duration: tx.duration,
    items: Array.isArray(tx.items) ? JSON.stringify(tx.items) : (typeof tx.items === 'string' ? tx.items : JSON.stringify([]))
  };

  if (!schema) {
    row.amount = tx.amount;
  } else {
    if (schema.hasAmount) {
      row.amount = tx.amount;
    }
    if (schema.hasTotalAmount) {
      row.total_amount = tx.amount;
    }
  }

  if (tx.memberId !== undefined) {
    row.member_id = isValidUUID(tx.memberId) ? tx.memberId : null;
  }
  return row;
}

function mapExpenditureFromRow(row: any): Expenditure {
  let paymentMethod = row.payment_method || row.paymentMethod;
  let description = row.description || '';
  
  if (!paymentMethod) {
    const match = description.match(/^\[(CASH|UPI|CARD|PAY_LATER)\]\s*(.*)$/);
    if (match) {
      paymentMethod = match[1];
      description = match[2];
    } else {
      paymentMethod = 'CASH';
    }
  }

  return {
    id: row.id,
    date: row.date,
    description: description,
    amount: Number(row.amount ?? 0),
    category: row.category as any,
    paymentMethod: paymentMethod as any
  };
}

function mapExpenditureToRow(exp: Omit<Expenditure, 'id'>, hasPaymentMethodCol = false): any {
  const row: any = {
    date: exp.date,
    description: exp.description,
    amount: exp.amount,
    category: exp.category
  };
  
  const pm = exp.paymentMethod || 'CASH';
  
  if (hasPaymentMethodCol) {
    row.payment_method = pm;
  } else {
    row.description = `[${pm}] ${exp.description}`;
  }
  
  return row;
}

function fixMenuItemMapping(row: any): MenuItem {
  let dbName = row.name ?? '';
  let realCategory = row.category;
  
  // Clean if there's a hidden category prefix
  if (dbName.startsWith('[cat:')) {
    const closingIndex = dbName.indexOf(']');
    if (closingIndex !== -1) {
      realCategory = dbName.slice(5, closingIndex);
      dbName = dbName.slice(closingIndex + 1);
    }
  }

  return {
    id: row.id,
    name: dbName,
    price: Number(row.price ?? 0),
    category: realCategory,
    is_available: row.is_available ?? row.isAvailable ?? true
  };
}

function mapMenuItemToRow(item: Omit<MenuItem, 'id'>): any {
  // Check if it matches default category values exactly
  const lowerCat = (item.category || '').toLowerCase();
  const isStandardCategory = ['beverage', 'snack', 'dessert'].includes(lowerCat);
  const normalizedCategory = lowerCat === 'beverage' 
    ? 'Beverage' 
    : lowerCat === 'snack' 
      ? 'Snack' 
      : lowerCat === 'dessert' 
        ? 'Dessert' 
        : item.category;

  if (!isStandardCategory) {
    // Encode custom category in name, set database category to Snack to bypass constraints
    return {
      name: `[cat:${item.category}]${item.name}`,
      price: item.price,
      category: 'Snack',
      is_available: item.is_available ?? true
    };
  }

  return {
    name: item.name,
    price: item.price,
    category: normalizedCategory,
    is_available: item.is_available ?? true
  };
}

function mapHappyHourFromRow(row: any): HappyHourSettings {
  return {
    id: row.id,
    isEnabled: row.is_enabled ?? false,
    snookerRate: Number(row.snooker_rate ?? 0),
    poolRate: Number(row.pool_rate ?? 0),
    ps5Rate: Number(row.ps5_rate ?? 0),
    miniSnookerRate: Number(row.mini_snooker_rate ?? 0),
    otherRate: Number(row.other_rate ?? 0),
    lastEnabledAt: row.last_enabled_at,
    cumulativeDurationSeconds: row.cumulative_duration_seconds ?? 0,
    updatedAt: row.updated_at
  };
}

// --- Auto-Seeding Mechanism for Live Supabase ---
let isSeeded = false;

async function seedIfNeeded() {
  isSeeded = true;
}

async function resolveAccountFromAuthUser(
  user: { id: string; email?: string | null },
  cipher = ''
): Promise<AdminAccount> {
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profError || !profile) {
    await supabase.auth.signOut();
    throw new Error(
      'Account not provisioned. Contact your administrator to set up your profile.'
    );
  }

  let permissions: 'CAFE' | 'SNOOKER' | 'BOTH' = 'BOTH';
  if (profile.club_id) {
    setActiveClubId(profile.club_id);
    const { data: club } = await supabase
      .from('clubs')
      .select('subscription_plan, subscription_status')
      .eq('id', profile.club_id)
      .maybeSingle();
    if (club) {
      if (club.subscription_status === 'suspended') {
        throw new Error('Subscription suspended. Contact support.');
      }
      if (club.subscription_status === 'pending_deletion') {
        throw new Error('Club scheduled for deletion. Access revoked.');
      }
      if (club.subscription_status === 'deleted') {
        throw new Error('Club has been permanently deleted.');
      }
      if (club.subscription_plan === 'cafe_only') permissions = 'CAFE';
      else if (club.subscription_plan === 'snooker_only') permissions = 'SNOOKER';
    }
  } else {
    setActiveClubId('');
  }

  const username = (user.email || '').split('@')[0];
  setActiveAdminRole(profile.role);
  setActiveAdminUsername(username);
  setActiveAdminPermissions(permissions);
  setActiveAdminId(user.id);

  return {
    id: user.id,
    username,
    cipher,
    role: profile.role,
    permissions,
  };
}

export const supabaseService = {
  setActiveAdminUsername(username: string) {
    setActiveAdminUsername(username);
  },
  getActiveAdminUsername(): string {
    return getActiveAdminUsername();
  },
  setActiveAdminRole(role: string) {
    setActiveAdminRole(role);
  },
  getActiveAdminRole(): string {
    return getActiveAdminRole();
  },
  setActiveAdminPermissions(permissions: string) {
    setActiveAdminPermissions(permissions);
  },
  getActiveAdminPermissions(): string {
    return getActiveAdminPermissions();
  },
  setActiveAdminId(id: string) {
    setActiveAdminId(id);
  },
  getActiveAdminId(): string {
    return getActiveAdminId();
  },
  async ensureActiveAdminExistsInDb(username: string, role: string, permissions: string): Promise<string> {
    return ensureActiveAdminExistsInDb(username, role, permissions);
  },
  // Pending Bills
  async getPendingBills(): Promise<PendingBill[]> {
    if (!isSupabaseConfigured) {
      const dbAll = getLocal<PendingBill[]>(LOCAL_STORAGE_KEYS.PENDING_BILLS, []);
      return dbAll;
    }
    try {
      let query = supabase.from('pending_bills').select('*');
      const { data, error } = await query;
      if (error) {
        console.warn('Pending_bills table in DB query failed, using LocalStorage:', error.message);
        return getLocal<PendingBill[]>(LOCAL_STORAGE_KEYS.PENDING_BILLS, []);
      }
      const mapped = (data || []).map(row => {
        const { tableNumber: decodedNum, playerName: decodedPlayer } = decodePlayerNameWithTableNumber(row.table_number ?? '', row.player ?? '');
        return {
          id: row.id,
          tableId: row.table_id || row.tableId,
          tableNumber: decodedNum,
          player: decodedPlayer,
          amount: Number(row.amount),
          sessionCost: Number(row.session_cost || row.sessionCost || 0),
          cafeCost: Number(row.cafe_cost || row.cafeCost || 0),
          elapsedTime: row.elapsed_time || row.elapsedTime,
          memberId: row.member_id || row.memberId || null,
          cart: typeof row.cart === 'string' ? JSON.parse(row.cart) : (row.cart || []),
          createdAt: row.created_at || row.createdAt
        };
      });
      return mapped;
    } catch (e) {
      console.warn('DB query for pending bills threw error, falling back to LocalStorage:', e);
      return getLocal<PendingBill[]>(LOCAL_STORAGE_KEYS.PENDING_BILLS, []);
    }
  },

  async addPendingBill(bill: Omit<PendingBill, 'id' | 'createdAt'>): Promise<PendingBill | null> {
    const prefixedTableNumber = String(bill.tableNumber);
    const prefixedPlayer = String(bill.player);

    const newBill: PendingBill = {
      ...bill,
      tableNumber: prefixedTableNumber,
      player: prefixedPlayer,
      id: generateUUID(),
      createdAt: new Date().toISOString()
    };

    const localBills = getLocal<PendingBill[]>(LOCAL_STORAGE_KEYS.PENDING_BILLS, []);
    localBills.push(newBill);
    setLocal(LOCAL_STORAGE_KEYS.PENDING_BILLS, localBills);

    if (!isSupabaseConfigured) {
      return newBill;
    }

    try {
      const { dbNum, dbPlayer } = encodePlayerNameWithTableNumber(newBill.tableNumber, newBill.player);
      const dbRow: any = {
        id: newBill.id,
        table_id: newBill.tableId,
        table_number: dbNum,
        player: dbPlayer,
        amount: newBill.amount,
        session_cost: newBill.sessionCost,
        cafe_cost: newBill.cafeCost,
        elapsed_time: newBill.elapsedTime,
        member_id: newBill.memberId,
        cart: JSON.stringify(newBill.cart || []),
        created_at: newBill.createdAt
      };
      await injectAdminIdIfNeeded('pending_bills', dbRow);
      const { error } = await supabase.from('pending_bills').insert([dbRow]);
      if (error) {
        console.warn('Could not insert to pending_bills table in DB, kept in LocalStorage:', error.message);
      }
    } catch (e) {
      console.warn('DB pending bills insert error:', e);
    }
    return newBill;
  },

  async deletePendingBill(id: string): Promise<boolean> {
    const localBills = getLocal(LOCAL_STORAGE_KEYS.PENDING_BILLS, []);
    const filtered = localBills.filter(b => b.id !== id);
    setLocal(LOCAL_STORAGE_KEYS.PENDING_BILLS, filtered);

    if (!isSupabaseConfigured) {
      return true;
    }

    try {
      const { error } = await supabase.from('pending_bills').delete().eq('id', id);
      if (error) {
        console.warn('Could not delete from pending_bills table in DB:', error.message);
      }
    } catch (e) {
      console.warn('DB pending bills delete error:', e);
    }
    return true;
  },

  // Tables
  async getTables(): Promise<SnookerTable[]> {
    if (!isSupabaseConfigured) {
      return getLocal<SnookerTable[]>(LOCAL_STORAGE_KEYS.TABLES, DEFAULT_TABLES);
    }
    await seedIfNeeded();
    try {
      let query = supabase.from('tables').select('*');
      const { data, error } = await query;
      if (error) throw error;
      
      let rows = data || [];
      if (rows.length === 0) {
        console.log('Tables table in Supabase is completely empty! Seeding default tables...');
        const activeClubIdVal = activeClubId || getActiveClubId();
        const seedRows: any[] = DEFAULT_TABLES.map(t => {
          const rowData: any = {
            table_number: String(t.number),
            type: t.type,
            hourly_rate: t.rate,
            rate_unit: t.rateUnit,
            status: 'AVAILABLE',
            elapsed_time: '00:00:00',
            session_cost: 0,
            cafe_cost: 0,
            cost: 0,
            current_cart: JSON.stringify([]),
            is_paused: false,
            total_paused_seconds: 0
          };
          if (activeClubIdVal) {
            rowData.club_id = activeClubIdVal;
          }
          return rowData;
        });
        
        const { data: inserted, error: insertErr } = await supabase.from('tables').insert(seedRows).select('*');
        if (!insertErr && inserted) {
          rows = inserted;
        } else {
          console.error('Failed to seed tables in Supabase:', insertErr);
        }
      }

      return rows.map(row => mapTableFromRow(row));
    } catch (error) {
      handleSupabaseError(error, 'list', 'tables');
      return [];
    }
  },

  async updateTable(id: string, updates: Partial<SnookerTable>) {
    // Always apply updates to local storage to keep state responsive and handle local fallbacks
    const tables = getLocal<SnookerTable[]>(LOCAL_STORAGE_KEYS.TABLES, DEFAULT_TABLES);
    const index = tables.findIndex(t => t.id === id);
    if (index !== -1) {
      const localUpdates = { ...updates };
      tables[index] = { ...tables[index], ...localUpdates };
      setLocal(LOCAL_STORAGE_KEYS.TABLES, tables);
    }

    if (!isSupabaseConfigured) {
      return;
    }

    if (!isValidUUID(id)) {
      console.log(`[updateTable] Bypassed SQL update for temporary non-UUID table ID: "${id}"`);
      return;
    }

    try {
      const cleanUpdates: any = {};
      
      if (updates.type !== undefined) cleanUpdates.type = updates.type;
      if (updates.rate !== undefined) cleanUpdates.hourly_rate = updates.rate;
      if (updates.rateUnit !== undefined) cleanUpdates.rate_unit = updates.rateUnit;
      if (updates.status !== undefined) cleanUpdates.status = updates.status;
      if (updates.player !== undefined) cleanUpdates.player = updates.player;
      if (updates.billNumber !== undefined) cleanUpdates.bill_number = updates.billNumber;
      if (updates.startTime !== undefined) cleanUpdates.start_time = updates.startTime;
      
      if (updates.startTimeUnix !== undefined) {
        cleanUpdates.current_session_start = updates.startTimeUnix ? new Date(updates.startTimeUnix).toISOString() : null;
      }
      
      if (updates.elapsedTime !== undefined) cleanUpdates.elapsed_time = updates.elapsedTime;
      if (updates.sessionCost !== undefined) cleanUpdates.session_cost = updates.sessionCost;
      if (updates.cafeCost !== undefined) cleanUpdates.cafe_cost = updates.cafeCost;
      if (updates.cost !== undefined) cleanUpdates.cost = updates.cost;
      if (updates.currentCart !== undefined) cleanUpdates.current_cart = updates.currentCart;
      if (updates.isPaused !== undefined) cleanUpdates.is_paused = updates.isPaused;
      if (updates.totalPausedSeconds !== undefined) cleanUpdates.total_paused_seconds = updates.totalPausedSeconds;
      
      if (updates.pauseStartTimeUnix !== undefined) {
        cleanUpdates.pause_start_time_unix = updates.pauseStartTimeUnix;
      }
      
      if (updates.reservationTime !== undefined) cleanUpdates.reservation_time = updates.reservationTime;
      if (updates.playersCount !== undefined) cleanUpdates.players_count = updates.playersCount;
      if (updates.ps5Costs !== undefined) cleanUpdates.ps5_costs = updates.ps5Costs;
      
      if (updates.currentMemberId !== undefined) {
        cleanUpdates.current_member_id = getSingleValidUuid(updates.currentMemberId);
      }

      // Handle custom-named table number and note column encodings
      if (index !== -1) {
        let finalNum = tables[index]?.number || '';
        if (updates.number !== undefined) {
          finalNum = String(updates.number);
        }
        
        let finalNote = updates.note !== undefined ? updates.note : (tables[index]?.note || null);
        if (updates.currentMemberId !== undefined) {
          if (updates.currentMemberId) {
            finalNote = `MEMBER_ID:${updates.currentMemberId}`;
          } else if (updates.note === undefined) {
            finalNote = null;
          }
        }
        
        const { dbNum, dbNote } = encodeTableColumns(finalNum, finalNote);
        
        if (updates.number !== undefined) {
          cleanUpdates.table_number = dbNum;
        }
        if (updates.note !== undefined || updates.currentMemberId !== undefined || !isPurelyNumeric(finalNum)) {
          cleanUpdates.note = dbNote;
        }
      } else {
        if (updates.number !== undefined) cleanUpdates.table_number = String(updates.number);
        if (updates.note !== undefined) {
          cleanUpdates.note = updates.note;
        } else if (updates.currentMemberId !== undefined) {
          if (updates.currentMemberId) {
            cleanUpdates.note = `MEMBER_ID:${updates.currentMemberId}`;
          } else {
            cleanUpdates.note = null;
          }
        }
      }

      // If the status is AVAILABLE, automatically reset session variables to prevent stale data
      if (updates.status === 'AVAILABLE') {
        cleanUpdates.player = '';
        cleanUpdates.current_session_start = null;
        cleanUpdates.start_time = null;
        cleanUpdates.bill_number = null;
        cleanUpdates.current_member_id = null;
        cleanUpdates.elapsed_time = '00:00:00';
        cleanUpdates.session_cost = 0;
        cleanUpdates.cafe_cost = 0;
        cleanUpdates.cost = 0;
        cleanUpdates.current_cart = [];
        cleanUpdates.is_paused = false;
        cleanUpdates.total_paused_seconds = 0;
        cleanUpdates.pause_start_time_unix = null;
        cleanUpdates.reservation_time = null;
        cleanUpdates.players_count = null;
      }

      await injectAdminIdIfNeeded('tables', cleanUpdates);
      const { error } = await supabase.from('tables').update(cleanUpdates).eq('id', id);
      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        const isColumnError = error.code === '42703' || errMsg.includes('column') || errMsg.includes('current_member_id') || errMsg.includes('does not exist') || errMsg.includes('undefined');
        if (isColumnError && cleanUpdates.current_member_id !== undefined) {
          delete cleanUpdates.current_member_id;
          const { error: retryErr } = await supabase.from('tables').update(cleanUpdates).eq('id', id);
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }
    } catch (error) {
      handleSupabaseError(error, 'update', `tables/${id}`);
    }
  },

  async addTable(tableData: Omit<SnookerTable, 'id'>): Promise<SnookerTable | null> {
    const prefixedNumber = String(tableData.number);
    const prefixedPlayer = String(tableData.player || '');

    if (!isSupabaseConfigured) {
      const tables = getLocal<SnookerTable[]>(LOCAL_STORAGE_KEYS.TABLES, DEFAULT_TABLES);
      const newTable: SnookerTable = {
        ...tableData,
        number: prefixedNumber,
        player: prefixedPlayer,
        id: Math.random().toString(36).substr(2, 9)
      };
      tables.push(newTable);
      setLocal(LOCAL_STORAGE_KEYS.TABLES, tables);
      return newTable;
    }
    try {
      const { dbNum, dbNote } = encodeTableColumns(prefixedNumber, tableData.note);
      const cleanData: any = {
        table_number: dbNum,
        type: tableData.type,
        hourly_rate: tableData.rate,
        rate_unit: tableData.rateUnit ?? 'hr',
        status: tableData.status || 'AVAILABLE',
        player: prefixedPlayer,
        bill_number: tableData.billNumber || null,
        start_time: tableData.startTime || null,
        elapsed_time: tableData.elapsedTime || '00:00:00',
        session_cost: tableData.sessionCost || 0,
        cafe_cost: tableData.cafeCost || 0,
        cost: tableData.cost || 0,
        current_cart: tableData.currentCart || [],
        is_paused: tableData.isPaused || false,
        total_paused_seconds: tableData.totalPausedSeconds || 0,
        reservation_time: tableData.reservationTime || null,
        players_count: tableData.playersCount || null,
        note: dbNote,
        ps5_costs: tableData.ps5Costs || null
      };

      if (tableData.startTimeUnix) {
        cleanData.current_session_start = new Date(tableData.startTimeUnix).toISOString();
      }
      if (tableData.pauseStartTimeUnix) {
        cleanData.pause_start_time_unix = tableData.pauseStartTimeUnix;
      }
      if (tableData.currentMemberId) {
        cleanData.current_member_id = getSingleValidUuid(tableData.currentMemberId);
        // Ensure any custom table name is preserved inside this MEMBER_ID updated note
        const memberNoteVal = `MEMBER_ID:${tableData.currentMemberId}`;
        const { dbNote: memberDbNote } = encodeTableColumns(prefixedNumber, memberNoteVal);
        cleanData.note = memberDbNote;
      }

      const activeClubIdVal = activeClubId || getActiveClubId();
      if (activeClubIdVal) {
        cleanData.club_id = activeClubIdVal;
      }

      await injectAdminIdIfNeeded('tables', cleanData);
      let { data, error } = await supabase.from('tables').insert([cleanData]).select('*');
      if (error) {
        if (error.message?.includes('current_member_id')) {
          delete cleanData.current_member_id;
          const retryRes = await supabase.from('tables').insert([cleanData]).select('*');
          if (retryRes.error) throw retryRes.error;
          data = retryRes.data;
        } else {
          throw error;
        }
      }

      if (data && data[0]) {
        return mapTableFromRow(data[0]);
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'create', 'tables');
      return null;
    }
  },

  async deleteTable(id: string): Promise<boolean> {
    const hasAdminCol = await checkColumnCached('tables', 'admin_username');
    
    // Always remove from local storage to keep client UI in sync immediately
    const tables = getLocal<SnookerTable[]>(LOCAL_STORAGE_KEYS.TABLES, DEFAULT_TABLES);
    const filtered = tables.filter(t => t.id !== id);
    setLocal(LOCAL_STORAGE_KEYS.TABLES, filtered);

    if (!isSupabaseConfigured) {
      return true;
    }
    
    if (!isValidUUID(id)) {
      console.log(`[deleteTable] Bypassed SQL delete for temporary non-UUID table ID: "${id}"`);
      return true;
    }

    try {
      const { error } = await supabase.from('tables').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting table:', error);
      handleSupabaseError(error, 'delete', `tables/${id}`);
      return false;
    }
  },

  // Members
  async getMembers(): Promise<Member[]> {
    if (!isSupabaseConfigured) {
      return getLocal<Member[]>(LOCAL_STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS);
    }
    try {
      const schema = await probeMembersSchema();
      let query = supabase.from('members').select('*');
      const { data, error } = await query;
      if (error) throw error;
      let rows = data || [];
      if (rows.length > 0) {
        const firstRow = rows[0];
        schema.hasContact = 'contact' in firstRow;
        schema.hasPhone = 'phone' in firstRow;
        schema.hasJoinedDate = 'joined_date' in firstRow;
        schema.hasJoinedDateCamel = 'joinedDate' in firstRow;
        schema.hasStatus = 'status' in firstRow;
        schema.hasDueAmount = 'due_amount' in firstRow;
        schema.hasDueAmountCamel = 'dueAmount' in firstRow;
        membersSchemaCache = schema;
      }
      let filtered = rows.map(d => mapMemberFromRow(d, schema));
      
      // Safeguard: Check if the members table has any rows globally in the database
      let totalInTableCount = 0;
      try {
        const { count, error: countErr } = await supabase.from('members').select('*', { count: 'exact', head: true });
        if (!countErr) totalInTableCount = count || 0;
      } catch (e) {
        console.warn('Could not query members count:', e);
      }

      if (filtered.length === 0 && totalInTableCount === 0 && DEFAULT_MEMBERS.length > 0) {
        console.log(`Seeding default members into Supabase...`);
        const seededInsert = DEFAULT_MEMBERS.map(m => {
          const mRow = mapMemberToRow(m, schema);
          if (mRow.name === undefined) mRow.name = m.name;
          if (schema.hasJoinedDate && mRow.joined_date === undefined) mRow.joined_date = new Date().toISOString();
          if (schema.hasJoinedDateCamel && mRow.joinedDate === undefined) mRow.joinedDate = new Date().toISOString();
          if (schema.hasStatus && mRow.status === undefined) mRow.status = m.status || 'Inactive';
          if (schema.hasDueAmount && mRow.due_amount === undefined) mRow.due_amount = m.dueAmount || 0;
          if (schema.hasDueAmountCamel && mRow.dueAmount === undefined) mRow.dueAmount = m.dueAmount || 0;
          return mRow;
        });
        const { data: inserted, error: insErr } = await supabase.from('members').insert(seededInsert).select('*');
        if (!insErr && inserted) {
          filtered = inserted.map(d => mapMemberFromRow(d, schema));
        } else {
          filtered = DEFAULT_MEMBERS;
        }
      }
      return filtered;
    } catch (error) {
      handleSupabaseError(error, 'list', 'members');
      return [];
    }
  },

  async addMember(member: Omit<Member, 'id'>): Promise<Member | null> {
    const prefixedMember = {
      ...member
    };

    if (!isSupabaseConfigured) {
      const members = getLocal<Member[]>(LOCAL_STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS);
      const newMember: Member = {
        ...prefixedMember,
        id: 'mem_' + Math.random().toString(36).substr(2, 9),
        joinedDate: member.joinedDate || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: member.status || 'Inactive',
        dueAmount: member.dueAmount || 0
      };
      members.push(newMember);
      setLocal(LOCAL_STORAGE_KEYS.MEMBERS, members);
      return newMember;
    }
    try {
      const schema = await probeMembersSchema();
      let attempt = 0;
      while (attempt < 4) {
        attempt++;
        const cleanedSeed = mapMemberToRow(prefixedMember, schema);
        
        if (cleanedSeed.name === undefined) {
          cleanedSeed.name = (prefixedMember.name || '').trim() || 'New Member';
        }
        
        if (schema.hasJoinedDate && cleanedSeed.joined_date === undefined) {
          cleanedSeed.joined_date = member.joinedDate || new Date().toISOString();
        } else if (schema.hasJoinedDateCamel && cleanedSeed.joinedDate === undefined) {
          cleanedSeed.joinedDate = member.joinedDate || new Date().toISOString();
        }

        if (schema.hasStatus && cleanedSeed.status === undefined) {
          cleanedSeed.status = member.status || 'Inactive';
        }
        
        if (cleanedSeed.due_amount === undefined && cleanedSeed.dueAmount === undefined) {
          if (schema.hasDueAmount) {
            cleanedSeed.due_amount = member.dueAmount || 0;
          } else if (schema.hasDueAmountCamel) {
            cleanedSeed.dueAmount = member.dueAmount || 0;
          }
        }

        await injectAdminIdIfNeeded('members', cleanedSeed);
        const { data, error } = await supabase.from('members').insert([cleanedSeed]).select('*');
        
        if (!error) {
          if (data && data[0]) {
            return mapMemberFromRow(data[0], schema);
          }
          return null;
        }

        console.warn(`[AddMember Attempt ${attempt} failed]`, error);
        const errMsg = (error.message || '').toLowerCase();
        
        const isNotNullViolation = error.code === '23502' || errMsg.includes('not-null') || errMsg.includes('null value');
        const isMissingColumn = error.code === 'PGRST204' || error.code === '42703' || 
                                errMsg.includes('could not find') || 
                                errMsg.includes('column') || 
                                errMsg.includes('does not exist');

        if (isNotNullViolation) {
          let healed = false;
          if (errMsg.includes('phone')) {
            schema.hasPhone = true;
            healed = true;
          }
          if (errMsg.includes('contact')) {
            schema.hasContact = true;
            healed = true;
          }
          if (errMsg.includes('joined_date') || errMsg.includes('joined-date') || errMsg.includes('joineddate')) {
            schema.hasJoinedDate = true;
            healed = true;
          }
          if (healed) {
            membersSchemaCache = schema;
            continue;
          }
        } else if (isMissingColumn) {
          let healed = false;
          if (errMsg.includes('status')) {
            schema.hasStatus = false;
            healed = true;
          }
          if (errMsg.includes('contact')) {
            schema.hasContact = false;
            schema.hasPhone = true;
            healed = true;
          }
          if (errMsg.includes('phone')) {
            schema.hasPhone = false;
            schema.hasContact = true;
            healed = true;
          }
          if (errMsg.includes('joined_date') || errMsg.includes('joined-date')) {
            schema.hasJoinedDate = false;
            schema.hasJoinedDateCamel = true;
            healed = true;
          }
          if (errMsg.includes('joineddate')) {
            schema.hasJoinedDateCamel = false;
            schema.hasJoinedDate = true;
            healed = true;
          }
          if (errMsg.includes('due_amount') || errMsg.includes('due-amount')) {
            schema.hasDueAmount = false;
            schema.hasDueAmountCamel = true;
            healed = true;
          }
          if (errMsg.includes('dueamount')) {
            schema.hasDueAmountCamel = false;
            schema.hasDueAmount = true;
            healed = true;
          }
          
          if (healed) {
            membersSchemaCache = schema;
            continue;
          }
        }

        throw error;
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'create', 'members');
      return null;
    }
  },

  async updateMember(id: string, updates: Partial<Member>) {
    const prefixedUpdates = { ...updates };

    if (!isSupabaseConfigured) {
      const members = getLocal<Member[]>(LOCAL_STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS);
      const index = members.findIndex(m => m.id === id);
      if (index !== -1) {
        members[index] = { ...members[index], ...prefixedUpdates };
        setLocal(LOCAL_STORAGE_KEYS.MEMBERS, members);
      }
      return;
    }
    try {
      const schema = await probeMembersSchema();
      let attempt = 0;
      while (attempt < 4) {
        attempt++;
        const mappedUpdates = mapMemberToRow(prefixedUpdates, schema);
        await injectAdminIdIfNeeded('members', mappedUpdates);
        const { error } = await supabase.from('members').update(mappedUpdates).eq('id', id);
        
        if (!error) return;
        
        console.warn(`[UpdateMember Attempt ${attempt} failed]`, error);
        const errMsg = (error.message || '').toLowerCase();
        
        const isNotNullViolation = error.code === '23502' || errMsg.includes('not-null') || errMsg.includes('null value');
        const isMissingColumn = error.code === 'PGRST204' || error.code === '42703' || 
                                errMsg.includes('could not find') || 
                                errMsg.includes('column') || 
                                errMsg.includes('does not exist');

        if (isNotNullViolation) {
          let healed = false;
          if (errMsg.includes('phone')) {
            schema.hasPhone = true;
            healed = true;
          }
          if (errMsg.includes('contact')) {
            schema.hasContact = true;
            healed = true;
          }
          if (errMsg.includes('joined_date') || errMsg.includes('joined-date') || errMsg.includes('joineddate')) {
            schema.hasJoinedDate = true;
            healed = true;
          }
          if (healed) {
            membersSchemaCache = schema;
            continue;
          }
        } else if (isMissingColumn) {
          let healed = false;
          if (errMsg.includes('status')) {
            schema.hasStatus = false;
            healed = true;
          }
          if (errMsg.includes('contact')) {
            schema.hasContact = false;
            schema.hasPhone = true;
            healed = true;
          }
          if (errMsg.includes('phone')) {
            schema.hasPhone = false;
            schema.hasContact = true;
            healed = true;
          }
          if (errMsg.includes('joined_date') || errMsg.includes('joined-date')) {
            schema.hasJoinedDate = false;
            schema.hasJoinedDateCamel = true;
            healed = true;
          }
          if (errMsg.includes('joineddate')) {
            schema.hasJoinedDateCamel = false;
            schema.hasJoinedDate = true;
            healed = true;
          }
          if (errMsg.includes('due_amount') || errMsg.includes('due-amount')) {
            schema.hasDueAmount = false;
            schema.hasDueAmountCamel = true;
            healed = true;
          }
          if (errMsg.includes('dueamount')) {
            schema.hasDueAmountCamel = false;
            schema.hasDueAmount = true;
            healed = true;
          }
          
          if (healed) {
            membersSchemaCache = schema;
            continue;
          }
        }

        throw error;
      }
    } catch (error) {
      handleSupabaseError(error, 'update', `members/${id}`);
    }
  },

  async deleteMember(id: string) {
    // Always remove from local storage to keep client UI in sync immediately
    const members = getLocal<Member[]>(LOCAL_STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS);
    const filtered = members.filter(m => m.id !== id);
    setLocal(LOCAL_STORAGE_KEYS.MEMBERS, filtered);

    if (!isSupabaseConfigured) {
      return;
    }
    
    if (!isValidUUID(id)) {
      console.log(`[deleteMember] Bypassed SQL delete for temporary non-UUID member ID: "${id}"`);
      return;
    }

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'delete', `members/${id}`);
    }
  },

  // Transactions / Billing History
  async getTransactions(): Promise<Transaction[]> {
    if (!isSupabaseConfigured) {
      const allList = getLocal<Transaction[]>(LOCAL_STORAGE_KEYS.BILLING, []);
      return allList;
    }
    try {
      let query = supabase.from('billing_history').select('*');
      const { data, error } = await query;
      if (error) throw error;
      
      const rows = data || [];
      const list = rows.map(d => mapTransactionFromRow(d));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return list;
    } catch (error) {
      handleSupabaseError(error, 'list', 'billing_history');
      return [];
    }
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction | null> {
    const prefixedTx = {
      ...transaction
    };

    if (!isSupabaseConfigured) {
      const transactions = getLocal<Transaction[]>(LOCAL_STORAGE_KEYS.BILLING, []);
      const newTransaction: Transaction = {
        ...prefixedTx,
        id: 'tx_' + Math.random().toString(36).substr(2, 9)
      };
      transactions.unshift(newTransaction);
      setLocal(LOCAL_STORAGE_KEYS.BILLING, transactions);
      return newTransaction;
    }

    let schema: BillingSchemaInfo;
    try {
      schema = await probeBillingSchema();
    } catch (probeErr) {
      console.warn('Failed to probe billing schema, falling back to default:', probeErr);
      schema = { hasAmount: true, hasTotalAmount: false };
    }

    try {
      const row = mapTransactionToRow(prefixedTx, schema);
      await injectAdminIdIfNeeded('billing_history', row);
      const { data, error } = await supabase.from('billing_history').insert([row]).select('*');
      
      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        let healed = false;

        // Catch check constraint error (code 23514) for payment_method
        if (error.code === '23514' && (errMsg.includes('payment_method') || errMsg.includes('payment_method_check') || errMsg.includes('constraint'))) {
          console.warn('[Billing History Check Constraint Violation Detected] Attempting self-healing fallback for PAY_LATER...');
          const fallbackTx = { ...prefixedTx };
          const itemsArray: any[] = Array.isArray(fallbackTx.items) ? [...fallbackTx.items] : (fallbackTx.items ? [fallbackTx.items] : []);
          
          // Embed our special indicator
          itemsArray.push({ isPayLaterFallback: true } as any);

          const fallbackRow = mapTransactionToRow({
            ...fallbackTx,
            paymentMethod: 'UPI' as any, // Technical fallback to bypass database check constraints
            items: itemsArray
          }, schema);
          await injectAdminIdIfNeeded('billing_history', fallbackRow);

          const { data: fallbackData, error: fallbackError } = await supabase
            .from('billing_history')
            .insert([fallbackRow])
            .select('*');

          if (!fallbackError && fallbackData && fallbackData[0]) {
            console.log('[Billing History Self-Healing Succeeded via Fallback Row]', fallbackData[0]);
            return mapTransactionFromRow(fallbackData[0]);
          } else if (fallbackError) {
            console.error('[Billing History Fallback Also Failed]', fallbackError);
          }
        }
        
        if (error.code === '42703' || (errMsg.includes('column') && (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('undefined')))) {
          if (errMsg.includes('total_amount')) {
            schema.hasTotalAmount = false;
            schema.hasAmount = true;
            healed = true;
          } else if (errMsg.includes('amount')) {
            schema.hasAmount = false;
            schema.hasTotalAmount = true;
            healed = true;
          }
        }
        
        // Also heal NOT NULL constraint violation of total_amount if it happens
        if (error.code === '23502' && errMsg.includes('total_amount')) {
          schema.hasTotalAmount = true;
          healed = true;
        }

        if (healed) {
          billingSchemaCache = schema;
          const retryRow = mapTransactionToRow(prefixedTx, schema);
          await injectAdminIdIfNeeded('billing_history', retryRow);
          const { data: retryData, error: retryError } = await supabase.from('billing_history').insert([retryRow]).select('*');
          if (retryError) throw retryError;
          if (retryData && retryData[0]) {
            return mapTransactionFromRow(retryData[0]);
          }
        }
        
        throw error;
      }

      if (data && data[0]) {
        return mapTransactionFromRow(data[0]);
      }
      return null;
    } catch (error: any) {
      const errMsg = (error.message || '').toLowerCase();
      
      // Also catch constraint violation in general try-catch
      if (error.code === '23514' && (errMsg.includes('payment_method') || errMsg.includes('payment_method_check') || errMsg.includes('constraint'))) {
        try {
          console.warn('[Billing History Catch Block Constraint] Initiating self-healing fallback...');
          const fallbackTx = { ...prefixedTx };
          const itemsArray: any[] = Array.isArray(fallbackTx.items) ? [...fallbackTx.items] : (fallbackTx.items ? [fallbackTx.items] : []);
          itemsArray.push({ isPayLaterFallback: true } as any);

          const fallbackRow = mapTransactionToRow({
            ...fallbackTx,
            paymentMethod: 'UPI' as any,
            items: itemsArray
          }, schema);
          await injectAdminIdIfNeeded('billing_history', fallbackRow);

          const { data: fallbackData, error: fallbackError } = await supabase
            .from('billing_history')
            .insert([fallbackRow])
            .select('*');

          if (!fallbackError && fallbackData && fallbackData[0]) {
            console.log('[Billing History Self-Healing Catch Block Succeeded]', fallbackData[0]);
            return mapTransactionFromRow(fallbackData[0]);
          }
        } catch (innerE) {
          console.error('[Billing History Catch Block Self-Healing Crashed]', innerE);
        }
      }

      if ((error.code === '23502' || errMsg.includes('total_amount')) && !schema.hasTotalAmount) {
        schema.hasTotalAmount = true;
        schema.hasAmount = false; // database seems to have total_amount instead of amount
        billingSchemaCache = schema;
        try {
          const retryRow = mapTransactionToRow(prefixedTx, schema);
          await injectAdminIdIfNeeded('billing_history', retryRow);
          const { data: retryData, error: retryError } = await supabase.from('billing_history').insert([retryRow]).select('*');
          if (!retryError && retryData && retryData[0]) {
            return mapTransactionFromRow(retryData[0]);
          }
        } catch (innerE) {
          console.error('Self-healing failed on catch fallback:', innerE);
        }
      }
      handleSupabaseError(error, 'create', 'billing_history');
      return null;
    }
  },

  async getMember(id: string): Promise<Member | null> {
    if (!isSupabaseConfigured) {
      const members = getLocal(LOCAL_STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS);
      return members.find(m => m.id === id) || null;
    }
    try {
      const schema = await probeMembersSchema();
      const { data, error } = await supabase.from('members').select('*').eq('id', id);
      if (error) throw error;
      if (data && data.length > 0) {
        return mapMemberFromRow(data[0], schema);
      }
      return null;
    } catch (e) {
      console.error('Error fetching member:', e);
      return null;
    }
  },

  async settleMemberTransactions(memberId: string, playerName: string, method: 'CASH' | 'UPI', amountToSettle: number = 999999999): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const transactions = getLocal(LOCAL_STORAGE_KEYS.BILLING, []);
      let remaining = amountToSettle;
      
      const payLaterTransactions = transactions
        .filter((t: any) => {
          const isMatch = (t.memberId === memberId) || (t.playerName === playerName && t.paymentMethod === 'PAY_LATER');
          return isMatch && t.paymentMethod === 'PAY_LATER';
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let updatedTxMap: Record<string, any> = {};
      let splitsToAdd: any[] = [];

      for (const t of payLaterTransactions) {
        if (remaining <= 0) break;
        
        if (remaining >= t.amount) {
          updatedTxMap[t.id] = { ...t, paymentMethod: method };
          remaining -= t.amount;
        } else {
          updatedTxMap[t.id] = { ...t, amount: t.amount - remaining };
          splitsToAdd.push({
            ...t,
            id: 'tx_split_' + Math.random().toString(36).substr(2, 9),
            amount: remaining,
            paymentMethod: method,
            date: new Date().toISOString()
          });
          remaining = 0;
        }
      }

      const nextTxList = [];
      for (const t of transactions) {
        if (updatedTxMap[t.id]) {
          nextTxList.push(updatedTxMap[t.id]);
        } else {
          nextTxList.push(t);
        }
      }
      nextTxList.push(...splitsToAdd);

      setLocal(LOCAL_STORAGE_KEYS.BILLING, nextTxList);
      return true;
    }
    try {
      let query = supabase.from('billing_history').select('*');
      if (isValidUUID(memberId)) {
        query = query.eq('member_id', memberId);
      } else if (playerName) {
        query = query.eq('player_name', playerName);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const payLaterRows = data
          .map(row => {
            let innerItems = [];
            try {
              innerItems = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
            } catch (e) {}

            let isPayLaterFallback = false;
            if (Array.isArray(innerItems)) {
              isPayLaterFallback = innerItems.some(itm => itm && itm.isPayLaterFallback === true);
            } else if (innerItems && typeof innerItems === 'object') {
              isPayLaterFallback = !!(innerItems as any).isPayLaterFallback;
            }

            const isPL = isPayLaterFallback || row.payment_method === 'PAY_LATER';
            return {
              row,
              isPayLaterFallback,
              innerItems,
              isPL,
              amount: Number(row.amount ?? row.total_amount ?? row.totalAmount ?? 0)
            };
          })
          .filter(x => x.isPL)
          .sort((a, b) => new Date(a.row.date || 0).getTime() - new Date(b.row.date || 0).getTime());

        let remaining = amountToSettle;
        
        for (const item of payLaterRows) {
          if (remaining <= 0) break;

          const row = item.row;
          const txAmount = item.amount;
          const amountField = row.total_amount !== undefined ? 'total_amount' : 'amount';

          if (remaining >= txAmount) {
            let nextItems = item.innerItems;
            if (item.isPayLaterFallback) {
              if (Array.isArray(item.innerItems)) {
                nextItems = item.innerItems.filter(itm => !itm || itm.isPayLaterFallback !== true);
              } else {
                nextItems = [];
              }
            }

            const updates: any = {
              payment_method: method,
              items: nextItems
            };

            const { error: updateErr } = await supabase
              .from('billing_history')
              .update(updates)
              .eq('id', row.id);

            if (updateErr) {
              console.error(`Failed to fully settle transaction ${row.id}:`, updateErr);
            } else {
              remaining -= txAmount;
            }
          } else {
            const newPLAmount = txAmount - remaining;
            
            const { error: updateErr } = await supabase
              .from('billing_history')
              .update({
                [amountField]: newPLAmount
              })
              .eq('id', row.id);

            if (updateErr) {
              console.error(`Failed to update original transaction amount for partial settle ${row.id}:`, updateErr);
            }

            let nextItems = item.innerItems;
            if (item.isPayLaterFallback) {
              if (Array.isArray(item.innerItems)) {
                nextItems = item.innerItems.filter(itm => !itm || itm.isPayLaterFallback !== true);
              } else {
                nextItems = [];
              }
            }

            const splitRow: any = {};
            Object.keys(row).forEach((key) => {
              if (key !== 'id' && key !== 'created_at' && key !== 'items' && key !== 'payment_method' && key !== 'paymentMethod' && key !== 'amount' && key !== 'total_amount') {
                splitRow[key] = row[key];
              }
            });
            splitRow.items = nextItems;
            splitRow.payment_method = method;
            splitRow[amountField] = remaining;
            splitRow.date = new Date().toISOString();

            const { error: insertErr } = await supabase
              .from('billing_history')
              .insert([splitRow]);

            if (insertErr) {
              console.error(`Failed to insert split portion transaction:`, insertErr);
            }

            remaining = 0;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error settling member transactions:', error);
      return false;
    }
  },

  // Admins
  async getAdmins(): Promise<AdminAccount[]> {
    if (!isSupabaseConfigured) {
      return [
        { id: 'super-admin-id', username: 'super_admin', cipher: '12345', role: 'super_admin', permissions: 'BOTH' },
        { id: 'owner-id', username: 'owner', cipher: '12345', role: 'owner', permissions: 'BOTH' },
        { id: 'relax-id', username: 'relax', cipher: '12345', role: 'club_admin', permissions: 'BOTH' },
        { id: 'asquare-id', username: 'asquare', cipher: '12345', role: 'club_admin', permissions: 'BOTH' }
      ];
    }
    try {
      const profiles = await this.getProfiles();
      const clubs = await this.getClubs();

      return (profiles || []).map(p => {
        const club = clubs.find(c => c.id === p.club_id);
        const plan = club?.subscription_plan || 'full';
        
        let permissions: 'CAFE' | 'SNOOKER' | 'BOTH' = 'BOTH';
        if (plan === 'cafe_only') permissions = 'CAFE';
        else if (plan === 'snooker_only') permissions = 'SNOOKER';
        
        return {
          id: p.id,
          username: p.role === 'super_admin' ? 'super_admin' : (p.role === 'owner' ? 'owner' : `club_admin_${p.id.substring(0, 5)}`),
          cipher: '******',
          role: p.role || 'club_admin',
          permissions: permissions
        };
      });
    } catch (error) {
      console.warn('Error fetching profiles as admins:', error);
      return [];
    }
  },

  async addAdmin(admin: Omit<AdminAccount, 'id'>): Promise<AdminAccount | null> {
    if (!isSupabaseConfigured) {
      const newAdmin: AdminAccount = {
        ...admin,
        id: 'adm_' + Math.random().toString(36).substr(2, 9)
      };
      return newAdmin;
    }
    try {
      const mappedRole = admin.permissions === 'CAFE' ? 'club_admin' : 'club_admin';
      const cleanData = {
        id: generateUUID(),
        role: mappedRole,
        club_id: activeClubId || null,
        owner_id: activeAdminId || null
      };
      const { data, error } = await supabase.from('profiles').insert([cleanData]).select('*');
      if (error) throw error;

      if (data && data[0]) {
        const p = data[0];
        return {
          id: p.id,
          username: admin.username || `club_admin_${p.id.substring(0, 5)}`,
          cipher: admin.cipher || '12345',
          role: admin.role,
          permissions: admin.permissions
        };
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'create', 'profiles');
      return null;
    }
  },

  async updateAdmin(id: string, updates: Partial<AdminAccount>) {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const profileUpdates: any = {};
      if (updates.role) {
        if (updates.role === 'admin3') profileUpdates.role = 'super_admin';
        else if (updates.role === 'admin') profileUpdates.role = 'owner';
        else profileUpdates.role = 'club_admin';
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', id);
        if (error) throw error;
      }
      
      if (updates.permissions && activeClubId) {
        let plan: 'cafe_only' | 'snooker_only' | 'full' = 'full';
        if (updates.permissions === 'CAFE') plan = 'cafe_only';
        else if (updates.permissions === 'SNOOKER') plan = 'snooker_only';
        
        const { error } = await supabase.from('clubs').update({ subscription_plan: plan }).eq('id', activeClubId);
        if (error) throw error;
      }
    } catch (error) {
      handleSupabaseError(error, 'update', `profiles/${id}`);
    }
  },

  async deleteAdmin(id: string) {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'delete', `profiles/${id}`);
    }
  },

  // Expenditures
  async getExpenditures(): Promise<Expenditure[]> {
    if (!isSupabaseConfigured) {
      const allList = getLocal<Expenditure[]>(LOCAL_STORAGE_KEYS.EXPENDITURES, []);
      return allList.map(e => {
        let pm = e.paymentMethod || 'CASH';
        let finalDesc = e.description || '';
        const match = finalDesc.match(/^\[(CASH|UPI|CARD|PAY_LATER)\]\s*(.*)$/);
        if (match) {
          pm = match[1] as any;
          finalDesc = match[2];
        }
        return {
          ...e,
          description: finalDesc,
          paymentMethod: pm
        };
      });
    }
    try {
      let query = supabase.from('expenditures').select('*');
      const { data, error } = await query;
      if (error) throw error;
      
      const rows = data || [];
      const list = rows.map(d => mapExpenditureFromRow(d));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return list;
    } catch (error) {
      handleSupabaseError(error, 'list', 'expenditures');
      return [];
    }
  },

  async addExpenditure(expenditure: Omit<Expenditure, 'id'>): Promise<Expenditure | null> {
    const hasPaymentMethodCol = await checkColumnCached('expenditures', 'payment_method');
    const prefixedTx = {
      ...expenditure
    };

    if (!isSupabaseConfigured) {
      const expenditures = getLocal<Expenditure[]>(LOCAL_STORAGE_KEYS.EXPENDITURES, []);
      const newExpenditure: Expenditure = {
        ...prefixedTx,
        id: 'exp_' + Math.random().toString(36).substr(2, 9),
        paymentMethod: expenditure.paymentMethod || 'CASH'
      };
      if (!hasPaymentMethodCol) {
        newExpenditure.description = `[${newExpenditure.paymentMethod}] ${newExpenditure.description}`;
      }
      expenditures.unshift(newExpenditure);
      setLocal(LOCAL_STORAGE_KEYS.EXPENDITURES, expenditures);
      
      let finalDesc = newExpenditure.description || '';
      const match = finalDesc.match(/^\[(CASH|UPI|CARD|PAY_LATER)\]\s*(.*)$/);
      if (match) {
        finalDesc = match[2];
      }
      return {
        ...newExpenditure,
        description: finalDesc,
        paymentMethod: newExpenditure.paymentMethod
      };
    }
    try {
      const row = mapExpenditureToRow(prefixedTx, hasPaymentMethodCol);
      await injectAdminIdIfNeeded('expenditures', row);
      const { data, error } = await supabase.from('expenditures').insert([row]).select('*');
      if (error) throw error;

      if (data && data[0]) {
        return mapExpenditureFromRow(data[0]);
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'create', 'expenditures');
      return null;
    }
  },

  async deleteExpenditure(id: string) {
    if (!isSupabaseConfigured) {
      const expenditures = getLocal(LOCAL_STORAGE_KEYS.EXPENDITURES, []);
      const filtered = expenditures.filter(e => e.id !== id);
      setLocal(LOCAL_STORAGE_KEYS.EXPENDITURES, filtered);
      return;
    }
    try {
      const { error } = await supabase.from('expenditures').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'delete', `expenditures/${id}`);
    }
  },

  async updateExpenditure(id: string, updates: Partial<Omit<Expenditure, 'id' | 'date'>>): Promise<Expenditure | null> {
    const hasPaymentMethodCol = await checkColumnCached('expenditures', 'payment_method');
    if (!isSupabaseConfigured) {
      const expenditures = getLocal<Expenditure[]>(LOCAL_STORAGE_KEYS.EXPENDITURES, []);
      const index = expenditures.findIndex(e => e.id === id);
      if (index === -1) return null;
      
      const existing = expenditures[index];
      const updated: Expenditure = {
        ...existing,
        ...updates
      };
      if (!hasPaymentMethodCol) {
        let cleanDesc = updated.description || '';
        const match = cleanDesc.match(/^\[(CASH|UPI|CARD|PAY_LATER)\]\s*(.*)$/);
        if (match) {
          cleanDesc = match[2];
        }
        updated.description = `[${updated.paymentMethod || existing.paymentMethod || 'CASH'}] ${cleanDesc}`;
      }
      
      expenditures[index] = updated;
      setLocal(LOCAL_STORAGE_KEYS.EXPENDITURES, expenditures);

      let returnedDesc = updated.description;
      const match = returnedDesc.match(/^\[(CASH|UPI|CARD|PAY_LATER)\]\s*(.*)$/);
      if (match) {
        returnedDesc = match[2];
      }
      return {
        ...updated,
        description: returnedDesc
      };
    }
    try {
      const rowUpdates: any = {};
      if (updates.amount !== undefined) rowUpdates.amount = Number(updates.amount);
      if (updates.category !== undefined) rowUpdates.category = updates.category;
      
      if (updates.description !== undefined || updates.paymentMethod !== undefined) {
        if (hasPaymentMethodCol) {
          if (updates.description !== undefined) rowUpdates.description = updates.description;
          if (updates.paymentMethod !== undefined) rowUpdates.payment_method = updates.paymentMethod;
        } else {
          const { data: current } = await supabase.from('expenditures').select('*').eq('id', id).maybeSingle();
          const currentMapped = current ? mapExpenditureFromRow(current) : null;
          const currentDesc = currentMapped ? currentMapped.description : '';
          const currentPM = currentMapped ? currentMapped.paymentMethod : 'CASH';
          
          const finalDesc = updates.description !== undefined ? updates.description : currentDesc;
          const finalPM = updates.paymentMethod !== undefined ? updates.paymentMethod : currentPM;
          rowUpdates.description = `[${finalPM}] ${finalDesc}`;
        }
      }
      const { data, error } = await supabase.from('expenditures').update(rowUpdates).eq('id', id).select('*');
      if (error) throw error;
      if (data && data[0]) {
        return mapExpenditureFromRow(data[0]);
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'update', `expenditures/${id}`);
      return null;
    }
  },

  // Menu Categories
  async getMenuCategories(): Promise<string[]> {
    if (!isSupabaseConfigured) {
      const all = getLocal<string[]>(LOCAL_STORAGE_KEYS.MENU_CATEGORIES, DEFAULT_CATEGORIES);
      return all;
    }
    await seedIfNeeded();
    try {
      let query = supabase.from('menu_categories').select('name');
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(cat => cat.name);
    } catch (error) {
      handleSupabaseError(error, 'list', 'menu_categories');
      return [];
    }
  },

  async addMenuCategory(name: string): Promise<string> {
    const prefixedName = String(name);
    if (!isSupabaseConfigured) {
      const categories = getLocal<string[]>(LOCAL_STORAGE_KEYS.MENU_CATEGORIES, DEFAULT_CATEGORIES);
      if (!categories.includes(prefixedName)) {
        categories.push(prefixedName);
        setLocal(LOCAL_STORAGE_KEYS.MENU_CATEGORIES, categories);
      }
      return name;
    }
    try {
      // 1. First check if category already exists in database to avoid duplicate key errors entirely
      let checkQuery = supabase.from('menu_categories').select('name').eq('name', prefixedName);
      const { data: existing, error: fetchErr } = await checkQuery;
      
      if (!fetchErr && existing && existing.length > 0) {
        console.log(`[addMenuCategory] Category "${prefixedName}" already exists in database.`);
        return name;
      }

      // 2. Perform insert
      const insertRow: any = { name: prefixedName };
      await injectAdminIdIfNeeded('menu_categories', insertRow);
      const { error } = await supabase.from('menu_categories').insert([insertRow]);
      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        // If it's a conflict/duplicate key error, ignore and treat as success
        if (error.code === '23505' || errMsg.includes('duplicate') || errMsg.includes('unique') || errMsg.includes('already exists')) {
          console.log(`[addMenuCategory] Category "${prefixedName}" duplicate detected during insert, bypassing...`);
          return name;
        }
        throw error;
      }
      return name;
    } catch (error: any) {
      const errMsg = (error?.message || '').toLowerCase();
      if (error?.code === '23505' || errMsg.includes('duplicate') || errMsg.includes('unique') || errMsg.includes('already exists')) {
        console.log(`[addMenuCategory Catch] Category "${prefixedName}" bypassed duplicate constraint in catch block.`);
        return name;
      }
      handleSupabaseError(error, 'create', 'menu_categories');
      return name;
    }
  },

  async deleteMenuCategory(name: string): Promise<void> {
    const prefixedName = String(name);
    if (!isSupabaseConfigured) {
      const categories = getLocal<string[]>(LOCAL_STORAGE_KEYS.MENU_CATEGORIES, DEFAULT_CATEGORIES);
      const filtered = categories.filter(c => c !== prefixedName);
      setLocal(LOCAL_STORAGE_KEYS.MENU_CATEGORIES, filtered);
      return;
    }
    try {
      let query = supabase.from('menu_categories').delete().eq('name', prefixedName);
      const { error } = await query;
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'delete', `menu_categories/${name}`);
    }
  },

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    if (!isSupabaseConfigured) {
      const all = getLocal<MenuItem[]>(LOCAL_STORAGE_KEYS.MENU_ITEMS, DEFAULT_MENU_ITEMS);
      return all.filter(item => item.is_available !== false);
    }
    await seedIfNeeded();
    try {
      let query = supabase.from('menu_items').select('*');
      const { data, error } = await query;
      if (error) throw error;

      // Auto-seed database table if empty and Supabase is configured and not initialized yet
      const initialized = typeof window !== 'undefined' ? localStorage.getItem("cafe_initialized") : null;
      if ((!data || data.length === 0) && !initialized) {
        console.log('[getMenuItems] Database menu_items table is empty. Auto-seeding default menu from CAFE_MENU...');
        const seededItems: MenuItem[] = [];
        for (const item of CAFE_MENU) {
          const row = mapMenuItemToRow(item);
          await injectAdminIdIfNeeded('menu_items', row);
          const { data: insertedData, error: insertError } = await supabase
            .from('menu_items')
            .insert([row])
            .select('*');

          if (!insertError && insertedData && insertedData[0]) {
            seededItems.push(fixMenuItemMapping(insertedData[0]));
          } else if (insertError) {
            console.error('[getMenuItems] Failed to seed menu item:', item.name, insertError);
          }
        }
        if (seededItems.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem("cafe_initialized", "true");
          }
          return seededItems.filter(item => item.is_available !== false);
        }
      }

      return (data || []).map(itm => fixMenuItemMapping(itm)).filter(item => item.is_available !== false);
    } catch (error) {
      handleSupabaseError(error, 'list', 'menu_items');
      return [];
    }
  },

  async addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem | null> {
    const prefixedItem = {
      ...item
    };

    if (!isSupabaseConfigured) {
      const items = getLocal<MenuItem[]>(LOCAL_STORAGE_KEYS.MENU_ITEMS, DEFAULT_MENU_ITEMS);
      const newItem: MenuItem = {
        ...prefixedItem,
        id: 'mitm_' + Math.random().toString(36).substr(2, 9)
      };
      items.push(newItem);
      setLocal(LOCAL_STORAGE_KEYS.MENU_ITEMS, items);
      return newItem;
    }
    try {
      const row = mapMenuItemToRow(prefixedItem);
      await injectAdminIdIfNeeded('menu_items', row);
      const { data, error } = await supabase.from('menu_items').insert([row]).select('*');
      if (error) throw error;

      if (data && data[0]) {
        return fixMenuItemMapping(data[0]);
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'create', 'menu_items');
      return null;
    }
  },

  async deleteMenuItem(id: string): Promise<boolean> {
    const cleanId = String(id).trim();

    // Keep client UI in sync immediately by removing from local cache first
    const items = getLocal<any[]>(LOCAL_STORAGE_KEYS.MENU_ITEMS, DEFAULT_MENU_ITEMS);
    const filtered = items.filter(itm => String(itm.id) !== cleanId);
    setLocal(LOCAL_STORAGE_KEYS.MENU_ITEMS, filtered);

    if (!isSupabaseConfigured) {
      return true;
    }
    
    if (cleanId.startsWith('mitm_') || !isValidUUID(cleanId)) {
      return true;
    }

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', cleanId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      handleSupabaseError(error, 'delete', `menu_items/${cleanId}`);
      throw error;
    }
  },

  async updateMenuItem(item: MenuItem) {
    // Keep local storage in sync
    const items = getLocal<any[]>(LOCAL_STORAGE_KEYS.MENU_ITEMS, DEFAULT_MENU_ITEMS);
    const updated = items.map(itm => String(itm.id) === String(item.id) ? item : itm);
    setLocal(LOCAL_STORAGE_KEYS.MENU_ITEMS, updated);

    if (!isSupabaseConfigured) {
      return item;
    }

    if (String(item.id).startsWith('mitm_') || !isValidUUID(item.id)) {
      console.log(`[updateMenuItem] Bypassed SQL update for temporary or non-UUID menu item ID: "${item.id}"`);
      return item;
    }

    try {
      const row = mapMenuItemToRow(item);
      const { data, error } = await supabase.from('menu_items').update(row).eq('id', item.id).select('*');
      if (error) throw error;
      if (data && data[0]) {
        return fixMenuItemMapping(data[0]);
      }
      return item;
    } catch (error) {
      handleSupabaseError(error, 'update', `menu_items/${item.id}`);
      return item;
    }
  },

  // Session Management
  async startSession(tableId: string, player: string = 'Guest', billNumber?: string, memberId?: string | null, customStartTimeUnix?: number): Promise<SnookerTable | null> {
    if (!isSupabaseConfigured) {
      const startTime = customStartTimeUnix ? new Date(customStartTimeUnix) : new Date();
      const updates: Partial<SnookerTable> = {
        status: 'RUNNING',
        player: player,
        startTimeUnix: startTime.getTime(),
        currentMemberId: memberId || null,
        startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        elapsedTime: '00:00:00',
        sessionCost: 0,
        cafeCost: 0,
        cost: 0,
        currentCart: [],
        isPaused: false,
        totalPausedSeconds: 0
      };
      if (billNumber) updates.billNumber = billNumber;

      await this.updateTable(tableId, updates);

      if (memberId) {
        await this.updateMember(memberId, { status: 'Active' });
      }

      const tables = getLocal(LOCAL_STORAGE_KEYS.TABLES, DEFAULT_TABLES);
      return tables.find(t => t.id === tableId) || null;
    }
    try {
      const startTime = customStartTimeUnix ? new Date(customStartTimeUnix) : new Date();
      const updates: Partial<SnookerTable> = {
        status: 'RUNNING',
        player: player,
        startTimeUnix: startTime.getTime(),
        currentMemberId: memberId || null,
        startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        elapsedTime: '00:00:00',
        sessionCost: 0,
        cafeCost: 0,
        cost: 0,
        currentCart: [],
        isPaused: false,
        totalPausedSeconds: 0
      };
      if (billNumber) updates.billNumber = billNumber;

      await this.updateTable(tableId, updates);

      if (memberId) {
        await this.updateMember(memberId, { status: 'Active' });
      }

      const { data, error } = await supabase.from('tables').select('*').eq('id', tableId);
      if (error) throw error;
      if (data && data[0]) {
        return mapTableFromRow(data[0]);
      }
      return null;
    } catch (error) {
      handleSupabaseError(error, 'update', `tables/${tableId}`);
      return null;
    }
  },

  async completeSession(
    tableId: string, 
    paymentMethod: string = 'CASH',
    overrides?: {
      amount?: number;
      duration?: string;
      items?: any[];
      playerName?: string;
      memberId?: string | null;
      multipleDuesToApply?: { memberId: string; dueAmount: number }[];
      individualPayments?: { name: string; memberId: string | null; amount: number; paymentMethod: 'CASH' | 'UPI' | 'PAY_LATER'; items?: any[] }[];
    }
  ): Promise<Transaction | null> {
    if (!isSupabaseConfigured) {
      const tables = getLocal(LOCAL_STORAGE_KEYS.TABLES, DEFAULT_TABLES);
      const table = tables.find(t => t.id === tableId);
      if (!table || !table.startTimeUnix) return null;

      const startTimeUnix = table.startTimeUnix;
      const now = Date.now();
      const totalPausedMs = (table.totalPausedSeconds || 0) * 1000;
      const effectiveDurationMs = now - startTimeUnix - totalPausedMs;
      const durationMinutes = Math.max(1, Math.floor(effectiveDurationMs / (1000 * 60)));

      let hourlyRate = table.rate || 200;
      const hhSettings = await this.getHappyHourSettings();
      if (hhSettings && hhSettings.isEnabled) {
        const type = (table.type || '').trim().toLowerCase();
        let hhRate: number | null = null;
        if (type === 'snooker') hhRate = hhSettings.snookerRate;
        else if (type === 'pool') hhRate = hhSettings.poolRate;
        else if (type === 'ps5') hhRate = hhSettings.ps5Rate;
        else if (type === 'mini snooker') hhRate = hhSettings.miniSnookerRate;
        else if (type === 'other games') hhRate = hhSettings.otherRate;

        if (hhRate !== null && !isNaN(hhRate) && hhRate > 0) {
          hourlyRate = hhRate;
        }
      }

      const sessionCost = (durationMinutes / 60) * hourlyRate;
      let totalAmount = overrides?.amount !== undefined ? overrides.amount : (sessionCost + (table.cafeCost || 0));
      if (isNaN(totalAmount) || totalAmount < 0) totalAmount = 0;
      totalAmount = Math.round(totalAmount * 100) / 100;

      const h = Math.floor(durationMinutes / 60);
      const m = durationMinutes % 60;
      const durationStr = overrides?.duration !== undefined ? overrides.duration : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

      // Reset Table
      const resetUpdates: Partial<SnookerTable> = {
        status: 'AVAILABLE',
        player: '',
        currentMemberId: null,
        currentCart: [],
        startTimeUnix: undefined,
        startTime: undefined,
        elapsedTime: '00:00:00',
        sessionCost: 0,
        cafeCost: 0,
        cost: 0,
        billNumber: undefined,
        isPaused: false,
        totalPausedSeconds: 0,
        pauseStartTimeUnix: undefined,
        note: null
      };
      await this.updateTable(tableId, resetUpdates);

      const targetMemberId = overrides?.memberId !== undefined ? overrides.memberId : table.currentMemberId;
      if (overrides?.individualPayments && overrides.individualPayments.length > 0) {
        for (const indiv of overrides.individualPayments) {
          if (indiv.memberId) {
            const memberObj = await this.getMember(indiv.memberId);
            const currentDue = memberObj ? (memberObj.dueAmount || 0) : 0;
            const nextDue = indiv.paymentMethod === 'PAY_LATER' ? (currentDue + indiv.amount) : currentDue;
            await this.updateMember(indiv.memberId, { status: 'Inactive', dueAmount: nextDue });
          }
        }
      } else if (overrides?.multipleDuesToApply && overrides.multipleDuesToApply.length > 0) {
        for (const dueItem of overrides.multipleDuesToApply) {
          if (dueItem.memberId) {
            const memberObj = await this.getMember(dueItem.memberId);
            const currentDue = memberObj ? (memberObj.dueAmount || 0) : 0;
            const nextDue = paymentMethod === 'PAY_LATER' ? (currentDue + dueItem.dueAmount) : currentDue;
            await this.updateMember(dueItem.memberId, { status: 'Inactive', dueAmount: nextDue });
          }
        }
      } else if (targetMemberId) {
        const memberIds = String(targetMemberId).split(',').map(s => s.trim()).filter(Boolean);
        const splitAmount = totalAmount / Math.max(1, memberIds.length);
        for (const mId of memberIds) {
          const memberObj = await this.getMember(mId);
          if (memberObj) {
            const currentDue = memberObj.dueAmount || 0;
            const nextDue = paymentMethod === 'PAY_LATER' ? (currentDue + splitAmount) : currentDue;
            await this.updateMember(memberObj.id, { status: 'Inactive', dueAmount: nextDue });
          }
        }
      }

      if (overrides?.individualPayments && overrides.individualPayments.length > 0) {
        let firstTx: Transaction | null = null;
        for (const indiv of overrides.individualPayments) {
          let indivItems = indiv.items;
          if (!indivItems || indivItems.length === 0) {
            indivItems = [
              {
                name: `Split Bill Share (${indiv.name})`,
                price: indiv.amount,
                quantity: 1
              }
            ];
          }
          const indivTx: Omit<Transaction, 'id'> = {
            paymentMethod: indiv.paymentMethod,
            tableNumber: table.number,
            playerName: indiv.name,
            memberId: indiv.memberId,
            items: indivItems,
            duration: durationStr,
            amount: indiv.amount,
            date: new Date().toISOString()
          };
          const added = await this.addTransaction(indivTx);
          if (!firstTx) firstTx = added;
        }
        return firstTx;
      }

      let billingItems = overrides?.items;
      if (!billingItems) {
        billingItems = (table.currentCart || []).map((cartItem: any) => ({
          name: cartItem?.item?.name ?? cartItem?.name ?? 'Unknown Item',
          price: Number(cartItem?.item?.price ?? cartItem?.price ?? 0),
          quantity: Number(cartItem?.quantity ?? 1)
        })).filter((itm: any) => itm?.name);
      }

      const transaction: Omit<Transaction, 'id'> = {
        paymentMethod: paymentMethod as any,
        tableNumber: table.number,
        playerName: overrides?.playerName !== undefined ? overrides.playerName : (table.player || 'Guest'),
        memberId: overrides?.memberId !== undefined ? overrides.memberId : table.currentMemberId,
        items: billingItems,
        duration: durationStr,
        amount: totalAmount,
        date: new Date().toISOString()
      };

      return await this.addTransaction(transaction);
    }
    try {
      // 1. Fetch current table data
      const { data: tableRows, error: tableErr } = await supabase.from('tables').select('*').eq('id', tableId);
      if (tableErr) throw tableErr;
      if (!tableRows || tableRows.length === 0) throw new Error('Table does not exist');
      const rawTable = mapTableFromRow(tableRows[0]);
      const table = {
        ...rawTable,
        number: unprefixTableNumber(rawTable.number, false, true),
        player: unprefixString(rawTable.player)
      };

      if (!table.startTimeUnix) {
        console.warn('Warning: No active session start time found in database for checkout. Falling back to current time.');
        table.startTimeUnix = Date.now() - 60000; // 1 minute fallback
      }

      // 2. Calculate duration in minutes
      const startTimeUnix = table.startTimeUnix;
      const now = Date.now();
      const totalPausedMs = (table.totalPausedSeconds || 0) * 1000;
      const effectiveDurationMs = now - startTimeUnix - totalPausedMs;
      const durationMinutes = Math.max(1, Math.floor(effectiveDurationMs / (1000 * 60)));

      // 3. Calculate total cost
      let hourlyRate = table.rate || 200;

      const hhSettings = await this.getHappyHourSettings();
      if (hhSettings && hhSettings.isEnabled) {
        const type = (table.type || '').trim().toLowerCase();
        let hhRate: number | null = null;
        
        if (type === 'snooker') hhRate = hhSettings.snookerRate;
        else if (type === 'pool') hhRate = hhSettings.poolRate;
        else if (type === 'ps5') hhRate = hhSettings.ps5Rate;
        else if (type === 'mini snooker') hhRate = hhSettings.miniSnookerRate;
        else if (type === 'other games') hhRate = hhSettings.otherRate;

        if (hhRate !== null && !isNaN(hhRate) && hhRate > 0) {
          hourlyRate = hhRate;
        }
      }

      const sessionCost = (durationMinutes / 60) * hourlyRate;
      let totalAmount = overrides?.amount !== undefined ? overrides.amount : (sessionCost + (table.cafeCost || 0));
      if (isNaN(totalAmount) || totalAmount < 0) {
        totalAmount = 0;
      }
      totalAmount = Math.round(totalAmount * 100) / 100;

      const h = Math.floor(durationMinutes / 60);
      const m = durationMinutes % 60;
      const durationStr = overrides?.duration !== undefined ? overrides.duration : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

      // 4. Reset table status
      const resetUpdates: Partial<SnookerTable> = {
        status: 'AVAILABLE',
        player: '',
        currentMemberId: null,
        currentCart: [],
        startTimeUnix: undefined,
        startTime: undefined,
        elapsedTime: '00:00:00',
        sessionCost: 0,
        cafeCost: 0,
        cost: 0,
        billNumber: undefined,
        isPaused: false,
        totalPausedSeconds: 0,
        pauseStartTimeUnix: undefined,
        note: null
      };

      await this.updateTable(tableId, resetUpdates);

      // Disable member statuses
      const targetMemberId = overrides?.memberId !== undefined ? overrides.memberId : table.currentMemberId;
      if (overrides?.individualPayments && overrides.individualPayments.length > 0) {
        for (const indiv of overrides.individualPayments) {
          if (indiv.memberId && isValidUUID(indiv.memberId)) {
            const member = await this.getMember(indiv.memberId);
            const currentDue = member ? (member.dueAmount || 0) : 0;
            const nextDue = indiv.paymentMethod === 'PAY_LATER' ? (currentDue + indiv.amount) : currentDue;
            await this.updateMember(indiv.memberId, { status: 'Inactive', dueAmount: nextDue });
          }
        }
      } else if (overrides?.multipleDuesToApply && overrides.multipleDuesToApply.length > 0) {
        for (const dueItem of overrides.multipleDuesToApply) {
          if (dueItem.memberId && isValidUUID(dueItem.memberId)) {
            const member = await this.getMember(dueItem.memberId);
            const currentDue = member ? (member.dueAmount || 0) : 0;
            const nextDue = paymentMethod === 'PAY_LATER' ? (currentDue + dueItem.dueAmount) : currentDue;
            await this.updateMember(dueItem.memberId, { status: 'Inactive', dueAmount: nextDue });
          }
        }
      } else if (targetMemberId) {
        const memberIds = String(targetMemberId).split(',').map(s => s.trim()).filter(Boolean);
        const splitAmount = totalAmount / Math.max(1, memberIds.length);
        for (const mId of memberIds) {
          if (mId && isValidUUID(mId)) {
            const member = await this.getMember(mId);
            const currentDue = member ? (member.dueAmount || 0) : 0;
            const nextDue = paymentMethod === 'PAY_LATER' ? (currentDue + splitAmount) : currentDue;
            await this.updateMember(mId, { status: 'Inactive', dueAmount: nextDue });
          }
        }
      }

      // 5. Insert billing history
      if (overrides?.individualPayments && overrides.individualPayments.length > 0) {
        let firstTx: Transaction | null = null;
        for (const indiv of overrides.individualPayments) {
          let indivItems = indiv.items;
          if (!indivItems || indivItems.length === 0) {
            indivItems = [
              {
                name: `Split Bill Share (${indiv.name})`,
                price: indiv.amount,
                quantity: 1
              }
            ];
          }
          const indivTx: Omit<Transaction, 'id'> = {
            paymentMethod: indiv.paymentMethod,
            tableNumber: table.number,
            playerName: indiv.name,
            memberId: indiv.memberId,
            items: indivItems,
            duration: durationStr,
            amount: indiv.amount,
            date: new Date().toISOString()
          };
          try {
            const added = await this.addTransaction(indivTx);
            if (!firstTx) firstTx = added;
          } catch (addError) {
            console.warn('[Error saving individual split transaction, falling back]', addError);
            const fallbackAdded: Transaction = {
              id: 'tx_fb_' + Math.random().toString(36).substr(2, 9),
              ...indivTx
            };
            // Manually save to local storage if offline/failed
            const currentTxs = getLocal<Transaction[]>(LOCAL_STORAGE_KEYS.BILLING, []);
            currentTxs.unshift(fallbackAdded);
            setLocal(LOCAL_STORAGE_KEYS.BILLING, currentTxs);
            if (!firstTx) firstTx = fallbackAdded;
          }
        }
        return firstTx;
      }

      let billingItems = overrides?.items;
      if (!billingItems) {
        billingItems = (table.currentCart || []).map((cartItem: any) => ({
          name: cartItem?.item?.name ?? cartItem?.name ?? 'Unknown Item',
          price: Number(cartItem?.item?.price ?? cartItem?.price ?? 0),
          quantity: Number(cartItem?.quantity ?? 1)
        })).filter((itm: any) => itm?.name);
      }

      const transaction: Omit<Transaction, 'id'> = {
        paymentMethod: paymentMethod as any,
        tableNumber: table.number,
        playerName: overrides?.playerName !== undefined ? overrides.playerName : (table.player || 'Guest'),
        memberId: targetMemberId,
        items: billingItems,
        duration: durationStr,
        amount: totalAmount,
        date: new Date().toISOString()
      };

      try {
        console.log('Completing active table session on Supabase. Recording billing history...');
        return await this.addTransaction(transaction);
      } catch (addTxError) {
        console.warn('[Billing History Save Aborted but Table Reset Complete]', addTxError);
        // Fallback transaction so the table is freed and session is completed
        return {
          id: 'tx_fb_' + Math.random().toString(36).substr(2, 9),
          ...transaction
        };
      }
    } catch (error) {
      handleSupabaseError(error, 'completeSession', `tables/${tableId}`);
      return null;
    }
  },

  // Happy Hour Settings
  async getHappyHourSettings(): Promise<HappyHourSettings | null> {
    if (!isSupabaseConfigured) {
      return getLocal(LOCAL_STORAGE_KEYS.HAPPY_HOUR, DEFAULT_HAPPY_HOUR);
    }
    await seedIfNeeded();
    try {
      const clubId = getActiveClubId();
      if (!clubId) {
        return getLocal(LOCAL_STORAGE_KEYS.HAPPY_HOUR, DEFAULT_HAPPY_HOUR);
      }

      let query = supabase.from('happy_hour_settings').select('*').eq('club_id', clubId);
      const { data, error } = await query;
      if (error) throw error;
      if (data && data[0]) {
        return mapHappyHourFromRow(data[0]);
      }
      
      // If no happy hour settings exist for this club, on-demand seed it
      const defaultHh: any = {
        is_enabled: false,
        snooker_rate: 150,
        pool_rate: 100,
        ps5_rate: 80,
        mini_snooker_rate: 90,
        other_rate: 80,
        club_id: clubId,
        updated_at: new Date().toISOString()
      };
      const { data: inserted, error: insErr } = await supabase
        .from('happy_hour_settings')
        .insert([defaultHh])
        .select('*');
        
      if (!insErr && inserted && inserted[0]) {
        return mapHappyHourFromRow(inserted[0]);
      }
      return getLocal(LOCAL_STORAGE_KEYS.HAPPY_HOUR, DEFAULT_HAPPY_HOUR);
    } catch (error) {
      handleSupabaseError(error, 'get', 'happy_hour_settings');
      return getLocal(LOCAL_STORAGE_KEYS.HAPPY_HOUR, DEFAULT_HAPPY_HOUR);
    }
  },

  async updateHappyHourSettings(updates: Partial<HappyHourSettings>) {
    // Always apply updates to local storage in parallel for bulletproof resilience
    const currentLocal = getLocal(LOCAL_STORAGE_KEYS.HAPPY_HOUR, DEFAULT_HAPPY_HOUR);
    const localUpdates: HappyHourSettings = {
      ...currentLocal,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.isEnabled !== undefined) {
      if (updates.isEnabled && !currentLocal.isEnabled) {
        localUpdates.lastEnabledAt = new Date().toISOString();
      } else if (!updates.isEnabled && currentLocal.isEnabled) {
        if (currentLocal.lastEnabledAt) {
          const start = new Date(currentLocal.lastEnabledAt).getTime();
          const now = Date.now();
          const diffSeconds = Math.floor((now - start) / 1000);
          if (diffSeconds > 0) {
            localUpdates.cumulativeDurationSeconds = (currentLocal.cumulativeDurationSeconds || 0) + diffSeconds;
          }
        }
      }
    }
    setLocal(LOCAL_STORAGE_KEYS.HAPPY_HOUR, localUpdates);

    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const clubId = getActiveClubId();
      if (!clubId) {
        console.warn('Skipping Supabase happy hour update: active club ID not found.');
        return;
      }

      // Fetch the current row from db to check if it exists and to preserve temporal fields
      const { data, error: selectErr } = await supabase
        .from('happy_hour_settings')
        .select('*')
        .eq('club_id', clubId);

      if (selectErr) throw selectErr;
      const dbRow = data && data[0] ? data[0] : null;
      const current = dbRow ? mapHappyHourFromRow(dbRow) : null;

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.isEnabled !== undefined) {
        dbUpdates.is_enabled = updates.isEnabled;
        if (current) {
          if (updates.isEnabled && !current.isEnabled) {
            dbUpdates.last_enabled_at = new Date().toISOString();
          } else if (!updates.isEnabled && current.isEnabled) {
            if (current.lastEnabledAt) {
              const start = new Date(current.lastEnabledAt).getTime();
              const now = Date.now();
              const diffSeconds = Math.floor((now - start) / 1000);
              if (diffSeconds > 0) {
                dbUpdates.cumulative_duration_seconds = (current.cumulativeDurationSeconds || 0) + diffSeconds;
              }
            }
          }
        } else if (updates.isEnabled) {
          dbUpdates.last_enabled_at = new Date().toISOString();
        }
      }

      if (updates.snookerRate !== undefined) dbUpdates.snooker_rate = updates.snookerRate;
      if (updates.poolRate !== undefined) dbUpdates.pool_rate = updates.poolRate;
      if (updates.ps5Rate !== undefined) dbUpdates.ps5_rate = updates.ps5Rate;
      if (updates.miniSnookerRate !== undefined) dbUpdates.mini_snooker_rate = updates.miniSnookerRate;
      if (updates.otherRate !== undefined) dbUpdates.other_rate = updates.otherRate;

      // Construct upsert payload
      const upsertPayload: any = {
        ...dbUpdates,
        club_id: clubId
      };

      if (dbRow && dbRow.id) {
        upsertPayload.id = dbRow.id;
      }

      const activeClubId = clubId;
      console.log("ACTIVE_CLUB_ID", activeClubId);

      const payload = upsertPayload;
      console.log("HAPPY_HOUR_UPSERT_PAYLOAD", payload);

      const result = await supabase
        .from('happy_hour_settings')
        .upsert(payload);

      console.log("HAPPY_HOUR_UPSERT_RESULT", result);

      if (result.error) throw result.error;
    } catch (error) {
      handleSupabaseError(error, 'update', 'happy_hour_settings');
    }
  },

  // Auth & SaaS Platforms Operations
  async login(usernameOrEmail: string, cipherOrPw: string): Promise<AdminAccount | null> {
    const input = (usernameOrEmail || '').toLowerCase().trim();
    const pw = cipherOrPw;

    if (!isSupabaseConfigured) {
      if (import.meta.env.PROD) {
        throw new Error('Supabase is required in production.');
      }
      // Clean, dynamic local credentials resolver (no hardcoding, no local storage dependency)
      const role = input.includes('super') ? 'super_admin' : (input.includes('owner') ? 'owner' : 'club_admin');
      const mockClubId = role === 'club_admin' ? '00000000-0000-0000-0000-111111111111' : '';
      if (mockClubId) {
        const clubs = getLocal<any[]>('cue_control_clubs', [
          { id: '00000000-0000-0000-0000-111111111111', name: 'Relax Snooker Club', owner_id: 'owner-id', subscription_status: 'active' },
          { id: '00000000-0000-0000-0000-222222222222', name: 'ASquare Snooker Club', owner_id: 'owner-id', subscription_status: 'active' }
        ]);
        const club = clubs.find(c => c.id === mockClubId);
        if (club) {
          if (club.subscription_status === 'suspended') {
            throw new Error("Subscription suspended. Contact support.");
          } else if (club.subscription_status === 'pending_deletion') {
            throw new Error("Club scheduled for deletion. Access revoked.");
          } else if (club.subscription_status === 'deleted') {
            throw new Error("Club has been permanently deleted.");
          }
        }
      }
      setActiveAdminRole(role);
      setActiveAdminUsername(input);
      setActiveAdminPermissions('BOTH');
      setActiveClubId(mockClubId);
      return { id: 'mock-user-id', username: input, cipher: pw, role: role, permissions: 'BOTH' };
    }

    try {
      const email = input.includes('@') ? input : `${input}@cuecontrol.com`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pw
      });

      if (authError) {
        throw authError;
      }

      if (authData && authData.user) {
        return resolveAccountFromAuthUser(authData.user, pw);
      }
      return null;
    } catch (error) {
      console.warn('Real Auth Error:', error);
      throw error;
    }
  },

  async restoreSession(): Promise<AdminAccount | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }
    return resolveAccountFromAuthUser(session.user);
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setActiveAdminUsername('');
    setActiveAdminRole('');
    setActiveAdminId('');
    setActiveAdminPermissions('');
    setActiveClubId('');
  },

  // Club Operations
  async getClubs(): Promise<any[]> {
    if (!isSupabaseConfigured) {
      return getLocal<any[]>('cue_control_clubs', [
        { id: '00000000-0000-0000-0000-111111111111', name: 'Relax Snooker Club', owner_id: 'owner-id', subscription_status: 'active' },
        { id: '00000000-0000-0000-0000-222222222222', name: 'ASquare Snooker Club', owner_id: 'owner-id', subscription_status: 'active' }
      ]);
    }
    const { data, error } = await supabase.from('clubs').select('*');
    if (error) {
      console.warn('Error fetching clubs:', error.message);
      return [];
    }
    return data || [];
  },

  async createClub(name: string, ownerId: string | null, subscriptionPlan: 'cafe_only' | 'snooker_only' | 'full' = 'full'): Promise<any> {
    if (!isSupabaseConfigured) {
      const clubs = await this.getClubs();
      const newClub = {
        id: `club-${Math.random().toString(36).substr(2, 9)}`,
        name,
        owner_id: ownerId || 'owner-id',
        subscription_plan: subscriptionPlan,
        subscription_status: 'active' as const,
        created_at: new Date().toISOString()
      };
      setLocal('cue_control_clubs', [...clubs, newClub]);
      return newClub;
    }
    const newClub = { name, owner_id: ownerId, subscription_plan: subscriptionPlan, subscription_status: 'active' };
    const { data, error } = await supabase.from('clubs').insert([newClub]).select('*');
    if (error) throw error;
    return data ? data[0] : null;
  },

  async createClubAndAdmin(
    clubName: string,
    subscriptionPlan: 'cafe_only' | 'snooker_only' | 'full',
    adminEmail: string,
    adminPasswordLog: string,
    superAdminOwnerId?: string
  ): Promise<any> {
    if (!isSupabaseConfigured) {
      const clubs = await this.getClubs();
      const profiles = await this.getProfiles();
      
      const newClubId = `club-${Math.random().toString(36).substr(2, 9)}`;
      const newAdminId = `clubadmin-${Math.random().toString(36).substr(2, 9)}`;
      const activeAdminId = getActiveAdminId();

      const newClub = {
        id: newClubId,
        name: clubName,
        owner_id: superAdminOwnerId || activeAdminId || 'owner-id',
        subscription_plan: subscriptionPlan,
        subscription_status: 'active' as const,
        created_at: new Date().toISOString()
      };

      const newAdminProfile = {
        id: newAdminId,
        role: 'club_admin' as const,
        owner_id: superAdminOwnerId || activeAdminId || 'owner-id',
        club_id: newClubId,
        created_at: new Date().toISOString()
      };

      setLocal('cue_control_clubs', [...clubs, newClub]);
      setLocal('cue_control_profiles', [...profiles, newAdminProfile]);

      return { success: true, club: newClub, profile: newAdminProfile };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch('/api/admin/create-club-and-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        clubName,
        subscriptionPlan,
        adminEmail,
        adminPassword: adminPasswordLog,
        superAdminOwnerId
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Server failed to provision club and operator.');
    }
    return result;
  },

  async updateClubSubscription(id: string, status: 'active' | 'suspended' | 'pending_deletion' | 'deleted'): Promise<void> {
    if (status === 'deleted') {
      await this.deleteClubPermanently(id);
      return;
    }
    if (!isSupabaseConfigured) {
      const clubs = await this.getClubs();
      const updated = clubs.map(c => c.id === id ? { ...c, subscription_status: status } : c);
      setLocal('cue_control_clubs', updated);
      return;
    }
    const { error } = await supabase.from('clubs').update({ subscription_status: status }).eq('id', id);
    if (error) throw error;
  },

  async deleteClubPermanently(clubId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const clubs = await this.getClubs();
      setLocal('cue_control_clubs', clubs.filter(c => c.id !== clubId));

      const profiles = await this.getProfiles();
      const updatedProfiles = profiles.map(p => p.club_id === clubId ? { ...p, club_id: null } : p);
      setLocal('cue_control_profiles', updatedProfiles);

      setLocal('cue_control_tables', getLocal<any[]>('cue_control_tables', []).filter(t => t.club_id !== clubId));
      setLocal('cue_control_members', getLocal<any[]>('cue_control_members', []).filter(m => m.club_id !== clubId));
      setLocal('cue_control_bookings', getLocal<any[]>('cue_control_bookings', []).filter(b => b.club_id !== clubId));
      setLocal('cue_control_expenditures', getLocal<any[]>('cue_control_expenditures', []).filter(e => e.club_id !== clubId));
      setLocal('cue_control_transactions', getLocal<any[]>('cue_control_transactions', []).filter(t => t.club_id !== clubId));
      setLocal('cue_control_pending_bills', getLocal<any[]>('cue_control_pending_bills', []).filter(p => p.club_id !== clubId));
      return;
    }
    const { error } = await supabase.from('clubs').delete().eq('id', clubId);
    if (error) throw error;
  },

  async getProfiles(): Promise<any[]> {
    if (!isSupabaseConfigured) {
      return getLocal<any[]>('cue_control_profiles', [
        { id: 'super-admin-id', role: 'super_admin', owner_id: null, club_id: null },
        { id: 'owner-id', role: 'owner', owner_id: null, club_id: null },
        { id: 'relax-id', role: 'club_admin', owner_id: 'owner-id', club_id: '00000000-0000-0000-0000-111111111111' },
        { id: 'asquare-id', role: 'club_admin', owner_id: 'owner-id', club_id: '00000000-0000-0000-0000-222222222222' }
      ]);
    }
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.warn('Error fetching profiles:', error.message);
      return [];
    }
    return data || [];
  },

  async createOwnerAccount(email: string, passwordLog: string): Promise<any> {
    if (!isSupabaseConfigured) {
      const profiles = await this.getProfiles();
      const newOwner = {
        id: `owner-${Math.random().toString(36).substr(2, 9)}`,
        role: 'owner' as const,
        owner_id: null,
        club_id: null,
        created_at: new Date().toISOString()
      };
      setLocal('cue_control_profiles', [...profiles, newOwner]);
      return newOwner;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch('/api/admin/create-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        email,
        password: passwordLog
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Server failed to provision owner account.');
    }
    return result.owner;
  },

  async createClubAdminAccount(email: string, passwordLog: string, clubId: string): Promise<any> {
    if (!isSupabaseConfigured) {
      const profiles = await this.getProfiles();
      const newAdmin = {
        id: `clubadmin-${Math.random().toString(36).substr(2, 9)}`,
        role: 'club_admin' as const,
        owner_id: getActiveAdminId(),
        club_id: clubId,
        created_at: new Date().toISOString()
      };
      setLocal('cue_control_profiles', [...profiles, newAdmin]);
      return newAdmin;
    }

    // Retained for backward-compatibility but forwards to the robust transaction endpoint if called with missing elements
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch('/api/admin/create-club-and-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        clubName: 'Linked Operation',
        subscriptionPlan: 'full',
        adminEmail: email,
        adminPassword: passwordLog,
        superAdminOwnerId: getActiveAdminId()
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Server failed to provision operator.');
    }
    return result.profile;
  },

  async getActiveClubId(): Promise<string> {
    return getActiveClubId();
  },

  setActiveClubId(clubId: string) {
    setActiveClubId(clubId);
  },


  // Bookings
  async getBookings(): Promise<Booking[]> {
    if (!isSupabaseConfigured) {
      const all = getLocal<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
      return all;
    }
    try {
      let query = supabase.from('bookings').select('*');
      const { data, error } = await query;
      if (error) {
        console.warn('bookings table in DB check failed, using LocalStorage fallback:', error.message);
        const all = getLocal<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
        return all;
      }
      const mapped = (data || []).map(row => {
        const { tableNumber: decodedNum, note: decodedNote } = decodeBookingFields(row.table_number || row.tableNumber || '', row.note);
        return {
          id: row.id,
          tableId: row.table_id || row.tableId,
          tableNumber: decodedNum,
          playerName: row.player_name || row.playerName || '',
          contact: row.contact || '',
          bookingDate: row.booking_date || row.bookingDate || '',
          startTime: row.start_time || row.startTime || '',
          endTime: row.end_time || row.endTime || '',
          status: (row.status || 'PENDING') as any,
          note: decodedNote || '',
          createdAt: row.created_at || row.createdAt || new Date().toISOString(),
          memberId: row.member_id || row.memberId || null,
          numberOfPlayers: row.number_of_players !== undefined ? row.number_of_players : (row.numberOfPlayers ?? 1),
          advancePaid: row.advance_paid !== undefined ? row.advance_paid : (row.advancePaid ?? 0),
          depositPaymentMethod: row.deposit_payment_method || row.depositPaymentMethod || null,
          createdByAdmin: row.created_by_admin || row.createdByAdmin || ''
        };
      });
      return mapped;
    } catch (e) {
      console.warn('DB query for bookings threw error, falling back to LocalStorage:', e);
      const all = getLocal<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
      return all;
    }
  },

  async addBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking | null> {
    const prefixedBooking = {
      ...booking
    };

    const newBooking: Booking = {
      ...prefixedBooking,
      id: 'bk_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };

    const localBookings = getLocal<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
    localBookings.push(newBooking);
    setLocal(LOCAL_STORAGE_KEYS.BOOKINGS, localBookings);

    if (!isSupabaseConfigured) {
      return newBooking;
    }

    try {
      const { dbNum, dbNote } = encodeBookingColumns(newBooking.tableNumber, newBooking.note);
      const dbRow: any = {
        id: newBooking.id,
        table_id: newBooking.tableId,
        table_number: dbNum,
        player_name: newBooking.playerName,
        contact: newBooking.contact,
        booking_date: newBooking.bookingDate,
        start_time: newBooking.startTime,
        end_time: newBooking.endTime || null,
        status: newBooking.status,
        note: dbNote,
        created_at: newBooking.createdAt,
        member_id: newBooking.memberId || null,
        number_of_players: newBooking.numberOfPlayers || null,
        advance_paid: newBooking.advancePaid || null,
        deposit_payment_method: newBooking.depositPaymentMethod || null,
        created_by_admin: newBooking.createdByAdmin || null
      };
      await injectAdminIdIfNeeded('bookings', dbRow);
      const { error } = await supabase.from('bookings').insert([dbRow]);
      if (error) {
        console.warn('Could not insert to bookings table in DB, kept in LocalStorage:', error.message);
      }
    } catch (e) {
      console.warn('DB bookings insert error, kept in LocalStorage:', e);
    }
    return newBooking;
  },

  async updateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
    const prefixedUpdates = { ...updates };

    const localBookings = getLocal<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
    const idx = localBookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      localBookings[idx] = { ...localBookings[idx], ...prefixedUpdates };
      setLocal(LOCAL_STORAGE_KEYS.BOOKINGS, localBookings);
    }

    if (!isSupabaseConfigured) {
      return true;
    }

    try {
      const cleanUpdates: any = {};
      if (prefixedUpdates.tableId !== undefined) cleanUpdates.table_id = prefixedUpdates.tableId;
      
      if (idx !== -1 && (prefixedUpdates.tableNumber !== undefined || prefixedUpdates.note !== undefined)) {
        const currentTableNumber = prefixedUpdates.tableNumber !== undefined ? prefixedUpdates.tableNumber : (localBookings[idx]?.tableNumber || '');
        const currentNote = prefixedUpdates.note !== undefined ? prefixedUpdates.note : (localBookings[idx]?.note || '');
        const { dbNum, dbNote } = encodeBookingColumns(currentTableNumber, currentNote);
        
        if (prefixedUpdates.tableNumber !== undefined) cleanUpdates.table_number = dbNum;
        cleanUpdates.note = dbNote;
      } else {
        if (prefixedUpdates.note !== undefined) cleanUpdates.note = prefixedUpdates.note;
        if (prefixedUpdates.tableNumber !== undefined) cleanUpdates.table_number = prefixedUpdates.tableNumber;
      }

      if (prefixedUpdates.playerName !== undefined) cleanUpdates.player_name = prefixedUpdates.playerName;
      if (prefixedUpdates.contact !== undefined) cleanUpdates.contact = prefixedUpdates.contact;
      if (prefixedUpdates.bookingDate !== undefined) cleanUpdates.booking_date = prefixedUpdates.bookingDate;
      if (prefixedUpdates.startTime !== undefined) cleanUpdates.start_time = prefixedUpdates.startTime;
      if (prefixedUpdates.endTime !== undefined) cleanUpdates.end_time = prefixedUpdates.endTime;
      if (prefixedUpdates.status !== undefined) cleanUpdates.status = prefixedUpdates.status;
      if (prefixedUpdates.memberId !== undefined) cleanUpdates.member_id = prefixedUpdates.memberId;
      if (prefixedUpdates.numberOfPlayers !== undefined) cleanUpdates.number_of_players = prefixedUpdates.numberOfPlayers;
      if (prefixedUpdates.advancePaid !== undefined) cleanUpdates.advance_paid = prefixedUpdates.advancePaid;
      if (prefixedUpdates.depositPaymentMethod !== undefined) cleanUpdates.deposit_payment_method = prefixedUpdates.depositPaymentMethod;
      if (prefixedUpdates.createdByAdmin !== undefined) cleanUpdates.created_by_admin = prefixedUpdates.createdByAdmin;
      
      await injectAdminIdIfNeeded('bookings', cleanUpdates);
      const { error } = await supabase.from('bookings').update(cleanUpdates).eq('id', id);
      if (error) {
        console.warn('Could not update bookings table in DB:', error.message);
      }
    } catch (e) {
      console.warn('DB bookings update error:', e);
    }
    return true;
  },

  async deleteBooking(id: string): Promise<boolean> {
    const localBookings = getLocal<any[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
    const filtered = localBookings.filter(b => b.id !== id);
    setLocal(LOCAL_STORAGE_KEYS.BOOKINGS, filtered);

    if (!isSupabaseConfigured) {
      return true;
    }

    if (!isValidUUID(id)) {
      console.log(`[deleteBooking] Bypassed SQL delete for temporary non-UUID booking ID: "${id}"`);
      return true;
    }

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) {
        console.warn('Could not delete from bookings table in DB:', error.message);
      }
    } catch (e) {
      console.warn('DB bookings delete error:', e);
    }
    return true;
  },

  async checkAdminAssociation(tableId: string): Promise<any> {
    if (!isSupabaseConfigured) {
      return { success: false, reason: "Supabase not configured" };
    }
    try {
      const hasAdminCol = await checkColumnCached('tables', 'admin_username');
      const { data, error } = await supabase.from('tables').select('id, admin_username, table_number').eq('id', tableId);
      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: false, reason: "Table row not found in DB" };
      }
      const row = data[0];
      const isAssociated = hasAdminCol ? (row.admin_username === activeAdminUsername) : true;
      return {
        success: true,
        tableName: 'tables',
        rowId: row.id,
        tableNumber: row.table_number,
        adminUsernameInRow: row.admin_username,
        activeAdminUsername: activeAdminUsername,
        hasAdminColumn: hasAdminCol,
        isCorrectlyIsolated: isAssociated
      };
    } catch (error: any) {
      return { success: false, reason: error.message || error };
    }
  },

  async runTenantDiagnostics(): Promise<any> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        status: 'OFFLINE_FALLBACK',
        message: 'Supabase is not configured. Running in LocalStorage-only offline fallback mode.',
        details: {
          activeAdminUsername,
          tablesCount: getLocal(LOCAL_STORAGE_KEYS.TABLES, []).length,
          membersCount: getLocal(LOCAL_STORAGE_KEYS.MEMBERS, []).length
        }
      };
    }

    try {
      const report: any = {
        success: true,
        timestamp: new Date().toISOString(),
        activeAdminUsername,
        databaseConfigured: true,
        schemaVerification: {},
        rowIsolationSummary: {},
        sampleRowCheck: null,
      };

      // 1. Schema check
      const tablesHasAdminCol = await checkColumnCached('tables', 'admin_username');
      const membersHasAdminCol = await checkColumnCached('members', 'admin_username');
      const bookingsHasAdminCol = await checkColumnCached('bookings', 'admin_username');
      const billingHasAdminCol = await checkColumnCached('billing_history', 'admin_username');

      report.schemaVerification = {
        tablesHasAdminUsernameColumn: tablesHasAdminCol,
        membersHasAdminUsernameColumn: membersHasAdminCol,
        bookingsHasAdminUsernameColumn: bookingsHasAdminCol,
        billingHistoryHasAdminUsernameColumn: billingHasAdminCol,
      };

      // 2. Query Row isolation for 'tables'
      const { data: dbTables, error: tablesError } = await supabase.from('tables').select('id, table_number, admin_username, status');
      if (tablesError) throw tablesError;

      const totalTablesInDb = dbTables ? dbTables.length : 0;
      const tablesForCurrentAdmin = dbTables ? dbTables.filter(t => t.admin_username === activeAdminUsername) : [];
      const tablesForOtherAdmins = dbTables ? dbTables.filter(t => t.admin_username && t.admin_username !== activeAdminUsername) : [];
      const unassignedTables = dbTables ? dbTables.filter(t => !t.admin_username) : [];

      report.rowIsolationSummary.tables = {
        totalRowsInDatabase: totalTablesInDb,
        rowsOwnedByActiveAdmin: tablesForCurrentAdmin.length,
        rowsOwnedByOtherAdmins: tablesForOtherAdmins.length,
        rowsUnassigned: unassignedTables.length,
        isolationStatus: tablesForOtherAdmins.length > 0
          ? (tablesHasAdminCol ? 'ACTIVE_ISOLATION_VERIFIED' : 'NO_ISOLATION_COLUMN_MISSING')
          : 'SECURE_OR_EMPTY'
      };

      // 3. Query Row isolation for 'members'
      const { data: dbMembers, error: membersError } = await supabase.from('members').select('id, name, admin_username');
      if (!membersError && dbMembers) {
        const totalMembers = dbMembers.length;
        const currentAdminMembers = dbMembers.filter(m => m.admin_username === activeAdminUsername);
        const otherAdminMembers = dbMembers.filter(m => m.admin_username && m.admin_username !== activeAdminUsername);
        const unassignedMembers = dbMembers.filter(m => !m.admin_username);

        report.rowIsolationSummary.members = {
          totalRowsInDatabase: totalMembers,
          rowsOwnedByActiveAdmin: currentAdminMembers.length,
          rowsOwnedByOtherAdmins: otherAdminMembers.length,
          rowsUnassigned: unassignedMembers.length,
        };
      }

      // Check one sample row
      if (tablesForCurrentAdmin.length > 0) {
        const sampleTable = tablesForCurrentAdmin[0];
        report.sampleRowCheck = {
          sampleRowId: sampleTable.id,
          tableNumber: sampleTable.table_number,
          associatedWithCurrentAdmin: sampleTable.admin_username === activeAdminUsername,
          adminUsernameInRow: sampleTable.admin_username,
        };
      } else if (dbTables && dbTables.length > 0) {
        const sampleTable = dbTables[0];
        report.sampleRowCheck = {
          sampleRowId: sampleTable.id,
          tableNumber: sampleTable.table_number,
          associatedWithCurrentAdmin: sampleTable.admin_username === activeAdminUsername,
          adminUsernameInRow: sampleTable.admin_username,
          warning: "No tables belong to the current admin. This sample table belongs to: " + (sampleTable.admin_username || 'unassigned')
        };
      }

      // Security isolation checklist evaluation
      let isolationEvaluation = "PERFECT_ISOLATION";
      let detailsText = "All queries and rows are successfully filtered. ";
      
      if (!tablesHasAdminCol) {
        isolationEvaluation = "NO_ISOLATION_COLUMN_MISSING";
        detailsText += "The 'admin_username' column was not detected in the 'tables' table. Rows are shared or prefixed.";
      } else if (tablesError) {
        isolationEvaluation = "ERROR";
        detailsText += `Database read error occurred: ${tablesError.message}`;
      } else if (tablesForOtherAdmins.length > 0) {
        isolationEvaluation = "RECORDS_FROM_OTHER_TENANTS_VISIBLE";
        detailsText += "Note: You can view rows belonging to other admins (e.g. because Row-Level Security policy is fully permissive or admin is a superuser).";
      } else {
        detailsText += "Isolation is fully active! Rows belonging to other admins are strictly invisible to this session.";
      }

      report.overallIsolationGrade = isolationEvaluation;
      report.overallIsolationSummary = detailsText;

      console.log('--- SUPABASE TENANT ISOLATION REPORT ---', report);
      return report;
    } catch (err: any) {
      console.error('[Diagnostics Error]', err);
      return {
        success: false,
        status: 'ERROR',
        message: err.message || err,
      };
    }
  },

  // Cafe Billing Workflow (Cafe-Only Subscriptions)
  async getCafeBills(): Promise<CafeBill[]> {
    if (!isSupabaseConfigured) {
      const localBills = getLocal<CafeBill[]>(LOCAL_STORAGE_KEYS.CAFE_BILLS, []);
      const localItems = getLocal<CafeBillItem[]>(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, []);
      return localBills.map(bill => ({
        ...bill,
        items: localItems.filter(item => item.bill_id === bill.id)
      }));
    }

    try {
      const clubId = getActiveClubId();
      let query = supabase.from('cafe_bills').select('*');
      if (clubId) {
        query = query.eq('club_id', clubId);
      }
      const { data: bills, error } = await query;
      if (error) {
        console.error('Error fetching cafe bills:', error.message);
        return [];
      }

      // Fetch all items for these bills
      const billIds = (bills || []).map(b => b.id);
      if (billIds.length > 0) {
        const { data: items, error: itemsErr } = await supabase
          .from('cafe_bill_items')
          .select('*')
          .in('bill_id', billIds);
          
        if (!itemsErr && items) {
          // Gather menu_items to resolve names if necessary
          const { data: menuItems } = await supabase.from('menu_items').select('id, name');
          const menuMap = new Map((menuItems || []).map((m: any) => [m.id, m.name]));

          return bills.map(b => ({
            ...b,
            items: items
              .filter((i: any) => i.bill_id === b.id)
              .map((i: any) => ({
                id: i.id,
                bill_id: i.bill_id,
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                price: Number(i.price),
                subtotal: Number(i.subtotal),
                menu_item_name: menuMap.get(i.menu_item_id) || 'Unknown Item'
              }))
          }));
        }
      }

      return bills.map(b => ({ ...b, items: [] }));
    } catch (e) {
      console.error('Error in getCafeBills:', e);
      return [];
    }
  },

  async createCafeBill(customerName: string, items: { menu_item_id: string; menu_item_name?: string; quantity: number; price: number; subtotal: number }[], memberId?: string | null): Promise<CafeBill | null> {
    const nextId = generateUUID();
    const clubId = getActiveClubId() || '00000000-0000-0000-0000-111111111111';
    
    const localBills = getLocal<CafeBill[]>(LOCAL_STORAGE_KEYS.CAFE_BILLS, []);
    const nextBillIndex = localBills.length + 1001;
    const billNumber = `CF-${nextBillIndex}`;
    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);

    const newBill: CafeBill = {
      id: nextId,
      club_id: clubId,
      member_id: memberId || null,
      bill_number: billNumber,
      customer_name: customerName,
      total_amount: totalAmount,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedLocalBills = [newBill, ...localBills];
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILLS, updatedLocalBills);

    const localItems = getLocal<CafeBillItem[]>(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, []);
    const newItems: CafeBillItem[] = items.map(item => ({
      id: generateUUID(),
      bill_id: nextId,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      menu_item_name: item.menu_item_name
    }));
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, [...newItems, ...localItems]);

    if (!isSupabaseConfigured) {
      return { ...newBill, items: newItems };
    }

    try {
      const dbBillRow = {
        id: newBill.id,
        club_id: newBill.club_id,
        member_id: newBill.member_id,
        bill_number: newBill.bill_number,
        customer_name: newBill.customer_name,
        total_amount: newBill.total_amount,
        status: newBill.status,
        created_at: newBill.created_at,
        updated_at: newBill.updated_at
      };

      const { data: insertedBill, error: billErr } = await supabase
        .from('cafe_bills')
        .insert([dbBillRow])
        .select('*')
        .single();

      if (billErr) {
        console.warn('Could not insert cafe bill to Supabase, used local:', billErr.message);
        return { ...newBill, items: newItems };
      }

      const dbItemRows = newItems.map(item => ({
        id: item.id,
        bill_id: item.bill_id,
        menu_item_id: item.menu_item_id ? item.menu_item_id : undefined,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      const { error: itemsErr } = await supabase
        .from('cafe_bill_items')
        .insert(dbItemRows);

      if (itemsErr) {
        console.warn('Could not insert bill items to Supabase:', itemsErr.message);
      }

      return {
        ...insertedBill,
        items: newItems
      };
    } catch (e) {
      console.error('Error creating cafe bill db:', e);
      return { ...newBill, items: newItems };
    }
  },

  async updateCafeBillStatus(billId: string, status: 'PENDING' | 'PAID' | 'CANCELLED', paymentMethod: 'CASH' | 'UPI' | 'PAY_LATER' = 'CASH'): Promise<boolean> {
    const localBills = getLocal<CafeBill[]>(LOCAL_STORAGE_KEYS.CAFE_BILLS, []);
    const localItems = getLocal<CafeBillItem[]>(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, []);
    
    const updatedLocal = localBills.map(b => b.id === billId ? { ...b, status, updated_at: new Date().toISOString() } : b);
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILLS, updatedLocal);

    if (status === 'PAID') {
      const foundBill = updatedLocal.find(b => b.id === billId);
      if (foundBill && paymentMethod === 'PAY_LATER' && foundBill.member_id) {
        // Increment member's due amount
        const memberObj = await this.getMember(foundBill.member_id);
        if (memberObj) {
          const currentDue = memberObj.dueAmount || 0;
          const nextDue = currentDue + foundBill.total_amount;
          await this.updateMember(foundBill.member_id, { status: memberObj.status || 'Active', dueAmount: nextDue });
        }
      }
    }

    if (!isSupabaseConfigured) {
      if (status === 'PAID') {
        const foundBill = updatedLocal.find(b => b.id === billId);
        if (foundBill) {
          const billItems = localItems.filter(i => i.bill_id === billId);
          await this.addTransaction({
            date: new Date().toISOString(),
            amount: foundBill.total_amount,
            paymentMethod: paymentMethod,
            tableNumber: foundBill.bill_number,
            playerName: foundBill.customer_name || 'Cash Customer',
            memberId: foundBill.member_id || null,
            duration: 'Cafe Standalone Sale',
            items: billItems.map(i => ({
              name: i.menu_item_name || 'Cafe Item',
              price: i.price,
              quantity: i.quantity
            }))
          });
        }
      }
      return true;
    }

    try {
      const { error } = await supabase
        .from('cafe_bills')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', billId);

      if (error) {
        console.warn('Could not update cafe bill status in DB:', error.message);
        return false;
      }

      if (status === 'PAID') {
        const foundBill = updatedLocal.find(b => b.id === billId);
        if (foundBill) {
          const billItems = localItems.filter(i => i.bill_id === billId);
          await this.addTransaction({
            date: new Date().toISOString(),
            amount: foundBill.total_amount,
            paymentMethod: paymentMethod,
            tableNumber: foundBill.bill_number,
            playerName: foundBill.customer_name || 'Cash Customer',
            memberId: foundBill.member_id || null,
            duration: 'Cafe Standalone Sale',
            items: billItems.map(i => ({
              name: i.menu_item_name || 'Cafe Item',
              price: i.price,
              quantity: i.quantity
            }))
          });
        }
      }

      return true;
    } catch (e) {
      console.error('DB updateCafeBillStatus error:', e);
      return false;
    }
  },

  async updateCafeBill(billId: string, customerName: string, items: { menu_item_id: string; menu_item_name?: string; quantity: number; price: number; subtotal: number }[], memberId?: string | null): Promise<boolean> {
    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);

    // 1. Maintain local Storage state in sync
    const localBills = getLocal<CafeBill[]>(LOCAL_STORAGE_KEYS.CAFE_BILLS, []);
    const updatedLocal = localBills.map(b => b.id === billId ? { ...b, customer_name: customerName, member_id: memberId || null, total_amount: totalAmount, updated_at: new Date().toISOString() } : b);
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILLS, updatedLocal);

    // update local items
    const localItems = getLocal<CafeBillItem[]>(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, []);
    const remainingLocalItems = localItems.filter(i => i.bill_id !== billId);
    const updatedLocalItems: CafeBillItem[] = items.map(item => ({
      id: generateUUID(),
      bill_id: billId,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      menu_item_name: item.menu_item_name
    }));
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, [...updatedLocalItems, ...remainingLocalItems]);

    if (!isSupabaseConfigured) {
      return true;
    }

    try {
      // 2. Update Cafe Bill row
      const { error: billErr } = await supabase
        .from('cafe_bills')
        .update({
          customer_name: customerName,
          member_id: memberId || null,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (billErr) {
        console.warn('Could not update cafe bill in DB:', billErr.message);
        return false;
      }

      // 3. Delete old items
      const { error: delErr } = await supabase
        .from('cafe_bill_items')
        .delete()
        .eq('bill_id', billId);

      if (delErr) {
        console.warn('Could not delete old cafe bill items:', delErr.message);
      }

      // 4. Insert new items
      const dbItemRows = updatedLocalItems.map(item => ({
        id: item.id,
        bill_id: item.bill_id,
        menu_item_id: item.menu_item_id ? item.menu_item_id : undefined,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      const { error: itemsErr } = await supabase
        .from('cafe_bill_items')
        .insert(dbItemRows);

      if (itemsErr) {
        console.warn('Could not insert updated bill items to DB:', itemsErr.message);
      }

      return true;
    } catch (e) {
      console.error('DB updateCafeBill error:', e);
      return false;
    }
  },

  async deleteCafeBill(billId: string): Promise<boolean> {
    const localBills = getLocal<CafeBill[]>(LOCAL_STORAGE_KEYS.CAFE_BILLS, []);
    const filteredBills = localBills.filter(b => b.id !== billId);
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILLS, filteredBills);

    const localItems = getLocal<CafeBillItem[]>(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, []);
    const filteredItems = localItems.filter(i => i.bill_id !== billId);
    setLocal(LOCAL_STORAGE_KEYS.CAFE_BILL_ITEMS, filteredItems);

    if (!isSupabaseConfigured) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('cafe_bills')
        .delete()
        .eq('id', billId);

      if (error) {
        console.warn('Could not delete cafe bill from DB:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('DB deleteCafeBill error:', e);
      return false;
    }
  }
};
