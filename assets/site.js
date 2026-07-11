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

  const collectionMenu = document.querySelector('.browse-menu');

  if (collectionMenu) {
    document.addEventListener('click', event => {
      if (collectionMenu.open && !collectionMenu.contains(event.target)) collectionMenu.open = false;
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && collectionMenu.open) {
        collectionMenu.open = false;
        collectionMenu.querySelector('summary')?.focus();
      }
    });
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
    const label = isOverview ? 'Also useful' : isPaired ? 'Studying two texts?' : entry.type === 'resource' ? 'Free guide' : 'Study edition';
    const cta = isOverview ? 'Read the overview' : isPaired ? 'See the paired edition' : entry.type === 'resource' ? 'Read the guide' : 'View the study edition';

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
      const tools = resources.concat(editions);

      const collectionBooks = data.books.filter(item => item.collection === book.collection);
      const currentIndex = collectionBooks.findIndex(item => item.href === book.href);
      const relatedBooks = [];
      for (let offset = 1; offset < collectionBooks.length && relatedBooks.length < 3; offset += 1) {
        const candidate = collectionBooks[(currentIndex + offset) % collectionBooks.length];
        if (candidate && candidate.href !== book.href && !relatedBooks.some(item => item.href === candidate.href)) {
          relatedBooks.push(candidate);
        }
      }

      if (!tools.length && !relatedBooks.length) return;

      const heading = tools.length ? 'More on ' + book.title : 'Keep reading';
      const intro = tools.length
        ? 'The guides and editions here stay close to the text. The shelf below opens another path through the collection.'
        : 'Three more books from the ' + book.collection + ' collection.';
      const toolsHtml = tools.length
        ? '<div class="related-tools">' + tools.map(toolCard).join('') + '</div>'
        : '';
      const booksHtml = relatedBooks.length
        ? '<div class="related-books-head"><p>From ' + escapeHtml(book.collection) + '</p><a href="' + escapeHtml(collection ? collection.href : '/library/') + '">Browse the full collection</a></div>' +
          '<div class="related-books">' + relatedBooks.map(bookCard).join('') + '</div>'
        : '';

      const panel = document.createElement('section');
      panel.className = 'related-reading';
      panel.setAttribute('aria-labelledby', 'related-reading-title');
      panel.innerHTML = '<div class="related-reading-head"><div><p class="kicker">A little further</p>' +
        '<h2 id="related-reading-title">' + escapeHtml(heading) + '</h2></div>' +
        '<p>' + escapeHtml(intro) + '</p></div>' +
        toolsHtml + booksHtml +
        '<a class="related-explore-link" href="/explore/">Search all books, guides and editions <span aria-hidden="true">&rarr;</span></a>';

      if (contents) {
        contents.after(panel);
      } else {
        const edition = main.querySelector('.edition-card');
        if (edition) edition.after(panel);
        else main.append(panel);
      }
      scrollToCurrentSection();
    } catch {
      // The reading page remains complete if the optional discovery index is unavailable.
    }
  }

  const contents = addPageContents();
  scrollToCurrentSection();
  addRelatedReading(contents);
})();
