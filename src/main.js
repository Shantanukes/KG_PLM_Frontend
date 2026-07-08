import './styles.css';
import './enterprise-theme.css';
import { authFetch } from './api/client.js';
import {
  TokenStore,
  buildUserFromAuth,
  clearAuthTokens,
  getAccessToken,
  getBackendRole,
  getErrorMessageFromResponse,
  getRefreshToken,
  getStoredApiBaseUrl,
  loginToBackend,
  migrateLegacyTokens,
  persistAuthTokens,
  refreshBackendToken,
  revokeRefreshToken,
} from './api/index.js';
import { changePassword } from './api/members.js';
import { esc } from './utils.js';
// ── Page modules loaded lazily on first visit ──────────────────────────────
// This removes ~600 KB of upfront JS parse time from the initial load.
// Each module is fetched + parsed only when the user navigates to that page.

// ─── Application State ───
// SECURITY: Session user key kept only for legacy cleanup; session data is now in-memory via TokenStore
const SESSION_USER_KEY = 'kg_plm_session_user';
// Flash messages use sessionStorage (auto-cleared on tab close, not localStorage)
const AUTH_FLASH_MESSAGE_KEY = 'kg_plm_auth_flash_message';

const AUTH_MODE = {
  LOGIN: 'login',
  RESET: 'reset',
};

const DEFAULT_USER_STATE = {
  name: 'Guest',
  initials: 'GU',
  role: 'Guest',
  email: '',
};

const state = {
  user: { ...DEFAULT_USER_STATE },
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  notifOpen: false,
  userMenuOpen: false,
};

// ── Page registry with lazy loaders ─────────────────────────────────────────
// 'load' is a function that returns a Promise resolving to the render function.
// Modules are cached automatically by the browser after first import().
const PAGE_DEFINITIONS = [
  // Executive Pages (loaded only for Founder/Co-Founder roles)
  { id: 'executive-analytics', label: 'Executive Analytics', load: () => import('./pages/executive-analytics.js').then(m => m.renderExecutiveAnalytics) },
  { id: 'bom-lifecycle', label: 'BOM Lifecycle', load: () => import('./pages/bom-lifecycle.js').then(m => m.renderBOMLifecycle) },
  { id: 'parts-lifecycle', label: 'Parts Lifecycle', load: () => import('./pages/parts-lifecycle.js').then(m => m.renderPartsLifecycle) },
  { id: 'ecn-lifecycle', label: 'ECN Lifecycle', load: () => import('./pages/ecn-lifecycle.js').then(m => m.renderECNLifecycle) },
  { id: 'activity-timeline', label: 'Activity Timeline', load: () => import('./pages/activity-timeline.js').then(m => m.renderActivityTimeline) },
  { id: 'team-performance', label: 'Team Performance', load: () => import('./pages/team-performance.js').then(m => m.renderTeamPerformance) },

  // Operational Pages
  { id: 'dashboard', label: 'Dashboard', load: () => import('./pages/dashboard.js').then(m => m.renderDashboard) },
  { id: 'parts', label: 'Parts', load: () => import('./pages/parts.js').then(m => m.renderParts) },
  { id: 'bom', label: 'BOM', load: () => import('./pages/bom.js').then(m => m.renderBOM) },
  { id: 'documents', label: 'Part Release', load: () => import('./pages/documents.js').then(m => m.renderDocuments) },
  { id: 'upload-drawing', label: 'Upload Drawing', load: () => import('./pages/upload-drawing.js').then(m => m.renderUploadDrawing) },
  { id: 'workflows', label: 'My Inbox', load: () => import('./pages/workflows.js').then(m => m.renderWorkflows) },
  { id: 'ticket-raise', label: 'Raise Ticket', load: () => import('./pages/ticket-raise.js').then(m => m.renderTicketRaise) },
  { id: 'ticket-history', label: 'Ticket History', load: () => import('./pages/ticket-history.js').then(m => m.renderTicketHistory) },
  { id: 'change-mgmt', label: 'Change Management', load: () => import('./pages/change-mgmt.js').then(m => m.renderChangeManagement) },
  { id: 'models', label: 'Models & Variants', load: () => import('./pages/models.js').then(m => m.renderModels) },
  { id: 'homologation', label: 'Homologation', load: () => import('./pages/homologation.js').then(m => m.renderHomologation) },
  { id: 'suppliers', label: 'Suppliers', load: () => import('./pages/suppliers.js').then(m => m.renderSuppliers) },
  { id: 'members', label: 'Members', load: () => import('./pages/members.js').then(m => m.renderMembers) },
  { id: 'part-number', label: 'Lookups', load: () => import('./pages/part-number.js').then(m => m.renderPartNumber) },
  { id: 'admin', label: 'Admin', load: () => import('./pages/admin.js').then(m => m.renderAdmin) },
];

// Resolved renderer cache — once a module is imported, its render fn is reused
const _resolvedRenderers = {};
async function getPageRenderer(pageId) {
  if (_resolvedRenderers[pageId]) return _resolvedRenderers[pageId];
  const def = PAGE_DEFINITIONS.find(p => p.id === pageId);
  if (!def) return null;
  const fn = await def.load();
  _resolvedRenderers[pageId] = fn;
  return fn;
}

