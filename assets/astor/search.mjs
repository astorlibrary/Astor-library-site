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
  'Scene': { label: 'What happens', group: 'Acts, scenes and chapters', access: 'Free on the web' },
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
  'Books', 'Study guides', 'Revise', 'Quotations', 'Acts, scenes and chapters', 'Close readings', 'Slide guides', 'Study Editions',
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
  Character: 2, Theme: 2, Technique: 2, Quotation: 1, Scene: 1
};
// Entries inside a larger page give up some of a name match to the page itself.
const NAME_PENALTY = { Character: 1, Theme: 1, Technique: 1, Quotation: 2, 'Guide part': 4, Scene: 4 };
// A name that is exactly what was typed comes first among its kind.
const EXACT = new Set(['Book', 'Study guide', 'Key quotations', 'Revise', 'Study Edition', 'Writer', 'Seasonal', 'Subject', 'Collection', 'Tool', 'Slide guide', 'Close reading', 'Scene']);
// Kinds whose note names what they belong to (a book, a writer, a speaker).
// Elsewhere the note is a description and counts as ordinary text.
const OWNER_NOTE = new Set(['Book', 'Study guide', 'Guide part', 'Scene', 'Character', 'Theme', 'Quotation', 'Close reading', 'Slide guide', 'Study Edition']);

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
  if (entry.k === 'Guide part') return name.replace(/ (what happens|characters|themes|form and language|context)$/, '');
  return name;
}

function prepare(entry) {
  if (entry.own !== undefined) return;
  entry.own = ownName(entry);
  entry.core = coreName(entry, entry.own);
  // Other names it answers to: "notes" for a study guide, "quotes" for the
  // key quotations, "Hamlet Act 3" for Hamlet, Act III.
  entry.alts = entry.a ? String(entry.a).split('|').map(fold).filter(Boolean) : [];
  entry.also = entry.alts.length ? ' ' + entry.alts.join(' ') + ' ' : '';
  entry.note = fold(entry.n);
  // "To-morrow, and to-morrow" is also found by "tomorrow and tomorrow".
  const raw = String(entry.s || '');
  entry.text = fold(raw) + (raw.includes('-') ? ' ' + fold(raw.replace(/(\p{L})-(\p{L})/gu, '$1$2')) : '');
}

// "A Christmas Carol" begins, for a reader, with "Christmas".
const bare = text => String(text).replace(/^(?:a|an|the) /, '');

function inName(name, word, anyWord) {
  const padded = ' ' + bare(name) + ' ';
  const whole = padded.indexOf(' ' + word + ' ');
  if (whole >= 0) return whole === 0 || anyWord ? 6 : 5;
  const starts = padded.indexOf(' ' + word);
  if (starts >= 0) return starts === 0 ? 5 : 4;
  return name.includes(word) ? 3 : 0;
}

function wordScore(entry, word) {
  // A writer is found by any of their names: "dickens" is Charles Dickens.
  let found = Math.max(inName(entry.own, word, entry.k === 'Writer'), entry.core !== entry.own ? inName(entry.core, word, false) : 0);
  if (!found && entry.also && entry.also.includes(' ' + word + ' ')) found = 5;
  if (found) found = Math.max(1, found - (NAME_PENALTY[entry.k] || 0));
  // The work an entry belongs to. A close reading is a whole page about its
  // play or novel, so the title counts for more there than on a single line.
  if (!found && OWNER_NOTE.has(entry.k) && (' ' + entry.note + ' ').includes(' ' + word)) found = entry.k === 'Close reading' ? 4 : 2;
  if (!found && entry.text.includes(word)) found = 1;
  return found || -1;
}

// Words too common to say what a search is about: "to be or not to be" is
// six of them, and is found as a phrase or not at all.
const STOP = new Set('a an and are as at be but by do for had has have he her his i in is it its me my no not of on or our she so that the their this thou thy to was we what which who will with you your'.split(' '));

