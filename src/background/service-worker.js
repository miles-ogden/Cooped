/**
 * Background service worker for Cooped extension
 * Monitors tab navigation and detects when user visits blocked sites
 */

import { initializeStorage, getSettings } from '../utils/storage.js';

// Initialize storage on extension install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Cooped: Extension installed');
  await initializeStorage();
});

/**
 * Check if URL matches any blocked site patterns
 * @param {string} url - URL to check
 * @param {string[]} blockedSites - Array of URL patterns
 * @returns {boolean}
 */
function isBlockedSite(url, blockedSites) {
  try {
    const urlObj = new URL(url);

    return blockedSites.some(pattern => {
      // Convert simple wildcard pattern to regex
      // *://www.facebook.com/* -> match facebook.com domain
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\./g, '\\.');

      const regex = new RegExp(regexPattern);
      return regex.test(url);
    });
  } catch (error) {
    // Invalid URL
    return false;
  }
}

/**
 * Store currently blocked tab info
 * Content scripts will query this
 */
const blockedTabs = new Map();

/**
 * Listen for tab updates (navigation)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Store the tab URL whenever it updates
  if (tab.url) {
    const settings = await getSettings();

    // Check if the URL is in the blocked list
    if (isBlockedSite(tab.url, settings.blockedSites)) {
      console.log('Cooped: Blocked site detected:', tab.url);

      // Store blocked site info for the content script to query
      blockedTabs.set(tabId, {
        url: tab.url,
        difficulty: settings.challengeDifficulty,
        enabledTypes: settings.enabledChallengeTypes
      });
    } else {
      // Clear if no longer blocked
      blockedTabs.delete(tabId);
    }
  }

  // Clean up when tab is closed
  if (changeInfo.status === 'undefined') {
    blockedTabs.delete(tabId);
  }
});

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_BLOCKED_SITE') {
    // Content script is asking if its tab is blocked
    const tabId = sender.tab.id;
    const blockedInfo = blockedTabs.get(tabId);

    if (blockedInfo) {
      console.log('Cooped: Returning blocked site info for tab', tabId);
      sendResponse({ isBlocked: true, ...blockedInfo });
    } else {
      sendResponse({ isBlocked: false });
    }
  } else if (message.type === 'CHALLENGE_COMPLETED') {
    handleChallengeCompleted(message.data, sender.tab);
    sendResponse({ success: true });
  } else if (message.type === 'CHALLENGE_FAILED') {
    handleChallengeFailed(message.data, sender.tab);
    sendResponse({ success: true });
  } else if (message.type === 'CHALLENGE_REVEALED') {
    handleChallengeRevealed(message.data, sender.tab);
    sendResponse({ success: true });
  } else if (message.type === 'GET_SETTINGS') {
    getSettings().then(settings => {
      sendResponse({ settings });
    });
    return true; // Keep message channel open for async response
  }
});

/**
 * Handle successful challenge completion
 * @param {Object} data - Challenge result data
 * @param {chrome.tabs.Tab} tab - Tab where challenge was completed
 */
async function handleChallengeCompleted(data, tab) {
  console.log('Cooped: Challenge completed successfully', data);

  // Session will be recorded by content script via storage utility
  // Here we could trigger badge updates, notifications, etc.

  // Update extension badge with current streak (future enhancement)
  // chrome.action.setBadgeText({ text: '🔥', tabId: tab.id });
}

/**
 * Handle failed challenge
 * @param {Object} data - Challenge result data
 * @param {chrome.tabs.Tab} tab - Tab where challenge failed
 */
async function handleChallengeFailed(data, tab) {
  console.log('Cooped: Challenge failed', data);

  // Redirect to a "blocked" page or previous page
  // For now, we'll just keep the overlay up (handled by content script)
}

/**
 * Handle challenge revealed (answer shown)
 * @param {Object} data - Challenge result data
 * @param {chrome.tabs.Tab} tab - Tab where challenge was revealed
 */
async function handleChallengeRevealed(data, tab) {
  console.log('Cooped: Challenge revealed', data);
  // Session already recorded by content script
}

/**
 * Listen for storage changes (for debugging)
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Cooped: Storage changed', changes);
  }
});

console.log('Cooped: Service worker loaded');