const pageLabels = Object.fromEntries(PAGE_DEFINITIONS.map(p => [p.id, p.label]));

export function getCurrentUserRole() {
  return String(state.user?.role || '').trim();
}

function getAllowedPages() {
  const rawRole = getCurrentUserRole().toLowerCase();
  const role = rawRole.replace(/[-\\s]/g, '');

  const executivePages = [
    'executive-analytics',
    'bom-lifecycle',
    'parts-lifecycle',
    'ecn-lifecycle',
    'activity-timeline',
    'team-performance'
  ];

  // Founder and Co-Founder ONLY see executive pages. All operational pages are hidden.
  if (role === 'founder' || rawRole === '11' || role === 'cofounder' || rawRole === '12') {
    return executivePages;
  }

  // Designer sees specific operational pages
  if (role === 'designer' || rawRole === '6') {
    const designerAllowed = [
      'parts', 'bom', 'documents', 'upload-drawing', 'workflows',
      'ticket-raise', 'ticket-history', 'change-mgmt', 'reports',
      'suppliers', 'members', 'part-number'
    ];
    return PAGE_DEFINITIONS.map((p) => p.id).filter(id => designerAllowed.includes(id));
  }

  // Homologation sees specific operational pages
  if (role === 'homologation' || rawRole === '14') {
    const homologationAllowed = [
      'parts', 'bom', 'documents', 'workflows', 'ticket-raise',
      'ticket-history', 'homologation', 'suppliers', 'members'
    ];
    return PAGE_DEFINITIONS.map((p) => p.id).filter(id => homologationAllowed.includes(id));
  }
  // Sourcing Sees specific operational pages

  if (role === 'sourcing' || rawRole === '9') {
    const sourcingAllowed = [
      'parts', 'bom', 'documents', 'workflows', 'ticket-raise',
      'ticket-history', 'suppliers', 'members', 'change-mgmt', 'models'
    ];
    return PAGE_DEFINITIONS.map((p) => p.id).filter(id => sourcingAllowed.includes(id));
  }

  // Default to all operational pages for other roles (excluding the executive suite)
  return PAGE_DEFINITIONS.map((page) => page.id).filter(id => !executivePages.includes(id));
}

function canAccessPage(page) {
  return getAllowedPages().includes(page);
}


const FORGOT_ENDPOINT_CANDIDATES = [
  '/api/Auth/forgot-password',
  '/api/Auth/forgotPassword',
  '/api/Members/forgot-password',
  '/api/Members/forgotPassword',
];

function clearSessionUser() {
  // Clean up legacy localStorage entries
  try { localStorage.removeItem(SESSION_USER_KEY); } catch { /* ignore */ }
  clearAuthTokens();
  TokenStore.setSessionUser(null);
}

function persistSessionUser() {
  TokenStore.setSessionUser(state.user || DEFAULT_USER_STATE);
}

async function requestPasswordResetEmail(apiBaseUrl, email) {
  for (const endpoint of FORGOT_ENDPOINT_CANDIDATES) {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) return true;
    if (response.status === 404) continue;

    let rawData = null;
    try {
      rawData = await response.json();
    } catch {
      rawData = null;
    }
    throw new Error(getErrorMessageFromResponse(rawData, 'Unable to send reset email.'));
  }

  throw new Error('No reset request endpoint found in backend.');
}

async function submitPasswordChange({ apiBaseUrl, currentPassword, newPassword, confirmPassword, token }) {
  await changePassword({
    apiBaseUrl,
    currentPassword,
    newPassword,
    confirmPassword,
    token,
  });
}

function getCurrentAuthMode() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('/reset-password')) return AUTH_MODE.RESET;
  return AUTH_MODE.LOGIN;
}

function getResetQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get('token') || params.get('resetToken') || '',
    email: params.get('email') || '',
  };
}

function resetToLoginView() {
  window.location.href = '/';
}

function consumeAuthFlashMessage() {
  const flash = sessionStorage.getItem(AUTH_FLASH_MESSAGE_KEY);
  if (!flash) return;
  sessionStorage.removeItem(AUTH_FLASH_MESSAGE_KEY);
  showToast(flash, 'success');
}



function renderResetRequestView() {
  const container = document.querySelector('.login-form-container');
  if (!container) return;

  container.innerHTML = `
    <h2>Reset Password</h2>
    <p class="login-subtitle">Enter your email to receive a secure reset link.</p>
    <form id="reset-request-form" autocomplete="off">
      <div class="form-group">
        <label for="reset-email">Work Email</label>
        <div class="input-icon-wrap">
          <span class="material-icons-outlined">mail_outline</span>
          <input type="email" id="reset-email" placeholder="e.g. admin@kineticgreen.com" required />
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-full">
        <span>Send Reset Link</span>
        <span class="material-icons-outlined icon-18">forward_to_inbox</span>
      </button>
      <button type="button" class="btn btn-outline btn-full mt-12" id="back-to-login-from-request">Back to Login</button>
      <p class="text-xs text-secondary" style="margin-top:12px">For security, we never reveal whether an account exists.</p>
    </form>
  `;

  document.getElementById('back-to-login-from-request')?.addEventListener('click', resetToLoginView);

  document.getElementById('reset-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email')?.value?.trim();
    const apiBaseUrl = getStoredApiBaseUrl();

    if (!email) return showToast('Email is required.', 'warning');
    if (!apiBaseUrl) return showToast('Backend API base URL is required.', 'warning');

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 0.6s linear infinite">autorenew</span> Sending...';
    }

    try {
      await requestPasswordResetEmail(apiBaseUrl, email);
      showToast('If your account exists, a password reset link has been sent.', 'success');
      resetToLoginView();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request password reset.';
      showToast(message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Send Reset Link</span><span class="material-icons-outlined icon-18 btn-icon">forward_to_inbox</span>';
      }
    }
  });
}