// One entry against the words typed. `strong` says every word that carries
// meaning was found in the entry's name or in what it belongs to, and
// `phrase` that the words were found side by side, in order.
function measure(entry, words, phrase) {
  prepare(entry);
  let total = 0;
  let meaningful = 0;
  let carried = 0;
  for (const word of words) {
    const found = wordScore(entry, word);
    if (found < 0) return null;
    total += found;
    if (!STOP.has(word)) { meaningful += 1; if (found >= 2) carried += 1; }
  }
  const strong = meaningful > 0 && carried === meaningful;
  let rank = total * 10 + (WEIGHT[entry.k] || 1);
  const sideBySide = words.length > 1 && (entry.own.includes(phrase) || entry.text.includes(phrase));
  // Exactly its name, or one of its other names.
  const typed = bare(phrase);
  const named = EXACT.has(entry.k) && (bare(entry.own) === typed || bare(entry.core) === typed || entry.alts.some(alt => bare(alt) === typed));
  // Its name followed by another word for what it is: "Macbeth analysis" is the
  // Macbeth study guide, "Romeo and Juliet summary" the Romeo and Juliet one.
  const core = bare(entry.core);
  const asked = !named && entry.also && typed.startsWith(core + ' ') &&
    typed.slice(core.length + 1).split(' ').every(word => entry.also.includes(' ' + word + ' '));
  if (named || asked) rank += words.length >= 3 ? 230 : 30;
  else if (sideBySide) rank += words.length >= 3 ? 200 : 15;
  return { rank, strong, phrase: sideBySide || named || asked };
}

function run(entries, words, only) {
  const phrase = words.join(' ');
  const ranked = [];
  entries.forEach((entry, index) => {
    if (only && !only.has(entry.k)) return;
    const result = measure(entry, words, phrase);
    if (result) ranked.push({ entry, index, ...result });
  });
  ranked.sort((a, b) => b.rank - a.rank || a.index - b.index);
  // Somebody quoting a line wants that line. Where three or more words are
  // found side by side somewhere, the entries that only have the same words
  // scattered through them are left out, unless their own names carry every
  // word that matters.
  if (words.length >= 3 && ranked.some(item => item.phrase)) return ranked.filter(item => item.phrase || item.strong).map(item => item.entry);
  return ranked.map(item => item.entry);
}

// Words that say what kind of thing is wanted. "Lady Macbeth quotes" is a
// search for quotations with "Lady Macbeth" in them, not for a page with
// the word "quotes" on it.
const WANTS = {
  quote: 'Quotation', quotes: 'Quotation', quotation: 'Quotation', quotations: 'Quotation', lines: 'Quotation',
  theme: 'Theme', themes: 'Theme', character: 'Character', characters: 'Character'
};
// The page that holds each kind comes with it: "quotes from Macbeth" leads
// with Macbeth's key quotations, then the lines.
const PAGE_OF = { Quotation: 'Key quotations', Theme: 'Guide part', Character: 'Guide part' };
// Words about the search or the course, not about the book.
const ASIDE = new Set(('gcse igcse alevel level aqa ocr edexcel wjec eduqas ks3 ks4 ks5 essay essays exam exams question questions ' +
  'explained explanation explain meaning mean means about pdf free online grade year sparknotes ' +
  'who what where when why how is are was were does did do the a an of in for on by to and from with').split(' '));

// A slip of the keyboard: "mcbeth", "frankenstien". A word found nowhere in
// the index is replaced by the nearest word in the name of a book, a writer
// or a character, if one is near enough.
let vocabulary = null;
function names(entries) {
  if (vocabulary) return vocabulary;
  vocabulary = new Set();
  for (const entry of entries) {
    if (!['Book', 'Writer', 'Character', 'Tool', 'Subject', 'Technique'].includes(entry.k)) continue;
    prepare(entry);
    for (const word of entry.own.split(' ')) if (word.length >= 4) vocabulary.add(word);
  }
  return vocabulary;
}

// Edit distance, counting two letters swapped as one slip.
function distance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let before = null;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let least = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (before && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2] + 1);
      current.push(value);
      if (value < least) least = value;
    }
    if (least > limit) return limit + 1;
    before = previous;
    previous = current;
  }
  return previous[b.length];
}

function respell(entries, words) {
  let changed = false;
  const fixed = words.map(word => {
    if (word.length < 4 || WANTS[word] || ASIDE.has(word)) return word;
    if (entries.some(entry => { prepare(entry); return entry.text.includes(word) || entry.own.includes(word); })) return word;
    const limit = word.length <= 5 ? 1 : 2;
    let best = '';
    let bestDistance = limit + 1;
    for (const candidate of names(entries)) {
      const d = distance(word, candidate, limit);
      if (d < bestDistance || (d === bestDistance && best && candidate[0] === word[0] && best[0] !== word[0])) { best = candidate; bestDistance = d; }
    }
    if (!best) return word;
    changed = true;
    return best;
  });
  return changed ? fixed : null;
}

