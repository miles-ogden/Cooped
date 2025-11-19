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
 * @param {boolean} skipValidation - If true, return session without verifying with server
 */
export async function getCurrentUser(skipValidation = false) {
  try {
    if (!currentSession) {
      return null
    }

    // If skipValidation is true, return user object with just the session data
    if (skipValidation) {
      console.log('[SUPABASE] Returning current session (validation skipped)')
      return { id: currentSession.user_id || 'unknown' }
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
    const userId = data.user?.id || data.session?.user?.id

    if (!accessToken) {
      throw new Error('No access token in signup response')
    }

    if (!userId) {
      throw new Error('No user ID in signup response')
    }

    // Store session with user ID for later reference
    currentSession = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: userId
    }
    await chrome.storage.local.set({ supabase_session: currentSession })

    console.log('[SUPABASE] Sign up successful:', userId)
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

    // Store session with user ID
    currentSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user?.id
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

/**
 * Sign in with OAuth provider (Google, Discord, etc.)
 * For Chrome extension: opens provider login in new tab/window and handles callback
 */
export async function signInWithOAuth(provider) {
  try {
    // Generate PKCE challenge for security
    const codeVerifier = generateRandomString(64)
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Store PKCE values for later validation
    await chrome.storage.local.set({
      oauth_code_verifier: codeVerifier,
      oauth_provider: provider
    })

    // Build authorization URL
    let scope = 'openid profile email'
    if (provider === 'apple') {
      scope = 'email name'
    }

    const params = new URLSearchParams({
      client_id: SUPABASE_ANON_KEY,
      redirect_uri: `https://${chrome.runtime.id}.chromiumapp.org/`,
      response_type: 'code',
      scope: scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`

    // Open auth in new window
    return new Promise((resolve) => {
      chrome.windows.create({ url: authUrl, type: 'popup', width: 500, height: 600 }, (window) => {
        if (!window) {
          resolve({ success: false, error: 'Failed to open auth window' })
          return
        }

        // Listen for OAuth callback
        const handleMessage = (message, sender) => {
          if (message.type === 'OAUTH_CALLBACK' && message.code) {
            chrome.runtime.onMessage.removeListener(handleMessage)
            exchangeCodeForSession(message.code, codeVerifier, provider).then(result => {
              resolve(result)
            })
          }
        }

        chrome.runtime.onMessage.addListener(handleMessage)

        // Timeout after 5 minutes
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(handleMessage)
          resolve({ success: false, error: 'OAuth timeout' })
        }, 300000)
      })
    })
  } catch (err) {
    console.error('[SUPABASE] OAuth error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Exchange OAuth code for session
 */
async function exchangeCodeForSession(code, codeVerifier, provider) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Token exchange failed')
    }

    // Store session with user ID
    currentSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user?.id
    }
    await chrome.storage.local.set({ supabase_session: currentSession })

    // Create user profile if new user
    const { queryInsert } = await import('./authManager.js')
    try {
      await queryInsert('users', [{
        id: data.user.id,
        auth_provider: provider,
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
    } catch (err) {
      // User profile might already exist, that's okay
      console.log('[SUPABASE] User profile already exists or creation skipped')
    }

    console.log('[SUPABASE] OAuth sign in successful:', data.user.id)
    return { success: true, user: data.user }
  } catch (err) {
    console.error('[SUPABASE] Token exchange error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Generate random string for PKCE
 */
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return result
}

/**
 * Generate SHA256 code challenge from verifier
 */
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
