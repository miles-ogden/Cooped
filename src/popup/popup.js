/**
 * Popup UI logic for Cooped extension
 */

import { getAppState, updateSettings, addBlockedSite, removeBlockedSite, clearAllData, exportData, setDoNotBotherMe, checkDoNotBotherMe, disableDoNotBotherMe, hardResetStorage } from '../utils/storage.js';
import { getCurrentStage, getProgressToNextStage, getNextStage } from '../utils/mascot.js';
import { WEBSITE_METADATA } from '../types/types.js';

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadAppData();
  await initExtensionState();
  setupEventListeners();
});

/**
 * Initialize extension state from storage
 */
async function initExtensionState() {
  const result = await chrome.storage.local.get(['extensionEnabled']);
  const isEnabled = result.extensionEnabled !== false; // Default to enabled

  // Set toggle to match stored state
  const toggle = document.getElementById('extension-toggle');
  if (toggle) {
    toggle.checked = isEnabled;
  }

  // Apply night mode if extension is disabled
  if (!isEnabled) {
    applyNightMode();
  }
}

/**
 * Apply night mode styling to the popup
 */
function applyNightMode() {
  document.body.classList.add('night-mode');
  const chickenImage = document.getElementById('chicken-image');
  if (chickenImage) {
    chickenImage.src = '../../assets/chicken_sleeping.png';
    chickenImage.classList.add('sleeping');
  }
}

/**
 * Remove night mode styling from the popup
 */
function removeNightMode() {
  document.body.classList.remove('night-mode');
  const chickenImage = document.getElementById('chicken-image');
  if (chickenImage) {
    chickenImage.classList.remove('sleeping');
    // Reload the image based on current stage
    const stage = getCurrentStage(0); // Will be updated by loadAppData
    chickenImage.src = getMascotImagePath(stage.stage);
  }
}

/**
 * Load and display all app data
 */
async function loadAppData() {
  const state = await getAppState();

  // Update main display with egg count, rank, and XP
  updateMainDisplay(state);

  // Update settings panel content
  updateSettingsDisplay(state);
}

/**
 * Update main display (egg count, rank, XP progress)
 */
function updateMainDisplay(state) {
  const { user, mascot } = state;
  const currentStage = getCurrentStage(user.stats.experience);
  const nextStage = getNextStage(currentStage.stage);
  const progress = getProgressToNextStage(user.stats.experience, currentStage.stage);

  // Update egg count in header
  document.getElementById('egg-count').textContent = user.stats.eggs || 0;

  // Update chicken image
  const chickenImage = document.getElementById('chicken-image');
  chickenImage.src = getMascotImagePath(currentStage.stage);
  chickenImage.alt = currentStage.name;

  // Update chicken name
  const chickenNameMain = document.getElementById('chicken-name-main');
  if (chickenNameMain) {
    chickenNameMain.textContent = mascot?.name || 'Clucky';
  }

  // Update current rank
  document.getElementById('current-rank').textContent = `${currentStage.name} ${currentStage.emoji}`;

  // Update XP display
  document.getElementById('current-xp').textContent = user.stats.experience;

  if (nextStage) {
    document.getElementById('next-level-xp').textContent = nextStage.requiredExperience;
    document.getElementById('next-stage-name').textContent = nextStage.name;

    // Calculate and update progress bar
    const xpInCurrentLevel = user.stats.experience - (currentStage.requiredExperience || 0);
    const xpNeededForLevel = (nextStage.requiredExperience || 0) - (currentStage.requiredExperience || 0);
    const progressPercentage = xpNeededForLevel > 0 ? (xpInCurrentLevel / xpNeededForLevel) * 100 : 0;
    document.getElementById('xp-fill').style.width = `${Math.min(progressPercentage, 100)}%`;
  } else {
    document.getElementById('next-level-xp').textContent = user.stats.experience;
    document.getElementById('next-stage-name').textContent = 'Max Level';
    document.getElementById('xp-fill').style.width = '100%';
  }
}

