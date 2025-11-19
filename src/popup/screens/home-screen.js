/**
 * Home Screen Manager
 * Displays chicken, XP, level, eggs, and coop/cosmetics access
 */

import { getUserXPStatus } from '../../logic/xpManager.js';
import { getCurrentUser } from '../../logic/supabaseClient.js';
import { querySelect } from '../../logic/supabaseClient.js';

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

      // Get authenticated user
      const user = await getCurrentUser();
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
    // Update chicken name
    const nameDisplay = document.getElementById('chicken-name-main');
    if (nameDisplay) {
      nameDisplay.textContent = this.userProfile.name || 'Clucky';
    }

    // Update level (can be shown next to name or elsewhere)
    const levelDisplay = document.querySelector('[data-level]');
    if (levelDisplay) {
      levelDisplay.textContent = `Level ${this.userProfile.level || 1}`;
    }

    // Update XP bar
    const xpBar = document.querySelector('[data-xp-bar]');
    if (xpBar) {
      const percent = this.getXPProgressPercent(
        this.userProfile.xp_total || 0
      );
      xpBar.style.width = `${percent}%`;
    }

    // Update eggs display
    const eggsDisplay = document.querySelector('[data-eggs-count]');
    if (eggsDisplay) {
      eggsDisplay.textContent = this.userProfile.eggs || 0;
    }

    // Update background based on coop
    this.updateBackground();

    // Update coop action buttons
    this.updateCoopButtons();

    // Log render complete
    console.log('[HOME_SCREEN] Rendered home screen for:', this.userProfile.name);
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
