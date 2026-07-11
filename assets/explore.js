(() => {
  const search = document.querySelector('#explore-search');
  const filters = [...document.querySelectorAll('.explore-filter')];
  const cards = [...document.querySelectorAll('.explore-card')];
  const count = document.querySelector('#explore-count');
  const empty = document.querySelector('#explore-empty');

  if (!search || !filters.length || !cards.length || !count || !empty) return;

  let activeType = 'all';
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
    let visible = 0;

    for (const card of cards) {
      const matchesType = activeType === 'all' || card.dataset.type === activeType;
      const searchableText = normalise((card.dataset.search || '') + ' ' + card.textContent);
      const matchesSearch = words.every(word => searchableText.includes(word));
      card.hidden = !(matchesType && matchesSearch);
      if (!card.hidden) visible += 1;
    }

    count.textContent = visible + ' ' + (visible === 1 ? 'result' : 'results');
    empty.hidden = visible !== 0;
  }

  search.addEventListener('input', updateResults);

  for (const filter of filters) {
    filter.addEventListener('click', () => {
      activeType = filter.dataset.filter;
      for (const item of filters) {
        const active = item === filter;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      }
      updateResults();
    });
  }

  updateResults();
})();
