import NetInfo from '@react-native-community/netinfo';
import api from './api';
import { enqueue } from './offlineSync';

/**
 * Result returned by offline-aware mutation helpers.
 *
 * When the network is unavailable (or the request fails with a network
 * error) the call is added to the offline queue and `_offline` is set to
 * `true` so callers can show appropriate feedback. When the call succeeds
 * online, the original axios response is returned untouched.
 */
export interface OfflineResult<T = any> {
  data: T | { _queued: true };
  status?: number;
  _offline?: boolean;
}

function isNetworkError(err: any): boolean {
  // Axios sets `err.response` only when a server response was received.
  // Anything without a response (timeout, DNS failure, offline, etc.) is
  // treated as a network error and queued.
  return !err?.response;
}

async function attempt(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
): Promise<OfflineResult> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    await enqueue({ method, url, data });
    return { data: { _queued: true }, _offline: true };
  }
  try {
    const res =
      method === 'DELETE'
        ? await api.delete(url, { data })
        : method === 'POST'
          ? await api.post(url, data)
          : method === 'PUT'
            ? await api.put(url, data)
            : await api.patch(url, data);
    return { data: res.data, status: res.status };
  } catch (err: any) {
    if (isNetworkError(err)) {
      await enqueue({ method, url, data });
      return { data: { _queued: true }, _offline: true };
    }
    throw err;
  }
}

export function offlinePost<T = any>(url: string, data?: any): Promise<OfflineResult<T>> {
  return attempt('POST', url, data);
}

export function offlinePut<T = any>(url: string, data?: any): Promise<OfflineResult<T>> {
  return attempt('PUT', url, data);
}

export function offlinePatch<T = any>(url: string, data?: any): Promise<OfflineResult<T>> {
  return attempt('PATCH', url, data);
}

export function offlineDelete<T = any>(url: string, data?: any): Promise<OfflineResult<T>> {
  return attempt('DELETE', url, data);
}

/** Type guard so screens can react cleanly. */
export function wasQueuedOffline(result: OfflineResult): boolean {
  return result._offline === true;
}

export default {
  post: offlinePost,
  put: offlinePut,
  patch: offlinePatch,
  delete: offlineDelete,
};
