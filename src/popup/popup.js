/**
 * Main Popup Orchestrator
 * Manages screen routing, authentication, and session initialization
 */

import { initializeAuth, getCurrentUser, signOut } from '../logic/supabaseClient.js';
import { HomeScreen } from './screens/home-screen.js';
import { SettingsScreen } from './screens/settings-screen.js';
import { CosmeticsScreen } from './screens/cosmetics-screen.js';
import { CoopCreationModal } from './screens/coop-creation-modal.js';
import { CoopView } from './screens/coop-view.js';
import { BottomNav } from './components/bottom-nav.js';

/**
 * Screen instances
 */
let homeScreen;
let settingsScreen;
let cosmeticsScreen;
let coopCreationModal;
let coopView;
let bottomNav;
let currentScreen = 'home';

/**
 * Initialize popup on load
 */
async function initializePopup() {
  console.log('[POPUP] Initializing popup...');

  try {
    // Initialize authentication (restore session from storage)
    await initializeAuth();

    // Check if user is authenticated
    const user = await getCurrentUser();

    if (user) {
      // User is authenticated - show main content
      console.log('[POPUP] User authenticated:', user.id);
      showMainContent();
      initializeScreens();
      showScreen('home');
    } else {
      // User not authenticated - show auth screen
      console.log('[POPUP] User not authenticated, showing auth screen');
      showAuthScreen();
      initializeAuthHandlers();
    }
  } catch (err) {
    console.error('[POPUP] Error initializing popup:', err);
    showAuthScreen();
    initializeAuthHandlers();
  }
}

/**
 * Show main content area (hide auth screen)
 */
function showMainContent() {
  document.getElementById('auth-screen').style.display = 'none';
  document.querySelector('.container').style.display = 'block';
  document.querySelector('.main-content').style.display = 'block';
  console.log('[POPUP] Showing main content');
}

/**
 * Show auth screen (hide main content)
 */
function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.querySelector('.container').style.display = 'none';
  console.log('[POPUP] Showing auth screen');
}

/**
 * Initialize all screen instances
 */
function initializeScreens() {
  homeScreen = new HomeScreen();
  settingsScreen = new SettingsScreen();
  cosmeticsScreen = new CosmeticsScreen();
  coopCreationModal = new CoopCreationModal();
  coopView = new CoopView();
  bottomNav = new BottomNav();

  // Render bottom navigation
  bottomNav.render();

  // Listen for screen navigation events
  window.addEventListener('navigateToScreen', (event) => {
    const screenName = event.detail.screen;
    showScreen(screenName);
  });

  // Listen for logout events
  window.addEventListener('userLoggedOut', () => {
    console.log('[POPUP] User logged out');
    currentScreen = null;
    homeScreen = null;
    settingsScreen = null;
    cosmeticsScreen = null;
    coopCreationModal = null;
    coopView = null;
    bottomNav = null;
    showAuthScreen();
    initializeAuthHandlers();
  });

  console.log('[POPUP] Screens initialized');
}

/**
 * Show a specific screen
 */
async function showScreen(screenName) {
  if (screenName === currentScreen) {
    console.log('[POPUP] Already on screen:', screenName);
    return;
  }

  console.log('[POPUP] Switching to screen:', screenName);
  currentScreen = screenName;

  // Update bottom nav active tab
  if (bottomNav) {
    bottomNav.setActiveTab(screenName);
  }

  // Show the appropriate screen
  try {
    switch (screenName) {
      case 'home':
        await homeScreen.show();
        break;
      case 'settings':
        await settingsScreen.show();
        break;
      case 'skins':
        await cosmeticsScreen.show();
        break;
      case 'coop-creation':
        await coopCreationModal.show();
        break;
      case 'coop-view':
        await coopView.show();
        break;
      default:
        console.warn('[POPUP] Unknown screen:', screenName);
        await homeScreen.show();
        break;
    }
  } catch (err) {
    console.error('[POPUP] Error showing screen:', screenName, err);
  }
}

/**
 * Initialize authentication handlers
 */
