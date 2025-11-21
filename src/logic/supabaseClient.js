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
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
  try {
    if (!currentSession?.refresh_token) {
      console.error('[SUPABASE] No refresh token available - session might be expired or corrupted')
      // Clear the corrupted session
      currentSession = null
      await chrome.storage.local.remove(['supabase_session'])
      return false
    }

    console.log('[SUPABASE] Refreshing access token with refresh token...')
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: currentSession.refresh_token
        })
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[SUPABASE] Token refresh failed:', response.statusText, 'Body:', errorBody)

      // If refresh token is invalid, clear the session
      if (response.status === 400 || response.status === 401) {
        console.error('[SUPABASE] Refresh token is invalid or expired - clearing session')
        currentSession = null
        await chrome.storage.local.remove(['supabase_session'])
      }

      return false
    }

    const data = await response.json()
    console.log('[SUPABASE] Token refresh response - got new access token')

    // Update session with new access token
    if (data.access_token) {
      currentSession.access_token = data.access_token
      if (data.refresh_token) {
        currentSession.refresh_token = data.refresh_token
      }

      // Persist updated session
      await chrome.storage.local.set({ supabase_session: currentSession })
      console.log('[SUPABASE] ✅ Access token refreshed successfully')
      return true
    }

    console.error('[SUPABASE] Token refresh response had no access_token')
    return false
  } catch (err) {
    console.error('[SUPABASE] Error refreshing token:', err)
    return false
  }
}

/**
 * Extract user ID from JWT access token
 */
