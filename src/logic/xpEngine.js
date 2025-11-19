/**
 * XP Engine - Core Game Logic
 * Handles XP rewards, level ups, eggs, streaks, and all progression
 */

import { supabase } from './supabaseClient.js'

// XP thresholds and rewards
const XP_PER_LEVEL = 1000 // Level up every 1000 XP
const CLEAN_DAY_XP = 150 // No stimming events
const CLEAN_STREAK_XP = 200 // Streak of 3+ days
const STIM_PENALTY_XP = -50 // User stims but continues
const CHALLENGE_WIN_XP = 100 // Complete a challenge successfully
const PLACEMENT_REWARDS = {
  bronze: 150, // 3rd place
  silver: 200, // 2nd place
  gold: 250 // 1st place
}

/**
 * MAIN FUNCTION: Apply an XP event
 * Called whenever something happens that affects XP
 *
 * @param {string} userId - User's ID
 * @param {string} eventType - Type of event (clean_day, challenge_win, etc.)
 * @param {object} metadata - Additional data (optional)
 * @returns {object} Updated user object with new XP, level, eggs
 */
export async function applyXpEvent(userId, eventType, metadata = {}) {
  try {
    console.log(`[XP_ENGINE] Applying event: ${eventType} for user ${userId}`)

    // 1. Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) throw userError
    if (!user) throw new Error('User not found')

    // 2. Calculate XP delta based on event type
    const delta = getXpDelta(eventType, user, metadata)
    console.log(`[XP_ENGINE] XP Delta: ${delta} (event: ${eventType})`)

    // 3. Create XP event log
    await logXpEvent(userId, eventType, delta, metadata)

    // 4. Update user XP
    const newXpTotal = Math.max(0, user.xp_total + delta) // Don't go below 0
    let newLevel = user.level
    let newEggs = user.eggs

    // 5. Check for level ups (every 1000 XP)
    const levelUpsGained = Math.floor(newXpTotal / XP_PER_LEVEL) - Math.floor(user.xp_total / XP_PER_LEVEL)

    if (levelUpsGained > 0) {
      newLevel = user.level + levelUpsGained
      newEggs = user.eggs + levelUpsGained
      console.log(`[XP_ENGINE] LEVEL UP! Old: ${user.level}, New: ${newLevel}, Eggs gained: ${levelUpsGained}`)
    }

    // 6. Update streak if needed
    const newStreak = updateStreakLogic(user, eventType, metadata)

    // 7. Save updated user to database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        xp_total: newXpTotal,
        level: newLevel,
        eggs: newEggs,
        streak_days: newStreak,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) throw updateError

    console.log(`[XP_ENGINE] User updated: XP=${newXpTotal}, Level=${newLevel}, Eggs=${newEggs}, Streak=${newStreak}`)

    // 8. Return the updated user
    return {
      success: true,
      user: updatedUser,
      leveledUp: levelUpsGained > 0,
      levelsGained: levelUpsGained,
      eggsGained: levelUpsGained
    }
  } catch (err) {
    console.error('[XP_ENGINE] Error applying XP event:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Calculate XP delta based on event type
 */
function getXpDelta(eventType, user, metadata) {
  switch (eventType) {
    case 'clean_day':
      // No stimming events today
      return CLEAN_DAY_XP

    case 'clean_streak':
      // Streak of 3+ days - check streak in metadata
      const streak = metadata.streak || user.streak_days
      if (streak >= 3) {
        return CLEAN_STREAK_XP
      }
      return CLEAN_DAY_XP

    case 'stim_penalty':
      // User stims but continues (doesn't fully block)
      return STIM_PENALTY_XP

    case 'challenge_win':
      // Challenge completed successfully
      const difficulty = metadata.difficulty || 1
      // Higher difficulty = more XP (difficulty 1-5)
      return CHALLENGE_WIN_XP + (difficulty * 20)

    case 'placement_bronze':
      return PLACEMENT_REWARDS.bronze

    case 'placement_silver':
      return PLACEMENT_REWARDS.silver

    case 'placement_gold':
      return PLACEMENT_REWARDS.gold

    case 'manual_adjustment':
      // Admin/testing adjustment
      return metadata.delta || 0

    default:
      console.warn(`[XP_ENGINE] Unknown event type: ${eventType}`)
      return 0
  }
}

/**
 * Update streak logic
 *
 * Rules:
 * - If user has no stim events today → clean day, increment streak
 * - If user stims → reset streak to 0
 * - If streak ≥ 3 and clean day → bonus XP
 */
function updateStreakLogic(user, eventType, metadata) {
  // If user stims, reset streak
  if (eventType === 'stim_penalty') {
    console.log('[XP_ENGINE] Stim detected, resetting streak')
    return 0
  }

  // If clean day, increment streak
  if (eventType === 'clean_day' || eventType === 'clean_streak') {
    const newStreak = user.streak_days + 1
    console.log(`[XP_ENGINE] Clean day! Streak: ${user.streak_days} → ${newStreak}`)
    return newStreak
  }

  // Otherwise, keep current streak
  return user.streak_days
}

/**
 * Log XP event to database for audit trail
 */
async function logXpEvent(userId, eventType, delta, metadata) {
  try {
    const { error } = await supabase
      .from('xp_events')
      .insert([{
        user_id: userId,
        type: eventType,
        delta: delta,
        timestamp: new Date(),
        metadata: metadata
      }])

    if (error) throw error
    console.log(`[XP_ENGINE] XP event logged: ${eventType}`)
  } catch (err) {
    console.error('[XP_ENGINE] Error logging XP event:', err)
    // Don't throw - logging failure shouldn't stop XP application
  }
}

/**
 * Check for clean day
 * Returns true if user has no stim events today
 */
export async function isCleanDay(userId) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('stim_events')
      .select('id')
      .eq('user_id', userId)
      .gte('started_at', today.toISOString())
      .lte('started_at', new Date().toISOString())

    if (error) throw error

    const hasStimEvents = data && data.length > 0
    console.log(`[XP_ENGINE] Clean day check: ${!hasStimEvents}`)

    return !hasStimEvents
  } catch (err) {
    console.error('[XP_ENGINE] Error checking clean day:', err)
    return false
  }
}

