(() => {
  let cachedSession = null;
  let sessionRequest = null;

  async function sameOriginApi(pathname, options = {}) {
    const url = new URL(pathname, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error('Account requests must use the Astor Library origin.');
    const response = await fetch(`${url.pathname}${url.search}`, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    let payload = {};
    try { payload = await response.json(); } catch { /* A readable fallback follows. */ }
    if (!response.ok) {
      const error = new Error(payload.error || 'The account service could not complete that request.');
      error.status = response.status;
      error.code = payload.code || '';
      throw error;
    }
    return payload;
  }

  function api(action, options = {}) {
    return sameOriginApi(`/api/auth/${action}`, options);
  }

  function nextPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function accountHref(mode = '') {
    const query = new URLSearchParams();
    if (mode) query.set('mode', mode);
    if (!window.location.pathname.startsWith('/account/')) query.set('next', nextPath());
    const suffix = query.toString();
    return `/account/${suffix ? `?${suffix}` : ''}`;
  }

  function render(session) {
    for (const link of document.querySelectorAll('[data-auth-link]')) {
      if (session.authenticated) {
        link.textContent = 'Account';
        link.href = '/account/';
        link.setAttribute('aria-label', 'Open your Astor Library account');
      } else {
        link.textContent = 'Sign in';
        link.href = accountHref('signin');
        link.setAttribute('aria-label', 'Sign in to Astor Library');
      }
    }
    for (const element of document.querySelectorAll('[data-auth-only]')) {
      element.hidden = !session.authenticated;
    }
    for (const element of document.querySelectorAll('[data-guest-only]')) {
      element.hidden = session.authenticated;
    }
  }

  async function session(force = false) {
    if (sessionRequest) return sessionRequest;
    if (cachedSession && !force) return cachedSession;
    sessionRequest = api('session')
      .catch(() => ({ authenticated: false, unavailable: true }))
      .then(result => {
        cachedSession = result;
        render(result);
        window.dispatchEvent(new CustomEvent('astor-auth-changed', { detail: result }));
        return result;
      })
      .finally(() => { sessionRequest = null; });
    return sessionRequest;
  }

  async function request(action, body) {
    const result = await api(action, { method: 'POST', body });
    if (Object.prototype.hasOwnProperty.call(result, 'authenticated')) {
      cachedSession = result;
      render(result);
      window.dispatchEvent(new CustomEvent('astor-auth-changed', { detail: result }));
    }
    return result;
  }

  async function signOut() {
    const result = await request('sign-out', {});
    cachedSession = result;
    return result;
  }

  function configuration() {
    return api('config');
  }

  function library(cursor = '') {
    const query = new URLSearchParams();
    if (typeof cursor === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(cursor)) query.set('cursor', cursor);
    const suffix = query.toString();
    return sameOriginApi(`/api/account/library${suffix ? `?${suffix}` : ''}`);
  }

  function resourceAction(action, resourceId, lastSlide) {
    if (!['view', 'save', 'unsave'].includes(action)) {
      return Promise.reject(new TypeError('Unknown resource action.'));
    }
    const id = typeof resourceId === 'string' ? resourceId.trim() : '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      return Promise.reject(new TypeError('A valid Astor resource ID is required.'));
    }

    const body = { action, resourceId: id };
    const slide = Number(lastSlide);
    if (Number.isSafeInteger(slide) && slide > 0) body.lastSlide = slide;
    return sameOriginApi('/api/account/resource', { method: 'POST', body });
  }

  async function deleteAccount(confirmation, password) {
    const result = await sameOriginApi('/api/account/delete', {
      method: 'POST',
      body: {
        confirmation: String(confirmation ?? ''),
        password: String(password ?? '')
      }
    });
    cachedSession = { authenticated: false };
    render(cachedSession);
    window.dispatchEvent(new CustomEvent('astor-auth-changed', { detail: cachedSession }));
    return result;
  }

  window.AstorAuth = {
    session,
    request,
    signOut,
    accountHref,
    configuration,
    library,
    resourceAction,
    deleteAccount
  };

  function start() {
    session();
    document.addEventListener('click', async event => {
      const button = event.target.closest('[data-auth-signout]');
      if (!button) return;
      event.preventDefault();
      button.disabled = true;
      try {
        await signOut();
        window.location.assign('/');
      } catch {
        button.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
