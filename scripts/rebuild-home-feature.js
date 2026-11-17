// The homepage's close reading of the week.
//
// Under the seasonal hero the homepage prints one short passage with two of
// its notes, and ways on to the whole close reading, the book's
// study guide and its revision questions. Nothing is written for it: the
// passage, the marked phrases and the notes are read out of the close reading
// itself, under /passage-room/, so refreshing the homepage is a matter of
// naming a different reading in scripts/home-features.json.
//
// Every reading in the plan is published as a fragment under
// /assets/home-features/, and one of them is built into index.html. The
// build puts in the reading for the day it runs (build-static.js), and a few
// lines of script on the homepage move on to the next one when a Monday
// passes between deploys. The reading built into the committed index.html
// stays as it is until ASTOR_HOME_FEATURE names another, so regenerating the
// pages on a different day changes nothing.

const fs = require('fs');
const path = require('path');
const { astorHomeFeature } = require('./home-feature-rules');
const { loadBooks } = require('./book-data');

const root = process.cwd();
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'home-features.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, 'passage-cards.json'), 'utf8'));
const discovery = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'content-index.json'), 'utf8'));
const thumbnails = fs.existsSync(path.join(root, 'assets', 'book-thumbnails.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'assets', 'book-thumbnails.json'), 'utf8')) : {};
const guides = new Map(loadBooks().map(book => [book.href, book]));

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const plain = html => String(html).replace(/<sup>[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = html => plain(html).split(' ').filter(Boolean).length;
const marksIn = html => [...String(html).matchAll(/data-passage-mark="([^"]+)"/g)].map(match => match[1]);

// The opening of the passage: whole paragraphs or stanzas until at least two
// marked phrases are in, stopping early at the end of a line (verse) or of a
// sentence (prose) once the piece is long enough for a homepage.
const VERSE_LINES = 9;
const PROSE_WORDS = 95;

function cutVerse(paragraph, wanted) {
  const lines = paragraph.split(/<br\s*\/?>/);
  const kept = [];
  let open = 0;
  let found = 0;
  for (const line of lines) {
    kept.push(line);
    open += (line.match(/<mark\b/g) || []).length - (line.match(/<\/mark>/g) || []).length;
    found += (line.match(/<\/mark>/g) || []).length;
    if (found >= wanted && open === 0) break;
  }
  // A cut that lands mid-line may leave the first words of the next sentence
  // hanging ("…raptures. Not for this"). End on the sentence instead.
  if (kept.length < lines.length) {
    const last = kept[kept.length - 1];
    const tail = last.slice(last.lastIndexOf('</mark>') + 7);
    if (tail.trim() && !/[.!?…:;,—–]\s*$/.test(tail)) kept[kept.length - 1] = last.slice(0, last.lastIndexOf('</mark>') + 7);
  }
  return kept.join('<br>');
}

function cutProse(paragraph, wanted) {
  let at = 0;
  for (let n = 0; n < wanted; n++) {
    const next = paragraph.indexOf('</mark>', at);
    if (next === -1) return paragraph;
    at = next + 7;
  }
  // The end of the sentence the last wanted phrase sits in, outside any mark.
  const rest = paragraph.slice(at);
  const stop = /[.!?…][”’"']*(?=\s|$)/g;
  let match;
  while ((match = stop.exec(rest))) {
    const upTo = rest.slice(0, match.index);
    const open = (upTo.match(/<mark\b/g) || []).length - (upTo.match(/<\/mark>/g) || []).length;
    if (open === 0 && !/<[^>]*$/.test(upTo)) return paragraph.slice(0, at + match.index + match[0].length);
  }
  return paragraph;
}

function excerpt(passageHtml, isVerse) {
  const paragraphs = [...passageHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1].trim());
  const kept = [];
  let marks = 0;
  let size = 0;
  for (const paragraph of paragraphs) {
    const here = marksIn(paragraph).length;
    const measure = isVerse ? paragraph.split(/<br\s*\/?>/).length : wordCount(paragraph);
    const limit = isVerse ? VERSE_LINES : PROSE_WORDS;
    if (marks >= 2 && size + measure > limit) break;
    if (size + measure > limit && here) {
      // Too long to print whole: keep as far as the phrases still needed (two
      // in all, or one more if this paragraph is the first to carry any).
      const wanted = Math.max(1, Math.min(here, marks >= 2 ? 0 : 2 - marks));
      const cut = isVerse ? cutVerse(paragraph, wanted) : cutProse(paragraph, wanted);
      kept.push(cut);
      marks += marksIn(cut).length;
      break;
    }
    kept.push(paragraph);
    marks += here;
    size += measure;
    if (marks >= 2) break;
  }
  return kept;
}

function feature(slug) {
  const file = path.join(root, 'passage-room', slug, 'index.html');
  if (!fs.existsSync(file)) throw new Error('scripts/home-features.json names a close reading that does not exist: ' + slug);
  const html = fs.readFileSync(file, 'utf8');
  const entry = (discovery.passages || []).find(item => item.href === '/passage-room/' + slug + '/');
  if (!entry) throw new Error(slug + ' is not in the discovery index');
  const spread = (html.match(/<section class="passage-spread"[\s\S]*?<\/section>/) || [''])[0];
  const text = spread.match(/<blockquote class="passage-text([^"]*)">([\s\S]*?)<\/blockquote>/);
  if (!text) throw new Error(slug + ' has no passage text to feature');
  const isVerse = !/\bpassage-prose\b/.test(text[1]);
  // Line numbers belong to the full passage; a short extract does not need them.
  const paragraphs = excerpt(text[2].replace(/<span class="ln"[^>]*>[\s\S]*?<\/span>/g, ''), isVerse);
  const used = marksIn(paragraphs.join(' ')).slice(0, 2);
  if (used.length < 2) throw new Error(slug + ' does not give the homepage two marked phrases near its opening');

  // Two phrases keep their marks, so every number printed in the passage has
  // its note beneath it and the section stays short.
  let seen = 0;
  const body = paragraphs.map(paragraph => '<p>' + paragraph
    .replace(/<mark\b[^>]*data-passage-mark="[^"]+"[^>]*>([\s\S]*?)<\/mark>/g, (whole, inner) => {
      seen += 1;
      return seen <= 2 ? '<mark>' + inner + '</mark>' : inner.replace(/<sup>[\s\S]*?<\/sup>/g, '');
    })
    // The number follows any punctuation that closes the phrase, as a note
    // number does in print, so a comma is never left to start a line.
    .replace(/(<sup>\d+<\/sup>)<\/mark>([,.;:!?”’]+)/g, '</mark>$2$1') + '</p>').join('');

  const notes = used.map(key => {
    const note = spread.match(new RegExp('<article data-passage-note="' + key + '"><span>(\\d+)</span><h2>([\\s\\S]*?)</h2><p>([\\s\\S]*?)</p></article>'));
    if (!note) throw new Error(slug + ' has no note for its marked phrase "' + key + '"');
    return { number: note[1], heading: note[2], text: note[3] };
  });
  const total = marksIn(spread).length;

  const title = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || entry.title;
  const deck = (html.match(/<section class="passage-reading-hero">[\s\S]*?<p class="deck">([\s\S]*?)<\/p>/) || [])[1] || '';
  const where = cards[slug]?.small || '';
  const bookHref = (entry.relatedBooks || [])[0] || '';
  const book = (discovery.books || []).find(item => item.href === bookHref);
  const guide = guides.get(bookHref);
  const bookTitle = guide ? String(guide.title).split(';')[0].trim() : (book ? book.title : '');
  const cover = book && thumbnails[book.image] ? thumbnails[book.image].replace(/\.jpg$/, '-360.jpg') : '';
  const href = '/passage-room/' + slug + '/';
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  const routes = [];
  if (guide) routes.push('<a href="/guides/' + escapeHtml(guide.slug) + '/">' + escapeHtml(bookTitle) + ' study guide</a>');
  if (guide) routes.push('<a href="/play/?book=' + escapeHtml(guide.slug) + '">Revise ' + escapeHtml(bookTitle) + '</a>');
  if (book) routes.push('<a href="' + escapeHtml(bookHref) + '">The Astor edition</a>');

  const coverLink = cover
    ? '<a class="home-feature-book" href="' + escapeHtml(bookHref) + '"><img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(bookTitle) + ', Astor Library edition" width="120" height="180" loading="lazy" decoding="async"></a>'
    : '';

  return '<section class="home-feature" data-home-feature="' + escapeHtml(slug) + '" aria-labelledby="home-feature-title">' +
    '<div class="home-wrap home-feature-grid">' +
    '<header class="home-feature-head">' +
    '<p class="home-feature-kicker">A close reading for the week</p>' +
    '<h2 id="home-feature-title"><a href="' + href + '">' + title + '</a></h2>' +
    (where ? '<p class="home-feature-where">' + escapeHtml(where) + '</p>' : '') +
    (deck ? '<p class="home-feature-deck">' + deck + '</p>' : '') +
    '</header>' +
    '<div class="home-feature-page">' +
    '<blockquote class="home-feature-text' + (isVerse ? ' is-verse' : ' is-prose') + '">' + body + '</blockquote>' +
    '<ol class="home-feature-notes">' + notes.map(note =>
      '<li><span class="home-feature-number" aria-hidden="true">' + note.number + '</span><h3>' + note.heading + '</h3><p>' + note.text + '</p></li>').join('') + '</ol>' +
    '</div>' +
    '<div class="home-feature-on">' +
    '<p class="home-feature-actions"><a class="home-button" href="' + href + '">Read all ' + (words[total] || total) + ' notes</a></p>' +
    (routes.length ? '<div class="home-feature-book-row">' + coverLink + '<p class="home-feature-routes">' + routes.join('') + '</p></div>' : '') +
    '</div>' +
    '</div></section>';
}

function slugsInPlan() {
  const all = new Set(plan.order || []);
  for (const window of plan.windows) for (const slug of window.slugs || []) all.add(slug);
  return [...all];
}

function rebuildHomeFeature() {
  const fragments = new Map(slugsInPlan().map(slug => [slug, feature(slug)]));
  const versions = {};
  const fragmentDir = path.join(root, 'assets', 'home-features');
  fs.mkdirSync(fragmentDir, { recursive: true });
  for (const name of fs.readdirSync(fragmentDir)) {
    if (!fragments.has(name.replace(/\.json$/, ''))) fs.rmSync(path.join(fragmentDir, name));
  }
  for (const [slug, html] of fragments) {
    versions[slug] = require('crypto').createHash('sha256').update(html).digest('hex').slice(0, 10);
    fs.writeFileSync(path.join(fragmentDir, slug + '.json'), JSON.stringify({ slug, html }) + '\n');
  }

  // The script that runs in the reader's browser: the same choosing function,
  // the windows, and the version of each fragment. ?date= shows the homepage
  // as it will look on another day, as it does for the seasonal hero.
  const rules = fs.readFileSync(path.join(__dirname, 'home-feature-rules.js'), 'utf8')
    .replace(/^\s*\/\/.*\n/gm, '')
    .replace(/\nif \(typeof module[\s\S]*$/, '')
    .replace(/\n\s+/g, '\n')
    .trim();
  const windows = { windows: plan.windows.map(window => ({ from: window.from, to: window.to, slugs: window.slugs })), order: plan.order };
  const script = '<script data-home-feature-calendar>(function(){var s=document.currentScript,h=s&&s.previousElementSibling;' +
    'if(!h||!h.hasAttribute("data-home-feature"))return;try{\n' + rules + '\n' +
    'var P=' + JSON.stringify(windows) + ',V=' + JSON.stringify(versions) + ',' +
    'q=/[?&]date=(\\d{4})-(\\d{2})-(\\d{2})/.exec(location.search),w=astorHomeFeature(q?new Date(+q[1],q[2]-1,+q[3]):new Date(),P);' +
    'if(!w||w===h.getAttribute("data-home-feature")||!V[w])return;' +
    'fetch("/assets/home-features/"+w+".json?v="+V[w]).then(function(x){if(!x.ok)throw 0;return x.json()}).then(function(j){' +
    'var t=document.createElement("template");t.innerHTML=j.html;h.replaceWith(t.content.firstElementChild)}).catch(function(){})' +
    '}catch(e){}})()</script>';

  const homepagePath = path.join(root, 'index.html');
  const homepage = fs.readFileSync(homepagePath, 'utf8');
  const start = '<!-- home-feature:start -->';
  const end = '<!-- home-feature:end -->';
  const from = homepage.indexOf(start);
  const to = homepage.indexOf(end);
  if (from === -1 || to === -1) throw new Error('index.html is missing its close-reading markers');
  const committed = (homepage.slice(from, to).match(/data-home-feature="([a-z0-9-]+)"/) || [])[1];
  const buildDate = process.env.ASTOR_HOME_DATE ? new Date(process.env.ASTOR_HOME_DATE + 'T12:00:00') : new Date();
  const chosen = process.env.ASTOR_HOME_FEATURE || (fragments.has(committed) ? committed : astorHomeFeature(buildDate, plan));
  if (!fragments.has(chosen)) throw new Error('No homepage close reading for ' + chosen);
  fs.writeFileSync(homepagePath, homepage.slice(0, from + start.length) + '\n  ' + fragments.get(chosen) + '\n  ' + script + '\n  ' + homepage.slice(to));
  return { chosen, count: fragments.size };
}

if (require.main === module || module.parent) {
  const result = rebuildHomeFeature();
  console.log('Put the close reading ' + result.chosen + ' on the homepage, with ' + result.count + ' ready to take its place week by week.');
}

module.exports = { rebuildHomeFeature, feature, slugsInPlan };
