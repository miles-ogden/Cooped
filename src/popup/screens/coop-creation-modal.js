/**
 * Coop Creation Modal (3-Step Form)
 * Step 1: Basic info (name, description)
 * Step 2: Settings & Side Quests (members, public/private, hardcore, side quest config)
 * Step 3: Invite friends (join code, email invites)
 */

import { queryInsert, queryUpdate, getCurrentUser } from '../../logic/supabaseClient.js';

export class CoopCreationModal {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.coopData = {
      name: '',
      description: '',
      maxMembers: 10,
      isPublic: true,
      hardcoreModeEnabled: false,
      blockerQuestionType: 'general', // general, math, history, vocab
      sideQuestsEnabled: false,
      sideQuestCategory: 'learning', // learning, fun, random
      sideQuestTopics: [], // selected topics
      sideQuestFrequency: 'daily',
      sideQuestFrequencyValue: 1
    };

    // Topic definitions
    this.questTopics = {
      learning: ['General Knowledge', 'Math', 'History', 'Vocabulary'],
      fun: ['Trivia', 'Sports', 'Movies & Media', 'Pop Culture'],
      random: ['Real Life Events']
    };

    console.log('[COOP_CREATION] Initialized');
  }

  /**
   * Show the modal
   */
  async show() {
    try {
      console.log('[COOP_CREATION] Showing coop creation modal');
      this.currentStep = 1;
      this.renderStep();
    } catch (err) {
      console.error('[COOP_CREATION] Error showing modal:', err);
    }
  }

  /**
   * Render current step
   */
  renderStep() {
    const screenContainer = document.getElementById('screen-container');
    if (!screenContainer) {
      console.warn('[COOP_CREATION] Screen container not found');
      return;
    }

    let html = '';
    if (this.currentStep === 1) {
      html = this.renderStep1();
    } else if (this.currentStep === 2) {
      html = this.renderStep2();
    } else if (this.currentStep === 3) {
      html = this.renderStep3();
    }

    screenContainer.innerHTML = html;
    this.attachEventListeners();
    console.log('[COOP_CREATION] Rendered step', this.currentStep);
  }

  /**
   * STEP 1: Basic Information
   */
  renderStep1() {
    return `
      <div class="coop-creation-modal">
        <div class="modal-header">
          <h2>Create a Coop (Step ${this.currentStep}/${this.totalSteps})</h2>
          <button class="btn-icon" id="close-modal-btn" title="Close">✕</button>
        </div>

        <div class="modal-content">
          <div class="form-group">
            <label for="coop-name">Coop Name *</label>
            <input
              type="text"
              id="coop-name"
              placeholder="e.g., Chicken Squadron"
              value="${this.coopData.name}"
              maxlength="50"
              required
            >
          </div>

          <div class="form-group">
            <label for="coop-description">Description (optional)</label>
            <textarea
              id="coop-description"
              placeholder="Tell us about your coop..."
              maxlength="200"
            >${this.coopData.description}</textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="cancel-btn">Cancel</button>
          <button class="btn-primary" id="next-btn">Next ➜</button>
        </div>
      </div>
    `;
  }

  /**
   * STEP 2: Settings & Side Quests
   */
  renderStep2() {
    return `
      <div class="coop-creation-modal">
        <div class="modal-header">
          <h2>Create a Coop (Step ${this.currentStep}/${this.totalSteps})</h2>
          <button class="btn-icon" id="close-modal-btn" title="Close">✕</button>
        </div>

        <div class="modal-content">
          <!-- Coop Settings Section -->
          <div class="settings-section">
            <h3>Coop Settings</h3>

            <!-- Max Members -->
            <div class="form-group">
              <label for="max-members">Max Members</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="max-members" value="4" ${this.coopData.maxMembers === 4 ? 'checked' : ''}>
                  4
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="6" ${this.coopData.maxMembers === 6 ? 'checked' : ''}>
                  6
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="8" ${this.coopData.maxMembers === 8 ? 'checked' : ''}>
                  8
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="10" ${this.coopData.maxMembers === 10 ? 'checked' : ''}>
                  10
                </label>
              </div>
            </div>

            <!-- Public/Private -->
            <div class="form-group">
              <label>Public/Private</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="is-public" value="true" ${this.coopData.isPublic ? 'checked' : ''}>
                  Public
                </label>
                <label class="radio-label">
                  <input type="radio" name="is-public" value="false" ${!this.coopData.isPublic ? 'checked' : ''}>
                  Private (requires join code)
                </label>
              </div>
            </div>

            <!-- Hardcore Mode -->
            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="hardcore-mode-toggle" ${this.coopData.hardcoreModeEnabled ? 'checked' : ''}>
                <span>Hardcore Mode</span>
              </label>
              <p class="help-text">Stricter rules and harsher penalties for all members</p>
            </div>
          </div>

          <!-- Blocker Questions Section -->
          <div class="settings-section">
            <h3>Blocker Questions</h3>
            <div class="form-group">
              <label for="blocker-type">Question Type</label>
              <select id="blocker-type" class="form-select">
                <option value="general" ${this.coopData.blockerQuestionType === 'general' ? 'selected' : ''}>General Knowledge (Default)</option>
                <option value="math" ${this.coopData.blockerQuestionType === 'math' ? 'selected' : ''}>Math</option>
                <option value="history" ${this.coopData.blockerQuestionType === 'history' ? 'selected' : ''}>History</option>
                <option value="vocab" ${this.coopData.blockerQuestionType === 'vocab' ? 'selected' : ''}>Vocabulary</option>
              </select>
            </div>
          </div>

          <!-- Side Quests Section -->
          <div class="settings-section">
            <h3>Side Quests</h3>

            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="side-quests-toggle" ${this.coopData.sideQuestsEnabled ? 'checked' : ''}>
                <span>Enable Side Quests</span>
              </label>
            </div>

            <div id="side-quests-options" style="${!this.coopData.sideQuestsEnabled ? 'display: none;' : ''}">
              <div class="form-group">
                <label for="side-quest-category">Quest Category</label>
                <select id="side-quest-category" class="form-select">
                  <option value="learning" ${this.coopData.sideQuestCategory === 'learning' ? 'selected' : ''}>Learning</option>
                  <option value="fun" ${this.coopData.sideQuestCategory === 'fun' ? 'selected' : ''}>Fun</option>
                  <option value="random" ${this.coopData.sideQuestCategory === 'random' ? 'selected' : ''}>Random</option>
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
                  <option value="daily-1" ${this.coopData.sideQuestFrequency === 'daily' && this.coopData.sideQuestFrequencyValue === 1 ? 'selected' : ''}>Once per day</option>
                  <option value="daily-2" ${this.coopData.sideQuestFrequency === 'daily' && this.coopData.sideQuestFrequencyValue === 2 ? 'selected' : ''}>Twice per day</option>
                  <option value="daily-3" ${this.coopData.sideQuestFrequency === 'daily' && this.coopData.sideQuestFrequencyValue === 3 ? 'selected' : ''}>3 times per day</option>
                  <option value="weekly-1" ${this.coopData.sideQuestFrequency === 'weekly' && this.coopData.sideQuestFrequencyValue === 1 ? 'selected' : ''}>Once per week</option>
                  <option value="weekly-2" ${this.coopData.sideQuestFrequency === 'weekly' && this.coopData.sideQuestFrequencyValue === 2 ? 'selected' : ''}>Bi-weekly</option>
                  <option value="weekly-3" ${this.coopData.sideQuestFrequency === 'weekly' && this.coopData.sideQuestFrequencyValue === 3 ? 'selected' : ''}>3 times per week</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="back-btn">⬅ Back</button>
          <button class="btn-primary" id="next-btn">Next ➜</button>
        </div>
      </div>
    `;
  }


  /**
   * Render topic checkboxes based on selected category
   */
  renderTopicCheckboxes() {
    const category = this.coopData.sideQuestCategory;
    const topics = this.questTopics[category] || [];

    let html = '<div class="topic-checkboxes">';
    topics.forEach(topic => {
      const isChecked = this.coopData.sideQuestTopics.includes(topic);
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
   * STEP 3: Invite Friends
   */
  renderStep3() {
    const joinCode = this.generateJoinCode(this.coopData.name);

    return `
      <div class="coop-creation-modal">
        <div class="modal-header">
          <h2>Create a Coop (Step ${this.currentStep}/${this.totalSteps})</h2>
          <button class="btn-icon" id="close-modal-btn" title="Close">✕</button>
        </div>

        <div class="modal-content">
          <div class="invite-section">
            <h3>Invite Friends</h3>

            <div class="form-group">
              <label>Join Code (share with friends)</label>
              <div class="join-code-display">
                <span id="join-code-text">${joinCode}</span>
                <button class="btn-sm" id="copy-code-btn" title="Copy to clipboard">📋 Copy</button>
              </div>
            </div>

            <div class="form-group">
              <label>Share Message</label>
              <p class="share-message-text">"Join my coop <strong>${this.coopData.name}</strong>! Code: ${joinCode}"</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="back-btn">⬅ Back</button>
          <button class="btn-primary" id="create-coop-btn">Create Coop</button>
        </div>
      </div>
    `;
  }

  /**
   * Generate a join code from coop name
   */
  generateJoinCode(name) {
    const sanitized = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 15);

    return `COOP-${sanitized}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Attach event listeners to current step
   */
  attachEventListeners() {
    // Close modal
    document.getElementById('close-modal-btn')?.addEventListener('click', () => {
      this.onClose();
    });

    // Cancel button
    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      this.onClose();
    });

    if (this.currentStep === 1) {
      this.attachStep1Listeners();
    } else if (this.currentStep === 2) {
      this.attachStep2Listeners();
    } else if (this.currentStep === 3) {
      this.attachStep3Listeners();
    }
  }

  /**
   * STEP 1 listeners
   */
  attachStep1Listeners() {
    document.getElementById('next-btn')?.addEventListener('click', () => {
      const name = document.getElementById('coop-name').value.trim();

      if (!name) {
        alert('Coop name is required');
        return;
      }

      this.coopData.name = name;
      this.coopData.description = document.getElementById('coop-description').value.trim();

      this.currentStep = 2;
      this.renderStep();
    });
  }

  /**
   * STEP 2 listeners
   */
  attachStep2Listeners() {
    // Max members
    document.querySelectorAll('input[name="max-members"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.coopData.maxMembers = parseInt(e.target.value);
      });
    });

    // Public/Private
    document.querySelectorAll('input[name="is-public"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.coopData.isPublic = e.target.value === 'true';
      });
    });

    // Hardcore mode
    document.getElementById('hardcore-mode-toggle')?.addEventListener('change', (e) => {
      this.coopData.hardcoreModeEnabled = e.target.checked;
    });

    // Blocker question type dropdown
    document.getElementById('blocker-type')?.addEventListener('change', (e) => {
      this.coopData.blockerQuestionType = e.target.value;
    });

    // Side quests toggle
    document.getElementById('side-quests-toggle')?.addEventListener('change', (e) => {
      this.coopData.sideQuestsEnabled = e.target.checked;
      document.getElementById('side-quests-options').style.display = e.target.checked ? 'block' : 'none';
    });

    // Side quest category dropdown - rerenders the topic checkboxes
    document.getElementById('side-quest-category')?.addEventListener('change', (e) => {
      this.coopData.sideQuestCategory = e.target.value;
      this.coopData.sideQuestTopics = []; // reset topics when category changes

      // Re-render the topic checkboxes for the new category
      const topicSelectionDiv = document.getElementById('topic-selection');
      if (topicSelectionDiv) {
        topicSelectionDiv.innerHTML = `
          <label>Topics</label>
          ${this.renderTopicCheckboxes()}
        `;

        // Re-attach event listeners to the new checkboxes
        this.attachTopicListeners();
      }
    });

    // Attach initial topic listeners
    this.attachTopicListeners();

    // Side quest frequency dropdown
    document.getElementById('side-quest-frequency')?.addEventListener('change', (e) => {
      const [frequency, value] = e.target.value.split('-');
      this.coopData.sideQuestFrequency = frequency;
      this.coopData.sideQuestFrequencyValue = parseInt(value);
    });

    // Navigation
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.currentStep = 1;
      this.renderStep();
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
      this.currentStep = 3;
      this.renderStep();
    });
  }

  /**
   * Attach listeners to topic checkboxes
   */
  attachTopicListeners() {
    document.querySelectorAll('.topic-item').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        // Get all checked topics
        this.coopData.sideQuestTopics = Array.from(
          document.querySelectorAll('.topic-item:checked')
        ).map(el => el.value);

        console.log('[COOP_CREATION] Selected topics:', this.coopData.sideQuestTopics);
      });
    });
  }

  /**
   * STEP 3 listeners
   */
  attachStep3Listeners() {
    // Copy join code
    document.getElementById('copy-code-btn')?.addEventListener('click', async () => {
      const joinCode = document.getElementById('join-code-text').textContent;
      try {
        await navigator.clipboard.writeText(joinCode);
        console.log('[COOP_CREATION] Join code copied to clipboard');
        const btn = document.getElementById('copy-code-btn');
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = '📋 Copy';
        }, 2000);
      } catch (err) {
        console.error('[COOP_CREATION] Error copying to clipboard:', err);
      }
    });

    // Create coop
    document.getElementById('create-coop-btn')?.addEventListener('click', async () => {
      await this.onCreateCoop();
    });

    // Navigation
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.currentStep = 2;
      this.renderStep();
    });
  }

  /**
   * Handle coop creation
   */
  async onCreateCoop() {
    try {
      console.log('[COOP_CREATION] Creating coop:', this.coopData);

      const user = await getCurrentUser(true);
      if (!user) {
        alert('Not authenticated');
        return;
      }

      const joinCode = this.generateJoinCode(this.coopData.name);

      // Create coop in database
      const coopData = {
        name: this.coopData.name,
        description: this.coopData.description,
        creator_user_id: user.id,
        member_ids: [user.id],
        max_members: this.coopData.maxMembers,
        is_public: this.coopData.isPublic,
        join_code: joinCode,
        coop_level: 1,
        total_xp: 0,
        hardcore_mode_enabled: this.coopData.hardcoreModeEnabled,
        blocker_question_type: this.coopData.blockerQuestionType,
        side_quests_enabled: this.coopData.sideQuestsEnabled,
        side_quest_category: this.coopData.sideQuestCategory,
        side_quest_frequency: this.coopData.sideQuestFrequency,
        side_quest_frequency_value: this.coopData.sideQuestFrequencyValue,
        coop_wars_won: 0,
        created_at: new Date().toISOString()
      };

      const result = await queryInsert('coops', [coopData]);
      const createdCoop = result[0] || result;

      console.log('[COOP_CREATION] Coop created:', createdCoop);

      // Update user's coop_id
      await queryUpdate('users',
        { coop_id: createdCoop.id },
        { id: user.id }
      );

      alert(`Coop "${this.coopData.name}" created successfully!`);

      // Navigate back to home
      window.dispatchEvent(new CustomEvent('navigateToScreen', {
        detail: { screen: 'home' }
      }));

    } catch (err) {
      console.error('[COOP_CREATION] Error creating coop:', err);
      alert('Error creating coop: ' + err.message);
    }
  }

  /**
   * Handle modal close
   */
  onClose() {
    console.log('[COOP_CREATION] Modal closed');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'home' }
    }));
  }
}

console.log('[COOP_CREATION] Module loaded');
