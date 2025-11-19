/**
 * Cosmetics/Skins Screen Manager
 * Displays available skins, accessories, and allows equipping
 */

import { querySelect, queryUpdate, getCurrentUser } from '../../logic/supabaseClient.js';

export class CosmeticsScreen {
  constructor() {
    this.userProfile = null;
    this.userCosmetics = [];
    this.availableSkins = [
      { id: 'basic_chicken', name: 'Basic Chicken', type: 'skin', emoji: '🐔', level: 1 },
      { id: 'golden_rooster', name: 'Golden Rooster', type: 'skin', emoji: '🐓', level: 5 },
      { id: 'lunar_chicken', name: 'Lunar Chicken', type: 'skin', emoji: '🌙', level: 10 },
      { id: 'phoenix_chicken', name: 'Phoenix Chicken', type: 'skin', emoji: '🔥', level: 15 }
    ];
    this.availableAccessories = {
      hats: [
        { id: 'none', name: 'None', type: 'hat', emoji: '⭕' },
        { id: 'top_hat', name: 'Top Hat', type: 'hat', emoji: '🎩', level: 3 },
        { id: 'wizard_hat', name: 'Wizard Hat', type: 'hat', emoji: '🧙', level: 8 },
        { id: 'crown', name: 'Crown', type: 'hat', emoji: '👑', level: 12 }
      ],
      scarves: [
        { id: 'none', name: 'None', type: 'scarf', emoji: '⭕' },
        { id: 'red_scarf', name: 'Red Scarf', type: 'scarf', emoji: '🔴', level: 2 },
        { id: 'gold_scarf', name: 'Gold Scarf', type: 'scarf', emoji: '✨', level: 7 }
      ],
      backgrounds: [
        { id: 'default', name: 'Default', type: 'background', emoji: '🌅', level: 1 },
        { id: 'coop_theme', name: 'Coop Theme', type: 'background', emoji: '🏠', level: 4 },
        { id: 'galaxy', name: 'Galaxy', type: 'background', emoji: '🌌', level: 10 }
      ]
    };

    console.log('[COSMETICS_SCREEN] Initialized');
  }

  /**
   * Load cosmetics data and render screen
   */
  async show() {
    try {
      console.log('[COSMETICS_SCREEN] Loading cosmetics...');

      const user = await getCurrentUser();
      if (!user) {
        console.error('[COSMETICS_SCREEN] No authenticated user');
        return;
      }

      // Get user profile
      this.userProfile = await querySelect('users', {
        eq: { id: user.id },
        single: true
      });

      // TODO: Load user's owned cosmetics from database
      // For now, assume they own basic items
      this.userCosmetics = ['basic_chicken', 'none', 'none', 'default'];

      this.render();
    } catch (err) {
      console.error('[COSMETICS_SCREEN] Error loading cosmetics:', err);
    }
  }

