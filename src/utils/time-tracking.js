/**
 * Time Tracking System for Cooped
 * Tracks productive vs unproductive time on blocked websites
 */

import { getAppState } from './storage.js';

const STORAGE_KEY_TIME_TRACKING = 'cooped_time_tracking';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_MINUTES_MS = 3 * 60 * 1000;
const SEVEN_MINUTES_MS = 7 * 60 * 1000;

/**
 * Activity state enum
 */
export const ACTIVITY_STATE = {
  INACTIVE: 'INACTIVE',      // Tab not focused
  PAUSED: 'PAUSED',          // Media paused but tab active
  PRODUCTIVE: 'PRODUCTIVE',  // Engaging with content productively
  UNPRODUCTIVE: 'UNPRODUCTIVE', // Stimming/mindless consumption
  UNKNOWN: 'UNKNOWN'         // (YouTube only) awaiting user response
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
    timeInProductiveState: 0,
    timeInUnproductiveState: 0,
    lastTabActiveTime: Date.now(),
    currentState: ACTIVITY_STATE.INACTIVE,
    contentMetadata: {},
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
    // Tab became active - resume previous state or mark as ACTIVE
    if (oldState === ACTIVITY_STATE.INACTIVE) {
      record.currentState = ACTIVITY_STATE.PRODUCTIVE; // Default to productive when returning
      record.lastTabActiveTime = Date.now();
      console.log(`[TIME-TRACKING] ${domain}: Tab active, resuming PRODUCTIVE state`);
    }
  } else {
    // Tab became inactive
    if (oldState !== ACTIVITY_STATE.PAUSED) {
      record.currentState = ACTIVITY_STATE.INACTIVE;
      console.log(`[TIME-TRACKING] ${domain}: Tab inactive, paused tracking`);
    }
  }

  await saveTimeTrackingRecord(domain, record);
}

/**
 * Handle media pause/play state change
 * @param {string} domain - Current domain
 * @param {boolean} isPaused - Is media paused
 * @returns {Promise<void>}
 */
export async function updateMediaPauseState(domain, isPaused) {
  const record = await getTimeTrackingRecord(domain);

  if (isPaused) {
    if (record.currentState !== ACTIVITY_STATE.INACTIVE) {
      record.currentState = ACTIVITY_STATE.PAUSED;
      console.log(`[TIME-TRACKING] ${domain}: Media paused, state = PAUSED`);
    }
  } else {
    // Media playing - need to determine if productive or unproductive
    // This is determined by platform-specific logic elsewhere
    if (record.currentState === ACTIVITY_STATE.PAUSED) {
      record.currentState = ACTIVITY_STATE.PRODUCTIVE; // Default resume to productive
      record.lastTabActiveTime = Date.now();
      console.log(`[TIME-TRACKING] ${domain}: Media playing, resumed PRODUCTIVE state`);
    }
  }

  await saveTimeTrackingRecord(domain, record);
}

/**
 * Set explicit productivity state for a domain
 * @param {string} domain - Domain to update
 * @param {string} state - New state (PRODUCTIVE, UNPRODUCTIVE, PAUSED, INACTIVE)
 * @param {Object} [metadata={}] - Additional metadata (videoId, title, etc)
 * @returns {Promise<void>}
 */
export async function setActivityState(domain, state, metadata = {}) {
  const record = await getTimeTrackingRecord(domain);
  const oldState = record.currentState;

  record.currentState = state;
  if (Object.keys(metadata).length > 0) {
    record.contentMetadata = { ...record.contentMetadata, ...metadata };
  }

  record.events.push({
    timestamp: Date.now(),
    fromState: oldState,
    toState: state,
    metadata
  });

  console.log(`[TIME-TRACKING] ${domain}: State transition ${oldState} -> ${state}`);
  await saveTimeTrackingRecord(domain, record);
}

/**
 * Update accumulated time for a state
 * @param {string} domain - Domain being tracked
 * @param {string} state - State to update (PRODUCTIVE or UNPRODUCTIVE)
 * @param {number} milliseconds - Time to add
 * @returns {Promise<void>}
 */
export async function accumulateTime(domain, state, milliseconds) {
  const record = await getTimeTrackingRecord(domain);

  if (state === ACTIVITY_STATE.PRODUCTIVE) {
    record.timeInProductiveState += milliseconds;
  } else if (state === ACTIVITY_STATE.UNPRODUCTIVE) {
    record.timeInUnproductiveState += milliseconds;
  }

  await saveTimeTrackingRecord(domain, record);

  // Also update global stats
  const appState = await getAppState();
  if (state === ACTIVITY_STATE.PRODUCTIVE) {
    appState.user.stats.totalProductiveTime += milliseconds;
  } else if (state === ACTIVITY_STATE.UNPRODUCTIVE) {
    appState.user.stats.totalUnproductiveTime += milliseconds;
  }
  await chrome.storage.local.set({ ['cooped_app_state']: appState });
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
    // Reset productive/unproductive counters for this session
    record.timeInProductiveState = 0;
    record.timeInUnproductiveState = 0;
    record.currentState = ACTIVITY_STATE.PRODUCTIVE; // Start fresh as productive

    console.log(`[TIME-TRACKING] ${domain}: 2-hour timer reset`);
    await saveTimeTrackingRecord(domain, record);
    return true;
  }

  return false;
}

/**
 * Get time since session start for social media (for 3-minute threshold)
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
 * @returns {Promise<Object>} Summary with productive/unproductive times
 */
export async function getTimeTrackingSummary(domain) {
  const record = await getTimeTrackingRecord(domain);

  return {
    domain,
    productiveTime: record.timeInProductiveState,
    unproductiveTime: record.timeInUnproductiveState,
    totalTime: record.timeInProductiveState + record.timeInUnproductiveState,
    currentState: record.currentState,
    productivityPercent: record.timeInProductiveState + record.timeInUnproductiveState > 0
      ? Math.round((record.timeInProductiveState / (record.timeInProductiveState + record.timeInUnproductiveState)) * 100)
      : 0
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
