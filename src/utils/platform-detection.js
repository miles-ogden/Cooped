/**
 * Platform-specific detection logic for time tracking
 * Handles YouTube, Shorts, TikTok, Facebook, and X differently
 */

import {
  updateTabVisibility,
  updateMediaPauseState,
  setActivityState,
  ACTIVITY_STATE,
  accumulateTime,
  getTimeTrackingRecord,
  shouldResetSocialMediaTimer,
  getTimeSinceSocialMediaReset
} from './time-tracking.js';

const THREE_MINUTES_MS = 1 * 60 * 1000; // TESTING: Changed from 3 minutes to 1 minute for easier testing
const SEVEN_MINUTES_MS = 1 * 60 * 1000; // TESTING: Changed from 7 minutes to 1 minute for easier testing

/**
 * Detect platform from hostname
 * @param {string} hostname - Current hostname
 * @returns {string} Platform identifier (youtube, tiktok, facebook, x)
 */
export function detectPlatform(hostname) {
  if (hostname.includes('youtube.com')) return 'youtube.com';
  if (hostname.includes('tiktok.com')) return 'tiktok.com';
  if (hostname.includes('facebook.com')) return 'facebook.com';
  if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'x.com';
  if (hostname.includes('instagram.com')) return 'instagram.com';
  return null;
}

/**
 * Check if Shorts page (YouTube specific)
 * @returns {boolean}
 */
export function isOnYouTubeShorts() {
  return window.location.pathname.includes('/shorts');
}

/**
 * Handle YouTube Shorts productivity detection
 * Thresholds vary by blocking level
 * @param {number} shortsCount - Number of shorts scrolled in time window
 * @param {string} blockingLevel - 'fully', 'some', or 'a_lot'
 * @returns {Promise<boolean>} - True if unproductive
 */
export async function handleYouTubeShortsDetection(shortsCount, blockingLevel = 'some') {
  const domain = 'youtube.com';

  // Threshold depends on blocking level
  let threshold = 8;  // Default 'some' leeway: 8 shorts in 7 min
  if (blockingLevel === 'fully') {
    threshold = 1;    // Fully block: even 1 short is flagged
  } else if (blockingLevel === 'a_lot') {
    threshold = 20;   // A lot of leeway: 20 shorts in 20 min
  }

  if (shortsCount >= threshold) {
    // Threshold exceeded = unproductive stimming
    await setActivityState(domain, ACTIVITY_STATE.UNPRODUCTIVE, {
      reason: 'shorts_stimming',
      shortsScrolledInTimeWindow: shortsCount,
      blockingLevel
    });
    console.log(`[PLATFORM-DETECTION] YouTube Shorts: ${shortsCount} shorts (threshold: ${threshold}) [${blockingLevel}] = UNPRODUCTIVE`);
    return true;
  } else {
    // Under threshold = productive viewing
    await setActivityState(domain, ACTIVITY_STATE.PRODUCTIVE, {
      reason: 'shorts_browsing',
      shortsScrolledInTimeWindow: shortsCount,
      blockingLevel
    });
    console.log(`[PLATFORM-DETECTION] YouTube Shorts: ${shortsCount} shorts (threshold: ${threshold}) [${blockingLevel}] = PRODUCTIVE`);
    return false;
  }
}

/**
 * Handle YouTube long-form video productivity detection
 * Thresholds vary by blocking level
 * @param {number} watchTimeMinutes - Minutes watched without pause
 * @param {string} blockingLevel - 'fully', 'some', or 'a_lot'
 * @returns {Promise<boolean>} - True if should show productivity prompt
 */
export async function handleYouTubeLongFormDetection(watchTimeMinutes, blockingLevel = 'some') {
  const domain = 'youtube.com';

  // Threshold depends on blocking level
  let threshold = 7;  // Default 'some' leeway: 7 minutes
  if (blockingLevel === 'fully') {
    threshold = 0;    // Fully block: show popup instantly
  } else if (blockingLevel === 'a_lot') {
    threshold = 15;   // A lot of leeway: 15 minutes
  }

  if (blockingLevel === 'fully' || watchTimeMinutes >= threshold) {
    // Threshold reached or fully blocked = show productivity prompt
    const record = await getTimeTrackingRecord(domain);

    if (record.currentState !== ACTIVITY_STATE.UNKNOWN) {
      await setActivityState(domain, ACTIVITY_STATE.UNKNOWN, {
        reason: 'long_watch_unpaused',
        watchTimeMinutes,
        blockingLevel,
        threshold
      });
      console.log(`[PLATFORM-DETECTION] YouTube: ${watchTimeMinutes}min unpaused watch (threshold: ${threshold}min) [${blockingLevel}] -> showing productivity prompt`);
      return true;
    }
  }

  return false;
}

/**
 * Handle user's productivity response (YouTube long-form)
 * @param {boolean} wasProductive - User's answer to "were you being productive?"
 * @returns {Promise<void>}
 */
