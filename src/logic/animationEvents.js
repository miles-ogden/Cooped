/**
 * Animation Events - Hook system for UI animations
 *
 * For MVP: Simply logs events
 * For future: Designer will attach animations to these events
 *
 * Events include:
 * - "LEVEL_UP" - User gained a level
 * - "EGG_GAINED" - User gained an egg
 * - "STREAK_UP" - User's streak increased
 * - "STIM_DETECTED" - User visited a blocked site
 * - "HEART_USED" - User used a skip heart
 * - "GAME_WIN" - User won a challenge
 * - "GAME_LOSE" - User lost a challenge
 * - "BRAIN_BONK" - Penalty applied (XP loss, streak reset)
 */

/**
 * Trigger an animation event
 * @param {string} type - Animation event type
 * @param {object} payload - Event data
 */
export function triggerAnimation(type, payload = {}) {
  // For MVP: Log to console
  console.log(`[ANIMATION_EVENT] ${type}:`, payload)

  // Dispatch event for UI listeners
  const event = new CustomEvent('cooped:animation', {
    detail: { type, payload }
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(event)
  }

  // Future: Designer will map these to actual animations
  // e.g., triggerAnimation('LEVEL_UP', { newLevel: 5 })
  // will trigger CSS animations, particle effects, sounds, etc.
}

/**
 * Listen for animation events
 * @param {string} type - Event type to listen for
 * @param {function} callback - Function to call when event fires
 */
export function onAnimation(type, callback) {
  if (typeof window === 'undefined') return

  window.addEventListener('cooped:animation', (event) => {
    if (event.detail.type === type) {
      callback(event.detail.payload)
    }
  })
}

/**
 * All animation event types (for reference)
 */
export const ANIMATION_EVENTS = {
  LEVEL_UP: 'LEVEL_UP',
  EGG_GAINED: 'EGG_GAINED',
  STREAK_UP: 'STREAK_UP',
  STIM_DETECTED: 'STIM_DETECTED',
  HEART_USED: 'HEART_USED',
  GAME_WIN: 'GAME_WIN',
  GAME_LOSE: 'GAME_LOSE',
  BRAIN_BONK: 'BRAIN_BONK'
}
