-- RLS policies for users with app_metadata.role = 'admin'
-- These users can read all data but cannot write (read-only ops viewers)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/pubcbstrapwwfzuqiklf/sql

-- Drop if re-running
DROP POLICY IF EXISTS "admin_role_select_profiles"      ON profiles;
DROP POLICY IF EXISTS "admin_role_select_orders"        ON orders;
DROP POLICY IF EXISTS "admin_role_select_announcements" ON announcements;

-- profiles: admin role can read all rows
CREATE POLICY "admin_role_select_profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- orders: admin role can read all rows
CREATE POLICY "admin_role_select_orders" ON orders
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- announcements: admin role can read ALL announcements (active + inactive)
CREATE POLICY "admin_role_select_announcements" ON announcements
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