function initializeAuthHandlers() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const authLoading = document.getElementById('auth-loading');
  const authError = document.getElementById('auth-error');

  // Form switching
  document.getElementById('switch-to-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
  });

  document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  // Login
  document.getElementById('login-submit-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showAuthError('Please fill in all fields');
      return;
    }

    showAuthLoading(true);
    try {
      const { signInWithEmail } = await import('../logic/supabaseClient.js');
      const result = await signInWithEmail(email, password);

      if (result.success) {
        console.log('[POPUP] Login successful');
        showAuthLoading(false);
        // Show main content and initialize screens
        showMainContent();
        initializeScreens();
        showScreen('home');
      } else {
        showAuthLoading(false);
        showAuthError(result.error || 'Login failed');
      }
    } catch (err) {
      showAuthLoading(false);
      showAuthError(err.message);
    }
  });

  // Signup
  document.getElementById('signup-submit-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;

    if (!email || !password || !passwordConfirm) {
      showAuthError('Please fill in all fields');
      return;
    }

    if (password !== passwordConfirm) {
      showAuthError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showAuthError('Password must be at least 6 characters');
      return;
    }

    showAuthLoading(true);
    try {
      const { signUpWithEmail } = await import('../logic/supabaseClient.js');
      const result = await signUpWithEmail(email, password);

      if (result.success) {
        console.log('[POPUP] Signup successful');
        showAuthLoading(false);
        // Show main content and initialize screens
        showMainContent();
        initializeScreens();
        showScreen('home');
      } else {
        showAuthLoading(false);
        showAuthError(result.error || 'Signup failed');
      }
    } catch (err) {
      showAuthLoading(false);
      showAuthError(err.message);
    }
  });

  // Guest mode
  document.getElementById('guest-mode-btn')?.addEventListener('click', async () => {
    showAuthLoading(true);
    try {
      const { createGuestUser } = await import('../logic/authManager.js');
      const result = await createGuestUser();

      if (result.success) {
        console.log('[POPUP] Guest user created');
        showAuthLoading(false);
        // Show main content and initialize screens
        showMainContent();
        initializeScreens();
        showScreen('home');
      } else {
        showAuthLoading(false);
        showAuthError(result.error || 'Guest mode failed');
      }
    } catch (err) {
      showAuthLoading(false);
      showAuthError(err.message);
    }
  });
}

/**
 * Show loading state on auth screen
 */
function showAuthLoading(show) {
  const loadingEl = document.getElementById('auth-loading');
  const formEl = document.querySelector('.auth-form.active');

  if (show) {
    loadingEl.style.display = 'flex';
    if (formEl) formEl.style.display = 'none';
  } else {
    loadingEl.style.display = 'none';
    if (formEl) formEl.style.display = 'block';
  }
}

/**
 * Show error message on auth screen
 */
function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

/**
 * Handle extension toggle (pause/resume challenges)
 */
document.getElementById('extension-toggle')?.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  console.log('[POPUP] Extension toggle:', isEnabled ? 'enabled' : 'disabled');
  // TODO: Implement extension enable/disable logic in service worker
});

/**
 * Handle header settings button click
 */
document.getElementById('settings-btn')?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('navigateToScreen', {
    detail: { screen: 'settings' }
  }));
});

/**
 * Handle egg count display update
 */
async function updateEggDisplay() {
  try {
    const user = await getCurrentUser();
    if (user) {
      const { querySelect } = await import('../logic/supabaseClient.js');
      const userProfile = await querySelect('users', {
        eq: { id: user.id },
        single: true
      });

      if (userProfile) {
        document.getElementById('egg-count').textContent = userProfile.eggs || 0;
      }
    }
  } catch (err) {
    console.error('[POPUP] Error updating egg display:', err);
  }
}

/**
 * Update egg display when screens change
 */
setInterval(() => {
  if (currentScreen) {
    updateEggDisplay();
  }
}, 5000); // Update every 5 seconds

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

// Also initialize immediately in case DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}

console.log('[POPUP] Module loaded - Popup orchestrator initialized');
