// Structured study content, one file per title, in data/books/<slug>.json.
//
// A single data file feeds the study toolkit on the book page, the study page,
// the quotation explorer, the timeline, the character map, the technique
// glossary, every revision game, the flashcard decks, the daily puzzle and the
// teachers' printables. Adding a title to the whole platform means adding one
// file here.
//
// The shape is described and enforced in validateBook() below. Keep the
// validator and any new field in step: check-site.js and the test suite both
// run it, so an unchecked field is a field that will drift.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'books');

const FORMS = ['play', 'novel', 'novella', 'story collection', 'poem', 'memoir', 'non-fiction'];
const TIMELINE_KINDS = ['work', 'author', 'context', 'reception'];
const RELATIONSHIP_KINDS = ['family', 'marriage', 'love', 'ally', 'rival', 'enemy', 'service', 'mentor', 'doubling'];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function slugCase(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Sentence-count guard: the editorial guide asks for connected prose, and a
// one-word "summary" is the usual way a data file goes thin without anybody
// noticing until it reaches a page.
function wordCount(value) {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function validateBook(book, fileName) {
  const problems = [];
  const at = where => fileName + ' ' + where;

  if (!isPlainObject(book)) return [fileName + ' is not an object'];

  for (const field of ['slug', 'title', 'author', 'href', 'form', 'period', 'summary', 'referenceStyle']) {
    if (!nonEmptyString(book[field])) problems.push(at('is missing ' + field));
  }
  if (book.slug && !slugCase(book.slug)) problems.push(at('has a slug that is not lower-case and hyphenated'));
  if (book.slug && fileName !== book.slug + '.json') problems.push(at('does not match its slug'));
  if (book.form && !FORMS.includes(book.form)) problems.push(at('has an unknown form "' + book.form + '"'));
  if (book.summary && wordCount(book.summary) < 25) problems.push(at('has a summary too short to be useful'));
  if (book.href && !/^\/[a-z0-9-/]+\/$/.test(book.href)) problems.push(at('has an href that is not a site path'));
  if (book.studyHref && !/^\/[a-z0-9-/]+\/$/.test(book.studyHref)) problems.push(at('has a studyHref that is not a site path'));
  if (book.firstPublished !== undefined && !Number.isInteger(book.firstPublished)) problems.push(at('has a non-integer firstPublished'));
  if (book.readingTime !== undefined && !(Number.isInteger(book.readingTime) && book.readingTime > 0)) problems.push(at('has an invalid readingTime'));
  if (book.difficulty !== undefined && !(Number.isInteger(book.difficulty) && book.difficulty >= 1 && book.difficulty <= 5)) {
    problems.push(at('has a difficulty outside 1-5'));
  }
  if (!isPlainObject(book.sourceText) || !nonEmptyString(book.sourceText.label)) {
    problems.push(at('is missing the text its quotations were checked against'));
  }

  const listField = (name, minimum) => {
    if (!Array.isArray(book[name])) { problems.push(at('is missing the ' + name + ' list')); return []; }
    if (book[name].length < minimum) problems.push(at('needs at least ' + minimum + ' ' + name));
    return book[name];
  };

  const seen = new Map();
  const claimId = (group, id, label) => {
    if (!slugCase(id)) { problems.push(at('has an invalid ' + group + ' id "' + id + '"')); return; }
    const key = group + ':' + id;
    if (seen.has(key)) problems.push(at('repeats the ' + group + ' id "' + id + '"'));
    seen.set(key, label);
  };

  const structure = listField('structure', 3);
  for (const stage of structure) {
    if (!isPlainObject(stage)) { problems.push(at('has a malformed structure entry')); continue; }
    claimId('stage', stage.id, stage.label);
    if (!nonEmptyString(stage.label)) problems.push(at('has a structure entry without a label'));
    if (!nonEmptyString(stage.title)) problems.push(at('has a structure entry without a title'));
    if (!nonEmptyString(stage.summary) || wordCount(stage.summary) < 12) {
      problems.push(at('has a thin summary for structure "' + (stage.id || '?') + '"'));
    }
    if (stage.scenes !== undefined) {
      if (!Array.isArray(stage.scenes)) problems.push(at('has non-list scenes in "' + stage.id + '"'));
      else for (const scene of stage.scenes) {
        if (!nonEmptyString(scene?.ref) || !nonEmptyString(scene?.summary)) {
          problems.push(at('has an incomplete scene in "' + stage.id + '"'));
        }
      }
    }
  }
  const stageIds = new Set(structure.map(stage => stage?.id).filter(Boolean));

  const characters = listField('characters', 4);
  for (const character of characters) {
    if (!isPlainObject(character)) { problems.push(at('has a malformed character entry')); continue; }
    claimId('character', character.id, character.name);
    if (!nonEmptyString(character.name)) problems.push(at('has a character without a name'));
    if (!nonEmptyString(character.summary) || wordCount(character.summary) < 12) {
      problems.push(at('has a thin summary for character "' + (character.id || '?') + '"'));
    }
    for (const relationship of character.relationships || []) {
      if (!nonEmptyString(relationship?.to)) problems.push(at('has a relationship without a target on "' + character.id + '"'));
      if (!nonEmptyString(relationship?.label)) problems.push(at('has an unlabelled relationship on "' + character.id + '"'));
      if (relationship?.kind && !RELATIONSHIP_KINDS.includes(relationship.kind)) {
        problems.push(at('has an unknown relationship kind "' + relationship.kind + '" on "' + character.id + '"'));
      }
      for (const stage of relationship?.stages || []) {
        if (!stageIds.has(stage)) problems.push(at('points a relationship at the unknown stage "' + stage + '"'));
      }
    }
  }
  const characterIds = new Set(characters.map(character => character?.id).filter(Boolean));

  const themes = listField('themes', 3);
  for (const theme of themes) {
    if (!isPlainObject(theme)) { problems.push(at('has a malformed theme entry')); continue; }
    claimId('theme', theme.id, theme.name);
    if (!nonEmptyString(theme.name)) problems.push(at('has a theme without a name'));
    if (!nonEmptyString(theme.summary) || wordCount(theme.summary) < 15) {
      problems.push(at('has a thin summary for theme "' + (theme.id || '?') + '"'));
    }
  }
  const themeIds = new Set(themes.map(theme => theme?.id).filter(Boolean));

  const techniques = Array.isArray(book.techniques) ? book.techniques : [];
  if (!Array.isArray(book.techniques)) problems.push(at('is missing the techniques list'));
  for (const technique of techniques) {
    if (!isPlainObject(technique)) { problems.push(at('has a malformed technique entry')); continue; }
    claimId('technique', technique.id, technique.name);
    if (!nonEmptyString(technique.name)) problems.push(at('has a technique without a name'));
    if (!nonEmptyString(technique.definition)) problems.push(at('has a technique without a definition'));
    if (!nonEmptyString(technique.inThisBook)) problems.push(at('has a technique with no bearing on this book'));
  }
  const techniqueIds = new Set(techniques.map(technique => technique?.id).filter(Boolean));

  const quotations = listField('quotations', 8);
  for (const quotation of quotations) {
    if (!isPlainObject(quotation)) { problems.push(at('has a malformed quotation entry')); continue; }
    claimId('quotation', quotation.id, quotation.text);
    if (!nonEmptyString(quotation.text)) problems.push(at('has a quotation without text'));
    // Every quotation on the site must be checkable. No reference, no publication.
    if (!nonEmptyString(quotation.reference)) problems.push(at('has a quotation without a reference: "' + String(quotation.text).slice(0, 40) + '"'));
    if (!nonEmptyString(quotation.source)) problems.push(at('has a quotation without a source: "' + String(quotation.text).slice(0, 40) + '"'));
    if (!nonEmptyString(quotation.analysis) || wordCount(quotation.analysis) < 15) {
      problems.push(at('has a quotation without analysis: "' + String(quotation.text).slice(0, 40) + '"'));
    }
    if (book.form === 'play' && !nonEmptyString(quotation.speaker)) {
      problems.push(at('has an unattributed speech: "' + String(quotation.text).slice(0, 40) + '"'));
    }
    for (const id of quotation.themes || []) if (!themeIds.has(id)) problems.push(at('links quotation "' + quotation.id + '" to the unknown theme "' + id + '"'));
    for (const id of quotation.techniques || []) if (!techniqueIds.has(id)) problems.push(at('links quotation "' + quotation.id + '" to the unknown technique "' + id + '"'));
    for (const id of quotation.characters || []) if (!characterIds.has(id)) problems.push(at('links quotation "' + quotation.id + '" to the unknown character "' + id + '"'));
    if (quotation.stage && !stageIds.has(quotation.stage)) problems.push(at('places quotation "' + quotation.id + '" in the unknown stage "' + quotation.stage + '"'));
    for (const word of quotation.cloze || []) {
      if (!nonEmptyString(word)) problems.push(at('has an empty cloze word on "' + quotation.id + '"'));
      else if (!String(quotation.text).toLowerCase().includes(String(word).toLowerCase())) {
        problems.push(at('hides the word "' + word + '", which is not in quotation "' + quotation.id + '"'));
      }
    }
  }

  for (const entry of book.timeline || []) {
    if (!Number.isInteger(entry?.year)) problems.push(at('has a timeline entry without a year'));
    if (!nonEmptyString(entry?.label)) problems.push(at('has a timeline entry without a label'));
    if (entry?.kind && !TIMELINE_KINDS.includes(entry.kind)) problems.push(at('has an unknown timeline kind "' + entry.kind + '"'));
  }

  for (const place of book.places || []) {
    if (!nonEmptyString(place?.name)) problems.push(at('has a place without a name'));
    if (typeof place?.lat !== 'number' || place.lat < -90 || place.lat > 90) problems.push(at('has a place with an invalid latitude: ' + place?.name));
    if (typeof place?.lon !== 'number' || place.lon < -180 || place.lon > 180) problems.push(at('has a place with an invalid longitude: ' + place?.name));
  }

  for (const question of book.essayQuestions || []) {
    if (!nonEmptyString(question?.question)) problems.push(at('has an essay prompt without a question'));
    if (!Array.isArray(question?.plan) || question.plan.length < 3) problems.push(at('has an essay prompt without a plan: ' + String(question?.question).slice(0, 40)));
  }

  for (const video of book.videos || []) {
    // Nothing unverified reaches a reader. A video needs a provider we trust,
    // an id and a plain description of what it is.
    for (const field of ['title', 'provider', 'id', 'url', 'note']) {
      if (!nonEmptyString(video?.[field])) problems.push(at('has a video missing ' + field));
    }
  }

  for (const related of book.related || []) {
    if (!/^\/[a-z0-9-/]+\/$/.test(related?.href || '')) problems.push(at('has a related link that is not a site path'));
    if (!nonEmptyString(related?.why)) problems.push(at('has a related link with no reason to follow it'));
  }

  return problems;
}

function loadBooks() {
  if (!fs.existsSync(dataDirectory)) return [];
  return fs.readdirSync(dataDirectory)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => {
      const book = JSON.parse(fs.readFileSync(path.join(dataDirectory, name), 'utf8'));
      Object.defineProperty(book, 'fileName', { value: name, enumerable: false });
      return book;
    });
}

function validateAll(books) {
  return books.flatMap(book => validateBook(book, book.fileName || (book.slug || 'unknown') + '.json'));
}

module.exports = {
  dataDirectory,
  FORMS,
  TIMELINE_KINDS,
  RELATIONSHIP_KINDS,
  loadBooks,
  validateBook,
  validateAll
};
