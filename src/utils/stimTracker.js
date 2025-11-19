/**
 * Stim Tracker Module (Simplified)
 * Tracks time on social media platforms and YouTube Shorts
 * Records stim events to Supabase and calculates XP penalties
 *
 * RULES:
 * - YouTube Shorts: 8+ shorts in 7 min = 50 XP penalty at wall
 * - Social Media (TikTok, Instagram, Facebook): 3 min active per hour = 50 XP penalty at wall
 * - Active = tab open + (video playing OR clicking/scrolling detected)
 * - Challenge: Answer = +40 XP (net -10 after wall penalty), Continue = -10 XP per 2 min
 * - Skip: 0 XP cost + 20 min cooldown
 */

import { queryInsert } from '../logic/supabaseClient.js';
import { getCurrentUser } from '../logic/supabaseClient.js';

/**
 * Penalty structure
 */
const PENALTIES = {
  SOCIAL_MEDIA_WALL: {
    name: 'Social Media Wall',
    initialPenalty: 50,      // XP penalty when wall appears
    continuePenaltyPerTwoMin: 10  // XP per 2 minutes after wall
  },
  YOUTUBE_SHORTS_WALL: {
    name: 'YouTube Shorts Wall',
    initialPenalty: 50,
    continuePenaltyPerTwoMin: 10
  }
};

/**
 * Social media platforms to track
 */
const SOCIAL_MEDIA_DOMAINS = ['tiktok.com', 'instagram.com', 'facebook.com'];

/**
 * In-memory tracking for current session
 */
let stimSessionTracking = {
  youtubeShorts: [],    // Array of {timestamp} for shorts viewed
  domains: {}           // Per-domain tracking
};

/**
 * Initialize tracking for a domain
 */
export function initializeDomainTracking(domain) {
  if (!stimSessionTracking.domains[domain]) {
    stimSessionTracking.domains[domain] = {
      domain,
      sessionStartTime: Date.now(),
      lastActivityTime: Date.now(),
      isActive: true,
      wallTriggered: false,
      wallTriggerTime: null,
      totalActiveTime: 0,        // Milliseconds of active time
      continuedAfterWall: false,
      timeAfterWall: 0           // Milliseconds spent after wall appeared
    };
    console.log(`[STIM_TRACKER] Initialized tracking for ${domain}`);
  }
  return stimSessionTracking.domains[domain];
}

/**
 * Record YouTube Shorts view
 * @returns {Object} - { shouldTriggerWall: boolean }
 */
export function recordYoutubeShort() {
  const domain = 'youtube.com';
  initializeDomainTracking(domain);

  stimSessionTracking.youtubeShorts.push({
    timestamp: Date.now()
  });

  const shortsInWindow = getYoutubeShortsInWindow();

  console.log(`[STIM_TRACKER] YouTube Short recorded. Total in 7 min: ${shortsInWindow}`);

  // Check if 8+ shorts in 7 minutes
  if (shortsInWindow >= 8) {
    return { shouldTriggerWall: true, reason: 'YouTube Shorts binge (8+ in 7 min)' };
  }

  return { shouldTriggerWall: false };
}

/**
 * Record activity on social media or YouTube long-form
 * Call this when detecting: scrolling, clicking, or video playing
 * @returns {Object} - { shouldTriggerWall: boolean }
 */
export function recordSocialMediaActivity(domain) {
  const tracking = initializeDomainTracking(domain);

  // Update last activity time
  const now = Date.now();
  const timeSinceLastActivity = now - tracking.lastActivityTime;

  // Accumulate active time if session is continuous (within 2 seconds of last activity)
  if (timeSinceLastActivity < 2000) {
    tracking.totalActiveTime += timeSinceLastActivity;
  } else {
    // Reset active time if gap detected
    tracking.totalActiveTime = 0;
  }

  tracking.lastActivityTime = now;

  // Check if this is a social media domain
  const isSocialMedia = SOCIAL_MEDIA_DOMAINS.some(d => domain.includes(d));

  if (isSocialMedia) {
    // Social media: 3 minutes per hour = 180,000 milliseconds
    const threeMinutes = 3 * 60 * 1000;

    if (tracking.totalActiveTime >= threeMinutes && !tracking.wallTriggered) {
      tracking.wallTriggered = true;
      tracking.wallTriggerTime = now;
      console.log(`[STIM_TRACKER] Social media wall triggered for ${domain}`);
      return { shouldTriggerWall: true, reason: `${domain}: 3 minutes active` };
    }
  }

  return { shouldTriggerWall: false };
}

/**
 * Get number of YouTube Shorts watched in the last 7 minutes
 */
function getYoutubeShortsInWindow() {
  const now = Date.now();
  const sevenMinutes = 7 * 60 * 1000;

  return stimSessionTracking.youtubeShorts.filter(
    s => (now - s.timestamp) < sevenMinutes
  ).length;
}

/**
 * Handle challenge completion - user answered challenge
 * Returns: +50 XP (break even on the initial penalty)
 */
