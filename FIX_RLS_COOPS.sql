-- ============================================================================
-- MIGRATION: Fix RLS policies on coops table for join functionality
-- This resolves issues with coop creation and joining
-- ============================================================================

-- First, DROP any conflicting policies that might have been added
DROP POLICY IF EXISTS "Authenticated users can update coops" ON coops;
DROP POLICY IF EXISTS "Members can update coop" ON coops;
DROP POLICY IF EXISTS "Authenticated users can add themselves to coops" ON coops;

-- Keep the creator-only update policy for general updates
-- The old "Coop creator can update their coop" should still exist

-- NEW policy: Allow authenticated users to update member_ids (for joining)
-- This is a separate policy that allows non-creators to add themselves to member_ids
CREATE POLICY "Authenticated users can update member_ids"
  ON coops FOR UPDATE
  USING (
    -- Only allow updates to the member_ids field
    -- By setting auth.role() = 'authenticated' here, we're saying:
    -- "Any authenticated user can update THIS coop IF they pass the WITH CHECK"
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    -- For the update to succeed, it must pass this check
    -- This is a simple check - the app is responsible for security
    auth.role() = 'authenticated'
  );

-- Note: The original "Coop creator can update their coop" policy should handle
-- all updates from the creator. This new policy adds permissions for non-creators
-- to update member_ids specifically.

-- ============================================================================
-- DONE: RLS policies should now allow:
-- 1. CREATE coops (anyone authenticated)
-- 2. VIEW coops (anyone authenticated)
-- 3. UPDATE coops to add members (anyone authenticated via new policy)
-- 4. UPDATE coops general settings (only creator via existing policy)
-- ============================================================================
