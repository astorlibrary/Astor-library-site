function libraryRows(payload) {
  if (Array.isArray(payload)) return payload;
  return [payload?.saved, payload?.items, payload?.resources, payload?.library, payload?.data?.items]
    .find(Array.isArray) || [];
}

function savedState(payload, resourceId) {
  const direct = [payload?.saved, payload?.item?.saved, payload?.resource?.saved]
    .find(value => typeof value === 'boolean');
  if (typeof direct === 'boolean') return direct;
  const item = libraryRows(payload).find(row =>
    (row?.resourceId || row?.resource_id || row?.id) === resourceId
  );
  if (!item) return undefined;
  if (typeof item.saved === 'boolean') return item.saved;
  if (typeof item.isSaved === 'boolean') return item.isSaved;
  if ('savedAt' in item) return Boolean(item.savedAt);
  return 'saved_at' in item ? Boolean(item.saved_at) : undefined;
}

export class AstorPresentationViewer extends HTMLElement {
  #slide = 1;
  #requestedSlide = 1;
  #initialSlide = 1;
  #hasExplicitInitialSlide = false;
  #state = 'idle';
  #pointer = null;
  #loadController = null;
  #loadRequest = 0;
  #objectUrl = '';
  #access = 'unknown';
  #pseudoFullscreen = false;
  #fullscreenActive = false;
  #saved = false;
  #libraryBusy = false;
  #libraryLoaded = false;
  #progressTimer = null;
  #pendingProgressSlide = 0;
  #lastRecordedSlide = 0;
  #lastRecordedAt = 0;
  #hasLoadedSlide = false;

  #onKeyDown = event => {
    if (event.defaultPrevented || this.#isTyping(event.target)) return;
    if (!this.contains(document.activeElement) && !this.#isFullscreen()) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.goTo(1);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.goTo(this._presentation.slideCount);
    } else if (event.key === 'Escape' && this.#pseudoFullscreen) {
      event.preventDefault();
      this.#setPseudoFullscreen(false);
    }
  };

  #onFullscreenChange = () => this.#syncFullscreenState();

  #onAuthChange = event => this.#applyAuthState(Boolean(event.detail?.authenticated));

  #onPageHide = () => this.#flushProgressOnExit();

