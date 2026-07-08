// API Base URL — pulled from env (required for production)
// Set VITE_API_BASE_URL in your .env file
import { TokenStore } from './tokenStore.js';
import { refreshBackendToken, extractAuthPayload, buildUserFromAuth } from './auth.js';

const DEFAULT_API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

export function normalizeApiBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

export function getStoredApiBaseUrl() {
  const url = normalizeApiBaseUrl(DEFAULT_API_BASE_URL);
  if (!url) {
    // Fallback to current origin in production (assumes API is on the same domain or proxied)
    return window.location.origin;
  }
  return url;
}

export function getAccessToken() {
  return TokenStore.getAccessToken();
}

// ── Request Deduplication ────────────────────────────────────────────────────
// Prevents duplicate in-flight requests for the same URL+method.
// If two callers request the same endpoint simultaneously, only ONE network
// request is made. Both callers receive the same resolved response clone.
const _inflightRequests = new Map();

export async function apiRequest(pathOrUrl, options = {}) {
  const apiBaseUrl = getStoredApiBaseUrl();
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${apiBaseUrl}${path}`;
  const method = (options?.method || 'GET').toUpperCase();

  const requestOptions = { ...(options || {}) };
  requestOptions.headers = { ...(options?.headers || {}) };

  // Strict backends reject GET requests with Content-Type
  if (method === 'GET' && requestOptions.headers['Content-Type']) {
    delete requestOptions.headers['Content-Type'];
  }

  // Only deduplicate safe, idempotent GET requests
  if (method === 'GET') {
    const dedupKey = url;
    if (_inflightRequests.has(dedupKey)) {
      // Return a cloned response so each caller can independently read the body
      const shared = await _inflightRequests.get(dedupKey);
      return shared.clone();
    }

    const fetchPromise = fetch(url, requestOptions).then(res => {
      _inflightRequests.delete(dedupKey);
      return res;
    }).catch(err => {
      _inflightRequests.delete(dedupKey);
      throw err;
    });

    _inflightRequests.set(dedupKey, fetchPromise);
    const result = await fetchPromise;
    return result;
  }

  return fetch(url, requestOptions);
}

export function getCurrentRoleFromStorage() {
  // Read from in-memory session user instead of localStorage
  try {
    const user = TokenStore.getSessionUser();
    if (user) {
      return String(user.role || '').toLowerCase().replace(/[-\s]/g, '');
    }
  } catch { }
  return '';
}

// ── Silent Token Refresh on 401 ──────────────────────────────────────────────
// When a 401 is received, attempt to refresh the token silently before
// dispatching the auth:unauthorized event. Uses a single in-flight refresh
// promise to avoid multiple concurrent refresh attempts.
let _refreshPromise = null;

async function _attemptSilentRefresh() {
  const refreshToken = TokenStore.getRefreshToken();
  if (!refreshToken) return false;

  // Reuse existing refresh attempt if one is in-flight
  if (_refreshPromise) {
    try {
      await _refreshPromise;
      return true;
    } catch {
      return false;
    }
  }

  _refreshPromise = (async () => {
    try {
      const apiBaseUrl = getStoredApiBaseUrl();
      const authPayload = await refreshBackendToken({ apiBaseUrl, refreshToken });
      // Update TokenStore with new tokens
      TokenStore.setTokens(authPayload.accessToken || '', authPayload.refreshToken || '');
      // Rebuild session user from new token
      const user = buildUserFromAuth(authPayload, '');
      TokenStore.setSessionUser(user);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}


export async function authFetch(pathOrUrl, options = {}) {
  const method = (options?.method || 'GET').toUpperCase();
  const role = getCurrentRoleFromStorage();

  if (role === 'homologation' || role === '14') {
    if (method !== 'GET') {
      const isUpload = method === 'POST' && pathOrUrl.includes('/api/Documents');
      if (!isUpload) {
        throw new Error('403 Forbidden: Homologation role is restricted to view-only and certificate uploads.');
      }
    }
  }

  const accessToken = getAccessToken();
  const requestOptions = { ...(options || {}) };
  requestOptions.headers = { ...(options?.headers || {}) };
  if (accessToken) {
    requestOptions.headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await apiRequest(pathOrUrl, requestOptions);

  // On 401, attempt silent token refresh and retry the request ONCE
  if (response.status === 401) {
    const refreshed = await _attemptSilentRefresh();
    if (refreshed) {
      // Retry the original request with the new token
      const newToken = getAccessToken();
      const retryOptions = { ...(options || {}) };
      retryOptions.headers = { ...(options?.headers || {}) };
      if (newToken) {
        retryOptions.headers.Authorization = `Bearer ${newToken}`;
      }
      response = await apiRequest(pathOrUrl, retryOptions);
    }

    // If still 401 after refresh attempt, dispatch unauthorized event
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  return response;
}
