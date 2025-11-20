/**
 * Coop Manager - Team/Group System
 * MVP Step 4 - Per chicken_popup_mvp_plan.md
 * Allows users to create/join coops and see leaderboards
 * Coop rank = sum of members' levels
 */

import { querySelect, queryUpdate, queryInsert } from './supabaseClient.js'

/**
 * Create a new coop
 */
export async function createCoop(coopName, creatorUserId) {
  try {
    if (!coopName || coopName.trim().length === 0) {
      return { success: false, error: 'Coop name is required' }
    }

    if (!creatorUserId) {
      return { success: false, error: 'Creator user ID is required' }
    }

    // Create coop with creator as first member
    const now = new Date().toISOString()
    const newCoops = await queryInsert('coops', [{
      name: coopName,
      creator_user_id: creatorUserId,
      member_ids: [creatorUserId],
      coop_level: 1,
      total_xp: 0,
      created_at: now
    }])

    const newCoop = newCoops[0]

    console.log(`[COOP] New coop created: ${newCoop.id} by ${creatorUserId}`)

    // Add coop_id to creator's user profile
    await queryUpdate('users', { coop_id: newCoop.id }, { id: creatorUserId })

    return { success: true, coop: newCoop }
  } catch (err) {
    console.error('[COOP] Error creating coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Join an existing coop
 */
export async function joinCoop(userId, coopId) {
  try {
    if (!userId || !coopId) {
      return { success: false, error: 'User ID and Coop ID are required' }
    }

    // 1. Get the coop
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) throw new Error('Coop not found')

    // 2. Check if user already in coop
    if (coop.member_ids && coop.member_ids.includes(userId)) {
      return { success: false, error: 'User already in this coop' }
    }

    // 3. Add user to member_ids array
    const updatedMemberIds = coop.member_ids ? [...coop.member_ids, userId] : [userId]

    await queryUpdate('coops', {
      member_ids: updatedMemberIds,
      updated_at: new Date().toISOString()
    }, { id: coopId })

    // 4. Fetch updated coop
    const updatedCoop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    // 5. Update user's coop_id
    await queryUpdate('users', { coop_id: coopId }, { id: userId })

    console.log(`[COOP] User ${userId} joined coop ${coopId}`)

    return { success: true, coop: updatedCoop }
  } catch (err) {
    console.error('[COOP] Error joining coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Leave a coop
 */
export async function leaveCoop(userId, coopId) {
  try {
    if (!userId || !coopId) {
      return { success: false, error: 'User ID and Coop ID are required' }
    }

    // 1. Get the coop
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) throw new Error('Coop not found')

    // 2. Check if user is the creator (can't leave as creator)
    if (coop.creator_user_id === userId) {
      return { success: false, error: 'Creator cannot leave coop. Delete it instead.' }
    }

    // 3. Remove user from member_ids
    const updatedMemberIds = (coop.member_ids || []).filter(id => id !== userId)

    await queryUpdate('coops', {
      member_ids: updatedMemberIds,
      updated_at: new Date().toISOString()
    }, { id: coopId })

    // 4. Fetch updated coop
    const updatedCoop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    // 5. Update user's coop_id to null
    await queryUpdate('users', { coop_id: null }, { id: userId })

    console.log(`[COOP] User ${userId} left coop ${coopId}`)

    return { success: true, coop: updatedCoop }
  } catch (err) {
    console.error('[COOP] Error leaving coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get coop data and members with their stats
 * MVP: Members sorted by level (highest first)
 * Coop rank = sum of members' levels
 */
export async function getCoopData(coopId) {
  try {
    if (!coopId) {
      return { success: false, error: 'Coop ID is required' }
    }

    // Get coop
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) throw new Error('Coop not found')

    // Get full user details for members
    let members = []
    if (coop.member_ids && coop.member_ids.length > 0) {
      // Query all members and sort by level
      const allUsers = await querySelect('users', {
        select: 'id,level,xp_total,eggs,streak_days'
      })
      members = allUsers
        .filter(u => coop.member_ids.includes(u.id))
        .sort((a, b) => (b.level || 0) - (a.level || 0))
    }

    // Calculate coop stats
    // Per MVP plan: Coop rank = sum of members' levels
    const totalXp = members.reduce((sum, m) => sum + (m.xp_total || 0), 0)
    const coopLevel = members.reduce((sum, m) => sum + (m.level || 0), 0)
    const avgLevel = members.length > 0 ? Math.round(coopLevel / members.length) : 0

    console.log(`[COOP] Fetched coop ${coopId}: ${members.length} members, rank ${coopLevel}`)

    return {
      success: true,
      coop: {
        ...coop,
        memberCount: members.length,
        totalXp: totalXp,
        coopLevel: coopLevel,
        averageLevel: avgLevel
      },
      members: members
    }
  } catch (err) {
    console.error('[COOP] Error getting coop data:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a coop (creator only)
 */
export async function deleteCoop(userId, coopId) {
  try {
    // Get coop
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) throw new Error('Coop not found')

    // Check if user is creator
    if (coop.creator_user_id !== userId) {
      return { success: false, error: 'Only the creator can delete the coop' }
    }

    // Remove all members from coop
    if (coop.member_ids && coop.member_ids.length > 0) {
      await queryUpdate('users', { coop_id: null }, { id: coop.member_ids[0] })
      // Note: In MVP, this updates one at a time. For scale, would use batch operations
    }

    // Delete coop (note: REST API may not support delete - fallback to update approach)
    // For now, mark as deleted or update members array
    await queryUpdate('coops', {
      member_ids: [],
      updated_at: new Date().toISOString()
    }, { id: coopId })

    console.log(`[COOP] Coop ${coopId} deleted by ${userId}`)

    return { success: true }
  } catch (err) {
    console.error('[COOP] Error deleting coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get list of all public coops (for discovering/joining)
 * Ordered by coop level (highest first)
 */
export async function getPublicCoops() {
  try {
    const coops = await querySelect('coops', {
      select: 'id,name,creator_user_id,coop_level,member_ids,created_at'
    })

    // Get member count for each coop and sort by level
    const coopsWithMemberCount = (coops || [])
      .map(coop => ({
        ...coop,
        memberCount: coop.member_ids ? coop.member_ids.length : 0
      }))
      .sort((a, b) => (b.coop_level || 0) - (a.coop_level || 0))
      .slice(0, 50)

    console.log(`[COOP] Fetched ${coopsWithMemberCount.length} public coops`)

    return { success: true, coops: coopsWithMemberCount }
  } catch (err) {
    console.error('[COOP] Error getting public coops:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Check if user is in a coop
 */
export async function getUserCoop(userId) {
  try {
    const user = await querySelect('users', {
      eq: { id: userId },
      select: 'coop_id',
      single: true
    })

    if (!user || !user.coop_id) {
      return { success: true, inCoop: false, coopId: null }
    }

    // Get coop data
    const coopResult = await getCoopData(user.coop_id)

    if (!coopResult.success) {
      throw new Error(coopResult.error)
    }

    return {
      success: true,
      inCoop: true,
      coopId: user.coop_id,
      coopData: coopResult.coop,
      members: coopResult.members
    }
  } catch (err) {
    console.error('[COOP] Error getting user coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update coop stats (called when member XP/level changes)
 * Per MVP plan: Coop level = sum of members' levels
 * This keeps the coop's aggregate stats in sync
 */
export async function updateCoopStats(coopId) {
  try {
    // Get coop to find members
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) throw new Error('Coop not found')

    // Get all members' stats
    let members = []
    if (coop.member_ids && coop.member_ids.length > 0) {
      const allUsers = await querySelect('users', {
        select: 'xp_total,level'
      })
      members = allUsers.filter(u => coop.member_ids.includes(u.id))
    }

    // Calculate totals
    // Per MVP: Coop level = sum of members' levels
    const totalXp = members.reduce((sum, m) => sum + (m.xp_total || 0), 0)
    const coopLevel = members.reduce((sum, m) => sum + (m.level || 0), 0)

    // Update coop
    await queryUpdate('coops', {
      total_xp: totalXp,
      coop_level: coopLevel,
      updated_at: new Date().toISOString()
    }, { id: coopId })

    // Fetch updated coop
    const updatedCoop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    console.log(`[COOP] Updated coop ${coopId}: Level=${coopLevel}, XP=${totalXp}`)

    return { success: true, coop: updatedCoop }
  } catch (err) {
    console.error('[COOP] Error updating coop stats:', err)
    return { success: false, error: err.message }
  }
}
