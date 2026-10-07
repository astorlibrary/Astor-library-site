// Checks that every quotation in a study record appears in its source text.
//
//   node scripts/verify-quotations.js                 every record that names a source URL
//   node scripts/verify-quotations.js utopia dracula  only these
//
// A record opts in by giving `sourceText.url`: a plain-text, public-domain
// transcription (Project Gutenberg's "Plain Text UTF-8" files are ideal). The
// text is fetched once and kept in .cache/sources/, which is not committed.
// Quotation and source are reduced to the same form, letters and digits only,
// with spelling untouched, and the quotation must then be found whole. An
// ellipsis in a quotation splits it into parts that must appear in order and
// close together. The same check runs on `openingLine`.
//
// Standard Ebooks texts mark each chapter with a section id, so for those
// records the quotation's reference is checked too: a quotation filed under
// "Chapter XII" or "Book II, Chapter 3" has to be found in that chapter.
//
// Exit code 1 if anything is missing or misfiled, so it can gate a build.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cacheDir = path.join(root, '.cache', 'sources');

function normalise(text) {
  return String(text)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/æ/gi, 'ae').replace(/œ/gi, 'oe')
    .toLowerCase()
    // Dashes part words; a hyphen joins them, and editions disagree about
    // which words take one ("ape-like", "apelike"), so it is dropped.
    .replace(/--+|[\u2013\u2014]/g, ' ')
    .replace(/(?<=[a-z])-(?=[a-z])/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Standard Ebooks and the MIT (Moby) Shakespeare publish their texts as web
// pages, so their markup is dropped before the comparison.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

function textOf(body, url) {
  if (!/<(?:html|body)\b/i.test(body)) return body;
  let text = body.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ');
  // In the MIT Shakespeare a stage direction is a paragraph in italics, and
  // quotations from the plays leave it out.
  if (/shakespeare\.mit\.edu/.test(url)) text = text.replace(/<p>\s*<i>[\s\S]*?<\/i>\s*<\/p>/gi, ' ');
  // A chapter's section id (chapter-12, chapter-1-3, letter-2, book-9)
  // becomes a word that survives normalising, for the reference check.
  text = text.replace(/<section\b[^>]*\bid="((?:chapter|letter|book)-\d+(?:-\d+)*)"[^>]*>/gi, (_, id) => ' qzq' + id.replace(/-/g, 'x') + 'qzq ');
  return text
    // Block elements part words; inline ones (an italic title, emphasis on a
    // syllable) can sit inside a word, so they are removed without a space.
    .replace(/<\/?(?:p|br|div|h[1-6]|li|ul|ol|dl|dt|dd|table|tr|td|th|section|article|header|footer|blockquote|figure|figcaption|hr|title|body|html)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&([a-z]+);/gi, (entity, name) => ENTITIES[name.toLowerCase()] ?? ' ');
}

async function sourceFor(url) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, url.replace(/[^a-z0-9]+/gi, '_').slice(-120));
  if (!fs.existsSync(file)) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error('could not fetch ' + url + ' (' + response.status + ')');
    fs.writeFileSync(file, await response.text());
  }
  return normalise(textOf(fs.readFileSync(file, 'utf8'), url));
}

// Every part of the quotation, in order, each starting within a few hundred
// words of the last.
function locate(source, text) {
  const parts = String(text).split(/\s*(?:…|\.\.\.|\[\.\.\.\]|\[…\])\s*/).map(normalise).filter(Boolean);
  if (!parts.length) return -1;
  for (let start = source.indexOf(parts[0]); start !== -1; start = source.indexOf(parts[0], start + 1)) {
    let at = start + parts[0].length;
    let ok = true;
    for (const part of parts.slice(1)) {
      const next = source.indexOf(part, at);
      if (next === -1 || next - at > 2500) { ok = false; break; }
      at = next + part.length;
    }
    if (ok) return start;
  }
  return -1;
}

const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100 };
const ORDINAL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };
function numberOf(value) {
  if (/^\d+$/.test(value)) return Number(value);
  const digits = value.toLowerCase().split('').map(letter => ROMAN[letter]);
  return digits.reduce((total, digit, index) => total + (digit < (digits[index + 1] || 0) ? -digit : digit), 0);
}

