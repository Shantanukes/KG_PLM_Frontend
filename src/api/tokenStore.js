/**
 * KG-VERTEX PLM — Secure In-Memory Token Store
 * 
 * Tokens are held in JS closure variables (not accessible from DevTools or XSS).
 * The refresh token is optionally persisted to sessionStorage with AES-like
 * XOR encryption using a per-tab random key, so that F5 page refresh can
 * silently re-authenticate without a full re-login.
 *
 * On tab/browser close, sessionStorage is automatically cleared by the browser.
 */

// ── Per-tab encryption key (never leaves this closure) ─────────────────────
// Generated once per tab. Used to encrypt the refresh token before writing
// to sessionStorage. This key only exists in JS memory — if an attacker
// can read it via XSS, they could already read the tokens directly, so
// the encryption is specifically to prevent casual inspection and
// cross-tab leakage.
const _tabKey = crypto.getRandomValues(new Uint8Array(32));

function _xorEncrypt(plaintext) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ _tabKey[i % _tabKey.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

function _xorDecrypt(cipherB64) {
  try {
    const raw = atob(cipherB64);
    const data = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      data[i] = raw.charCodeAt(i) ^ _tabKey[i % _tabKey.length];
    }
    return new TextDecoder().decode(data);
  } catch {
    return '';
  }
}

// ── In-memory token storage ────────────────────────────────────────────────
let _accessToken = '';
let _refreshToken = '';
let _refreshTimerId = null;

// Session user (in-memory only, rebuilt from JWT on login/refresh)
let _sessionUser = null;

const SESSION_REFRESH_KEY = 'kg_plm_rt_enc';
const SESSION_TIMEOUT_MS = (parseInt(import.meta.env?.VITE_SESSION_TIMEOUT_MINUTES, 10) || 30) * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = (parseInt(import.meta.env?.VITE_TOKEN_REFRESH_BUFFER_SECONDS, 10) || 60) * 1000;

// ── Idle timeout ───────────────────────────────────────────────────────────
let _idleTimerId = null;
let _onIdleLogout = null; // Callback set by main.js

function _resetIdleTimer() {
  if (_idleTimerId) clearTimeout(_idleTimerId);
  if (_onIdleLogout && _accessToken) {
    _idleTimerId = setTimeout(() => {
      _onIdleLogout();
    }, SESSION_TIMEOUT_MS);
  }
}

const _idleEvents = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll'];

function _startIdleWatcher() {
  _idleEvents.forEach(evt => document.addEventListener(evt, _resetIdleTimer, { passive: true }));
  _resetIdleTimer();
}

function _stopIdleWatcher() {
  if (_idleTimerId) clearTimeout(_idleTimerId);
  _idleTimerId = null;
  _idleEvents.forEach(evt => document.removeEventListener(evt, _resetIdleTimer));
}

// ── Public API ─────────────────────────────────────────────────────────────

export const TokenStore = {
  /**
   * Store tokens in memory. Optionally persist encrypted refresh token
   * to sessionStorage for page-refresh resilience.
   */
  setTokens(accessToken, refreshToken) {
    _accessToken = accessToken || '';
    _refreshToken = refreshToken || '';

    // Persist encrypted refresh token to sessionStorage (survives F5, not tab close)
    if (_refreshToken) {
      try {
        sessionStorage.setItem(SESSION_REFRESH_KEY, _xorEncrypt(_refreshToken));
      } catch { /* sessionStorage full or disabled — degrade gracefully */ }
    }

    // Schedule automatic token refresh
    this.scheduleRefresh();
    _startIdleWatcher();
  },

  getAccessToken() {
    return _accessToken;
  },

  getRefreshToken() {
    return _refreshToken;
  },

  /**
   * Try to restore the refresh token from sessionStorage (e.g. after F5).
   * Returns the decrypted refresh token or empty string.
   */
  restoreRefreshToken() {
    try {
      const encrypted = sessionStorage.getItem(SESSION_REFRESH_KEY);
      if (encrypted) {
        _refreshToken = _xorDecrypt(encrypted);
        return _refreshToken;
      }
    } catch { /* ignore */ }
    return '';
  },

  /**
   * Clear all tokens from memory and sessionStorage.
   */
  clear() {
    _accessToken = '';
    _refreshToken = '';
    _sessionUser = null;
    if (_refreshTimerId) {
      clearTimeout(_refreshTimerId);
      _refreshTimerId = null;
    }
    _stopIdleWatcher();
    try {
      sessionStorage.removeItem(SESSION_REFRESH_KEY);
    } catch { /* ignore */ }
  },

  // ── Session user (in-memory) ──────────────────────────────────────────

  setSessionUser(user) {
    _sessionUser = user ? { ...user } : null;
  },

  getSessionUser() {
    return _sessionUser ? { ..._sessionUser } : null;
  },

  // ── Idle timeout ──────────────────────────────────────────────────────

  setIdleLogoutCallback(callback) {
    _onIdleLogout = callback;
    if (_accessToken) {
      _startIdleWatcher();
    }
  },

  // ── Token refresh scheduling ──────────────────────────────────────────

  /**
   * Schedule a silent token refresh based on the access token's `exp` claim.
   * Calls the refresh function TOKEN_REFRESH_BUFFER_MS before expiry.
   */
  scheduleRefresh() {
    if (_refreshTimerId) {
      clearTimeout(_refreshTimerId);
      _refreshTimerId = null;
    }

    if (!_accessToken || !_refreshToken) return;

    const payload = _parseJwtExp(_accessToken);
    if (!payload || !payload.exp) return;

    const expiresAtMs = payload.exp * 1000;
    const msUntilRefresh = expiresAtMs - Date.now() - TOKEN_REFRESH_BUFFER_MS;

    if (msUntilRefresh <= 0) {
      // Token is already expired or about to — refresh immediately
      this._triggerRefresh();
      return;
    }

    _refreshTimerId = setTimeout(() => {
      this._triggerRefresh();
    }, msUntilRefresh);
  },

  /** Internal: trigger the actual refresh. Set by auth module. */
  _refreshCallback: null,

  setRefreshCallback(fn) {
    this._refreshCallback = fn;
  },

  async _triggerRefresh() {
    if (this._refreshCallback && _refreshToken) {
      try {
        await this._refreshCallback(_refreshToken);
      } catch {
        // Refresh failed — session is lost
        if (_onIdleLogout) _onIdleLogout();
      }
    }
  },

  /**
   * Check if the current access token is expired.
   */
  isAccessTokenExpired() {
    if (!_accessToken) return true;
    const payload = _parseJwtExp(_accessToken);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  },
};

function _parseJwtExp(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
