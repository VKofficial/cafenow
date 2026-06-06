-- Migration: Fix Multi-Tenant Tables Uniqueness Constraint
-- Description: Removes the global unique constraint on table_number and replaces it with a composite unique constraint per club (club_id, table_number).
-- Target Table: public.tables

-- 1. Remove the global unique constraint on table_number if it exists
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_table_number_key;

-- 2. Drop any legacy unique index associated with it
DROP INDEX IF EXISTS public.tables_table_number_key;

-- 3. Remove existing composite unique constraint to prevent duplicate keys if running again
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_club_id_table_number_key;

-- 4. Create the new composite uniqueness constraint
ALTER TABLE public.tables ADD CONSTRAINT tables_club_id_table_number_key UNIQUE (club_id, table_number);

-- 5. Verify RLS (Row Level Security) still isolates tables by club_id
-- The existing RLS policy on the tables table is:
--   USING (club_id = get_user_club(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin' OR (get_user_role(auth.uid()) = 'owner' AND club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())))
-- This policy seamlessly operates on club_id and is fully compatible with the new composite key.
