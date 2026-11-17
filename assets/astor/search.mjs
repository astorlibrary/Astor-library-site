// One search for the whole site.
//
// The palette that opens over any page (palette.mjs) and the Search page at
// /explore/ (explore-search.mjs) both rank the same index with the code in
// this file, so "Out, damned spot" finds the same line in both, and "Macbeth"
// lists the same things in the same order.
//
// The index is /assets/search-index.json, written by rebuild-study-data.js:
// one entry per destination, { k: kind, t: title, h: address, n: note, s:
// the words somebody might type }. Nothing here touches the page.

// What each kind of result is called, and what a reader needs to know before
// opening one: the web study guides are open, the slide guides ask for a free
// account after their first slides, a Study Edition is a printed book.
export const KINDS = {
  'Book': { label: 'Book', group: 'Books', note: 'The Astor edition' },
  'Study guide': { label: 'Study guide', group: 'Study guides', access: 'Free on the web' },
  'Key quotations': { label: 'Study guide', group: 'Study guides', access: 'Free on the web' },
  'Guide part': { label: 'Study guide', group: 'Study guides', access: 'Free on the web' },
  'Revise': { label: 'Revise', group: 'Revise', access: 'Free quizzes' },
  'Quotation': { label: 'Quotation', group: 'Quotations', access: 'With analysis' },
  'Close reading': { label: 'Close reading', group: 'Close readings', access: 'Free on the web' },
  'Slide guide': { label: 'Slide guide', group: 'Slide guides', access: 'Free account after 3 slides' },
  'Study Edition': { label: 'Study Edition', group: 'Study Editions', access: 'Printed book' },
  'Character': { label: 'Character', group: 'Characters' },
  'Theme': { label: 'Theme', group: 'Themes' },
  'Technique': { label: 'Literary term', group: 'Literary terms' },
  'Writer': { label: 'Writer', group: 'Writers' },
  'Subject': { label: 'Subject', group: 'Subjects and collections' },
  'Collection': { label: 'Collection', group: 'Subjects and collections' },
  'Seasonal': { label: 'Season', group: 'Subjects and collections' },
  'Tool': { label: 'On the site', group: 'On the site' }
};

// The order the Search page sets its groups in.
export const GROUP_ORDER = [
  'Books', 'Study guides', 'Revise', 'Quotations', 'Close readings', 'Slide guides', 'Study Editions',
  'Characters', 'Themes', 'Literary terms', 'Writers', 'Subjects and collections', 'On the site'
];

export function kindInfo(kind) {
  return KINDS[kind] || { label: kind, group: 'On the site' };
}

// Where a word is found decides the order. A match in an entry's own name
// comes first (the start of the name, then a whole word, then the start of a
// word, then the inside of one); then a match in the book or writer it belongs
// to; then a match anywhere in its text. So "christmas" lists the Christmas
// collection and the Christmas books before Scrooge, who matches only because
// his book is A Christmas Carol. On an equal match, the pages a reader most
// often wants come first: the book, its study guide, its key quotations and
// its quizzes, then the printed Study Edition, the close readings and the
// slide guides, and last the characters, themes and lines inside the guides.
const WEIGHT = {
  Seasonal: 10, Writer: 10, Book: 9, 'Study guide': 8, 'Key quotations': 7, Revise: 7, Tool: 6,
  'Study Edition': 6, 'Close reading': 5, 'Slide guide': 4, Subject: 4, Collection: 4, 'Guide part': 3,
  Character: 2, Theme: 2, Technique: 2, Quotation: 1
};
// Entries inside a larger page give up some of a name match to the page itself.
const NAME_PENALTY = { Character: 1, Theme: 1, Technique: 1, Quotation: 2, 'Guide part': 4 };
// A name that is exactly what was typed comes first among its kind.
const EXACT = new Set(['Book', 'Study guide', 'Key quotations', 'Revise', 'Study Edition', 'Writer', 'Seasonal', 'Subject', 'Collection', 'Tool', 'Slide guide', 'Close reading']);

