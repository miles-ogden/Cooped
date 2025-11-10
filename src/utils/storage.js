/**
 * Storage utility functions for Chrome extension
 * Handles all interactions with chrome.storage API
 */

import { DEFAULT_STATE, STORAGE_KEYS } from '../types/types.js';

/**
 * Initialize storage with default state on first install
 */
export async function initializeStorage() {
  try {
    const existing = await chrome.storage.local.get(STORAGE_KEYS.APP_STATE);

    if (!existing[STORAGE_KEYS.APP_STATE]) {
      // First install - create default state with unique user ID
      const initialState = {
        ...DEFAULT_STATE,
        user: {
          ...DEFAULT_STATE.user,
          id: generateUserId()
        }
      };

      await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: initialState });
      console.log('Cooped: Storage initialized with default state');
      return initialState;
    }

    // Check if blocked sites contain old sites (Twitter, Reddit) and update if needed
    const currentState = existing[STORAGE_KEYS.APP_STATE];
    const hasOldSites = currentState.settings.blockedSites?.some(site =>
      site.includes('twitter.com') || site.includes('reddit.com')
    );

    if (hasOldSites) {
      console.log('Cooped: Detected old blocked sites, resetting to default');
      currentState.settings.blockedSites = DEFAULT_STATE.settings.blockedSites;
      await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: currentState });
    }

    return currentState;
  } catch (error) {
    console.error('Cooped: Error initializing storage:', error);
    throw error;
  }
}

/**
 * Get the current app state
 * @returns {Promise<AppState>}
 */
export async function getAppState() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.APP_STATE);
    return result[STORAGE_KEYS.APP_STATE] || DEFAULT_STATE;
  } catch (error) {
    console.error('Cooped: Error getting app state:', error);
    return DEFAULT_STATE;
  }
}

/**
 * Hard reset - completely clear all storage and reinitialize
 * Use this to fix any corrupted or outdated settings
 * @returns {Promise<AppState>}
 */
export async function hardResetStorage() {
  try {
    // Clear ALL storage
    await chrome.storage.local.clear();
    console.log('Cooped: All storage cleared');

    // Reinitialize with fresh defaults
    const initialState = {
      ...DEFAULT_STATE,
      user: {
        ...DEFAULT_STATE.user,
        id: generateUserId()
      }
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: initialState });
    console.log('Cooped: Storage reinitialized with default state');
    return initialState;
  } catch (error) {
    console.error('Cooped: Error during hard reset:', error);
    throw error;
  }
}

/**
 * Update app state
 * @param {Partial<AppState>} updates - Partial state to merge
 */
export async function updateAppState(updates) {
  try {
    const currentState = await getAppState();
    const newState = { ...currentState, ...updates };
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: newState });
    return newState;
  } catch (error) {
    console.error('Cooped: Error updating app state:', error);
    throw error;
  }
}

/**
 * Get user settings
 * @returns {Promise<Settings>}
 */
export async function getSettings() {
  const state = await getAppState();
  return state.settings;
}

/**
 * Update settings
 * @param {Partial<Settings>} newSettings
 */
export async function updateSettings(newSettings) {
  const state = await getAppState();
  state.settings = { ...state.settings, ...newSettings };
  await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
  return state.settings;
}

/**
 * Add a blocked site to the list
 * @param {string} urlPattern - URL pattern to block
 */
export async function addBlockedSite(urlPattern) {
  const state = await getAppState();
  if (!state.settings.blockedSites.includes(urlPattern)) {
    state.settings.blockedSites.push(urlPattern);
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
  }
  return state.settings.blockedSites;
}

/**
 * Remove a blocked site from the list
 * @param {string} urlPattern - URL pattern to unblock
 */
export async function removeBlockedSite(urlPattern) {
  const state = await getAppState();
  state.settings.blockedSites = state.settings.blockedSites.filter(
    site => site !== urlPattern
  );
  await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
  return state.settings.blockedSites;
}

/**
 * Record a new session
 * @param {Session} session
 */
