/**
 * Hourly Access Tracker
 * Implements "one chance per hour" system for blocked websites
 *
 * SYSTEM:
 * - First access in the hour: Show timer (3-10 min based on settings)
 * - After timer expires: Challenge screen appears
 * - Repeat accesses within same hour: Instant block (no timer, no challenge)
 * - After 1 hour: Reset - user gets another chance with timer
 */

import { querySelect, queryInsert, queryUpdate, getCurrentUser } from '../logic/supabaseClient.js'

/**
 * Track hourly access per domain in Chrome storage
 * Format: {
 *   [domain]: {
 *     firstAccessTime: timestamp,
 *     hourStartTime: timestamp,
 *     hasBeenBlocked: boolean
 *   }
 * }
 */
const STORAGE_KEY = 'cooped_hourly_access'
const HOUR_IN_MS = 60 * 60 * 1000

/**
 * Initialize hourly tracking storage
 */
async function initializeHourlyTracking() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY)
    if (!data[STORAGE_KEY]) {
      await chrome.storage.local.set({ [STORAGE_KEY]: {} })
      console.log('[HOURLY] Hourly access tracking initialized')
    }
  } catch (err) {
    console.error('[HOURLY] Error initializing tracking:', err)
  }
}

/**
 * Check if domain access is allowed and return access state
 *
 * Returns:
 * - { allowed: true, isFirstAccess: true } = Show timer (first access in hour)
 * - { allowed: false, isRepeatAccess: true } = Instant block (repeat within hour)
 * - { allowed: true, isFirstAccess: true } = Show timer (hour has reset)
 */
export async function checkDomainAccessState(domain) {
  try {
    console.log(`[HOURLY] Checking access state for domain: ${domain}`)

    const data = await chrome.storage.local.get(STORAGE_KEY)
    const tracking = data[STORAGE_KEY] || {}
    const now = Date.now()

    // Get or initialize domain tracking
    let domainData = tracking[domain]

    if (!domainData) {
      // First access ever to this domain
      console.log(`[HOURLY] First access ever to ${domain}`)
      domainData = {
        firstAccessTime: now,
        hourStartTime: now,
        hasBeenBlocked: false
      }
      tracking[domain] = domainData
      await chrome.storage.local.set({ [STORAGE_KEY]: tracking })

      return {
        success: true,
        allowed: true,
        isFirstAccess: true,
        isRepeatAccess: false,
        message: 'First access - show timer'
      }
    }

    // Check if hour has expired
    const timeSinceHourStart = now - domainData.hourStartTime
    const hourExpired = timeSinceHourStart > HOUR_IN_MS

    if (hourExpired) {
      // Hour has expired - reset and treat as first access
      console.log(`[HOURLY] Hour expired for ${domain} - resetting access`)
      domainData = {
        firstAccessTime: now,
        hourStartTime: now,
        hasBeenBlocked: false
      }
      tracking[domain] = domainData
      await chrome.storage.local.set({ [STORAGE_KEY]: tracking })

      return {
        success: true,
        allowed: true,
        isFirstAccess: true,
        isRepeatAccess: false,
        message: 'Hour reset - show timer'
      }
    }

    // Hour is still active - check if this is repeat access
    if (domainData.hasBeenBlocked) {
      // Already blocked once this hour - instant block on repeat
      console.log(`[HOURLY] Repeat access to ${domain} within hour - instant block`)
      return {
        success: true,
        allowed: false,
        isFirstAccess: false,
        isRepeatAccess: true,
        message: 'Repeat access within hour - instant block',
        minutesUntilReset: Math.ceil((HOUR_IN_MS - timeSinceHourStart) / 60000)
      }
    }

    // First access just happened, user hasn't been blocked yet
    console.log(`[HOURLY] First access within hour for ${domain}`)
    return {
      success: true,
      allowed: true,
      isFirstAccess: true,
      isRepeatAccess: false,
      message: 'First access within hour - show timer'
    }
  } catch (err) {
    console.error('[HOURLY] Error checking access state:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Mark domain as blocked (after timer expires and challenge shown)
 * Call this when user sees the challenge screen
 */
export async function markDomainAsBlocked(domain) {
  try {
    console.log(`[HOURLY] Marking ${domain} as blocked for this hour`)

    const data = await chrome.storage.local.get(STORAGE_KEY)
    const tracking = data[STORAGE_KEY] || {}

    if (!tracking[domain]) {
      tracking[domain] = {
        firstAccessTime: Date.now(),
        hourStartTime: Date.now(),
        hasBeenBlocked: true
      }
    } else {
      tracking[domain].hasBeenBlocked = true
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: tracking })
    console.log(`[HOURLY] ✅ Domain marked as blocked: ${domain}`)

    return { success: true }
  } catch (err) {
    console.error('[HOURLY] Error marking domain as blocked:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get remaining time until hourly reset for a domain
 * Returns minutes remaining
 */
export async function getMinutesUntilReset(domain) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY)
    const tracking = data[STORAGE_KEY] || {}
    const domainData = tracking[domain]

    if (!domainData) {
      return 60 // Full hour if no data
    }

    const now = Date.now()
    const timeSinceHourStart = now - domainData.hourStartTime
    const minutesRemaining = Math.ceil((HOUR_IN_MS - timeSinceHourStart) / 60000)

    return Math.max(0, minutesRemaining)
  } catch (err) {
    console.error('[HOURLY] Error getting reset time:', err)
    return 0
  }
}

/**
 * Reset all hourly tracking (for testing or new day)
 */
export async function resetAllHourlyTracking() {
  try {
    console.log('[HOURLY-DEBUG] Resetting all hourly tracking')
    await chrome.storage.local.set({ [STORAGE_KEY]: {} })
    return { success: true }
  } catch (err) {
    console.error('[HOURLY-DEBUG] Error resetting tracking:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get all tracked domains (for debugging)
 */
export async function getTrackedDomains() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY)
    const tracking = data[STORAGE_KEY] || {}
    const now = Date.now()

    const domains = Object.entries(tracking).map(([domain, data]) => {
      const hourExpired = (now - data.hourStartTime) > HOUR_IN_MS
      const minutesRemaining = Math.ceil((HOUR_IN_MS - (now - data.hourStartTime)) / 60000)

      return {
        domain,
        firstAccessTime: new Date(data.firstAccessTime).toLocaleString(),
        hasBeenBlocked: data.hasBeenBlocked,
        hourExpired,
        minutesRemaining: Math.max(0, minutesRemaining)
      }
    })

    return { success: true, domains }
  } catch (err) {
    console.error('[HOURLY] Error getting tracked domains:', err)
    return { success: false, error: err.message }
  }
}

// Initialize on import
initializeHourlyTracking()
