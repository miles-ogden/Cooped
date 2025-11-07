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
 * Listen for tab updates (navigation)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when page starts loading
  if (changeInfo.status === 'loading' && tab.url) {
    const settings = await getSettings();

    // Check if the URL is in the blocked list
    if (isBlockedSite(tab.url, settings.blockedSites)) {
      console.log('Cooped: Blocked site detected:', tab.url);

      // Send message to content script to show challenge
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_CHALLENGE',
          url: tab.url,
          difficulty: settings.challengeDifficulty,
          enabledTypes: settings.enabledChallengeTypes
        });
      } catch (error) {
        console.error('Cooped: Error sending message to content script:', error);
      }
    }
  }
});

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHALLENGE_COMPLETED') {
    handleChallengeCompleted(message.data, sender.tab);
    sendResponse({ success: true });
  } else if (message.type === 'CHALLENGE_FAILED') {
    handleChallengeFailed(message.data, sender.tab);
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
 * Listen for storage changes (for debugging)
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Cooped: Storage changed', changes);
  }
});

console.log('Cooped: Service worker loaded');
