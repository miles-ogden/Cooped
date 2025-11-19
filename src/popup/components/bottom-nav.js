/**
 * Bottom Navigation Manager
 * Handles tab navigation between Home, Settings, Skins, Coops
 */

export class BottomNav {
  constructor() {
    this.activeTab = 'home';
    this.tabs = ['home', 'skins', 'settings'];
    console.log('[BOTTOM_NAV] Initialized');
  }

  /**
   * Render bottom navigation
   */
  render() {
    const navContainer = document.getElementById('bottom-nav-container');
    if (!navContainer) {
      console.warn('[BOTTOM_NAV] Container not found, creating it');
      this.createContainer();
    }

    const html = `
      <nav class="bottom-nav">
        <button class="nav-tab active" data-tab="home" title="Home">
          🏠 Home
        </button>
        <button class="nav-tab" data-tab="skins" title="Cosmetics & Skins">
          👕 Skins
        </button>
        <button class="nav-tab" data-tab="settings" title="Settings">
          ⚙️ Settings
        </button>
      </nav>
    `;

    const container = document.getElementById('bottom-nav-container');
    if (container) {
      container.innerHTML = html;
      this.attachEventListeners();
    }

    console.log('[BOTTOM_NAV] Rendered navigation');
  }

  /**
   * Create bottom nav container if it doesn't exist
   */
  createContainer() {
    const container = document.createElement('div');
    container.id = 'bottom-nav-container';
    document.body.appendChild(container);
  }

  /**
   * Attach event listeners to nav tabs
   */
  attachEventListeners() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.getAttribute('data-tab');
        this.selectTab(tabName);
      });
    });
  }

  /**
   * Select a tab and navigate to corresponding screen
   */
  selectTab(tabName) {
    if (!this.tabs.includes(tabName)) {
      console.warn('[BOTTOM_NAV] Invalid tab:', tabName);
      return;
    }

    // Update active tab styling
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.activeTab = tabName;
    console.log('[BOTTOM_NAV] Selected tab:', tabName);

    // Emit navigation event
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: tabName }
    }));
  }

  /**
   * Get currently active tab
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * Set active tab programmatically (without click)
   */
  setActiveTab(tabName) {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    this.activeTab = tabName;
  }
}

console.log('[BOTTOM_NAV] Module loaded');
