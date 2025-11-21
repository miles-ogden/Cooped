/**
 * Skip System - Hearts Logic
 * MVP Step 3 - Per chicken_popup_mvp_plan.md
 * Users get 3 hearts per day, each heart = 20 minutes of skip time
 */

import { querySelect, queryUpdate } from './supabaseClient.js'
import { triggerAnimation } from './animationEvents.js'

const HEARTS_PER_DAY = 3
const MINUTES_PER_HEART = 1 // Testing: reduced from 20 to 1 minute for easy testing
const MILLISECONDS_PER_HEART = MINUTES_PER_HEART * 60 * 1000

/**
 * Get number of hearts available today
 */
export async function getAvailableHearts(userId) {
  try {
    console.log(`[SKIP] getAvailableHearts called for user ${userId}`);
    const user = await querySelect('users', {
      eq: { id: userId },
      select: 'hearts_remaining_today,skip_until',
      single: true
    })

    console.log(`[SKIP] getAvailableHearts DB response: ${JSON.stringify(user)}`);

    if (!user) throw new Error('User not found')

    // Check if skip period has expired
    let skipActive = false;
    let skipUntil = null;
    let minutesRemaining = 0;

    if (user.skip_until) {
      const now = new Date()
      // Handle both ISO format with Z (UTC) and without Z (treat as UTC)
      const skipUntilStr = user.skip_until.endsWith('Z') ? user.skip_until : `${user.skip_until}Z`
      skipUntil = new Date(skipUntilStr)

      // Calculate seconds remaining using server time perspective
      const secondsRemaining = Math.floor((skipUntil.getTime() - now.getTime()) / 1000);
      minutesRemaining = Math.ceil(secondsRemaining / 60);

      // Safety check: If skip period is way too long (> 60 minutes), it's probably stale data
      // and should be cleared (our max legitimate skip is 20 minutes, plus buffer for clock skew)
      if (minutesRemaining > 60) {
        console.log(`[SKIP] ⚠️ WARNING: Skip period is ${minutesRemaining} minutes (> 60 max) - likely stale. Clearing.`);
        await resetSkipPeriod(userId);
        skipActive = false;
        minutesRemaining = 0;
        skipUntil = null;
      } else if (secondsRemaining > 0) {
        // Still in skip period
        console.log(`[SKIP] User in skip period until ${skipUntil} (${minutesRemaining} min remaining)`);
        skipActive = true;
      } else {
        // Skip period expired, reset to normal
        console.log(`[SKIP] Skip period expired, resetting`);
        await resetSkipPeriod(userId)
        skipActive = false;
        minutesRemaining = 0;
      }
    }

    // Always return hearts_remaining_today, even if in skip period
    const hearts = user.hearts_remaining_today || HEARTS_PER_DAY;
    console.log(`[SKIP] Returning: hearts=${hearts}, skipActive=${skipActive}, minutesRemaining=${minutesRemaining}`);

    return {
      success: true,
      hearts: hearts,
      skipActive: skipActive,
      skipUntil: skipUntil,
      minutesRemaining: minutesRemaining
    }
  } catch (err) {
    console.error('[SKIP] Error getting available hearts:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Use a heart (activate skip for 20 minutes)
 */
export async function useHeart(userId) {
  try {
    console.log(`[SKIP] useHeart called for user ${userId}`);

    // 1. Check available hearts
    const heartsData = await getAvailableHearts(userId)

    console.log(`[SKIP] Hearts data: ${JSON.stringify(heartsData)}`);

    if (!heartsData.success) {
      throw new Error(heartsData.error)
    }

    if (heartsData.skipActive) {
      console.log(`[SKIP] Skip already active!`);
      return {
        success: false,
        error: 'Skip already active',
        minutesRemaining: heartsData.minutesRemaining
      }
    }

    if (heartsData.hearts <= 0) {
      console.log(`[SKIP] No hearts remaining!`);
      return {
        success: false,
        error: 'No hearts remaining today',
        hearts: 0
      }
    }

    // 2. Calculate new skip_until timestamp
    const now = new Date()
    const skipUntil = new Date(now.getTime() + MILLISECONDS_PER_HEART)

    console.log(`[SKIP] Setting skip_until to ${skipUntil.toISOString()} (now: ${now.toISOString()})`);

    // 3. Update user
    console.log(`[SKIP] About to update DB with hearts=${heartsData.hearts - 1}, skip_until=${skipUntil.toISOString()}`);
    const updateResult = await queryUpdate('users', {
      hearts_remaining_today: heartsData.hearts - 1,
      skip_until: skipUntil.toISOString(),
      updated_at: now.toISOString()
    }, { id: userId })

    console.log(`[SKIP] Database update result:`, updateResult);
    console.log(`[SKIP] Database updated with skip_until timestamp`);

    // 4. Fetch updated user - query ALL fields to see what's in the DB
    console.log(`[SKIP] Fetching updated user from database...`);
    console.log(`[SKIP] Query params: userId=${userId}`);
    const updatedUser = await querySelect('users', {
      eq: { id: userId },
      single: true
    });
    console.log(`[SKIP] Updated user from DB (ALL fields):`, updatedUser);
    if (!updatedUser) {
      console.error(`[SKIP] ❌ CRITICAL: querySelect returned null/undefined!`);
    }

    // DEBUG: Check if skip_until was actually saved
    if (updatedUser && updatedUser.skip_until) {
      console.log(`[SKIP] ✅ CONFIRMED: skip_until is in database: ${updatedUser.skip_until}`);
    } else {
      console.error(`[SKIP] ❌ ERROR: skip_until is NULL in database after update! This should not happen!`);
      console.error(`[SKIP] Updated user object:`, JSON.stringify(updatedUser));
    }


    console.log(`[SKIP] ✅ Heart used! Hearts remaining: ${heartsData.hearts - 1}, Skip until: ${skipUntil.toISOString()}`);
    console.log(`[SKIP] Updated user from DB: ${JSON.stringify(updatedUser)}`);

    // Trigger animation
    triggerAnimation('HEART_USED', { heartsRemaining: heartsData.hearts - 1, minutesActive: MINUTES_PER_HEART })

    return {
      success: true,
      heartsRemaining: heartsData.hearts - 1,
      skipUntil: skipUntil,
      minutesActive: MINUTES_PER_HEART,
      user: updatedUser
    }
  } catch (err) {
    console.error('[SKIP] Error using heart:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Check if user is currently in a skip period
 */
export async function isUserInSkipPeriod(userId) {
  try {
    console.log(`[SKIP] Checking skip period for user ${userId}`);
    const user = await querySelect('users', {
      eq: { id: userId },
      select: 'skip_until',
      single: true
    })

    console.log(`[SKIP] User data retrieved: ${JSON.stringify(user)}`);

    if (!user) throw new Error('User not found')

    if (!user.skip_until) {
      console.log(`[SKIP] No skip_until timestamp set - user not in skip period`);
      return { success: true, inSkip: false }
    }

    const now = new Date()
    // Handle both ISO format with Z (UTC) and without Z (treat as UTC)
    const skipUntilStr = user.skip_until.endsWith('Z') ? user.skip_until : `${user.skip_until}Z`
    const skipUntil = new Date(skipUntilStr)

    // Calculate seconds remaining
    const secondsRemaining = Math.floor((skipUntil.getTime() - now.getTime()) / 1000);
    let inSkip = secondsRemaining > 0;
    let minutesRemaining = Math.ceil(secondsRemaining / 60);

    // Safety check: If skip period is way too long (> 60 minutes), it's probably stale data
    // (our max legitimate skip is 20 minutes, plus buffer for clock skew)
    if (minutesRemaining > 60) {
      console.log(`[SKIP] ⚠️ WARNING: Skip period is ${minutesRemaining} minutes (> 60 max) - likely stale. Clearing.`);
      await resetSkipPeriod(userId);
      inSkip = false;
      minutesRemaining = 0;
    }

    console.log(`[SKIP] Comparing times: now=${now.toISOString()}, skipUntil=${skipUntil.toISOString()}`);
    console.log(`[SKIP] Seconds remaining: ${secondsRemaining}, Minutes remaining: ${minutesRemaining}, inSkip: ${inSkip}`);

    if (inSkip) {
      console.log(`[SKIP] ✅ USER IS IN SKIP PERIOD: ${minutesRemaining} minutes remaining`)
    } else {
      console.log(`[SKIP] ❌ Skip period has expired or was stale`);
    }

    return {
      success: true,
      inSkip: inSkip,
      skipUntil: inSkip ? skipUntil : null,
      minutesRemaining: minutesRemaining
    }
  } catch (err) {
    console.error('[SKIP] Error checking skip period:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Reset hearts daily (call at midnight or when user logs in)
 * Should be triggered by background task or user login
 */
export async function resetHeartsDaily(userId) {
  try {
    const now = new Date()

    await queryUpdate('users', {
      hearts_remaining_today: HEARTS_PER_DAY,
      skip_until: null,
      updated_at: now.toISOString()
    }, { id: userId })

    const updatedUser = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    console.log(`[SKIP] Hearts reset to ${HEARTS_PER_DAY} for user ${userId}`)

    return {
      success: true,
      hearts: HEARTS_PER_DAY,
      user: updatedUser
    }
  } catch (err) {
    console.error('[SKIP] Error resetting hearts:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Reset skip period (called when skip expires)
 */
async function resetSkipPeriod(userId) {
  try {
    await queryUpdate('users', {
      skip_until: null,
      updated_at: new Date().toISOString()
    }, { id: userId })

    console.log(`[SKIP] Skip period reset for user ${userId}`)
    return { success: true }
  } catch (err) {
    console.error('[SKIP] Error resetting skip period:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get skip status for UI display
 * Returns hearts remaining + skip timer status
 */
export async function getSkipStatus(userId) {
  try {
    const hearts = await getAvailableHearts(userId)
    const skipStatus = await isUserInSkipPeriod(userId)

    if (!hearts.success || !skipStatus.success) {
      throw new Error('Failed to get skip status')
    }

    return {
      success: true,
      hearts: hearts.hearts,
      skipActive: skipStatus.inSkip,
      skipUntil: skipStatus.skipUntil,
      minutesRemaining: skipStatus.minutesRemaining,
      heartsLabel: `${hearts.hearts}/${HEARTS_PER_DAY}`,
      minutesPerHeart: MINUTES_PER_HEART
    }
  } catch (err) {
    console.error('[SKIP] Error getting skip status:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Check daily reset needed
 * Returns true if hearts should be reset
 */
export async function shouldResetHeartsToday(userId) {
  try {
    const user = await querySelect('users', {
      eq: { id: userId },
      select: 'last_stim_date,created_at',
      single: true
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // If last_stim_date is before today, we need to reset
    const lastStimDate = user.last_stim_date ? new Date(user.last_stim_date) : null

    if (!lastStimDate) {
      // New user or no stim events yet
      return true
    }

    lastStimDate.setHours(0, 0, 0, 0)

    const shouldReset = lastStimDate < now
    console.log(`[SKIP] Should reset hearts: ${shouldReset}`)

    return shouldReset
  } catch (err) {
    console.error('[SKIP] Error checking reset needed:', err)
    return false
  }
}

/**
 * DEBUG: Manually reset skip period (for testing)
 * This clears any active skip to test from a clean state
 */
export async function debugResetSkipPeriod(userId) {
  try {
    console.log(`[SKIP-DEBUG] Manually resetting skip period for user ${userId}`);
    await queryUpdate('users', {
      skip_until: null,
      updated_at: new Date().toISOString()
    }, { id: userId });
    console.log(`[SKIP-DEBUG] ✅ Skip period manually reset`);
    return { success: true };
  } catch (err) {
    console.error('[SKIP-DEBUG] Error resetting skip period:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Export skip constants for reference
 */
export const SKIP_CONFIG = {
  HEARTS_PER_DAY,
  MINUTES_PER_HEART,
  MILLISECONDS_PER_HEART
}