// When a part of a study guide is asked for by name, the lines, themes or
// people on that page follow it, so "Macbeth quotes" lists the quotations and
// not only the page they are on.
const CHILDREN = { quotations: 'Quotation', themes: 'Theme', characters: 'Character' };

function children(entries, parent) {
  const match = String(parent.h).match(/^(\/guides\/[^/]+\/)(quotations|themes|characters)\/$/);
  if (!match) return [];
  const kind = CHILDREN[match[2]];
  const prefix = match[1] + match[2] + '/';
  return entries.filter(entry => entry.k === kind && String(entry.h).startsWith(prefix));
}

// Every entry that matches, best first, and `note`: the words searched for
// instead, when a misspelling was put right. No limit and no grouping: the
// callers decide how many to show and how.
export function find(entries, query, respelled = false) {
  const phrase = fold(query);
  if (!phrase) return { results: [], note: '' };
  const words = phrase.split(' ').filter(Boolean);

  // As typed.
  let results = run(entries, words, null);
  const first = results[0];
  const page = first && (first.k === 'Key quotations' || first.k === 'Guide part') && words.length > 1;
  if (page) {
    const inside = children(entries, first).filter(entry => !results.includes(entry));
    results.splice(1, 0, ...inside);
  }

  // A kind of thing asked for by name ("Scrooge quotes"), or words about the
  // course ("Macbeth GCSE"). Unless a whole page of the wanted kind already
  // leads, the things of that kind come first.
  const wanted = new Set(words.map(word => WANTS[word]).filter(Boolean));
  for (const kind of [...wanted]) wanted.add(PAGE_OF[kind]);
  const rest = words.filter(word => !WANTS[word] && !ASIDE.has(word));
  if (rest.length && rest.length < words.length && !page) {
    const ofKind = wanted.size ? run(entries, rest, wanted) : [];
    if (ofKind.length) results = ofKind.concat(results.filter(entry => !ofKind.includes(entry)));
    else if (!results.length) results = run(entries, rest, null);
  }

  // A slip of the keyboard.
  if (!results.length && !respelled) {
    const fixed = respell(entries, words);
    if (fixed) {
      const again = find(entries, fixed.join(' '), true);
      if (again.results.length) return { results: again.results, note: fixed.join(' ') };
    }
  }
  return { results, note: '' };
}

export function rank(entries, query) {
  return find(entries, query).results;
}

// A short list for the palette: the best matches, with no one kind of result
// allowed to crowd out the rest. A reader who types "Macbeth" sees the book,
// the guide, the quotations, the quizzes, the Study Edition, a close reading
// and a slide guide, not eleven things of one sort. The list carries `note`
// when the search was respelled.
export function shortlist(entries, query, limit = 12, perKind = 2) {
  const { results: all, note } = find(entries, query);
  const first = all[0];
  let list;
  // A page and the lines inside it, asked for by name, are shown as they come.
  if (first && (first.k === 'Key quotations' || first.k === 'Guide part') && fold(query).includes(' ')) list = all.slice(0, limit);
  // Somebody typing a line, or asking for a character's lines, wants the lines.
  else if (first && first.k === 'Quotation') list = all.slice(0, limit);
  else {
    const counts = new Map();
    const kept = [];
    const held = [];
    for (const entry of all) {
      const used = counts.get(entry.k) || 0;
      if (used < perKind) { kept.push(entry); counts.set(entry.k, used + 1); }
      else held.push(entry);
      if (kept.length >= limit) break;
    }
    // Room left over goes to the best of what was held back, and the list
    // stays in order of how well each entry matched.
    const chosen = new Set(kept.concat(held.slice(0, Math.max(0, limit - kept.length))));
    list = all.filter(entry => chosen.has(entry)).slice(0, limit);
  }
  list.note = note;
  return list;
}

// The same results under the headings the Search page uses.
export function grouped(entries, query) {
  const { results: all, note } = find(entries, query);
  const groups = new Map(GROUP_ORDER.map(name => [name, []]));
  for (const entry of all) {
    const name = kindInfo(entry.k).group;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  }
  // The group holding the best match comes first; the rest keep their order.
  const lead = all.length ? kindInfo(all[0].k).group : '';
  const order = lead ? [lead, ...[...groups.keys()].filter(name => name !== lead)] : [...groups.keys()];
  return { total: all.length, note, groups: order.map(name => ({ name, entries: groups.get(name) })).filter(group => group.entries.length) };
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
