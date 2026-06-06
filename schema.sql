-- Production-ready PostgreSQL schema for Snooker Club Management system (Multi-Tenant SaaS Version)

-- Create CLUBS table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID, -- References auth.users(id) - done after auth tables exist
  subscription_plan TEXT NOT NULL DEFAULT 'full' CHECK (subscription_plan IN ('cafe_only', 'snooker_only', 'full')),
  subscription_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- References auth.users(id) - done after auth tables exist
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'owner', 'club_admin')),
  owner_id UUID, -- References auth.users(id) - if owner created this profile
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed static test clubs for 'relax' and 'asquare' to ensure deterministic UUID matching during migration
INSERT INTO public.clubs (id, name, subscription_status)
VALUES 
  ('00000000-0000-0000-0000-111111111111', 'Relax Snooker Club', 'active'),
  ('00000000-0000-0000-0000-222222222222', 'ASquare Snooker Club', 'active')
ON CONFLICT (id) DO NOTHING;

-- Establish references to auth.users if auth schema is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS fk_clubs_owner_id;
    ALTER TABLE public.clubs ADD CONSTRAINT fk_clubs_owner_id FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_id;
    ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_id FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_owner_id;
    ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_owner_id FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop obsolete legacy 'admins' table
DROP TABLE IF EXISTS public.admins CASCADE;

-- Business Tables for Snooker Tables
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL,
  type TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  rate_unit TEXT NOT NULL DEFAULT 'hr',
  ps5_costs JSONB,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  player TEXT,
  bill_number TEXT,
  start_time TEXT,
  current_session_start TIMESTAMP WITH TIME ZONE,
  elapsed_time TEXT DEFAULT '00:00:00',
  session_cost NUMERIC DEFAULT 0,
  cafe_cost NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  current_cart JSONB DEFAULT '[]',
  is_paused BOOLEAN DEFAULT FALSE,
  total_paused_seconds INTEGER DEFAULT 0,
  pause_start_time_unix BIGINT,
  reservation_time TEXT,
  players_count INTEGER,
  note TEXT,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Members
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  joined_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Inactive',
  due_amount NUMERIC DEFAULT 0,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Billing History (Transactions)
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  table_number TEXT,
  player_name TEXT,
  member_id UUID,
  items JSONB DEFAULT '[]',
  duration TEXT,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Expenditures
CREATE TABLE IF NOT EXISTS public.expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Happy Hour Settings
CREATE TABLE IF NOT EXISTS public.happy_hour_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT FALSE,
  snooker_rate NUMERIC DEFAULT 0,
  pool_rate NUMERIC DEFAULT 0,
  ps5_rate NUMERIC DEFAULT 0,
  mini_snooker_rate NUMERIC DEFAULT 0,
  other_rate NUMERIC DEFAULT 0,
  last_enabled_at TIMESTAMP WITH TIME ZONE,
  cumulative_duration_seconds INTEGER DEFAULT 0,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  table_id TEXT,
  table_number TEXT,
  player_name TEXT NOT NULL,
  contact TEXT,
  booking_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT DEFAULT 'PENDING',
  note TEXT,
  member_id TEXT,
  number_of_players INTEGER DEFAULT 1,
  advance_paid NUMERIC DEFAULT 0,
  deposit_payment_method TEXT,
  created_by_admin TEXT,
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Tables for Pending Bills
CREATE TABLE IF NOT EXISTS public.pending_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id TEXT,
  table_number TEXT NOT NULL,
  player TEXT,
  amount NUMERIC DEFAULT 0,
  session_cost NUMERIC DEFAULT 0,
  cafe_cost NUMERIC DEFAULT 0,
  elapsed_time TEXT,
  member_id TEXT,
  cart JSONB DEFAULT '[]',
  admin_username TEXT, -- Legacy mapping column
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Remove legacy constraints if any exist
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_type_check;
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS type_check;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS category_check;

-- Ensure club_id columns are added if executing on pre-existing database
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='subscription_plan') THEN
    ALTER TABLE public.clubs ADD COLUMN subscription_plan TEXT NOT NULL DEFAULT 'full' CHECK (subscription_plan IN ('cafe_only', 'snooker_only', 'full'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tables' AND column_name='club_id') THEN
    ALTER TABLE public.tables ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='club_id') THEN
    ALTER TABLE public.members ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_history' AND column_name='club_id') THEN
    ALTER TABLE public.billing_history ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='club_id') THEN
    ALTER TABLE public.bookings ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenditures' AND column_name='club_id') THEN
    ALTER TABLE public.expenditures ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='club_id') THEN
    ALTER TABLE public.menu_items ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_categories' AND column_name='club_id') THEN
    ALTER TABLE public.menu_categories ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='happy_hour_settings' AND column_name='club_id') THEN
    ALTER TABLE public.happy_hour_settings ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_bills' AND column_name='club_id') THEN
    ALTER TABLE public.pending_bills ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
  
  -- Ensure legacy admin columns are made nullable on happy_hour_settings if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='happy_hour_settings' AND column_name='admin_id') THEN
    ALTER TABLE public.happy_hour_settings ALTER COLUMN admin_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='happy_hour_settings' AND column_name='admin_username') THEN
    ALTER TABLE public.happy_hour_settings ALTER COLUMN admin_username DROP NOT NULL;
  END IF;
