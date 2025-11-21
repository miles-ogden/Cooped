-- ============================================================================
-- MIGRATION: Add coop member visibility RLS policy
-- Allows users to see other members in the same coop
-- Uses a simpler approach: check if both users share the same coop_id
-- ============================================================================

-- First, drop the old broken policy if it exists
DROP POLICY IF EXISTS "Users can view coop members" ON users;

-- Create the new, working policy
CREATE POLICY "Users can view coop members"
  ON users FOR SELECT
  USING (
    -- Users can see themselves
    auth.uid() = id
    OR
    -- Users can see other members in their coop (if both are in the same coop)
    coop_id IS NOT NULL AND
    coop_id IN (
      SELECT coop_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- RESULT: Users can now see:
-- 1. Their own profile
-- 2. Other users in their coop (members with the same coop_id)
--
-- This approach avoids the problematic array containment subquery
-- and uses simple coop_id comparison instead
-- ============================================================================
