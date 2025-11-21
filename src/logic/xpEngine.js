/**
 * XP Engine - Core Game Logic
 * Handles XP rewards, level ups, eggs, streaks, and all progression
 * MVP Step 2 - Per chicken_popup_mvp_plan.md
 */

import { querySelect, queryUpdate, queryInsert } from './supabaseClient.js'
import { triggerAnimation } from './animationEvents.js'

// XP thresholds and rewards (per MVP plan)
const XP_PER_LEVEL = 1000 // Level up every 1000 XP → +1 level + +1 egg
const CLEAN_DAY_XP = 150 // No stimming events today
const CLEAN_STREAK_XP = 200 // Streak of 3+ days (bonus on top of clean day)
const STIM_PENALTY_XP = -50 // User stims and continues
const CHALLENGE_WIN_XP = 100 // Complete a challenge successfully
const SKIP_REFUND_XP = 50 // Refund the stim penalty when user skips
const PLACEMENT_REWARDS = {
  3: 150, // 3rd place (bronze)
  2: 200, // 2nd place (silver)
  1: 250 // 1st place (gold)
}

/**
 * MAIN FUNCTION: Apply an XP event
 * Called whenever something happens that affects XP
 * Spec: Every 1000 XP = +1 level + +1 egg
 *
 * @param {string} userId - User's ID
 * @param {string} eventType - Type of event (clean_day, challenge_win, placement_1st, stim_penalty, etc.)
 * @param {object} metadata - Additional data (optional)
 * @returns {object} Updated user object with new XP, level, eggs
 */
