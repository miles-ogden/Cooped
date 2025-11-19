/**
 * Settings Screen Manager
 * Handles personal settings, hardcore mode, coop management, and logout
 */

import { querySelect, queryUpdate, getCurrentUser } from '../../logic/supabaseClient.js';

export class SettingsScreen {
  constructor() {
    this.userProfile = null;
    this.userCoops = [];
    console.log('[SETTINGS_SCREEN] Initialized');
  }

  /**
   * Load settings data and render screen
   */
  async show() {
    try {
      console.log('[SETTINGS_SCREEN] Loading settings...');

      const user = await getCurrentUser(true);
      if (!user) {
        console.error('[SETTINGS_SCREEN] No authenticated user');
        return;
      }

      // Get user profile
      this.userProfile = await querySelect('users', {
        eq: { id: user.id },
        single: true
      });

      // Get all coops the user is in
      if (this.userProfile.coop_id) {
        const currentCoop = await querySelect('coops', {
          eq: { id: this.userProfile.coop_id },
          single: true
        });
        if (currentCoop) {
          this.userCoops = [currentCoop];
        }
      }

      this.render();
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error loading settings:', err);
    }
  }

  /**
   * Render settings screen
   */
  render() {
    const screenContainer = document.getElementById('screen-container');
    if (!screenContainer) {
      console.warn('[SETTINGS_SCREEN] Screen container not found');
      return;
    }

    const currentCoopHtml = this.userProfile.coop_id
      ? `
        <div class="coop-item current">
          <div class="coop-info">
            <h4>${this.userCoops[0]?.name || 'Unknown Coop'}</h4>
            <p class="coop-meta">Level ${this.userCoops[0]?.coop_level || 1} • Members: ${this.userCoops[0]?.member_ids?.length || 0}/8</p>
          </div>
          <button class="btn-secondary btn-sm" data-action="leave-coop" data-coop-id="${this.userProfile.coop_id}">
            Leave
          </button>
        </div>
      `
      : '<p class="text-muted">Not in a coop</p>';

    const html = `
      <div class="settings-screen">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="btn-icon" id="back-btn" title="Back to home">✕</button>
        </div>

        <div class="settings-content">
          <!-- Personal Settings Section -->
          <section class="settings-section">
            <h3>Personal Settings</h3>

            <div class="setting-item">
              <label for="chicken-name">Chicken Name</label>
              <input
                type="text"
                id="chicken-name"
                value="${this.userProfile.name || 'Clucky'}"
                placeholder="Enter chicken name"
                maxlength="20"
              >
              <button class="btn-primary btn-sm" id="save-name-btn">Save</button>
            </div>

            <div class="setting-item">
              <label for="hardcore-mode">
                <input
                  type="checkbox"
                  id="hardcore-mode"
                  ${this.userProfile.hardcore_mode_enabled ? 'checked' : ''}
                  class="toggle-checkbox"
                >
                <span class="toggle-label">Hardcore Mode</span>
                <span class="setting-description">Stricter rules and higher penalties</span>
              </label>
            </div>

            <div class="setting-item">
              <label for="theme-preference">Theme</label>
              <select id="theme-preference">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
          </section>

          <!-- Coop Management Section -->
          <section class="settings-section">
            <h3>Coop Management</h3>

            <div class="coop-list">
              <h4>Current Coop</h4>
              ${currentCoopHtml}
            </div>

            <div class="join-coop-form">
              <h4>Join a Coop</h4>
              <div class="form-group">
                <input
                  type="text"
                  id="join-code-input"
                  placeholder="Enter join code"
                  maxlength="30"
                >
                <button class="btn-primary" id="join-coop-submit">Join</button>
              </div>
            </div>
          </section>

          <!-- Account Section -->
          <section class="settings-section">
            <h3>Account</h3>
            <button class="btn-danger" id="logout-btn">
              🚪 Logout
            </button>
          </section>
        </div>
      </div>
    `;

    screenContainer.innerHTML = html;
    this.attachEventListeners();
    console.log('[SETTINGS_SCREEN] Rendered settings screen');
  }

