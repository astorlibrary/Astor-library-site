(() => {
  const search = document.querySelector('#catalog-search');
  const filters = [...document.querySelectorAll('.catalog-filter')];
  const cards = [...document.querySelectorAll('.catalog-card')];
  const count = document.querySelector('#catalog-count');
  const empty = document.querySelector('#catalog-empty');

  if (!search || !filters.length || !cards.length || !count) return;

  const toolkitFilter = document.querySelector('[data-toolkit-filter]');
  let activeCollection = 'all';
  let toolkitOnly = false;

  function updateCatalogue() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;

    for (const card of cards) {
      const matchesCollection = activeCollection === 'all' || card.dataset.collection === activeCollection;
      const matchesToolkit = !toolkitOnly || card.dataset.toolkit === 'yes';
      const searchableText = `${card.textContent} ${card.dataset.search || ''}`.toLocaleLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      card.hidden = !(matchesCollection && matchesSearch && matchesToolkit);
      if (!card.hidden) visible += 1;
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
