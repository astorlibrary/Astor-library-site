const SUPABASE_AUTH_ORIGIN = 'https://mxhptvdxouvfvfyhlhpy.supabase.co';
const ASTOR_ORIGIN = 'https://astorlibrary.com';
const CONFIRMATION_PREFIX = '#confirmation_url=';
const TOKEN_PREFIX = '#token_hash=';
const TOKEN_HASH_PATTERN = /^[a-zA-Z0-9_-]{16,256}$/;
const EMAIL_ACTION_TYPES = new Set([
  'email',
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change'
]);
const TOKEN_ACTION_TYPES = new Set(['email', 'recovery', 'email_change']);
const ACTION_COPY = {
  email: ['Confirm your email address.', 'Confirm email address'],
  signup: ['Confirm your email address.', 'Confirm email address'],
  invite: ['Accept your Astor Library invitation.', 'Accept invitation'],
  magiclink: ['Continue signing in.', 'Continue sign-in'],
  recovery: ['Continue to password reset.', 'Reset password'],
  email_change: ['Confirm your email address change.', 'Confirm email change']
};
const ACTION_DESTINATIONS = {
  email: '/resources/',
  recovery: '/account/reset/',
  email_change: '/account/'
};

function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const parsed = new URL(value, ASTOR_ORIGIN);
    return parsed.origin === ASTOR_ORIGIN ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}

function signupNext(value) {
  if (!value) return null;
  let redirect;
  try {
    redirect = new URL(value, ASTOR_ORIGIN);
  } catch {
    return null;
  }
  if (redirect.origin !== ASTOR_ORIGIN || redirect.pathname !== '/account/callback/') return null;
  return safeNextPath(redirect.searchParams.get('next'));
}

export function confirmationTarget(rawHash) {
  if (typeof rawHash !== 'string' || !rawHash.startsWith(CONFIRMATION_PREFIX)) return null;

  // Already-sent emails may contain the complete Supabase verification URL.
  // Keep the raw suffix because it contains its own nested query parameters.
  const rawTarget = rawHash.slice(CONFIRMATION_PREFIX.length);
  if (!rawTarget || rawTarget.length > 4_096) return null;

  let target;
  try {
    target = new URL(rawTarget);
  } catch {
    return null;
  }

  if (target.origin !== SUPABASE_AUTH_ORIGIN ||
      target.pathname !== '/auth/v1/verify' ||
      target.username || target.password || target.hash) {
    return null;
  }

  const types = target.searchParams.getAll('type');
  if (types.length !== 1 || !EMAIL_ACTION_TYPES.has(types[0])) return null;

  const tokens = [
    ...target.searchParams.getAll('token'),
    ...target.searchParams.getAll('token_hash')
  ];
  if (tokens.length !== 1 || !tokens[0] || tokens[0].length > 2_048 || /[\u0000-\u001f\u007f]/.test(tokens[0])) {
    return null;
  }

  const redirects = target.searchParams.getAll('redirect_to');
  if (redirects.length > 1) return null;
  if (redirects.length === 1) {
    let redirect;
    try {
      redirect = new URL(redirects[0]);
    } catch {
      return null;
    }
    if (redirect.origin !== ASTOR_ORIGIN || redirect.username || redirect.password) return null;
  }

  return target.href;
}

export function confirmationAction(rawHash) {
  if (typeof rawHash !== 'string') return null;
  if (rawHash.startsWith(TOKEN_PREFIX) && rawHash.length <= 1_024) {
    const params = new URLSearchParams(rawHash.slice(1));
    const keys = Array.from(params.keys());
    if (keys.some(key => key !== 'token_hash' && key !== 'type' && key !== 'next')) return null;
    const tokenHashes = params.getAll('token_hash');
    const types = params.getAll('type');
    const nextValues = params.getAll('next');
    if (tokenHashes.length !== 1 || types.length !== 1 ||
        nextValues.length > 1 || !TOKEN_HASH_PATTERN.test(tokenHashes[0]) || !TOKEN_ACTION_TYPES.has(types[0])) {
      return null;
    }
    if (nextValues.length && types[0] !== 'email') return null;
    const next = nextValues.length ? signupNext(nextValues[0]) : null;
    if (nextValues.length && !next) return null;
    return { mode: 'token', tokenHash: tokenHashes[0], type: types[0], next };
  }

  const target = confirmationTarget(rawHash);
  if (!target) return null;
  return { mode: 'legacy', target, type: new URL(target).searchParams.get('type') };
}

function updateStatus(element, message, kind = 'status') {
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = false;
  if (kind === 'error') element.focus();
}

export function bindConfirmationAction({ hash, form, status, fallback, navigate, verifyToken, clearSecret }) {
  const action = confirmationAction(hash);
  if (!action || !form) {
    if (form) form.hidden = true;
    updateStatus(
      fallback || status,
      'This email action link is incomplete or unsafe. Return to account access and request a fresh email.',
      'error'
    );
    return false;
  }

  // Once the action has been validated it is held only in this closure. Remove
  // the bearer value from the visible URL and browser history before the user
  // waits on the page or any verification request is made.
  clearSecret?.();

  if (fallback) fallback.hidden = true;
  form.hidden = false;
  const [title, buttonLabel] = ACTION_COPY[action.type] || ['Complete this email action.', 'Continue securely'];
  const titleElement = form.querySelector('[data-confirmation-title]');
  const button = form.querySelector('button[type="submit"]');
  if (titleElement) titleElement.textContent = title;
  if (button) button.textContent = buttonLabel;
  updateStatus(status, 'Your link is ready. Use the button below to complete this email action.');

  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    updateStatus(status, 'Completing your email action…');

    if (action.mode === 'legacy') {
      navigate(action.target, false);
      return;
    }

    try {
      const result = await verifyToken({ tokenHash: action.tokenHash, type: action.type });
      if (result.intermediate) {
        if (button) button.setAttribute('aria-busy', 'false');
        updateStatus(
          status,
          'First confirmation accepted. Now open the confirmation message sent to the other email address.',
          'success'
        );
        return;
      }
      if (action.type === 'recovery' && !result.canResetPassword) {
        throw new Error('This link did not authorise a password reset. Request a new reset email.');
      }
      if (action.type === 'email' && !result.authenticated) {
        throw new Error('Your email was confirmed, but automatic sign-in was not completed. Sign in with your password.');
      }
      const messages = {
        email: 'Email confirmed. Opening your library…',
        recovery: 'Reset link accepted. Opening password reset…',
        email_change: 'Email address confirmed. Opening your account…'
      };
      updateStatus(status, messages[action.type], 'success');
      navigate(action.next || ACTION_DESTINATIONS[action.type], true);
    } catch (error) {
      busy = false;
      if (button) {
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
      }
      updateStatus(status, error?.message || 'This email action could not be completed. Request a fresh email.', 'error');
    }
  });
  return true;
}

async function verifyToken(payload) {
  const response = await fetch('/api/auth/verify-email', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let result = {};
  try { result = await response.json(); } catch { /* A readable fallback follows. */ }
  if (!response.ok) throw new Error(result.error || 'This email action could not be completed. Request a fresh email.');
  return result;
}

function start() {
  const form = document.querySelector('[data-confirmation-action]');
  if (!form) return;
  bindConfirmationAction({
    hash: window.location.hash,
    form,
    status: form.querySelector('[data-confirmation-status]'),
    fallback: document.querySelector('[data-confirmation-fallback]'),
    navigate: (target, replace) => replace ? window.location.replace(target) : window.location.assign(target),
    verifyToken,
    clearSecret: () => window.history.replaceState({}, '', '/account/action/')
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
