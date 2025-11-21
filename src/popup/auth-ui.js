/**
 * Auth UI Manager
 * Handles the login/signup/guest mode flows
 */

import {
  signUpWithEmail,
  signInWithEmail,
  createGuestUser
} from '../logic/authManager.js'
import { getCurrentUser } from '../logic/supabaseClient.js'

export class AuthUIManager {
  constructor() {
    this.isLoading = false
    console.log('[AUTH_UI] AuthUIManager initialized')
    this.setupEventListeners()
    console.log('[AUTH_UI] Event listeners setup complete')
  }

  /**
   * Setup all event listeners for auth UI
   */
  setupEventListeners() {
    // Form switches
    const switchToSignupLink = document.getElementById('switch-to-signup')
    const switchToLoginLink = document.getElementById('switch-to-login')

    if (switchToSignupLink) {
      switchToSignupLink.addEventListener('click', (e) => {
        e.preventDefault()
        this.switchForm('signup')
      })
    }

    if (switchToLoginLink) {
      switchToLoginLink.addEventListener('click', (e) => {
        e.preventDefault()
        this.switchForm('login')
      })
    }

    // Login form
    const loginSubmitBtn = document.getElementById('login-submit-btn')
    if (loginSubmitBtn) {
      loginSubmitBtn.addEventListener('click', () => this.handleLogin())
    }

    // Signup form
    const signupSubmitBtn = document.getElementById('signup-submit-btn')
    if (signupSubmitBtn) {
      signupSubmitBtn.addEventListener('click', () => this.handleSignup())
    }

    // Guest mode
    const guestModeBtn = document.getElementById('guest-mode-btn')
    if (guestModeBtn) {
      guestModeBtn.addEventListener('click', () => this.handleGuestMode())
    }

    // Enter key on inputs
    const loginEmail = document.getElementById('login-email')
    const loginPassword = document.getElementById('login-password')
    const signupEmail = document.getElementById('signup-email')
    const signupPassword = document.getElementById('signup-password')
    const signupPasswordConfirm = document.getElementById('signup-password-confirm')

    if (loginPassword) {
      loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin()
      })
    }

    if (signupPasswordConfirm) {
      signupPasswordConfirm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSignup()
      })
    }
  }

  /**
   * Switch between login and signup forms
   */
  switchForm(formType) {
    const loginForm = document.getElementById('login-form')
    const signupForm = document.getElementById('signup-form')

    if (formType === 'signup') {
      loginForm?.classList.remove('active')
      signupForm?.classList.add('active')
    } else {
      signupForm?.classList.remove('active')
      loginForm?.classList.add('active')
    }

    // Clear errors
    this.clearError()
  }

  /**
   * Handle email login
   */
  async handleLogin() {
    try {
      this.setLoading(true)
      this.clearError()

      const email = document.getElementById('login-email')?.value.trim()
      const password = document.getElementById('login-password')?.value

      if (!email || !password) {
        throw new Error('Please enter email and password')
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email')
      }

      console.log('[AUTH_UI] Logging in with email:', email)

      const result = await signInWithEmail(email, password)

      if (!result.success) {
        throw new Error(result.error || 'Login failed')
      }

      console.log('[AUTH_UI] Login successful')
      this.onAuthSuccess(result.user)
    } catch (err) {
      console.error('[AUTH_UI] Login error:', err)
      this.showError(err.message)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Handle email signup
   */
  async handleSignup() {
    try {
      this.setLoading(true)
      this.clearError()

      const email = document.getElementById('signup-email')?.value.trim()
      const password = document.getElementById('signup-password')?.value
      const passwordConfirm = document.getElementById('signup-password-confirm')?.value

      if (!email || !password || !passwordConfirm) {
        throw new Error('Please fill in all fields')
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      if (password !== passwordConfirm) {
        throw new Error('Passwords do not match')
      }

      console.log('[AUTH_UI] Signing up with email:', email)

      const result = await signUpWithEmail(email, password)

      if (!result.success) {
        throw new Error(result.error || 'Signup failed')
      }

      console.log('[AUTH_UI] Signup successful')
      this.onAuthSuccess(result.user)
    } catch (err) {
      console.error('[AUTH_UI] Signup error:', err)
      this.showError(err.message)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Handle guest mode
   */
  async handleGuestMode() {
    try {
      this.setLoading(true)
      this.clearError()

      console.log('[AUTH_UI] Creating guest user...')

      const result = await createGuestUser()

      if (!result.success) {
        throw new Error(result.error || 'Guest creation failed')
      }

      console.log('[AUTH_UI] Guest user created')
      this.onAuthSuccess(result.user)
    } catch (err) {
      console.error('[AUTH_UI] Guest mode error:', err)
      this.showError(err.message)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Called when auth is successful
   */
  onAuthSuccess(user) {
    console.log('[AUTH_UI] Auth success, user:', user.id)

    // Hide auth screen
    const authScreen = document.getElementById('auth-screen')
    if (authScreen) {
      authScreen.style.display = 'none'
    }

    // Show main popup content
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.style.display = 'block'
    }

    // Optionally dispatch event for other parts to listen
    window.dispatchEvent(new CustomEvent('authSuccess', { detail: user }))
  }

  /**
   * Check if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.isLoading = loading
    const loadingEl = document.getElementById('auth-loading')
    const buttons = document.querySelectorAll('.btn-primary, .btn-google, .btn-guest')

    if (loading) {
      loadingEl?.style.setProperty('display', 'flex', 'important')
      buttons.forEach(btn => btn.disabled = true)
    } else {
      loadingEl?.style.setProperty('display', 'none', 'important')
      buttons.forEach(btn => btn.disabled = false)
    }
  }

  /**
   * Show loading indicator
   */
  showLoading(show) {
    const loadingEl = document.getElementById('auth-loading')
    if (show) {
      loadingEl?.style.setProperty('display', 'flex', 'important')
    } else {
      loadingEl?.style.setProperty('display', 'none', 'important')
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorEl = document.getElementById('auth-error')
    if (errorEl) {
      errorEl.textContent = message
      errorEl.classList.add('show')
      errorEl.style.display = 'block'

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorEl.classList.remove('show')
        errorEl.style.display = 'none'
      }, 5000)
    }
  }

  /**
   * Clear error message
   */
  clearError() {
    const errorEl = document.getElementById('auth-error')
    if (errorEl) {
      errorEl.classList.remove('show')
      errorEl.style.display = 'none'
      errorEl.textContent = ''
    }
  }

  /**
   * Check if user is already authenticated
   */
  async checkAuth() {
    try {
      // Use skipValidation=true to trust the stored session without making an API call
      // This prevents logouts due to network issues or temporary server problems
      const user = await getCurrentUser(true)

      if (user) {
        console.log('[AUTH_UI] User already authenticated:', user.id)
        this.onAuthSuccess(user)
        return true
      }

      // Show auth screen
      const authScreen = document.getElementById('auth-screen')
      if (authScreen) {
        authScreen.style.display = 'flex'
      }

      return false
    } catch (err) {
      console.error('[AUTH_UI] Error checking auth:', err)
      return false
    }
  }

  /**
   * Show auth screen
   */
  show() {
    const authScreen = document.getElementById('auth-screen')
    if (authScreen) {
      authScreen.style.display = 'flex'
    }
  }

  /**
   * Hide auth screen
   */
  hide() {
    const authScreen = document.getElementById('auth-screen')
    if (authScreen) {
      authScreen.style.display = 'none'
    }
  }
}

/**
 * Initialize auth UI manager
 */
export function initAuthUI() {
  console.log('[AUTH_UI] initAuthUI() called')
  const manager = new AuthUIManager()

  // Check if user is already logged in
  console.log('[AUTH_UI] Checking authentication status...')
  manager.checkAuth()

  return manager
}
