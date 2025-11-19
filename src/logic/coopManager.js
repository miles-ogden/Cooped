/**
 * Coop Manager - Team/Group System
 * Allows users to create/join coops and see leaderboards
 */

import { supabase } from './supabaseClient.js'

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
    const { data: newCoop, error } = await supabase
      .from('coops')
      .insert([{
        name: coopName,
        creator_user_id: creatorUserId,
        member_ids: [creatorUserId],
        coop_level: 1,
        total_xp: 0,
        created_at: new Date()
      }])
      .select()
      .single()

    if (error) throw error

    console.log(`[COOP] New coop created: ${newCoop.id} by ${creatorUserId}`)

    // Add coop_id to creator's user profile
    await supabase
      .from('users')
      .update({ coop_id: newCoop.id })
      .eq('id', creatorUserId)

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
    const { data: coop, error: coopError } = await supabase
      .from('coops')
      .select('*')
      .eq('id', coopId)
      .single()

    if (coopError) throw coopError
    if (!coop) throw new Error('Coop not found')

    // 2. Check if user already in coop
    if (coop.member_ids.includes(userId)) {
      return { success: false, error: 'User already in this coop' }
    }

    // 3. Add user to member_ids array
    const updatedMemberIds = [...coop.member_ids, userId]

    const { data: updatedCoop, error: updateError } = await supabase
      .from('coops')
      .update({
        member_ids: updatedMemberIds,
        updated_at: new Date()
      })
      .eq('id', coopId)
      .select()
      .single()

    if (updateError) throw updateError

    // 4. Update user's coop_id
    await supabase
      .from('users')
      .update({ coop_id: coopId })
      .eq('id', userId)

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
    const { data: coop, error: coopError } = await supabase
      .from('coops')
      .select('*')
      .eq('id', coopId)
      .single()

    if (coopError) throw coopError
    if (!coop) throw new Error('Coop not found')

    // 2. Check if user is the creator (can't leave as creator)
    if (coop.creator_user_id === userId) {
      return { success: false, error: 'Creator cannot leave coop. Delete it instead.' }
    }

    // 3. Remove user from member_ids
    const updatedMemberIds = coop.member_ids.filter(id => id !== userId)

    const { data: updatedCoop, error: updateError } = await supabase
      .from('coops')
      .update({
        member_ids: updatedMemberIds,
        updated_at: new Date()
      })
      .eq('id', coopId)
      .select()
      .single()

    if (updateError) throw updateError

    // 4. Update user's coop_id to null
    await supabase
      .from('users')
      .update({ coop_id: null })
      .eq('id', userId)

    console.log(`[COOP] User ${userId} left coop ${coopId}`)

    return { success: true, coop: updatedCoop }
  } catch (err) {
    console.error('[COOP] Error leaving coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get coop data and members with their stats
 */
export async function getCoopData(coopId) {
  try {
    if (!coopId) {
      return { success: false, error: 'Coop ID is required' }
    }

    // Get coop
    const { data: coop, error: coopError } = await supabase
      .from('coops')
      .select('*')
      .eq('id', coopId)
      .single()

    if (coopError) throw coopError
    if (!coop) throw new Error('Coop not found')

    // Get leaderboard for this coop
    const { data: leaderboard, error: leaderError } = await supabase
      .from('coop_leaderboard')
      .select('*')
      .eq('coop_id', coopId)
      .order('rank', { ascending: true })

    if (leaderError) throw leaderError

    // Get full user details for members
    const { data: members, error: memberError } = await supabase
      .from('users')
      .select('id, level, xp_total, eggs, streak_days')
      .in('id', coop.member_ids)
      .order('level', { ascending: false })

    if (memberError) throw memberError

    // Calculate coop stats
    const totalXp = members.reduce((sum, m) => sum + m.xp_total, 0)
    const coopLevel = members.reduce((sum, m) => sum + m.level, 0)
    const avgLevel = Math.round(coopLevel / members.length)

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
      members: members,
      leaderboard: leaderboard
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
    const { data: coop, error: coopError } = await supabase
      .from('coops')
      .select('*')
      .eq('id', coopId)
      .single()

    if (coopError) throw coopError
    if (!coop) throw new Error('Coop not found')

    // Check if user is creator
    if (coop.creator_user_id !== userId) {
      return { success: false, error: 'Only the creator can delete the coop' }
    }

    // Remove all members from coop
    const { error: updateError } = await supabase
      .from('users')
      .update({ coop_id: null })
      .in('id', coop.member_ids)

    if (updateError) throw updateError

    // Delete coop
    const { error: deleteError } = await supabase
      .from('coops')
      .delete()
      .eq('id', coopId)

    if (deleteError) throw deleteError

    console.log(`[COOP] Coop ${coopId} deleted by ${userId}`)

    return { success: true }
  } catch (err) {
    console.error('[COOP] Error deleting coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get list of all public coops (for discovering/joining)
 */
export async function getPublicCoops() {
  try {
    const { data: coops, error } = await supabase
      .from('coops')
      .select('id, name, creator_user_id, coop_level, created_at')
      .order('coop_level', { ascending: false })
      .limit(50)

    if (error) throw error

    // Get member count for each coop
    const coopsWithMemberCount = coops.map(coop => ({
      ...coop,
      memberCount: coop.member_ids ? coop.member_ids.length : 0
    }))

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
    const { data: user, error } = await supabase
      .from('users')
      .select('coop_id')
      .eq('id', userId)
      .single()

    if (error) throw error

    if (!user.coop_id) {
      return { success: true, inCoop: false, coopId: null }
    }

    // Get coop data
    const coopData = await getCoopData(user.coop_id)

    return {
      success: true,
      inCoop: true,
      coopId: user.coop_id,
      coopData: coopData.coop
    }
  } catch (err) {
    console.error('[COOP] Error getting user coop:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update coop stats (called when member XP/level changes)
 * This keeps the coop's aggregate stats in sync
 */
export async function updateCoopStats(coopId) {
  try {
    // Get all members
    const { data: members, error: memberError } = await supabase
      .from('users')
      .select('xp_total, level')
      .in('id', (
        await supabase
          .from('coops')
          .select('member_ids')
          .eq('id', coopId)
          .single()
      ).data.member_ids)

    if (memberError) throw memberError

    // Calculate totals
    const totalXp = members.reduce((sum, m) => sum + m.xp_total, 0)
    const coopLevel = members.reduce((sum, m) => sum + m.level, 0)

    // Update coop
    const { data: updatedCoop, error } = await supabase
      .from('coops')
      .update({
        total_xp: totalXp,
        coop_level: coopLevel,
        updated_at: new Date()
      })
      .eq('id', coopId)
      .select()
      .single()

    if (error) throw error

    console.log(`[COOP] Updated coop ${coopId}: Level=${coopLevel}, XP=${totalXp}`)

    return { success: true, coop: updatedCoop }
  } catch (err) {
    console.error('[COOP] Error updating coop stats:', err)
    return { success: false, error: err.message }
  }
}