function renderResetPasswordView() {
  const container = document.querySelector('.login-form-container');
  if (!container) return;

  const { token, email } = getResetQuery();
  const hasToken = Boolean(token);
  const requiresAuth = !hasToken;

  container.innerHTML = `
    <div style="max-width: 550px; margin: 0 auto; width: 100%;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Set New Password</h2>
        <p class="login-subtitle" style="color: var(--text-secondary); font-size: 14px;">Create a strong password to securely access your PLM account.</p>
      </div>

      <form id="reset-password-form" autocomplete="off" style="display: flex; flex-direction: column; gap: 20px;">
        
        <div id="reset-error-msg" style="display: none; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid rgba(239, 68, 68, 0.2); align-items: center; gap: 8px;">
        <span class="material-icons-outlined" style="font-size: 16px;">error_outline</span>
        <span id="reset-error-text"></span>
      </div>

      <!-- Account Info -->
      ${email ? `
      <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; justify-content: center; align-items: center; gap: 10px;">
        <span class="material-icons-outlined" style="font-size: 20px; color: var(--text-secondary);">person</span>
        <span style="font-weight: 600; color: var(--text-primary); font-size: 15px; word-break: break-all;">
          ${email}
        </span>
      </div>
      ` : ''}

      ${requiresAuth ? `
        <div class="form-group floating-label-group">
          <div class="input-icon-wrap" style="position: relative;">
            <span class="material-icons-outlined input-icon" style="position: absolute; left: 16px; top: 12px;">lock_outline</span>
            <input type="password" id="reset-current-password" placeholder=" " required style="width: 100%; padding: 12px 16px 12px 48px; border-radius: 8px; border: 1px solid var(--border-color); height: 48px; background: var(--bg-muted);"/>
            <label for="reset-current-password" style="position: absolute; left: 48px; top: 14px; color: var(--text-secondary); transition: all 0.2s;">Current Password</label>
            <button type="button" class="pwd-toggle material-icons-outlined" tabindex="-1" style="position: absolute; right: 16px; top: 12px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">visibility</button>
          </div>
        </div>
      ` : ''}

      <div class="form-group floating-label-group">
        <div class="input-icon-wrap" style="position: relative;">
          <span class="material-icons-outlined input-icon" style="position: absolute; left: 16px; top: 12px;">lock</span>
          <input type="password" id="reset-new-password" placeholder=" " required style="width: 100%; padding: 12px 16px 12px 48px; border-radius: 8px; border: 1px solid var(--border-color); height: 48px; background: var(--bg-muted);"/>
          <label for="reset-new-password" style="position: absolute; left: 48px; top: 14px; color: var(--text-secondary); transition: all 0.2s;">New Password</label>
          <button type="button" class="pwd-toggle material-icons-outlined" tabindex="-1" style="position: absolute; right: 16px; top: 12px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">visibility</button>
        </div>
      </div>

      <!-- Password Strength & Requirements -->
      <div id="pwd-strength-container" style="background: rgba(0,0,0,0.02); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); display: none;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 600;">
          <span style="color: var(--text-secondary);">Password Strength</span>
          <span id="pwd-strength-text" style="color: var(--text-primary); transition: color 0.3s;">Weak</span>
        </div>
        <div style="height: 6px; background: var(--border-color); border-radius: 4px; overflow: hidden; margin-bottom: 16px; display: flex;">
          <div id="pwd-strength-bar" style="height: 100%; width: 0%; background: #ef4444; transition: width 0.3s ease, background 0.3s ease;"></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #ffffff;">
          <div id="req-len" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> At least 8 chars</div>
          <div id="req-up" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One uppercase</div>
          <div id="req-low" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One lowercase</div>
          <div id="req-num" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One number</div>
          <div id="req-spc" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One special</div>
        </div>
      </div>

      <div class="form-group floating-label-group">
        <div class="input-icon-wrap" style="position: relative;">
          <span class="material-icons-outlined input-icon" style="position: absolute; left: 16px; top: 12px;">task_alt</span>
          <input type="password" id="reset-confirm-password" placeholder=" " required style="width: 100%; padding: 12px 16px 12px 48px; border-radius: 8px; border: 1px solid var(--border-color); height: 48px; background: var(--bg-muted);"/>
          <label for="reset-confirm-password" style="position: absolute; left: 48px; top: 14px; color: var(--text-secondary); transition: all 0.2s;">Confirm Password</label>
          <button type="button" class="pwd-toggle material-icons-outlined" tabindex="-1" style="position: absolute; right: 16px; top: 12px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">visibility</button>
        </div>
      </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; margin-top: 8px; flex-direction: column;">
          <button type="submit" class="btn btn-primary" style="width: 100%; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);" ${hasToken || getAccessToken() ? '' : 'disabled'}>
            <span>Update Password</span>
            <span class="material-icons-outlined icon-18">verified</span>
          </button>
          <button type="button" class="btn btn-outline" id="back-to-login-from-reset" style="width: 100%; height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; font-weight: 600; font-size: 15px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #ffffff; transition: background 0.2s, border 0.2s; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
            <span>Back to Login</span>
          </button>
        </div>
      </form>
    </div>
  `;

  // Attach view toggle for passwords
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const input = e.target.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        e.target.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        e.target.textContent = 'visibility';
      }
    });
  });

  // Attach floating label logic (simple via focus/blur or rely on existing css if placeholder is " ")
  // The placeholder=" " enables the :placeholder-shown pseudo selector in CSS if defined.

  // Password strength logic
  const newPwdInput = document.getElementById('reset-new-password');
  const strengthContainer = document.getElementById('pwd-strength-container');
  const strengthBar = document.getElementById('pwd-strength-bar');
  const strengthText = document.getElementById('pwd-strength-text');

  const reqLen = document.getElementById('req-len');
  const reqUp = document.getElementById('req-up');
  const reqLow = document.getElementById('req-low');
  const reqNum = document.getElementById('req-num');
  const reqSpc = document.getElementById('req-spc');

  newPwdInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length > 0) {
      strengthContainer.style.display = 'block';
    } else {
      strengthContainer.style.display = 'none';
    }

    const hasLen = val.length >= 8;
    const hasUp = /[A-Z]/.test(val);
    const hasLow = /[a-z]/.test(val);
    const hasNum = /[0-9]/.test(val);
    const hasSpc = /[!@#$%^&*(),.?":{}|<>]/.test(val);

    const updateReq = (el, met) => {
      const icon = el.querySelector('span');
      if (met) {
        icon.textContent = 'check_circle';
        icon.style.color = '#10b981';
        el.style.color = '#ffffff';
      } else {
        icon.textContent = 'radio_button_unchecked';
        icon.style.color = 'inherit';
        el.style.color = '#ffffff';
      }
    };

    updateReq(reqLen, hasLen);
    updateReq(reqUp, hasUp);
    updateReq(reqLow, hasLow);
    updateReq(reqNum, hasNum);
    updateReq(reqSpc, hasSpc);

    let score = 0;
    if (hasLen) score++;
    if (hasUp) score++;
    if (hasLow) score++;
    if (hasNum) score++;
    if (hasSpc) score++;

    let width = '0%';
    let color = '#ef4444';
    let text = 'Weak';

    if (score <= 2) {
      width = '33%';
      color = '#ef4444'; // Red
      text = 'Weak';
    } else if (score === 3 || score === 4) {
      width = '66%';
      color = '#f59e0b'; // Amber
      text = 'Medium';
    } else if (score === 5) {
      width = '100%';
      color = '#10b981'; // Green
      text = 'Strong';
    }

    strengthBar.style.width = width;
    strengthBar.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
  });

  document.getElementById('back-to-login-from-reset')?.addEventListener('click', resetToLoginView);

  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('reset-current-password')?.value || '';
    const newPassword = document.getElementById('reset-new-password')?.value || '';
    const confirmPassword = document.getElementById('reset-confirm-password')?.value || '';
    const apiBaseUrl = getStoredApiBaseUrl();

    const errorContainer = document.getElementById('reset-error-msg');
    const errorText = document.getElementById('reset-error-text');

    const showError = (msg) => {
      errorText.textContent = msg;
      errorContainer.style.display = 'flex';
    };

    errorContainer.style.display = 'none';

    if (!apiBaseUrl) return showError('Backend API base URL is required.');
    if (requiresAuth && !getAccessToken()) return showError('Session expired. Login required to change password.');
    if (requiresAuth && !currentPassword) return showError('Current password is required.');
    if (!newPassword || !confirmPassword) return showError('Please fill all password fields.');
    if (newPassword !== confirmPassword) return showError('New password and confirm password do not match.');

    // Check password strength explicitly
    const hasLen = newPassword.length >= 8;
    const hasUp = /[A-Z]/.test(newPassword);
    const hasLow = /[a-z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    const hasSpc = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasLen || !hasUp || !hasLow || !hasNum || !hasSpc) {
      return showError('Please meet all password requirements before updating.');
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 0.6s linear infinite">autorenew</span> <span>Updating...</span>';
    }

    try {
      await submitPasswordChange({
        apiBaseUrl,
        currentPassword: requiresAuth ? currentPassword : '',
        newPassword,
        confirmPassword,
        token: hasToken ? token : '',
      });
      // The view redirects/shows success via AUTH_FLASH_MESSAGE_KEY or other method.
      sessionStorage.setItem(AUTH_FLASH_MESSAGE_KEY, 'Password updated successfully. Please login with your new password.');
      resetToLoginView();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update password.';
      showError(message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Update Password</span><span class="material-icons-outlined icon-18">verified</span>';
      }
    }
  });
}