/**
 * Get mascot image path based on stage
 */
function getMascotImagePath(stage) {
  // Map stages to their corresponding image files
  const imageMap = {
    0: '../assets/mascot/chicken_basic.png',
    1: '../assets/mascot/chicken_basic.png',
    2: '../assets/mascot/chicken_basic.png',
    3: '../assets/mascot/chicken_basic.png',
    4: '../assets/mascot/chicken_basic.png'
  };

  return imageMap[stage] || '../assets/mascot/chicken_basic.png';
}


/**
 * Update settings tab display
 */
function updateSettingsDisplay(state) {
  const { settings, mascot } = state;

  console.log('Cooped: updateSettingsDisplay - mascot:', mascot);

  // Display chicken name
  const chickenNameDisplay = document.getElementById('chicken-name-display-settings');
  if (chickenNameDisplay) {
    console.log('Cooped: Found chicken name display element, setting to:', mascot?.name || 'Clucky');
    chickenNameDisplay.textContent = mascot?.name || 'Clucky';
  } else {
    console.log('Cooped: chicken-name-display-settings element not found!');
  }

  // Display blocked sites
  displayBlockedSites(settings.blockedSites);

  // Set difficulty
  document.getElementById('difficulty-select').value = settings.challengeDifficulty;

  // Set enabled challenge types
  document.querySelectorAll('.challenge-type-checkbox').forEach(checkbox => {
    checkbox.checked = settings.enabledChallengeTypes.includes(checkbox.value);
  });

  // Set toggles
  document.getElementById('sound-toggle').checked = settings.soundEnabled;
  document.getElementById('animations-toggle').checked = settings.animationsEnabled;
}

/**
 * Extract domain from blocked site pattern
 * @param {string} pattern - URL pattern like *://www.youtube.com/*
 * @returns {string} - Domain like youtube.com
 */
function extractDomain(pattern) {
  // Remove protocol wildcard (*://)
  let domain = pattern.replace(/^\*:\/\//, '');
  // Remove trailing wildcard (/*) if present
  domain = domain.replace(/\/\*$/, '');
  // Remove leading www.
  domain = domain.replace(/^(www\.|\*\.)/, '');
  return domain;
}

/**
 * Get website metadata for a domain
 * @param {string} domain - Domain like youtube.com
 * @returns {Object} - Website metadata with name, emoji, color
 */
function getWebsiteMetadata(domain) {
  // Check for exact match or any match containing the domain
  for (const [key, metadata] of Object.entries(WEBSITE_METADATA)) {
    if (domain.includes(key) || key.includes(domain)) {
      return metadata;
    }
  }

  // Default for unknown sites
  return {
    name: domain,
    emoji: '🌐',
    color: '#666666'
  };
}

/**
 * Display blocked sites list
 */
function displayBlockedSites(sites) {
  const listContainer = document.getElementById('blocked-sites-list');

  if (sites.length === 0) {
    listContainer.innerHTML = '<p class="no-activity">No blocked sites</p>';
    return;
  }

  listContainer.innerHTML = sites.map(site => {
    const domain = extractDomain(site);
    const metadata = getWebsiteMetadata(domain);

    // Use logo if available, otherwise fallback to emoji
    const iconHTML = metadata.logo
      ? `<img src="${metadata.logo}" alt="${metadata.name} logo" class="site-logo">`
      : `<span class="site-icon" style="color: ${metadata.color}; font-size: 24px;">${metadata.emoji}</span>`;

    return `
      <div class="blocked-site-item">
        <div class="site-icon-info">
          <div class="site-icon-container">
            ${iconHTML}
          </div>
          <span class="site-name">${metadata.name}</span>
        </div>
        <button class="remove-site-btn" data-site="${site}" title="Remove ${metadata.name}">✕</button>
      </div>
    `;
  }).join('');

  // Add event listeners to remove buttons
  listContainer.querySelectorAll('.remove-site-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const site = e.target.dataset.site;
      await removeBlockedSite(site);
      await loadAppData();
    });
  });
}

