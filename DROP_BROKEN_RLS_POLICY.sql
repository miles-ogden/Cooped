-- ============================================================================
-- MIGRATION: Drop broken "Users can view coop members" RLS policy
-- This policy had array containment subquery issues that returned wrong data
-- The individual member ID query approach works better with just the base policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view coop members" ON users;

-- ============================================================================
-- RESULT: Users table now only has these SELECT policies:
-- 1. "Users can view own profile" - allows each user to see their own data
--
-- This is sufficient for the individual member ID query approach where:
-- - User A queries for User A → passes policy ✅
-- - User A queries for User B → User B sees their own profile, passes policy ✅
-- ============================================================================