function bindLoginAuxiliaryActions() {
  const forgotLink = document.querySelector('.link-subtle');
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/reset-password';
  });
}

function updateUserIdentityUI() {
  document.querySelectorAll('.user-name').forEach((el) => {
    el.textContent = state.user.name;
  });
  document.querySelectorAll('.user-role').forEach((el) => {
    el.textContent = state.user.role;
  });
  document.querySelectorAll('.user-avatar, .user-avatar-sm').forEach((el) => {
    el.textContent = state.user.initials;
  });
}

function applyRoleAccessUI() {
  const allowedPages = new Set(getAllowedPages());
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.style.display = allowedPages.has(item.dataset.page) ? '' : 'none';
  });
}



// ─── Init ───
async function init() {
  consumeAuthFlashMessage();

  // Migrate any legacy localStorage tokens to in-memory TokenStore
  migrateLegacyTokens();

  // Set up the silent token refresh callback
  TokenStore.setRefreshCallback(async (refreshToken) => {
    const apiBaseUrl = getStoredApiBaseUrl();
    const authPayload = await refreshBackendToken({ apiBaseUrl, refreshToken });
    persistAuthTokens(authPayload);
    state.user = buildUserFromAuth(authPayload, state.user?.email || '');
    TokenStore.setSessionUser(state.user);
    updateUserIdentityUI();
  });

  // Set up the idle timeout callback
  TokenStore.setIdleLogoutCallback(() => {
    showToast('Session timed out due to inactivity. Please log in again.', 'warning');
    performLogout();
  });

  const mode = getCurrentAuthMode();
  if (mode === AUTH_MODE.RESET) {
    renderResetPasswordView();
    return;
  }

  // Attempt session restoration from multiple sources:
  // 1. In-memory TokenStore (if already set, e.g. from legacy migration)
  // 2. Encrypted sessionStorage refresh token (survives F5 page refresh)
  // 3. Legacy localStorage session user (one-time migration)
  let sessionRestored = false;

  // Check if we have tokens in memory (from migration or previous setTokens call)
  let hasToken = getAccessToken() || getRefreshToken();

  // If no tokens in memory, try restoring refresh token from encrypted sessionStorage
  if (!hasToken) {
    const restoredRefresh = TokenStore.restoreRefreshToken();
    if (restoredRefresh) {
      try {
        const apiBaseUrl = getStoredApiBaseUrl();
        const authPayload = await refreshBackendToken({ apiBaseUrl, refreshToken: restoredRefresh });
        persistAuthTokens(authPayload);
        state.user = buildUserFromAuth(authPayload, '');
        TokenStore.setSessionUser(state.user);
        hasToken = true;
      } catch {
        // Refresh failed — clear everything and show login
        TokenStore.clear();
        hasToken = false;
      }
    }
  }

  // Restore user from TokenStore memory (may have been set by migration or refresh)
  const memoryUser = TokenStore.getSessionUser();

  if (hasToken && memoryUser) {
    state.user = memoryUser;
    sessionRestored = true;
  } else if (hasToken) {
    // We have tokens but no user object — try to build from legacy localStorage
    try {
      const legacyStr = localStorage.getItem(SESSION_USER_KEY);
      if (legacyStr) {
        state.user = JSON.parse(legacyStr);
        TokenStore.setSessionUser(state.user);
        localStorage.removeItem(SESSION_USER_KEY); // Clean up legacy
        sessionRestored = true;
      }
    } catch { /* ignore */ }
  }

  if (sessionRestored) {
    updateUserIdentityUI();
    applyRoleAccessUI();

    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appShell) {
      appShell.classList.remove('hidden');
      appShell.style.opacity = '1';
    }

    // Restore the exact page they were on, or fallback
    let initialPage = window.location.pathname.replace(/^\/+/, '') || 'dashboard';
    if (!canAccessPage(initialPage)) {
      initialPage = getAllowedPages()[0] || 'dashboard';
    }
    navigateTo(initialPage);

    // Listen for unrecoverable 401s from our interceptor
    window.addEventListener('auth:unauthorized', () => {
      showToast('Session expired. Please log in again.', 'warning');
      performLogout();
    });
  }

  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', handleLogin);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('notif-btn')?.addEventListener('click', toggleNotifications);
  document.getElementById('user-menu-btn')?.addEventListener('click', toggleUserMenu);
  document.addEventListener('keydown', handleKeyboard);

  const searchEl = document.getElementById('global-search');
  searchEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchEl.blur();
    if (e.key === 'Enter') handleGlobalSearch(searchEl.value);
  });

  bindLoginAuxiliaryActions();
  initCommandPalette();
  initNextGenInteractions();
}