END $$;

-- DATA MIGRATION: Populate club_id based on legacy admin_username column
UPDATE public.tables SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.members SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.billing_history SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.bookings SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.expenditures SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.menu_items SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.menu_categories SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.happy_hour_settings SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;
UPDATE public.pending_bills SET club_id = '00000000-0000-0000-0000-111111111111' WHERE admin_username = 'relax' AND club_id IS NULL;

UPDATE public.tables SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.members SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.billing_history SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.bookings SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.expenditures SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.menu_items SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.menu_categories SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.happy_hour_settings SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;
UPDATE public.pending_bills SET club_id = '00000000-0000-0000-0000-222222222222' WHERE admin_username = 'asquare' AND club_id IS NULL;


-- HELPER SECURITY FUNCTIONS WITH BYPASS SECURITY PRIVILEGE 
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_club(user_id UUID)
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT club_id FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql;


-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hour_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_bills ENABLE ROW LEVEL SECURITY;


-- DROP ALL LEGACY PERMISSIVE OR LOOSE POLICES ON TARGET TABLES
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('admins', 'clubs', 'profiles', 'tables', 'members', 'billing_history', 'expenditures', 'menu_items', 'menu_categories', 'happy_hour_settings', 'bookings', 'pending_bills')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.tablename);
  END LOOP;
END $$;


-- CREATE ACCURATE, UNRESTRICTED, MULTI-TENANT RLS POLICIES

-- 1. Clubs Table Policies
CREATE POLICY "Clubs Select Policy" ON public.clubs
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() 
    OR get_user_role(auth.uid()) = 'super_admin' 
    OR id = get_user_club(auth.uid())
  );

CREATE POLICY "Clubs Modify Policy" ON public.clubs
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid() 
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    owner_id = auth.uid() 
    OR get_user_role(auth.uid()) = 'super_admin'
  );


-- 2. Profiles Table Policies
CREATE POLICY "Profiles Select Policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND owner_id = auth.uid())
  );

CREATE POLICY "Profiles Modify Policy" ON public.profiles
  FOR ALL TO authenticated
  USING (
    get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND owner_id = auth.uid())
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND owner_id = auth.uid())
  );


-- Helper macro generation for all functional business tables:
-- Allows club_admin to view their own club, owners to view their own clubs, super_adm to view everything.

-- 3. Tables Policies
CREATE POLICY "Tables RLS Policy" ON public.tables
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 4. Members Policies
CREATE POLICY "Members RLS Policy" ON public.members
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 5. Billing History Policies
CREATE POLICY "Billing History RLS Policy" ON public.billing_history
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 6. Expenditures Policies
CREATE POLICY "Expenditures RLS Policy" ON public.expenditures
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 7. Menu Items Policies
CREATE POLICY "Menu Items RLS Policy" ON public.menu_items
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 8. Menu Categories Policies
CREATE POLICY "Menu Categories RLS Policy" ON public.menu_categories
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 9. Happy Hour Settings Policies
CREATE POLICY "Happy Hour RLS Policy" ON public.happy_hour_settings
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 10. Bookings Policies
CREATE POLICY "Bookings RLS Policy" ON public.bookings
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- 11. Pending Bills Policies
CREATE POLICY "Pending Bills RLS Policy" ON public.pending_bills
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );


-- AUTOMATICALLY ENFORCE CLUB_ID SECURITY MANDATE ON ALL INSERTS AND UPDATES
CREATE OR REPLACE FUNCTION public.secure_club_id_enforcement()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_club_id UUID;
BEGIN
  -- Obtain authenticated user ID
  v_user_id := auth.uid();

  -- If there is no authenticated user (e.g., seeding via CLI or migration running via superuser), bypass enforcement
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch security attributes
  v_user_role := public.get_user_role(v_user_id);
  v_user_club_id := public.get_user_club(v_user_id);

  IF TG_OP = 'INSERT' THEN
    -- If non-super-admin/non-owner, force their profile club_id
    IF v_user_role NOT IN ('super_admin', 'owner') THEN
      NEW.club_id := v_user_club_id;
    ELSE
      -- Super-admin or Owner can specify, but fall back to their user-profile club_id if unspecified
      IF NEW.club_id IS NULL THEN
        NEW.club_id := v_user_club_id;
      END IF;
    END IF;

    -- Ensure a valid club_id is set
    IF NEW.club_id IS NULL THEN
      RAISE EXCEPTION 'A valid club_id is required to perform this insert operation.';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Regular administrators cannot change a record's club_id
    IF v_user_role NOT IN ('super_admin', 'owner') THEN
      NEW.club_id := OLD.club_id;
    ELSE
      -- Even if they are super_admin/owner, if they try to write NULL, keep the previous value
      IF NEW.club_id IS NULL THEN
        NEW.club_id := OLD.club_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ATTACH MANDATORY TRIGGER TO ALL TENANT-SPECIFIC BUSINESS TABLES

