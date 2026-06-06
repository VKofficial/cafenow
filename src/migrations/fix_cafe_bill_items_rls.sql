-- Migration: Fix cafe_bill_items RLS to enforce tenant isolation via parent cafe_bills
-- Description: Replaces permissive EXISTS-only policy with club/role-scoped checks
-- matching cafe_bills and other business tables.

DROP POLICY IF EXISTS "Cafe Bill Items RLS Policy" ON public.cafe_bill_items;

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
