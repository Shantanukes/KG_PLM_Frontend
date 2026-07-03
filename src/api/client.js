// API Base URL — pulled from env first, then a safe fallback
// Set VITE_API_BASE_URL in your .env file for production
const DEFAULT_API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://203.16.201.244:5000';
const AUTH_ACCESS_TOKEN_KEY = 'kg_plm_access_token';

export function normalizeApiBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

export function getStoredApiBaseUrl() {
  return normalizeApiBaseUrl(DEFAULT_API_BASE_URL) || window.location.origin;
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY) || '';
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
  try {
    const stored = localStorage.getItem('kg_plm_session_user');
    if (stored) {
      const user = JSON.parse(stored);
      return String(user.role || '').toLowerCase().replace(/[-\s]/g, '');
    }
  } catch (e) { }
  return '';
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

  const response = await apiRequest(pathOrUrl, requestOptions);

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
}
