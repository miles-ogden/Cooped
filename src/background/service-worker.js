/**
 * Background service worker for Cooped extension
 * Monitors tab navigation and detects when user visits blocked sites
 */

import { initializeStorage, getSettings } from '../utils/storage.js';
import { applyXpEvent } from '../logic/xpEngine.js';
import { getCurrentUser, initializeAuth } from '../logic/supabaseClient.js';
import { getSkipStatus, useHeart, isUserInSkipPeriod } from '../logic/skipSystem.js';

// Initialize storage and auth on extension install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Cooped: Extension installed');
  await initializeStorage();
  await initializeAuth();
});

// Initialize auth when service worker starts
(async () => {
  console.log('[SERVICE-WORKER] Starting service worker - initializing auth');
  await initializeAuth();
  console.log('[SERVICE-WORKER] Auth initialization complete');
})();

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
  console.log('[SERVICE-WORKER] Received message:', message);

  if (message.type === 'CHECK_BLOCKED_SITE') {
    // Content script is asking if its tab is blocked
    // Also check if user is in a skip period - if so, don't show interrupt even if blocked
    (async () => {
      try {
        const tabId = sender.tab.id;
        const blockedInfo = blockedTabs.get(tabId);

        if (!blockedInfo) {
          sendResponse({ isBlocked: false });
          return;
        }

        // Check if user has an active skip period
        const user = await getCurrentUser(true);
        if (user) {
          const skipCheck = await isUserInSkipPeriod(user.id);
          if (skipCheck.success && skipCheck.inSkip) {
            console.log(`[SKIP] User in skip period - blocking interrupt for 20 min (${skipCheck.minutesRemaining} min remaining)`);
            sendResponse({ isBlocked: false, skipActive: true, minutesRemaining: skipCheck.minutesRemaining });
            return;
          }
        }

        console.log('Cooped: Returning blocked site info for tab', tabId);
        sendResponse({ isBlocked: true, ...blockedInfo });
      } catch (err) {
        console.error('[SERVICE-WORKER] Error checking blocked site:', err);
        sendResponse({ isBlocked: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
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
  } else if (message.action === 'getSkipStatus') {
    // Content script requesting skip status
    handleGetSkipStatus(message.userId, sendResponse);
    return true; // Keep message channel open for async response
  } else if (message.action === 'useHeart') {
    // Content script requesting to use a heart
    handleUseHeart(message.userId, sendResponse);
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
    console.log('[SERVICE-WORKER] ===== XP EVENT HANDLER START =====');
    console.log('[SERVICE-WORKER] Event type:', eventType);
    console.log('[SERVICE-WORKER] Metadata:', metadata);

    // Get current user
    console.log('[SERVICE-WORKER] Calling getCurrentUser(true)...');
    const user = await getCurrentUser(true);
    console.log('[SERVICE-WORKER] getCurrentUser returned:', user);

    if (!user) {
      console.error('[SERVICE-WORKER] ❌ No authenticated user for XP event');
      console.error('[SERVICE-WORKER] User object is null/undefined');
      sendResponse({ success: false, error: 'User not authenticated' });
      return;
    }

    console.log('[SERVICE-WORKER] ✅ User authenticated:', user.id);

    // Apply the XP event
    console.log('[SERVICE-WORKER] Calling applyXpEvent with userId:', user.id, 'eventType:', eventType);
    const result = await applyXpEvent(user.id, eventType, metadata);
    console.log('[SERVICE-WORKER] applyXpEvent returned:', result);

    if (result && result.success !== false) {
      console.log('[SERVICE-WORKER] ✅ XP event applied successfully');
      console.log('[SERVICE-WORKER] Result:', result);
      sendResponse({ success: true, userId: user.id, result });

      // Notify popup of XP change so it can refresh the display
      console.log('[SERVICE-WORKER] Notifying popup of XP change...');
      notifyPopupOfXpChange(user.id, result);
    } else {
      console.error('[SERVICE-WORKER] ❌ Failed to apply XP event');
      console.error('[SERVICE-WORKER] Result:', result);
      sendResponse({ success: false, error: result?.error || 'Failed to apply XP event' });
    }
  } catch (err) {
    console.error('[SERVICE-WORKER] ❌ ERROR in handleApplyXpEvent:', err);
    console.error('[SERVICE-WORKER] Error message:', err.message);
    console.error('[SERVICE-WORKER] Error stack:', err.stack);
    sendResponse({ success: false, error: err.message });
  } finally {
    console.log('[SERVICE-WORKER] ===== XP EVENT HANDLER END =====');
  }
}

/**
 * Notify popup that XP has changed so it can refresh display
 */
function notifyPopupOfXpChange(userId, xpResult) {
  try {
    console.log('[SERVICE-WORKER] ===== NOTIFYING POPUP OF XP CHANGE =====');
    console.log('[SERVICE-WORKER] xpResult:', xpResult);

    // Extract data from xpEngine result
    const user = xpResult.user || {};
    const newXpTotal = user.xp_total || 0;
    const newLevel = user.level || 0;
    const newEggs = user.eggs || 0;
    const leveledUp = xpResult.leveledUp || false;
    const eggsGained = xpResult.eggsGained || 0;

    console.log('[SERVICE-WORKER] Extracted data:', {
      newXpTotal,
      newLevel,
      newEggs,
      leveledUp,
      eggsGained
    });

    console.log('[SERVICE-WORKER] Sending xpUpdated message to popup...');
    chrome.runtime.sendMessage({
      action: 'xpUpdated',
      userId: userId,
      newXpTotal,
      newLevel,
      newEggs,
      leveledUp,
      eggsGained
    }).then(() => {
      console.log('[SERVICE-WORKER] ✅ Successfully sent xpUpdated message to popup');
    }).catch((err) => {
      // Popup might not be open, that's fine
      console.log('[SERVICE-WORKER] ℹ️ Popup not open to receive XP update (this is normal):', err.message);
    });
  } catch (err) {
    console.error('[SERVICE-WORKER] ❌ Error in notifyPopupOfXpChange:', err);
    console.error('[SERVICE-WORKER] Error message:', err.message);
  }
}

/**
 * Handle get skip status request from content script
 */
async function handleGetSkipStatus(userId, sendResponse) {
  try {
    console.log('[SERVICE-WORKER] Getting skip status for user:', userId);
    const skipStatus = await getSkipStatus(userId);
    console.log('[SERVICE-WORKER] Skip status retrieved:', skipStatus);
    sendResponse(skipStatus);
  } catch (err) {
    console.error('[SERVICE-WORKER] Error getting skip status:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Handle use heart request from content script
 */
async function handleUseHeart(userId, sendResponse) {
  try {
    console.log('[SERVICE-WORKER] Using heart for user:', userId);
    const result = await useHeart(userId);

    if (result.success) {
      console.log('[SERVICE-WORKER] Heart used successfully, applying XP refund...');
      // Apply +50 XP refund for using skip (cancels out the -50 stim penalty)
      const xpRefundResult = await applyXpEvent(userId, 'skip_used');
      console.log('[SERVICE-WORKER] XP refund result:', xpRefundResult);

      // Include refund info in response
      result.xpRefund = xpRefundResult;
    }

    console.log('[SERVICE-WORKER] Heart used:', result);
    sendResponse(result);
  } catch (err) {
    console.error('[SERVICE-WORKER] Error using heart:', err);
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
