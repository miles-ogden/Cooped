/**
 * Analytics Screen Manager
 * Displays time tracking data for blocked websites with blocking levels
 */

import { getCurrentUser, querySelect } from '../../logic/supabaseClient.js';
import { getBlockedSites, getBlockingLevel } from '../../utils/storage.js';

export class AnalyticsScreen {
  constructor() {
    this.userProfile = null;
    this.blockedSites = [];
    this.timeTrackingData = {};
    console.log('[ANALYTICS_SCREEN] Initialized');
  }

  /**
   * Load analytics data and render screen
   */
  async show() {
    try {
      console.log('[ANALYTICS_SCREEN] Loading analytics data...');

      // Get authenticated user
      const user = await getCurrentUser(true);
      if (!user) {
        console.error('[ANALYTICS_SCREEN] No authenticated user');
        this.renderError('Not authenticated');
        return;
      }

      // Get user profile for basic info
      this.userProfile = await querySelect('users', {
        eq: { id: user.id },
        single: true
      });

      if (!this.userProfile) {
        console.error('[ANALYTICS_SCREEN] User profile not found');
        this.renderError('User profile not found');
        return;
      }

      // Get blocked sites from local storage
      const sites = await getBlockedSites();
      this.blockedSites = sites;

      // Fetch time tracking data from database
      await this.loadTimeTrackingData(user.id);

      // Render the analytics screen
      this.render();

      console.log('[ANALYTICS_SCREEN] Analytics data loaded and rendered');
    } catch (error) {
      console.error('[ANALYTICS_SCREEN] Error loading analytics:', error);
      this.renderError(`Error loading analytics: ${error.message}`);
    }
  }

  /**
   * Load time tracking data from database
   */
  async loadTimeTrackingData(userId) {
    try {
      // Query time_tracking table for this user
      const trackingRecords = await querySelect('time_tracking', {
        eq: { user_id: userId },
        select: 'domain,total_active_minutes,last_activity'
      });

      // Organize by domain
      if (trackingRecords && Array.isArray(trackingRecords)) {
        trackingRecords.forEach(record => {
          this.timeTrackingData[record.domain] = {
            minutes: record.total_active_minutes || 0,
            lastActivity: record.last_activity ? new Date(record.last_activity) : null
          };
        });
      }

      console.log('[ANALYTICS_SCREEN] Time tracking data loaded:', this.timeTrackingData);
    } catch (error) {
      console.error('[ANALYTICS_SCREEN] Error loading time tracking data:', error);
      // Continue without time tracking data
    }
  }

  /**
   * Render the analytics screen
   */
  render() {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-screen">
        <div class="analytics-header">
          <h1>📊 Time Analytics</h1>
          <p class="subtitle">Track your time on blocked websites</p>
        </div>

        <div class="analytics-content">
          ${this.renderAnalyticsTable()}
        </div>

        <div class="analytics-footer">
          <p class="note">💡 Blocking levels control when popups appear. Go to Settings to change them.</p>
        </div>
      </div>
    `;

    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Render the analytics table
   */
  renderAnalyticsTable() {
    if (this.blockedSites.length === 0) {
      return `
        <div class="empty-state">
          <p>No blocked websites yet.</p>
          <p class="small-text">Go to Settings to add websites.</p>
        </div>
      `;
    }

    // Create table rows for each blocked site
    const rows = this.blockedSites.map(site => {
      // Handle both old string format and new object format
      const domain = typeof site === 'string' ? site : site.domain;
      const blockingLevel = typeof site === 'string' ? 'some' : (site.blockingLevel || 'some');

      // Get time tracking data for this domain
      const timeData = this.timeTrackingData[domain];
      const totalMinutes = timeData?.minutes || 0;
      const lastActivity = timeData?.lastActivity;

      // Format time display
      const timeDisplay = this.formatTimeDisplay(totalMinutes);
      const lastActivityDisplay = lastActivity
        ? this.formatLastActivity(lastActivity)
        : 'Never';

      // Get blocking level display
      const blockingLevelDisplay = this.getBlockingLevelDisplay(blockingLevel);

      return `
        <div class="analytics-row">
          <div class="site-info">
            <div class="domain-name">${domain}</div>
            <div class="domain-details">
              <span class="last-activity">Last: ${lastActivityDisplay}</span>
            </div>
          </div>

          <div class="time-info">
            <div class="total-time">${timeDisplay}</div>
            <span class="time-label">total time</span>
          </div>

          <div class="blocking-level ${blockingLevel}">
            <span class="level-badge">${blockingLevelDisplay}</span>
          </div>

          <button class="btn-goto-settings" data-domain="${domain}">
            ⚙️ Edit
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="analytics-table">
        ${rows}
      </div>
    `;
  }

  /**
   * Format time for display
   */
  formatTimeDisplay(minutes) {
    if (minutes === 0) {
      return '0m';
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  /**
   * Format last activity time
   */
  formatLastActivity(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get blocking level display text
   */
  getBlockingLevelDisplay(blockingLevel) {
    const levelMap = {
      'fully': '🔒 Fully Block',
      'some': '⏱️ Some Leeway',
      'a_lot': '🎯 A Lot of Leeway'
    };
    return levelMap[blockingLevel] || '⏱️ Some Leeway';
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Edit button listeners
    document.querySelectorAll('.btn-goto-settings').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.getAttribute('data-domain');
        this.goToSettings(domain);
      });
    });
  }

  /**
   * Navigate to settings with domain pre-selected
   */
  goToSettings(domain) {
    // Dispatch custom event that popup.js can listen to
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'settings', domain }
    }));
  }

  /**
   * Render error message
   */
  renderError(message) {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-screen">
        <div class="error-state">
          <p class="error-message">❌ ${message}</p>
        </div>
      </div>
    `;
  }
}

export default AnalyticsScreen;
