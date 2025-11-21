/**
 * Settings Screen Manager
 * Handles personal settings, hardcore mode, coop management, blocklist, and logout
 */

import { querySelect, queryUpdate, getCurrentUser } from '../../logic/supabaseClient.js';
import { getSettings, addBlockedSite, removeBlockedSite, updateBlockingLevel, clearAllSiteIntervals } from '../../utils/storage.js';
import { getUserTimezone, setUserTimezone } from '../../utils/time-tracking.js';

export class SettingsScreen {
  constructor() {
    this.userProfile = null;
    this.userCoops = [];
    this.blockedSites = [];
    this.currentTimezone = 'UTC';
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

      // Load blocked sites from local storage
      const settings = await getSettings();
      this.blockedSites = settings.blockedSites || [];

      // Load user timezone
      this.currentTimezone = await getUserTimezone();

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

    // Build blocklist HTML
    const blockedSitesHtml = this.blockedSites.length > 0
      ? this.blockedSites.map((site, idx) => {
          // Handle both old string format and new object format
          const domain = typeof site === 'string' ? site : site.domain;
          const blockingLevel = typeof site === 'string' ? 'some' : (site.blockingLevel || 'some');

          return `
        <div class="blocked-site-item">
          <div class="site-info">
            <span class="site-name">${domain}</span>
            <select class="blocking-level-select" data-domain="${domain}" title="Change blocking level">
              <option value="fully" ${blockingLevel === 'fully' ? 'selected' : ''}>Fully Block</option>
              <option value="some" ${blockingLevel === 'some' ? 'selected' : ''}>Some Leeway</option>
              <option value="a_lot" ${blockingLevel === 'a_lot' ? 'selected' : ''}>A Lot of Leeway</option>
            </select>
          </div>
          <button class="btn-danger btn-sm" data-action="remove-site" data-domain="${domain}" title="Unblock site">✕</button>
        </div>
      `;
        }).join('')
      : '<p class="text-muted">No blocked sites yet</p>';

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

            <div class="setting-item">
              <label for="timezone-preference">Timezone</label>
              <select id="timezone-preference">
                <optgroup label="US">
                  <option value="America/New_York" ${this.currentTimezone === 'America/New_York' ? 'selected' : ''}>Eastern Time</option>
                  <option value="America/Chicago" ${this.currentTimezone === 'America/Chicago' ? 'selected' : ''}>Central Time</option>
                  <option value="America/Denver" ${this.currentTimezone === 'America/Denver' ? 'selected' : ''}>Mountain Time</option>
                  <option value="America/Los_Angeles" ${this.currentTimezone === 'America/Los_Angeles' ? 'selected' : ''}>Pacific Time</option>
                  <option value="America/Anchorage" ${this.currentTimezone === 'America/Anchorage' ? 'selected' : ''}>Alaska</option>
                  <option value="Pacific/Honolulu" ${this.currentTimezone === 'Pacific/Honolulu' ? 'selected' : ''}>Hawaii</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London" ${this.currentTimezone === 'Europe/London' ? 'selected' : ''}>London</option>
                  <option value="Europe/Paris" ${this.currentTimezone === 'Europe/Paris' ? 'selected' : ''}>Central European</option>
                  <option value="Europe/Moscow" ${this.currentTimezone === 'Europe/Moscow' ? 'selected' : ''}>Moscow</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="Asia/Dubai" ${this.currentTimezone === 'Asia/Dubai' ? 'selected' : ''}>Dubai</option>
                  <option value="Asia/Kolkata" ${this.currentTimezone === 'Asia/Kolkata' ? 'selected' : ''}>India</option>
                  <option value="Asia/Bangkok" ${this.currentTimezone === 'Asia/Bangkok' ? 'selected' : ''}>Bangkok</option>
                  <option value="Asia/Hong_Kong" ${this.currentTimezone === 'Asia/Hong_Kong' ? 'selected' : ''}>Hong Kong</option>
                  <option value="Asia/Tokyo" ${this.currentTimezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo</option>
                  <option value="Asia/Seoul" ${this.currentTimezone === 'Asia/Seoul' ? 'selected' : ''}>Seoul</option>
                  <option value="Asia/Singapore" ${this.currentTimezone === 'Asia/Singapore' ? 'selected' : ''}>Singapore</option>
                </optgroup>
                <optgroup label="Australia">
                  <option value="Australia/Perth" ${this.currentTimezone === 'Australia/Perth' ? 'selected' : ''}>Perth</option>
                  <option value="Australia/Sydney" ${this.currentTimezone === 'Australia/Sydney' ? 'selected' : ''}>Sydney</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="UTC" ${this.currentTimezone === 'UTC' ? 'selected' : ''}>UTC</option>
                </optgroup>
              </select>
              <p class="setting-description">Changes how daily/weekly boundaries are calculated</p>
            </div>
          </section>

          <!-- Blocklist Section -->
          <section class="settings-section">
            <h3>Blocked Websites</h3>

            <div class="blocked-sites-list">
              <h4>Currently Blocked</h4>
              ${blockedSitesHtml}
            </div>

            <div class="add-blocked-site-form">
              <h4>Block a Website</h4>
              <div class="form-group">
                <input
                  type="text"
                  id="new-site-input"
                  placeholder="e.g., youtube.com or reddit.com"
                  maxlength="100"
                >
                <button class="btn-primary" id="add-site-submit">Block Site</button>
              </div>
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
            <button class="btn-secondary" id="clear-intervals-btn" style="margin-bottom: 10px;">
              🔄 Clear Challenge Cooldowns
            </button>
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

    // Timezone preference change
    document.getElementById('timezone-preference')?.addEventListener('change', (e) => {
      this.onTimezoneChange(e.target.value);
    });

    // Add blocked site
    document.getElementById('add-site-submit')?.addEventListener('click', () => {
      this.onAddSiteClick();
    });

    // Blocking level dropdown
    document.querySelectorAll('.blocking-level-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const domain = e.target.getAttribute('data-domain');
        const level = e.target.value;
        this.onBlockingLevelChange(domain, level);
      });
    });

    // Remove blocked sites
    document.querySelectorAll('[data-action="remove-site"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.getAttribute('data-domain');
        this.onRemoveSiteClick(domain);
      });
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

    // Clear intervals button
    document.getElementById('clear-intervals-btn')?.addEventListener('click', () => {
      this.onClearIntervals();
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
   * Handle add blocked site
   */
  async onAddSiteClick() {
    try {
      const input = document.getElementById('new-site-input');
      const newSite = input?.value?.trim();

      if (!newSite) {
        alert('Please enter a website URL');
        return;
      }

      // Check if site is already blocked
      const exists = this.blockedSites.some(s => {
        const domain = typeof s === 'string' ? s : s.domain;
        return domain === newSite;
      });

      if (exists) {
        alert('This site is already blocked');
        return;
      }

      console.log('[SETTINGS_SCREEN] Adding blocked site:', newSite);

      await addBlockedSite(newSite, 'some');  // Default to 'some' leeway
      const settings = await getSettings();
      this.blockedSites = settings.blockedSites || [];

      console.log('[SETTINGS_SCREEN] Site blocked successfully');
      input.value = '';
      this.render(); // Re-render to update list
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error adding blocked site:', err);
      alert('Error blocking site');
    }
  }

  /**
   * Handle blocking level change
   */
  async onBlockingLevelChange(domain, blockingLevel) {
    try {
      console.log('[SETTINGS_SCREEN] Changing blocking level for:', domain, blockingLevel);

      await updateBlockingLevel(domain, blockingLevel);
      const settings = await getSettings();
      this.blockedSites = settings.blockedSites || [];

      console.log('[SETTINGS_SCREEN] Blocking level updated successfully');
      this.render(); // Re-render to show updated level
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error updating blocking level:', err);
      alert('Error updating blocking level');
    }
  }

  /**
   * Handle remove blocked site
   */
  async onRemoveSiteClick(domain) {
    try {
      if (!confirm(`Remove ${domain} from blocked sites?`)) {
        return;
      }

      console.log('[SETTINGS_SCREEN] Removing blocked site:', domain);

      await removeBlockedSite(domain);
      const settings = await getSettings();
      this.blockedSites = settings.blockedSites || [];

      console.log('[SETTINGS_SCREEN] Site unblocked successfully');
      this.render(); // Re-render to update list
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error removing blocked site:', err);
      alert('Error unblocking site');
    }
  }

  /**
   * Clear all challenge cooldown intervals
   */
  async onClearIntervals() {
    try {
      console.log('[SETTINGS_SCREEN] Clearing all challenge cooldowns...');
      await clearAllSiteIntervals();
      alert('Challenge cooldowns cleared! You can now see popups on all sites.');
      console.log('[SETTINGS_SCREEN] All intervals cleared successfully');
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error clearing intervals:', err);
      alert('Error clearing cooldowns');
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
   * Handle timezone change
   */
  async onTimezoneChange(timezone) {
    try {
      console.log('[SETTINGS_SCREEN] Changing timezone to:', timezone);

      // Save timezone to local storage
      await setUserTimezone(timezone);
      this.currentTimezone = timezone;

      console.log('[SETTINGS_SCREEN] Timezone updated successfully');
    } catch (err) {
      console.error('[SETTINGS_SCREEN] Error updating timezone:', err);
      alert('Error updating timezone');
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
