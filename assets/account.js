(() => {
  const auth = window.AstorAuth;
  if (!auth) return;

  let securityConfigPromise = null;
  let turnstileScriptPromise = null;
  const turnstileWidgets = new WeakMap();

  function safeNext(value, fallback = '/resources/') {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
    try {
      const url = new URL(value, window.location.origin);
      return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
    } catch {
      return fallback;
    }
  }

  function setStatus(element, message, kind = 'status') {
    if (!element) return;
    element.textContent = message;
    element.dataset.kind = kind;
    element.hidden = !message;
    if (message && kind === 'error') element.focus();
  }

  function submitState(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }

  function securityConfig() {
    if (!securityConfigPromise) {
      securityConfigPromise = auth.configuration().catch(error => {
        securityConfigPromise = null;
        throw error;
      });
    }
    return securityConfigPromise;
  }

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileScriptPromise) return turnstileScriptPromise;
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve(window.turnstile), { once: true });
      script.addEventListener('error', () => reject(new Error('The account security check could not be loaded.')), { once: true });
      document.head.append(script);
    }).catch(error => {
      turnstileScriptPromise = null;
      throw error;
    });
    return turnstileScriptPromise;
  }

  async function prepareSecurity(form) {
    const container = form?.querySelector('[data-turnstile-action]');
    if (!container) return { required: false };
    const status = form.querySelector('[data-form-status]');
    try {
      const config = await securityConfig();
      if (!config.turnstileRequired) {
        container.hidden = true;
        return { required: false };
      }
      if (!config.turnstileSiteKey) throw new Error('The account security check has not been configured yet.');
      container.hidden = false;
      const turnstile = await loadTurnstile();
      if (!turnstileWidgets.has(form)) {
        const widget = turnstile.render(container, {
          sitekey: config.turnstileSiteKey,
          action: container.dataset.turnstileAction,
          size: 'flexible',
          theme: 'light',
          'error-callback': () => setStatus(status, 'The security check could not be completed. Try again.', 'error'),
          'expired-callback': () => setStatus(status, 'The security check expired. Complete it again.', 'error')
        });
        turnstileWidgets.set(form, widget);
      }
      return { required: true, turnstile };
    } catch (error) {
      setStatus(status, error.message || 'The account security check could not be loaded.', 'error');
      return { required: true, unavailable: true };
    }
  }

  async function securityToken(form) {
    const security = await prepareSecurity(form);
    if (!security.required) return '';
    if (security.unavailable) return null;
    const widget = turnstileWidgets.get(form);
    const token = security.turnstile?.getResponse(widget) || '';
    if (!token) {
      setStatus(form.querySelector('[data-form-status]'), 'Complete the security check and try again.', 'error');
      return null;
    }
    return token;
  }

  function resetSecurity(form) {
    const widget = turnstileWidgets.get(form);
    if (widget === undefined || !window.turnstile) return;
    window.turnstile.reset(widget);
  }

  async function submit(form, action, body, status) {
    setStatus(status, '');
    submitState(form, true);
    try {
      return await auth.request(action, body);
    } catch (error) {
      setStatus(status, error.message, 'error');
      return null;
    } finally {
      submitState(form, false);
    }
  }

  function setupModes() {
    const buttons = [...document.querySelectorAll('[data-account-mode]')];
    const panels = [...document.querySelectorAll('[data-account-panel]')];
    if (!buttons.length || !panels.length) return;

    const show = mode => {
      buttons.forEach(button => {
        const active = button.dataset.accountMode === mode;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.accountPanel !== mode; });
      const activePanel = panels.find(panel => panel.dataset.accountPanel === mode);
      if (activePanel?.offsetParent !== null) prepareSecurity(activePanel.querySelector('form'));
      window.history.replaceState({}, '', `${window.location.pathname}?${new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(window.location.search)),
        mode
      })}`);
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => show(button.dataset.accountMode));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = buttons[(index + direction + buttons.length) % buttons.length];
        show(next.dataset.accountMode);
        next.focus();
      });
    });
    const requested = new URLSearchParams(window.location.search).get('mode');
    show(requested === 'register' ? 'register' : 'signin');
  }

  let resourceMetadataPromise = null;

  function localHref(value, fallback) {
    if (!value) return fallback;
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return fallback;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }

  function presentationId(item) {
    if (item?.id) return String(item.id);
    const viewerUrl = item?.viewerUrl || item?.externalUrl;
    if (!viewerUrl) return '';
    try {
      return new URL(viewerUrl, window.location.origin).searchParams.get('presentation') || '';
    } catch {
      return '';
    }
  }

  function normaliseResource(item) {
    const id = presentationId(item);
    if (!id) return null;
    const viewerFallback = `/presentations/?presentation=${encodeURIComponent(id)}`;
    return {
      id,
      title: String(item.title || 'Astor Library resource'),
      description: String(item.description || item.focus || ''),
      resourceHref: localHref(item.resourceHref || item.href, viewerFallback),
      viewerUrl: localHref(item.viewerUrl || item.externalUrl, viewerFallback),
      image: localHref(item.image, '/assets/astor-header-mark.png'),
      imageIsFallback: !item.image,
      type: String(item.typeLabel || item.type || 'Illustrated resource')
    };
  }

  async function fetchResourceMetadata() {
    async function read(url) {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Resource details returned ${response.status}.`);
      return response.json();
    }

    let items;
    try {
      const libraryData = await read('/assets/resource-library-data.json');
      items = Array.isArray(libraryData) ? libraryData : libraryData.resources;
      if (!Array.isArray(items) || !items.length) throw new Error('The resource library is empty.');
    } catch {
      const contentIndex = await read('/assets/content-index.json');
      items = contentIndex.resources;
      if (!Array.isArray(items) || !items.length) throw new Error('The resource index is unavailable.');
    }

    return new Map(items.map(normaliseResource).filter(Boolean).map(item => [item.id, item]));
  }

  function resourceMetadata() {
    if (!resourceMetadataPromise) {
      resourceMetadataPromise = fetchResourceMetadata().catch(error => {
        resourceMetadataPromise = null;
        throw error;
      });
    }
    return resourceMetadataPromise;
  }

  function resourceRecordId(record) {
    return record?.resourceId == null ? '' : String(record.resourceId);
  }

  function slideNumber(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
  }

  function viewerHref(resourceId, lastSlide) {
    const params = new URLSearchParams({ presentation: resourceId });
    const slide = slideNumber(lastSlide);
    if (slide) params.set('slide', String(slide));
    return `/presentations/?${params}`;
  }

  function formatTime(value, prefix) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return null;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDifference = Math.round((startToday - startDate) / 86400000);
    const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
    let label;
    if (dayDifference === 0) label = `today at ${time}`;
    else if (dayDifference === 1) label = `yesterday at ${time}`;
    else label = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
    return { dateTime: date.toISOString(), label: `${prefix} ${label}` };
  }

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function resourceFor(record, metadata) {
    const id = resourceRecordId(record);
    return metadata.get(id) || {
      id,
      title: 'Astor Library resource',
      description: '',
      resourceHref: viewerHref(id),
      viewerUrl: viewerHref(id),
      image: '/assets/astor-header-mark.png',
      imageIsFallback: true,
      type: 'Illustrated resource'
    };
  }

  function appendResourceTime(parent, value, prefix) {
    const formatted = formatTime(value, prefix);
    if (!formatted) return;
    const paragraph = element('p', 'account-resource-time');
    const time = element('time', '', formatted.label);
    time.dateTime = formatted.dateTime;
    paragraph.append(time);
    parent.append(paragraph);
  }

  function createResourceCard(record, metadata, options = {}) {
    const resource = resourceFor(record, metadata);
    const resourceId = resourceRecordId(record);
    const continueHref = viewerHref(resourceId, record.lastSlide);
    const card = element('article', 'account-resource-card');
    card.dataset.resourceId = resourceId;

    const media = element('div', 'account-resource-card-media');
    const image = element('img');
    image.src = resource.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    if (resource.imageIsFallback) image.classList.add('is-placeholder');
    image.addEventListener('error', () => {
      image.src = '/assets/astor-header-mark.png';
      image.classList.add('is-placeholder');
    }, { once: true });
    media.append(image);

    const body = element('div', 'account-resource-card-body');
    body.append(element('p', 'account-resource-kind', resource.type));
    const heading = element('h4');
    const title = element('a', '', resource.title);
    title.href = resource.resourceHref;
    heading.append(title);
    body.append(heading);
    if (resource.description) body.append(element('p', 'account-resource-description', resource.description));
    appendResourceTime(body, options.timeValue, options.timePrefix || 'Last viewed');

    const actions = element('div', 'account-card-actions');
    const open = element('a', 'account-card-link', slideNumber(record.lastSlide) ? `Continue from slide ${record.lastSlide}` : 'Open resource');
    open.href = continueHref;
    actions.append(open);
    if (options.removable) {
      const remove = element('button', 'account-card-remove', 'Remove');
      remove.type = 'button';
      remove.dataset.removeSaved = '';
      remove.dataset.resourceId = resourceId;
      remove.setAttribute('aria-label', `Remove ${resource.title} from saved resources`);
      actions.append(remove);
    }
    body.append(actions);
    card.append(media, body);
    return card;
  }

  function createRecentCard(record, metadata) {
    const resource = resourceFor(record, metadata);
    const resourceId = resourceRecordId(record);
    const card = element('article', 'account-recent-card');
    const image = element('img');
    image.src = resource.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    if (resource.imageIsFallback) image.classList.add('is-placeholder');
    image.addEventListener('error', () => {
      image.src = '/assets/astor-header-mark.png';
      image.classList.add('is-placeholder');
    }, { once: true });

    const copy = element('div', 'account-recent-card-copy');
    copy.append(element('p', 'account-resource-kind', resource.type));
    const heading = element('h4');
    const title = element('a', '', resource.title);
    title.href = resource.resourceHref;
    heading.append(title);
    copy.append(heading);
    appendResourceTime(copy, record.lastViewedAt, 'Last viewed');

    const open = element('a', 'account-card-link', slideNumber(record.lastSlide) ? `Continue from slide ${record.lastSlide}` : 'Open resource');
    open.href = viewerHref(resourceId, record.lastSlide);
    card.append(image, copy, open);
    return card;
  }

  function setLibraryStatus(element, message, kind = 'status') {
    if (!element) return;
    element.textContent = message;
    element.dataset.kind = kind;
    element.hidden = !message;
  }

  function sortRecent(records) {
    return records.slice().sort((first, second) => {
      return new Date(second.lastViewedAt || 0) - new Date(first.lastViewedAt || 0);
    });
  }

  function renderLibrary(state, elements) {
    const recent = sortRecent(state.recent);
    const recentById = new Map(recent.map(record => [resourceRecordId(record), record]));
    const continueRecords = recent.filter(record => slideNumber(record.lastSlide)).slice(0, 4);
    elements.continueList.replaceChildren(...continueRecords.map(record => createResourceCard(record, state.metadata, {
      timeValue: record.lastViewedAt,
      timePrefix: 'Last viewed'
    })));
    elements.continueEmpty.hidden = Boolean(continueRecords.length);

    const savedWithProgress = state.saved.map(record => {
      const progress = recentById.get(resourceRecordId(record));
      return {
        ...record,
        lastViewedAt: record.lastViewedAt || progress?.lastViewedAt || null,
        lastSlide: record.lastSlide || progress?.lastSlide || null
      };
    });
    elements.savedList.replaceChildren(...savedWithProgress.map(record => createResourceCard(record, state.metadata, {
      removable: true,
      timeValue: record.savedAt,
      timePrefix: 'Saved'
    })));
    elements.savedEmpty.hidden = Boolean(savedWithProgress.length);
    elements.loadMore.hidden = !state.savedHasMore || !state.savedCursor;

    elements.recentList.replaceChildren(...recent.map(record => createRecentCard(record, state.metadata)));
    elements.recentEmpty.hidden = Boolean(recent.length);
  }

  async function setupResourceLibrary(shell) {
    const elements = {
      status: shell.querySelector('[data-library-status]'),
      continueList: shell.querySelector('[data-continue-list]'),
      continueEmpty: shell.querySelector('[data-continue-empty]'),
      savedList: shell.querySelector('[data-saved-list]'),
      savedEmpty: shell.querySelector('[data-saved-empty]'),
      loadMore: shell.querySelector('[data-load-more-saved]'),
      recentList: shell.querySelector('[data-recent-list]'),
      recentEmpty: shell.querySelector('[data-recent-empty]')
    };
    const state = {
      saved: [],
      savedTotal: 0,
      savedCursor: null,
      savedHasMore: false,
      recent: [],
      metadata: new Map(),
      busy: false
    };

    try {
      const [libraryResult, metadataResult] = await Promise.allSettled([auth.library(), resourceMetadata()]);
      if (libraryResult.status === 'rejected') throw libraryResult.reason;
      const library = libraryResult.value;
      state.saved = (Array.isArray(library.saved) ? library.saved : []).filter(record => resourceRecordId(record));
      state.savedTotal = Number.isFinite(Number(library.savedTotal)) ? Number(library.savedTotal) : state.saved.length;
      state.savedCursor = typeof library.savedCursor === 'string' ? library.savedCursor : null;
      state.savedHasMore = library.savedHasMore === true;
      state.recent = (Array.isArray(library.recent) ? library.recent : []).filter(record => resourceRecordId(record));
      state.metadata = metadataResult.status === 'fulfilled' ? metadataResult.value : new Map();
      renderLibrary(state, elements);
      if (metadataResult.status === 'rejected') {
        setLibraryStatus(elements.status, 'Your library loaded, but its resource details are temporarily unavailable. The links still work.', 'error');
      } else {
        setLibraryStatus(elements.status, '');
      }
    } catch (error) {
      setLibraryStatus(elements.status, error.message || 'Your resource library could not be loaded. Refresh the page to try again.', 'error');
      elements.continueEmpty.hidden = false;
      elements.savedEmpty.hidden = false;
      elements.recentEmpty.hidden = false;
      return;
    }

    elements.loadMore.addEventListener('click', async () => {
      if (state.busy) return;
      state.busy = true;
      elements.loadMore.disabled = true;
      elements.loadMore.setAttribute('aria-busy', 'true');
      elements.loadMore.textContent = 'Loading saved resources…';
      setLibraryStatus(elements.status, '');
      try {
        const page = await auth.library(state.savedCursor);
        const known = new Set(state.saved.map(resourceRecordId));
        for (const record of Array.isArray(page.saved) ? page.saved : []) {
          const resourceId = resourceRecordId(record);
          if (resourceId && !known.has(resourceId)) {
            state.saved.push(record);
            known.add(resourceId);
          }
        }
        state.savedTotal = Number.isFinite(Number(page.savedTotal)) ? Number(page.savedTotal) : state.saved.length;
        state.savedCursor = typeof page.savedCursor === 'string' ? page.savedCursor : null;
        state.savedHasMore = page.savedHasMore === true;
        renderLibrary(state, elements);
        setLibraryStatus(elements.status, 'More saved resources have been loaded.', 'success');
      } catch (error) {
        setLibraryStatus(elements.status, error.message || 'More saved resources could not be loaded.', 'error');
      } finally {
        state.busy = false;
        elements.loadMore.disabled = false;
        elements.loadMore.removeAttribute('aria-busy');
        elements.loadMore.textContent = 'Load more saved resources';
      }
    });

    elements.savedList.addEventListener('click', async event => {
      const button = event.target.closest('[data-remove-saved]');
      if (!button || button.disabled) return;
      const resourceId = button.dataset.resourceId;
      const originalLabel = button.textContent;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Removing…';
      setLibraryStatus(elements.status, '');
      try {
        await auth.resourceAction('unsave', resourceId, null);
        const removedIndex = state.saved.findIndex(record => resourceRecordId(record) === resourceId);
        state.saved = state.saved.filter(record => resourceRecordId(record) !== resourceId);
        state.savedTotal = Math.max(0, state.savedTotal - 1);
        renderLibrary(state, elements);
        const remainingButtons = [...elements.savedList.querySelectorAll('[data-remove-saved]')];
        const nextFocus = remainingButtons[Math.min(Math.max(removedIndex, 0), remainingButtons.length - 1)];
        if (nextFocus) nextFocus.focus();
        else if (!elements.loadMore.hidden) elements.loadMore.focus();
        else {
          const heading = document.getElementById('saved-resources-title');
          heading?.setAttribute('tabindex', '-1');
          heading?.focus();
        }
        setLibraryStatus(elements.status, 'The resource was removed from your saved list.', 'success');
      } catch (error) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = originalLabel;
        setLibraryStatus(elements.status, error.message || 'The resource could not be removed. Try again.', 'error');
      }
    });
  }

  function setupDeleteAccount(shell) {
    const form = shell.querySelector('[data-delete-account-form]');
    if (!form) return;
    const input = form.elements.confirmation;
    const password = form.elements.password;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-form-status]');
    let busy = false;
    const updateButton = () => {
      button.disabled = busy || input.value !== 'DELETE' || password.value.length < 8;
    };
    input.addEventListener('input', updateButton);
    password.addEventListener('input', updateButton);
    updateButton();

    form.addEventListener('submit', async event => {
      event.preventDefault();
      setStatus(status, '');
      if (input.value !== 'DELETE') {
        setStatus(status, 'Type DELETE in capital letters before deleting the account.', 'error');
        input.focus();
        return;
      }
      if (password.value.length < 8) {
        setStatus(status, 'Enter your current password before deleting the account.', 'error');
        password.focus();
        return;
      }
      busy = true;
      updateButton();
      button.setAttribute('aria-busy', 'true');
      try {
        const result = await auth.deleteAccount(input.value, form.elements.password.value);
        if (!result?.deleted) throw new Error('The account could not be deleted.');
        password.value = '';
        password.disabled = true;
        input.disabled = true;
        button.textContent = 'Account deleted';
        setStatus(status, result.message || 'Your account has been deleted.', 'success');
        window.setTimeout(() => window.location.replace('/'), 900);
      } catch (error) {
        busy = false;
        form.elements.password.value = '';
        button.removeAttribute('aria-busy');
        updateButton();
        setStatus(status, error.message || 'The account could not be deleted. Try again.', 'error');
      }
    });
  }

  async function setupAccountPage() {
    const shell = document.querySelector('[data-account-shell]');
    if (!shell) return;
    const forms = shell.querySelector('[data-account-forms]');
    const signedIn = shell.querySelector('[data-account-signed-in]');
    const loading = shell.querySelector('[data-account-loading]');
    const email = shell.querySelector('[data-account-email]');
    const consent = shell.querySelector('[data-current-consent]');
    let session;
    try {
      session = await auth.session();
    } catch (error) {
      session = { authenticated: false };
      setupModes();
      setStatus(shell.querySelector('[data-account-panel="signin"] [data-form-status]'), error.message || 'Your account status could not be checked. You can still try to sign in.', 'error');
    }
    loading.hidden = true;
    forms.hidden = session.authenticated;
    signedIn.hidden = !session.authenticated;
    if (session.authenticated) {
      email.textContent = session.email;
      consent.checked = Boolean(session.marketingConsent);
      shell.classList.add('is-dashboard');
      const introKicker = document.querySelector('[data-account-intro-kicker]');
      const introTitle = document.querySelector('[data-account-intro-title]');
      const introCopy = document.querySelector('[data-account-intro-copy]');
      if (introKicker) introKicker.textContent = 'My account';
      if (introTitle) introTitle.textContent = 'Your resource library.';
      if (introCopy) introCopy.textContent = 'Continue illustrated guides, return to saved resources and manage the essential settings for your Astor Library account.';
      setupResourceLibrary(shell);
      setupDeleteAccount(shell);
    } else {
      if (!document.querySelector('[data-account-mode][aria-selected]')) setupModes();
      if (session.unavailable) {
        setStatus(shell.querySelector('[data-account-panel="signin"] [data-form-status]'), 'The account service is temporarily unavailable. You can retry signing in in a moment.', 'error');
      }
      prepareSecurity(shell.querySelector('[data-account-panel]:not([hidden]) form'));
    }

    const next = safeNext(new URLSearchParams(window.location.search).get('next'), '/account/');
    const signIn = shell.querySelector('[data-sign-in-form]');
    signIn?.addEventListener('submit', async event => {
      event.preventDefault();
      const turnstileToken = await securityToken(signIn);
      if (turnstileToken === null) return;
      const result = await submit(signIn, 'sign-in', {
        email: signIn.elements.email.value,
        password: signIn.elements.password.value,
        turnstileToken
      }, signIn.querySelector('[data-form-status]'));
      resetSecurity(signIn);
      if (result?.authenticated) window.location.assign(next);
    });

    const register = shell.querySelector('[data-register-form]');
    register?.addEventListener('submit', async event => {
      event.preventDefault();
      if (register.elements.password.value !== register.elements.password_confirm.value) {
        setStatus(register.querySelector('[data-form-status]'), 'The passwords do not match.', 'error');
        return;
      }
      const turnstileToken = await securityToken(register);
      if (turnstileToken === null) return;
      const result = await submit(register, 'sign-up', {
        email: register.elements.email.value,
        password: register.elements.password.value,
        marketingConsent: register.elements.marketing_consent.checked,
        next,
        turnstileToken
      }, register.querySelector('[data-form-status]'));
      resetSecurity(register);
      if (!result) return;
      if (result.authenticated) window.location.assign(next);
      else setStatus(register.querySelector('[data-form-status]'), result.message, 'success');
    });

    const consentForm = shell.querySelector('[data-consent-form]');
    consentForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const result = await submit(consentForm, 'marketing-consent', {
        marketingConsent: consent.checked
      }, consentForm.querySelector('[data-form-status]'));
      if (result) setStatus(consentForm.querySelector('[data-form-status]'), 'Your email choice has been saved.', 'success');
    });

    const emailChangeForm = shell.querySelector('[data-email-change-form]');
    emailChangeForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const status = emailChangeForm.querySelector('[data-form-status]');
      const result = await submit(emailChangeForm, 'update-email', {
        email: emailChangeForm.elements.email.value,
        password: emailChangeForm.elements.password.value
      }, status);
      emailChangeForm.elements.password.value = '';
      if (result) {
        emailChangeForm.elements.email.value = '';
        setStatus(status, result.message, 'success');
      }
    });
  }

  function setupRecovery() {
    const form = document.querySelector('[data-recovery-form]');
    if (!form) return;
    prepareSecurity(form);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const turnstileToken = await securityToken(form);
      if (turnstileToken === null) return;
      const result = await submit(form, 'recover', {
        email: form.elements.email.value,
        turnstileToken
      }, form.querySelector('[data-form-status]'));
      resetSecurity(form);
      if (result) setStatus(form.querySelector('[data-form-status]'), result.message, 'success');
    });
  }

  async function setupCallback() {
    const callback = document.querySelector('[data-auth-callback]');
    if (!callback) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const flowId = params.get('sb_flow_id');
    const intermediateEmailChange = params.get('message') ===
      'Confirmation link accepted. Please proceed to confirm link sent to the other email';
    const next = safeNext(params.get('next'));
    if (!code && intermediateEmailChange) {
      setStatus(callback, 'First confirmation accepted. Now open the confirmation message sent to the other email address.', 'success');
      return;
    }
    if (!code) {
      setStatus(callback, 'This confirmation link is incomplete. Sign in or request another email.', 'error');
      return;
    }
    try {
      const result = await auth.request('exchange-code', { code, ...(flowId ? { flowId } : {}) });
      window.history.replaceState({}, '', '/account/callback/');
      setStatus(callback, 'Email confirmed. Opening your resource…', 'success');
      if (result.authenticated) window.location.replace(next);
    } catch (error) {
      setStatus(callback, error.message, 'error');
    }
  }

  async function setupReset() {
    const form = document.querySelector('[data-reset-form]');
    if (!form) return;
    const status = form.querySelector('[data-form-status]');
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const flowId = params.get('sb_flow_id');
    if (code) {
      try {
        const session = await auth.request('exchange-code', { code, ...(flowId ? { flowId } : {}) });
        if (!session.canResetPassword) {
          throw new Error('This link does not authorise a password reset. Request a new reset email.');
        }
        window.history.replaceState({}, '', '/account/reset/');
      } catch (error) {
        setStatus(status, error.message, 'error');
        form.querySelector('fieldset').disabled = true;
        return;
      }
    } else {
      const session = await auth.session(true);
      if (!session.authenticated || !session.canResetPassword) {
        setStatus(status, 'This reset link is incomplete or has expired. Request a new one.', 'error');
        form.querySelector('fieldset').disabled = true;
        return;
      }
    }
    form.querySelector('fieldset').disabled = false;
    setStatus(status, 'Reset link accepted. Choose your new password.', 'success');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.elements.password.value !== form.elements.password_confirm.value) {
        setStatus(status, 'The passwords do not match.', 'error');
        return;
      }
      const result = await submit(form, 'update-password', { password: form.elements.password.value }, status);
      if (result) {
        setStatus(status, result.message, 'success');
        window.setTimeout(() => window.location.assign('/account/'), 900);
      }
    });
  }

  setupAccountPage();
  setupRecovery();
  setupCallback();
  setupReset();
})();
