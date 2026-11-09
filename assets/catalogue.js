(() => {
  const search = document.querySelector('#catalog-search');
  const filters = [...document.querySelectorAll('.catalog-filter')];
  const cards = [...document.querySelectorAll('.catalog-card')];
  const count = document.querySelector('#catalog-count');
  const empty = document.querySelector('#catalog-empty');

  if (!search || !filters.length || !cards.length || !count) return;

  const toolkitFilter = document.querySelector('[data-toolkit-filter]');
  const grid = cards[0].parentElement;
  const fold = text => text.toLocaleLowerCase().replace(/[’‘]/g, "'");
  const titleOf = card => fold(card.querySelector('h2, h3')?.textContent || '');
  let activeCollection = 'all';
  let toolkitOnly = false;
  let reordered = false;

  function updateCatalogue() {
    // Each word must appear somewhere on the card, so "dickens christmas" finds
    // A Christmas Carol and Dickens at Christmas.
    const words = fold(search.value.trim()).split(/\s+/).filter(Boolean);
    let visible = 0;

    for (const card of cards) {
      const matchesCollection = activeCollection === 'all' || card.dataset.collection === activeCollection;
      const matchesToolkit = !toolkitOnly || card.dataset.toolkit === 'yes';
      const searchableText = fold(`${card.textContent} ${card.dataset.search || ''}`);
      const matchesSearch = words.every(word => searchableText.includes(word));
      card.hidden = !(matchesCollection && matchesSearch && matchesToolkit);
      if (!card.hidden) visible += 1;
    }

    // While searching, books with the words in their title come before books
    // that only mention them; otherwise the shelf keeps its A to Z order.
    if (words.length || reordered) {
      const rank = card => {
        const title = titleOf(card);
        const inTitle = words.filter(word => title.includes(word)).length;
        return inTitle === words.length ? 0 : inTitle ? 1 : 2;
      };
      const order = words.length ? cards.slice().sort((a, b) => rank(a) - rank(b)) : cards;
      for (const card of order) grid.append(card);
      reordered = words.length > 0;
    }

    count.textContent = `${visible} ${visible === 1 ? 'book' : 'books'}`;
    if (empty) empty.hidden = visible > 0;
  }

  search.addEventListener('input', updateCatalogue);

  if (toolkitFilter) {
    toolkitFilter.addEventListener('click', () => {
      toolkitOnly = !toolkitOnly;
      toolkitFilter.classList.toggle('is-active', toolkitOnly);
      toolkitFilter.setAttribute('aria-pressed', String(toolkitOnly));
      updateCatalogue();
    });
  }

  for (const filter of filters.filter(filter => filter !== toolkitFilter)) {
    filter.addEventListener('click', () => {
      activeCollection = filter.dataset.filter;
      for (const item of filters.filter(item => item !== toolkitFilter)) {
        const active = item === filter;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      }
      updateCatalogue();
    });
  }
})();
