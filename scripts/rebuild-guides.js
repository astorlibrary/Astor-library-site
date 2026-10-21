// Writes the source page for every study-guide page (scripts/guide-pages.js):
// /guides/ itself, and for each book with a study record its overview and one
// page per section it has material for. build-static.js fills them at build
// time. Run by rebuild-library.js; safe to run on its own.

const fs = require('fs');
const path = require('path');
const { loadBooks } = require('./book-data');
const { sectionsFor, renderStub, renderIndex } = require('./guide-pages');

const root = path.join(__dirname, '..');
const guidesDir = path.join(root, 'guides');

function coverFor(book, shelf) {
  return shelf.get(book.slug)?.cover || '';
}

function build() {
  const books = loadBooks();
  let shelf = new Map();
  try {
    const index = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'revise-index.json'), 'utf8'));
    shelf = new Map(index.books.map(entry => [entry.slug, entry]));
  } catch { /* the index lists covers; without it the guides index shows none */ }

  // Pages for books that no longer have a record must not linger.
  const wanted = new Set();
  const write = (relative, html) => {
    const file = path.join(guidesDir, relative, 'index.html');
    wanted.add(path.relative(root, file));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) fs.writeFileSync(file, html);
  };

  write('', renderIndex(books, { coverFor: book => coverFor(book, shelf) }));
  for (const book of books) {
    write(book.slug, renderStub(book, ''));
    for (const section of sectionsFor(book)) write(path.join(book.slug, section.id), renderStub(book, section.id));
  }

  if (fs.existsSync(guidesDir)) {
    const walk = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) { walk(full); if (!fs.readdirSync(full).length) fs.rmdirSync(full); }
        else if (entry.name === 'index.html' && !wanted.has(path.relative(root, full))) fs.unlinkSync(full);
      }
    };
    walk(guidesDir);
  }
  return wanted.size;
}

if (require.main === module) console.log('Wrote ' + build() + ' study-guide pages.');
module.exports = { build };