function extractUserIdFromToken(token) {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode the payload (second part)
    const payload = atob(parts[1])
    const decoded = JSON.parse(payload)
    return decoded.sub || null
  } catch (err) {
    console.error('[SUPABASE] Error extracting user ID from token:', err)
    return null
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
function isTokenExpiringSoon(token) {
  try {
    if (!token) return true
    const parts = token.split('.')
    if (parts.length !== 3) return true

    const payload = atob(parts[1])
    const decoded = JSON.parse(payload)

    if (!decoded.exp) return true

    const expiryTime = decoded.exp * 1000 // Convert to milliseconds
    const timeUntilExpiry = expiryTime - Date.now()
    const fiveMinutes = 5 * 60 * 1000

    const expiringSoon = timeUntilExpiry < fiveMinutes
    if (expiringSoon) {
      console.log('[SUPABASE] Token expiring soon in', Math.round(timeUntilExpiry / 1000), 'seconds')
    }

    return expiringSoon
  } catch (err) {
    console.error('[SUPABASE] Error checking token expiration:', err)
    return true
  }
}

/**
 * Get current authenticated user
 * @param {boolean} skipValidation - If true, return session without verifying with server
 */
export async function getCurrentUser(skipValidation = false) {
  try {
    if (!currentSession) {
      console.log('[SUPABASE] No current session')
      return null
    }

    // If skipValidation is true, return user object with just the session data
    if (skipValidation) {
      console.log('[SUPABASE] Returning current session (validation skipped)')

      // Try to get user_id from session object
      let userId = currentSession.user_id

      // If not found, try to extract from access token (JWT)
      if (!userId && currentSession.access_token) {
        console.log('[SUPABASE] user_id not in session, extracting from JWT token...')
        userId = extractUserIdFromToken(currentSession.access_token)
        if (userId) {
          console.log('[SUPABASE] Extracted user_id from JWT:', userId)
          // Update the session to include this for future use
          currentSession.user_id = userId
          await chrome.storage.local.set({ supabase_session: currentSession })
        }
      }

      if (!userId) {
        console.error('[SUPABASE] Could not determine user_id - session invalid')
        return null
      }

      return { id: userId }
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

    console.log('[SUPABASE] User validation response status:', response.status)

    if (response.status === 401) {
      // Token might be expired, try to refresh it
      console.log('[SUPABASE] Got 401 when validating user, attempting token refresh...')
      const refreshed = await refreshAccessToken()

      if (refreshed) {
        console.log('[SUPABASE] Token refreshed successfully, retrying user validation...')
        // Retry the request with the new token
        const retryResponse = await fetch(
          `${SUPABASE_URL}/auth/v1/user`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (retryResponse.ok) {
          const data = await retryResponse.json()
          console.log('[SUPABASE] User validation succeeded after token refresh')
          return data
        } else {
          // Still failed after refresh, clear the session
          const errorBody = await retryResponse.text()
          console.error('[SUPABASE] User validation failed even after token refresh:', {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            body: errorBody
          })
          currentSession = null
          await chrome.storage.local.remove(['supabase_session'])
          return null
        }
      } else {
        // Refresh failed, clear the session
        console.error('[SUPABASE] Token refresh failed, clearing session')
        currentSession = null
        await chrome.storage.local.remove(['supabase_session'])
        return null
      }
    }

    if (!response.ok) {
      // For other errors, log but don't clear session (might be temporary network issue)
      console.error('[SUPABASE] User validation failed:', response.statusText)
      return null
    }

    const data = await response.json()
    return data
  } catch (err) {
    console.error('[SUPABASE] Error getting current user:', err)
    // Don't clear session on network errors - they might be temporary
    return null
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password) {
  try {
    // DEV MODE: Email verification disabled for now
    // Simply sign up without requiring email confirmation
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
          password,
          options: {
            data: {
              signup_origin: 'extension'
            }
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[SUPABASE] Sign up error details:', data)
      throw new Error(data.message || data.error_description || 'Sign up failed')
    }

    console.log('[SUPABASE] Sign up response received')

    const user = data.user || data
    const session = data.session || (data.access_token ? {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user || data.session?.user
    } : null)

    console.log('[SUPABASE] Sign up data:', {
      hasUser: !!user,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      hasRefreshToken: !!session?.refresh_token
    })

    if (session?.access_token) {
      const userId = session.user?.id || user?.id
      if (userId) {
        console.log('[SUPABASE] Persisting sign up session for user:', userId)
        await persistSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user_id: userId
        }, 'email')
      } else {
        console.warn('[SUPABASE] ⚠️ Could not determine user ID from sign up response')
      }
    } else {
      console.warn('[SUPABASE] ⚠️ Sign up response had no access token')
    }

    console.log('[SUPABASE] ✅ Sign up successful:', user?.id || 'unknown')
    return {
      success: true,
      user,
      requiresConfirmation: false // Email verification disabled for dev
    }
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
      console.error('[SUPABASE] Sign in response not ok:', response.status, data)
      throw new Error(data.message || 'Sign in failed')
    }

    console.log('[SUPABASE] Sign in response received:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      userId: data.user?.id
    })

    // Validate we have required tokens
    if (!data.access_token) {
      throw new Error('No access token in response - authentication failed')
    }

    if (!data.refresh_token) {
      console.warn('[SUPABASE] ⚠️ No refresh token in sign in response - session may not persist')
    }

    await persistSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user?.id
    }, 'email')

    console.log('[SUPABASE] ✅ Sign in successful and session persisted:', data.user?.id)
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
      console.log('[SUPABASE] No active session to sign out')
      return { success: true }
    }

    // Attempt to notify server of logout (but don't fail if it doesn't work)
    try {
      const logoutResponse = await fetch(
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
      console.log('[SUPABASE] Server logout response:', logoutResponse.status)
    } catch (err) {
      console.warn('[SUPABASE] Could not notify server of logout (this is OK):', err.message)
    }

    // Always clear local session, even if server notification fails
    currentSession = null
    await chrome.storage.local.remove(['supabase_session'])
    console.log('[SUPABASE] User signed out successfully - session cleared locally')
    return { success: true }
  } catch (err) {
    console.error('[SUPABASE] Error signing out:', err)
    // Force clear session even on error
    currentSession = null
    await chrome.storage.local.remove(['supabase_session'])
    return { success: true } // Return success anyway since we cleared the session
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

    // Check if token is expiring soon and refresh if needed
    if (isTokenExpiringSoon(currentSession.access_token)) {
      console.log('[SUPABASE] Token expiring soon, proactively refreshing...')
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        throw new Error('Failed to refresh session token')
      }
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

    console.log('[SUPABASE] querySelect - URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    console.log('[SUPABASE] querySelect - Response status:', response.status)

    // If 401 Unauthorized, try to refresh token and retry
    if (response.status === 401) {
      console.log('[SUPABASE] Got 401, attempting to refresh token and retry...')
      console.log('[SUPABASE] Current session before refresh:', { user_id: currentSession?.user_id, has_access_token: !!currentSession?.access_token, has_refresh_token: !!currentSession?.refresh_token })
      const refreshed = await refreshAccessToken()
      console.log('[SUPABASE] Token refresh result:', refreshed)

      if (refreshed) {
        console.log('[SUPABASE] Token refreshed successfully, retrying query...')
        // Retry the request with the new token
        const retryResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        })

        console.log('[SUPABASE] Retry response status:', retryResponse.status)
        if (!retryResponse.ok) {
          const errorBody = await retryResponse.text()
          throw new Error(`Query failed after retry: ${retryResponse.statusText} - ${errorBody}`)
        }

        const data = await retryResponse.json()
        console.log('[SUPABASE] Query succeeded after token refresh')
        return options.single ? (data[0] || null) : data
      } else {
        throw new Error('Token refresh failed, and query returned 401 Unauthorized')
      }
    }

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[SUPABASE] querySelect - Response data:', JSON.stringify(data))
    const result = options.single ? (data[0] || null) : data
    console.log('[SUPABASE] querySelect - Returning:', JSON.stringify(result))
    return result
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

    // Check if token is expiring soon and refresh if needed
    if (isTokenExpiringSoon(currentSession.access_token)) {
      console.log('[SUPABASE] Token expiring soon, proactively refreshing...')
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        throw new Error('Failed to refresh session token')
      }
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

    // If 401 Unauthorized, try to refresh token and retry
    if (response.status === 401) {
      console.log('[SUPABASE] Got 401 on insert, attempting to refresh token and retry...')
      const refreshed = await refreshAccessToken()

      if (refreshed) {
        const retryResponse = await fetch(
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

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json()
          throw new Error(errorData.message || `Insert failed: ${retryResponse.statusText}`)
        }

        const data = await retryResponse.json()
        return data
      } else {
        throw new Error('Token refresh failed, and insert returned 401 Unauthorized')
      }
    }

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

    // Check if token is expiring soon and refresh if needed
    if (isTokenExpiringSoon(currentSession.access_token)) {
      console.log('[SUPABASE] Token expiring soon, proactively refreshing...')
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        throw new Error('Failed to refresh session token')
      }
    }

    let url = `${SUPABASE_URL}/rest/v1/${table}?`

    // Add filter conditions
    for (const [key, value] of Object.entries(filters)) {
      url += `${key}=eq.${encodeURIComponent(value)}&`
    }

    console.log('[SUPABASE] queryUpdate - URL:', url)
    console.log('[SUPABASE] queryUpdate - Updates:', JSON.stringify(updates))

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    console.log('[SUPABASE] queryUpdate - Response status:', response.status)

    // If 401 Unauthorized, try to refresh token and retry
    if (response.status === 401) {
      console.log('[SUPABASE] Got 401 on update, attempting to refresh token and retry...')
      const refreshed = await refreshAccessToken()

      if (refreshed) {
        const retryResponse = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        })

        console.log('[SUPABASE] queryUpdate - Retry response status:', retryResponse.status)

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json()
          throw new Error(errorData.message || `Update failed: ${retryResponse.statusText}`)
        }

        return { success: true }
      } else {
        throw new Error('Token refresh failed, and update returned 401 Unauthorized')
      }
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[SUPABASE] queryUpdate error response:', errorData)
      throw new Error(errorData.message || `Update failed: ${response.statusText}`)
    }

    console.log('[SUPABASE] queryUpdate - Success')
    return { success: true }
  } catch (err) {
    console.error('[SUPABASE] Update error:', err)
    throw err
  }
}

