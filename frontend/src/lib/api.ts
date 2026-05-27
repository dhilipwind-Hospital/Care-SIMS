import axios, { type CancelTokenSource } from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

// Track active request cancel tokens so we can abort on auth failure
const pendingRequests = new Set<CancelTokenSource>();

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

function cancelAllPendingRequests() {
  pendingRequests.forEach(source => source.cancel('Session expired'));
  pendingRequests.clear();
}

function handleAuthFailure() {
  cancelAllPendingRequests();

  // Pick the right login surface based on where the user came from so a
  // patient hitting 401 doesn't get bounced to the staff /login screen.
  let target = '/login';
  try {
    const raw = localStorage.getItem('hms_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.userType === 'patient' || u?.role === 'PATIENT') target = '/patient/login';
      else if (u?.userType === 'doctor' || u?.role === 'DOCTOR') target = '/doctor/login';
    }
    // Fallback: infer from current URL prefix if user blob was missing.
    if (target === '/login') {
      const path = window.location.pathname;
      if (path.startsWith('/app/patient') || path.startsWith('/patient')) target = '/patient/login';
      else if (path.startsWith('/app/doctor') || path.startsWith('/doctor')) target = '/doctor/login';
    }
  } catch { /* keep default */ }

  localStorage.removeItem('hms_token');
  localStorage.removeItem('hms_refresh_token');
  localStorage.removeItem('hms_user');

  // Don't redirect if already on the target login page (prevent loops).
  if (window.location.pathname === target) return;

  toast.error('Your session has expired. Redirecting to login...');
  setTimeout(() => {
    window.location.href = target;
  }, 1500);
}

api.interceptors.request.use((config) => {
  // Respect an explicit per-request Authorization header — only fall back to
  // the stored token when the caller hasn't set one. The patient-login flow
  // relies on this to send the unscoped patient token before it's stored.
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('hms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach a cancel token to track this request
  const source = axios.CancelToken.source();
  config.cancelToken = config.cancelToken || source.token;
  pendingRequests.add(source);

  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    // Remove completed request from pending set
    if (err.config?.cancelToken) {
      pendingRequests.forEach(source => {
        if (source.token === err.config.cancelToken) pendingRequests.delete(source);
      });
    }

    // Ignore cancelled requests
    if (axios.isCancel(err)) return Promise.reject(err);

    const originalRequest = err.config;
    const url: string = originalRequest?.url || '';
    const isAuthEndpoint = url.includes('/auth/');

    // If 401 and not an auth endpoint and not already retried, attempt token refresh
    if (err.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('hms_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        const newToken = data.accessToken;
        localStorage.setItem('hms_token', newToken);
        if (data.refreshToken) localStorage.setItem('hms_refresh_token', data.refreshToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        handleAuthFailure();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
