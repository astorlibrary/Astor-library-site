(() => {
  const search = document.querySelector('#catalog-search');
  const filters = [...document.querySelectorAll('.catalog-filter')];
  const cards = [...document.querySelectorAll('.catalog-card')];
  const count = document.querySelector('#catalog-count');

  if (!search || !filters.length || !cards.length || !count) return;

  let activeCollection = 'all';

  function updateCatalogue() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;

    for (const card of cards) {
      const matchesCollection = activeCollection === 'all' || card.dataset.collection === activeCollection;
      const searchableText = `${card.textContent} ${card.dataset.search || ''}`.toLocaleLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      card.hidden = !(matchesCollection && matchesSearch);
      if (!card.hidden) visible += 1;
    }

    count.textContent = `${visible} ${visible === 1 ? 'book' : 'books'}`;
  }

  search.addEventListener('input', updateCatalogue);

  for (const filter of filters) {
    filter.addEventListener('click', () => {
      activeCollection = filter.dataset.filter;
      for (const item of filters) {
        const active = item === filter;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      }
      updateCatalogue();
    });
  }
})();