export function handleChallengeCompleted(domain) {
  const tracking = stimSessionTracking.domains[domain];
  if (tracking) {
    tracking.wallTriggered = false;  // Reset wall for next cycle
    tracking.totalActiveTime = 0;    // Reset timer
    tracking.continuedAfterWall = false;
    tracking.timeAfterWall = 0;
    console.log(`[STIM_TRACKER] Challenge completed for ${domain}`);
  }

  return { xpReward: 50, message: 'Challenge completed! You get back +50 XP' };
}

/**
 * Handle skip - user used skip
 * Returns: 0 XP cost, but sets 20 min cooldown
 */
export function handleSkip(domain) {
  const tracking = stimSessionTracking.domains[domain];
  if (tracking) {
    // Note: The actual 20-min cooldown is handled by the interval system in service-worker.js
    console.log(`[STIM_TRACKER] Skip used for ${domain}`);
  }

  return { xpCost: 0, cooldownMinutes: 20, message: 'Skip used! No XP cost.' };
}

/**
 * User continued after wall appeared
 * Call this periodically (e.g., every 2 minutes) to track continued usage
 * Returns: { xpPenalty, totalPenalty }
 */
export function calculateContinuedUsagePenalty(domain) {
  const tracking = stimSessionTracking.domains[domain];

  if (!tracking || !tracking.wallTriggered) {
    return { xpPenalty: 0, totalPenalty: 0 };
  }

  const now = Date.now();
  const timeAfterWall = now - tracking.wallTriggerTime;
  const twoMinutes = 2 * 60 * 1000;

  // Calculate penalty: -10 XP per 2 minutes
  const twoMinutePeriods = Math.floor(timeAfterWall / twoMinutes);
  const xpPenalty = twoMinutePeriods * 10;

  // Total penalty = initial 50 + continued penalty
  const totalPenalty = PENALTIES.SOCIAL_MEDIA_WALL.initialPenalty + xpPenalty;

  if (xpPenalty > 0) {
    console.log(
      `[STIM_TRACKER] Continued usage penalty for ${domain}: ` +
      `-${xpPenalty} XP (${twoMinutePeriods} × 2min periods). Total: -${totalPenalty} XP`
    );
  }

  return {
    xpPenalty,
    totalPenalty,
    periods: twoMinutePeriods,
    message: `${twoMinutePeriods} periods of 2 min = -${xpPenalty} XP`
  };
}

/**
 * Record a stim event to Supabase
 * Call this when a wall is triggered or user leaves site
 */
export async function recordStimEvent(url, blocked = false, skipped = false) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[STIM_TRACKER] No authenticated user, cannot record stim event');
      return null;
    }

    const domain = new URL(url).hostname;
    const tracking = stimSessionTracking.domains[domain];

    const stimEvent = {
      user_id: user.id,
      url,
      started_at: new Date(tracking?.sessionStartTime || Date.now()).toISOString(),
      ended_at: new Date().toISOString(),
      blocked,
      skip_used: skipped,
      created_at: new Date().toISOString()
    };

    console.log('[STIM_TRACKER] Recording stim event to Supabase:', stimEvent);

    const result = await queryInsert('stim_events', [stimEvent]);
    return result[0] || result;
  } catch (err) {
    console.error('[STIM_TRACKER] Error recording stim event:', err);
    return null;
  }
}

/**
 * Get tracking status for a domain
 */
export function getTrackingStatus(domain) {
  const tracking = stimSessionTracking.domains[domain];

  if (!tracking) {
    return {
      domain,
      tracked: false,
      message: 'Not tracking this domain'
    };
  }

  const now = Date.now();
  const sessionDuration = now - tracking.sessionStartTime;
  const activeTime = tracking.totalActiveTime;
  const activePercent = sessionDuration > 0 ? Math.round((activeTime / sessionDuration) * 100) : 0;

  return {
    domain,
    tracked: true,
    sessionStartTime: new Date(tracking.sessionStartTime).toLocaleTimeString(),
    totalSessionDuration: `${Math.round(sessionDuration / 1000)}s`,
    totalActiveTime: `${Math.round(activeTime / 1000)}s`,
    activePercentage: `${activePercent}%`,
    wallTriggered: tracking.wallTriggered,
    wallTriggerTime: tracking.wallTriggered ? new Date(tracking.wallTriggerTime).toLocaleTimeString() : 'N/A'
  };
}

/**
 * Reset tracking for a domain (call after challenge/skip)
 */
export function resetDomainTracking(domain) {
  delete stimSessionTracking.domains[domain];
  console.log(`[STIM_TRACKER] Reset tracking for ${domain}`);
}

/**
 * Clear all tracking (call on logout)
 */
export function clearAllTracking() {
  stimSessionTracking = {
    youtubeShorts: [],
    domains: {}
  };
  console.log('[STIM_TRACKER] Cleared all tracking data');
}

/**
 * Get comprehensive report of all tracked domains
 */
export function getFullReport() {
  const now = Date.now();
  const report = {
    timestamp: new Date().toISOString(),
    youtubeShortsInWindow: getYoutubeShortsInWindow(),
    trackedDomains: {}
  };

  for (const [domain, tracking] of Object.entries(stimSessionTracking.domains)) {
    report.trackedDomains[domain] = getTrackingStatus(domain);
  }

  return report;
}

console.log('[STIM_TRACKER] Module loaded - Simplified tracking system');