-- Apply trigger to tables
DROP TRIGGER IF EXISTS ensure_club_id_tables_trg ON public.tables;
CREATE TRIGGER ensure_club_id_tables_trg
  BEFORE INSERT OR UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to members
DROP TRIGGER IF EXISTS ensure_club_id_members_trg ON public.members;
CREATE TRIGGER ensure_club_id_members_trg
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to billing_history
DROP TRIGGER IF EXISTS ensure_club_id_billing_history_trg ON public.billing_history;
CREATE TRIGGER ensure_club_id_billing_history_trg
  BEFORE INSERT OR UPDATE ON public.billing_history
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to expenditures
DROP TRIGGER IF EXISTS ensure_club_id_expenditures_trg ON public.expenditures;
CREATE TRIGGER ensure_club_id_expenditures_trg
  BEFORE INSERT OR UPDATE ON public.expenditures
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to menu_items
DROP TRIGGER IF EXISTS ensure_club_id_menu_items_trg ON public.menu_items;
CREATE TRIGGER ensure_club_id_menu_items_trg
  BEFORE INSERT OR UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to menu_categories
DROP TRIGGER IF EXISTS ensure_club_id_menu_categories_trg ON public.menu_categories;
CREATE TRIGGER ensure_club_id_menu_categories_trg
  BEFORE INSERT OR UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to happy_hour_settings
DROP TRIGGER IF EXISTS ensure_club_id_happy_hour_settings_trg ON public.happy_hour_settings;
CREATE TRIGGER ensure_club_id_happy_hour_settings_trg
  BEFORE INSERT OR UPDATE ON public.happy_hour_settings
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to bookings
DROP TRIGGER IF EXISTS ensure_club_id_bookings_trg ON public.bookings;
CREATE TRIGGER ensure_club_id_bookings_trg
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Apply trigger to pending_bills
DROP TRIGGER IF EXISTS ensure_club_id_pending_bills_trg ON public.pending_bills;
CREATE TRIGGER ensure_club_id_pending_bills_trg
  BEFORE INSERT OR UPDATE ON public.pending_bills
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();


-- MULTI-TENANT SATISFACTION: Replace legacy global table number unique constraint with composite uniqueness
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_table_number_key;
DROP INDEX IF EXISTS public.tables_table_number_key;

ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_club_id_table_number_key;
ALTER TABLE public.tables ADD CONSTRAINT tables_club_id_table_number_key UNIQUE (club_id, table_number);


-- Business Tables for Cafe Bills (Dedicated Cafe-Only Experience)
CREATE TABLE IF NOT EXISTS public.cafe_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  bill_number TEXT NOT NULL,
  customer_name TEXT,
  total_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.cafe_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.cafe_bills(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.cafe_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_bill_items ENABLE ROW LEVEL SECURITY;

-- Policies for Cafe Bills
CREATE POLICY "Cafe Bills RLS Policy" ON public.cafe_bills
  FOR ALL TO authenticated
  USING (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    club_id = get_user_club(auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
    OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  );

-- Policies for Cafe Bill Items
CREATE POLICY "Cafe Bill Items RLS Policy" ON public.cafe_bill_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_bills cb
      WHERE cb.id = cafe_bill_items.bill_id
        AND (
          cb.club_id = get_user_club(auth.uid())
          OR get_user_role(auth.uid()) = 'super_admin'
          OR (
            get_user_role(auth.uid()) = 'owner'
            AND cb.club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cafe_bills cb
      WHERE cb.id = cafe_bill_items.bill_id
        AND (
          cb.club_id = get_user_club(auth.uid())
          OR get_user_role(auth.uid()) = 'super_admin'
          OR (
            get_user_role(auth.uid()) = 'owner'
            AND cb.club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
          )
        )
    )
  );

-- Security Trigger for Cafe Bills to automatic enforce club_id
DROP TRIGGER IF EXISTS ensure_club_id_cafe_bills_trg ON public.cafe_bills;
CREATE TRIGGER ensure_club_id_cafe_bills_trg
  BEFORE INSERT OR UPDATE ON public.cafe_bills
  FOR EACH ROW EXECUTE FUNCTION public.secure_club_id_enforcement();

-- Migrate existing tables to add member_id to cafe_bills if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cafe_bills' AND column_name='member_id') THEN
    ALTER TABLE public.cafe_bills ADD COLUMN member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
  END IF;
END $$;



