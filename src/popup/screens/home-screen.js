/**
 * Home Screen Manager
 * Displays chicken, XP, level, eggs, and coop/cosmetics access
 */

import { getCurrentUser, querySelect } from '../../logic/supabaseClient.js';
import { getSkipStatus } from '../../logic/skipSystem.js';
import { getActiveQuest } from '../../logic/sideQuestSystem.js';

export class HomeScreen {
  constructor() {
    this.userProfile = null;
    this.coopInfo = null;
    this.skipStatus = null;
    this.activeQuest = null;
    this.timerInterval = null;
    this.questTimerInterval = null;
    console.log('[HOME_SCREEN] Initialized');
  }

  /**
   * Load user data and render home screen
   */
  async show() {
    try {
      console.log('[HOME_SCREEN] Loading user data...');

      // Get authenticated user (skip token validation since we already have session)
      const user = await getCurrentUser(true);
      if (!user) {
        console.error('[HOME_SCREEN] No authenticated user');
        return;
      }

      // Get user profile (XP, level, eggs, coop_id)
      const userProfile = await querySelect('users', {
        eq: { id: user.id },
        single: true
      });

      if (!userProfile) {
        console.error('[HOME_SCREEN] User profile not found');
        return;
      }

      this.userProfile = userProfile;

      // Get skip status (for timer display)
      try {
        this.skipStatus = await getSkipStatus(user.id);
        console.log('[HOME_SCREEN] Skip status loaded:', this.skipStatus);
        console.log('[HOME_SCREEN] Hearts from skipStatus:', this.skipStatus?.hearts);

        // Always fetch fresh skip_until from DB to ensure accurate timer
        console.log('[HOME_SCREEN] Fetching fresh skip_until from DB...');
        const freshUser = await querySelect('users', {
          eq: { id: user.id },
          select: 'skip_until,hearts_remaining_today',
          single: true
        });

        console.log('[HOME_SCREEN] Fresh user data received:', freshUser);

        if (freshUser?.skip_until) {
          // DB has a skip_until value - store it for accurate timer display
          this.skipUntilTimestamp = freshUser.skip_until;
          console.log('[HOME_SCREEN] ✅ Stored skip_until timestamp from DB:', this.skipUntilTimestamp);

          // If skipStatus says skip is not active but DB has timestamp, re-check
          // This can happen due to timing between DB queries
          const now = new Date();
          const skipUntilStr = freshUser.skip_until.endsWith('Z')
            ? freshUser.skip_until
            : `${freshUser.skip_until}Z`;
          const skipUntil = new Date(skipUntilStr);
          const secondsRemaining = Math.floor((skipUntil.getTime() - now.getTime()) / 1000);

          if (secondsRemaining > 0) {
            // Skip is still active!
            console.log('[HOME_SCREEN] ✅ Skip is STILL ACTIVE - updating skipStatus');
            this.skipStatus.skipActive = true;
            this.skipStatus.minutesRemaining = Math.ceil(secondsRemaining / 60);
          } else {
            console.log('[HOME_SCREEN] Skip timestamp exists but expired - will show no timer');
            this.skipUntilTimestamp = null;
          }
        } else {
          console.log('[HOME_SCREEN] No skip_until in DB - skip is not active');
          this.skipUntilTimestamp = null;
        }

        // Always update hearts from fresh data
        if (freshUser?.hearts_remaining_today !== undefined) {
          this.skipStatus.hearts = freshUser.hearts_remaining_today;
          console.log('[HOME_SCREEN] Updated hearts from DB:', this.skipStatus.hearts);
        }
      } catch (err) {
        console.error('[HOME_SCREEN] Error loading skip status:', err);
        this.skipStatus = null;
      }

      // If in coop, load coop info and active quest
      if (userProfile.coop_id) {
        const coopInfo = await querySelect('coops', {
          eq: { id: userProfile.coop_id },
          single: true
        });
        this.coopInfo = coopInfo;
        console.log('[HOME_SCREEN] Loaded coop:', coopInfo?.name);

        // Load active quest if side quests are enabled
        if (coopInfo?.side_quests_enabled) {
          try {
            const questResult = await getActiveQuest(userProfile.coop_id);
            if (questResult.success && questResult.quest) {
              this.activeQuest = questResult.quest;
              console.log('[HOME_SCREEN] Loaded active quest:', this.activeQuest.id);
            }
          } catch (err) {
            console.warn('[HOME_SCREEN] Error loading active quest:', err);
          }
        }
      }

      // Update DOM with user data
      this.render();

      // Start timer if skip is active
      if (this.skipStatus?.skipActive) {
        this.startSkipTimer();
      }
    } catch (err) {
      console.error('[HOME_SCREEN] Error loading home screen:', err);
    }
  }