function initNextGenInteractions() {
  document.addEventListener('mousedown', function (e) {
    const target = e.target.closest('.btn, .nav-item, .ripple-element');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
    target.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 600);
  });

  document.addEventListener('mousemove', function (e) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const distance = Math.sqrt(x * x + y * y);
      if (distance < 50) {
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      } else {
        btn.style.transform = 'translate(0, 0)';
      }
    });
  });
}

// Login brute-force throttle (client-side)
let _loginAttempts = 0;
let _loginLockoutUntil = 0;

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value || '';
  const apiBaseUrl = getStoredApiBaseUrl();

  if (!apiBaseUrl) {
    showToast('Backend API base URL is missing.', 'warning');
    return;
  }
  if (!email || !password) {
    showToast('Email and password are required.', 'warning');
    return;
  }

  // Brute-force throttle — 5 failures → 30-second lockout
  if (Date.now() < _loginLockoutUntil) {
    const secsLeft = Math.ceil((_loginLockoutUntil - Date.now()) / 1000);
    showToast(`Too many failed attempts. Try again in ${secsLeft}s.`, 'error');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 0.6s linear infinite">autorenew</span> <span class="btn-text">Signing in...</span>';
  btn.disabled = true;

  // Add spin keyframe if not present
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  try {
    const authPayload = await loginToBackend({ apiBaseUrl, email, password });
    persistAuthTokens(authPayload);

    state.user = buildUserFromAuth(authPayload, email);
    updateUserIdentityUI();
    applyRoleAccessUI();
    persistSessionUser();

    setTimeout(() => {
      const loginScreen = document.getElementById('login-screen');
      const appShell = document.getElementById('app-shell');
      loginScreen.style.opacity = '0';
      loginScreen.style.transform = 'scale(1.02)';
      loginScreen.style.transition = 'all 0.35s ease';
      setTimeout(() => {
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        appShell.style.opacity = '0';
        appShell.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => {
          appShell.style.opacity = '1';
          navigateTo(getAllowedPages()[0] || 'dashboard');
        });
      }, 350);
    }, 300);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to connect to backend auth API.';
    showToast(message, 'error');
    // Increment throttle counter
    _loginAttempts++;
    if (_loginAttempts >= 5) {
      _loginLockoutUntil = Date.now() + 30_000;
      _loginAttempts = 0;
      showToast('Too many failed attempts. Locked out for 30 seconds.', 'error');
    }
    btn.innerHTML = '<span class="btn-text">Sign In</span><span class="material-icons-outlined icon-18 btn-icon">arrow_forward</span>';
    btn.disabled = false;
  }
}

