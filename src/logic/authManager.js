/**
 * Authentication Manager
 * Handles: Email/Password, Guest Mode
 * Uses Supabase REST API (works in Chrome extension context)
 */

import {
  signUpWithEmail as supabaseSignUp,
  signInWithEmail as supabaseSignIn,
  queryInsert,
  signOut as supabaseSignOut
} from './supabaseClient.js'

/**
 * Generate a random UUID
 */
function generateUUID() {
  return crypto.randomUUID()
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password) {
  try {
    const result = await supabaseSignUp(email, password)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    console.log('[AUTH] Sign up successful:', result.user.id)

    // Create user profile in users table
    await createUserProfile(result.user.id, 'email')

    return { success: true, user: result.user }
  } catch (err) {
    console.error('[AUTH] Sign up error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  try {
    const result = await supabaseSignIn(email, password)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    console.log('[AUTH] Sign in successful:', result.user.id)
    return { success: true, user: result.user }
  } catch (err) {
    console.error('[AUTH] Sign in error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Guest mode - create anonymous user with UUID
 */
export async function createGuestUser() {
  try {
    // Generate a simple numeric ID for guest email
    const guestNum = Math.floor(Math.random() * 1000000000)
    // Use test email domain that Supabase accepts
    const guestEmail = `guest${guestNum}@test.com`
    const guestPassword = generateUUID()

    console.log('[AUTH] Creating guest user:', guestEmail)

    // Sign up as guest using REST API
    const signupResult = await supabaseSignUp(guestEmail, guestPassword)

    if (!signupResult.success) {
      throw new Error(signupResult.error || 'Guest signup failed')
    }

    const userId = signupResult.user.id

    console.log('[AUTH] Guest user created:', userId)

    // Create user profile with guest flag
    await createUserProfile(userId, 'guest')

    return { success: true, user: signupResult.user }
  } catch (err) {
    console.error('[AUTH] Guest user error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Create user profile in users table
 * Called after successful auth
 */
export async function createUserProfile(userId, authProvider) {
  try {
    const result = await queryInsert('users', [{
      id: userId,
      auth_provider: authProvider,
      xp_total: 0,
      level: 1,
      eggs: 0,
      streak_days: 0,
      last_stim_date: null,
      hearts_remaining_today: 3,
      skip_until: null,
      coop_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])

    console.log('[AUTH] User profile created:', userId)
    return { success: true }
  } catch (err) {
    console.error('[AUTH] Error creating user profile:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId) {
  try {
    const { querySelect } = await import('./supabaseClient.js')
    const result = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    return { success: true, user: result }
  } catch (err) {
    console.error('[AUTH] Error fetching user profile:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Sign out
 */
export async function logOut() {
  try {
    const result = await supabaseSignOut()

    console.log('[AUTH] Logged out successfully')
    return { success: true }
  } catch (err) {
    console.error('[AUTH] Logout error:', err)
    return { success: false, error: err.message }
  }
}
