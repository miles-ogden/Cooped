/**
 * Time Tracking System for Cooped
 * Tracks total time spent on blocked websites (active vs inactive only)
 * Provides time bucketing by day/week for analytics and database syncing
 */

import { getAppState } from './storage.js';

const STORAGE_KEY_TIME_TRACKING = 'cooped_time_tracking';
const STORAGE_KEY_TIMEZONE = 'cooped_user_timezone';
const STORAGE_KEY_SYNC_QUEUE = 'cooped_sync_queue';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Get user's timezone
 * @returns {Promise<string>} Timezone string (e.g., 'America/New_York')
 */
export async function getUserTimezone() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_TIMEZONE);
    if (result[STORAGE_KEY_TIMEZONE]) {
      return result[STORAGE_KEY_TIMEZONE];
    }
    // Auto-detect on first load
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await chrome.storage.local.set({ [STORAGE_KEY_TIMEZONE]: detected });
    console.log(`[TIME-TRACKING] Detected timezone: ${detected}`);
    return detected;
  } catch (error) {
    console.error('Cooped: Error getting timezone:', error);
    return 'UTC';
  }
}

/**
 * Set user's timezone
 * @param {string} timezone - Timezone string (e.g., 'America/New_York')
 * @returns {Promise<void>}
 */
export async function setUserTimezone(timezone) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_TIMEZONE]: timezone });
    console.log(`[TIME-TRACKING] Timezone set to: ${timezone}`);
  } catch (error) {
    console.error('Cooped: Error setting timezone:', error);
  }
}

/**
 * Activity state enum - simplified to just ACTIVE/INACTIVE
 */
export const ACTIVITY_STATE = {
  INACTIVE: 'INACTIVE',  // Tab not focused
  ACTIVE: 'ACTIVE'       // Tab is active and user is on site
};

/**
 * Get or initialize time tracking record for a domain
 * @param {string} domain - Domain to track (youtube.com, tiktok.com, etc)
 * @returns {Promise<Object>} Time tracking record
 */
export async function getTimeTrackingRecord(domain) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_TIME_TRACKING);
    const allRecords = result[STORAGE_KEY_TIME_TRACKING] || {};

    if (!allRecords[domain]) {
      allRecords[domain] = initializeTimeTrackingRecord(domain);
      await chrome.storage.local.set({ [STORAGE_KEY_TIME_TRACKING]: allRecords });
    }

    return allRecords[domain];
  } catch (error) {
    console.error('Cooped: Error getting time tracking record:', error);
    return initializeTimeTrackingRecord(domain);
  }
}

/**
 * Create a new time tracking record
 * @param {string} domain - Domain to track
 * @returns {Object} New tracking record
 */
function initializeTimeTrackingRecord(domain) {
  return {
    domain,
    sessionStartTime: Date.now(),
    lastResetTime: Date.now(),
    totalActiveTimeMs: 0,        // Total time in milliseconds while ACTIVE
    lastTabActiveTime: Date.now(),
    currentState: ACTIVITY_STATE.INACTIVE,
    events: []
  };
}

/**
 * Save time tracking record
 * @param {string} domain - Domain to save
 * @param {Object} record - Record to save
 * @returns {Promise<void>}
 */
export async function saveTimeTrackingRecord(domain, record) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_TIME_TRACKING);
    const allRecords = result[STORAGE_KEY_TIME_TRACKING] || {};
    allRecords[domain] = record;
    await chrome.storage.local.set({ [STORAGE_KEY_TIME_TRACKING]: allRecords });
  } catch (error) {
    console.error('Cooped: Error saving time tracking record:', error);
  }
}

/**
 * Handle tab visibility change (focus/blur)
 * @param {string} domain - Current domain
 * @param {boolean} isVisible - Is tab currently visible/active
 * @returns {Promise<void>}
 */
export async function updateTabVisibility(domain, isVisible) {
  const record = await getTimeTrackingRecord(domain);
  const oldState = record.currentState;

  if (isVisible) {
    // Tab became active
    if (oldState === ACTIVITY_STATE.INACTIVE) {
      record.currentState = ACTIVITY_STATE.ACTIVE;
      record.lastTabActiveTime = Date.now();
      console.log(`[TIME-TRACKING] ${domain}: Tab active`);
    }
  } else {
    // Tab became inactive
    if (oldState === ACTIVITY_STATE.ACTIVE) {
      // Accumulate time before marking inactive
      const timeElapsed = Date.now() - record.lastTabActiveTime;
      record.totalActiveTimeMs += timeElapsed;
      record.currentState = ACTIVITY_STATE.INACTIVE;
      console.log(`[TIME-TRACKING] ${domain}: Tab inactive, accumulated ${Math.round(timeElapsed / 1000)}s`);
    }
  }

  record.events.push({
    timestamp: Date.now(),
    fromState: oldState,
    toState: record.currentState,
    type: 'tab_visibility'
  });

  await saveTimeTrackingRecord(domain, record);
}

/**
 * Accumulate time for a domain
 * @param {string} domain - Domain being tracked
 * @param {number} milliseconds - Time to add
 * @returns {Promise<void>}
 */
