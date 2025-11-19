/**
 * Supabase Client for Chrome Extension
 * Uses REST API instead of npm package (npm packages don't work in extensions without bundling)
 */

// Supabase credentials
const SUPABASE_URL = 'https://iwiwnximqjtnmmmtgmoh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3aXdueGltcWp0bm1tbXRnbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTI2MjEsImV4cCI6MjA3OTA4ODYyMX0.WUuzfV8p-OBhR-8barokcJZU2uWba7Rsaut3YIUJGCc'

// Track current session
let currentSession = null

/**
 * Initialize auth session on startup
 */
export async function initializeAuth() {
  try {
    // Check if there's a stored session
    const stored = await chrome.storage.local.get(['supabase_session'])
    if (stored.supabase_session) {
      currentSession = stored.supabase_session
      console.log('[SUPABASE] Session restored from storage')
    }
  } catch (err) {
    console.error('[SUPABASE] Error initializing auth:', err)
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    if (!currentSession) {
      return null
    }

    // Verify session is still valid by making an auth request
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      currentSession = null
      await chrome.storage.local.remove(['supabase_session'])
      return null
    }

    const data = await response.json()
    return data
  } catch (err) {
    console.error('[SUPABASE] Error getting current user:', err)
    return null
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[SUPABASE] Sign up error details:', data)
      throw new Error(data.message || data.error_description || 'Sign up failed')
    }

    console.log('[SUPABASE] Sign up response:', data)

    // Handle both session structure (with session object) and direct tokens
    const accessToken = data.session?.access_token || data.access_token
    const refreshToken = data.session?.refresh_token || data.refresh_token

    if (!accessToken) {
      throw new Error('No access token in signup response')
    }

    // Store session
    currentSession = {
      access_token: accessToken,
      refresh_token: refreshToken
    }
    await chrome.storage.local.set({ supabase_session: currentSession })

    console.log('[SUPABASE] Sign up successful:', data.user.id)
    return { success: true, user: data.user, session: currentSession }
  } catch (err) {
    console.error('[SUPABASE] Sign up error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Sign in failed')
    }

    // Store session
    currentSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token
    }
    await chrome.storage.local.set({ supabase_session: currentSession })

    console.log('[SUPABASE] Sign in successful:', data.user.id)
    return { success: true, user: data.user, session: data }
  } catch (err) {
    console.error('[SUPABASE] Sign in error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    if (!currentSession) {
      return { success: true }
    }

    await fetch(
      `${SUPABASE_URL}/auth/v1/logout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    currentSession = null
    await chrome.storage.local.remove(['supabase_session'])
    console.log('[SUPABASE] User signed out successfully')
    return { success: true }
  } catch (err) {
    console.error('[SUPABASE] Error signing out:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get user's session
 */
export async function getSession() {
  return currentSession || null
}

/**
 * Database query helper - SELECT
 */
export async function querySelect(table, options = {}) {
  try {
    if (!currentSession) {
      throw new Error('Not authenticated')
    }

    let url = `${SUPABASE_URL}/rest/v1/${table}?`

    // Add filters
    if (options.eq) {
      for (const [key, value] of Object.entries(options.eq)) {
        url += `${key}=eq.${encodeURIComponent(value)}&`
      }
    }

    // Add select fields
    if (options.select) {
      url += `select=${options.select}&`
    }

    // Add limit
    if (options.single) {
      url += 'limit=1&'
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`)
    }

    const data = await response.json()
    return options.single ? (data[0] || null) : data
  } catch (err) {
    console.error('[SUPABASE] Query error:', err)
    throw err
  }
}

/**
 * Database query helper - INSERT
 */
export async function queryInsert(table, records) {
  try {
    if (!currentSession) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(records)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `Insert failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (err) {
    console.error('[SUPABASE] Insert error:', err)
    throw err
  }
}

/**
 * Database query helper - UPDATE
 */
export async function queryUpdate(table, updates, filters) {
  try {
    if (!currentSession) {
      throw new Error('Not authenticated')
    }

    let url = `${SUPABASE_URL}/rest/v1/${table}?`

    // Add filter conditions
    for (const [key, value] of Object.entries(filters)) {
      url += `${key}=eq.${encodeURIComponent(value)}&`
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `Update failed: ${response.statusText}`)
    }

    return { success: true }
  } catch (err) {
    console.error('[SUPABASE] Update error:', err)
    throw err
  }
}
