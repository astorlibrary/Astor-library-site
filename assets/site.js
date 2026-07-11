(() => {
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

  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  for (const link of document.querySelectorAll('.nav-link, .browse-card')) {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/+$/, '') || '/';
    if (linkPath === currentPath) link.setAttribute('aria-current', 'page');
  }

  if (!currentPath.startsWith('/books/')) return;

  const main = document.querySelector('main.page-wrap');
  const headings = main ? [...main.querySelectorAll('.section-title h2')] : [];
  if (headings.length < 3) return;

  const usedIds = new Set();
  const links = headings.map((heading, index) => {
    let base = heading.textContent
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `section-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    heading.closest('.section-title').id = id;
    return `<a href="#${id}">${heading.textContent}</a>`;
  });

  const contents = document.createElement('nav');
  contents.className = 'page-contents';
  contents.setAttribute('aria-label', 'On this page');
  contents.innerHTML = `<strong>On this page</strong><div>${links.join('')}</div>`;
  headings[0].closest('.section-title').before(contents);
})();
