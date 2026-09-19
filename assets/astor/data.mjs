// Loads the structured study content that every tool on the site reads.
//
// Two shapes are published by the build:
//   /data/books/<slug>.json   the full record for one title
//   /assets/study-index.json  a cross-library index of every title's
//                             quotations, themes, techniques, characters and
//                             timeline, for the explorers and the daily puzzle

const cache = new Map();

async function getJson(url) {
  if (cache.has(url)) return cache.get(url);
  const request = fetch(url, { credentials: 'omit' })
    .then(response => {
      if (!response.ok) throw new Error('Could not load ' + url);
      return response.json();
    })
    .catch(error => {
      cache.delete(url);
      throw error;
    });
  cache.set(url, request);
  return request;
}

export function loadBook(slug) {
  return getJson('/data/books/' + slug + '.json');
}

export function loadIndex() {
  return getJson('/assets/study-index.json');
}

export function loadDiscovery() {
  return getJson('/assets/content-index.json');
}

// --- shaping ---------------------------------------------------------------

export function stageOf(book, quotation) {
  if (!quotation.stage) return null;
  return book.structure.find(stage => stage.id === quotation.stage) || null;
}

export function byId(list) {
  return new Map((list || []).map(item => [item.id, item]));
}

export function labelFor(map, id) {
  return map.get(id)?.name || map.get(id)?.label || id;
}

// Every quotation on the site has one stable identifier, used by the
// commonplace book, the flashcard schedule and shared results alike.
export function cardId(bookSlug, quotationId) {
  return bookSlug + ':' + quotationId;
}

export function allQuotations(index) {
  return index.books.flatMap(book => book.quotations.map(quotation => ({
    ...quotation,
    bookSlug: book.slug,
    bookTitle: book.title,
    bookHref: book.href,
    author: book.author,
    period: book.period,
    form: book.form
  })));
}

export function allThemes(index) {
  const themes = new Map();
  for (const book of index.books) {
    for (const theme of book.themes) {
      const entry = themes.get(theme.id) || { id: theme.id, name: theme.canonicalName || theme.name, books: [] };
      entry.books.push({
        slug: book.slug,
        title: book.title,
        href: book.href,
        name: theme.name,
        summary: theme.summary,
        development: theme.development || '',
        quotations: book.quotations.filter(quotation => (quotation.themes || []).includes(theme.id))
      });
      themes.set(theme.id, entry);
    }
  }
  return [...themes.values()].sort((a, b) => b.books.length - a.books.length || a.name.localeCompare(b.name));
}

export function allTechniques(index) {
  const techniques = new Map();
  for (const book of index.books) {
    for (const technique of book.techniques) {
      const entry = techniques.get(technique.id) || {
        id: technique.id,
        name: technique.canonicalName || technique.name,
        definition: technique.definition,
        examples: []
      };
      entry.examples.push({
        slug: book.slug,
        title: book.title,
        href: book.href,
        bookName: technique.name,
        inThisBook: technique.inThisBook,
        quotations: book.quotations.filter(quotation => (quotation.techniques || []).includes(technique.id))
      });
      techniques.set(technique.id, entry);
    }
  }
  return [...techniques.values()].sort((a, b) => a.name.localeCompare(b.name));
}