/**
 * Reset hearts daily
 * Called once per day (ideally at midnight)
 */
export async function resetHeartsDaily(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        hearts_remaining_today: 3,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    console.log('[XP_ENGINE] Hearts reset for user:', userId)
    return { success: true, user: data }
  } catch (err) {
    console.error('[XP_ENGINE] Error resetting hearts:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get user's current stats
 */
export async function getUserStats(userId) {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    return { success: true, stats: data }
  } catch (err) {
    console.error('[XP_ENGINE] Error fetching user stats:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Trigger a clean day bonus
 * Call this at the end of each day if user had a clean day
 */
export async function triggerCleanDayBonus(userId) {
  try {
    // Check if actually a clean day
    const cleanDay = await isCleanDay(userId)

    if (!cleanDay) {
      console.log('[XP_ENGINE] Not a clean day, skipping bonus')
      return { success: false, error: 'Not a clean day' }
    }

    // Apply XP event
    const result = await applyXpEvent(userId, 'clean_day')

    if (result.success) {
      console.log('[XP_ENGINE] Clean day bonus applied!')
      return result
    } else {
      throw new Error(result.error)
    }
  } catch (err) {
    console.error('[XP_ENGINE] Error triggering clean day bonus:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Export XP rules for reference (can be used in UI)
 */
export const XP_RULES = {
  CLEAN_DAY_XP,
  CLEAN_STREAK_XP,
  STIM_PENALTY_XP,
  CHALLENGE_WIN_XP,
  PLACEMENT_REWARDS,
  XP_PER_LEVEL
}