  /**
   * Attach event listeners to settings controls
   */
  attachEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.onBackClick();
    });

    // Save name button
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
      this.onSaveNameClick();
    });

    // Hardcore mode toggle
    document.getElementById('hardcore-mode')?.addEventListener('change', (e) => {
      this.onHardcoreModeChange(e.target.checked);
    });

    // Leave coop buttons
    document.querySelectorAll('[data-action="leave-coop"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const coopId = e.target.getAttribute('data-coop-id');
        this.onLeaveCoop(coopId);
      });
    });

    // Join coop
    document.getElementById('join-coop-submit')?.addEventListener('click', () => {
      this.onJoinCoopSubmit();
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      this.onLogout();
    });
  }

  /**
   * Handle save name click
   */
  async onSaveNameClick() {
    try {
      const nameInput = document.getElementById('chicken-name');
      const newName = nameInput?.value?.trim();

      if (!newName) {
        alert('Please enter a name');
        return;
      }

      console.log('[SETTINGS_SCREEN] Saving name:', newName);

      await queryUpdate('users',
        { name: newName },
        { id: this.userProfile.id }
      );

      this.userProfile.name = newName;
      console.log('[SETTINGS_SCREEN] Name saved successfully');
      alert('Name saved!');
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error saving name:', err);
      alert('Error saving name');
    }
  }

  /**
   * Handle hardcore mode toggle
   */
  async onHardcoreModeChange(enabled) {
    try {
      console.log('[SETTINGS_SCREEN] Hardcore mode:', enabled);

      await queryUpdate('users',
        { hardcore_mode_enabled: enabled },
        { id: this.userProfile.id }
      );

      this.userProfile.hardcore_mode_enabled = enabled;
      console.log('[SETTINGS_SCREEN] Hardcore mode updated');
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error updating hardcore mode:', err);
    }
  }

  /**
   * Handle leave coop
   */
  async onLeaveCoop(coopId) {
    if (!confirm('Are you sure you want to leave this coop?')) {
      return;
    }

    try {
      console.log('[SETTINGS_SCREEN] Leaving coop:', coopId);

      // Update user's coop_id to null
      await queryUpdate('users',
        { coop_id: null },
        { id: this.userProfile.id }
      );

      this.userProfile.coop_id = null;
      this.userCoops = [];

      console.log('[SETTINGS_SCREEN] Left coop successfully');
      this.render(); // Re-render to update UI
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error leaving coop:', err);
      alert('Error leaving coop');
    }
  }

  /**
   * Handle join coop submit
   */
  async onJoinCoopSubmit() {
    try {
      const codeInput = document.getElementById('join-code-input');
      const code = codeInput?.value?.trim();

      if (!code) {
        alert('Please enter a join code');
        return;
      }

      console.log('[SETTINGS_SCREEN] Joining coop with code:', code);

      // Find coop by join code
      const coops = await querySelect('coops', {
        eq: { join_code: code }
      });

      if (!coops || coops.length === 0) {
        alert('Invalid join code');
        return;
      }

      const coop = coops[0];
      console.log('[SETTINGS_SCREEN] Found coop:', coop.name);

      // Add user to coop members
      const updatedMembers = [...(coop.member_ids || []), this.userProfile.id];

      await queryUpdate('coops',
        { member_ids: updatedMembers },
        { id: coop.id }
      );

      // Update user's coop_id
      await queryUpdate('users',
        { coop_id: coop.id },
        { id: this.userProfile.id }
      );

      this.userProfile.coop_id = coop.id;
      this.userCoops = [coop];

      console.log('[SETTINGS_SCREEN] Joined coop successfully');
      alert(`Joined ${coop.name}!`);
      this.render(); // Re-render to update UI
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error joining coop:', err);
      alert('Error joining coop');
    }
  }

  /**
   * Handle logout
   */
  async onLogout() {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      console.log('[SETTINGS_SCREEN] Logging out...');

      const { signOut } = await import('../../logic/supabaseClient.js');
      await signOut();

      // Clear any local state
      window.dispatchEvent(new CustomEvent('logout'));
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error logging out:', err);
      alert('Error logging out');
    }
  }

  /**
   * Handle back button
   */
  onBackClick() {
    console.log('[SETTINGS_SCREEN] Back clicked');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'home' }
    }));
  }
}

console.log('[SETTINGS_SCREEN] Module loaded');
