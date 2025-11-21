-- Create a PostgreSQL function to add XP to a user
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION add_xp_to_user(user_id UUID, xp_amount INTEGER)
RETURNS TABLE (
  new_xp_total INTEGER,
  new_level INTEGER
) AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_xp_total INTEGER;
  new_level INTEGER;
  xp_per_level INTEGER := 1000; -- XP needed per level (adjust as needed)
BEGIN
  -- Get current user XP and level
  SELECT xp_total, level INTO current_xp, current_level
  FROM users
  WHERE id = user_id;

  -- If user doesn't exist, return error
  IF current_xp IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate new XP total
  new_xp_total := current_xp + xp_amount;

  -- Calculate new level (simple linear progression: 0-999 = lvl 1, 1000-1999 = lvl 2, etc)
  new_level := (new_xp_total / xp_per_level) + 1;

  -- Update user with new XP and level
  UPDATE users
  SET
    xp_total = new_xp_total,
    level = new_level,
    updated_at = NOW()
  WHERE id = user_id;

  -- Return the new values
  RETURN QUERY SELECT new_xp_total, new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_xp_to_user(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp_to_user(UUID, INTEGER) TO service_role;