/**
 * Sign in with OAuth provider (Google, Discord, etc.)
 * For Chrome extension: uses GitHub Pages as intermediary to handle OAuth redirect
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

    // Build authorization URL using Supabase's standard OAuth flow
    // Redirect through GitHub Pages (like we do for email verification)
    const redirectUrl = `https://jasonhaug.github.io/mindflock-auth-redirect?ext=${chrome.runtime.id}`

    let scope = 'openid profile email'
    if (provider === 'apple') {
      scope = 'email name'
    }

    const params = new URLSearchParams({
      client_id: SUPABASE_ANON_KEY,
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&${params.toString()}`

    // Open auth in new window
    return new Promise((resolve) => {
      chrome.windows.create({ url: authUrl, type: 'popup', width: 500, height: 600 }, (window) => {
        if (!window) {
          resolve({ success: false, error: 'Failed to open auth window' })
          return
        }

        // Listen for OAuth callback from GitHub Pages redirect
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

    await persistSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user?.id
    }, provider)

    console.log('[SUPABASE] OAuth sign in successful:', data.user.id)
    return { success: true, user: data.user }
  } catch (err) {
    console.error('[SUPABASE] Token exchange error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Persist Supabase session locally and ensure the user record exists
 */
async function persistSession(session, provider = 'email') {
  console.log('[SUPABASE] persistSession called with:', {
    hasAccessToken: !!session?.access_token,
    hasRefreshToken: !!session?.refresh_token,
    hasUserId: !!session?.user_id,
    userId: session?.user_id
  })

  if (!session?.access_token || !session?.user_id) {
    console.error('[SUPABASE] ❌ Cannot persist session - missing required data:', {
      hasAccessToken: !!session?.access_token,
      hasUserId: !!session?.user_id
    })
    return
  }

  currentSession = session
  await chrome.storage.local.set({ supabase_session: currentSession })
  console.log('[SUPABASE] ✅ Session persisted to Chrome storage')

  try {
    await ensureUserProfile(session.user_id, provider)
  } catch (err) {
    console.error('[SUPABASE] Failed ensuring user profile:', err)
  }
}

