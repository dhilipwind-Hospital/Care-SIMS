import * as SecureStore from 'expo-secure-store';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import api from './api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QueueItem {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'hms_offline_queue';
const MAX_RETRIES = 3;

/* ------------------------------------------------------------------ */
/*  Queue persistence helpers                                          */
/* ------------------------------------------------------------------ */

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueueItem[]): Promise<void> {
  try {
    const payload = JSON.stringify(queue);
    // SecureStore has a 2048-byte limit per item; fall back gracefully
    if (payload.length > 2048) {
      // Keep only the most recent items that fit
      const trimmed = queue.slice(-20);
      await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(trimmed));
    } else {
      await SecureStore.setItemAsync(QUEUE_KEY, payload);
    }
  } catch {
    /* ignore write failures */
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Add an operation to the offline queue.
 * Called automatically by the API interceptor on network errors.
 */
export async function enqueueOfflineAction(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
): Promise<void> {
  const queue = await readQueue();
  const item: QueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method,
    url,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };
  queue.push(item);
  await writeQueue(queue);
}

/**
 * Process all queued offline actions in order.
 * Returns counts of synced and failed items.
 */
export async function processOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueueItem[] = [];

  for (const item of queue) {
    try {
      await api.request({
        method: item.method,
        url: item.url,
        data: item.data,
        // Skip offline queuing for replayed requests to avoid infinite loops
        headers: { 'X-Offline-Replay': 'true' },
      });
      synced++;
    } catch {
      item.retryCount++;
      if (item.retryCount < MAX_RETRIES) {
        remaining.push(item);
      } else {
        // Exceeded max retries — drop it
        failed++;
      }
    }
  }

  await writeQueue(remaining);
  return { synced, failed };
}

/**
 * Get number of pending items in the offline queue.
 */
export async function getOfflineQueueCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Get all pending items in the offline queue.
 */
export async function getOfflineQueueItems(): Promise<QueueItem[]> {
  return readQueue();
}

/**
 * Clear the entire offline queue.
 */
export async function clearOfflineQueue(): Promise<void> {
  await SecureStore.deleteItemAsync(QUEUE_KEY);
}

/**
 * Start monitoring network connectivity and auto-sync when back online.
 * Returns an unsubscribe function.
 */
export function startOfflineSync(
  onSynced?: (count: number) => void,
  onStatusChange?: (isConnected: boolean) => void,
): () => void {
  let processing = false;

  const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    onStatusChange?.(connected);

    if (connected && !processing) {
      processing = true;
      try {
        const count = await getOfflineQueueCount();
        if (count > 0) {
          const result = await processOfflineQueue();
          if (result.synced > 0) {
            onSynced?.(result.synced);
          }
        }
      } finally {
        processing = false;
      }
    }
  });

  return unsubscribe;
}
