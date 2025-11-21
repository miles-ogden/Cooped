/**
 * Time Sync Service for Cooped
 * Periodically syncs accumulated time from Chrome storage to Supabase
 * Handles daily and weekly time tracking with timezone awareness
 * Manages offline queues for when connection is unavailable
 */

import { getAllAccumulatedTimes, getUserTimezone, getSyncQueue, clearSyncQueue } from '../utils/time-tracking.js';
import { getCurrentUser, querySelect, queryInsert, queryUpdate } from '../logic/supabaseClient.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

/**
 * Initialize time sync service
 * Sets up periodic sync interval
 */
export function initializeTimeSyncService() {
  console.log('[TIME-SYNC] Initializing time sync service');

  // Run sync immediately on startup
  syncTimeData();

  // Then set up periodic sync every 5 minutes
  setInterval(() => {
    syncTimeData();
  }, SYNC_INTERVAL_MS);

  console.log('[TIME-SYNC] Time sync service initialized - syncing every 5 minutes');
}

/**
 * Main sync function - reads accumulated time and pushes to Supabase
 */
async function syncTimeData() {
  try {
    console.log('[TIME-SYNC] === SYNC START ===');

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      console.log('[TIME-SYNC] No authenticated user - skipping sync');
      return;
    }

    // Get all accumulated time data from Chrome storage
    const accumulatedTimes = await getAllAccumulatedTimes();

    if (Object.keys(accumulatedTimes).length === 0) {
      console.log('[TIME-SYNC] No accumulated time data to sync');
      return;
    }

    console.log('[TIME-SYNC] Syncing accumulated times:', accumulatedTimes);

    // Sync each domain's data
    for (const [domain, timeData] of Object.entries(accumulatedTimes)) {
      await syncDomainTimeData(user.id, domain, timeData);
    }

    // Process any queued offline syncs
    await processSyncQueue(user.id);

    console.log('[TIME-SYNC] === SYNC END ===');
  } catch (error) {
    console.error('[TIME-SYNC] Error during sync:', error);
  }
}

/**
 * Sync time data for a specific domain
 * Creates or updates daily and weekly records in Supabase
 */
async function syncDomainTimeData(userId, domain, timeData) {
  try {
    console.log(`[TIME-SYNC] Syncing ${domain}:`, timeData);

    // Sync to daily_time_tracking
    await syncDailyTimeData(userId, domain, timeData);

    // Sync to weekly_time_tracking
    await syncWeeklyTimeData(userId, domain, timeData);

    console.log(`[TIME-SYNC] ✅ Successfully synced ${domain}`);
  } catch (error) {
    console.error(`[TIME-SYNC] ❌ Error syncing ${domain}:`, error);
    // Queue for retry
    await queueSyncRetry(userId, domain, timeData);
  }
}

/**
 * Sync daily time tracking data to Supabase
 * Updates existing record or creates new one
 */
async function syncDailyTimeData(userId, domain, timeData) {
  try {
    const { date, totalMinutes } = timeData;

    console.log(`[TIME-SYNC] Syncing daily data - ${domain} on ${date}: ${totalMinutes} minutes`);

    // Check if record already exists
    const existingRecords = await querySelect('daily_time_tracking', {
      eq: { user_id: userId, domain, date },
      single: true
    });

    if (existingRecords && existingRecords.id) {
      // Update existing record
      await queryUpdate('daily_time_tracking', {
        id: existingRecords.id,
        total_minutes: totalMinutes,
        updated_at: new Date().toISOString()
      });
      console.log(`[TIME-SYNC] ✅ Updated daily record for ${domain} on ${date}`);
    } else {
      // Create new record
      await queryInsert('daily_time_tracking', [{
        user_id: userId,
        domain,
        date,
        total_minutes: totalMinutes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
      console.log(`[TIME-SYNC] ✅ Created daily record for ${domain} on ${date}`);
    }
  } catch (error) {
    console.error(`[TIME-SYNC] Error syncing daily data for ${domain}:`, error);
    throw error;
  }
}

/**
 * Sync weekly time tracking data to Supabase
 * Aggregates all daily data for the week into a single record
 */
async function syncWeeklyTimeData(userId, domain, timeData) {
  try {
    const { weekStart, weekEnd, date, totalMinutes } = timeData;

    console.log(`[TIME-SYNC] Syncing weekly data - ${domain} week of ${weekStart}: ${totalMinutes} minutes`);

    // For now, sync the current week's data
    // Note: In a real system, this would aggregate all daily records for the week
    const existingRecords = await querySelect('weekly_time_tracking', {
      eq: { user_id: userId, domain, week_start_date: weekStart },
      single: true
    });

    if (existingRecords && existingRecords.id) {
      // Update existing record with accumulated time for the week
      await queryUpdate('weekly_time_tracking', {
        id: existingRecords.id,
        total_minutes: totalMinutes,
        updated_at: new Date().toISOString()
      });
      console.log(`[TIME-SYNC] ✅ Updated weekly record for ${domain} week of ${weekStart}`);
    } else {
      // Create new record
      await queryInsert('weekly_time_tracking', [{
        user_id: userId,
        domain,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        total_minutes: totalMinutes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
      console.log(`[TIME-SYNC] ✅ Created weekly record for ${domain} week of ${weekStart}`);
    }
  } catch (error) {
    console.error(`[TIME-SYNC] Error syncing weekly data for ${domain}:`, error);
    throw error;
  }
}

/**
 * Process any sync events that were queued during offline periods
 */
async function processSyncQueue(userId) {
  try {
    const queue = await getSyncQueue();

    if (queue.length === 0) {
      return;
    }

    console.log(`[TIME-SYNC] Processing ${queue.length} queued sync events`);

    for (const queueItem of queue) {
      const { domain, data, retries } = queueItem;

      if (retries >= MAX_RETRIES) {
        console.warn(`[TIME-SYNC] Max retries exceeded for ${domain}, skipping`);
        continue;
      }

      try {
        await syncDomainTimeData(userId, domain, data);
      } catch (error) {
        console.error(`[TIME-SYNC] Failed to process queued sync for ${domain}:`, error);
        // Will be retried on next sync
      }
    }

    // Clear queue after processing
    await clearSyncQueue();
    console.log('[TIME-SYNC] ✅ Sync queue processed');
  } catch (error) {
    console.error('[TIME-SYNC] Error processing sync queue:', error);
  }
}

/**
 * Queue a sync event for retry on next sync cycle
 */
async function queueSyncRetry(userId, domain, timeData) {
  try {
    const result = await chrome.storage.local.get('cooped_sync_queue');
    const queue = result.cooped_sync_queue || [];

    // Find and increment retry count if already in queue
    const existingIndex = queue.findIndex(q => q.domain === domain);
    if (existingIndex >= 0) {
      queue[existingIndex].retries += 1;
    } else {
      queue.push({
        domain,
        data: timeData,
        queuedAt: Date.now(),
        retries: 1
      });
    }

    await chrome.storage.local.set({ cooped_sync_queue: queue });
    console.log(`[TIME-SYNC] Queued retry for ${domain}`);
  } catch (error) {
    console.error('[TIME-SYNC] Error queuing sync retry:', error);
  }
}

console.log('[TIME-SYNC] Time sync service module loaded');