  /**
   * Render home screen with user data
   */
  render() {
    const screenContainer = document.getElementById('screen-container');
    if (!screenContainer) {
      console.warn('[HOME_SCREEN] Screen container not found');
      return;
    }

    const xpPercent = this.getXPProgressPercent(this.userProfile.xp_total || 0);
    const level = this.userProfile.level || 1;
    const name = this.userProfile.name || 'Clucky';

    // Build skip timer overlay if active
    // Calculate initial time from timestamp if available
    let initialSecondsRemaining = 0;
    console.log('[HOME_SCREEN] render() - skipUntilTimestamp:', this.skipUntilTimestamp);
    console.log('[HOME_SCREEN] render() - skipStatus.minutesRemaining:', this.skipStatus?.minutesRemaining);

    if (this.skipUntilTimestamp) {
      const now = new Date();
      const skipUntilStr = this.skipUntilTimestamp.endsWith('Z')
        ? this.skipUntilTimestamp
        : `${this.skipUntilTimestamp}Z`;
      const skipUntil = new Date(skipUntilStr);
      initialSecondsRemaining = Math.floor((skipUntil.getTime() - now.getTime()) / 1000);
      console.log('[HOME_SCREEN] Calculated from timestamp - secondsRemaining:', initialSecondsRemaining);
    } else {
      console.log('[HOME_SCREEN] ⚠️ skipUntilTimestamp is NOT set! Using cached minutesRemaining');
      // Fallback: use cached minutes and convert to seconds
      initialSecondsRemaining = (this.skipStatus?.minutesRemaining || 0) * 60;
    }

    // Don't show calculated time initially - let startSkipTimer() update it on first interval
    // to avoid displaying stale/incorrect initial value
    const skipTimerHTML = this.skipStatus?.skipActive
      ? `
        <div class="skip-timer-overlay" id="skip-timer-overlay">
          <div class="skip-timer-content">
            <div class="skip-timer-icon">✨</div>
            <div class="skip-timer-text">FREE PASS ACTIVE</div>
            <div class="skip-timer-countdown" id="skip-countdown">
              --:--
            </div>
            <div class="skip-timer-hearts">
              ❤️ ${this.skipStatus.hearts}/${3} skips left today
            </div>
          </div>
        </div>
      `
      : '';

    const html = `
      <div class="home-screen">
        ${skipTimerHTML}

        <!-- Chicken Display Section (Large Center) -->
        <div class="chicken-display-section">
          <div class="chicken-container">
            <img src="../assets/mascot/chicken_basic.png" alt="Chicken" class="chicken-image">
            <div class="chicken-name">${name}</div>
            <div class="chicken-accessories">
              ${this.getEquippedAccessoriesDisplay()}
            </div>
          </div>
        </div>

        <!-- Level and XP Bar Section -->
        <div class="stats-section">
          <div class="level-display">
            <span class="level-label">Level</span>
            <span class="level-value">${level}</span>
          </div>

          <!-- XP Progress Bar -->
          <div class="xp-bar-container">
            <div class="xp-bar-label">Experience</div>
            <div class="xp-bar-background">
              <div class="xp-bar-fill" style="width: ${xpPercent}%"></div>
            </div>
            <div class="xp-bar-text">${this.userProfile.xp_total || 0} XP</div>
          </div>
        </div>

        <!-- Coop Actions Section -->
        <div class="coop-actions-section">
          <div id="coop-action-buttons" class="coop-action-buttons"></div>
        </div>
      </div>
    `;

    screenContainer.innerHTML = html;
    this.attachEventListeners();

    // Update background based on coop
    this.updateBackground();

    // Update coop action buttons
    this.updateCoopButtons();

    // Log render complete
    console.log('[HOME_SCREEN] Rendered home screen for:', name);
  }

  /**
   * Get equipped accessories display
   */
  getEquippedAccessoriesDisplay() {
    const hat = this.userProfile.equipped_accessories?.[0] || 'none';
    const scarf = this.userProfile.equipped_accessories?.[1] || 'none';

    const accessories = [];
    if (hat !== 'none') {
      const hatEmojis = {
        'top_hat': '🎩',
        'wizard_hat': '🧙',
        'crown': '👑'
      };
      accessories.push(hatEmojis[hat] || '⭕');
    }
    if (scarf !== 'none') {
      const scarfEmojis = {
        'red_scarf': '🔴',
        'gold_scarf': '✨'
      };
      accessories.push(scarfEmojis[scarf] || '⭕');
    }

    return accessories.length > 0 ? `<span class="accessories">${accessories.join(' ')}</span>` : '';
  }

