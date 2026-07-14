(() => {
  const search = document.querySelector('#resource-search');
  const count = document.querySelector('#resource-count');
  const empty = document.querySelector('#resource-empty');
  const filters = Array.from(document.querySelectorAll('[data-resource-filter]'));
  const sections = Array.from(document.querySelectorAll('.resource-section')).map(heading => {
    const grid = heading.nextElementSibling;
    if (!grid || !grid.classList.contains('resource-grid')) return null;
    grid.dataset.resourceCategory = heading.id;
    return { heading, grid, cards: Array.from(grid.querySelectorAll('.resource-card')) };
  }).filter(Boolean);
  const cards = sections.flatMap(section => section.cards);
  let category = 'all';

  const normalise = value => value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  for (const section of sections) {
    for (const card of section.cards) {
      card.dataset.resourceSearch = normalise(card.textContent);
      card.dataset.resourceCategory = section.grid.dataset.resourceCategory;
    }
  }

  function update() {
    const query = normalise(search.value);
    let visible = 0;

    for (const card of cards) {
      const matchesWords = !query || query.split(' ').every(word => card.dataset.resourceSearch.includes(word));
      const matchesCategory = category === 'all' || card.dataset.resourceCategory === category;
      card.hidden = !(matchesWords && matchesCategory);
      if (!card.hidden) visible += 1;
    }

    for (const section of sections) {
      const hasVisibleCard = section.cards.some(card => !card.hidden);
      section.heading.hidden = !hasVisibleCard;
      section.grid.hidden = !hasVisibleCard;
    }

    count.textContent = visible + (visible === 1 ? ' guide' : ' guides');
    empty.hidden = visible !== 0;
  }

  search.addEventListener('input', update);
  for (const filter of filters) {
    filter.addEventListener('click', () => {
      category = filter.dataset.resourceFilter;
      for (const button of filters) {
        const active = button === filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
      update();
    });
  }

  update();
})();
