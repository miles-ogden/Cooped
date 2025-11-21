/**
 * Time Tracking System for Cooped
 * Tracks total time spent on blocked websites (active vs inactive only)
 */

import { getAppState } from './storage.js';

const STORAGE_KEY_TIME_TRACKING = 'cooped_time_tracking';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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
