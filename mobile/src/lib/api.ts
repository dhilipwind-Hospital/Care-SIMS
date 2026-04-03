import axios from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearAll } from './storage';

import { Platform } from 'react-native';

// Use local IP for physical device, localhost for simulators/web
const API_BASE_URL = Platform.select({
  ios: 'http://172.20.10.8:6666/api',
  android: 'http://172.20.10.8:6666/api',
  default: 'http://localhost:6666/api',
})!;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Track whether a refresh is already in-flight to avoid duplicate refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Response interceptor: on 401, try refresh token; on network error, enqueue offline
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // --- Offline queuing for network errors on mutation requests ---
    const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(
      (originalRequest?.method ?? '').toLowerCase(),
    );
    const isOfflineEnabled =
      originalRequest?.headers?.['X-Offline'] === 'true' ||
      originalRequest?.headers?.['X-Offline'] === true;
    const isReplay = originalRequest?.headers?.['X-Offline-Replay'] === 'true';

    if (isNetworkError && isMutation && isOfflineEnabled && !isReplay) {
      const { enqueueOfflineAction } = await import('./offlineSync');
      await enqueueOfflineAction(
        originalRequest.method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        originalRequest.url,
        originalRequest.data ? JSON.parse(originalRequest.data) : undefined,
      );
      // Return a resolved promise so the caller doesn't crash
      return Promise.resolve({ data: { _offline: true, _queued: true }, status: 202 });
    }

    // Don't retry the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearAll();
          processQueue(new Error('No refresh token'), null);
          return Promise.reject(error);
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken: string = data.accessToken;
        const newRefreshToken: string = data.refreshToken;

        await setToken(newAccessToken);
        await setRefreshToken(newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        await clearAll();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// --- Cached GET helper ---
import { getCached, setCache } from './cache';

export async function cachedGet<T>(
  url: string,
  params?: any,
  ttlMs?: number,
): Promise<T> {
  const cacheKey = url + JSON.stringify(params || {});
  const cached = await getCached<T>(cacheKey);
  if (cached) return cached;

  const { data } = await api.get(url, { params });
  const result = (data as any).data || data;
  await setCache(cacheKey, result, ttlMs);
  return result as T;
}
