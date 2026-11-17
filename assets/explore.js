(() => {
  const search = document.querySelector('#explore-search');
  const filters = [...document.querySelectorAll('.explore-filter')];
  const cards = [...document.querySelectorAll('.explore-card')];
  const count = document.querySelector('#explore-count');
  const empty = document.querySelector('#explore-empty');
  const more = document.querySelector('#explore-more');
  const paths = document.querySelector('.explore-paths');

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

  // While searching, the best title matches come first ("macbeth" finds the
  // book before the close readings that mention it), books before the rest.
  const results = cards[0].parentElement;
  const typeOrder = ['book', 'study', 'author', 'collection', 'subject', 'passage', 'resource', 'season'];
  const plain = value => normalise(value).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  const titles = new Map(cards.map(card => [card, plain(card.querySelector('h2')?.textContent || '')]));

  function ranked(query, words) {
    if (!words.length) return cards;
    const wanted = plain(query);
    const rank = card => {
      const title = titles.get(card);
      const place = title === wanted ? 0 : title.startsWith(wanted) ? 1 : words.every(word => title.includes(plain(word))) ? 2 : 3;
      const type = typeOrder.indexOf(card.dataset.type);
      return place * 100 + (type === -1 ? 99 : type);
    };
    return cards.map((card, index) => ({ card, index, rank: rank(card) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(entry => entry.card);
  }

  function updateResults() {
    const query = normalise(search.value.trim());
    const words = query.split(/\s+/).filter(Boolean);
    let matching = 0;
    let shown = 0;
    const ordered = ranked(query, words);
    results.append(...ordered);

    for (const card of ordered) {
      const matchesType = activeType === 'all' || card.dataset.type === activeType;
      const searchableText = normalise((card.dataset.search || '') + ' ' + card.textContent);
      const matchesSearch = words.every(word => searchableText.includes(word));
      const matches = matchesType && matchesSearch;
      if (matches) matching += 1;
      const show = matches && shown < visibleLimit;
      card.hidden = !show;
      if (show) shown += 1;
    }

    count.textContent = !words.length && activeType === 'all' ? ''
      : matching > shown ? 'Showing ' + shown + ' of ' + matching
      : matching + ' ' + (matching === 1 ? 'result' : 'results');
    empty.hidden = matching !== 0;
    more.hidden = matching <= shown;
    more.textContent = 'Show ' + Math.min(pageSize, matching - shown) + ' more';
    // The "ways in" cards orient first-time visitors; once a search or filter
    // is active they only push the results further down the page.
    if (paths) paths.hidden = Boolean(query) || activeType !== 'all';
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
