-- ============================================================================
-- DEBUG: Check all RLS policies on coops table
-- Run this in Supabase SQL Editor to see all current policies
-- ============================================================================

-- List all policies on the coops table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'coops'
ORDER BY policyname;

-- Also check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'coops';
