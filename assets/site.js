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
    const browseMenu = siteNavigation.querySelector('.astor-browse-menu');
    const browseSummary = browseMenu?.querySelector('summary');
    const browsePanel = browseMenu?.querySelector('.astor-browse-panel');
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

    const setBrowseState = () => {
      if (!browseMenu || !browseSummary) return;
      browseSummary.setAttribute('aria-expanded', String(browseMenu.open));
    };
    setBrowseState();
    browseMenu?.addEventListener('toggle', setBrowseState);

    browseSummary?.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const links = [...(browsePanel?.querySelectorAll('a[href]') || [])];
      if (!links.length) return;
      event.preventDefault();
      browseMenu.open = true;
      setBrowseState();
      window.requestAnimationFrame(() => (event.key === 'ArrowDown' ? links[0] : links[links.length - 1]).focus());
    });

    const closeBrowseMenu = returnFocus => {
      if (!browseMenu?.open) return false;
      browseMenu.open = false;
      setBrowseState();
      if (returnFocus) browseSummary?.focus();
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
      if (browseMenu?.open && !browseMenu.contains(event.target)) closeBrowseMenu(false);
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

  if (!currentPath.startsWith('/books/')) return;

  const main = document.querySelector('main.page-wrap');
  if (!main) return;

  function addPageContents() {
    const headings = [...main.querySelectorAll('.section-title h2')];
    if (headings.length < 3) return null;

    const usedIds = new Set();
    const links = headings.map((heading, index) => {
      let base = heading.textContent
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'section-' + (index + 1);
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) id = base + '-' + suffix++;
      usedIds.add(id);
      heading.closest('.section-title').id = id;
      return '<a href="#' + id + '">' + escapeHtml(heading.textContent) + '</a>';
    });

    const contents = document.createElement('nav');
    contents.className = 'page-contents';
    contents.setAttribute('aria-label', 'On this page');
    contents.innerHTML = '<strong>On this page</strong><div>' + links.join('') + '</div>';
    headings[0].closest('.section-title').before(contents);
    return contents;
  }

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

  function toolCard(entry) {
    const isOverview = entry.type === 'resource' && entry.href.includes('tragedies-overview');
    const isPaired = entry.type === 'study' && entry.paired;
    const isPassage = entry.type === 'passage';
    const label = isPassage ? 'Close reading' : isOverview ? 'Also useful' : isPaired ? 'Studying two texts?' : entry.type === 'resource' ? 'Free guide' : 'Study edition';
    const cta = isPassage ? 'Read with the notes' : isOverview ? 'Read the overview' : isPaired ? 'See the paired edition' : entry.type === 'resource' ? 'Read the guide' : 'View the study edition';

    return '<article class="related-tool"><a href="' + escapeHtml(entry.href) + '">' +
      '<p class="related-label">' + label + '</p>' +
      '<h3>' + escapeHtml(entry.title) + '</h3>' +
      '<p>' + escapeHtml(entry.description) + '</p>' +
      '<span>' + cta + ' <span aria-hidden="true">&rarr;</span></span>' +
      '</a></article>';
  }

  function bookCard(book) {
    return '<a class="related-book" href="' + escapeHtml(book.href) + '">' +
      '<img src="' + escapeHtml(book.image) + '" alt="' + escapeHtml(book.imageAlt || '') + '" loading="lazy">' +
      '<span><b>' + escapeHtml(book.title) + '</b><small>' + escapeHtml(book.author) + '</small></span>' +
      '</a>';
  }

  function addBookNavigation(book, collection) {
    const intro = main.querySelector('.page-intro') || main.firstElementChild;
    if (intro && !main.querySelector('.book-breadcrumb')) {
      const breadcrumb = document.createElement('nav');
      breadcrumb.className = 'book-breadcrumb';
      breadcrumb.setAttribute('aria-label', 'Breadcrumb');
      breadcrumb.innerHTML = '<a href="/library/">All books</a><span aria-hidden="true">/</span>' +
        '<a href="' + escapeHtml(collection ? collection.href : '/library/') + '">' + escapeHtml(book.collection) + '</a>' +
        '<span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(book.title) + '</span>';
      intro.before(breadcrumb);
    }

    if (!main.querySelector('.book-end-nav')) {
      const endNav = document.createElement('nav');
      endNav.className = 'book-end-nav';
      endNav.setAttribute('aria-label', 'End of page');
      endNav.innerHTML = '<a href="#main-content">Back to the top <span aria-hidden="true">&uarr;</span></a>' +
        (book.authorHref ? '<a href="' + escapeHtml(book.authorHref) + '">More by ' + escapeHtml(book.author) + '</a>' : '') +
        '<a href="' + escapeHtml(collection ? collection.href : '/library/') + '">More from ' + escapeHtml(book.collection) + '</a>' +
        '<a href="/explore/">Find another book <span aria-hidden="true">&rarr;</span></a>';
      main.append(endNav);
    }
  }

  async function addRelatedReading(contents) {
    try {
      const response = await fetch('/assets/content-index.json');
      if (!response.ok) return;
      const data = await response.json();
      const book = data.books.find(item => normalisePath(item.href) === currentPath);
      if (!book) return;
      const collection = data.collections.find(item => item.title === book.collection);
      addBookNavigation(book, collection);

      const resources = data.resources
        .filter(item => item.relatedBooks && item.relatedBooks.some(href => normalisePath(href) === currentPath))
        .slice(0, 3);
      const editions = data.studyEditions
        .filter(item => item.relatedBooks && item.relatedBooks.some(href => normalisePath(href) === currentPath))
        .sort((a, b) => Number(a.paired) - Number(b.paired))
        .slice(0, 3);
      const passages = (data.passages || [])
        .filter(item => item.relatedBooks && item.relatedBooks.some(href => normalisePath(href) === currentPath))
        .slice(0, 1);
      // Keep the paired study edition visible: reserve it the first slot so
      // passages and resources can never crowd it out of the four-card panel.
      const tools = editions.slice(0, 1).concat(passages, resources, editions.slice(1)).slice(0, 4);
      const subjects = (data.subjects || [])
        .filter(item => item.relatedBooks && item.relatedBooks.some(href => normalisePath(href) === currentPath));

      const authorBooks = data.books.filter(item => item.author === book.author && item.href !== book.href);
      const collectionBooks = data.books.filter(item => item.collection === book.collection);
      const currentIndex = collectionBooks.findIndex(item => item.href === book.href);
      const relatedBooks = authorBooks.slice(0, 3);
      for (let offset = 1; offset < collectionBooks.length && relatedBooks.length < 3; offset += 1) {
        const candidate = collectionBooks[(currentIndex + offset) % collectionBooks.length];
        if (candidate && candidate.href !== book.href && !relatedBooks.some(item => item.href === candidate.href)) {
          relatedBooks.push(candidate);
        }
      }

      if (!tools.length && !relatedBooks.length && !subjects.length) return;

      const heading = tools.length ? 'More on ' + book.title : 'Keep reading';
      const intro = tools.length
        ? 'The guides and editions here stay close to the text. The shelf below continues through the writer or the wider collection.'
        : authorBooks.length
          ? 'Continue with ' + book.author + ', then move into the wider ' + book.collection + ' collection.'
          : 'Three more books from the ' + book.collection + ' collection.';
      const toolsHtml = tools.length
        ? '<div class="related-tools">' + tools.map(toolCard).join('') + '</div>'
        : '';
      const subjectsHtml = subjects.length
        ? '<nav class="related-subjects" aria-label="Read this book by subject"><span>Read by subject</span>' + subjects.map(subject => '<a href="' + escapeHtml(subject.href) + '">' + escapeHtml(subject.title) + '</a>').join('') + '</nav>'
        : '';
      const booksHtml = relatedBooks.length
        ? '<div class="related-books-head"><p>' + (authorBooks.length ? 'More by ' + escapeHtml(book.author) : 'From ' + escapeHtml(book.collection)) + '</p><a href="' + escapeHtml(authorBooks.length && book.authorHref ? book.authorHref : (collection ? collection.href : '/library/')) + '">' + (authorBooks.length && book.authorHref ? 'Read the writer page' : 'Browse the full collection') + '</a></div>' +
          '<div class="related-books">' + relatedBooks.map(bookCard).join('') + '</div>'
        : '';

      const panel = document.createElement('section');
      panel.className = 'related-reading';
      panel.setAttribute('aria-labelledby', 'related-reading-title');
      panel.innerHTML = '<div class="related-reading-head"><div><p class="kicker">A little further</p>' +
        '<h2 id="related-reading-title">' + escapeHtml(heading) + '</h2></div>' +
        '<p>' + escapeHtml(intro) + '</p></div>' +
        subjectsHtml + toolsHtml + booksHtml +
        '<a class="related-explore-link" href="/explore/">Search all books, subjects, guides and editions <span aria-hidden="true">&rarr;</span></a>';

      if (contents) {
        contents.after(panel);
      } else {
        const edition = main.querySelector('.edition-card');
        if (edition) edition.after(panel);
        else main.append(panel);
      }
      // Keep the compact static shelf as a no-JavaScript fallback, but avoid
      // showing the same recommendations twice when this richer panel loads.
      const staticRelatedShelf = main.querySelector('.context-image-shelf-book');
      if (staticRelatedShelf) staticRelatedShelf.hidden = true;
      scrollToCurrentSection();
    } catch {
      // The reading page remains complete if the optional discovery index is unavailable.
    }
  }

  const contents = addPageContents();
  scrollToCurrentSection();
  addRelatedReading(contents);
})();
