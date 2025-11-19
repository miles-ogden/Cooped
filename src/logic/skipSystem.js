/**
 * Skip System - Hearts Logic
 * Users get 3 hearts per day, each heart = 20 minutes of skip time
 */

import { supabase } from './supabaseClient.js'

const HEARTS_PER_DAY = 3
const MINUTES_PER_HEART = 20
const MILLISECONDS_PER_HEART = MINUTES_PER_HEART * 60 * 1000

/**
 * Get number of hearts available today
 */
export async function getAvailableHearts(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('hearts_remaining_today, skip_until')
      .eq('id', userId)
      .single()

    if (error) throw error
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
      hearts: user.hearts_remaining_today,
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
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        hearts_remaining_today: heartsData.hearts - 1,
        skip_until: skipUntil,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    console.log(`[SKIP] Heart used! Hearts remaining: ${heartsData.hearts - 1}, Skip until: ${skipUntil}`)

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
    const { data: user, error } = await supabase
      .from('users')
      .select('skip_until')
      .eq('id', userId)
      .single()

    if (error) throw error
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
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single()

    if (fetchError) throw fetchError

    // Calculate days since account creation
    const createdAt = new Date(user.created_at)
    const now = new Date()

    // Simple check: if last_stim_date is older than today, reset hearts
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        hearts_remaining_today: HEARTS_PER_DAY,
        skip_until: null,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) throw updateError

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
    const { error } = await supabase
      .from('users')
      .update({
        skip_until: null,
        updated_at: new Date()
      })
      .eq('id', userId)

    if (error) throw error

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
    const { data: user, error } = await supabase
      .from('users')
      .select('last_stim_date, created_at')
      .eq('id', userId)
      .single()

    if (error) throw error

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