export async function recordSession(session) {
  const state = await getAppState();

  // Keep only last 100 sessions to prevent storage bloat
  state.sessions = [session, ...state.sessions].slice(0, 100);

  // Update user stats
  if (session.success) {
    state.user.stats.challengesCompleted++;
    state.user.stats.experience += session.experienceGained;
    state.user.stats.level = calculateLevel(state.user.stats.experience);

    // Award points based on difficulty (10 points per XP gained)
    const pointsEarned = session.experienceGained * 10;
    state.user.stats.points += pointsEarned;

    // Update streak
    const today = new Date().setHours(0, 0, 0, 0);
    const lastActivity = new Date(state.user.stats.lastActivityDate).setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, streak continues
    } else if (daysDiff === 1) {
      // Next day, increment streak
      state.user.stats.currentStreak++;
      state.user.stats.longestStreak = Math.max(
        state.user.stats.longestStreak,
        state.user.stats.currentStreak
      );
    } else {
      // Streak broken
      state.user.stats.currentStreak = 1;
    }

    state.user.stats.lastActivityDate = Date.now();

    // Update mascot stage
    state.mascot.currentStage = calculateMascotStage(state.user.stats.experience);
  }

  state.user.stats.totalTimeBlocked += session.timeSpent;

  await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
  return state;
}

/**
 * Get recent sessions
 * @param {number} limit - Number of sessions to retrieve
 * @returns {Promise<Session[]>}
 */
export async function getRecentSessions(limit = 10) {
  const state = await getAppState();
  return state.sessions.slice(0, limit);
}

/**
 * Calculate user level based on experience
 * @param {number} experience
 * @returns {number}
 */
function calculateLevel(experience) {
  // Simple formula: level = floor(sqrt(xp / 50)) + 1
  return Math.floor(Math.sqrt(experience / 50)) + 1;
}

/**
 * Calculate mascot stage based on experience
 * @param {number} experience
 * @returns {number}
 */
function calculateMascotStage(experience) {
  if (experience >= 5000) return 4;
  if (experience >= 1500) return 3;
  if (experience >= 500) return 2;
  if (experience >= 100) return 1;
  return 0;
}

/**
 * Generate a unique user ID
 * @returns {string}
 */
function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export all data (for backup/migration)
 * @returns {Promise<AppState>}
 */
export async function exportData() {
  return await getAppState();
}

/**
 * Import data (for backup/migration)
 * @param {AppState} data
 */
export async function importData(data) {
  await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: data });
}

/**
 * Clear all data (reset)
 */
export async function clearAllData() {
  await chrome.storage.local.clear();
  return await initializeStorage();
}

/**
 * Save the current challenge in progress
 * Prevents users from bypassing challenges via page refresh
 * Uses a separate storage key to track in-progress challenges
 * @param {Object} challenge - Challenge object to save
 * @param {string} url - URL where challenge is displayed
 */
export async function saveCurrentChallenge(challenge, url) {
  try {
    const challengeData = {
      challenge,
      url,
      startTime: Date.now()
    };
    await chrome.storage.local.set({ 'cooped_current_challenge': challengeData });
    console.log('Cooped: Challenge saved to storage');
  } catch (error) {
    console.error('Cooped: Error saving challenge:', error);
  }
}

/**
 * Get the currently saved challenge (if any)
 * @returns {Promise<Object|null>}
 */
export async function getCurrentChallenge() {
  try {
    const result = await chrome.storage.local.get('cooped_current_challenge');
    return result.cooped_current_challenge || null;
  } catch (error) {
    console.error('Cooped: Error retrieving challenge:', error);
    return null;
  }
}

/**
 * Clear the saved challenge
 * Called after successful completion or when navigating away
 */
export async function clearCurrentChallenge() {
  try {
    await chrome.storage.local.remove('cooped_current_challenge');
    console.log('Cooped: Cleared saved challenge');
  } catch (error) {
    console.error('Cooped: Error clearing challenge:', error);
  }
}

/**
 * Save an interval timer for a specific site
 * Prevents the same site from being challenged again until the interval expires
 * @param {string} hostname - Domain name (e.g., 'youtube.com')
 * @param {number} intervalMinutes - Minutes to wait before showing challenge again
 */
export async function setSiteInterval(hostname, intervalMinutes) {
  try {
    const result = await chrome.storage.local.get('cooped_site_intervals');
    const intervals = result.cooped_site_intervals || {};

    const expiryTime = Date.now() + (intervalMinutes * 60 * 1000);
    intervals[hostname] = {
      hostname,
      intervalMinutes,
      expiryTime,
      startTime: Date.now()
    };

    await chrome.storage.local.set({ 'cooped_site_intervals': intervals });
    console.log(`Cooped: Set ${intervalMinutes} minute interval for ${hostname}`);
  } catch (error) {
    console.error('Cooped: Error setting site interval:', error);
  }
}

