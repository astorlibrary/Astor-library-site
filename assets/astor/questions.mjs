// Turns the structured study content into revision questions.
//
// Nothing in this module touches the DOM, so the same code builds the round a
// reader plays in the browser and the round the test suite checks in Node. A
// question is always an object of the shape:
//
//   { kind, id, stem, hint, options[], answer, explain, source, book }
//
// where `answer` is an index for 'choice', an ordered list of ids for 'order',
// and an array of words for 'cloze'.
//
// Every question is derived from data/books/*.json. There is no separate
// question bank to keep in step with the pages, which is the whole point: a
// quotation entered once is a card on the book page, an entry in the explorer,
// a flashcard, and a question in four different games.

import { shuffle, sample, pick, seededRandom, hashString, formatYear } from './util.mjs';

const STOP_WORDS = new Set([
  'the', 'and', 'but', 'for', 'nor', 'yet', 'so', 'a', 'an', 'of', 'to', 'in',
  'on', 'at', 'by', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'us',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'as', 'if', 'or', 'not', 'no', 'with', 'from', 'up', 'out', 'what',
  'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
  'can', 'will', 'just', 'shall', 'do', 'does', 'did', 'have', 'has', 'had',
  'thou', 'thee', 'thy', 'thine', 'o', 'oh', 'upon', 'into', 'there', 'here'
]);

function bookRef(book) {
  return { slug: book.slug, title: book.title, href: book.href, author: book.author };
}

function quotationSource(book, quotation) {
  return quotation.reference
    ? book.title + ' ' + quotation.reference
    : book.title;
}

function makeChoice({ id, kind, stem, quote, hint, correct, distractors, explain, source, book, random }) {
  const pool = [...new Set(distractors.filter(option => option && option !== correct))];
  if (pool.length < 2) return null;
  const options = shuffle([correct, ...sample(pool, 3, random)], random);
  return {
    kind: kind || 'choice',
    id,
    stem,
    quote: quote || '',
    hint: hint || '',
    options,
    answer: options.indexOf(correct),
    explain: explain || '',
    source: source || '',
    book: book || null
  };
}

// --- who said it -----------------------------------------------------------

// The words of a name that identify the person: no titles, ranks or ordinals.
const TITLE_WORDS = new Set([
  'the', 'of', 'and', 'a', 'an', 'mr', 'mrs', 'miss', 'ms', 'dr', 'sir', 'lady', 'lord', 'king', 'queen', 'prince',
  'princess', 'duke', 'duchess', 'earl', 'count', 'countess', 'captain', 'colonel', 'sergeant', 'lieutenant',
  'professor', 'doctor', 'father', 'mother', 'old', 'young', 'first', 'second', 'third', 'now', 'de', 'st', 'hon', 'rev'
]);

