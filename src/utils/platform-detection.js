/**
 * Platform-specific detection logic for time tracking
 * Handles YouTube, Shorts, TikTok, Facebook, and X
 * Simply tracks time - no productivity judgments
 */

import {
  updateTabVisibility,
  updateMediaPauseState,
  ACTIVITY_STATE,
  accumulateTime,
  getTimeTrackingRecord,
  shouldResetSocialMediaTimer,
  getTimeSinceSocialMediaReset
} from './time-tracking.js';

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
 * Handle tab visibility change
 * @param {string} domain - Domain being tracked
 * @param {boolean} isVisible - Is tab currently visible
 * @returns {Promise<void>}
 */
export async function handleTabVisibilityChange(domain, isVisible) {
  if (!isVisible) {
    await updateTabVisibility(domain, false);
    console.log(`[PLATFORM-DETECTION] ${domain}: Tab became inactive`);
  } else {
    await updateTabVisibility(domain, true);
    console.log(`[PLATFORM-DETECTION] ${domain}: Tab became active`);
  }
}

/**
 * Handle media pause state change (for YouTube)
 * @param {string} domain - Domain (youtube.com)
 * @param {boolean} isPaused - Is video paused
 * @returns {Promise<void>}
 */
export async function handleMediaPauseChange(domain, isPaused) {
  if (isPaused) {
    console.log(`[PLATFORM-DETECTION] ${domain}: Video paused`);
  } else {
    console.log(`[PLATFORM-DETECTION] ${domain}: Video resumed`);
  }
}

/**
 * Record user activity on blocked site
 * Simply tracks that activity happened, for blocking level thresholds
 * @param {string} domain - Domain name
 * @param {string} blockingLevel - 'fully', 'some', or 'a_lot'
 * @returns {Object} - { shouldTriggerWall: boolean }
 */
export async function recordSiteActivity(domain, blockingLevel = 'some') {
  // This is now just for triggering walls based on blocking level
  // No productivity judgments
  return { shouldTriggerWall: false };
}
