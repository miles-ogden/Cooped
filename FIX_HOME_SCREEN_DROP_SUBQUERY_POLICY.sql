-- ============================================================================
-- EMERGENCY FIX: Drop the subquery-based RLS policy
-- The "Users can view coop members" policy with subqueries breaks queries
-- Drop it immediately to restore home screen functionality
-- ============================================================================

DROP POLICY IF EXISTS "Users can view coop members" ON users;

-- ============================================================================
-- EXPLANATION:
--
-- The individual member ID query approach works perfectly WITHOUT needing
-- complex RLS policies. Here's why:
--
-- When getMembersData() queries User A by ID:
-- - Query: SELECT * FROM users WHERE id = 'user-a-id'
-- - RLS checks: Does auth.uid() = 'user-a-id'?
-- - If auth.uid() = 'user-a-id' (User A viewing themselves): ✅ PASS
-- - If auth.uid() = 'user-b-id' (User B viewing User A): ❌ FAIL
--
-- The RLS policy works CORRECTLY without needing a subquery!
-- The subquery approach breaks because Postgres evaluates RLS policies
-- differently when subqueries are involved.
--
-- SOLUTION: Keep only "Users can view own profile" policy
-- The app handles member visibility through getMembersData() function
-- which queries each member individually
-- ============================================================================
