import * as SecureStore from 'expo-secure-store';

// Using SecureStore as a simple key-value cache.
// SecureStore has a 2048-byte limit per item, so this is suited for small data.
// For larger cached data, consider installing @react-native-async-storage/async-storage.

const CACHE_PREFIX = 'hms_cache_';
const CACHE_INDEX_KEY = 'hms_cache_index';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// We maintain an index of cache keys in SecureStore since it doesn't support getAllKeys
async function getCacheIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function addToCacheIndex(key: string): Promise<void> {
  try {
    const index = await getCacheIndex();
    if (!index.includes(key)) {
      index.push(key);
      await SecureStore.setItemAsync(CACHE_INDEX_KEY, JSON.stringify(index));
    }
  } catch {
    /* ignore */
  }
}

async function removeFromCacheIndex(key: string): Promise<void> {
  try {
    const index = await getCacheIndex();
    const filtered = index.filter((k) => k !== key);
    await SecureStore.setItemAsync(CACHE_INDEX_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}

// Hash long keys to fit SecureStore's key length limits
function sanitizeKey(key: string): string {
  // SecureStore keys must be <= 2048 chars; trim and encode
  const sanitized = key.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return sanitized.length > 200 ? sanitized.substring(0, 200) : sanitized;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const storeKey = CACHE_PREFIX + sanitizeKey(key);
    const raw = await SecureStore.getItemAsync(storeKey);
    if (!raw) return null;
    const { data, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) {
      await SecureStore.deleteItemAsync(storeKey);
      await removeFromCacheIndex(storeKey);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

export async function setCache(
  key: string,
  data: any,
  ttlMs = DEFAULT_TTL,
): Promise<void> {
  try {
    const storeKey = CACHE_PREFIX + sanitizeKey(key);
    const payload = JSON.stringify({ data, expiry: Date.now() + ttlMs });
    // SecureStore has a 2048-byte limit; skip if data is too large
    if (payload.length > 2048) {
      console.warn('Cache item too large for SecureStore, skipping:', key);
      return;
    }
    await SecureStore.setItemAsync(storeKey, payload);
    await addToCacheIndex(storeKey);
  } catch {
    /* ignore */
  }
}

export async function clearCache(): Promise<void> {
  try {
    const index = await getCacheIndex();
    for (const key of index) {
      await SecureStore.deleteItemAsync(key);
    }
    await SecureStore.deleteItemAsync(CACHE_INDEX_KEY);
  } catch {
    /* ignore */
  }
}
