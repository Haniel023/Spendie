/**
 * Offline Transaction Queue
 *
 * When the device has no internet connection, new transactions are stored
 * locally in AsyncStorage. When the app comes back online, `syncQueue()`
 * drains the queue by inserting all pending items into Supabase.
 *
 * Each queued item is a plain transaction payload + a local UUID.
 * The queue is append-only while offline; items are removed after a
 * successful Supabase insert.
 *
 * Usage
 * ─────
 * import { enqueue, syncQueue, getQueuedCount } from './offlineQueue';
 *
 * // When saving a transaction:
 * const online = await NetInfo.fetch().then(s => s.isConnected);
 * if (online) {
 *   await supabase.from('transactions').insert([payload]);
 * } else {
 *   await enqueue(payload);
 * }
 *
 * // On app foreground / reconnect:
 * const synced = await syncQueue(supabase);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getPHNowISO } from './timezone';

const QUEUE_KEY = '@spendie_offline_queue';

/** Generate a simple local UUID for deduplication */
function localId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Load the current queue from AsyncStorage */
export async function loadQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist the queue to AsyncStorage */
async function saveQueue(queue) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[offlineQueue] saveQueue error:', e);
  }
}

/**
 * Add a transaction payload to the offline queue.
 * Automatically tags it with a local_id and created_at (PH time).
 */
export async function enqueue(payload) {
  const queue = await loadQueue();
  const item = {
    ...payload,
    local_id:   localId(),
    created_at: payload.created_at || getPHNowISO(),
    queued_at:  new Date().toISOString(),
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

/** How many transactions are pending sync */
export async function getQueuedCount() {
  const queue = await loadQueue();
  return queue.length;
}

/**
 * Sync all queued transactions to Supabase.
 * Returns { synced: number, failed: number }.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function syncQueue(supabase) {
  if (!(await isOnline())) return { synced: 0, failed: 0 };

  const queue = await loadQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    // Strip the local_id / queued_at meta fields before inserting
    const { local_id, queued_at, ...payload } = item;
    try {
      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) {
        console.error('[offlineQueue] sync error for', local_id, error);
        failed++;
        remaining.push(item); // keep in queue to retry
      } else {
        synced++;
      }
    } catch (e) {
      console.error('[offlineQueue] unexpected error:', e);
      failed++;
      remaining.push(item);
    }
  }

  await saveQueue(remaining);
  return { synced, failed };
}

/**
 * Check whether the device is currently online.
 *
 * Uses navigator.onLine on web; on native tries a lightweight HEAD
 * request to a known fast endpoint (Cloudflare DNS). Falls back to
 * true if the check cannot be performed.
 */
export async function isOnline() {
  try {
    // Web — synchronous, always accurate
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
    // Native — attempt a 3-second HEAD ping
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://1.1.1.1', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Clear the entire queue (e.g. on sign-out).
 */
export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
