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
      maxMembers: 8,
      isPublic: true,
      hardcoreModeEnabled: false,
      sideQuestsEnabled: true,
      sideQuestTopics: [],
      sideQuestFrequency: 'daily',
      sideQuestFrequencyValue: 1
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
    const topicsHTML = this.renderSideQuestTopics();

    return `
      <div class="coop-creation-modal">
        <div class="modal-header">
          <h2>Create a Coop (Step ${this.currentStep}/${this.totalSteps})</h2>
          <button class="btn-icon" id="close-modal-btn" title="Close">✕</button>
        </div>

        <div class="modal-content">
          <div class="settings-section">
            <h3>Coop Settings</h3>

            <div class="form-group">
              <label for="max-members">Max Members</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="max-members" value="4" ${this.coopData.maxMembers === 4 ? 'checked' : ''}>
                  4
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="8" ${this.coopData.maxMembers === 8 ? 'checked' : ''}>
                  8
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="12" ${this.coopData.maxMembers === 12 ? 'checked' : ''}>
                  12
                </label>
                <label class="radio-label">
                  <input type="radio" name="max-members" value="16" ${this.coopData.maxMembers === 16 ? 'checked' : ''}>
                  16
                </label>
              </div>
            </div>

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

            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="hardcore-mode-toggle" ${this.coopData.hardcoreModeEnabled ? 'checked' : ''}>
                <span>Hardcore Mode</span>
              </label>
              <p class="help-text">Stricter rules and harsher penalties for all members</p>
            </div>
          </div>

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
                <label>Topics (select multiple)</label>
                ${topicsHTML}
              </div>

              <div class="form-group">
                <label>Frequency</label>
                <div class="frequency-options">
                  <div class="frequency-group">
                    <input type="radio" name="frequency" value="daily" id="freq-daily" ${this.coopData.sideQuestFrequency === 'daily' ? 'checked' : ''}>
                    <label for="freq-daily">Daily</label>
                    <div class="frequency-sub" id="daily-options" style="${this.coopData.sideQuestFrequency === 'daily' ? '' : 'display: none;'}">
                      <label class="radio-label">
                        <input type="radio" name="daily-frequency" value="1" ${this.coopData.sideQuestFrequencyValue === 1 ? 'checked' : ''}>
                        Once per day
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="daily-frequency" value="2" ${this.coopData.sideQuestFrequencyValue === 2 ? 'checked' : ''}>
                        Twice per day
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="daily-frequency" value="3" ${this.coopData.sideQuestFrequencyValue === 3 ? 'checked' : ''}>
                        3 times per day
                      </label>
                    </div>
                  </div>

                  <div class="frequency-group">
                    <input type="radio" name="frequency" value="weekly" id="freq-weekly" ${this.coopData.sideQuestFrequency === 'weekly' ? 'checked' : ''}>
                    <label for="freq-weekly">Weekly</label>
                    <div class="frequency-sub" id="weekly-options" style="${this.coopData.sideQuestFrequency === 'weekly' ? '' : 'display: none;'}">
                      <label class="radio-label">
                        <input type="radio" name="weekly-frequency" value="1" ${this.coopData.sideQuestFrequencyValue === 1 ? 'checked' : ''}>
                        Once per week
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="weekly-frequency" value="2" ${this.coopData.sideQuestFrequencyValue === 2 ? 'checked' : ''}>
                        Bi-weekly
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="weekly-frequency" value="3" ${this.coopData.sideQuestFrequencyValue === 3 ? 'checked' : ''}>
                        3 times per week
                      </label>
                    </div>
                  </div>
                </div>
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
   * Render side quest topic tree
   */
  renderSideQuestTopics() {
    const categories = {
      'Learning': ['Math', 'Science', 'History', 'Vocabulary'],
      'Fun': ['Trivia', 'Sports', 'Movies & Media', 'Pop Culture'],
      'Random': ['Real Life Events']
    };

    let html = '<div class="topic-tree">';

    for (const [category, topics] of Object.entries(categories)) {
      html += `
        <div class="topic-category">
          <input type="checkbox" class="category-checkbox" value="${category}" id="cat-${category}">
          <label for="cat-${category}" class="category-label">${category}</label>
          <div class="topic-items">
      `;

      topics.forEach(topic => {
        const isChecked = this.coopData.sideQuestTopics.includes(topic);
        html += `
          <label class="topic-checkbox">
            <input type="checkbox" value="${topic}" class="topic-item" ${isChecked ? 'checked' : ''}>
            ${topic}
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

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

    // Side quests toggle
    document.getElementById('side-quests-toggle')?.addEventListener('change', (e) => {
      this.coopData.sideQuestsEnabled = e.target.checked;
      document.getElementById('side-quests-options').style.display = e.target.checked ? 'block' : 'none';
    });

    // Topic checkboxes
    document.querySelectorAll('.topic-item').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.coopData.sideQuestTopics = Array.from(
          document.querySelectorAll('.topic-item:checked')
        ).map(el => el.value);
      });
    });

    // Frequency radio buttons
    document.querySelectorAll('input[name="frequency"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.coopData.sideQuestFrequency = e.target.value;
        document.getElementById('daily-options').style.display = e.target.value === 'daily' ? 'block' : 'none';
        document.getElementById('weekly-options').style.display = e.target.value === 'weekly' ? 'block' : 'none';
      });
    });

    // Daily frequency
    document.querySelectorAll('input[name="daily-frequency"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (this.coopData.sideQuestFrequency === 'daily') {
          this.coopData.sideQuestFrequencyValue = parseInt(e.target.value);
        }
      });
    });

    // Weekly frequency
    document.querySelectorAll('input[name="weekly-frequency"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (this.coopData.sideQuestFrequency === 'weekly') {
          this.coopData.sideQuestFrequencyValue = parseInt(e.target.value);
        }
      });
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

      const user = await getCurrentUser();
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
        side_quests_enabled: this.coopData.sideQuestsEnabled,
        side_quest_topics: this.coopData.sideQuestTopics,
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
