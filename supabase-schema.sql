-- ============================================================================
-- COOPED MVP SUPABASE SCHEMA
-- Run this SQL in Supabase SQL Editor to create all tables and RLS policies
-- ============================================================================

-- ============================================================================
-- TABLE: coops (MUST come first - no dependencies)
-- Description: Group/team data for cooperative gameplay
-- ============================================================================
CREATE TABLE coops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_user_id UUID NOT NULL,
  member_ids UUID[] DEFAULT ARRAY[]::UUID[] NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  coop_level INTEGER DEFAULT 1 NOT NULL,
  total_xp INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  blocker_question_type TEXT DEFAULT 'general' NOT NULL,
  max_members INTEGER DEFAULT 10 NOT NULL,
  side_quests_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  side_quest_category TEXT DEFAULT 'learning' NOT NULL,
  side_quest_topics TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  side_quest_frequency TEXT DEFAULT 'daily' NOT NULL,
  side_quest_frequency_value INTEGER DEFAULT 1 NOT NULL
);

-- Indexes for faster queries
CREATE INDEX idx_coops_creator_user_id ON coops(creator_user_id);
CREATE INDEX idx_coops_join_code ON coops(join_code);

-- RLS: Anyone authenticated can view coops, creators can update
ALTER TABLE coops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all coops"
  ON coops FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Coop creator can update their coop"
  ON coops FOR UPDATE
  USING (auth.uid() = creator_user_id);

CREATE POLICY "Anyone authenticated can insert coops"
  ON coops FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: users (now can reference coops)
-- Description: Core user data - XP, levels, streaks, coop membership
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'email', 'phone', 'guest')),
  xp_total INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  eggs INTEGER DEFAULT 0 NOT NULL,
  streak_days INTEGER DEFAULT 0 NOT NULL,
  last_stim_date TIMESTAMP NULL,
  hearts_remaining_today INTEGER DEFAULT 3 NOT NULL,
  skip_until TIMESTAMP NULL,
  coop_id UUID NULL REFERENCES coops(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for faster queries
CREATE INDEX idx_users_coop_id ON users(coop_id);

-- RLS: Users can see their own data and other coop members' data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow viewing coop members by ID
-- The getMembersData() function queries individual members by ID
-- Each member query passes the "Users can view own profile" policy
-- This avoids complex subqueries that break queries
--
-- Note: Do NOT add a "Users can view coop members" policy with subqueries
-- They cause home screen and other queries to fail

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Now add foreign key constraint to coops.creator_user_id
ALTER TABLE coops
ADD CONSTRAINT fk_coops_creator_user_id
FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- TABLE: xp_events
-- Description: Log all XP gain/loss events for audit trail and analytics
-- ============================================================================
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'clean_day', 'clean_streak', 'stim_penalty', 'challenge_win',
    'placement_bronze', 'placement_silver', 'placement_gold', 'manual_adjustment'
  )),
  delta INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for faster analytics queries
CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX idx_xp_events_type ON xp_events(type);
CREATE INDEX idx_xp_events_timestamp ON xp_events(timestamp);

-- RLS: Users can only see their own events
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own xp events"
  ON xp_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert events"
  ON xp_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- TABLE: stim_events
-- Description: Track blocked site visits (stimming events)
-- ============================================================================
CREATE TABLE stim_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP NULL,
  skip_used BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for faster queries
CREATE INDEX idx_stim_events_user_id ON stim_events(user_id);
CREATE INDEX idx_stim_events_started_at ON stim_events(started_at);

-- RLS: Users can only see their own stim events
ALTER TABLE stim_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stim events"
  ON stim_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stim events"
  ON stim_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stim events"
  ON stim_events FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: challenge_sessions
-- Description: Track mini-game completions and results
-- ============================================================================
CREATE TABLE challenge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('vocabulary', 'math', 'history')),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP NOT NULL,
  success BOOLEAN NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for faster queries
CREATE INDEX idx_challenge_sessions_user_id ON challenge_sessions(user_id);
CREATE INDEX idx_challenge_sessions_game_type ON challenge_sessions(game_type);
CREATE INDEX idx_challenge_sessions_started_at ON challenge_sessions(started_at);

-- RLS: Users can only see their own challenge sessions
ALTER TABLE challenge_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenge sessions"
  ON challenge_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge sessions"
  ON challenge_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Enable Real-time subscriptions
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE coops;
ALTER PUBLICATION supabase_realtime ADD TABLE xp_events;
ALTER PUBLICATION supabase_realtime ADD TABLE stim_events;
ALTER PUBLICATION supabase_realtime ADD TABLE challenge_sessions;

-- ============================================================================
-- CREATE VIEWS for common queries
-- ============================================================================

-- View: User stats (for dashboard display)
CREATE VIEW user_stats AS
SELECT
  u.id,
  u.level,
  u.xp_total,
  u.eggs,
  u.streak_days,
  u.hearts_remaining_today,
  COUNT(DISTINCT CASE WHEN se.blocked = true THEN se.id END) as total_blocked_attempts,
  COUNT(DISTINCT CASE WHEN cs.success = true THEN cs.id END) as total_challenges_won,
  ROUND(COUNT(DISTINCT CASE WHEN cs.success = true THEN cs.id END) * 100.0 /
    NULLIF(COUNT(DISTINCT cs.id), 0), 2) as challenge_win_rate
FROM users u
LEFT JOIN stim_events se ON u.id = se.user_id
LEFT JOIN challenge_sessions cs ON u.id = cs.user_id
GROUP BY u.id, u.level, u.xp_total, u.eggs, u.streak_days, u.hearts_remaining_today;

-- View: Coop leaderboard
CREATE VIEW coop_leaderboard AS
SELECT
  u.coop_id,
  u.id as user_id,
  u.level,
  u.xp_total,
  u.eggs,
  ROW_NUMBER() OVER (PARTITION BY u.coop_id ORDER BY u.level DESC, u.xp_total DESC) as rank
FROM users u
WHERE u.coop_id IS NOT NULL;

-- ============================================================================
-- DONE!
-- All tables, indexes, RLS policies, and views are now created
-- ============================================================================
