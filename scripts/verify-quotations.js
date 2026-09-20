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
// Exit code 1 if anything is missing, so it can gate a build.

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

async function sourceFor(url) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, url.replace(/[^a-z0-9]+/gi, '_').slice(-120));
  if (!fs.existsSync(file)) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error('could not fetch ' + url + ' (' + response.status + ')');
    fs.writeFileSync(file, await response.text());
  }
  return normalise(fs.readFileSync(file, 'utf8'));
}

// Every part of the quotation, in order, each starting within a few hundred
// words of the last.
function found(source, text) {
  const parts = String(text).split(/\s*(?:…|\.\.\.|\[\.\.\.\]|\[…\])\s*/).map(normalise).filter(Boolean);
  if (!parts.length) return false;
  let from = 0;
  for (let start = source.indexOf(parts[0]); start !== -1; start = source.indexOf(parts[0], start + 1)) {
    let at = start + parts[0].length;
    let ok = true;
    for (const part of parts.slice(1)) {
      const next = source.indexOf(part, at);
      if (next === -1 || next - at > 2500) { ok = false; break; }
      at = next + part.length;
    }
    if (ok) return true;
    from = start + 1;
  }
  return false;
}

async function main() {
  const wanted = process.argv.slice(2);
  const dir = path.join(root, 'data', 'books');
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.json'))
    .filter(name => !wanted.length || wanted.includes(name.replace(/\.json$/, '')));
  let checked = 0;
  let missing = 0;
  let skipped = 0;
  for (const name of files) {
    const book = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const urls = [].concat(book.sourceText?.url || []);
    if (!urls.length) { skipped += 1; continue; }
    const source = (await Promise.all(urls.map(sourceFor))).join(' ');
    const lines = [
      ...(book.openingLine ? [{ id: 'openingLine', text: book.openingLine }] : []),
      ...(book.quotations || [])
    ];
    const failures = lines.filter(line => !found(source, line.text));
    checked += lines.length;
    missing += failures.length;
    console.log(book.slug + ': ' + (lines.length - failures.length) + '/' + lines.length + ' found');
    for (const line of failures) console.log('  NOT FOUND ' + line.id + ': ' + String(line.text).slice(0, 90));
  }
  console.log(checked + ' checked, ' + missing + ' missing' + (skipped ? ', ' + skipped + ' records name no source URL' : ''));
  if (wanted.length && !files.length) { console.error('No such record.'); process.exit(1); }
  if (missing) process.exit(1);
}

main().catch(error => { console.error(error.message); process.exit(1); });
