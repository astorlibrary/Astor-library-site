export class AstorPresentationViewer extends HTMLElement {
  #slide = 1;
  #pointerStartX = null;
  #loadRequest = 0;
  #onKeyDown = (event) => {
    if (event.defaultPrevented || this.#isTyping(event.target)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  };

  set presentation(value) {
    this._presentation = this.#validate(value);
    this.#slide = 1;
    if (this.isConnected) this.render();
  }

  connectedCallback() {
    if (this._presentation) this.render();
    document.addEventListener('keydown', this.#onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#onKeyDown);
  }

  previous() { this.goTo(this.#slide - 1); }
  next() { this.goTo(this.#slide + 1); }

  goTo(number) {
    const total = this._presentation.slideCount;
    this.#slide = ((number - 1 + total) % total) + 1;
    const slide = this.querySelector('[data-slide-image]');
    if (!slide) return;
    this.#loadSlide(this.#slide, slide);
    slide.alt = `${this._presentation.title}, slide ${this.#slide} of ${total}`;
    this.querySelector('[data-slide-counter]').textContent = `${this.#slide} / ${total}`;
    this.querySelector('[data-announcer]').textContent = `Slide ${this.#slide} of ${total}`;
    this.#preloadNeighbours();
  }

  render() {
    const presentation = this._presentation;
    const download = presentation.pdf
      ? `<a class="astor-presentation-viewer__control" href="${this.#escape(presentation.pdf)}" download>Download PDF</a>`
      : '';

    this.innerHTML = `
      <section class="astor-presentation-viewer" aria-label="${this.#escape(presentation.title)} presentation viewer">
        <img class="astor-presentation-viewer__backdrop" src="${this.#escape(presentation.backdrop)}" alt="" aria-hidden="true">
        <div class="astor-presentation-viewer__wash" aria-hidden="true"></div>
        <div class="astor-presentation-viewer__topbar">
          <p class="astor-presentation-viewer__title">${this.#escape(presentation.title)}</p>
          <div class="astor-presentation-viewer__utilities">
            ${download}
            <button class="astor-presentation-viewer__control" type="button" data-fullscreen aria-label="View fullscreen">Fullscreen</button>
          </div>
        </div>
        <div class="astor-presentation-viewer__frame" data-stage>
          <img class="astor-presentation-viewer__slide" data-slide-image alt="${this.#escape(presentation.title)}, slide 1 of ${presentation.slideCount}">
        </div>
        <button class="astor-presentation-viewer__arrow astor-presentation-viewer__arrow--previous" type="button" data-previous aria-label="Previous slide">‹</button>
        <button class="astor-presentation-viewer__arrow astor-presentation-viewer__arrow--next" type="button" data-next aria-label="Next slide">›</button>
        <p class="astor-presentation-viewer__counter" data-slide-counter>1 / ${presentation.slideCount}</p>
        <p class="astor-presentation-viewer__announcer" data-announcer aria-live="polite"></p>
      </section>`;

    this.querySelector('[data-previous]').addEventListener('click', () => this.previous());
    this.querySelector('[data-next]').addEventListener('click', () => this.next());
    this.querySelector('[data-fullscreen]').addEventListener('click', () => this.#toggleFullscreen());
    const slide = this.querySelector('[data-slide-image]');
    slide.addEventListener('load', event => event.currentTarget.classList.remove('is-changing'));
    this.#loadSlide(this.#slide, slide);

    const stage = this.querySelector('[data-stage]');
    stage.addEventListener('pointerdown', event => { this.#pointerStartX = event.clientX; });
    stage.addEventListener('pointerup', event => {
      if (this.#pointerStartX === null) return;
      const distance = event.clientX - this.#pointerStartX;
      this.#pointerStartX = null;
      if (Math.abs(distance) < 42) return;
      distance > 0 ? this.previous() : this.next();
    });
    stage.addEventListener('pointercancel', () => { this.#pointerStartX = null; });
    this.#preloadNeighbours();
  }

  async #toggleFullscreen() {
    const viewer = this.querySelector('.astor-presentation-viewer');
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (viewer?.requestFullscreen) await viewer.requestFullscreen();
  }

  #preloadNeighbours() {
    // Slide files are loaded on demand so a missing direct asset never flashes
    // as a broken image while the viewer retrieves its delivery parts.
  }

  async #loadSlide(number, image) {
    const url = this.#slideUrl(number);
    const request = ++this.#loadRequest;
    image.classList.add('is-changing');
    const direct = await fetch(url, { method: 'HEAD' });
    if (request !== this.#loadRequest) return;
    if (direct.ok) {
      image.src = url;
      return;
    }

    const parts = [];
    for (let index = 1; ; index += 1) {
      const response = await fetch(`${url}.part-${String(index).padStart(3, '0')}`);
      if (!response.ok) break;
      parts.push(await response.blob());
    }
    if (request !== this.#loadRequest || !parts.length) return;
    image.src = URL.createObjectURL(new Blob(parts, { type: 'image/png' }));
  }

  #slideUrl(number) { return `${this._presentation.folder}${number}.png`; }

  #validate(value) {
    const required = ['title', 'folder', 'backdrop', 'slideCount'];
    if (!value || required.some(key => !value[key])) {
      throw new Error(`Presentation metadata requires: ${required.join(', ')}.`);
    }
    return { ...value, slideCount: Number(value.slideCount) };
  }

  #isTyping(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  }

  #escape(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }
}

customElements.define('astor-presentation-viewer', AstorPresentationViewer);