/**
 * Check if a site is currently in an interval (challenge cooldown)
 * @param {string} hostname - Domain name to check
 * @returns {Promise<{isActive: boolean, minutesRemaining: number}>}
 */
export async function checkSiteInterval(hostname) {
  try {
    const result = await chrome.storage.local.get('cooped_site_intervals');
    const intervals = result.cooped_site_intervals || {};
    const interval = intervals[hostname];

    if (!interval) {
      return { isActive: false, minutesRemaining: 0 };
    }

    const now = Date.now();
    if (now < interval.expiryTime) {
      const minutesRemaining = Math.ceil((interval.expiryTime - now) / (60 * 1000));
      return { isActive: true, minutesRemaining };
    } else {
      // Interval expired, clean it up
      delete intervals[hostname];
      await chrome.storage.local.set({ 'cooped_site_intervals': intervals });
      return { isActive: false, minutesRemaining: 0 };
    }
  } catch (error) {
    console.error('Cooped: Error checking site interval:', error);
    return { isActive: false, minutesRemaining: 0 };
  }
}

/**
 * Clear an interval timer for a specific site
 * @param {string} hostname - Domain name
 */
export async function clearSiteInterval(hostname) {
  try {
    const result = await chrome.storage.local.get('cooped_site_intervals');
    const intervals = result.cooped_site_intervals || {};

    delete intervals[hostname];
    await chrome.storage.local.set({ 'cooped_site_intervals': intervals });
    console.log(`Cooped: Cleared interval for ${hostname}`);
  } catch (error) {
    console.error('Cooped: Error clearing site interval:', error);
  }
}

/**
 * Get all active site intervals
 * @returns {Promise<Object>} Object with hostnames as keys and interval data as values
 */
export async function getAllSiteIntervals() {
  try {
    const result = await chrome.storage.local.get('cooped_site_intervals');
    return result.cooped_site_intervals || {};
  } catch (error) {
    console.error('Cooped: Error getting site intervals:', error);
    return {};
  }
}

/**
 * Add points to user account
 * @param {number} amount - Points to add (can be negative for penalties)
 * @returns {Promise<number>} New points total
 */
export async function addPoints(amount) {
  try {
    const state = await getAppState();
    state.user.stats.points += amount;
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
    console.log(`Cooped: Added ${amount} points. Total: ${state.user.stats.points}`);
    return state.user.stats.points;
  } catch (error) {
    console.error('Cooped: Error adding points:', error);
    return 0;
  }
}

/**
 * Add eggs to user account
 * @param {number} amount - Eggs to add (can be negative for purchases)
 * @returns {Promise<number>} New egg balance
 */
export async function addEggs(amount) {
  try {
    const state = await getAppState();
    state.user.stats.eggs = Math.max(0, state.user.stats.eggs + amount);
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
    console.log(`Cooped: Added ${amount} eggs. Total: ${state.user.stats.eggs}`);
    return state.user.stats.eggs;
  } catch (error) {
    console.error('Cooped: Error adding eggs:', error);
    return 0;
  }
}

/**
 * Get current points and eggs balance
 * @returns {Promise<{points: number, eggs: number}>}
 */
export async function getBalance() {
  try {
    const state = await getAppState();
    return {
      points: state.user.stats.points || 0,
      eggs: state.user.stats.eggs || 0
    };
  } catch (error) {
    console.error('Cooped: Error getting balance:', error);
    return { points: 0, eggs: 0 };
  }
}

/**
 * Calculate rank tier based on challenges answered
 * @param {number} challengesCompleted - Total challenges completed
 * @returns {string} Rank name
 */
export function calculateRank(challengesCompleted) {
  const { RANK_TIERS } = require('../types/types.js');
  let rank = 'Egg';
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (challengesCompleted >= RANK_TIERS[i].minChallenges) {
      rank = RANK_TIERS[i].name;
      break;
    }
  }
  return rank;
}

/**
 * Update user rank based on challenges completed
 * @returns {Promise<string>} New rank
 */
export async function updateRank() {
  try {
    const state = await getAppState();
    const newRank = calculateRank(state.user.stats.challengesCompleted);
    state.user.stats.rank = newRank;
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
    return newRank;
  } catch (error) {
    console.error('Cooped: Error updating rank:', error);
    return 'Egg';
  }
}

