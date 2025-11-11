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

const THREE_MINUTES_MS = 3 * 60 * 1000;
const SEVEN_MINUTES_MS = 7 * 60 * 1000;

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
 * 7+ shorts in 7 minutes = unproductive (stimming)
 * @param {number} shortsCount - Number of shorts scrolled in time window
 * @param {string} timeWindow - Time window being checked (e.g., "7 minutes")
 * @returns {Promise<void>}
 */
export async function handleYouTubeShortsDetection(shortsCount, timeWindow = '7 minutes') {
  const domain = 'youtube.com';

  if (shortsCount >= 8) {
    // 8+ shorts in 7 minutes = unproductive stimming
    await setActivityState(domain, ACTIVITY_STATE.UNPRODUCTIVE, {
      reason: 'shorts_stimming',
      shortsScrolledInTimeWindow: shortsCount
    });
    console.log(`[PLATFORM-DETECTION] YouTube Shorts: ${shortsCount} shorts in ${timeWindow} = UNPRODUCTIVE stimming`);
    return true;
  } else {
    // Less than 8 shorts = productive viewing
    await setActivityState(domain, ACTIVITY_STATE.PRODUCTIVE, {
      reason: 'shorts_browsing',
      shortsScrolledInTimeWindow: shortsCount
    });
    console.log(`[PLATFORM-DETECTION] YouTube Shorts: ${shortsCount} shorts in ${timeWindow} = PRODUCTIVE`);
    return false;
  }
}

/**
 * Handle YouTube long-form video productivity detection
 * Requires user confirmation (popup asking "are you being productive?")
 * @param {number} watchTimeMinutes - Minutes watched without pause
 * @returns {Promise<void>}
 */
export async function handleYouTubeLongFormDetection(watchTimeMinutes) {
  const domain = 'youtube.com';

  if (watchTimeMinutes >= 7) {
    // 7+ minutes unpaused = transition to UNKNOWN state, waiting for user response
    const record = await getTimeTrackingRecord(domain);

    if (record.currentState !== ACTIVITY_STATE.UNKNOWN) {
      await setActivityState(domain, ACTIVITY_STATE.UNKNOWN, {
        reason: 'long_watch_unpaused',
        watchTimeMinutes
      });
      console.log(`[PLATFORM-DETECTION] YouTube: ${watchTimeMinutes}min unpaused watch -> showing productivity prompt`);
      return true; // Signal that we should show the productivity prompt
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
 * First 3 minutes = always productive (grace period)
 * After 3 minutes = unproductive (stimming)
 * Resets every 2 hours (real-world time)
 * @param {string} domain - Platform domain (tiktok.com, facebook.com, x.com)
 * @returns {Promise<boolean>} True if unproductive stimming detected
 */
export async function handleSocialMediaStimmingDetection(domain) {
  // Check if 2-hour reset should trigger
  await shouldResetSocialMediaTimer(domain);

  // Get time since last reset
  const timeSinceReset = await getTimeSinceSocialMediaReset(domain);

  if (timeSinceReset < THREE_MINUTES_MS) {
    // Still in grace period (first 3 minutes)
    await setActivityState(domain, ACTIVITY_STATE.PRODUCTIVE, {
      reason: 'grace_period',
      timeSinceReset
    });
    console.log(`[PLATFORM-DETECTION] ${domain}: In grace period (${Math.round(timeSinceReset / 1000)}s / 180s)`);
    return false;
  } else {
    // Past 3 minutes = unproductive stimming
    await setActivityState(domain, ACTIVITY_STATE.UNPRODUCTIVE, {
      reason: 'past_grace_period_stimming',
      timeSinceReset
    });
    console.log(`[PLATFORM-DETECTION] ${domain}: Past grace period (${Math.round(timeSinceReset / 1000)}s) = UNPRODUCTIVE`);
    return true;
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