/**
 * Create a basic profile in the public.users table if it does not exist yet
 */
async function ensureUserProfile(userId, authProvider = 'email') {
  if (!userId) {
    return
  }

  try {
    const existing = await querySelect('users', {
      eq: { id: userId },
      single: true
    })

    if (existing) {
      return
    }
  } catch (err) {
    console.warn('[SUPABASE] Error checking existing user profile:', err)
  }

  try {
    await queryInsert('users', [{
      id: userId,
      auth_provider: authProvider,
      xp_total: 500,
      level: 0,
      eggs: 5,
      streak_days: 0,
      last_stim_date: null,
      hearts_remaining_today: 3,
      skip_until: null,
      coop_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    console.log('[SUPABASE] Created user profile:', userId)
  } catch (err) {
    if (err.message?.toLowerCase().includes('duplicate')) {
      console.log('[SUPABASE] User profile already exists')
      return
    }
    throw err
  }
}

/**
 * Store a session that comes from external redirects (email verification, recovery, etc.)
 */
export async function setSessionFromRedirect(accessToken, refreshToken, provider = 'email') {
  try {
    if (!accessToken) {
      throw new Error('Missing access token')
    }

    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    const user = await response.json()

    if (!response.ok) {
      throw new Error(user.message || 'Failed to fetch user information')
    }

    await persistSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: user.id
    }, provider)

    return { success: true, user }
  } catch (err) {
    console.error('[SUPABASE] Error setting session from redirect:', err)
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
