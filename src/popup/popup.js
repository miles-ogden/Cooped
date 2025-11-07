/**
 * Popup UI logic for Cooped extension
 */

import { getAppState, updateSettings, addBlockedSite, removeBlockedSite, getRecentSessions, clearAllData, exportData } from '../utils/storage.js';
import { getCurrentStage, getProgressToNextStage, getNextStage, getMascotImageUrl } from '../utils/mascot.js';

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadAppData();
  setupEventListeners();
});

/**
 * Load and display all app data
 */
async function loadAppData() {
  const state = await getAppState();

  // Update mascot tab
  updateMascotDisplay(state);

  // Update stats tab
  updateStatsDisplay(state);

  // Update settings tab
  updateSettingsDisplay(state);
}

/**
 * Update mascot tab display
 */
function updateMascotDisplay(state) {
  const { user, mascot } = state;
  const currentStage = getCurrentStage(user.stats.experience);
  const nextStage = getNextStage(currentStage.stage);
  const progress = getProgressToNextStage(user.stats.experience, currentStage.stage);

  // Update stage name and image
  document.getElementById('mascot-stage-name').textContent = currentStage.name;
  document.getElementById('mascot-name').textContent = mascot.name;

  // Update mascot image (for now, show placeholder)
  const mascotImage = document.getElementById('mascot-image');
  mascotImage.alt = currentStage.name;
  // Note: Actual images would be loaded here
  // mascotImage.src = getMascotImageUrl(currentStage.stage);

  // Update progress bar
  document.getElementById('user-level').textContent = user.stats.level;
  document.getElementById('current-xp').textContent = user.stats.experience;

  if (nextStage) {
    document.getElementById('next-level-xp').textContent = nextStage.requiredExperience;
    document.getElementById('next-stage-info').innerHTML = `Next stage: <strong>${nextStage.name}</strong> at ${nextStage.requiredExperience} XP`;
    document.getElementById('progress-fill').style.width = `${progress.percentage}%`;
  } else {
    document.getElementById('next-level-xp').textContent = user.stats.experience;
    document.getElementById('next-stage-info').textContent = 'Max stage reached!';
    document.getElementById('progress-fill').style.width = '100%';
  }

  // Update mascot message
  document.getElementById('mascot-message').textContent = currentStage.description;
}

/**
 * Update stats tab display
 */
function updateStatsDisplay(state) {
  const { user, sessions } = state;

  // Update stat cards
  document.getElementById('challenges-completed').textContent = user.stats.challengesCompleted;
  document.getElementById('current-streak').textContent = user.stats.currentStreak;
  document.getElementById('longest-streak').textContent = user.stats.longestStreak;
  document.getElementById('total-xp').textContent = user.stats.experience;

  // Format time blocked
  const hours = Math.floor(user.stats.totalTimeBlocked / (1000 * 60 * 60));
  const minutes = Math.floor((user.stats.totalTimeBlocked % (1000 * 60 * 60)) / (1000 * 60));
  document.getElementById('time-saved').textContent = `${hours}h ${minutes}m`;

  // Calculate success rate
  const successCount = sessions.filter(s => s.success).length;
  const successRate = sessions.length > 0 ? Math.round((successCount / sessions.length) * 100) : 0;
  document.getElementById('success-rate').textContent = `${successRate}%`;

  // Display recent activity
  displayRecentActivity(sessions);
}

/**
 * Display recent activity list
 */
function displayRecentActivity(sessions) {
  const activityList = document.getElementById('activity-list');

  if (sessions.length === 0) {
    activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
    return;
  }

  activityList.innerHTML = sessions.slice(0, 5).map(session => {
    const date = new Date(session.timestamp);
    const timeAgo = getTimeAgo(date);
    const statusClass = session.success ? 'success' : 'failure';
    const statusIcon = session.success ? '✓' : '✗';
    const domain = new URL(session.site).hostname;

    return `
      <div class="activity-item ${statusClass}">
        <div>${statusIcon} ${session.challengeType} on ${domain}</div>
        <div class="activity-time">${timeAgo}</div>
      </div>
    `;
  }).join('');
}

/**
 * Update settings tab display
 */
function updateSettingsDisplay(state) {
  const { settings } = state;

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
 * Display blocked sites list
 */
function displayBlockedSites(sites) {
  const listContainer = document.getElementById('blocked-sites-list');

  if (sites.length === 0) {
    listContainer.innerHTML = '<p class="no-activity">No blocked sites</p>';
    return;
  }

  listContainer.innerHTML = sites.map(site => `
    <div class="blocked-site-item">
      <span>${site}</span>
      <button class="remove-site-btn" data-site="${site}">Remove</button>
    </div>
  `).join('');

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
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });

  // Add blocked site
  document.getElementById('add-site-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-site-input');
    const site = input.value.trim();

    if (site) {
      await addBlockedSite(site);
      input.value = '';
      await loadAppData();
    }
  });

  // Add site on Enter key
  document.getElementById('new-site-input').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      document.getElementById('add-site-btn').click();
    }
  });

  // Difficulty change
  document.getElementById('difficulty-select').addEventListener('change', async (e) => {
    await updateSettings({ challengeDifficulty: e.target.value });
  });

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
  document.getElementById('sound-toggle').addEventListener('change', async (e) => {
    await updateSettings({ soundEnabled: e.target.checked });
  });

  // Animations toggle
  document.getElementById('animations-toggle').addEventListener('change', async (e) => {
    await updateSettings({ animationsEnabled: e.target.checked });
  });

  // Export data
  document.getElementById('export-data-btn').addEventListener('click', async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cooped-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Reset data
  document.getElementById('reset-data-btn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
      await clearAllData();
      await loadAppData();
      alert('All data has been reset!');
    }
  });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