// The section id a reference points to, in the marker form textOf leaves:
// "Chapter XII" -> chapterx12, "Book II, Chapter 3" -> chapterx2x3.
function sectionFor(reference) {
  const ref = String(reference || '').trim();
  const n = '([IVXLC]+|\\d+)';
  let match;
  if ((match = ref.match(new RegExp('^(?:Chapter|Stave) ' + n + '$')))) return 'chapterx' + numberOf(match[1]);
  if ((match = ref.match(new RegExp('^(?:Part|Book|Volume) ' + n + ', [Cc]hapter ' + n + '$')))) return 'chapterx' + numberOf(match[1]) + 'x' + numberOf(match[2]);
  if ((match = ref.match(/^(First|Second|Third) Period, Chapter ([IVXLC]+)$/))) return 'chapterx' + ORDINAL[match[1].toLowerCase()] + 'x' + numberOf(match[2]);
  if ((match = ref.match(/^(First|Second|Third) Period, (\w+) Narrative, Chapter ([IVXLC]+)$/))) return 'chapterx' + ORDINAL[match[1].toLowerCase()] + 'x' + ORDINAL[match[2].toLowerCase()] + 'x' + numberOf(match[3]);
  if ((match = ref.match(new RegExp('^Letter ' + n + '$')))) return 'letterx' + numberOf(match[1]);
  if ((match = ref.match(new RegExp('^Book ' + n + '$')))) return 'bookx' + numberOf(match[1]);
  return null;
}

// The last section marker before a position in the source.
function sectionAt(markers, index) {
  let last = null;
  for (const marker of markers) {
    if (marker.index > index) break;
    last = marker.id;
  }
  return last;
}

function found(source, text) {
  return locate(source, text) !== -1;
}

async function main() {
  const wanted = process.argv.slice(2);
  const dir = path.join(root, 'data', 'books');
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.json'))
    .filter(name => !wanted.length || wanted.includes(name.replace(/\.json$/, '')));
  let checked = 0;
  let missing = 0;
  let skipped = 0;
  let misfiled = 0;
  let placed = 0;
  for (const name of files) {
    const book = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const urls = [].concat(book.sourceText?.url || []);
    if (!urls.length) { skipped += 1; continue; }
    const source = (await Promise.all(urls.map(sourceFor))).join(' ');
    const lines = [
      ...(book.openingLine ? [{ id: 'openingLine', text: book.openingLine }] : []),
      ...(book.quotations || [])
    ];
    const markers = [...source.matchAll(/qzq([a-z0-9]+?)qzq/g)].map(match => ({ index: match.index, id: match[1] }));
    const failures = [];
    for (const line of lines) {
      const index = locate(source, line.text);
      if (index === -1) { failures.push(line); continue; }
      const wantedSection = markers.length ? sectionFor(line.reference) : null;
      const actualSection = wantedSection && sectionAt(markers, index);
      // Compare only like with like: a "Chapter 12" reference against a
      // chapter-12 marker, not against a book's chapter-2-12.
      if (!wantedSection || !actualSection || actualSection.replace(/\d+/g, 'n') !== wantedSection.replace(/\d+/g, 'n')) continue;
      placed += 1;
      if (actualSection !== wantedSection) {
        misfiled += 1;
        console.log('  WRONG PLACE ' + line.id + ': filed under ' + line.reference + ', found in ' + actualSection.replace(/^([a-z]+)x/, '$1 ').replace(/x/g, '-'));
      }
    }
    checked += lines.length;
    missing += failures.length;
    console.log(book.slug + ': ' + (lines.length - failures.length) + '/' + lines.length + ' found');
    for (const line of failures) console.log('  NOT FOUND ' + line.id + ': ' + String(line.text).slice(0, 90));
  }
  console.log(checked + ' checked, ' + missing + ' missing; ' + placed + ' chapter references checked, ' + misfiled + ' wrong' + (skipped ? ', ' + skipped + ' records name no source URL' : ''));
  if (wanted.length && !files.length) { console.error('No such record.'); process.exit(1); }
  if (missing || misfiled) process.exit(1);
}

main().catch(error => { console.error(error.message); process.exit(1); });