  /**
   * Attach event listeners to home screen
   */
  attachEventListeners() {
    // Event listeners are attached to bottom nav buttons, not needed here
  }

  /**
   * Calculate XP progress percentage for current level
   * XP Bar shows progress within current level (0-1000 XP per level)
   */
  getXPProgressPercent(xpTotal) {
    const XP_PER_LEVEL = 1000;
    // Get XP within current level (0-999)
    const xpInCurrentLevel = xpTotal % XP_PER_LEVEL;
    // Return percentage (0-100)
    return (xpInCurrentLevel / XP_PER_LEVEL) * 100;
  }

  /**
   * Update background based on coop membership
   */
  updateBackground() {
    const container = document.querySelector('.container');
    if (!container) return;

    if (this.coopInfo) {
      // Remove solo background class
      container.classList.remove('background-solo');
      // Add coop-specific background class
      container.classList.add(`background-coop-${this.coopInfo.id}`);
      console.log('[HOME_SCREEN] Applied coop background');
    } else {
      // Solo mode
      container.classList.remove('background-coop-*');
      container.classList.add('background-solo');
      console.log('[HOME_SCREEN] Applied solo background');
    }
  }

  /**
   * Update coop action buttons visibility
   */
  updateCoopButtons() {
    const coopButtonsContainer = document.getElementById('coop-action-buttons');
    if (!coopButtonsContainer) {
      console.warn('[HOME_SCREEN] Coop action buttons container not found');
      return;
    }

    coopButtonsContainer.innerHTML = '';

    if (!this.coopInfo) {
      // Not in a coop - show create and join buttons
      coopButtonsContainer.innerHTML = `
        <button id="create-coop-btn" class="btn-primary" title="Create a new coop">
          ➕ Create Coop
        </button>
        <button id="join-coop-btn" class="btn-secondary" title="Join an existing coop">
          🔗 Join Coop
        </button>
      `;

      // Attach event listeners
      document.getElementById('create-coop-btn')?.addEventListener('click', () => {
        this.onCreateCoopClick();
      });

      document.getElementById('join-coop-btn')?.addEventListener('click', () => {
        this.onJoinCoopClick();
      });
    } else {
      // In a coop - show coop name and view button
      let sideQuestButtonHTML = '';
      if (this.activeQuest) {
        const timeRemaining = this.getQuestTimeRemaining();
        const timeString = this.formatQuestTimeRemaining(timeRemaining);
        sideQuestButtonHTML = `
          <button id="side-quest-btn" class="btn-side-quest" title="Participate in side quest">
            <span class="quest-icon">🎯</span>
            <span class="quest-text">Side Quest Available</span>
            <span class="quest-timer" id="quest-timer-display">${timeString}</span>
          </button>
        `;
      }

      coopButtonsContainer.innerHTML = `
        <div class="coop-info">
          <span class="coop-label">Coop: ${this.coopInfo.name}</span>
        </div>
        ${sideQuestButtonHTML}
        <button id="view-coop-btn" class="btn-primary" title="View coop details">
          👥 View Coop
        </button>
        <button id="coop-settings-btn" class="btn-secondary" title="Coop settings">
          ⚙️ Settings
        </button>
      `;

      // Attach event listeners
      document.getElementById('view-coop-btn')?.addEventListener('click', () => {
        this.onViewCoopClick();
      });

      document.getElementById('coop-settings-btn')?.addEventListener('click', () => {
        this.onCoopSettingsClick();
      });

      document.getElementById('side-quest-btn')?.addEventListener('click', () => {
        this.onSideQuestClick();
      });

      // Start quest timer if active
      if (this.activeQuest) {
        this.startQuestTimer();
      }
    }

    console.log('[HOME_SCREEN] Updated coop buttons');
  }

