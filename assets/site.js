(() => {
  function normalisePath(value) {
    return value.replace(/\/+$/, '') || '/';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // The study material that used to sit in tabs on a book page is now its
  // study guide. Old links into it (/books/macbeth/#astor-quote-…) go there.
  (() => {
    const main = document.querySelector('main[data-guide]');
    const id = window.location.hash.slice(1);
    if (!main || !window.location.pathname.startsWith('/books/') || !/^astor-/.test(id)) return;
    const sections = [
      [/^astor-(quote-|quotations$)/, 'quotations'], [/^astor-character/, 'characters'],
      [/^astor-theme/, 'themes'], [/^astor-technique/, 'form-and-language'],
      [/^astor-context$/, 'context'], [/^astor-plot$/, 'what-happens']
    ];
    const match = sections.find(([pattern]) => pattern.test(id));
    const anchor = match && /^astor-(quote|character|theme|technique)-/.test(id) ? '#' + id : '';
    window.location.replace('/guides/' + main.dataset.guide + '/' + (match ? match[1] + '/' : '') + anchor);
  })();

  for (const image of document.querySelectorAll('.prod-card img')) {
    const markBroken = () => {
      image.classList.add('is-broken');
      image.closest('figure')?.classList.add('image-failed');
    };
    image.addEventListener('error', markBroken, { once: true });
    if (image.complete && image.naturalWidth === 0) markBroken();
  }

  const siteHeader = document.querySelector('.site-header');
  const siteNavigation = siteHeader?.querySelector('.nav');

  if (siteHeader && siteNavigation) {
    siteNavigation.id = siteNavigation.id || 'site-navigation';
    const menus = [...siteNavigation.querySelectorAll('.astor-browse-menu')];
    let toggle = siteHeader.querySelector('.site-nav-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'site-nav-toggle';
      toggle.type = 'button';
      toggle.innerHTML = '<span>Menu</span><span class="site-nav-mark" aria-hidden="true"></span>';
      const identity = siteHeader.querySelector('.astor-header-identity');
      if (identity) identity.append(toggle);
      else siteHeader.insertBefore(toggle, siteNavigation);
    }
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', siteNavigation.id);
    toggle.setAttribute('aria-label', 'Open navigation menu');
    siteHeader.classList.add('site-nav-ready');

    const toggleText = toggle.querySelector('span:first-child');
    const setHeaderHeight = () => {
      document.documentElement.style.setProperty('--astor-header-height', `${siteHeader.getBoundingClientRect().height}px`);
    };
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(setHeaderHeight).observe(siteHeader);

    // Books, Study and Explore are <details> menus; only one is open at a time.
    for (const menu of menus) {
      const summary = menu.querySelector('summary');
      const setState = () => summary?.setAttribute('aria-expanded', String(menu.open));
      setState();
      menu.addEventListener('toggle', () => {
        setState();
        if (menu.open) for (const other of menus) if (other !== menu && other.open) other.open = false;
      });
      summary?.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        const links = [...menu.querySelectorAll('.astor-browse-panel a[href]')];
        if (!links.length) return;
        event.preventDefault();
        menu.open = true;
        window.requestAnimationFrame(() => (event.key === 'ArrowDown' ? links[0] : links[links.length - 1]).focus());
      });
    }

    const closeBrowseMenu = returnFocus => {
      const open = menus.find(menu => menu.open);
      if (!open) return false;
      open.open = false;
      if (returnFocus) open.querySelector('summary')?.focus();
      return true;
    };

    const closeSiteMenu = returnFocus => {
      siteHeader.classList.remove('is-site-menu-open');
      document.body.classList.remove('is-site-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      if (toggleText) toggleText.textContent = 'Menu';
      closeBrowseMenu(false);
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => {
      const open = siteHeader.classList.toggle('is-site-menu-open');
      document.body.classList.toggle('is-site-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (toggleText) toggleText.textContent = open ? 'Close' : 'Menu';
      if (!open) closeBrowseMenu(false);
    });

    document.addEventListener('click', event => {
      for (const menu of menus) if (menu.open && !menu.contains(event.target)) menu.open = false;
      if (siteHeader.classList.contains('is-site-menu-open') && !siteHeader.contains(event.target)) {
        closeSiteMenu(false);
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (closeBrowseMenu(true)) {
          event.preventDefault();
          return;
        }
        if (siteHeader.classList.contains('is-site-menu-open')) {
          event.preventDefault();
          closeSiteMenu(true);
          return;
        }
      }
      if (event.key === 'Tab' && siteHeader.classList.contains('is-site-menu-open')) {
        const focusable = [...siteHeader.querySelectorAll('a[href], button:not([disabled]), summary')]
          .filter(element => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    for (const link of siteNavigation.querySelectorAll('a')) {
      link.addEventListener('click', () => closeSiteMenu(false));
    }

    const desktopNavigation = window.matchMedia?.('(min-width: 1041px)');
    desktopNavigation?.addEventListener('change', event => {
      if (event.matches) closeSiteMenu(false);
    });
  }

  const editionNotes = document.querySelector('[data-edition-notes]');

  if (editionNotes) {
    const noteButtons = [...editionNotes.querySelectorAll('[data-edition-note]')];
    const notePanels = [...editionNotes.querySelectorAll('[data-edition-panel]')];

    const showEditionNote = key => {
      noteButtons.forEach(button => {
        const active = button.dataset.editionNote === key;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      notePanels.forEach(panel => {
        panel.hidden = panel.dataset.editionPanel !== key;
      });
    };

    noteButtons.forEach((button, index) => {
      button.addEventListener('click', () => showEditionNote(button.dataset.editionNote));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const change = event.key === 'ArrowRight' ? 1 : -1;
        const next = noteButtons[(index + change + noteButtons.length) % noteButtons.length];
        showEditionNote(next.dataset.editionNote);
        next.focus();
      });
    });
    if (noteButtons[0]) showEditionNote(noteButtons[0].dataset.editionNote);
  }

  const homePassageStage = document.querySelector('[data-home-passage-stage]');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (homePassageStage) {
    const passagePages = [...homePassageStage.querySelectorAll('[data-home-passage]')];
    const passageButtons = [...homePassageStage.querySelectorAll('[data-home-passage-target]')];
    let passageIndex = Math.max(0, passagePages.findIndex(page => page.classList.contains('is-active')));
    let passageTimer = 0;

    const showHomePassage = (index, stopRotation = false) => {
      passageIndex = (index + passagePages.length) % passagePages.length;
      passagePages.forEach((page, pageIndex) => {
        const active = pageIndex === passageIndex;
        page.hidden = !active;
        page.classList.toggle('is-active', active);
      });
      passageButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === passageIndex;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (stopRotation && passageTimer) {
        window.clearInterval(passageTimer);
        passageTimer = 0;
      }
    };

    passageButtons.forEach((button, index) => {
      button.addEventListener('click', () => showHomePassage(index, true));
    });

    showHomePassage(passageIndex);
    if (!reducedMotion && passagePages.length > 1) {
      passageTimer = window.setInterval(() => showHomePassage(passageIndex + 1), 6500);
    }
  }

  const passageSpread = document.querySelector('.passage-spread');

  if (passageSpread) {
    const marks = [...passageSpread.querySelectorAll('[data-passage-mark]')];
    const notes = [...passageSpread.querySelectorAll('[data-passage-note]')];

    const showPassageNote = key => {
      marks.forEach(mark => mark.classList.toggle('is-active', mark.dataset.passageMark === key));
      notes.forEach(note => note.classList.toggle('is-active', note.dataset.passageNote === key));
    };

    marks.forEach(mark => {
      const activate = () => showPassageNote(mark.dataset.passageMark);
      mark.setAttribute('role', 'button');
      mark.setAttribute('aria-label', 'Open note ' + (mark.querySelector('sup')?.textContent || '') + ' for ' + mark.childNodes[0]?.textContent.trim());
      mark.addEventListener('click', activate);
      mark.addEventListener('focus', activate);
      mark.addEventListener('mouseenter', activate);
      mark.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });
    notes.forEach(note => {
      note.addEventListener('mouseenter', () => showPassageNote(note.dataset.passageNote));
    });
    if (marks[0]) showPassageNote(marks[0].dataset.passageMark);
  }

  const motionStage = document.querySelector('[data-motion-stage]');

  if (motionStage && !reducedMotion) {
    motionStage.classList.add('is-motion-ready');

    if (window.matchMedia?.('(pointer: fine)').matches) {
      const covers = [...motionStage.querySelectorAll('[data-motion-cover]')];
      let frame = 0;
      let point = { x: 0, y: 0 };

      const draw = () => {
        frame = 0;
        const movements = [
          { x: point.x * -4, y: point.y * -3 },
          { x: point.x * 4, y: point.y * -3 },
          { x: point.x * 8, y: point.y * 5 }
        ];
        covers.forEach((cover, index) => {
          cover.style.setProperty('--motion-x', movements[index].x.toFixed(2) + 'px');
          cover.style.setProperty('--motion-y', movements[index].y.toFixed(2) + 'px');
        });
        motionStage.style.setProperty('--glow-x', (50 + point.x * 12).toFixed(2) + '%');
      };

      const queue = () => {
        if (!frame) frame = window.requestAnimationFrame(draw);
      };

      motionStage.addEventListener('pointermove', event => {
        const bounds = motionStage.getBoundingClientRect();
        point = {
          x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2)),
          y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2))
        };
        queue();
      });

      motionStage.addEventListener('pointerleave', () => {
        point = { x: 0, y: 0 };
        queue();
      });

      document.addEventListener('pointermove', event => {
        if (!motionStage.contains(event.target) && (point.x || point.y)) {
          point = { x: 0, y: 0 };
          queue();
        }
      }, { passive: true });
    }
  }

  const referenceReel = document.querySelector('[data-reference-reel]');

  if (referenceReel && !reducedMotion) {
    const frames = [...referenceReel.querySelectorAll('[data-reference-frame]')];
    let reelFrame = 0;

    const drawReferenceReel = () => {
      reelFrame = 0;
      const bounds = referenceReel.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1,
        (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)
      ));
      const position = progress * (frames.length - 1);
      const first = Math.floor(position);
      const blend = position - first;

      frames.forEach((frame, index) => {
        let opacity = 0;
        if (index === first) opacity = 1 - blend;
        if (index === first + 1) opacity = blend;
        frame.style.opacity = opacity.toFixed(3);
        const image = frame.querySelector('img');
        if (image) {
          const direction = index % 2 ? 1 : -1;
          image.style.setProperty('--frame-y', ((progress - .5) * 22 * direction).toFixed(2) + 'px');
          image.style.setProperty('--frame-scale', (1.1 - progress * .025).toFixed(3));
        }
      });
    };

    const queueReferenceReel = () => {
      if (!reelFrame) reelFrame = window.requestAnimationFrame(drawReferenceReel);
    };

    window.addEventListener('scroll', queueReferenceReel, { passive: true });
    window.addEventListener('resize', queueReferenceReel);
    drawReferenceReel();
  }

  const currentPath = normalisePath(window.location.pathname);
  for (const link of document.querySelectorAll('.nav-link, .browse-card')) {
    const linkPath = normalisePath(new URL(link.href, window.location.href).pathname);
    if (linkPath === currentPath) link.setAttribute('aria-current', 'page');
  }

  passageHubFilter();
  markUnavailableFormats();

  // A link to a section of a book page lands on it once the page has loaded.
  function scrollToCurrentSection() {
    if (!window.location.hash) return;
    try {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (!target) return;
      const scroll = () => target.scrollIntoView();
      if (document.readyState === 'complete') scroll();
      else window.addEventListener('load', scroll, { once: true });
    } catch {
      // Ignore malformed fragments; the page itself remains fully usable.
    }
  }

  // Some formats are not sold in some Amazon stores (scripts/book-formats.json
  // lists them). Ask which store this visitor's links go to and, if it is one
  // of those, grey the button out; the note beside it says why.
  function markUnavailableFormats() {
    const items = document.querySelectorAll('.astor-buy-item[data-unavailable-in]');
    if (!items.length || !window.fetch) return;
    const stores = { GB: 'Amazon UK', US: 'Amazon US', CA: 'Amazon Canada', AU: 'Amazon Australia' };
    fetch('/api/store-country', { headers: { Accept: 'application/json' } })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        const country = data && data.country;
        if (!country) return;
        for (const item of items) {
          const button = item.querySelector('a.astor-buy-button');
          if (!button || !item.dataset.unavailableIn.split(' ').includes(country)) continue;
          const off = document.createElement('span');
          off.className = 'astor-buy-button is-unavailable';
          off.textContent = 'Not on ' + (stores[country] || 'Amazon here');
          button.replaceWith(off);
          item.classList.add('is-unavailable');
        }
      })
      .catch(() => {});
  }

  function passageHubFilter() {
    const library = document.querySelector('.passage-library');
    const nav = library && library.querySelector('.passage-hub-nav');
    if (!library || !nav) return;
    const cards = [...library.querySelectorAll('.passage-card')];
    if (cards.length < 12) return;
    const rooms = [...library.querySelectorAll('.passage-room')];
    const navLinks = [...nav.querySelectorAll('a')];
    const total = cards.length;

    const wrap = document.createElement('div');
    wrap.className = 'passage-filter';
    wrap.innerHTML =
      '<label for="passage-filter-input">Filter readings</label>' +
      '<input type="search" id="passage-filter-input" autocomplete="off" placeholder="Search by work, quotation or theme…">' +
      '<p class="passage-filter-count" role="status" aria-live="polite" hidden></p>';
    nav.insertAdjacentElement('afterend', wrap);
    const input = wrap.querySelector('input');
    const count = wrap.querySelector('.passage-filter-count');

    function roomCount(key) {
      const room = document.getElementById(key);
      return room ? room.querySelectorAll('.passage-card:not([hidden])').length : 0;
    }
    function apply() {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      for (const card of cards) {
        const hay = (card.getAttribute('data-search') || '') + ' ' + card.textContent.toLowerCase();
        const match = !q || hay.indexOf(q) !== -1;
        card.hidden = !match;
        if (match) shown++;
      }
      for (const room of rooms) room.hidden = room.querySelectorAll('.passage-card:not([hidden])').length === 0;
      for (const link of navLinks) {
        const key = (link.getAttribute('href') || '').replace('#', '');
        const room = document.getElementById(key);
        if (!room) continue;
        const visible = q ? roomCount(key) : room.querySelectorAll('.passage-card').length;
        link.hidden = Boolean(q) && visible === 0;
        const small = link.querySelector('small');
        if (small) small.textContent = visible;
      }
      if (q) {
        count.hidden = false;
        count.textContent = shown
          ? 'Showing ' + shown + ' of ' + total + ' readings'
          : 'No readings match “' + input.value.trim() + '”';
      } else {
        count.hidden = true;
      }
    }
    input.addEventListener('input', apply);
  }

  if (currentPath.startsWith('/books/') || currentPath.startsWith('/study/')) scrollToCurrentSection();
})();