/**
 * Check and apply daily avoidance bonus (+150 points)
 * Only gives bonus once per calendar day
 * @returns {Promise<{bonusApplied: boolean, totalPoints: number}>}
 */
export async function checkDailyAvoidanceBonus() {
  try {
    const state = await getAppState();
    const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const lastDayChecked = state.user.stats.lastDayChecked || 0;

    if (today > lastDayChecked) {
      // New day! Award 150 points for avoiding sites
      state.user.stats.points += 150;
      state.user.stats.lastDayChecked = today;
      await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });
      console.log(`Cooped: Daily avoidance bonus awarded! (+150 points)`);
      return { bonusApplied: true, totalPoints: state.user.stats.points };
    }

    return { bonusApplied: false, totalPoints: state.user.stats.points };
  } catch (error) {
    console.error('Cooped: Error checking daily bonus:', error);
    return { bonusApplied: false, totalPoints: 0 };
  }
}

/**
 * Start time tracking session for a blocked site
 * Called when user skips challenge or stays on site after answering
 * @param {string} hostname - Domain name
 * @returns {Promise<{sessionId: string, startTime: number}>}
 */
export async function startTimeTrackingSession(hostname) {
  try {
    const sessionId = `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeSession = {
      sessionId,
      hostname,
      startTime: Date.now(),
      timeSpent: 0
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_TIME_SESSION]: timeSession });
    console.log(`Cooped: Started time tracking for ${hostname}`);
    return { sessionId, startTime: timeSession.startTime };
  } catch (error) {
    console.error('Cooped: Error starting time session:', error);
    return { sessionId: null, startTime: 0 };
  }
}

/**
 * End time tracking session and return minutes spent
 * @returns {Promise<{minutesSpent: number, pointsPenalty: number}>}
 */
export async function endTimeTrackingSession() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_TIME_SESSION);
    const timeSession = result[STORAGE_KEYS.ACTIVE_TIME_SESSION];

    if (!timeSession) {
      return { minutesSpent: 0, pointsPenalty: 0 };
    }

    const timeSpentMs = Date.now() - timeSession.startTime;
    const minutesSpent = Math.floor(timeSpentMs / (60 * 1000));
    const pointsPenalty = minutesSpent * 1; // -1 point per minute

    // Clean up the session
    await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_TIME_SESSION);

    console.log(`Cooped: Time tracking ended. ${minutesSpent} mins, -${pointsPenalty} pts`);
    return { minutesSpent, pointsPenalty };
  } catch (error) {
    console.error('Cooped: Error ending time session:', error);
    return { minutesSpent: 0, pointsPenalty: 0 };
  }
}

/**
 * Process challenge result and apply points
 * @param {boolean} correct - Whether answer was correct
 * @param {number} timeOnSite - Minutes spent on site (0 if no time tracked)
 * @returns {Promise<{pointsChange: number, newTotal: number}>}
 */
export async function processChallengeResult(correct, timeOnSite = 0) {
  try {
    let pointsChange = 0;

    if (correct) {
      pointsChange = -15; // Correct answer costs 15 points
    } else {
      pointsChange = -25; // Wrong answer costs 25 points
    }

    // Add time penalty (-1 per minute)
    pointsChange -= timeOnSite;

    const newPoints = await addPoints(pointsChange);
    console.log(`Cooped: Challenge result - ${pointsChange} points. Total: ${newPoints}`);

    return { pointsChange, newTotal: newPoints };
  } catch (error) {
    console.error('Cooped: Error processing challenge result:', error);
    return { pointsChange: 0, newTotal: 0 };
  }
}

/**
 * Update streak based on challenge result
 * Streak survives if: answer correct AND time on site < 5 minutes
 * Otherwise: streak breaks (resets to 0)
 * Streak shows 🔥 emoji after 2+ consecutive days
 * @param {boolean} correct - Whether answer was correct
 * @param {number} timeOnSite - Minutes spent on site
 * @returns {Promise<{streakDays: number, streakAlive: boolean, fireEmoji: string}>}
 */
export async function updateStreak(correct, timeOnSite = 0) {
  try {
    const state = await getAppState();
    const streakSurvives = correct && timeOnSite < 5;

    if (streakSurvives) {
      // Increment streak
      state.user.stats.currentStreak++;
      state.user.stats.longestStreak = Math.max(
        state.user.stats.longestStreak,
        state.user.stats.currentStreak
      );
    } else {
      // Break streak
      state.user.stats.currentStreak = 0;
    }

    state.user.stats.lastActivityDate = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_STATE]: state });

    // Show fire emoji if streak >= 2
    const fireEmoji = state.user.stats.currentStreak >= 2 ? '🔥' : '';

    console.log(
      `Cooped: Streak updated. Days: ${state.user.stats.currentStreak} ${fireEmoji}`
    );

    return {
      streakDays: state.user.stats.currentStreak,
      streakAlive: streakSurvives,
      fireEmoji
    };
  } catch (error) {
    console.error('Cooped: Error updating streak:', error);
    return { streakDays: 0, streakAlive: false, fireEmoji: '' };
  }
}

/**
 * Apply skip penalty (costs 1 egg)
 * @returns {Promise<{eggsCost: number, newBalance: number}>}
 */
export async function applySkipPenalty() {
  try {
    const newBalance = await addEggs(-1);
    console.log(`Cooped: Skip penalty applied. -1 egg. New balance: ${newBalance}`);
    return { eggsCost: 1, newBalance };
  } catch (error) {
    console.error('Cooped: Error applying skip penalty:', error);
    return { eggsCost: 1, newBalance: 0 };
  }
}

/**
 * Set a "Do Not Bother Me" timer across all tabs
 * Prevents challenges from showing until timer expires
 * @param {number} minutes - Duration in minutes
 * @returns {Promise<{enabled: boolean, expiryTime: number, minutesRemaining: number}>}
 */
export async function setDoNotBotherMe(minutes) {
  try {
    const expiryTime = Date.now() + (minutes * 60 * 1000);
    const timerData = {
      enabled: true,
      startTime: Date.now(),
      expiryTime,
      minutes,
      originalMinutes: minutes
    };

    await chrome.storage.local.set({ 'cooped_do_not_bother_me': timerData });
    console.log(`Cooped: Do Not Bother Me timer set for ${minutes} minutes`);
    return {
      enabled: true,
      expiryTime,
      minutesRemaining: minutes
    };
  } catch (error) {
    console.error('Cooped: Error setting do not bother me timer:', error);
    return { enabled: false, expiryTime: 0, minutesRemaining: 0 };
  }
}

/**
 * Check if "Do Not Bother Me" timer is active
 * @returns {Promise<{active: boolean, minutesRemaining: number, expiryTime: number}>}
 */
export async function checkDoNotBotherMe() {
  try {
    const result = await chrome.storage.local.get('cooped_do_not_bother_me');
    const timerData = result.cooped_do_not_bother_me;

    if (!timerData || !timerData.enabled) {
      return { active: false, minutesRemaining: 0, expiryTime: 0 };
    }

    const now = Date.now();
    if (now < timerData.expiryTime) {
      const minutesRemaining = Math.ceil((timerData.expiryTime - now) / (60 * 1000));
      return {
        active: true,
        minutesRemaining,
        expiryTime: timerData.expiryTime
      };
    } else {
      // Timer expired, clean it up
      await chrome.storage.local.remove('cooped_do_not_bother_me');
      return { active: false, minutesRemaining: 0, expiryTime: 0 };
    }
  } catch (error) {
    console.error('Cooped: Error checking do not bother me timer:', error);
    return { active: false, minutesRemaining: 0, expiryTime: 0 };
  }
}

/**
 * Disable the "Do Not Bother Me" timer early
 * @returns {Promise<boolean>}
 */
export async function disableDoNotBotherMe() {
  try {
    await chrome.storage.local.remove('cooped_do_not_bother_me');
    console.log('Cooped: Do Not Bother Me timer disabled');
    return true;
  } catch (error) {
    console.error('Cooped: Error disabling do not bother me timer:', error);
    return false;
  }
}

/**
 * Track YouTube video activity for productivity analysis
 * Records pause/play events and URL changes
 * @param {Object} activity - Activity object {type, timestamp, videoId, videoDuration, currentTime}
 * @returns {Promise<boolean>}
 */
export async function recordYouTubeActivity(activity) {
  try {
    const result = await chrome.storage.local.get('cooped_youtube_activity');
    const activities = result.cooped_youtube_activity || [];

    // Keep last 100 activities
    activities.push({
      ...activity,
      timestamp: Date.now(),
      recordedAt: new Date().toISOString()
    });

    const trimmed = activities.slice(-100);
    await chrome.storage.local.set({ 'cooped_youtube_activity': trimmed });

    return true;
  } catch (error) {
    console.error('Cooped: Error recording YouTube activity:', error);
    return false;
  }
}

/**
 * Analyze YouTube activity for productivity patterns
 * @returns {Promise<{isProductiveMode: boolean, analysisDetails: Object}>}
 */
export async function analyzeYouTubeActivity() {
  try {
    const result = await chrome.storage.local.get('cooped_youtube_activity');
    const activities = result.cooped_youtube_activity || [];

    if (activities.length === 0) {
      return { isProductiveMode: true, analysisDetails: { reason: 'No activity recorded' } };
    }

    // Get last 10 minutes of activity
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentActivities = activities.filter(a => a.timestamp > tenMinutesAgo);

    if (recentActivities.length === 0) {
      return { isProductiveMode: true, analysisDetails: { reason: 'No recent activity' } };
    }

    // Analyze patterns
    const videoChanges = recentActivities.filter(a => a.type === 'url_change').length;
    const pauseEvents = recentActivities.filter(a => a.type === 'pause').length;
    const playEvents = recentActivities.filter(a => a.type === 'play').length;

    // Get current video info from the last activity
    const lastActivity = recentActivities[recentActivities.length - 1];
    const watchTimeSeconds = (lastActivity.currentTime || 0) - (recentActivities[0].currentTime || 0);
    const watchTimeMinutes = Math.max(0, watchTimeSeconds / 60);

    // Detect stimming pattern: Rapid URL changes (short-form content)
    const shortFormIndicator = videoChanges > 8; // More than 8 video changes in 10 min = stimming

    // Detect productive pattern: Long video watch with pauses (implementing learnings)
    const productiveIndicator = watchTimeMinutes > 4 && pauseEvents > 0; // Watching + pausing = productive

    const analysisDetails = {
      videoChangesLast10Min: videoChanges,
      pauseEventsLast10Min: pauseEvents,
      playEventsLast10Min: playEvents,
      watchTimeMinutes: Math.round(watchTimeMinutes),
      shortFormIndicator,
      productiveIndicator,
      lastVideoDuration: lastActivity.videoDuration || 0
    };

    // If short-form pattern detected OR watch time > 7 min without pauses = not productive
    const isProductiveMode = !shortFormIndicator && (watchTimeMinutes < 7 || pauseEvents > 0);

    return { isProductiveMode, analysisDetails };
  } catch (error) {
    console.error('Cooped: Error analyzing YouTube activity:', error);
    return { isProductiveMode: true, analysisDetails: { error: error.message } };
  }
}

/**
 * Check if video has been playing for too long without pauses (7+ minutes)
 * @returns {Promise<{tooLongUnpaused: boolean, watchTimeMinutes: number}>}
 */
export async function checkLongUnpausedWatch() {
  try {
    const result = await chrome.storage.local.get('cooped_youtube_activity');
    const activities = result.cooped_youtube_activity || [];

    if (activities.length === 0) {
      return { tooLongUnpaused: false, watchTimeMinutes: 0 };
    }

    // Get all activities for current video (same videoId)
    const lastActivity = activities[activities.length - 1];
    const currentVideoId = lastActivity.videoId;
    const currentVideoActivities = activities.filter(a => a.videoId === currentVideoId);

    if (currentVideoActivities.length === 0) {
      return { tooLongUnpaused: false, watchTimeMinutes: 0 };
    }

    // Find if there's been any pause event
    const hasPauseEvent = currentVideoActivities.some(a => a.type === 'pause');

    // Calculate continuous watch time from last pause (or start)
    let watchStartIndex = currentVideoActivities.length - 1;
    for (let i = currentVideoActivities.length - 1; i >= 0; i--) {
      if (currentVideoActivities[i].type === 'pause') {
        watchStartIndex = i;
        break;
      }
    }

    const watchStartTime = currentVideoActivities[watchStartIndex].timestamp;
    const watchTimeMs = Date.now() - watchStartTime;
    const watchTimeMinutes = watchTimeMs / (60 * 1000);

    // Trigger if watching 7+ minutes without pausing
    const tooLongUnpaused = watchTimeMinutes >= 7 && !hasPauseEvent;

    return { tooLongUnpaused, watchTimeMinutes: Math.round(watchTimeMinutes) };
  } catch (error) {
    console.error('Cooped: Error checking long unpaused watch:', error);
    return { tooLongUnpaused: false, watchTimeMinutes: 0 };
  }
}
