/**
 * Coop Settings Screen
 * Allows creator to configure coop settings
 */

import { querySelect, queryUpdate, getCurrentUser, queryInsert } from '../../logic/supabaseClient.js';
import { generateSideQuest } from '../../logic/sideQuestSystem.js';

export class CoopSettingsScreen {
  constructor() {
    this.coop = null;
    this.currentUser = null;
    this.questTopics = {
      learning: ['General Knowledge', 'Math', 'History', 'Vocabulary'],
      fun: ['Trivia', 'Sports', 'Movies & Media', 'Pop Culture'],
      random: ['Real Life Events']
    };
    console.log('[COOP_SETTINGS] Initialized');
  }

  /**
   * Load coop data and render settings
   * @param {string} coopId - The coop ID to load
   */
  async show(coopId) {
    try {
      console.log('[COOP_SETTINGS] Loading coop settings for:', coopId);

      // Validate coopId
      if (!coopId) {
        console.error('[COOP_SETTINGS] No coop ID provided');
        alert('No coop selected. Please select a coop first.');
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'home' }
        }));
        return;
      }

      this.currentUser = await getCurrentUser(true);
      if (!this.currentUser) {
        console.error('[COOP_SETTINGS] No authenticated user');
        alert('You must be logged in to access coop settings');
        return;
      }

      console.log('[COOP_SETTINGS] Fetching coop with ID:', coopId);

      // Get coop details
      this.coop = await querySelect('coops', {
        eq: { id: coopId },
        single: true
      });

      console.log('[COOP_SETTINGS] Fetch result:', this.coop);

      if (!this.coop) {
        console.error('[COOP_SETTINGS] Coop not found');
        alert('Coop not found');
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'home' }
        }));
        return;
      }

      // Check if user is creator
      if (this.coop.creator_user_id !== this.currentUser.id) {
        console.error('[COOP_SETTINGS] User is not the creator');
        alert('Only the creator can modify coop settings');
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'coop' }
        }));
        return;
      }

      this.render();
    } catch (err) {
      console.error('[COOP_SETTINGS] Error loading coop settings:', err);
      console.error('[COOP_SETTINGS] Error stack:', err.stack);
      alert('Error loading coop settings: ' + err.message);
    }
  }

  /**
   * Render coop settings screen
   */
  render() {
    const screenContainer = document.getElementById('screen-container');
    if (!screenContainer) {
      console.warn('[COOP_SETTINGS] Screen container not found');
      return;
    }

    const html = `
      <div class="coop-settings-screen">
        <div class="settings-header">
          <h2>${this.coop.name} - Settings</h2>
          <button class="btn-icon" id="back-btn" title="Back">⬅</button>
        </div>

        <div class="settings-content">
          <!-- Coop Name -->
          <section class="settings-section">
            <h3>Coop Name</h3>
            <div class="form-group">
              <input
                type="text"
                id="coop-name"
                placeholder="Coop name"
                value="${this.coop.name || ''}"
                maxlength="50"
              >
              <button class="btn-sm" id="save-name-btn">Save Name</button>
            </div>
          </section>

          <!-- Question Type -->
          <section class="settings-section">
            <h3>Question Type</h3>
            <div class="form-group">
              <label for="blocker-question-type">Blocker Question Type</label>
              <select id="blocker-question-type">
                <option value="general" ${this.coop.blocker_question_type === 'general' ? 'selected' : ''}>General</option>
                <option value="math" ${this.coop.blocker_question_type === 'math' ? 'selected' : ''}>Math</option>
                <option value="vocabulary" ${this.coop.blocker_question_type === 'vocabulary' ? 'selected' : ''}>Vocabulary</option>
                <option value="history" ${this.coop.blocker_question_type === 'history' ? 'selected' : ''}>History</option>
              </select>
            </div>
          </section>

          <!-- Side Quests Section -->
          <section class="settings-section">
            <h3>Side Quests</h3>

            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="side-quests-toggle" ${this.coop.side_quests_enabled ? 'checked' : ''}>
                <span>Enable Side Quests</span>
              </label>
            </div>

            <div id="side-quests-options" style="${!this.coop.side_quests_enabled ? 'display: none;' : ''}">
              <div class="form-group">
                <label for="side-quest-category">Quest Category</label>
                <select id="side-quest-category" class="form-select">
                  <option value="learning" ${this.coop.side_quest_category === 'learning' ? 'selected' : ''}>Learning</option>
                  <option value="fun" ${this.coop.side_quest_category === 'fun' ? 'selected' : ''}>Fun</option>
                  <option value="random" ${this.coop.side_quest_category === 'random' ? 'selected' : ''}>Random</option>
                </select>
              </div>

              <!-- Topic Selection Menu -->
              <div id="topic-selection" class="form-group topic-selection-menu">
                <label>Topics</label>
                ${this.renderTopicCheckboxes()}
              </div>

              <div class="form-group">
                <label for="side-quest-frequency">Frequency</label>
                <select id="side-quest-frequency" class="form-select">
                  <option value="daily-1" ${this.coop.side_quest_frequency === 'daily' && this.coop.side_quest_frequency_value === 1 ? 'selected' : ''}>Once per day</option>
                  <option value="daily-2" ${this.coop.side_quest_frequency === 'daily' && this.coop.side_quest_frequency_value === 2 ? 'selected' : ''}>Twice per day</option>
                  <option value="daily-3" ${this.coop.side_quest_frequency === 'daily' && this.coop.side_quest_frequency_value === 3 ? 'selected' : ''}>3 times per day</option>
                  <option value="weekly-1" ${this.coop.side_quest_frequency === 'weekly' && this.coop.side_quest_frequency_value === 1 ? 'selected' : ''}>Once per week</option>
                  <option value="weekly-2" ${this.coop.side_quest_frequency === 'weekly' && this.coop.side_quest_frequency_value === 2 ? 'selected' : ''}>Bi-weekly</option>
                  <option value="weekly-3" ${this.coop.side_quest_frequency === 'weekly' && this.coop.side_quest_frequency_value === 3 ? 'selected' : ''}>3 times per week</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Member Limit -->
          <section class="settings-section">
            <h3>Member Limit</h3>
            <div class="form-group">
              <label>Maximum Members</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="max-members" value="4" ${this.coop.max_members === 4 ? 'checked' : ''}>
                  4
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="6" ${this.coop.max_members === 6 ? 'checked' : ''}>
                  6
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="8" ${this.coop.max_members === 8 ? 'checked' : ''}>
                  8
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="10" ${(this.coop.max_members === 10 || !this.coop.max_members) ? 'checked' : ''}>
                  10
                </label>
              </div>
              <p class="help-text">Current members: ${this.coop.member_ids?.length || 0}</p>
            </div>
          </section>

          <!-- Save Settings Button -->
          <section class="settings-section">
            <button class="btn-primary" id="save-settings-btn">Save All Settings</button>
          </section>

          <!-- Coop Info -->
          <section class="settings-section">
            <h3>Coop Info</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Coop ID</label>
                <span class="info-value">${this.coop.id}</span>
              </div>
              <div class="info-item">
                <label>Created</label>
                <span class="info-value">${new Date(this.coop.created_at).toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <label>Members</label>
                <span class="info-value">${this.coop.member_ids?.length || 0}</span>
              </div>
            </div>
          </section>

          <!-- Testing Section -->
          <section class="settings-section">
            <h3>🧪 Testing</h3>
            <p class="help-text">Create a test side quest to see how it looks on the home screen</p>
            <button class="btn-secondary" id="create-test-quest-btn">Create Test Side Quest</button>
          </section>

          <!-- Danger Zone -->
          <section class="settings-section danger-zone">
            <h3>⚠️ Danger Zone</h3>
            <p class="help-text">Once you delete a coop, there is no going back. Be careful!</p>
            <button class="btn-danger" id="delete-coop-btn">Delete Coop</button>
          </section>
        </div>
      </div>
    `;

    screenContainer.innerHTML = html;
    this.attachEventListeners();
    console.log('[COOP_SETTINGS] Rendered coop settings');
  }

  /**
   * Render topic checkboxes based on selected category
   */
  renderTopicCheckboxes() {
    const category = this.coop.side_quest_category || 'learning';
    const topics = this.questTopics[category] || [];
    const selectedTopics = this.coop.side_quest_topics || [];

    let html = '<div class="topic-checkboxes">';
    topics.forEach(topic => {
      const isChecked = selectedTopics.includes(topic);
      html += `
        <label class="topic-checkbox">
          <input type="checkbox" class="topic-item" value="${topic}" ${isChecked ? 'checked' : ''}>
          <span class="checkbox-mark">✓</span>
          <span class="topic-label">${topic}</span>
        </label>
      `;
    });
    html += '</div>';
    return html;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.onBackClick();
    });

    // Save name (individual button)
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
      this.onSaveNameClick();
    });

    // Side quests toggle
    document.getElementById('side-quests-toggle')?.addEventListener('change', (e) => {
      const optionsDiv = document.getElementById('side-quests-options');
      if (optionsDiv) {
        optionsDiv.style.display = e.target.checked ? '' : 'none';
      }
      this.coop.side_quests_enabled = e.target.checked;
    });

    // Side quest category change
    document.getElementById('side-quest-category')?.addEventListener('change', (e) => {
      this.coop.side_quest_category = e.target.value;
      // Re-render topic checkboxes for new category
      const topicSelectionDiv = document.getElementById('topic-selection');
      if (topicSelectionDiv) {
        topicSelectionDiv.innerHTML = `<label>Topics</label>${this.renderTopicCheckboxes()}`;
        this.attachTopicCheckboxListeners();
      }
    });

    // Attach listeners for topic checkboxes
    this.attachTopicCheckboxListeners();

    // Save all settings button
    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
      this.onSaveAllSettingsClick();
    });

    // Create test side quest
    document.getElementById('create-test-quest-btn')?.addEventListener('click', () => {
      this.onCreateTestQuestClick();
    });

    // Delete coop
    document.getElementById('delete-coop-btn')?.addEventListener('click', () => {
      this.onDeleteCoopClick();
    });
  }

  /**
   * Attach listeners for topic checkboxes
   */
  attachTopicCheckboxListeners() {
    document.querySelectorAll('.topic-item').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (!this.coop.side_quest_topics) {
          this.coop.side_quest_topics = [];
        }

        if (e.target.checked) {
          if (!this.coop.side_quest_topics.includes(e.target.value)) {
            this.coop.side_quest_topics.push(e.target.value);
          }
        } else {
          this.coop.side_quest_topics = this.coop.side_quest_topics.filter(t => t !== e.target.value);
        }
        console.log('[COOP_SETTINGS] Selected topics:', this.coop.side_quest_topics);
      });
    });
  }

  /**
   * Handle back click
   */
  onBackClick() {
    console.log('[COOP_SETTINGS] Back clicked');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'coop' }
    }));
  }

  /**
   * Handle save name
   */
  async onSaveNameClick() {
    try {
      const newName = document.getElementById('coop-name')?.value?.trim();

      if (!newName) {
        alert('Coop name cannot be empty');
        return;
      }

      if (newName === this.coop.name) {
        console.log('[COOP_SETTINGS] Name unchanged');
        return;
      }

      console.log('[COOP_SETTINGS] Saving coop name:', newName);

      await queryUpdate('coops',
        { name: newName, updated_at: new Date().toISOString() },
        { id: this.coop.id }
      );

      this.coop.name = newName;
      alert('Coop name updated successfully!');
      console.log('[COOP_SETTINGS] Coop name saved');
    } catch (err) {
      console.error('[COOP_SETTINGS] Error saving name:', err);
      alert('Error saving coop name: ' + err.message);
    }
  }

  /**
   * Handle save all settings
   */
  async onSaveAllSettingsClick() {
    try {
      const questionType = document.getElementById('blocker-question-type')?.value;
      const maxMembersRadio = document.querySelector('input[name="max-members"]:checked');
      const maxMembers = maxMembersRadio ? parseInt(maxMembersRadio.value) : 10;

      // Parse side quest frequency
      const frequencyValue = document.getElementById('side-quest-frequency')?.value;
      let sideQuestFrequency = 'daily';
      let sideQuestFrequencyValue = 1;
      if (frequencyValue) {
        const parts = frequencyValue.split('-');
        sideQuestFrequency = parts[0];
        sideQuestFrequencyValue = parseInt(parts[1]);
      }

      console.log('[COOP_SETTINGS] Saving settings:', {
        questionType,
        maxMembers,
        sideQuestsEnabled: this.coop.side_quests_enabled,
        sideQuestCategory: this.coop.side_quest_category,
        sideQuestTopics: this.coop.side_quest_topics,
        sideQuestFrequency,
        sideQuestFrequencyValue
      });

      const updateData = {
        blocker_question_type: questionType,
        max_members: maxMembers,
        side_quests_enabled: this.coop.side_quests_enabled,
        side_quest_category: this.coop.side_quest_category,
        side_quest_topics: this.coop.side_quest_topics || [],
        side_quest_frequency: sideQuestFrequency,
        side_quest_frequency_value: sideQuestFrequencyValue,
        updated_at: new Date().toISOString()
      };

      await queryUpdate('coops', updateData, { id: this.coop.id });

      // Update local coop data
      this.coop.blocker_question_type = questionType;
      this.coop.max_members = maxMembers;
      this.coop.side_quests_enabled = updateData.side_quests_enabled;
      this.coop.side_quest_category = updateData.side_quest_category;
      this.coop.side_quest_topics = updateData.side_quest_topics;
      this.coop.side_quest_frequency = sideQuestFrequency;
      this.coop.side_quest_frequency_value = sideQuestFrequencyValue;

      alert('Coop settings updated successfully!');
      console.log('[COOP_SETTINGS] All settings saved');
    } catch (err) {
      console.error('[COOP_SETTINGS] Error saving settings:', err);
      alert('Error saving settings: ' + err.message);
    }
  }

  /**
   * Handle delete coop
   */
  async onDeleteCoopClick() {
    const confirmed = confirm(
      `Are you absolutely sure you want to delete "${this.coop.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const doubleConfirmed = confirm(
      'This will permanently delete the coop and remove all members. Type DELETE to confirm.'
    );

    if (!doubleConfirmed) return;

    try {
      console.log('[COOP_SETTINGS] Deleting coop:', this.coop.id);

      // Remove all members from coop
      const memberIds = this.coop.member_ids || [];
      for (const memberId of memberIds) {
        await queryUpdate('users',
          { coop_id: null },
          { id: memberId }
        );
      }

      // Update coop to mark as deleted (empty member_ids)
      await queryUpdate('coops',
        { member_ids: [], updated_at: new Date().toISOString() },
        { id: this.coop.id }
      );

      console.log('[COOP_SETTINGS] Coop deleted');
      alert('Coop has been deleted');

      // Navigate back to home
      window.dispatchEvent(new CustomEvent('navigateToScreen', {
        detail: { screen: 'home' }
      }));

    } catch (err) {
      console.error('[COOP_SETTINGS] Error deleting coop:', err);
      alert('Error deleting coop: ' + err.message);
    }
  }

  /**
   * Handle create test side quest
   */
  async onCreateTestQuestClick() {
    try {
      console.log('[COOP_SETTINGS] Creating test side quest for coop:', this.coop.id);

      // Verify side quests are enabled
      if (!this.coop.side_quests_enabled) {
        alert('⚠️ Side Quests are disabled. Enable them first in the settings.');
        return;
      }

      // Verify at least one topic is selected
      if (!this.coop.side_quest_topics || this.coop.side_quest_topics.length === 0) {
        alert('⚠️ Please select at least one topic before creating a quest.');
        return;
      }

      // Disable button during creation
      const btn = document.getElementById('create-test-quest-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating...';
      }

      // Create the side quest using the coop's settings
      const result = await generateSideQuest(this.coop.id);

      if (result.success) {
        console.log('[COOP_SETTINGS] Test side quest created:', result.questId);
        alert('✅ Test side quest created! Check your home screen.');

        // Navigate to home screen to show the quest button
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'home' }
        }));
      } else {
        console.error('[COOP_SETTINGS] Error creating test quest:', result.error);
        alert('❌ Error: ' + result.error);
      }
    } catch (err) {
      console.error('[COOP_SETTINGS] Error creating test side quest:', err);
      alert('❌ Error creating test quest: ' + err.message);
    } finally {
      // Re-enable button
      const btn = document.getElementById('create-test-quest-btn');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create Test Side Quest';
      }
    }
  }
}

console.log('[COOP_SETTINGS] Module loaded');