export async function recordYouTubeProductivityResponse(wasProductive, metadata = {}) {
  const domain = 'youtube.com';
  const newState = wasProductive ? ACTIVITY_STATE.PRODUCTIVE : ACTIVITY_STATE.UNPRODUCTIVE;

  await setActivityState(domain, newState, {
    reason: 'user_confirmed_productivity',
    userReported: wasProductive,
    ...metadata
  });

  console.log(`[PLATFORM-DETECTION] YouTube: User reported ${wasProductive ? 'PRODUCTIVE' : 'UNPRODUCTIVE'}`);
}

/**
 * Handle TikTok/Facebook/X stimming detection
 * Thresholds vary by blocking level
 * @param {string} domain - Platform domain (tiktok.com, facebook.com, x.com, instagram.com, etc.)
 * @param {string} blockingLevel - 'fully', 'some', or 'a_lot'
 * @returns {Promise<boolean>} True if unproductive stimming detected
 */
export async function handleSocialMediaStimmingDetection(domain, blockingLevel = 'some') {
  // Check if 2-hour reset should trigger
  await shouldResetSocialMediaTimer(domain);

  // Get time since last reset
  const timeSinceReset = await getTimeSinceSocialMediaReset(domain);

  // Threshold depends on blocking level
  let thresholdMs = 3 * 60 * 1000;  // Default 'some' leeway: 3 minutes
  if (blockingLevel === 'fully') {
    thresholdMs = 0;                 // Fully block: show popup instantly
  } else if (blockingLevel === 'a_lot') {
    thresholdMs = 10 * 60 * 1000;    // A lot of leeway: 10 minutes
  }

  if (blockingLevel === 'fully' || timeSinceReset >= thresholdMs) {
    // Threshold reached or fully blocked = unproductive stimming
    await setActivityState(domain, ACTIVITY_STATE.UNPRODUCTIVE, {
      reason: 'past_grace_period_stimming',
      timeSinceReset,
      blockingLevel,
      thresholdMs
    });
    console.log(`[PLATFORM-DETECTION] ${domain}: Past threshold (${Math.round(timeSinceReset / 1000)}s / ${Math.round(thresholdMs / 1000)}s) [${blockingLevel}] = UNPRODUCTIVE`);
    return true;
  } else {
    // Still in grace period
    await setActivityState(domain, ACTIVITY_STATE.PRODUCTIVE, {
      reason: 'grace_period',
      timeSinceReset,
      blockingLevel,
      thresholdMs
    });
    console.log(`[PLATFORM-DETECTION] ${domain}: In grace period (${Math.round(timeSinceReset / 1000)}s / ${Math.round(thresholdMs / 1000)}s) [${blockingLevel}]`);
    return false;
  }
}

/**
 * Detect if user is posting/creating content (for social media)
 * This would be marking time as productive even past the 3-minute threshold
 * For now, we'll skip this and treat all time after 3 min as unproductive
 * @param {string} domain - Platform domain
 * @returns {Promise<boolean>} True if user is creating content
 */
export async function isUserCreatingContent(domain) {
  // Future: Check for specific URL patterns like /create, /compose, /post
  // For MVP, we're treating all social media time after 3 min as unproductive
  return false;
}

/**
 * Handle media pause state change (for YouTube)
 * @param {string} domain - Domain (youtube.com)
 * @param {boolean} isPaused - Is video paused
 * @returns {Promise<void>}
 */
export async function handleMediaPauseChange(domain, isPaused) {
  if (isPaused) {
    // Paused = no time accumulation
    await setActivityState(domain, ACTIVITY_STATE.PAUSED, {
      reason: 'user_paused_video'
    });
    console.log(`[PLATFORM-DETECTION] ${domain}: Video paused`);
  } else {
    // Playing = resume previous productive state
    const record = await getTimeTrackingRecord(domain);
    if (record.currentState === ACTIVITY_STATE.PAUSED) {
      await setActivityState(domain, ACTIVITY_STATE.PRODUCTIVE, {
        reason: 'resumed_from_pause'
      });
      console.log(`[PLATFORM-DETECTION] ${domain}: Video resumed from pause -> PRODUCTIVE`);
    }
  }
}

/**
 * Handle tab visibility change
 * @param {string} domain - Domain being tracked
 * @param {boolean} isVisible - Is tab currently visible
 * @returns {Promise<void>}
 */
export async function handleTabVisibilityChange(domain, isVisible) {
  if (!isVisible) {
    await setActivityState(domain, ACTIVITY_STATE.INACTIVE, {
      reason: 'tab_not_focused'
    });
    console.log(`[PLATFORM-DETECTION] ${domain}: Tab became inactive`);
  } else {
    const record = await getTimeTrackingRecord(domain);
    // Only resume if not paused
    if (record.currentState !== ACTIVITY_STATE.PAUSED) {
      await setActivityState(domain, ACTIVITY_STATE.PRODUCTIVE, {
        reason: 'tab_refocused'
      });
      console.log(`[PLATFORM-DETECTION] ${domain}: Tab refocused -> PRODUCTIVE`);
    }
  }
}
