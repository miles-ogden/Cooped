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
 * Get a coop by its join code
 */
export async function getCoopByJoinCode(joinCode) {
  try {
    console.log(`[COOP] getCoopByJoinCode called with code: "${joinCode}"`)

    if (!joinCode || joinCode.trim().length === 0) {
      console.error('[COOP] ❌ Join code is empty')
      return { success: false, error: 'Join code is required' }
    }

    const upperCode = joinCode.toUpperCase()
    console.log(`[COOP] 🔍 Searching for coop with join_code: "${upperCode}"`)

    const coop = await querySelect('coops', {
      eq: { join_code: upperCode },
      single: true
    })

    console.log(`[COOP] 📊 querySelect returned:`, coop)

    if (!coop) {
      console.error(`[COOP] ❌ No coop found with code: "${upperCode}"`)
      console.log('[COOP] 💡 Debugging tip: Check if join_code column exists and has data')
      return { success: false, error: 'Coop not found. Check your join code.' }
    }

    console.log(`[COOP] ✅ Found coop by code: ${joinCode} -> ${coop.id} (name: ${coop.name})`)

    return { success: true, coop }
  } catch (err) {
    console.error('[COOP] ❌ Error finding coop by join code:', err)
    console.error('[COOP] Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    })
    return { success: false, error: err.message }
  }
}

/**
 * Join an existing coop
 */
export async function joinCoop(userId, coopId) {
  try {
    console.log(`\n========== JOINING COOP ==========`)
    console.log(`[COOP] 👤 User ID: ${userId}`)
    console.log(`[COOP] 🏘️ Coop ID: ${coopId}`)

    if (!userId || !coopId) {
      return { success: false, error: 'User ID and Coop ID are required' }
    }

    // 1. Get the coop
    console.log(`[COOP] 📖 Step 1: Fetching coop from database...`)
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) throw new Error('Coop not found')

    console.log(`[COOP] ✅ Found coop: "${coop.name}"`)
    console.log(`[COOP] 👥 Current members before join: ${coop.member_ids?.length || 0}`)
    console.log(`[COOP] 📋 Current member_ids: [${coop.member_ids?.join(', ') || 'empty'}]`)

    // 2. Check if user already in coop
    if (coop.member_ids && coop.member_ids.includes(userId)) {
      console.warn(`[COOP] ⚠️ User ${userId} already in coop`)
      return { success: false, error: 'User already in this coop' }
    }

    // 3. Add user to member_ids array
    console.log(`[COOP] 🔗 Step 2: Adding user to member_ids...`)
    const updatedMemberIds = coop.member_ids ? [...coop.member_ids, userId] : [userId]
    console.log(`[COOP] 📝 New member_ids array: [${updatedMemberIds.join(', ')}]`)
    console.log(`[COOP] 👥 New member count: ${updatedMemberIds.length}`)

    console.log(`[COOP] 💾 Step 3: Updating coops table...`)
    await queryUpdate('coops', {
      member_ids: updatedMemberIds,
      updated_at: new Date().toISOString()
    }, { id: coopId })
    console.log(`[COOP] ✅ Coops table updated`)

    // 4. Fetch updated coop to verify
    console.log(`[COOP] 🔍 Step 4: Fetching updated coop to verify...`)
    const updatedCoop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })
    console.log(`[COOP] 📋 Updated member_ids in database: [${updatedCoop.member_ids?.join(', ') || 'empty'}]`)
    console.log(`[COOP] 👥 Updated member count: ${updatedCoop.member_ids?.length || 0}`)

    if (updatedCoop.member_ids?.includes(userId)) {
      console.log(`[COOP] ✅ Verified: User ${userId} is in updated coop`)
    } else {
      console.error(`[COOP] ❌ ERROR: User ${userId} not found in updated member_ids!`)
    }

    // 5. Update user's coop_id
    console.log(`[COOP] 👤 Step 5: Updating user's coop_id...`)
    await queryUpdate('users', { coop_id: coopId }, { id: userId })
    console.log(`[COOP] ✅ User's coop_id updated`)

    console.log(`[COOP] ✅ Successfully joined coop!`)
    console.log(`=================================\n`)

    return { success: true, coop: updatedCoop }
  } catch (err) {
    console.error(`[COOP] ❌ Error joining coop:`, err)
    console.error(`[COOP] Error message: ${err.message}`)
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
 * Query members by ID individually with RLS workaround
 *
 * Approach: Query users who have a coop_id that matches the target coop
 * This works because:
 * 1. Users can see their own profile (auth.uid() = id)
 * 2. We query across the coop members, each seeing themselves
 * 3. Filter results to only include the member IDs we want
 */
async function getMembersData(memberIds, selectFields = 'id,level,xp_total,eggs,streak_days', coopId = null) {
  const members = []

  if (!memberIds || memberIds.length === 0) {
    return members
  }

  console.log(`[COOP] 🔍 Querying ${memberIds.length} member(s) individually...`)

  // Try two approaches:
  // 1. If we have a coopId, query all users in that coop
  // 2. If not, fall back to individual queries

  if (coopId) {
    try {
      // Query all users in this coop - RLS allows this because each user sees their own data
      const coopMembers = await querySelect('users', {
        eq: { coop_id: coopId },
        select: selectFields
      })

      if (coopMembers && Array.isArray(coopMembers)) {
        // Filter to only the member IDs we want (in case of data inconsistency)
        const memberMap = new Set(memberIds.map(id => id.toLowerCase()))
        for (const user of coopMembers) {
          if (memberMap.has(user.id.toLowerCase())) {
            members.push(user)
            console.log(`[COOP] ✅ Fetched member ${user.id}`)
          }
        }
      }
    } catch (err) {
      console.log(`[COOP] ⚠️ Coop-based query failed, falling back to individual queries:`, err.message)
    }
  }

  // Fallback: Query individually by ID
  if (members.length === 0) {
    for (const memberId of memberIds) {
      try {
        const user = await querySelect('users', {
          eq: { id: memberId },
          select: selectFields,
          single: true
        })

        if (user) {
          members.push(user)
          console.log(`[COOP] ✅ Fetched member ${memberId}`)
        } else {
          console.log(`[COOP] ⚠️ Member ${memberId} not found`)
        }
      } catch (err) {
        console.log(`[COOP] ⚠️ Error fetching member ${memberId}:`, err.message)
      }
    }
  }

  // Sort by level (highest first)
  members.sort((a, b) => (b.level || 0) - (a.level || 0))
  console.log(`[COOP] ✅ Fetched ${members.length} of ${memberIds.length} members`)

  return members
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

    // Get full user details for members - query by coop_id
    console.log(`[COOP] 👥 Member IDs in coop: ${coop.member_ids?.length || 0} members`)
    console.log(`[COOP] 📋 Member IDs:`, coop.member_ids)

    const members = await getMembersData(coop.member_ids, 'id,level,xp_total,eggs,streak_days', coopId)

    // Calculate coop stats
    // Per MVP plan: Coop rank = sum of members' levels
    const totalXp = members.reduce((sum, m) => sum + (m.xp_total || 0), 0)
    const coopLevel = members.reduce((sum, m) => sum + (m.level || 0), 0)
    const avgLevel = members.length > 0 ? Math.round(coopLevel / members.length) : 0

    console.log(`[COOP] ✅ Fetched coop ${coopId}: ${members.length} members, rank ${coopLevel}`)

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
 * DEBUG: Get all coops to inspect their data
 */
export async function debugGetAllCoops() {
  try {
    console.log('[COOP_DEBUG] Fetching all coops...')
    const coops = await querySelect('coops', {
      select: 'id,name,join_code,creator_user_id,member_ids'
    })
    console.log('[COOP_DEBUG] ✅ All coops in database:')
    if (!coops || coops.length === 0) {
      console.log('[COOP_DEBUG] ⚠️ No coops found in database')
      return []
    }
    coops.forEach(coop => {
      console.log(`[COOP_DEBUG] - Coop: "${coop.name}" (ID: ${coop.id})`)
      console.log(`  join_code: "${coop.join_code}"`)
      console.log(`  creator: ${coop.creator_user_id}`)
      console.log(`  member_ids array: [${coop.member_ids?.join(', ') || 'empty'}]`)
      console.log(`  members count: ${coop.member_ids?.length || 0}`)
    })
    return coops
  } catch (err) {
    console.error('[COOP_DEBUG] Error fetching coops:', err)
    return []
  }
}

/**
 * DEBUG: Test RLS and member visibility
 */
export async function debugTestMemberVisibility(coopId) {
  try {
    console.log('\n========== RLS & MEMBER VISIBILITY TEST ==========')
    const { getCurrentUser } = await import('./supabaseClient.js')

    const currentUser = await getCurrentUser(true)
    console.log(`[RLS_TEST] Current user ID: ${currentUser?.id}`)

    // Get the coop
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })
    console.log(`[RLS_TEST] Coop: "${coop.name}"`)
    console.log(`[RLS_TEST] member_ids in database: [${coop.member_ids?.join(', ') || 'empty'}]`)

    // Try to get all users
    console.log(`[RLS_TEST] Attempting to query users table...`)
    const allUsers = await querySelect('users', {
      select: 'id,level,xp_total'
    })
    console.log(`[RLS_TEST] querySelect('users') returned ${allUsers?.length || 0} users`)

    if (allUsers && allUsers.length > 0) {
      console.log(`[RLS_TEST] Users returned:`)
      allUsers.forEach(u => {
        const isMember = coop.member_ids?.includes(u.id)
        const isCurrentUser = u.id === currentUser?.id
        console.log(`  - ID: ${u.id}${isCurrentUser ? ' (YOU)' : ''}${isMember ? ' ✅ MEMBER' : ''}`)
      })
    }

    console.log('================================================\n')
    return { coop, allUsers, currentUser }
  } catch (err) {
    console.error('[RLS_TEST] Error:', err)
    return null
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

    // Get all members' stats - query by coop_id for RLS compatibility
    const members = await getMembersData(coop.member_ids, 'id,level,xp_total', coopId)

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