export async function accumulateTime(domain, milliseconds) {
  const record = await getTimeTrackingRecord(domain);
  record.totalActiveTimeMs += milliseconds;
  await saveTimeTrackingRecord(domain, record);
}

/**
 * Check if 2-hour reset should trigger for social media (TikTok/Facebook/X)
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>} True if 2 hours have passed since last reset
 */
export async function shouldResetSocialMediaTimer(domain) {
  const record = await getTimeTrackingRecord(domain);
  const timeSinceReset = Date.now() - record.lastResetTime;

  if (timeSinceReset >= TWO_HOURS_MS) {
    // Reset the timer
    record.lastResetTime = Date.now();
    record.totalActiveTimeMs = 0;
    record.currentState = ACTIVITY_STATE.ACTIVE;

    console.log(`[TIME-TRACKING] ${domain}: 2-hour timer reset`);
    await saveTimeTrackingRecord(domain, record);
    return true;
  }

  return false;
}

/**
 * Get time since session start for social media (for threshold checking)
 * @param {string} domain - Domain to check
 * @returns {Promise<number>} Milliseconds since the 2-hour window started
 */
export async function getTimeSinceSocialMediaReset(domain) {
  const record = await getTimeTrackingRecord(domain);
  return Date.now() - record.lastResetTime;
}

/**
 * Get summary of time spent on a domain
 * @param {string} domain - Domain to summarize
 * @returns {Promise<Object>} Summary with total time
 */
export async function getTimeTrackingSummary(domain) {
  const record = await getTimeTrackingRecord(domain);

  return {
    domain,
    totalTimeMs: record.totalActiveTimeMs,
    totalTimeMinutes: Math.round(record.totalActiveTimeMs / 60000),
    currentState: record.currentState
  };
}

/**
 * Clear all time tracking data (for testing/reset)
 * @returns {Promise<void>}
 */
export async function clearAllTimeTracking() {
  try {
    await chrome.storage.local.remove(STORAGE_KEY_TIME_TRACKING);
    console.log('[TIME-TRACKING] All time tracking data cleared');
  } catch (error) {
    console.error('Cooped: Error clearing time tracking:', error);
  }
}

/**
 * Convert a timestamp to a date string in user's timezone
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {string} timezone - User's timezone
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getDateInTimezone(timestamp, timezone) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone
  });
  return formatter.format(date);
}

/**
 * Get the Monday of the week for a given date in user's timezone
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Monday date in YYYY-MM-DD format
 */
export function getMondayOfWeek(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get all accumulated time data ready for syncing
 * Returns time grouped by domain with daily and weekly bucketing
 * @returns {Promise<Object>} Format: { domain: { totalMs, dailyMs, weeklyMs } }
 */
export async function getAllAccumulatedTimes() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_TIME_TRACKING);
    const allRecords = result[STORAGE_KEY_TIME_TRACKING] || {};
    const timezone = await getUserTimezone();
    const syncData = {};

    for (const [domain, record] of Object.entries(allRecords)) {
      // Get current date in user's timezone
      const today = getDateInTimezone(Date.now(), timezone);
      const mondayOfWeek = getMondayOfWeek(today);
      const sundayOfWeek = new Date(new Date(mondayOfWeek).getTime() + 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      syncData[domain] = {
        totalMs: record.totalActiveTimeMs,
        totalMinutes: Math.round(record.totalActiveTimeMs / 60000),
        date: today,
        weekStart: mondayOfWeek,
        weekEnd: sundayOfWeek,
        currentState: record.currentState,
        lastUpdated: Date.now()
      };
    }

    console.log('[TIME-TRACKING] Accumulated times prepared for sync:', syncData);
    return syncData;
  } catch (error) {
    console.error('Cooped: Error getting accumulated times:', error);
    return {};
  }
}

/**
 * Add a sync event to the queue (for offline support)
 * @param {string} domain - Domain to sync
 * @param {Object} syncData - Data to queue for sync
 * @returns {Promise<void>}
 */
export async function queueSyncEvent(domain, syncData) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SYNC_QUEUE);
    const queue = result[STORAGE_KEY_SYNC_QUEUE] || [];

    queue.push({
      domain,
      data: syncData,
      queuedAt: Date.now(),
      retries: 0
    });

    await chrome.storage.local.set({ [STORAGE_KEY_SYNC_QUEUE]: queue });
    console.log(`[TIME-TRACKING] Queued sync event for ${domain}`);
  } catch (error) {
    console.error('Cooped: Error queuing sync event:', error);
  }
}

/**
 * Get all queued sync events
 * @returns {Promise<Array>} Array of queued sync events
 */
export async function getSyncQueue() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SYNC_QUEUE);
    return result[STORAGE_KEY_SYNC_QUEUE] || [];
  } catch (error) {
    console.error('Cooped: Error getting sync queue:', error);
    return [];
  }
}

/**
 * Clear the sync queue after successful sync
 * @returns {Promise<void>}
 */
export async function clearSyncQueue() {
  try {
    await chrome.storage.local.remove(STORAGE_KEY_SYNC_QUEUE);
    console.log('[TIME-TRACKING] Sync queue cleared');
  } catch (error) {
    console.error('Cooped: Error clearing sync queue:', error);
  }
}