  /**
   * Handle create coop button click
   */
  onCreateCoopClick() {
    console.log('[HOME_SCREEN] Create coop clicked');
    // Emit event that main popup.js can listen to
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'coop-creation' }
    }));
  }

  /**
   * Handle join coop button click
   */
  onJoinCoopClick() {
    console.log('[HOME_SCREEN] Join coop clicked');
    // TODO: Show modal for join code input
    const code = prompt('Enter coop join code:');
    if (code) {
      console.log('[HOME_SCREEN] Attempting to join coop with code:', code);
      // TODO: Call coopManager.joinCoop(code)
    }
  }

  /**
   * Handle view coop button click
   */
  onViewCoopClick() {
    console.log('[HOME_SCREEN] View coop clicked');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'coop-view' }
    }));
  }

  /**
   * Handle coop settings button click
   */
  onCoopSettingsClick() {
    console.log('[HOME_SCREEN] Coop settings clicked');
    // TODO: Navigate to coop settings (admin only)
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'coop-settings' }
    }));
  }

  /**
   * Handle side quest button click
   */
  onSideQuestClick() {
    console.log('[HOME_SCREEN] Side quest clicked');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'side-quest', coopId: this.coopInfo.id }
    }));
  }

  /**
   * Get remaining time on active quest in milliseconds
   */
  getQuestTimeRemaining() {
    if (!this.activeQuest) return 0;
    const expiresAt = new Date(this.activeQuest.expires_at);
    const now = new Date();
    return Math.max(0, expiresAt - now);
  }

  /**
   * Format quest time remaining as HH:MM:SS
   */
  formatQuestTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Start quest timer countdown
   */
  startQuestTimer() {
    // Clear any existing timer
    if (this.questTimerInterval) {
      clearInterval(this.questTimerInterval);
    }

    console.log('[HOME_SCREEN] Starting quest timer');

    // Update timer every second
    this.questTimerInterval = setInterval(() => {
      const timeRemaining = this.getQuestTimeRemaining();
      const timerEl = document.getElementById('quest-timer-display');

      if (timerEl) {
        if (timeRemaining <= 0) {
          timerEl.textContent = '00:00:00';
          timerEl.classList.add('expired');
          clearInterval(this.questTimerInterval);
          this.questTimerInterval = null;
          // Reload to remove expired quest button
          this.show();
        } else {
          timerEl.textContent = this.formatQuestTimeRemaining(timeRemaining);
        }
      }
    }, 1000);
  }

  /**
   * Stop quest timer
   */
  stopQuestTimer() {
    if (this.questTimerInterval) {
      clearInterval(this.questTimerInterval);
      this.questTimerInterval = null;
      console.log('[HOME_SCREEN] Quest timer stopped');
    }
  }

  /**
   * Format time remaining in MM:SS format
   */
  formatTimeRemaining(minutes) {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes % 1) * 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Start skip timer countdown
   */
  startSkipTimer() {
    // Clear any existing timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    console.log('[HOME_SCREEN] Starting skip timer with raw timestamp:', this.skipUntilTimestamp);

    // Update timer every second, calculating from database timestamp
    this.timerInterval = setInterval(() => {
      if (!this.skipUntilTimestamp) {
        console.error('[HOME_SCREEN] skipUntilTimestamp is missing!');
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        return;
      }

      const now = new Date();
      // Parse timestamp - handle both ISO format with Z (UTC) and without Z (treat as UTC)
      const skipUntilStr = this.skipUntilTimestamp.endsWith('Z')
        ? this.skipUntilTimestamp
        : `${this.skipUntilTimestamp}Z`;
      const skipUntil = new Date(skipUntilStr);

      // Calculate seconds remaining using current time
      const secondsRemaining = Math.floor((skipUntil.getTime() - now.getTime()) / 1000);
      const minutesRemaining = Math.ceil(secondsRemaining / 60);

      console.log(`[HOME_SCREEN] Timer update: now=${now.toISOString()}, skipUntil=${skipUntilStr}, ${secondsRemaining}s remaining (${minutesRemaining}m)`);

      if (secondsRemaining <= 0) {
        // Timer expired
        console.log('[HOME_SCREEN] Skip timer expired - notifying content scripts');
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        // Notify all tabs that skip has expired so they can re-show the blocker
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SKIP_EXPIRED',
              message: 'Skip period has expired, re-check blocking'
            }).catch(() => {
              // Tab might not have content script, ignore
            });
          });
        });

        // Focus the popup window so user sees the blocker came back
        chrome.windows.getCurrent((window) => {
          if (window && window.id) {
            chrome.windows.update(window.id, { focused: true });
            console.log('[HOME_SCREEN] Focused popup window');
          }
        });

        // Reload skip status and re-render
        this.show();
        return;
      }

      // Update the countdown display with accurate time from database
      // Convert seconds to minutes for formatTimeRemaining (passes minutes, function handles conversion)
      const countdownElement = document.getElementById('skip-countdown');
      if (countdownElement) {
        countdownElement.textContent = this.formatTimeRemaining(secondsRemaining / 60);
      }
    }, 1000); // Update every 1 second
  }

  /**
   * Stop skip timer
   */
  stopSkipTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('[HOME_SCREEN] Skip timer stopped');
    }
  }

  /**
   * Hide home screen
   */
  hide() {
    // Stop timers when hiding
    this.stopSkipTimer();
    this.stopQuestTimer();

    // Hide main content (if using visibility toggle)
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.display = 'none';
    }
  }
}

console.log('[HOME_SCREEN] Module loaded');