/**
 * Setup chicken name editor in settings
 */
function setupChickenNameEditor() {
  const nameDisplay = document.getElementById('chicken-name-display-settings');
  const nameInput = document.getElementById('chicken-name-input-settings');

  if (!nameDisplay || !nameInput) return;

  // Click on name display to edit
  nameDisplay.addEventListener('click', () => {
    nameInput.value = nameDisplay.textContent;
    nameDisplay.style.display = 'none';
    nameInput.style.display = 'block';
    nameInput.focus();
    nameInput.select();
  });

  // Save on Enter key
  nameInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await saveName(nameInput.value);
    }
  });

  // Save on blur (clicking outside)
  nameInput.addEventListener('blur', async () => {
    await saveName(nameInput.value);
  });

  // Save the new name
  async function saveName(newName) {
    const trimmedName = newName.trim() || 'Clucky';

    // Update UI immediately (settings panel)
    nameDisplay.textContent = trimmedName;
    nameDisplay.style.display = 'block';
    nameInput.style.display = 'none';

    // Also update home page name display
    const chickenNameMain = document.getElementById('chicken-name-main');
    if (chickenNameMain) {
      chickenNameMain.textContent = trimmedName;
    }

    // Save to storage
    try {
      const state = await getAppState();
      state.mascot.name = trimmedName;
      await chrome.storage.local.set({ ['cooped_app_state']: state });
      console.log('Cooped: Chicken name saved:', trimmedName);
    } catch (error) {
      console.error('Cooped: Error saving chicken name:', error);
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Chicken name editor
  setupChickenNameEditor();

  // Earn More Eggs button
  const earnEggsBtn = document.getElementById('earn-eggs-btn');
  if (earnEggsBtn) {
    earnEggsBtn.addEventListener('click', () => {
      // Open the earn-eggs page in a new popup window
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/earn-eggs.html'),
        type: 'popup',
        width: 500,
        height: 800
      });
    });
  }

  // Test Interrupt Sequence button
  const testInterruptBtn = document.getElementById('test-interrupt-btn');
  if (testInterruptBtn) {
    testInterruptBtn.addEventListener('click', () => {
      console.log('[POPUP] Test button clicked');
      // Send message to background script to relay to all tabs
      chrome.runtime.sendMessage({
        action: 'showInterruptSequence'
      }, (response) => {
        console.log('[POPUP] Background response:', response);
      });
    });
  }

  // Preview Challenges button (for design/branding work)
  const previewChallengesBtn = document.getElementById('preview-challenges-btn');
  if (previewChallengesBtn) {
    previewChallengesBtn.addEventListener('click', () => {
      // Open the challenge preview page in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/debug/challenge-preview.html')
      });
    });
  }

  // Extension toggle (on/off with night mode)
  const extensionToggle = document.getElementById('extension-toggle');
  if (extensionToggle) {
    extensionToggle.addEventListener('change', async (e) => {
      const isEnabled = e.target.checked;

      // Save state to storage
      await chrome.storage.local.set({ extensionEnabled: isEnabled });

      // Apply or remove night mode
      if (isEnabled) {
        removeNightMode();
      } else {
        applyNightMode();
      }
    });
  }

  // Settings panel toggle
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsPanel = document.getElementById('settings-panel');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsPanel.classList.add('open');
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsPanel.classList.remove('open');
    });
  }

  // Close settings panel when clicking outside of it (on main content)
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.addEventListener('click', () => {
      settingsPanel.classList.remove('open');
    });
  }

  // Add blocked site
  const addSiteBtn = document.getElementById('add-site-btn');
  const newSiteInput = document.getElementById('new-site-input');

  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', async () => {
      const site = newSiteInput.value.trim();

      if (site) {
        await addBlockedSite(site);
        newSiteInput.value = '';
        await loadAppData();
      }
    });
  }

  // Add site on Enter key
  if (newSiteInput) {
    newSiteInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        document.getElementById('add-site-btn').click();
      }
    });
  }

  // Difficulty change
  const difficultySelect = document.getElementById('difficulty-select');
  if (difficultySelect) {
    difficultySelect.addEventListener('change', async (e) => {
      await updateSettings({ challengeDifficulty: e.target.value });
    });
  }

  // Challenge type checkboxes
  document.querySelectorAll('.challenge-type-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const enabledTypes = Array.from(
        document.querySelectorAll('.challenge-type-checkbox:checked')
      ).map(cb => cb.value);

      if (enabledTypes.length === 0) {
        alert('At least one challenge type must be enabled!');
        checkbox.checked = true;
        return;
      }

      await updateSettings({ enabledChallengeTypes: enabledTypes });
    });
  });

  // Sound toggle
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', async (e) => {
      await updateSettings({ soundEnabled: e.target.checked });
    });
  }

  // Animations toggle
  const animationsToggle = document.getElementById('animations-toggle');
  if (animationsToggle) {
    animationsToggle.addEventListener('change', async (e) => {
      await updateSettings({ animationsEnabled: e.target.checked });
    });
  }

  // Export data
  const exportDataBtn = document.getElementById('export-data-btn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cooped-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Reset data
  const resetDataBtn = document.getElementById('reset-data-btn');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
        await clearAllData();
        await loadAppData();
        alert('All data has been reset!');
      }
    });
  }

  // Hard reset (emergency fix for corrupted settings)
  const hardResetBtn = document.getElementById('hard-reset-btn');
  if (hardResetBtn) {
    hardResetBtn.addEventListener('click', async () => {
      if (confirm('⚠️ HARD RESET - This will clear ALL extension data and reset to defaults. Continue?')) {
        try {
          await hardResetStorage();
          await loadAppData();
          alert('✓ Hard reset complete! All settings restored to defaults.');
        } catch (error) {
          alert('❌ Error during hard reset: ' + error.message);
        }
      }
    });
  }

  // Do Not Bother Me timers
  const doNotBotherButtons = {
    15: document.getElementById('do-not-bother-15'),
    30: document.getElementById('do-not-bother-30'),
    60: document.getElementById('do-not-bother-60'),
    120: document.getElementById('do-not-bother-120')
  };

  Object.entries(doNotBotherButtons).forEach(([minutes, btn]) => {
    if (btn) {
      btn.addEventListener('click', async () => {
        await setDoNotBotherMe(parseInt(minutes));
        updateDoNotBotherStatus();
      });
    }
  });

  const disableBtn = document.getElementById('do-not-bother-disable');
  if (disableBtn) {
    disableBtn.addEventListener('click', async () => {
      await disableDoNotBotherMe();
      updateDoNotBotherStatus();
    });
  }

  // Update Do Not Bother Me status on load
  updateDoNotBotherStatus();
}

/**
 * Update Do Not Bother Me status display
 */
async function updateDoNotBotherStatus() {
  const status = await checkDoNotBotherMe();
  const statusDiv = document.getElementById('do-not-bother-status');
  const messageDiv = document.getElementById('do-not-bother-message');
  const disableBtn = document.getElementById('do-not-bother-disable');
  const timerButtons = [
    document.getElementById('do-not-bother-15'),
    document.getElementById('do-not-bother-30'),
    document.getElementById('do-not-bother-60'),
    document.getElementById('do-not-bother-120')
  ];

  if (status.active) {
    statusDiv.style.display = 'block';
    messageDiv.textContent = `⏸️ Timer active: ${status.minutesRemaining} minute${status.minutesRemaining !== 1 ? 's' : ''} remaining`;
    disableBtn.style.display = 'block';
    timerButtons.forEach(btn => {
      if (btn) btn.disabled = true;
    });
  } else {
    statusDiv.style.display = 'none';
    disableBtn.style.display = 'none';
    timerButtons.forEach(btn => {
      if (btn) btn.disabled = false;
    });
  }
}