// Light / dark theme. A small script at the top of every page has already set
// data-theme on <html> from the saved choice, or from the system setting, so
// the page paints in the right colours. This wires up the toggle, saves an
// explicit choice, and follows the system setting until there is one.
(() => {
  const root = document.documentElement;
  const KEY = 'astor-theme';
  const toggles = [...document.querySelectorAll('[data-theme-toggle]')];
  // The page's stylesheets could not do themes (see the guard in <head>): stay light.
  if (!root.getAttribute('data-theme')) {
    for (const toggle of toggles) toggle.hidden = true;
    return;
  }
  const dark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    try {
      const value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1b1714' : '#fffaf4');
    for (const toggle of toggles) toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  const current = () => (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  apply(saved() || current());

  for (const toggle of toggles) {
    toggle.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (error) {
        // Private browsing: the choice lasts for this page only.
      }
    });
  }

  // No explicit choice yet: follow the system as it changes.
  if (dark && dark.addEventListener) {
    dark.addEventListener('change', event => {
      if (!saved()) apply(event.matches ? 'dark' : 'light');
    });
  }

  // A choice made in another tab applies here too.
  window.addEventListener('storage', event => {
    if (event.key === KEY && (event.newValue === 'light' || event.newValue === 'dark')) apply(event.newValue);
  });
})();