export async function applyXpEvent(userId, eventType, metadata = {}) {
  try {
    console.log(`[XP_ENGINE] Applying event: ${eventType} for user ${userId}`)

    // 1. Get current user from database
    const user = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    const previousLevel = user.level || 0
    const previousEggs = user.eggs || 0

    // 2. Calculate XP delta based on event type
    const delta = getXpDelta(eventType, user, metadata)
    console.log(`[XP_ENGINE] XP Delta: ${delta} (event: ${eventType})`)

    // 3. Calculate new XP total (don't go below 0)
    const newXpTotal = Math.max(0, (user.xp_total || 0) + delta)

    // 4. Calculate new level and eggs (every 1000 XP = +1 level, +1 egg awarded on level up)
    const newLevel = Math.floor(newXpTotal / XP_PER_LEVEL)
    const leveledUp = newLevel > previousLevel
    // Award +1 bonus egg only when user levels up, don't recalculate from level
    const newEggs = leveledUp ? previousEggs + (newLevel - previousLevel) : previousEggs
    const eggsGained = newEggs - previousEggs

    if (leveledUp) {
      console.log(`[XP_ENGINE] LEVEL UP! Old: ${previousLevel}, New: ${newLevel}, Eggs gained: ${eggsGained}`)
    }

    // 5. Update streak based on event type
    const newStreak = updateStreakLogic(user, eventType, metadata)

    // 6. Log the XP event to xp_events table
    await logXpEvent(userId, eventType, delta, metadata)

    // 7. Update user in database
    await queryUpdate('users', {
      xp_total: newXpTotal,
      level: newLevel,
      eggs: newEggs,
      streak_days: newStreak,
      updated_at: new Date().toISOString()
    }, { id: userId })

    // 8. Fetch updated user to return
    const updatedUser = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    console.log(`[XP_ENGINE] User updated: XP=${newXpTotal}, Level=${newLevel}, Eggs=${newEggs}, Streak=${newStreak}`)

    // 9. Trigger animations
    if (leveledUp) {
      triggerAnimation('LEVEL_UP', { newLevel, previousLevel, eggsGained })
    }
    if (eggsGained > 0) {
      triggerAnimation('EGG_GAINED', { eggsGained, totalEggs: newEggs })
    }

    // 10. Return the updated user
    return {
      success: true,
      user: updatedUser,
      leveledUp,
      levelsGained: newLevel - previousLevel,
      eggsGained
    }
  } catch (err) {
    console.error('[XP_ENGINE] Error applying XP event:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Calculate XP delta based on event type
 * Per MVP plan:
 * - +150 XP → clean day
 * - +200 XP → clean streak ≥ 3
 * - -50 XP → if user stims and continues
 * - +100 XP → challenge finish
 * - +150/200/250 XP → placement (3rd/2nd/1st)
 */
function getXpDelta(eventType, user, metadata) {
  switch (eventType) {
    case 'clean_day':
      // No stimming events today
      return CLEAN_DAY_XP

    case 'streak_bonus':
      // Bonus for streak of 3+ days (applied on top of clean_day)
      // Only applies if streak >= 3
      const streak = metadata.streak || user.streak_days || 0
      if (streak >= 3) {
        return CLEAN_STREAK_XP
      }
      return 0

    case 'stim_penalty':
      // User stims but continues (doesn't fully block)
      return STIM_PENALTY_XP

    case 'skip_used':
      // User used a heart to skip (refund the stim penalty)
      return SKIP_REFUND_XP

    case 'challenge_win':
      // Challenge completed successfully
      return CHALLENGE_WIN_XP

    case 'placement_1st':
      return PLACEMENT_REWARDS[1]

    case 'placement_2nd':
      return PLACEMENT_REWARDS[2]

    case 'placement_3rd':
      return PLACEMENT_REWARDS[3]

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
    await queryInsert('xp_events', [{
      user_id: userId,
      type: eventType,
      delta: delta,
      timestamp: new Date().toISOString(),
      metadata: JSON.stringify(metadata)
    }])

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
    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()
    const todayEnd = new Date(Date.now() + 86400000).toISOString()

    // Query stim events for today
    const stimEvents = await querySelect('stim_events', {
      eq: { user_id: userId },
      select: 'id'
    })

    // Filter events that occurred today
    const hasStimEventsToday = stimEvents.some(event => {
      const eventDate = event.started_at ? new Date(event.started_at).toISOString() : null
      return eventDate >= todayStart && eventDate < todayEnd
    })

    console.log(`[XP_ENGINE] Clean day check for ${userId}: ${!hasStimEventsToday}`)
    return !hasStimEventsToday
  } catch (err) {
    console.error('[XP_ENGINE] Error checking clean day:', err)
    return false
  }
}

/**
 * Reset hearts daily
 * Called once per day (ideally at midnight)
 * MVP Step 3 note: 3 hearts per day, 20 minutes per heart
 */
export async function resetHeartsDaily(userId) {
  try {
    await queryUpdate('users', {
      hearts_remaining_today: 3,
      updated_at: new Date().toISOString()
    }, { id: userId })

    const user = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    console.log('[XP_ENGINE] Hearts reset for user:', userId)
    return { success: true, user }
  } catch (err) {
    console.error('[XP_ENGINE] Error resetting hearts:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get user's current progression info
 * @param {string} userId - User ID
 * @returns {object} User progression data
 */
export async function getUserProgression(userId) {
  try {
    const user = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    const xpTotal = user.xp_total || 0
    const xpInCurrentLevel = xpTotal % XP_PER_LEVEL
    const xpToNextLevel = XP_PER_LEVEL - xpInCurrentLevel

    return {
      success: true,
      progression: {
        xp_total: xpTotal,
        level: user.level || 0,
        eggs: user.eggs || 0,
        streak_days: user.streak_days || 0,
        hearts_remaining_today: user.hearts_remaining_today || 3,
        xp_to_next_level: xpToNextLevel,
        progress_to_next_level: xpInCurrentLevel / XP_PER_LEVEL
      }
    }
  } catch (err) {
    console.error('[XP_ENGINE] Error getting user progression:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Process daily clean day bonus
 * Should be called once per day for each user
 * Grants +150 XP for clean day, +200 XP bonus if streak >= 3
 */
export async function processDailyCleanDay(userId) {
  try {
    // Check if actually a clean day
    const cleanDay = await isCleanDay(userId)

    if (!cleanDay) {
      console.log('[XP_ENGINE] Not a clean day, skipping bonus')
      return { success: false, error: 'Not a clean day' }
    }

    // Get user to check streak
    const user = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    // Apply clean day XP
    let result = await applyXpEvent(userId, 'clean_day')

    if (!result.success) {
      throw new Error(result.error)
    }

    // If streak >= 3, apply streak bonus
    if (user.streak_days >= 3) {
      result = await applyXpEvent(userId, 'streak_bonus', { streakLength: user.streak_days })
    }

    console.log('[XP_ENGINE] Clean day bonus applied!')
    return result
  } catch (err) {
    console.error('[XP_ENGINE] Error processing clean day:', err)
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
  SKIP_REFUND_XP,
  PLACEMENT_REWARDS,
  XP_PER_LEVEL
}
