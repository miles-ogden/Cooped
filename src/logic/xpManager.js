/**
 * XP Manager
 * Orchestrates all XP changes from challenges, stimming, skips
 * Syncs updates to Supabase and calculates level progression
 */

import { queryUpdate, getCurrentUser } from './supabaseClient.js';

/**
 * XP thresholds for level calculation
 * Level = floor(sqrt(xp_total / 50)) + 1
 */
function calculateLevelFromXP(xpTotal) {
  return Math.floor(Math.sqrt(xpTotal / 50)) + 1;
}

/**
 * Record XP change to database and update user profile
 * @param {number} xpDelta - Amount to change XP by (can be negative)
 * @param {string} reason - Reason for XP change (for logging)
 * @returns {Object} - { success, newXP, newLevel, xpDelta }
 */
export async function applyXPChange(xpDelta, reason) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[XP_MANAGER] No authenticated user, cannot apply XP change');
      return { success: false, error: 'Not authenticated' };
    }

    console.log(`[XP_MANAGER] Applying XP change: ${xpDelta > 0 ? '+' : ''}${xpDelta} (${reason})`);

    // Query current user stats
    const { querySelect } = await import('./supabaseClient.js');
    const userProfile = await querySelect('users', {
      eq: { id: user.id },
      single: true
    });

    if (!userProfile) {
      console.error('[XP_MANAGER] User profile not found');
      return { success: false, error: 'User profile not found' };
    }

    // Calculate new values
    const oldXP = userProfile.xp_total || 0;
    const newXP = Math.max(0, oldXP + xpDelta); // Prevent negative XP
    const newLevel = calculateLevelFromXP(newXP);
    const oldLevel = userProfile.level || 1;

    // Prepare update
    const updates = {
      xp_total: newXP,
      level: newLevel,
      updated_at: new Date().toISOString()
    };

    // Update database
    await queryUpdate('users', updates, { id: user.id });

    console.log(
      `[XP_MANAGER] XP change applied: ${oldXP} → ${newXP} ` +
      `(Level ${oldLevel} → ${newLevel}). Reason: ${reason}`
    );

    return {
      success: true,
      oldXP,
      newXP,
      xpDelta,
      oldLevel,
      newLevel,
      levelUp: newLevel > oldLevel,
      reason
    };
  } catch (err) {
    console.error('[XP_MANAGER] Error applying XP change:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Record XP event to xp_events table for audit trail
 * @param {string} type - Event type (clean_day, challenge_win, stim_penalty, etc.)
 * @param {number} delta - XP change amount
 * @param {Object} metadata - Additional event data
 */
export async function recordXPEvent(type, delta, metadata = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[XP_MANAGER] No authenticated user, cannot record XP event');
      return null;
    }

    const { queryInsert } = await import('./supabaseClient.js');

    const xpEvent = {
      user_id: user.id,
      type, // 'challenge_win', 'stim_penalty', 'skip_used', etc.
      delta,
      metadata,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    console.log('[XP_MANAGER] Recording XP event:', xpEvent);

    await queryInsert('xp_events', [xpEvent]);
    return xpEvent;
  } catch (err) {
    console.error('[XP_MANAGER] Error recording XP event:', err);
    return null;
  }
}

/**
 * Handle challenge completion
 * Awards +40 XP (partial recovery of the 50 XP wall penalty)
 * Net result: -10 XP after completing challenge to escape wall
 * @param {Object} challengeData - Challenge info (type, difficulty, timeSpent, etc.)
 */
export async function handleChallengeCompletion(challengeData) {
  const xpReward = 40; // Partial recovery on wall penalty (50 - 40 = -10 net)

  // Record to audit trail
  await recordXPEvent('challenge_win', xpReward, {
    challengeType: challengeData.type,
    difficulty: challengeData.difficulty,
    timeSpent: challengeData.timeSpent
  });

  // Apply XP change
  const result = await applyXPChange(xpReward, `Challenge completed (${challengeData.type})`);

  if (result.success) {
    console.log(`[XP_MANAGER] Challenge reward: +${xpReward} XP (net -10 XP after wall penalty)`);
  }

  return result;
}

/**
 * Handle stim wall penalty
 * Applies initial -50 XP when wall appears
 * @param {string} domain - Domain where wall was triggered (tiktok.com, instagram.com, etc.)
 */
export async function handleStimWallPenalty(domain) {
  const xpPenalty = -50;

  // Record to audit trail
  await recordXPEvent('stim_wall', xpPenalty, {
    domain,
    wallType: 'social_media'
  });

  // Apply XP change
  const result = await applyXPChange(xpPenalty, `Stimming wall triggered (${domain})`);

  if (result.success) {
    console.log(`[XP_MANAGER] Stim wall penalty: ${xpPenalty} XP`);
  }

  return result;
}

/**
 * Handle continued usage penalty
 * User continued using site after wall appeared: -10 XP per 2 minutes
 * @param {string} domain - Domain being accessed
 * @param {number} continuedMinutes - How many minutes user continued
 */
export async function handleContinuedUsagePenalty(domain, continuedMinutes) {
  const twoMinutePeriods = Math.floor(continuedMinutes / 2);
  const xpPenalty = -(twoMinutePeriods * 10); // -10 per 2 minutes

  // Record to audit trail
  await recordXPEvent('stim_continued', xpPenalty, {
    domain,
    continuedMinutes,
    periods: twoMinutePeriods
  });

  // Apply XP change
  const result = await applyXPChange(
    xpPenalty,
    `Continued usage penalty (${domain}: ${continuedMinutes}min)`
  );

  if (result.success) {
    console.log(`[XP_MANAGER] Continued usage penalty: ${xpPenalty} XP (${twoMinutePeriods} periods × 2min)`);
  }

  return result;
}

/**
 * Handle skip usage
 * No XP cost, but sets 20-minute cooldown
 * @param {string} domain - Domain where skip was used
 */
export async function handleSkipUsage(domain) {
  // Record to audit trail (0 XP cost)
  await recordXPEvent('skip_used', 0, {
    domain,
    cooldownMinutes: 20
  });

  console.log(`[XP_MANAGER] Skip used for ${domain} - no XP cost, 20 min cooldown`);

  return {
    success: true,
    xpCost: 0,
    cooldownMinutes: 20,
    message: 'Skip used! No XP cost.'
  };
}

/**
 * Get user's current XP and level
 */
export async function getUserXPStatus() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[XP_MANAGER] No authenticated user');
      return null;
    }

    const { querySelect } = await import('./supabaseClient.js');
    const userProfile = await querySelect('users', {
      eq: { id: user.id },
      single: true
    });

    if (!userProfile) {
      return null;
    }

    return {
      userId: user.id,
      xpTotal: userProfile.xp_total || 0,
      level: userProfile.level || 1,
      lastUpdated: userProfile.updated_at
    };
  } catch (err) {
    console.error('[XP_MANAGER] Error getting user XP status:', err);
    return null;
  }
}

/**
 * Calculate XP needed to reach next level
 */
export function getXPToNextLevel(currentXP) {
  const currentLevel = calculateLevelFromXP(currentXP);
  const nextLevel = currentLevel + 1;

  // Reverse the level formula: xp = 50 * (level - 1)^2
  const xpForCurrentLevel = 50 * Math.pow(currentLevel - 1, 2);
  const xpForNextLevel = 50 * Math.pow(nextLevel - 1, 2);

  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  const xpTotalForLevel = xpForNextLevel - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - currentXP;

  return {
    currentLevel,
    nextLevel,
    currentXP,
    xpForCurrentLevel,
    xpForNextLevel,
    xpInCurrentLevel,
    xpTotalForLevel,
    xpNeeded,
    progressPercent: Math.round((xpInCurrentLevel / xpTotalForLevel) * 100)
  };
}

console.log('[XP_MANAGER] Module loaded - XP management system initialized');
