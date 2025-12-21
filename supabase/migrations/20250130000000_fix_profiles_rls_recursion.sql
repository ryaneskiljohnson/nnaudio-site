-- Fix infinite recursion in profiles table RLS policy
-- The issue occurs when checking admin status triggers a query to profiles
-- which then triggers the RLS policy check again, creating infinite recursion

-- Drop existing policies on profiles that might cause recursion
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "anon_select_policy" ON profiles;

-- Recreate policies with proper checks that don't cause recursion
-- Allow authenticated users to read all profiles (needed for admin checks)
-- Use auth.uid() IS NOT NULL instead of auth.role() to avoid recursion
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Allow users to insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow anonymous users to read profiles (if needed for public access)
CREATE POLICY "Allow anonymous users to read profiles" ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