  /**
   * Render cosmetics screen
   */
  render() {
    const screenContainer = document.getElementById('screen-container');
    if (!screenContainer) {
      console.warn('[COSMETICS_SCREEN] Screen container not found');
      return;
    }

    const skinsHtml = this.renderSkins();
    const accessoriesHtml = this.renderAccessories();

    const html = `
      <div class="cosmetics-screen">
        <div class="cosmetics-header">
          <h2>Cosmetics</h2>
          <button class="btn-icon" id="back-btn" title="Back to home">✕</button>
        </div>

        <div class="cosmetics-content">
          <!-- Skins Section -->
          <section class="cosmetics-section">
            <h3>Skins</h3>
            <div class="skins-grid">
              ${skinsHtml}
            </div>
          </section>

          <!-- Accessories Section -->
          <section class="cosmetics-section">
            <h3>Accessories</h3>

            <div class="accessories-subsection">
              <h4>Hats</h4>
              <div class="accessories-list">
                ${this.renderAccessoryGroup('hats')}
              </div>
            </div>

            <div class="accessories-subsection">
              <h4>Scarves</h4>
              <div class="accessories-list">
                ${this.renderAccessoryGroup('scarves')}
              </div>
            </div>

            <div class="accessories-subsection">
              <h4>Backgrounds</h4>
              <div class="accessories-list">
                ${this.renderAccessoryGroup('backgrounds')}
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    screenContainer.innerHTML = html;
    this.attachEventListeners();
    console.log('[COSMETICS_SCREEN] Rendered cosmetics screen');
  }

  /**
   * Render skins section
   */
  renderSkins() {
    return this.availableSkins.map(skin => {
      const isOwned = this.userCosmetics.includes(skin.id);
      const isEquipped = this.userProfile.equipped_skin === skin.id;
      const isLocked = this.userProfile.level < skin.level && !isOwned;

      let html = `
        <div class="cosmetic-card skin-card ${isEquipped ? 'equipped' : ''} ${isLocked ? 'locked' : ''}">
          <div class="cosmetic-preview">${skin.emoji}</div>
          <div class="cosmetic-name">${skin.name}</div>
      `;

      if (isLocked) {
        html += `<p class="cosmetic-lock">🔒 Level ${skin.level}</p>`;
      } else if (isEquipped) {
        html += `<button class="btn-sm btn-success" disabled>✓ Equipped</button>`;
      } else if (isOwned) {
        html += `<button class="btn-sm btn-primary" data-action="equip-skin" data-skin-id="${skin.id}">Equip</button>`;
      }

      html += `</div>`;
      return html;
    }).join('');
  }

  /**
   * Render accessory group
   */
  renderAccessoryGroup(groupName) {
    const accessories = this.availableAccessories[groupName] || [];
    const equippedType = this.getEquippedAccessoryForType(groupName);

    return accessories.map(item => {
      const isOwned = this.userCosmetics.includes(item.id);
      const isEquipped = equippedType === item.id;
      const isLocked = item.level && this.userProfile.level < item.level && !isOwned;

      let html = `
        <div class="accessory-item ${isEquipped ? 'equipped' : ''} ${isLocked ? 'locked' : ''}">
          <div class="accessory-emoji">${item.emoji}</div>
          <div class="accessory-name">${item.name}</div>
      `;

      if (isLocked) {
        html += `<p class="item-lock">🔒 ${item.level}</p>`;
      } else if (isEquipped) {
        html += `<button class="btn-xs btn-secondary" data-action="unequip-accessory" data-type="${groupName}" data-item-id="${item.id}">Unequip</button>`;
      } else if (isOwned) {
        html += `<button class="btn-xs btn-primary" data-action="equip-accessory" data-type="${groupName}" data-item-id="${item.id}">Equip</button>`;
      }

      html += `</div>`;
      return html;
    }).join('');
  }

  /**
   * Get equipped accessory for a type
   */
  getEquippedAccessoryForType(type) {
    if (type === 'hats') {
      return this.userProfile.equipped_accessories?.[0] || 'none';
    } else if (type === 'scarves') {
      return this.userProfile.equipped_accessories?.[1] || 'none';
    } else if (type === 'backgrounds') {
      return this.userProfile.equipped_background || 'default';
    }
    return 'none';
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.onBackClick();
    });

    // Equip skin buttons
    document.querySelectorAll('[data-action="equip-skin"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skinId = e.target.getAttribute('data-skin-id');
        this.onEquipSkin(skinId);
      });
    });

    // Equip accessory buttons
    document.querySelectorAll('[data-action="equip-accessory"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.getAttribute('data-item-id');
        const type = e.target.getAttribute('data-type');
        this.onEquipAccessory(type, itemId);
      });
    });

    // Unequip accessory buttons
    document.querySelectorAll('[data-action="unequip-accessory"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-type');
        this.onUnequipAccessory(type);
      });
    });
  }

  /**
   * Handle equip skin
   */
  async onEquipSkin(skinId) {
    try {
      console.log('[COSMETICS_SCREEN] Equipping skin:', skinId);

      await queryUpdate('users',
        { equipped_skin: skinId },
        { id: this.userProfile.id }
      );

      this.userProfile.equipped_skin = skinId;
      console.log('[COSMETICS_SCREEN] Skin equipped');
      this.render(); // Re-render to update UI
    } catch (err) {
      console.error('[COSMETICS_SCREEN] Error equipping skin:', err);
      alert('Error equipping skin');
    }
  }

  /**
   * Handle equip accessory
   */
  async onEquipAccessory(type, itemId) {
    try {
      console.log('[COSMETICS_SCREEN] Equipping accessory:', type, itemId);

      if (type === 'hats' || type === 'scarves') {
        const accessories = this.userProfile.equipped_accessories || ['none', 'none'];
        if (type === 'hats') {
          accessories[0] = itemId;
        } else {
          accessories[1] = itemId;
        }
        await queryUpdate('users',
          { equipped_accessories: accessories },
          { id: this.userProfile.id }
        );
        this.userProfile.equipped_accessories = accessories;
      } else if (type === 'backgrounds') {
        await queryUpdate('users',
          { equipped_background: itemId },
          { id: this.userProfile.id }
        );
        this.userProfile.equipped_background = itemId;
      }

      console.log('[COSMETICS_SCREEN] Accessory equipped');
      this.render();
    } catch (err) {
      console.error('[COSMETICS_SCREEN] Error equipping accessory:', err);
      alert('Error equipping accessory');
    }
  }

  /**
   * Handle unequip accessory
   */
  async onUnequipAccessory(type) {
    try {
      console.log('[COSMETICS_SCREEN] Unequipping accessory:', type);

      if (type === 'hats' || type === 'scarves') {
        const accessories = this.userProfile.equipped_accessories || ['none', 'none'];
        if (type === 'hats') {
          accessories[0] = 'none';
        } else {
          accessories[1] = 'none';
        }
        await queryUpdate('users',
          { equipped_accessories: accessories },
          { id: this.userProfile.id }
        );
        this.userProfile.equipped_accessories = accessories;
      }

      console.log('[COSMETICS_SCREEN] Accessory unequipped');
      this.render();
    } catch (err) {
      console.error('[COSMETICS_SCREEN] Error unequipping accessory:', err);
    }
  }

  /**
   * Handle back button
   */
  onBackClick() {
    console.log('[COSMETICS_SCREEN] Back clicked');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'home' }
    }));
  }
}

console.log('[COSMETICS_SCREEN] Module loaded');
