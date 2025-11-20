/**
 * Skip System - Hearts Logic
 * MVP Step 3 - Per chicken_popup_mvp_plan.md
 * Users get 3 hearts per day, each heart = 20 minutes of skip time
 */

import { querySelect, queryUpdate } from './supabaseClient.js'
import { triggerAnimation } from './animationEvents.js'

const HEARTS_PER_DAY = 3
const MINUTES_PER_HEART = 20
const MILLISECONDS_PER_HEART = MINUTES_PER_HEART * 60 * 1000

/**
 * Get number of hearts available today
 */
export async function getAvailableHearts(userId) {
  try {
    const user = await querySelect('users', {
      eq: { id: userId },
      select: 'hearts_remaining_today,skip_until',
      single: true
    })

    if (!user) throw new Error('User not found')

    // Check if skip period has expired
    if (user.skip_until) {
      const now = new Date()
      const skipUntil = new Date(user.skip_until)

      if (now < skipUntil) {
        // Still in skip period
        console.log(`[SKIP] User in skip period until ${skipUntil}`)
        return {
          success: true,
          hearts: 0,
          skipActive: true,
          skipUntil: skipUntil,
          minutesRemaining: Math.ceil((skipUntil - now) / 60000)
        }
      } else {
        // Skip period expired, reset to normal
        await resetSkipPeriod(userId)
        user.hearts_remaining_today = HEARTS_PER_DAY
        user.skip_until = null
      }
    }

    return {
      success: true,
      hearts: user.hearts_remaining_today || HEARTS_PER_DAY,
      skipActive: false,
      skipUntil: null,
      minutesRemaining: 0
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
    // 1. Check available hearts
    const heartsData = await getAvailableHearts(userId)

    if (!heartsData.success) {
      throw new Error(heartsData.error)
    }

    if (heartsData.skipActive) {
      return {
        success: false,
        error: 'Skip already active',
        minutesRemaining: heartsData.minutesRemaining
      }
    }

    if (heartsData.hearts <= 0) {
      return {
        success: false,
        error: 'No hearts remaining today',
        hearts: 0
      }
    }

    // 2. Calculate new skip_until timestamp
    const now = new Date()
    const skipUntil = new Date(now.getTime() + MILLISECONDS_PER_HEART)

    // 3. Update user
    await queryUpdate('users', {
      hearts_remaining_today: heartsData.hearts - 1,
      skip_until: skipUntil.toISOString(),
      updated_at: now.toISOString()
    }, { id: userId })

    // 4. Fetch updated user
    const updatedUser = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    console.log(`[SKIP] Heart used! Hearts remaining: ${heartsData.hearts - 1}, Skip until: ${skipUntil}`)

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
    const user = await querySelect('users', {
      eq: { id: userId },
      select: 'skip_until',
      single: true
    })

    if (!user) throw new Error('User not found')

    if (!user.skip_until) {
      return { success: true, inSkip: false }
    }

    const now = new Date()
    const skipUntil = new Date(user.skip_until)
    const inSkip = now < skipUntil

    if (inSkip) {
      const minutesRemaining = Math.ceil((skipUntil - now) / 60000)
      console.log(`[SKIP] User in skip period: ${minutesRemaining} minutes remaining`)
    }

    return {
      success: true,
      inSkip: inSkip,
      skipUntil: skipUntil,
      minutesRemaining: inSkip ? Math.ceil((skipUntil - now) / 60000) : 0
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
 * Export skip constants for reference
 */
export const SKIP_CONFIG = {
  HEARTS_PER_DAY,
  MINUTES_PER_HEART,
  MILLISECONDS_PER_HEART
}
