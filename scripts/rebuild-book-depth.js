const fs = require('fs');
const path = require('path');
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const files = ['book-depth-a.json', 'book-depth-b.json', 'book-depth-seasonal.json'];
const records = files.flatMap(file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8')));
const seen = new Set();
for (const record of records) {
  if (seen.has(record.slug)) throw new Error('Repeated expanded book: ' + record.slug);
  seen.add(record.slug);
  const file = path.join(process.cwd(), 'books', record.slug, 'index.html');
  let html = fs.readFileSync(file, 'utf8').replace(/\n?<!-- ASTOR BOOK DEPTH START -->[\s\S]*?<!-- ASTOR BOOK DEPTH END -->\n?/g, '\n');
  html = html.replace(/<a href="#further-context">[^<]*<\/a>/g, '');
  const content = '\n<!-- ASTOR BOOK DEPTH START -->\n' +
    '<section class="book-depth" id="further-context" aria-labelledby="further-context-title"><div class="section-title"><p class="kicker">A closer look</p><h2 id="further-context-title">Publication, text and historical context.</h2></div>' +
    '<div class="book-depth-grid">' + record.sections.map(section => '<article><h3>' + escape(section.heading) + '</h3>' + section.paragraphs.map(p => '<p>' + escape(p) + '</p>').join('') + '</article>').join('') + '</div>' +
    '<details class="book-depth-sources"><summary>Sources for this account</summary><ul>' + record.sources.map(s => '<li><a href="' + escape(s.href) + '">' + escape(s.label) + '</a></li>').join('') + '</ul></details></section>\n<!-- ASTOR BOOK DEPTH END -->\n';
  const anchor = /<!-- ASTOR FORMAT OPTIONS START -->|<section class="edition-choice-band"|<nav class="book-end-nav"|<\/main>/;
  if (!anchor.test(html)) throw new Error('No insertion point in ' + record.slug);
  html = html.replace(anchor, match => content + match);
  html = html.replace(/(<nav class="page-contents"[\s\S]*?)(<\/div>)/, '$1<a href="#further-context">Further context</a>$2');
  fs.writeFileSync(file, html.replace(/[ \t]+\n/g, '\n'));
}
console.log('Expanded historical and textual accounts on ' + records.length + ' book pages.');