// Lower case, straight apostrophes dropped, punctuation read as a space, so
// "Out damned spot" finds “Out, damned spot!” and "night's" finds “night’s”.
export function fold(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// "Memory and time in A Christmas Carol": the book's title is not part of the
// theme's own name. A title character keeps it ("Macbeth" in Macbeth).
function ownName(entry) {
  const name = fold(entry.t);
  const book = (entry.k === 'Theme' || entry.k === 'Character') && fold(entry.n);
  return book && name !== book ? name.replace(book, ' ').replace(/\s+/g, ' ').trim() : name;
}

// "Macbeth study guide", "Macbeth: key quotations" and "Revise Macbeth" are
// all, at heart, "Macbeth".
function coreName(entry, name) {
  if (entry.k === 'Study guide') return name.replace(/ study guide$/, '');
  if (entry.k === 'Key quotations') return name.replace(/ key quotations$/, '');
  if (entry.k === 'Revise') return name.replace(/^revise /, '');
  return name;
}

function prepare(entry) {
  if (entry.own !== undefined) return;
  entry.own = ownName(entry);
  entry.core = coreName(entry, entry.own);
  entry.note = fold(entry.n);
  entry.text = fold(entry.s);
}

function inName(name, word, anyWord) {
  const padded = ' ' + name + ' ';
  const whole = padded.indexOf(' ' + word + ' ');
  if (whole >= 0) return whole === 0 || anyWord ? 6 : 5;
  const starts = padded.indexOf(' ' + word);
  if (starts >= 0) return starts === 0 ? 5 : 4;
  return name.includes(word) ? 3 : 0;
}

function wordScore(entry, word) {
  // A writer is found by any of their names: "dickens" is Charles Dickens.
  let found = Math.max(inName(entry.own, word, entry.k === 'Writer'), entry.core !== entry.own ? inName(entry.core, word, false) : 0);
  if (found) found = Math.max(1, found - (NAME_PENALTY[entry.k] || 0));
  // The work an entry belongs to. A close reading is a whole page about its
  // play or novel, so the title counts for more there than on a single line.
  if (!found && entry.k !== 'Technique' && (' ' + entry.note + ' ').includes(' ' + word)) found = entry.k === 'Close reading' ? 4 : 2;
  if (!found && entry.text.includes(word)) found = 1;
  return found || -1;
}

function score(entry, words, phrase) {
  prepare(entry);
  let total = 0;
  for (const word of words) {
    const found = wordScore(entry, word);
    if (found < 0) return -1;
    total += found;
  }
  let rank = total * 10 + (WEIGHT[entry.k] || 1);
  if (EXACT.has(entry.k) && (entry.own === phrase || entry.core === phrase)) rank += 30;
  // Several words found side by side, in order: a line somebody is quoting.
  else if (words.length > 1 && (entry.own.includes(phrase) || entry.text.includes(phrase))) rank += 15;
  return rank;
}

// Words that say what kind of page is wanted. When one of them leads to a
// part of a study guide, the lines, themes or people on that page follow it,
// so "Macbeth quotes" lists the quotations and not only the page they are on.
const CHILDREN = { quotations: 'Quotation', themes: 'Theme', characters: 'Character' };

function children(entries, parent) {
  const match = String(parent.h).match(/^(\/guides\/[^/]+\/)(quotations|themes|characters)\/$/);
  if (!match) return [];
  const kind = CHILDREN[match[2]];
  const prefix = match[1] + match[2] + '/';
  return entries.filter(entry => entry.k === kind && String(entry.h).startsWith(prefix));
}

// Every entry that matches, best first. No limit and no grouping: the callers
// decide how many to show and how.
export function rank(entries, query) {
  const phrase = fold(query);
  if (!phrase) return [];
  const words = phrase.split(' ').filter(Boolean);
  const ranked = [];
  entries.forEach((entry, index) => {
    const value = score(entry, words, phrase);
    if (value >= 0) ranked.push({ entry, rank: value, index });
  });
  ranked.sort((a, b) => b.rank - a.rank || a.index - b.index);
  const results = ranked.map(item => item.entry);
  const first = results[0];
  if (first && (first.k === 'Key quotations' || first.k === 'Guide part') && words.length > 1) {
    const inside = children(entries, first).filter(entry => !results.includes(entry));
    results.splice(1, 0, ...inside);
  }
  return results;
}

// A short list for the palette: the best matches, with no one kind of result
// allowed to crowd out the rest. A reader who types "Macbeth" sees the book,
// the guide, the quotations, the quizzes, the Study Edition, a close reading
// and a slide guide, not eleven things of one sort.
export function shortlist(entries, query, limit = 12, perKind = 2) {
  const all = rank(entries, query);
  const first = all[0];
  // A page and the lines inside it, asked for by name, are shown as they come.
  if (first && (first.k === 'Key quotations' || first.k === 'Guide part') && fold(query).includes(' ')) return all.slice(0, limit);
  // Somebody typing a line wants the lines.
  if (first && first.k === 'Quotation') return all.slice(0, limit);
  const counts = new Map();
  const kept = [];
  const held = [];
  for (const entry of all) {
    const used = counts.get(entry.k) || 0;
    if (used < perKind) { kept.push(entry); counts.set(entry.k, used + 1); }
    else held.push(entry);
    if (kept.length >= limit) break;
  }
  return kept.concat(held).slice(0, limit);
}

// The same results under the headings the Search page uses.
export function grouped(entries, query) {
  const all = rank(entries, query);
  const groups = new Map(GROUP_ORDER.map(name => [name, []]));
  for (const entry of all) {
    const name = kindInfo(entry.k).group;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  }
  // The group holding the best match comes first; the rest keep their order.
  const lead = all.length ? kindInfo(all[0].k).group : '';
  const order = lead ? [lead, ...[...groups.keys()].filter(name => name !== lead)] : [...groups.keys()];
  return { total: all.length, groups: order.map(name => ({ name, entries: groups.get(name) })).filter(group => group.entries.length) };
}

let loading = null;

// The index, fetched once and only when somebody searches.
export function loadSearchIndex() {
  if (!loading) {
    loading = fetch('/assets/search-index.json', { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
      })
      .then(payload => {
        if (!Array.isArray(payload.entries)) throw new Error('Invalid search index');
        return payload.entries;
      })
      .catch(error => { loading = null; throw error; });
  }
  return loading;
}
