/**
 * Email Verification Callback Handler
 * Consumes Supabase redirect params and stores the resulting session
 */

import { setSessionFromRedirect } from '../logic/supabaseClient.js'

const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ''))
const params = hashParams.toString() ? hashParams : searchParams

const accessToken = params.get('access_token')
const refreshToken = params.get('refresh_token')
const type = params.get('type') || searchParams.get('type')
const errorCode = params.get('error') || params.get('error_code')
const errorDescription = params.get('error_description')

console.log('[AUTH_CALLBACK] Type:', type)
console.log('[AUTH_CALLBACK] Access Token Present:', Boolean(accessToken))
console.log('[AUTH_CALLBACK] Error:', errorCode, errorDescription)

if (errorCode) {
  handleError(errorDescription || 'Email verification failed')
} else if (accessToken) {
  finalizeSession(accessToken, refreshToken, type)
} else {
  handleError('No authentication information was provided. Please use the most recent email link.')
}

async function finalizeSession(accessToken, refreshToken, type) {
  try {
    const result = await setSessionFromRedirect(accessToken, refreshToken, type === 'signup' ? 'email' : 'email')

    if (!result.success) {
      throw new Error(result.error || 'Unable to store Supabase session')
    }

    window.opener?.postMessage({
      type: 'AUTH_VERIFIED',
      success: true,
      user: result.user
    }, '*')

    showStatus('✓', 'Email Verified!', 'Your account is confirmed. You can now return to the Cooped extension.')

    setTimeout(() => {
      window.close()
    }, 2000)
  } catch (err) {
    handleError(err.message)
  }
}

function handleError(message) {
  console.error('[AUTH_CALLBACK] Verification error:', message)
  window.opener?.postMessage({
    type: 'AUTH_ERROR',
    error: message
  }, '*')

  showStatus('✕', 'Verification Failed', message)

  setTimeout(() => {
    window.close()
  }, 3000)
}

function showStatus(symbol, title, body) {
  const container = document.querySelector('.container')
  if (!container) return

  const color = symbol === '✓' ? '#667eea' : '#ff4757'
  container.innerHTML = `
    <div style="color: ${color}; font-size: 48px; margin-bottom: 20px;">${symbol}</div>
    <h2>${title}</h2>
    <p>${body}</p>
  `
}