export async function navigateTo(page, pageData) {
  if (!canAccessPage(page)) {
    showToast(`Access denied for ${esc(state.user.role)}`, 'warning');
    const container = document.getElementById('page-container');
    if (container) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;text-align:center;">
          <span class="material-icons-outlined" style="font-size:64px;color:#EF4444;margin-bottom:16px;">gpp_bad</span>
          <h2>Access Denied</h2>
          <p class="text-secondary" style="max-width:400px;margin:8px auto 24px;">Your role (<strong>${esc(state.user.role)}</strong>) does not have permission to view this page. If you believe this is an error, please contact your administrator.</p>
          <button class="btn btn-primary" onclick="window.location.href='/'">Return to Home</button>
        </div>`;
      container.style.opacity = '1';
    }
    return;
  }

  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  document.getElementById('bc-current').textContent = pageLabels[page] || page;
  const container = document.getElementById('page-container');
  container.style.opacity = '0';
  container.style.transform = 'translateY(6px)';
  container.style.transition = 'all 0.18s ease';

  // Show skeleton immediately, then load module + render
  // Reduced from 230ms → 80ms artificial delay (skeleton still visible, feels faster)
  container.innerHTML = '<div class="skeleton-block"></div><div class="skeleton-text"></div><div class="skeleton-text"></div>';
  container.style.opacity = '1';
  container.style.transform = 'translateY(0)';

  try {
    const renderer = await getPageRenderer(page);
    if (renderer) {
      await new Promise(resolve => setTimeout(resolve, 80)); // minimal skeleton flash
      container.innerHTML = '';
      renderer(container, pageData);
      Array.from(container.children).forEach((child, i) => {
        child.classList.add('page-transition-enter');
        child.style.animationDelay = `${i * 0.05}s`;
      });
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }
  } catch (err) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary);">Failed to load page. Please try again.</div>`;
  }
}


function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', state.sidebarCollapsed);
}

