/**
 * Home Screen Manager
 * Displays chicken, XP, level, eggs, and coop/cosmetics access
 */

import { getCurrentUser, querySelect } from '../../logic/supabaseClient.js';

export class HomeScreen {
  constructor() {
    this.userProfile = null;
    this.coopInfo = null;
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

      // If in coop, load coop info
      if (userProfile.coop_id) {
        const coopInfo = await querySelect('coops', {
          eq: { id: userProfile.coop_id },
          single: true
        });
        this.coopInfo = coopInfo;
        console.log('[HOME_SCREEN] Loaded coop:', coopInfo?.name);
      }

      // Update DOM with user data
      this.render();
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

    const html = `
      <div class="home-screen">
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
   */
  getXPProgressPercent(xpTotal) {
    const currentLevel = Math.floor(Math.sqrt(xpTotal / 50)) + 1;
    const nextLevel = currentLevel + 1;

    const xpForCurrentLevel = 50 * Math.pow(currentLevel - 1, 2);
    const xpForNextLevel = 50 * Math.pow(nextLevel - 1, 2);

    const xpInLevel = xpTotal - xpForCurrentLevel;
    const xpPerLevel = xpForNextLevel - xpForCurrentLevel;

    return Math.min(100, (xpInLevel / xpPerLevel) * 100);
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
      coopButtonsContainer.innerHTML = `
        <div class="coop-info">
          <span class="coop-label">Coop: ${this.coopInfo.name}</span>
        </div>
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
   * Hide home screen
   */
  hide() {
    // Hide main content (if using visibility toggle)
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.display = 'none';
    }
  }
}

console.log('[HOME_SCREEN] Module loaded');
