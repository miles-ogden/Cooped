/**
 * Background service worker for Cooped extension
 * Monitors tab navigation and detects when user visits blocked sites
 */

import { initializeStorage, getSettings } from '../utils/storage.js';
import { applyXpEvent } from '../logic/xpEngine.js';
import { getCurrentUser } from '../logic/supabaseClient.js';

// Initialize storage on extension install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Cooped: Extension installed');
  await initializeStorage();
});

/**
 * Check if URL matches any blocked site patterns
 * STRICTLY only blocks the exact domains specified
 * @param {string} url - URL to check
 * @param {string[]} blockedSites - Array of URL patterns
 * @returns {boolean}
 */
function isBlockedSite(url, blockedSites) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    return blockedSites.some(pattern => {
      // Extract domain from pattern like *://www.youtube.com/*
      // Remove protocol: *:// -> ""
      let domain = pattern.replace(/^\*:\/\//, '');
      // Remove trailing path: /* -> ""
      domain = domain.replace(/\/\*$/, '');
      // Remove www. prefix if present: www.youtube.com -> youtube.com
      domain = domain.replace(/^www\./, '');
      domain = domain.toLowerCase();

      // STRICT matching: only match if hostname is exactly the domain or subdomain of it
      // Examples:
      // - youtube.com matches youtube.com, www.youtube.com, m.youtube.com
      // - instagram.com matches instagram.com, www.instagram.com
      // - Does NOT match google.com, facebook-cdn.com, etc.

      if (hostname === domain) {
        return true; // Exact match
      }

      // Check if hostname is a subdomain of the blocked domain
      if (hostname.endsWith('.' + domain)) {
        return true; // Subdomain match
      }

      return false;
    });
  } catch (error) {
    // Invalid URL
    console.log('Cooped: Invalid URL:', url, error);
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
    // First check if extension is enabled
    const extensionStateResult = await chrome.storage.local.get(['extensionEnabled']);
    const isExtensionEnabled = extensionStateResult.extensionEnabled !== false;

    const settings = await getSettings();

    // Check if the URL is in the blocked list
    const isBlocked = isBlockedSite(tab.url, settings.blockedSites);

    // Debug logging
    const urlObj = new URL(tab.url);
    console.log(`Cooped: URL check - hostname: ${urlObj.hostname}, blocked: ${isBlocked}, enabled: ${isExtensionEnabled}, blockedSites: ${JSON.stringify(settings.blockedSites)}`);

    // Only store blocked site if extension is enabled
    if (isBlocked && isExtensionEnabled) {
      console.log('Cooped: Blocked site detected (extension enabled):', tab.url);

      // Store blocked site info for the content script to query
      blockedTabs.set(tabId, {
        url: tab.url,
        difficulty: settings.challengeDifficulty,
        enabledTypes: settings.enabledChallengeTypes
      });
    } else {
      // Clear if no longer blocked or extension is disabled
      blockedTabs.delete(tabId);
    }
  }

  // Clean up when tab is closed
  if (changeInfo.status === 'undefined') {
    blockedTabs.delete(tabId);
  }
});

/**
 * Listen for web navigation events to intercept email verification callbacks
 */
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // If user is trying to navigate to the auth callback URL
  if (details.url.includes('auth-callback.html')) {
    console.log('[SERVICE-WORKER] Intercepting auth callback navigation:', details.url);
    // Extract hash/query params from the URL
    const url = new URL(details.url);
    const params = url.hash || url.search;

    // Store in session storage for the popup to retrieve
    chrome.storage.session.set({
      auth_callback_params: params
    });
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
  } else if (message.action === 'showInterruptSequence') {
    // Popup is requesting to show interrupt sequence
    console.log('[SERVICE-WORKER] Relay showInterruptSequence to all tabs');
    // Get all tabs and send message to each
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.url.startsWith('chrome-extension')) {
          console.log('[SERVICE-WORKER] Sending to tab:', tab.id, tab.url);
          chrome.tabs.sendMessage(tab.id, {
            action: 'showInterruptSequence'
          }).catch(err => {
            console.log('[SERVICE-WORKER] Could not send to tab', tab.id, ':', err.message);
          });
        }
      });
    });
    sendResponse({ success: true });
  } else if (message.action === 'closeTab') {
    // User clicked "Return to Safety" - close the current tab
    console.log('[SERVICE-WORKER] Closing tab:', sender.tab.id);
    chrome.tabs.remove(sender.tab.id, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  } else if (message.action === 'applyXpEvent') {
    // Content script is requesting XP application
    handleApplyXpEvent(message.eventType, message.metadata, sendResponse);
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
 * Handle XP event application requested by content script
 */
async function handleApplyXpEvent(eventType, metadata = {}, sendResponse) {
  try {
    console.log('[SERVICE-WORKER] Applying XP event:', eventType, metadata);

    // Get current user
    const user = await getCurrentUser(true);
    if (!user) {
      console.error('[SERVICE-WORKER] No authenticated user for XP event');
      sendResponse({ success: false, error: 'User not authenticated' });
      return;
    }

    // Apply the XP event
    const result = await applyXpEvent(user.id, eventType, metadata);

    if (result && result.success !== false) {
      console.log('[SERVICE-WORKER] XP event applied successfully:', result);
      sendResponse({ success: true, userId: user.id, result });
    } else {
      console.error('[SERVICE-WORKER] Failed to apply XP event:', result);
      sendResponse({ success: false, error: result?.error || 'Failed to apply XP event' });
    }
  } catch (err) {
    console.error('[SERVICE-WORKER] Error applying XP event:', err);
    sendResponse({ success: false, error: err.message });
  }
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
