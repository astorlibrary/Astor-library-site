(() => {
  const viewedResources = new Set();

  function accountHref(mode) {
    if (typeof window.AstorAuth?.accountHref === 'function') return window.AstorAuth.accountHref(mode);
    const query = new URLSearchParams({ mode });
    query.set('next', `${location.pathname}${location.search}${location.hash}`);
    return `/account/?${query}`;
  }

  function rowsFrom(payload) {
    if (Array.isArray(payload)) return payload;
    const candidates = [
      payload?.saved,
      payload?.items,
      payload?.resources,
      payload?.library,
      payload?.data?.items,
      payload?.data?.resources
    ];
    return candidates.find(Array.isArray) || [];
  }

  function savedFrom(payload, resourceId) {
    const direct = [payload?.saved, payload?.item?.saved, payload?.resource?.saved];
    const directValue = direct.find(value => typeof value === 'boolean');
    if (typeof directValue === 'boolean') return directValue;

    const item = rowsFrom(payload).find(row => (row?.resourceId || row?.resource_id || row?.id) === resourceId);
    if (!item) return undefined;
    if (typeof item.saved === 'boolean') return item.saved;
    if (typeof item.isSaved === 'boolean') return item.isSaved;
    if ('savedAt' in item) return Boolean(item.savedAt);
    if ('saved_at' in item) return Boolean(item.saved_at);
    return undefined;
  }

  class ResourceLibraryPanel {
    constructor(element) {
      this.element = element;
      this.resourceId = element.dataset.resourceId || '';
      this.status = element.querySelector('[data-resource-access-status]');
      this.detail = element.querySelector('[data-resource-library-status]');
      this.saveButton = element.querySelector('[data-resource-save]');
      this.accountLink = element.querySelector('[data-resource-account]');
      this.signInLink = element.querySelector('[data-resource-signin]');
      this.registerLink = element.querySelector('[data-resource-register]');
      this.authenticated = false;
      this.saved = false;
      this.busy = false;
      this.initialised = false;

      this.saveButton?.addEventListener('click', () => this.toggleSaved());
      this.signInLink?.setAttribute('href', accountHref('signin'));
      this.registerLink?.setAttribute('href', accountHref('register'));
    }

    async initialise(session) {
      if (!this.resourceId) {
        this.renderExternal();
        return;
      }

      this.authenticated = Boolean(session?.authenticated);
      this.setDetail(this.authenticated
        ? 'Your free account opens every slide. Save this guide to find it quickly next time.'
        : 'Preview 3 slides now. Sign in to save this guide and read every slide.');
      this.render();
      if (!this.authenticated || this.initialised) return;
      this.initialised = true;

      if (typeof window.AstorAuth?.resourceAction !== 'function') {
        this.setDetail('Library controls are temporarily unavailable. You can still read the guide.');
        return;
      }

      let saved;
      if (!viewedResources.has(this.resourceId)) {
        viewedResources.add(this.resourceId);
        try {
          const result = await window.AstorAuth.resourceAction('view', this.resourceId);
          saved = savedFrom(result, this.resourceId);
        } catch {
          this.setDetail('Your guide is open, but its viewing history could not be updated.');
        }
      }

      if (typeof saved !== 'boolean' && typeof window.AstorAuth?.library === 'function') {
        try {
          saved = savedFrom(await window.AstorAuth.library(), this.resourceId);
        } catch {
          // The save control remains usable even when its initial state is unavailable.
        }
      }
      if (typeof saved === 'boolean') this.saved = saved;
      this.render();
    }

    async toggleSaved() {
      if (!this.authenticated || this.busy || !this.resourceId) return;
      const nextSaved = !this.saved;
      this.busy = true;
      this.render();
      this.setDetail(nextSaved ? 'Saving this guide…' : 'Removing this guide from saved resources…');

      try {
        const result = await window.AstorAuth.resourceAction(nextSaved ? 'save' : 'unsave', this.resourceId);
        const returned = savedFrom(result, this.resourceId);
        this.saved = typeof returned === 'boolean' ? returned : nextSaved;
        this.setDetail(this.saved ? 'Guide saved to your account.' : 'Guide removed from your saved resources.');
      } catch {
        this.setDetail('That change could not be saved. Please try again.');
      } finally {
        this.busy = false;
        this.render();
      }
    }

    render() {
      this.element.dataset.authenticated = String(this.authenticated);
      if (this.status) {
        this.status.textContent = this.authenticated
          ? 'Signed in · complete guide available'
          : 'Guest access · first 3 slides available';
      }
      if (this.saveButton) {
        this.saveButton.hidden = !this.authenticated;
        this.saveButton.disabled = this.busy;
        this.saveButton.setAttribute('aria-busy', String(this.busy));
        this.saveButton.setAttribute('aria-pressed', String(this.saved));
        this.saveButton.textContent = this.saved ? 'Saved' : 'Save guide';
      }
      if (this.accountLink) this.accountLink.hidden = !this.authenticated;
      if (this.signInLink) this.signInLink.hidden = this.authenticated;
      if (this.registerLink) this.registerLink.hidden = this.authenticated;
    }

    renderExternal() {
      this.element.dataset.authenticated = 'false';
      if (this.status) this.status.textContent = 'External guide · access is handled on the linked site';
      if (this.saveButton) this.saveButton.hidden = true;
      if (this.accountLink) this.accountLink.hidden = true;
      if (this.signInLink) this.signInLink.hidden = true;
      if (this.registerLink) this.registerLink.hidden = true;
      this.setDetail('This external resource is not stored in your Astor account.');
    }

    setDetail(message) {
      if (this.detail) this.detail.textContent = message;
    }

    reset(session) {
      this.initialised = false;
      this.initialise(session);
    }
  }

  async function start() {
    const panels = Array.from(document.querySelectorAll('[data-resource-library]'))
      .map(element => new ResourceLibraryPanel(element));
    if (!panels.length) return;

    let session = { authenticated: false };
    if (typeof window.AstorAuth?.session === 'function') {
      try { session = await window.AstorAuth.session(); } catch { /* Guest content remains accurate. */ }
    }
    panels.forEach(panel => panel.initialise(session));

    window.addEventListener('astor-auth-changed', event => {
      panels.forEach(panel => panel.reset(event.detail || { authenticated: false }));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
