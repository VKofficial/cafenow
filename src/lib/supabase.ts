import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const PLACEHOLDER_PATTERNS = ['your_project_url_here', 'your_anon_key_here'];

// Check if credentials are valid, non-empty, and they are not placeholder text from instructions
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 0 &&
  !PLACEHOLDER_PATTERNS.some(
    (placeholder) =>
      supabaseUrl.includes(placeholder) || supabaseAnonKey.includes(placeholder)
  );

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase Connection Notice: Valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are missing or contain default placeholders. Supabase queries will fallback locally and can result in Bad Request/Content Too Large console errors.'
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project-url.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    global: {
      fetch: (input, init) => {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input && (input as any).url) || '');
        if (url.includes('/rest/v1/admins')) {
          const err = new Error(`🚫 [ADMINS REQUEST TRAPPED] Attempted fetch to /rest/v1/admins!`);
          console.error('[STACK TRACE FOR /rest/v1/admins ACCESS]:', err.stack || err.message);
        }
        return window.fetch(input, init);
      }
    }
  }
);

const BUSINESS_TABLES = [
  'tables',
  'members',
  'billing_history',
  'expenditures',
  'menu_items',
  'menu_categories',
  'happy_hour_settings',
  'bookings',
  'pending_bills'
];

if (isSupabaseConfigured) {
  const originalFrom = (supabase as any).from;
  (supabase as any).from = function (table: string) {
    const builder = originalFrom.call(supabase, table);
    
    if (BUSINESS_TABLES.includes(table)) {
      // 1. Intercept select
      const originalSelect = builder.select;
      builder.select = function (...args: any[]) {
        const activeClubId = typeof window !== 'undefined' ? localStorage.getItem('active_club_id') : null;
        let filterBuilder = originalSelect.apply(builder, args);
        if (activeClubId) {
          filterBuilder = filterBuilder.eq('club_id', activeClubId);
        }
        return filterBuilder;
      };

      // 2. Intercept insert
      const originalInsert = builder.insert;
      builder.insert = function (values: any, ...args: any[]) {
        const activeClubId = typeof window !== 'undefined' ? localStorage.getItem('active_club_id') : null;
        if (activeClubId) {
          if (Array.isArray(values)) {
            values.forEach(v => {
              if (v && typeof v === 'object') v.club_id = activeClubId;
            });
          } else if (values && typeof values === 'object') {
            values.club_id = activeClubId;
          }
        }
        return originalInsert.call(builder, values, ...args);
      };

      // 3. Intercept update
      const originalUpdate = builder.update;
      builder.update = function (values: any, ...args: any[]) {
        const activeClubId = typeof window !== 'undefined' ? localStorage.getItem('active_club_id') : null;
        if (activeClubId) {
          if (values && typeof values === 'object') {
            values.club_id = activeClubId;
          }
        }
        let filterBuilder = originalUpdate.call(builder, values, ...args);
        if (activeClubId) {
          filterBuilder = filterBuilder.eq('club_id', activeClubId);
        }
        return filterBuilder;
      };

      // 4. Intercept delete
      const originalDelete = builder.delete;
      builder.delete = function (...args: any[]) {
        const activeClubId = typeof window !== 'undefined' ? localStorage.getItem('active_club_id') : null;
        let filterBuilder = originalDelete.apply(builder, args);
        if (activeClubId) {
          filterBuilder = filterBuilder.eq('club_id', activeClubId);
        }
        return filterBuilder;
      };
    }
    
    return builder;
  };
}

