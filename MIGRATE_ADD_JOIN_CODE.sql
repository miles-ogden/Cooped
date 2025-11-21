-- ============================================================================
-- MIGRATION: Add join_code to existing coops table
-- Run this in Supabase SQL Editor if upgrading from older schema
-- ============================================================================

-- Add join_code column if it doesn't exist
ALTER TABLE coops
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coops_join_code ON coops(join_code);

-- Update existing coops without join codes (generate one based on ID)
-- This is a temporary solution - ideally recreate coops with proper join codes
UPDATE coops
SET join_code = 'MIGRATED-' || SUBSTR(id::text, 1, 8) || '-' || SUBSTR(id::text, -8)
WHERE join_code IS NULL;

-- Make join_code NOT NULL after migration
ALTER TABLE coops
ALTER COLUMN join_code SET NOT NULL;

-- ============================================================================
-- DONE: Coops table now has join_code column
-- ============================================================================
