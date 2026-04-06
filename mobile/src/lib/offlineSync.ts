import * as SecureStore from 'expo-secure-store';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import api from './api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type QueueItemStatus = 'pending' | 'syncing' | 'failed';

export interface QueueItem {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  timestamp: number;
  retries: number;
  status: QueueItemStatus;
}

const QUEUE_KEY = 'hms_offline_queue';
const MAX_RETRIES = 3;
const SECURE_STORE_LIMIT = 2048;

/* ------------------------------------------------------------------ */
/*  Listener registry                                                  */
/* ------------------------------------------------------------------ */

type SyncListener = (info: { synced: number; failed: number; pending: number }) => void;
type QueueListener = (queue: QueueItem[]) => void;

const syncListeners = new Set<SyncListener>();
const queueListeners = new Set<QueueListener>();

export function onSync(fn: SyncListener): () => void {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

export function onQueueChange(fn: QueueListener): () => void {
  queueListeners.add(fn);
  return () => queueListeners.delete(fn);
}

async function notifyQueueChange() {
  const q = await readQueue();
  queueListeners.forEach((fn) => {
    try {
      fn(q);
    } catch {
      /* ignore */
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
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
    let payload = JSON.stringify(queue);
    if (payload.length > SECURE_STORE_LIMIT) {
      // Trim oldest pending items until under limit (keep failed items visible)
      const sorted = [...queue].sort((a, b) => b.timestamp - a.timestamp);
      let trimmed = sorted;
      while (JSON.stringify(trimmed).length > SECURE_STORE_LIMIT && trimmed.length > 1) {
        trimmed = trimmed.slice(0, trimmed.length - 1);
      }
      payload = JSON.stringify(trimmed);
    }
    await SecureStore.setItemAsync(QUEUE_KEY, payload);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface EnqueueInput {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
}

/**
 * Add an operation to the offline queue.
 */
export async function enqueue(input: EnqueueInput): Promise<QueueItem> {
  const queue = await readQueue();
  const item: QueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method: input.method,
    url: input.url,
    data: input.data,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  };
  queue.push(item);
  await writeQueue(queue);
  await notifyQueueChange();
  return item;
}

/** Backwards-compatible alias used by older callers. */
export async function enqueueOfflineAction(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
): Promise<void> {
  await enqueue({ method, url, data });
}

/**
 * Process queued operations. Items that fail more than MAX_RETRIES times are
 * retained with status='failed' so they can be inspected/retried by the user.
 */
export async function processOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueueItem[] = [];

  for (const item of queue) {
    if (item.status === 'failed') {
      // Skip permanently-failed items; user can manually retry/clear them.
      remaining.push(item);
      continue;
    }
    try {
      await api.request({
        method: item.method,
        url: item.url,
        data: item.data,
        headers: { 'X-Offline-Replay': 'true' },
      });
      synced++;
    } catch {
      const next: QueueItem = {
        ...item,
        retries: item.retries + 1,
        status: item.retries + 1 >= MAX_RETRIES ? 'failed' : 'pending',
      };
      if (next.status === 'failed') failed++;
      remaining.push(next);
    }
  }

  await writeQueue(remaining);
  await notifyQueueChange();

  const pending = remaining.filter((i) => i.status === 'pending').length;
  syncListeners.forEach((fn) => {
    try {
      fn({ synced, failed, pending });
    } catch {
      /* ignore */
    }
  });

  return { synced, failed };
}

export async function getOfflineQueueCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

export async function getOfflineQueueItems(): Promise<QueueItem[]> {
  return readQueue();
}

export async function clearOfflineQueue(): Promise<void> {
  await SecureStore.deleteItemAsync(QUEUE_KEY);
  await notifyQueueChange();
}

export async function removeQueueItem(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.id !== id));
  await notifyQueueChange();
}

export async function retryFailedItems(): Promise<void> {
  const queue = await readQueue();
  const reset = queue.map((q) =>
    q.status === 'failed' ? { ...q, retries: 0, status: 'pending' as const } : q,
  );
  await writeQueue(reset);
  await notifyQueueChange();
  await processOfflineQueue();
}

/**
 * Manually trigger a sync attempt. Returns the result.
 */
export async function syncNow(): Promise<{ synced: number; failed: number }> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return { synced: 0, failed: 0 };
  }
  return processOfflineQueue();
}

/**
 * Start monitoring network connectivity and app state. Auto-syncs when:
 *   - The device reconnects to the network
 *   - The app returns to the foreground
 */
export function startOfflineSync(
  onSynced?: (count: number) => void,
  onStatusChange?: (isConnected: boolean) => void,
): () => void {
  let processing = false;

  const tryProcess = async () => {
    if (processing) return;
    processing = true;
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;
      const count = await getOfflineQueueCount();
      if (count === 0) return;
      const result = await processOfflineQueue();
      if (result.synced > 0) {
        onSynced?.(result.synced);
      }
    } finally {
      processing = false;
    }
  };

  const netUnsub = NetInfo.addEventListener(async (state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    onStatusChange?.(connected);
    if (connected) {
      await tryProcess();
    }
  });

  const appStateSub = AppState.addEventListener('change', async (next: AppStateStatus) => {
    if (next === 'active') {
      await tryProcess();
    }
  });

  // Kick off an initial attempt in case we are already online with pending items.
  tryProcess().catch(() => {});

  return () => {
    netUnsub();
    appStateSub.remove();
  };
}