function toggleNotifications() {
  state.notifOpen = !state.notifOpen;
  const existing = document.querySelector('.notif-panel');
  if (existing) { existing.remove(); state.notifOpen = false; return; }
  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-header">
      <h3>Notifications</h3>
      <button class="btn btn-xs btn-ghost" onclick="this.closest('.notif-panel').remove()">Mark all read</button>
    </div>
    <div class="notif-list">
      <div class="notif-item unread"><div class="notif-item-title">Part BA152002 submitted for review</div><div class="notif-item-desc">BMS PCB Rev B — Safar Smart Battery System needs your approval</div><div class="notif-item-time">5 minutes ago</div></div>
      <div class="notif-item unread"><div class="notif-item-title">ECR KG-ECR-2026-0047 raised</div><div class="notif-item-desc">Replace BMS PCB — overheating fix for Safar Smart — Priority: High</div><div class="notif-item-time">23 minutes ago</div></div>
      <div class="notif-item unread"><div class="notif-item-title">SLA Warning: Drawing review overdue</div><div class="notif-item-desc">DRW-51-GA151001-RevA has been pending review for 40 hours</div><div class="notif-item-time">1 hour ago</div></div>
      <div class="notif-item"><div class="notif-item-title">Part GA151002 Released</div><div class="notif-item-desc">BLDC Hub Motor 350W 48V — E-Luna Pro — now available in BOM</div><div class="notif-item-time">3 hours ago</div></div>
      <div class="notif-item"><div class="notif-item-title">OTA Package v2.3.1 approved for deployment</div><div class="notif-item-desc">BMS Firmware for E-Luna — staged rollout to 5% fleet initiated</div><div class="notif-item-time">5 hours ago</div></div>
    </div>`;
  document.body.appendChild(panel);
  setTimeout(() => {
    document.addEventListener('click', function closeNotif(ev) {
      if (!panel.contains(ev.target) && !ev.target.closest('#notif-btn')) {
        panel.remove(); state.notifOpen = false;
        document.removeEventListener('click', closeNotif);
      }
    });
  }, 100);
}

function closeUserMenu() {
  document.querySelector('.user-menu-panel')?.remove();
  state.userMenuOpen = false;
}

async function performLogout() {
  closeUserMenu();
  document.querySelector('.notif-panel')?.remove();
  state.notifOpen = false;

  const backendRole = getBackendRole({ accessToken: getAccessToken(), role: '' });
  if (backendRole === 'superadmin') {
    try {
      await revokeRefreshToken({
        apiBaseUrl: getStoredApiBaseUrl(),
        refreshToken: getRefreshToken(),
      });
    } catch {
      showToast('Logout completed, but session revoke failed.', 'warning');
    }
  }
  clearSessionUser();

  const appShell = document.getElementById('app-shell');
  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');

  appShell.style.opacity = '0';
  appShell.style.transition = 'opacity 0.25s ease';

  setTimeout(() => {
    appShell.classList.add('hidden');
    appShell.style.opacity = '';
    loginScreen.classList.remove('hidden');
    loginScreen.style.opacity = '1';
    loginScreen.style.transform = 'scale(1)';

    const submitBtn = loginForm?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<span class="btn-text">Sign In</span><span class="material-icons-outlined icon-18 btn-icon">arrow_forward</span>';
      submitBtn.disabled = false;
    }

    navigateTo('dashboard');
    showToast('Logged out successfully.', 'info');
  }, 260);
}

function toggleUserMenu(e) {
  e?.stopPropagation();
  const existing = document.querySelector('.user-menu-panel');
  if (existing) {
    closeUserMenu();
    return;
  }

  const btn = document.getElementById('user-menu-btn');
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const panel = document.createElement('div');
  panel.className = 'user-menu-panel';
  panel.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${Math.max(12, window.innerWidth - rect.right)}px;background:#FFFFFF;border:1px solid var(--border-light);border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,0.16);z-index:10001;min-width:220px;padding:8px;`;
  panel.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid var(--border-light)">
      <div style="font-weight:700;font-size:0.86rem;color:var(--text-primary)">${esc(state.user.name)}</div>
      <div style="font-size:0.75rem;color:var(--text-secondary)">${esc(state.user.role)}</div>
    </div>
    <button id="user-menu-profile" class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-top:6px;color:var(--text-primary)">
      <span class="material-icons-outlined" style="font-size:16px;margin-right:6px">account_circle</span>Profile Settings
    </button>
    <button id="user-menu-logout" class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-top:2px;color:#DC2626">
      <span class="material-icons-outlined" style="font-size:16px;margin-right:6px">logout</span>Logout
    </button>
  `;

  document.body.appendChild(panel);
  state.userMenuOpen = true;

  panel.querySelector('#user-menu-profile')?.addEventListener('click', openProfileModal);
  panel.querySelector('#user-menu-logout')?.addEventListener('click', performLogout);

  setTimeout(() => {
    document.addEventListener('click', function closeOnOutsideClick(ev) {
      if (!panel.contains(ev.target) && !btn.contains(ev.target)) {
        closeUserMenu();
        document.removeEventListener('click', closeOnOutsideClick);
      }
    });
  }, 0);
}

function handleGlobalSearch(q) {
  if (!q.trim()) return;
  showToast(`Searching for "${q}"…`);
}

function openProfileModal() {
  closeUserMenu();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';

  // SECURITY: Role is read-only — only Super Admin can change roles via Admin panel
  overlay.innerHTML = `
    <div class="modal-content card fade-in" style="width: 400px; padding: 24px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
      <h3 style="margin: 0 0 16px 0;">Edit Profile</h3>
      <div class="form-group" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Full Name <span style="color:#DC2626">*</span></label>
        <input type="text" id="prof-fullname" class="form-input" style="width:100%;" value="${esc(state.user.name || '')}" />
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Employee ID</label>
        <input type="text" id="prof-empid" class="form-input" style="width:100%;" placeholder="e.g. EMP-101" />
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Role / Access Profile</label>
        <div class="form-input" style="width:100%;background:var(--bg-muted);opacity:0.7;cursor:not-allowed;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);">${esc(state.user.role || 'N/A')}</div>
        <span style="font-size:11px;color:var(--text-secondary);margin-top:4px;display:block;">Role changes require Super Admin access via Admin panel.</span>
      </div>
      <div class="form-group" style="margin-bottom: 24px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Department <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="prof-dept" style="width:100%;">
          <option value="0">None</option>
          <option value="1">R&D / Engineering</option>
          <option value="2">Quality</option>
          <option value="4">Manufacturing</option>
          <option value="3">SEM</option>
          <option value="5">IT / Systems</option>
        </select>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn btn-outline" id="prof-cancel">Cancel</button>
        <button class="btn btn-primary" id="prof-save">Save Profile</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('prof-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('prof-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const fullName = document.getElementById('prof-fullname').value.trim();
    const empId = document.getElementById('prof-empid').value.trim() || null;
    const dept = parseInt(document.getElementById('prof-dept').value, 10);

    if (!fullName || isNaN(dept)) {
      showToast('Full name and valid department ID are required.', 'warning');
      return;
    }

    // SECURITY: Role is NOT included in the payload — prevents self-escalation
    const payload = {
      fullName,
      employeeId: empId,
      department: dept,
    };

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const res = await authFetch('/api/Members/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        state.user.name = fullName;
        TokenStore.setSessionUser(state.user);

        // Update avatars safely
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.querySelectorAll('.user-avatar-sm, .user-avatar').forEach(el => {
          el.textContent = initials;
        });
        document.querySelectorAll('.user-name').forEach(el => {
          el.textContent = fullName;
        });

        overlay.remove();
      } else {
        showToast('Failed to update profile. Status ' + res.status, 'error');
        btn.disabled = false;
        btn.textContent = 'Save Profile';
      }
    } catch {
      showToast('Network error while updating profile.', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  });
}

