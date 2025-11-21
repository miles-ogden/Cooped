/**
 * Coop View Screen
 * Displays coop stats, leaderboard, and management options
 */

import { querySelect, queryUpdate, getCurrentUser } from '../../logic/supabaseClient.js';
import { getCoopData } from '../../logic/coopManager.js';

export class CoopView {
  constructor() {
    this.coop = null;
    this.members = [];
    this.currentUser = null;
    console.log('[COOP_VIEW] Initialized');
  }

  /**
   * Load coop data and render screen
   */
  async show() {
    try {
      console.log('[COOP_VIEW] Loading coop view...');

      this.currentUser = await getCurrentUser(true);
      if (!this.currentUser) {
        console.error('[COOP_VIEW] No authenticated user');
        return;
      }

      // Get user's coop
      const userProfile = await querySelect('users', {
        eq: { id: this.currentUser.id },
        single: true
      });

      if (!userProfile || !userProfile.coop_id) {
        console.warn('[COOP_VIEW] User not in a coop');
        alert('You are not in a coop');
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'home' }
        }));
        return;
      }

      // Get coop data and members using the new RLS-compatible function
      const result = await getCoopData(userProfile.coop_id);

      if (!result.success) {
        console.error('[COOP_VIEW] Error loading coop data:', result.error);
        alert('Error loading coop data');
        return;
      }

      this.coop = result.coop;
      this.members = result.members;

      console.log(`[COOP_VIEW] ✅ Loaded coop: ${this.coop.name}`)
      console.log(`[COOP_VIEW] 👥 Members: ${this.members.length}/${this.coop.member_ids?.length || 0}`);

      this.render();
    } catch (err) {
      console.error('[COOP_VIEW] Error loading coop:', err);
    }
  }

  /**
   * Render coop view screen
   */
  render() {
    const screenContainer = document.getElementById('screen-container');
    if (!screenContainer) {
      console.warn('[COOP_VIEW] Screen container not found');
      return;
    }

    const statsHTML = this.renderStats();
    const leaderboardHTML = this.renderLeaderboard();
    const actionsHTML = this.renderActions();

    const html = `
      <div class="coop-view-screen">
        <div class="coop-header">
          <h2>${this.coop.name}</h2>
          <button class="btn-icon" id="back-btn" title="Back to home">⬅</button>
        </div>

        <div class="coop-content">
          ${statsHTML}
          ${leaderboardHTML}
          ${actionsHTML}
        </div>
      </div>
    `;

    screenContainer.innerHTML = html;
    this.attachEventListeners();
    console.log('[COOP_VIEW] Rendered coop view');
  }

  /**
   * Render coop stats section
   */
  renderStats() {
    const createdDate = new Date(this.coop.created_at).toLocaleDateString();
    const totalXP = this.members.reduce((sum, m) => sum + (m.xp_total || 0), 0);

    return `
      <section class="coop-stats">
        <h3>Coop Stats</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Members</span>
            <span class="stat-value">${this.members.length} / ${this.coop.max_members || 8}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Level</span>
            <span class="stat-value">${this.coop.coop_level || 1}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total XP</span>
            <span class="stat-value">${totalXP.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Members</span>
            <span class="stat-value">${this.coop.memberCount || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Founded</span>
            <span class="stat-value">${createdDate}</span>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Render leaderboard section
   */
  renderLeaderboard() {
    const medals = ['👑', '🥈', '🥉'];

    const leaderboardRows = this.members.map((member, index) => {
      const medal = medals[index] || `${index + 1}`;
      const isCurrentUser = member.id === this.currentUser.id;
      const highlightClass = isCurrentUser ? 'current-user' : '';

      return `
        <div class="leaderboard-row ${highlightClass}">
          <div class="rank">
            <span class="medal">${medal}</span>
          </div>
          <div class="member-info">
            <div class="member-name">${member.name || 'Unknown'}</div>
            <div class="member-details">
              <span class="chicken-emoji">🐔 ${member.id === this.currentUser.id ? 'You' : member.name}</span>
            </div>
          </div>
          <div class="member-stats">
            <div class="level">Level ${member.level || 1}</div>
            <div class="xp">${member.xp_total || 0} XP</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="coop-leaderboard">
        <h3>Leaderboard</h3>
        <div class="leaderboard">
          ${leaderboardRows}
        </div>
      </section>
    `;
  }

  /**
   * Render action buttons
   */
  renderActions() {
    const isCreator = this.coop.creator_user_id === this.currentUser.id;

    return `
      <section class="coop-actions">
        <button class="btn-secondary" id="invite-btn" title="Invite friends">👥 Invite</button>
        ${isCreator ? `<button class="btn-secondary" id="coop-settings-btn" title="Coop settings">⚙️ Settings</button>` : ''}
        <button class="btn-danger" id="leave-btn" title="Leave this coop">🚪 Leave</button>
      </section>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    console.log('[COOP_VIEW] Attaching event listeners');

    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.onBackClick();
    });

    // Invite button
    document.getElementById('invite-btn')?.addEventListener('click', () => {
      this.onInviteClick();
    });

    // Settings button (if creator)
    const settingsBtn = document.getElementById('coop-settings-btn');
    console.log('[COOP_VIEW] Coop settings button element:', settingsBtn ? 'found' : 'NOT FOUND');
    if (settingsBtn) {
      console.log('[COOP_VIEW] Attaching coop settings button listener');
      settingsBtn.addEventListener('click', () => {
        console.log('[COOP_VIEW] Coop settings button clicked!');
        this.onSettingsClick();
      });
    }

    // Leave button
    document.getElementById('leave-btn')?.addEventListener('click', () => {
      this.onLeaveClick();
    });

    console.log('[COOP_VIEW] Event listeners attached');
  }

  /**
   * Handle back click
   */
  onBackClick() {
    console.log('[COOP_VIEW] Back clicked');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'home' }
    }));
  }

  /**
   * Handle invite click
   */
  onInviteClick() {
    console.log('[COOP_VIEW] Invite clicked');
    const joinCode = this.coop.join_code;
    const message = `Join my coop ${this.coop.name}! Code: ${joinCode}`;

    // Try to use share API if available
    if (navigator.share) {
      navigator.share({
        title: `Join ${this.coop.name}`,
        text: message
      }).catch(err => console.log('[COOP_VIEW] Share canceled:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(message).then(() => {
        alert(`Copied to clipboard:\n${message}`);
      });
    }
  }

  /**
   * Handle settings click (for creator)
   */
  onSettingsClick() {
    console.log('[COOP_VIEW] Settings clicked');
    console.log('[COOP_VIEW] Coop ID:', this.coop.id);
    console.log('[COOP_VIEW] Dispatching navigateToScreen event');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'coop-settings', coopId: this.coop.id }
    }));
    console.log('[COOP_VIEW] Event dispatched');
  }

  /**
   * Handle leave coop
   */
  async onLeaveClick() {
    const confirmed = confirm(`Are you sure you want to leave ${this.coop.name}?`);
    if (!confirmed) return;

    try {
      console.log('[COOP_VIEW] Leaving coop:', this.coop.id);

      // Remove user from coop member_ids array
      const updatedMembers = (this.coop.member_ids || []).filter(id => id !== this.currentUser.id);

      await queryUpdate('coops',
        { member_ids: updatedMembers },
        { id: this.coop.id }
      );

      // Update user's coop_id to null
      await queryUpdate('users',
        { coop_id: null },
        { id: this.currentUser.id }
      );

      console.log('[COOP_VIEW] Left coop successfully');
      alert(`You've left ${this.coop.name}`);

      // Navigate back to home
      window.dispatchEvent(new CustomEvent('navigateToScreen', {
        detail: { screen: 'home' }
      }));

    } catch (err) {
      console.error('[COOP_VIEW] Error leaving coop:', err);
      alert('Error leaving coop: ' + err.message);
    }
  }
}

console.log('[COOP_VIEW] Module loaded');
