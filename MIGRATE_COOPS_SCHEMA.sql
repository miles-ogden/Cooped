-- ============================================================================
-- MIGRATION: Add Coop Settings Columns to Coops Table
-- ============================================================================
-- Run this SQL in Supabase if you have an existing coops table
-- This adds columns for blocker question type, member limits, and side quest settings
-- ============================================================================

-- Add missing columns to coops table
ALTER TABLE coops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS blocker_question_type TEXT DEFAULT 'general' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10 NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quests_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_category TEXT DEFAULT 'learning' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_topics TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_frequency TEXT DEFAULT 'daily' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_frequency_value INTEGER DEFAULT 1 NOT NULL;

-- Create index on updated_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_coops_updated_at ON coops(updated_at);

-- Result: All existing coops now have side quest settings available with safe defaults
-- - Side quests are disabled by default (side_quests_enabled = FALSE)
-- - Default frequency is daily (once per day)
-- - Blocker question type defaults to 'general'
-- - Max members defaults to 10

-- ============================================================================
-- DONE! Your coops table now has all the columns needed for side quest configuration
-- ============================================================================
