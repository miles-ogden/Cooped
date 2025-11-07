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

    return existing[STORAGE_KEYS.APP_STATE];
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
