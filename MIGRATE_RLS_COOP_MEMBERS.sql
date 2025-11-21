-- ============================================================================
-- MIGRATION: Fix RLS policies to allow viewing coop members
-- This allows users to see data of other members in their coop
-- ============================================================================

-- Add policy allowing users to see other coop members' public data
CREATE POLICY "Users can view coop members"
  ON users FOR SELECT
  USING (
    -- Can always see own profile
    auth.uid() = id
    OR
    -- Can see other users who are in the same coop
    EXISTS (
      SELECT 1 FROM coops
      WHERE (
        -- Find coops that contain both the current user and the target user
        (coops.member_ids @> ARRAY[auth.uid()]) AND
        (coops.member_ids @> ARRAY[id])
      )
    )
  );

-- ============================================================================
-- DONE: Coop members can now see each other
-- ============================================================================
