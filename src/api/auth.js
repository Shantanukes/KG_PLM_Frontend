import { TokenStore } from './tokenStore.js';

const AUTH_ACCESS_TOKEN_KEY = 'kg_plm_access_token';
const AUTH_REFRESH_TOKEN_KEY = 'kg_plm_refresh_token';

export function extractAuthPayload(rawData) {
  const data = rawData?.data || rawData?.result || rawData || {};
  return {
    accessToken: data.accessToken || data.token || data.jwtToken || data.access_token || '',
    refreshToken: data.refreshToken || data.refresh_token || data.refresh || '',
    role: data.role || data.userRole || data.user?.role || '',
    email: data.email || data.user?.email || '',
    name: data.name || data.user?.name || '',
  };
}

export function getErrorMessageFromResponse(rawData, fallbackMessage) {
  return rawData?.message || rawData?.error || rawData?.detail || rawData?.title || fallbackMessage;
}

export function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function buildUserFromAuth(authPayload, fallbackEmail) {
  const tokenPayload = parseJwt(authPayload.accessToken || '');
  const name = authPayload.name
    || tokenPayload?.name
    || (fallbackEmail && fallbackEmail.includes('@') ? fallbackEmail.split('@')[0].replace(/[._-]/g, ' ') : 'User');
  const initials = String(name)
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'US';

  return {
    name,
    initials,
    role: authPayload.role || tokenPayload?.role || tokenPayload?.userRole || 'Designer',
    email: authPayload.email || tokenPayload?.email || tokenPayload?.upn || fallbackEmail,
  };
}

export function getBackendRole(authPayload) {
  const tokenPayload = parseJwt(authPayload.accessToken || '');
  const roleFromPayload = authPayload.role
    || (Array.isArray(tokenPayload?.roles) ? tokenPayload.roles[0] : '')
    || tokenPayload?.role
    || '';
  return String(roleFromPayload || '').trim().toLowerCase();
}

export async function loginToBackend({ apiBaseUrl, email, password }) {
  const response = await fetch(`${apiBaseUrl}/api/Auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessageFromResponse(rawData, `Login failed (${response.status})`));
  }

  const payload = extractAuthPayload(rawData);
  if (!payload.accessToken) {
    throw new Error('Login succeeded but access token is missing in response.');
  }
  return payload;
}

export async function refreshBackendToken({ apiBaseUrl, refreshToken }) {
  const response = await fetch(`${apiBaseUrl}/api/Auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessageFromResponse(rawData, `Token refresh failed (${response.status})`));
  }

  const payload = extractAuthPayload(rawData);
  if (!payload.accessToken) {
    throw new Error('Token refresh succeeded but access token is missing in response.');
  }
  return payload;
}

export async function revokeRefreshToken({ apiBaseUrl, refreshToken }) {
  if (!apiBaseUrl || !refreshToken) return;
  await fetch(`${apiBaseUrl}/api/Auth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });
}

// ── Secure Token Persistence (in-memory via TokenStore) ─────────────────────
// SECURITY: Tokens are stored in JS memory, NOT in localStorage.
// The refresh token is encrypted and stored in sessionStorage for F5 resilience.

export function persistAuthTokens(payload) {
  TokenStore.setTokens(payload.accessToken || '', payload.refreshToken || '');
}

export function clearAuthTokens() {
  TokenStore.clear();
  // Also clean up any legacy localStorage tokens from before this migration
  try {
    localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  } catch { /* ignore */ }
}

export function getRefreshToken() {
  return TokenStore.getRefreshToken();
}



/**
 * Migrate any legacy localStorage tokens to the new TokenStore on first load.
 * This runs once and then removes the localStorage entries.
 */
export function migrateLegacyTokens() {
  try {
    const legacyAccess = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
    const legacyRefresh = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    if (legacyAccess || legacyRefresh) {
      TokenStore.setTokens(legacyAccess || '', legacyRefresh || '');
      localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    }
  } catch { /* ignore */ }
}