function handleKeyboard(e) {
  const isInApp = document.getElementById('app-shell') && !document.getElementById('app-shell').classList.contains('hidden');
  if (!isInApp) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); document.getElementById('global-search')?.focus(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); navigateTo('bom'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); navigateTo('change-mgmt'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const palette = document.getElementById('cmd-palette');
    if (palette) {
      palette.classList.add('active');
      setTimeout(() => document.getElementById('cmd-palette-input')?.focus(), 50);
    }
  }
  if (e.key === 'Escape') {
    document.querySelector('.modal-overlay')?.remove();
    closeUserMenu();
    const palette = document.getElementById('cmd-palette');
    if (palette) palette.classList.remove('active');
  }
}

function initCommandPalette() {
  const palette = document.getElementById('cmd-palette');
  const input = document.getElementById('cmd-palette-input');
  const resultsContainer = document.getElementById('cmd-palette-results');
  if (!palette || !input || !resultsContainer) return;

  const demoResults = [
    { icon: 'dashboard', label: 'Go to Dashboard', action: () => navigateTo('dashboard') },
    { icon: 'account_tree', label: 'Go to BOM Explorer', action: () => navigateTo('bom') },
    { icon: 'published_with_changes', label: 'Go to Change Management', action: () => navigateTo('change-mgmt') },
    { icon: 'inventory_2', label: 'Go to Parts', action: () => navigateTo('parts') },
    { icon: 'add_circle', label: 'Create New ECR', action: () => { navigateTo('change-mgmt'); showToast('Drafting new ECR...', 'info'); } },
  ];

  function renderResults(query) {
    resultsContainer.innerHTML = '';
    const q = query.toLowerCase();
    const filtered = demoResults.filter(r => r.label.toLowerCase().includes(q));

    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);text-align:center;">No results found</div>';
      return;
    }

    filtered.forEach((r, idx) => {
      const item = document.createElement('div');
      item.className = 'cmd-result-item' + (idx === 0 ? ' selected' : '');
      item.innerHTML = `<span class="material-icons-outlined">${r.icon}</span>${r.label}`;
      item.addEventListener('click', () => {
        palette.classList.remove('active');
        input.value = '';
        r.action();
      });
      resultsContainer.appendChild(item);
    });
  }

  input.addEventListener('input', (e) => renderResults(e.target.value));

  palette.addEventListener('click', (e) => {
    if (e.target === palette) {
      palette.classList.remove('active');
    }
  });

  renderResults('');
}

// ─── Global Toast ───
// SECURITY: Uses textContent for message to prevent XSS injection via toast messages
export function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  const colors = { success: '#059669', error: '#DC2626', warning: '#D97706', info: '#2563EB' };
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:#1F2937;color:white;padding:12px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;font-size:0.857rem;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:slideInRight 0.3s ease;max-width:380px;`;
  // Build icon via innerHTML (safe — icons[type] is from a fixed map)
  const iconSpan = document.createElement('span');
  iconSpan.className = 'material-icons-outlined';
  iconSpan.style.cssText = `font-size:18px;color:${colors[type]}`;
  iconSpan.textContent = icons[type];
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message; // SAFE: textContent escapes HTML
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Global Modal ───
// SECURITY: Title is sanitized via esc() to prevent XSS
export function showModal(title, bodyHTML, footerHTML = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${esc(title)}</div>
        <button class="modal-close" id="modal-close-btn"><span class="material-icons-outlined">close</span></button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  return overlay;
}

if (!document.getElementById('toast-style')) {
  const s = document.createElement('style');
  s.id = 'toast-style';
  s.textContent = '@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes fadeOut{from{opacity:1}to{opacity:0}}';
  document.head.appendChild(s);
}

// Add Toggle Password Logic
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.toggle-password');
  if (btn) {
    const inputId = btn.getAttribute('for');
    const input = document.getElementById(inputId);
    if (input) {
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        btn.textContent = 'visibility';
      }
    }
  }
});

document.addEventListener('DOMContentLoaded', init);