export function nameTokens(name) {
  return new Set(String(name).toLowerCase().replace(/[’']s\b/g, '').split(/[^a-zà-ÿ]+/)
    .filter(word => word.length > 1 && !TITLE_WORDS.has(word) && !/^[ivx]+$/.test(word))
    // "Witches" and "Witch" are the same word for this purpose.
    .map(word => word.replace(/(?:es|s)$/, '')));
}

// Two names are one person when the identifying words of one are all found
// in the other: "Scrooge" in "Ebenezer Scrooge", "King Richard III" in
// "Richard, Duke of Gloucester". Two Bennets who differ by a forename are not.
export function sameName(a, b) {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (!left.size || !right.size) return false;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const token of small) if (!large.has(token)) return false;
  return true;
}

// The wrong answers for a line: nobody who could be the speaker under another
// name ("Scrooge" beside "Ebenezer Scrooge", "Gloucester" beside "King Richard
// III"), nobody the line itself involves (the Weird Sisters beside the Third
// Witch), and no two names for one person among the wrong answers either.
function otherSpeakers(book, quotation) {
  const byId = new Map(book.characters.map(character => [character.id, character]));
  const involved = (quotation.characters || []).map(id => byId.get(id)?.name).filter(Boolean);
  const speakers = [...new Set(book.quotations.map(entry => entry.speaker).filter(Boolean))];
  const candidates = [
    ...book.characters.map(character => character.name),
    ...speakers.filter(speaker => !book.characters.some(character => sameName(character.name, speaker)))
  ];
  // Two names that are both in the cast list are two people, however alike:
  // Macbeth and Lady Macbeth are the pair most worth telling apart.
  const cast = new Set(book.characters.map(character => character.name));
  const alike = (a, b) => !(cast.has(a) && cast.has(b)) && sameName(a, b);
  const chosen = [];
  for (const name of candidates) {
    if (alike(name, quotation.speaker)) continue;
    if (involved.includes(name) && name !== quotation.speaker) continue;
    if (chosen.some(other => alike(other, name))) continue;
    chosen.push(name);
  }
  return chosen;
}

export function whoSaidIt(book, random = Math.random) {
  return book.quotations
    .filter(quotation => quotation.speaker && !/stage direction/i.test(quotation.speaker))
    .map(quotation => makeChoice({
      id: 'who:' + book.slug + ':' + quotation.id,
      stem: 'Who says this?',
      quote: quotation.text,
      correct: quotation.speaker,
      distractors: otherSpeakers(book, quotation),
      explain: quotation.analysis,
      source: quotationSource(book, quotation),
      book: bookRef(book),
      random
    }))
    .filter(Boolean);
}

// --- which book ------------------------------------------------------------

export function whichBook(books, random = Math.random) {
  const titles = books.map(book => book.title);
  if (titles.length < 4) return [];
  return books.flatMap(book => book.quotations.map(quotation => makeChoice({
    id: 'book:' + book.slug + ':' + quotation.id,
    stem: 'Which book is this from?',
    quote: quotation.text,
    correct: book.title,
    // Prefer other titles of the same form, so a play is not given away by
    // simply being the only play on the card.
    distractors: [
      ...books.filter(other => other.slug !== book.slug && other.form === book.form).map(other => other.title),
      ...titles.filter(title => title !== book.title)
    ],
    explain: quotation.analysis,
    source: quotationSource(book, quotation),
    book: bookRef(book),
    random
  }))).filter(Boolean);
}

// --- fill the line ---------------------------------------------------------

export function clozeWords(text, declared, random = Math.random) {
  if (declared && declared.length) return declared.slice(0, 3);
  const words = text.split(/\s+/);
  const candidates = words
    .map((word, index) => ({ index, clean: word.replace(/[^\p{L}'’-]/gu, '') }))
    .filter(entry => entry.clean.length > 3 && !STOP_WORDS.has(entry.clean.toLowerCase()));
  if (!candidates.length) return [];
  const count = Math.min(candidates.length, text.split(/\s+/).length > 14 ? 3 : 2);
  return sample(candidates, count, random)
    .sort((a, b) => a.index - b.index)
    .map(entry => entry.clean);
}

export function fillTheLine(book, random = Math.random) {
  const vocabulary = [...new Set(book.quotations.flatMap(quotation =>
    quotation.text.split(/\s+/).map(word => word.replace(/[^\p{L}'’-]/gu, ''))
  ).filter(word => word.length > 3 && !STOP_WORDS.has(word.toLowerCase())))];

  return book.quotations.map(quotation => {
    const hidden = clozeWords(quotation.text, quotation.cloze, random);
    if (!hidden.length) return null;
    let remaining = quotation.text;
    const segments = [];
    // The answer is the wording the line actually uses, not the wording the
    // record declared: 'Mock' and 'mock' are the same instruction to hide a
    // word, but only one of them puts the line back together.
    const answers = [];
    for (const word of hidden) {
      const at = remaining.toLowerCase().indexOf(word.toLowerCase());
      if (at < 0) return null;
      segments.push(remaining.slice(0, at));
      answers.push(remaining.slice(at, at + word.length));
      remaining = remaining.slice(at + word.length);
    }
    segments.push(remaining);
    const decoys = sample(vocabulary.filter(word => !answers.some(item => item.toLowerCase() === word.toLowerCase())), 4, random);
    return {
      kind: 'cloze',
      id: 'cloze:' + book.slug + ':' + quotation.id,
      stem: quotation.speaker ? 'Complete the line spoken by ' + quotation.speaker + '.' : 'Complete the line.',
      segments,
      answer: answers,
      bank: shuffle([...answers, ...decoys], random),
      explain: quotation.analysis,
      source: quotationSource(book, quotation),
      book: bookRef(book)
    };
  }).filter(Boolean);
}

// --- order the plot --------------------------------------------------------

export function orderThePlot(book, random = Math.random) {
  const rounds = [];
  if (book.structure.length >= 4) {
    rounds.push({
      kind: 'order',
      id: 'order:' + book.slug + ':structure',
      stem: 'Put the ' + (book.form === 'play' ? 'acts' : 'sections') + ' of ' + book.title + ' back in order.',
      items: shuffle(book.structure.map(stage => ({ id: stage.id, label: stage.label, text: stage.title })), random),
      answer: book.structure.map(stage => stage.id),
      explain: book.summary,
      source: book.title,
      book: bookRef(book)
    });
  }
  for (const stage of book.structure) {
    const scenes = stage.scenes || [];
    if (scenes.length < 4) continue;
    rounds.push({
      kind: 'order',
      id: 'order:' + book.slug + ':' + stage.id,
      stem: 'Put ' + stage.label + ' back in order.',
      items: shuffle(scenes.map(scene => ({ id: scene.ref, label: scene.ref, text: scene.summary })), random),
      answer: scenes.map(scene => scene.ref),
      explain: stage.summary,
      source: book.title + ', ' + stage.label,
      book: bookRef(book)
    });
  }
  return rounds;
}

// --- theme and technique ---------------------------------------------------

export function themeMatch(book, random = Math.random) {
  const names = book.themes.map(theme => theme.name);
  if (names.length < 4) return [];
  const byId = new Map(book.themes.map(theme => [theme.id, theme]));
  return book.quotations
    .filter(quotation => (quotation.themes || []).length === 1 && byId.has(quotation.themes[0]))
    .map(quotation => {
      const theme = byId.get(quotation.themes[0]);
      return makeChoice({
        id: 'theme:' + book.slug + ':' + quotation.id,
        stem: 'Which theme does this line carry?',
        quote: quotation.text,
        correct: theme.name,
        distractors: names.filter(name => name !== theme.name),
        explain: theme.summary,
        source: quotationSource(book, quotation),
        book: bookRef(book),
        random
      });
    })
    .filter(Boolean);
}

export function techniqueSpotter(book, random = Math.random) {
  const names = book.techniques.map(technique => technique.name);
  if (names.length < 4) return [];
  const byId = new Map(book.techniques.map(technique => [technique.id, technique]));
  return book.quotations
    .filter(quotation => (quotation.techniques || []).length === 1 && byId.has(quotation.techniques[0]))
    .map(quotation => {
      const technique = byId.get(quotation.techniques[0]);
      return makeChoice({
        id: 'technique:' + book.slug + ':' + quotation.id,
        stem: 'Which technique is doing the work here?',
        quote: quotation.text,
        correct: technique.name,
        distractors: names.filter(name => name !== technique.name),
        explain: technique.definition + ' ' + technique.inThisBook,
        source: quotationSource(book, quotation),
        book: bookRef(book),
        random
      });
    })
    .filter(Boolean);
}

// --- character identification ----------------------------------------------

// Articles are not part of a name, so masking them would blank out half the
// clue: "The creature" hides "creature", not "the".
const NAME_NOISE = new Set(['the', 'and', 'of', 'a', 'an', 'to', 'in']);

export function maskName(text, name) {
  const parts = [name, ...name.split(/\s+/)]
    .filter(part => part.length > 2 && !NAME_NOISE.has(part.toLowerCase()));
  let masked = text;
  for (const part of [...new Set(parts)].sort((a, b) => b.length - a.length)) {
    masked = masked.replace(new RegExp('\\b' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(?:'s|’s)?\\b", 'gi'), '———');
  }
  return masked;
}

export function characterIdentification(book, random = Math.random) {
  const names = book.characters.map(character => character.name);
  if (names.length < 4) return [];
  return book.characters
    .map(character => makeChoice({
      id: 'character:' + book.slug + ':' + character.id,
      stem: 'Which character is described here?',
      // A clue is written not to name the character, but the masking runs over
      // it anyway: a game that gives away its own answer is worse than no game.
      quote: maskName(character.clue || character.summary, character.name),
      correct: character.name,
      distractors: names.filter(name => name !== character.name),
      explain: character.summary,
      source: book.title,
      book: bookRef(book),
      random
    }))
    .filter(Boolean);
}

// --- context sprint --------------------------------------------------------

export function contextSprint(books, random = Math.random) {
  const entries = books.flatMap(book => (book.timeline || []).map(entry => ({ ...entry, book })));
  const years = [...new Set(entries.map(entry => entry.year))];
  if (years.length < 6) return [];
  return entries.map(entry => {
    // Nearby years make a real test; a spread of centuries makes a giveaway.
    const near = years
      .filter(year => year !== entry.year && Math.abs(year - entry.year) <= 80)
      .sort(() => 0);
    const distractors = (near.length >= 3 ? near : years.filter(year => year !== entry.year)).map(formatYear);
    return makeChoice({
      id: 'context:' + entry.book.slug + ':' + entry.year + ':' + hashString(entry.label).toString(36),
      stem: 'In which year?',
      quote: entry.label,
      correct: formatYear(entry.year),
      distractors,
      explain: entry.detail || '',
      source: entry.book.title,
      book: bookRef(entry.book),
      random
    });
  }).filter(Boolean);
}

// --- quotation to speaker across the whole library -------------------------

export function openingLines(books, random = Math.random) {
  const withOpenings = books.filter(book => book.openingLine);
  if (withOpenings.length < 4) return [];
  return withOpenings.map(book => makeChoice({
    id: 'opening:' + book.slug,
    stem: 'Which book opens like this?',
    quote: book.openingLine,
    correct: book.title,
    distractors: withOpenings.filter(other => other.slug !== book.slug).map(other => other.title),
    explain: book.summary,
    source: book.title,
    book: bookRef(book),
    random
  })).filter(Boolean);
}

// --- a mixed round -----------------------------------------------------------
//
// A few questions of every kind the book supports, so a revision session
// changes its footing every question instead of drilling one habit.
export function mixedRound(book, random = Math.random) {
  const questions = [];
  for (const [id, builder] of Object.entries(GAME_BUILDERS)) {
    if (builder.scope !== 'book' || id === 'mixed-round') continue;
    questions.push(...sample(builder.build(book, random), 3, random));
  }
  return questions;
}

// --- assembling a round ----------------------------------------------------

export const GAME_BUILDERS = {
  'who-said-it': { scope: 'book', build: whoSaidIt },
  'fill-the-line': { scope: 'book', build: fillTheLine },
  'order-the-plot': { scope: 'book', build: orderThePlot },
  'theme-match': { scope: 'book', build: themeMatch },
  'technique-spotter': { scope: 'book', build: techniqueSpotter },
  'character-identification': { scope: 'book', build: characterIdentification },
  'mixed-round': { scope: 'book', build: mixedRound },
  'which-book': { scope: 'library', build: whichBook },
  'context-sprint': { scope: 'library', build: contextSprint },
  'opening-lines': { scope: 'library', build: openingLines }
};

export function buildRound(gameId, source, { length = 10, seed = null } = {}) {
  const builder = GAME_BUILDERS[gameId];
  if (!builder) throw new Error('Unknown game: ' + gameId);
  const random = seed === null ? Math.random : seededRandom(seed);
  const questions = builder.build(source, random);
  return shuffle(questions, random).slice(0, length);
}

// The passage of the day: the same quotation for everybody, chosen by the date.
export function dailyPassage(index, day) {
  const quotations = index.books.flatMap(book => book.quotations.map(quotation => ({
    ...quotation, bookSlug: book.slug, bookTitle: book.title, bookHref: book.href, author: book.author
  })));
  if (!quotations.length) return null;
  return pick(quotations, seededRandom(hashString('astor-strip:' + day)));
}

// The Daily Five: one question from each of five kinds, chosen by the date so
// that everybody playing on the same day plays the same round, with no server
// and no account.
export function dailyRound(index, day) {
  const seed = hashString('astor-daily:' + day);
  const random = seededRandom(seed);
  const books = index.books;
  const withQuotations = books.filter(book => book.quotations.length >= 6);
  if (!withQuotations.length) return [];

  const dayBook = pick(withQuotations, random);
  const plan = [
    () => whoSaidIt(dayBook, random),
    () => whichBook(books, random),
    () => themeMatch(dayBook, random),
    () => fillTheLine(dayBook, random),
    () => contextSprint(books, random)
  ];

  const round = [];
  const used = new Set();
  for (const step of plan) {
    const options = step().filter(question => question && !used.has(question.id));
    if (!options.length) continue;
    const chosen = pick(options, random);
    used.add(chosen.id);
    round.push(chosen);
  }
  // A short day is better than a repeated question, but the puzzle should still
  // be five long wherever the data allows it.
  if (round.length < 5) {
    const spare = shuffle([
      ...characterIdentification(dayBook, random),
      ...techniqueSpotter(dayBook, random),
      ...openingLines(books, random)
    ], random).filter(question => question && !used.has(question.id));
    while (round.length < 5 && spare.length) {
      const next = spare.shift();
      used.add(next.id);
      round.push(next);
    }
  }
  return round.slice(0, 5);
}

// The shareable grid: five marks, no answers given away.
export function resultGrid(results) {
  return results.map(correct => (correct ? '▣' : '▢')).join('');
}