  #syncFullscreenState(force = false) {
    const active = this.#isFullscreen();
    const changed = active !== this.#fullscreenActive;
    this.#fullscreenActive = active;
    const viewer = this.querySelector('.astor-presentation-viewer');
    const button = this.querySelector('[data-fullscreen-control]');
    if (viewer) viewer.dataset.fullscreen = String(active);
    if (button) {
      button.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
      button.setAttribute('aria-label', active ? 'Exit fullscreen presentation' : 'View presentation fullscreen');
      button.setAttribute('aria-pressed', String(active));
    }
    if (active) this.querySelector('.astor-presentation-viewer')?.focus({ preventScroll: true });
    if (changed || force) this.#announce(active ? 'Fullscreen view opened.' : 'Fullscreen view closed.');
  }

  set presentation(value) {
    this._presentation = this.#validate(value);
    this.#slide = 1;
    this.#requestedSlide = this.#clampSlide(this.#initialSlide);
    this.#state = 'idle';
    this.#access = 'unknown';
    this.#saved = false;
    this.#libraryBusy = false;
    this.#libraryLoaded = false;
    this.#lastRecordedSlide = 0;
    this.#lastRecordedAt = 0;
    this.#hasLoadedSlide = false;
    this.#clearProgressTimer();
    if (this.isConnected) this.render();
  }

  get presentation() {
    return this._presentation;
  }

  set initialSlide(value) {
    const slide = Number(value);
    this.#hasExplicitInitialSlide = Number.isSafeInteger(slide) && slide > 0;
    this.#initialSlide = this.#hasExplicitInitialSlide ? slide : 1;
    if (this._presentation) {
      this.#initialSlide = this.#clampSlide(this.#initialSlide);
      if (this.isConnected) this.goTo(this.#initialSlide, { announce: false });
    }
  }

  get initialSlide() {
    return this.#initialSlide;
  }

  connectedCallback() {
    this.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('fullscreenchange', this.#onFullscreenChange);
    window.addEventListener('astor-auth-changed', this.#onAuthChange);
    window.addEventListener('pagehide', this.#onPageHide);
    if (this._presentation) this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('fullscreenchange', this.#onFullscreenChange);
    window.removeEventListener('astor-auth-changed', this.#onAuthChange);
    window.removeEventListener('pagehide', this.#onPageHide);
    this.#loadController?.abort();
    this.#flushProgressOnExit();
    this.#revokeObjectUrl();
    if (this.#pseudoFullscreen) this.#setPseudoFullscreen(false);
  }

  previous() {
    if (this.#state === 'loading' || this.#slide <= 1) return;
    this.goTo(this.#slide - 1);
  }

  next() {
    if (this.#state === 'loading' || this.#slide >= this._presentation.slideCount) return;
    this.goTo(this.#slide + 1);
  }

  async goTo(number, { announce = true } = {}) {
    if (!this._presentation) return;
    const target = Math.max(1, Math.min(this._presentation.slideCount, Math.trunc(Number(number)) || 1));
    this.#requestedSlide = target;

    if (target > this._presentation.previewSlides && this.#access !== true) {
      const session = await this.#sessionStatus();
      if (target !== this.#requestedSlide) return;
      if (session === false) {
        this.#showGate(target);
        return;
      }
    }

    this.#hideGate();
    await this.#loadSlide(target, { announce });
  }

  async refreshAccess() {
    this.#access = 'unknown';
    if (this.#state === 'locked') await this.goTo(this.#requestedSlide);
  }

  render() {
    const presentation = this._presentation;
    const download = presentation.pdf
      ? `<a class="astor-presentation-viewer__control" href="${this.#escape(presentation.pdf)}" download>Download PDF</a>`
      : '';
    const accountLinks = this.#accountLinks();

    this.innerHTML = `
      <section class="astor-presentation-viewer" data-state="idle" data-fullscreen="false" role="region" aria-roledescription="slide presentation" aria-label="${this.#escape(presentation.title)} presentation viewer" aria-busy="false" tabindex="0">
        <img class="astor-presentation-viewer__backdrop" src="${this.#escape(presentation.backdrop)}" alt="" aria-hidden="true">
        <div class="astor-presentation-viewer__wash" aria-hidden="true"></div>
        <div class="astor-presentation-viewer__topbar">
          <div class="astor-presentation-viewer__heading">
            <p class="astor-presentation-viewer__title">${this.#escape(presentation.title)}</p>
            <p class="astor-presentation-viewer__preview-note">Slides 1&ndash;${presentation.previewSlides} are free to preview</p>
          </div>
          <div class="astor-presentation-viewer__utilities">
            <button class="astor-presentation-viewer__control" type="button" data-save-control aria-pressed="false" hidden>Save</button>
            <a class="astor-presentation-viewer__control" href="/account/" data-account-control hidden>Account</a>
            ${download}
            <button class="astor-presentation-viewer__control" type="button" data-fullscreen-control aria-label="View presentation fullscreen" aria-pressed="false">Fullscreen</button>
          </div>
        </div>
        <div class="astor-presentation-viewer__body">
          <div class="astor-presentation-viewer__frame" data-stage>
            <img class="astor-presentation-viewer__slide" data-slide-image alt="${this.#escape(presentation.title)}, slide 1 of ${presentation.slideCount}" width="2400" height="1350">
            <div class="astor-presentation-viewer__status" data-status role="status" hidden>
              <span class="astor-presentation-viewer__spinner" aria-hidden="true"></span>
              <p data-status-text></p>
              <button class="astor-presentation-viewer__retry" type="button" data-retry hidden>Retry slide</button>
            </div>
            <section class="astor-presentation-viewer__gate" data-gate aria-labelledby="presentation-gate-title" hidden>
              <p class="astor-presentation-viewer__gate-kicker">Free preview complete</p>
              <h2 id="presentation-gate-title">Continue with a free Astor account.</h2>
              <p>You can preview the first ${presentation.previewSlides} slides without signing in. Sign in or create a free account to read the rest of this guide.</p>
              <div class="astor-presentation-viewer__gate-actions">
                <a class="astor-presentation-viewer__gate-primary" href="${this.#escape(accountLinks.signIn)}">Sign in to continue</a>
                <a class="astor-presentation-viewer__gate-secondary" href="${this.#escape(accountLinks.register)}">Create a free account</a>
              </div>
              <button class="astor-presentation-viewer__gate-back" type="button" data-gate-back>Return to the preview</button>
            </section>
          </div>
        </div>
        <div class="astor-presentation-viewer__navigation" aria-label="Slide controls">
          <button class="astor-presentation-viewer__arrow astor-presentation-viewer__arrow--previous" type="button" data-previous aria-label="Previous slide"><span aria-hidden="true">&larr;</span><span>Previous</span></button>
          <p class="astor-presentation-viewer__counter" data-slide-counter aria-label="Current slide">1 / ${presentation.slideCount}</p>
          <button class="astor-presentation-viewer__arrow astor-presentation-viewer__arrow--next" type="button" data-next aria-label="Next slide"><span>Next</span><span aria-hidden="true">&rarr;</span></button>
        </div>
        <p class="astor-presentation-viewer__library-status" data-library-status role="status" aria-live="polite" aria-atomic="true"></p>
        <p class="astor-presentation-viewer__announcer" data-announcer aria-live="polite" aria-atomic="true"></p>
      </section>`;

    this.querySelector('[data-previous]').addEventListener('click', () => this.previous());
    this.querySelector('[data-next]').addEventListener('click', () => this.next());
    this.querySelector('[data-retry]').addEventListener('click', () => this.#loadSlide(this.#requestedSlide));
    this.querySelector('[data-gate-back]').addEventListener('click', async () => {
      const previewSlide = this.#hasLoadedSlide
        ? this.#slide
        : Math.min(presentation.previewSlides, presentation.slideCount);
      this.#requestedSlide = previewSlide;
      this.#hideGate();
      if (this.#hasLoadedSlide) {
        this.#setState('ready');
        this.#announce(`Slide ${this.#slide} of ${presentation.slideCount}.`);
      } else {
        await this.#loadSlide(previewSlide);
      }
      this.querySelector('.astor-presentation-viewer')?.focus({ preventScroll: true });
    });

    const fullscreen = this.querySelector('[data-fullscreen-control]');
    fullscreen.addEventListener('click', () => this.#toggleFullscreen());
    this.querySelector('[data-save-control]').addEventListener('click', () => this.#toggleSaved());

    const stage = this.querySelector('[data-stage]');
    stage.addEventListener('pointerdown', event => this.#startPointer(event));
    stage.addEventListener('pointerup', event => this.#endPointer(event));
    stage.addEventListener('pointercancel', event => this.#cancelPointer(event));

    this.#updateControls();
    this.#updateLibraryControls();
    this.#syncFullscreenState();
    this.goTo(this.#clampSlide(this.#initialSlide), { announce: false });
    queueMicrotask(() => {
      this.#initialiseLibraryControls();
      if (!this.#hasExplicitInitialSlide) this.#resumePendingSlide();
    });
  }

  async #toggleFullscreen() {
    const viewer = this.querySelector('.astor-presentation-viewer');
    const usePseudoFullscreen = () => this.#setPseudoFullscreen(true);
    if (this.#pseudoFullscreen) {
      this.#setPseudoFullscreen(false);
      return;
    }
    try {
      if (this.#isFullscreen()) await document.exitFullscreen();
      else if (typeof viewer?.requestFullscreen === 'function') await viewer.requestFullscreen();
      else usePseudoFullscreen();
    } catch {
      usePseudoFullscreen();
    }
  }

  #setPseudoFullscreen(active) {
    this.#pseudoFullscreen = active;
    const viewer = this.querySelector('.astor-presentation-viewer');
    viewer?.classList.toggle('is-pseudo-fullscreen', active);
    document.body.classList.toggle('is-presentation-fullscreen', active);
    this.#syncFullscreenState();
  }

  async #loadSlide(number, { announce = true } = {}) {
    const image = this.querySelector('[data-slide-image]');
    if (!image) return;

    this.#loadController?.abort();
    const controller = new AbortController();
    this.#loadController = controller;
    const request = ++this.#loadRequest;
    this.#requestedSlide = number;
    this.#setState('loading', `Loading slide ${number} of ${this._presentation.slideCount}&hellip;`);
    if (announce) this.#announce(`Loading slide ${number} of ${this._presentation.slideCount}.`);

    try {
      const response = await fetch(this.#slideUrl(number), {
        signal: controller.signal,
        credentials: 'same-origin',
        headers: { Accept: 'image/png,image/*;q=0.8' }
      });
      if (request !== this.#loadRequest) return;

      if (response.status === 401) {
        this.#applyAuthState(false);
        this.#showGate(number);
        return;
      }
      if (!response.ok) throw new Error(`Slide request failed with ${response.status}.`);

      const blob = await response.blob();
      if (request !== this.#loadRequest) return;
      const objectUrl = URL.createObjectURL(blob);
      const probe = new Image();
      probe.src = objectUrl;
      try {
        await probe.decode();
      } catch {
        URL.revokeObjectURL(objectUrl);
        throw new Error('The slide image could not be decoded.');
      }
      if (request !== this.#loadRequest) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      this.#revokeObjectUrl();
      this.#objectUrl = objectUrl;
      image.src = objectUrl;
      image.alt = `${this._presentation.title}, slide ${number} of ${this._presentation.slideCount}`;
      this.#slide = number;
      this.#hasLoadedSlide = true;
      if (number > this._presentation.previewSlides) this.#applyAuthState(true);
      this.querySelector('[data-slide-counter]').textContent = `${number} / ${this._presentation.slideCount}`;
      this.#clearPendingSlide(number);
      this.#setState('ready');
      this.#updateControls();
      this.#announce(`Slide ${number} of ${this._presentation.slideCount}.${number === this._presentation.previewSlides && this.#access !== true ? ' This is the final free preview slide.' : ''}`);
      this.#recordViewedSlide(number);
      this.#prefetchPreviewNeighbour(number + 1);
    } catch (error) {
      if (error?.name === 'AbortError' || request !== this.#loadRequest) return;
      this.#setState('error', `Slide ${number} could not be loaded.`);
      this.#announce(`Slide ${number} could not be loaded. Use the retry button to try again.`);
    }
  }

  #prefetchPreviewNeighbour(number) {
    if (number < 1 || number > this._presentation.previewSlides || number > this._presentation.slideCount) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = this.#slideUrl(number);
    document.head.append(link);
    link.addEventListener('load', () => link.remove(), { once: true });
    link.addEventListener('error', () => link.remove(), { once: true });
  }

  async #sessionStatus() {
    if (this.#access === true || this.#access === false) return this.#access;
    if (typeof window.AstorAuth?.session !== 'function') return null;

    try {
      const result = await window.AstorAuth.session();
      const authenticated = Boolean(
        result === true ||
        result?.authenticated ||
        result?.user ||
        result?.session?.user ||
        result?.data?.session?.user
      );
      this.#applyAuthState(authenticated);
      return authenticated;
    } catch {
      return null;
    }
  }

  async #initialiseLibraryControls() {
    if (typeof window.AstorAuth?.session !== 'function') return;
    try {
      const session = await window.AstorAuth.session();
      this.#applyAuthState(Boolean(session?.authenticated));
    } catch {
      this.#updateLibraryControls();
    }
  }

  #applyAuthState(authenticated) {
    const wasAuthenticated = this.#access === true;
    this.#access = Boolean(authenticated);
    if (!this.#access) {
      this.#saved = false;
      this.#libraryLoaded = false;
      this.#lastRecordedSlide = 0;
      this.#clearProgressTimer();
      this.#setLibraryStatus('');
      this.#updateLibraryControls();
      return;
    }

    this.#updateLibraryControls();
    this.#loadLibraryState();
    if (this.#hasLoadedSlide) this.#recordViewedSlide(this.#slide, { immediate: !wasAuthenticated });
    if (!wasAuthenticated && this.#state === 'locked') this.goTo(this.#requestedSlide);
  }

  async #loadLibraryState() {
    if (this.#libraryLoaded || this.#access !== true || typeof window.AstorAuth?.library !== 'function') return;
    this.#libraryLoaded = true;
    this.#libraryBusy = true;
    this.#updateLibraryControls();
    try {
      const result = await window.AstorAuth.library();
      const returned = savedState(result, this._presentation.slug);
      if (typeof returned === 'boolean') this.#saved = returned;
    } catch {
      this.#setLibraryStatus('Your saved state could not be checked. The save control is still available.');
    } finally {
      this.#libraryBusy = false;
      this.#updateLibraryControls();
    }
  }

  async #toggleSaved() {
    if (this.#access !== true || this.#libraryBusy || typeof window.AstorAuth?.resourceAction !== 'function') return;
    const nextSaved = !this.#saved;
    this.#libraryBusy = true;
    this.#updateLibraryControls();
    this.#setLibraryStatus(nextSaved ? 'Saving this guide…' : 'Removing this guide from saved resources…');
    try {
      const result = await window.AstorAuth.resourceAction(
        nextSaved ? 'save' : 'unsave',
        this._presentation.slug
      );
      const returned = savedState(result, this._presentation.slug);
      this.#saved = typeof returned === 'boolean' ? returned : nextSaved;
      this.#setLibraryStatus(this.#saved ? 'Guide saved to your account.' : 'Guide removed from your saved resources.');
    } catch {
      this.#setLibraryStatus('That change could not be saved. Please try again.');
    } finally {
      this.#libraryBusy = false;
      this.#updateLibraryControls();
    }
  }

  #updateLibraryControls() {
    const authenticated = this.#access === true;
    const save = this.querySelector('[data-save-control]');
    const account = this.querySelector('[data-account-control]');
    const accessNote = this.querySelector('.astor-presentation-viewer__preview-note');
    const describedBy = this.getAttribute('aria-describedby');
    const description = describedBy ? document.getElementById(describedBy) : null;
    if (accessNote) {
      accessNote.textContent = authenticated
        ? `Signed in · all ${this._presentation.slideCount} slides available`
        : `Slides 1–${this._presentation.previewSlides} are free to preview`;
    }
    if (description) {
      description.textContent = authenticated
        ? `You are signed in. All ${this._presentation.slideCount} slides are available, and your latest place can be saved to your private resource shelf.`
        : `Preview the first ${this._presentation.previewSlides} slides, then sign in or create a free account to continue through all ${this._presentation.slideCount} slides.`;
    }
    if (save) {
      save.hidden = !authenticated;
      save.disabled = this.#libraryBusy;
      save.setAttribute('aria-busy', String(this.#libraryBusy));
      save.textContent = this.#saved ? 'Saved' : 'Save';
      save.setAttribute('aria-pressed', String(this.#saved));
      save.setAttribute('aria-label', this.#saved ? 'Remove this guide from saved resources' : 'Save this guide to your account');
      save.classList.toggle('is-saved', this.#saved);
    }
    if (account) account.hidden = !authenticated;
  }

  #setLibraryStatus(message) {
    const status = this.querySelector('[data-library-status]');
    if (status) status.textContent = message;
  }

  #recordViewedSlide(number, { immediate = false } = {}) {
    if (!this.#hasLoadedSlide || this.#access !== true || typeof window.AstorAuth?.resourceAction !== 'function') return;
    const slide = this.#clampSlide(number);
    if (slide === this.#lastRecordedSlide && !this.#pendingProgressSlide) return;
    this.#pendingProgressSlide = slide;

    const elapsed = Date.now() - this.#lastRecordedAt;
    const delay = immediate ? 0 : Math.max(0, 5000 - elapsed);
    if (delay === 0) {
      this.#sendProgress();
      return;
    }
    if (this.#progressTimer) return;
    this.#progressTimer = window.setTimeout(() => this.#sendProgress(), delay);
  }

  async #sendProgress() {
    if (this.#progressTimer) window.clearTimeout(this.#progressTimer);
    this.#progressTimer = null;
    if (this.#access !== true || !this.#pendingProgressSlide) return;
    const slide = this.#pendingProgressSlide;
    this.#pendingProgressSlide = 0;
    if (slide === this.#lastRecordedSlide) return;
    this.#lastRecordedSlide = slide;
    this.#lastRecordedAt = Date.now();
    try {
      const result = await window.AstorAuth.resourceAction('view', this._presentation.slug, slide);
      const returned = savedState(result, this._presentation.slug);
      if (typeof returned === 'boolean') {
        this.#saved = returned;
        this.#updateLibraryControls();
      }
    } catch {
      // Reading remains uninterrupted when progress synchronisation is unavailable.
    }
  }

  #flushProgressOnExit() {
    if (this.#progressTimer) window.clearTimeout(this.#progressTimer);
    this.#progressTimer = null;
    if (this.#access !== true || !this.#pendingProgressSlide || !this._presentation) return;
    const slide = this.#pendingProgressSlide;
    this.#pendingProgressSlide = 0;
    if (slide === this.#lastRecordedSlide) return;
    this.#lastRecordedSlide = slide;
    try {
      fetch('/api/account/resource', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view', resourceId: this._presentation.slug, lastSlide: slide })
      }).catch(() => {});
    } catch {
      // Navigation must never be blocked by progress synchronisation.
    }
  }

  #clearProgressTimer() {
    if (this.#progressTimer) window.clearTimeout(this.#progressTimer);
    this.#progressTimer = null;
    this.#pendingProgressSlide = 0;
  }

  #showGate(number) {
    this.#requestedSlide = number;
    this.#rememberPendingSlide(number);
    this.#setState('locked');
    const gate = this.querySelector('[data-gate]');
    if (gate) gate.hidden = false;
    this.#updateControls();
    this.#announce(`The free preview ends after slide ${this._presentation.previewSlides}. Sign in or create a free account to continue to slide ${number}.`);
    gate?.querySelector('a')?.focus({ preventScroll: true });
  }

  #hideGate() {
    const gate = this.querySelector('[data-gate]');
    if (gate) gate.hidden = true;
  }

  #setState(state, message = '') {
    this.#state = state;
    const viewer = this.querySelector('.astor-presentation-viewer');
    const status = this.querySelector('[data-status]');
    const statusText = this.querySelector('[data-status-text]');
    const retry = this.querySelector('[data-retry]');
    if (viewer) {
      viewer.dataset.state = state;
      viewer.setAttribute('aria-busy', String(state === 'loading'));
    }
    if (status) status.hidden = state !== 'loading' && state !== 'error';
    if (statusText) statusText.innerHTML = message;
    if (retry) retry.hidden = state !== 'error';
    this.#updateControls();
  }

  #updateControls() {
    const busy = this.#state === 'loading';
    const previous = this.querySelector('[data-previous]');
    const next = this.querySelector('[data-next]');
    if (previous) {
      previous.disabled = busy || this.#slide <= 1;
      previous.setAttribute('aria-label', this.#slide <= 1 ? 'Previous slide, unavailable on the first slide' : `Previous slide, slide ${this.#slide - 1}`);
    }
    if (next) {
      next.disabled = busy || this.#slide >= this._presentation.slideCount;
      next.setAttribute('aria-label', this.#slide >= this._presentation.slideCount ? 'Next slide, unavailable on the final slide' : `Next slide, slide ${this.#slide + 1}`);
    }
  }

  #startPointer(event) {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('a,button')) return;
    this.#pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  #endPointer(event) {
    if (!this.#pointer || this.#pointer.id !== event.pointerId) return;
    const distanceX = event.clientX - this.#pointer.x;
    const distanceY = event.clientY - this.#pointer.y;
    this.#cancelPointer(event);
    if (Math.abs(distanceX) < 48 || Math.abs(distanceX) < Math.abs(distanceY) * 1.2) return;
    distanceX > 0 ? this.previous() : this.next();
  }

  #cancelPointer(event) {
    if (this.#pointer?.id === event.pointerId) {
      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // The pointer may already have been released by the browser.
      }
      this.#pointer = null;
    }
  }

  #accountLinks() {
    const next = `${location.pathname}${location.search}${location.hash}`;
    const encoded = encodeURIComponent(next);
    return {
      signIn: `/account/?mode=signin&next=${encoded}`,
      register: `/account/?mode=register&next=${encoded}`
    };
  }

  #pendingKey() {
    return `astor-presentation-pending:${this._presentation.slug}`;
  }

  #rememberPendingSlide(number) {
    try {
      sessionStorage.setItem(this.#pendingKey(), String(number));
    } catch {
      // The account flow still returns to the current guide when storage is unavailable.
    }
  }

  #clearPendingSlide(number) {
    if (number <= this._presentation.previewSlides) return;
    try {
      sessionStorage.removeItem(this.#pendingKey());
    } catch {
      // Ignore storage restrictions after successful access.
    }
  }

  async #resumePendingSlide() {
    let pending = 0;
    try {
      pending = Number(sessionStorage.getItem(this.#pendingKey()));
    } catch {
      return;
    }
    if (Number.isSafeInteger(pending) && pending > this._presentation.previewSlides && pending <= this._presentation.slideCount) {
      await this.goTo(pending);
    }
  }

  #slideUrl(number) {
    return `/api/presentations/${encodeURIComponent(this._presentation.slug)}/${number}.png`;
  }

  #isFullscreen() {
    return this.#pseudoFullscreen || document.fullscreenElement === this.querySelector('.astor-presentation-viewer');
  }

  #revokeObjectUrl() {
    if (!this.#objectUrl) return;
    URL.revokeObjectURL(this.#objectUrl);
    this.#objectUrl = '';
  }

  #announce(message) {
    const announcer = this.querySelector('[data-announcer]');
    if (announcer && message) announcer.textContent = message;
  }

  #validate(value) {
    const required = ['slug', 'title', 'backdrop', 'slideCount'];
    if (!value || required.some(key => !value[key])) {
      throw new Error(`Presentation metadata requires: ${required.join(', ')}.`);
    }
    const slideCount = Number(value.slideCount);
    const previewSlides = Math.min(slideCount, Math.max(1, Number(value.previewSlides) || 3));
    if (!Number.isSafeInteger(slideCount) || slideCount < 1) throw new Error('Presentation slideCount must be a positive integer.');
    return { ...value, slideCount, previewSlides };
  }

  #clampSlide(value) {
    const slide = Number(value);
    return Math.max(1, Math.min(this._presentation.slideCount, Number.isSafeInteger(slide) ? slide : 1));
  }

  #isTyping(target) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;
  }

  #escape(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }
}

if (!customElements.get('astor-presentation-viewer')) {
  customElements.define('astor-presentation-viewer', AstorPresentationViewer);
}
