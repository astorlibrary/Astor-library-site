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

  passageHubFilter();

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

  function thumbnailSrcset(image) {
    if (!image || !image.startsWith('/assets/book-thumbs/') || !image.endsWith('.jpg')) return '';
    const small = image.replace(/\.jpg$/, '-360.jpg');
    return ' srcset="' + escapeHtml(small) + ' 360w, ' + escapeHtml(image) + ' 720w" sizes="72px"';
  }

  function bookCard(book) {
    return '<a class="related-book" href="' + escapeHtml(book.href) + '">' +
      '<img src="' + escapeHtml(book.image) + '"' + thumbnailSrcset(book.image) + ' alt="' + escapeHtml(book.imageAlt || '') + '" loading="lazy">' +
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

      // The shelf belongs at the foot of the page. A reader who has just
      // arrived wants the book, not a list of other books.
      const endNav = main.querySelector('.book-end-nav');
      if (endNav) endNav.before(panel);
      else main.append(panel);
      // Keep the compact static shelf as a no-JavaScript fallback, but avoid
      // showing the same recommendations twice when this richer panel loads.
      const staticRelatedShelf = main.querySelector('.context-image-shelf-book');
      if (staticRelatedShelf) staticRelatedShelf.hidden = true;
      scrollToCurrentSection();
    } catch {
      // The reading page remains complete if the optional discovery index is unavailable.
    }
  }

  // Progressive-enhancement filter for the Passage Room hub: the control is
  // built in JS so no-script visitors never see a dead search box, and all
  // cards remain visible without it.
  // A book page carries a long editorial account of the book: publication,
  // adaptations, sources, stage history. All of it is worth having and none of
  // it should be the first thing a reader has to scroll past. Each part keeps
  // its heading and its opening line; the rest folds away behind it. Without
  // JavaScript the page stays exactly as it is, whole and open.
  function foldBookSections() {
    const main = document.querySelector('main.page-wrap');
    if (!main || !document.querySelector('.book-breadcrumb')) return;
    const toolkit = main.querySelector('#astor-study-toolkit');

    const KEEP_OPEN = /astor-toolkit|book-passage-shelf|related-reading|edition-format-panel|context-image-shelf|season-book-backlinks|book-end-nav|astor-feature|page-contents|quick-facts|page-intro|astor-page-credit|book-breadcrumb/;
    const children = [...main.children];

    const groups = [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (!child.classList.contains('section-title')) continue;
      const body = [];
      for (let next = index + 1; next < children.length; next += 1) {
        const sibling = children[next];
        if (sibling.classList.contains('section-title') || KEEP_OPEN.test(sibling.className)) break;
        body.push(sibling);
      }
      // A section holding the study tools is left alone: those have their own
      // tabs and are the reason most readers are here.
      const holdsToolkit = body.some(block => block.contains(toolkit) || block.id === 'astor-study-toolkit');
      if (body.length && !holdsToolkit) groups.push({ head: child, body });
    }
    // The first section stays open, so a page never begins with a row of
    // closed headings.
    if (groups.length < 3) return;
    const foldable = groups.slice(1);

    foldable.forEach((group, position) => {
      const heading = group.head.querySelector('h2');
      const note = group.head.querySelector('p');
      const fold = document.createElement('details');
      fold.className = 'book-fold';
      // The contents line links to these sections by id. The fold takes the
      // id with it, or the links would point at nothing.
      if (group.head.id) fold.id = group.head.id;
      if (position === 0) fold.open = true;
      const summary = document.createElement('summary');
      const title = document.createElement('span');
      title.className = 'book-fold-title';
      title.textContent = heading ? heading.textContent.trim() : 'More';
      summary.append(title);
      if (note && note.textContent.trim()) {
        const line = document.createElement('span');
        line.className = 'book-fold-note';
        line.textContent = note.textContent.trim();
        summary.append(line);
      }
      fold.append(summary);
      group.head.replaceWith(fold);
      for (const block of group.body) fold.append(block);
    });

    // A link to a folded section opens it, whether it is followed from the
    // contents line, from another page, or from a bookmark.
    const openFoldAt = hash => {
      if (!hash) return;
      let target;
      try { target = document.getElementById(decodeURIComponent(hash.replace('#', ''))); } catch { return; }
      const fold = target && (target.closest('.book-fold') || null);
      if (fold) {
        fold.open = true;
        window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'auto' }));
      }
    };
    document.addEventListener('click', event => {
      const link = event.target.closest && event.target.closest('a[href^="#"]');
      if (link) window.setTimeout(() => openFoldAt(link.getAttribute('href')), 0);
    });
    window.addEventListener('hashchange', () => openFoldAt(window.location.hash));
    openFoldAt(window.location.hash);
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

  // The contents line is built first, so it can name the sections and give
  // them their ids; the folding then takes those ids with it.
  const contents = addPageContents();
  foldBookSections();
  scrollToCurrentSection();
  addRelatedReading(contents);
})();
