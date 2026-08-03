(() => {
  const search = document.querySelector('#explore-search');
  const filters = [...document.querySelectorAll('.explore-filter')];
  const cards = [...document.querySelectorAll('.explore-card')];
  const count = document.querySelector('#explore-count');
  const empty = document.querySelector('#explore-empty');
  const more = document.querySelector('#explore-more');

  if (!search || !filters.length || !cards.length || !count || !empty || !more) return;

  let activeType = 'all';
  const pageSize = 24;
  let visibleLimit = pageSize;
  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) search.value = initialQuery;

  function normalise(value) {
    return value
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '');
  }

  function updateResults() {
    const query = normalise(search.value.trim());
    const words = query.split(/\s+/).filter(Boolean);
    let matching = 0;
    let shown = 0;

    for (const card of cards) {
      const matchesType = activeType === 'all' || card.dataset.type === activeType;
      const searchableText = normalise((card.dataset.search || '') + ' ' + card.textContent);
      const matchesSearch = words.every(word => searchableText.includes(word));
      const matches = matchesType && matchesSearch;
      if (matches) matching += 1;
      const show = matches && shown < visibleLimit;
      card.hidden = !show;
      if (show) shown += 1;
    }

    count.textContent = matching > shown
      ? 'Showing ' + shown + ' of ' + matching
      : matching + ' ' + (matching === 1 ? 'result' : 'results');
    empty.hidden = matching !== 0;
    more.hidden = matching <= shown;
    more.textContent = 'Show ' + Math.min(pageSize, matching - shown) + ' more';
  }

  search.addEventListener('input', () => {
    visibleLimit = pageSize;
    updateResults();
  });

  for (const filter of filters) {
    filter.addEventListener('click', () => {
      activeType = filter.dataset.filter;
      visibleLimit = pageSize;
      for (const item of filters) {
        const active = item === filter;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      }
      updateResults();
    });
  }

  more.addEventListener('click', () => {
    visibleLimit += pageSize;
    updateResults();
  });

  updateResults();
})();
