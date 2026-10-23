// Writes /study/, the list of Astor Study Editions, from scripts/study-editions.json.
//
// A Study Edition is a printed book. The page says what the Study Editions
// add to a standard Astor edition and lists every one, with a link to its own
// page where there is one and to the retailer where there is not. The cards
// keep the markup rebuild-discovery.js reads (an <h3> title and a <p> line).

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'study-editions.json'), 'utf8'));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function card(edition) {
  const href = edition.page || edition.buy;
  const external = !edition.page;
  const line = edition.paired
    ? 'Two texts in one volume'
    : edition.author;
  return '<a class="study-card' + (edition.paired ? ' dual' : '') + '" href="' + escapeHtml(href) + '"' +
    (external ? ' rel="noopener"' : ' data-buy-url="' + escapeHtml(edition.buy) + '"') + '>' +
    '<img src="' + escapeHtml(edition.cover) + '" alt="' + escapeHtml(edition.title) + ', Astor Study Edition cover" width="320" height="480" loading="lazy">' +
    '<h3>' + escapeHtml(edition.title) + '</h3>' +
    '<p>' + escapeHtml(line) + '</p>' +
    '</a>';
}

function rebuildStudyIndex() {
  const single = data.list.filter(edition => !edition.paired);
  const paired = data.list.filter(edition => edition.paired);
  const html = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Astor Study Editions | Astor Library</title>
  <meta name="description" content="The Astor Study Editions: printed editions for students, with the complete text and closer analysis, key quotations, characters, themes, critical perspectives and help with writing about the book.">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt=""><span class="word">LIBRARY</span></a>
  <nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/library/">Books</a><a class="nav-link" href="/guides/">Study guides</a><a class="nav-link" href="/play/">Revise</a></nav>
</header>
<main class="page-wrap study-index">
  <nav class="book-breadcrumb" aria-label="Breadcrumb"><a href="/library/">All books</a><span aria-hidden="true">/</span><span aria-current="page">Study Editions</span></nav>
  <header class="editorial-intro">
    <h1>Study Editions</h1>
    <p class="editorial-lede">The Astor Study Editions are printed books for students at school and university. Each prints the text with closer analysis than a standard Astor edition: commentary on the scenes or chapters, key quotations, characters and themes, and, in many editions, critical perspectives and help with essays and exam answers.</p>
    <p>Every standard Astor edition already has a summary of each chapter or scene and explanatory notes. What each Study Edition adds is listed on its page. The Study Editions are separate from the free <a href="/guides/">study guides</a> on this site.</p>
  </header>
  <section class="study-shelf" aria-labelledby="study-single">
    <h2 id="study-single">Single texts</h2>
    <div class="study-grid">${single.map(card).join('')}</div>
  </section>
  <section class="study-shelf" id="paired-editions" aria-labelledby="study-paired">
    <h2 id="study-paired">Two texts in one volume</h2>
    <p class="study-shelf-note">For courses that set these books together. Each volume has study material for both texts.</p>
    <div class="study-grid">${paired.map(card).join('')}</div>
  </section>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p></div><div class="footer-links"><a href="/library/">Books</a><a href="/guides/">Study guides</a></div></footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, 'study', 'index.html'), html);
  return data.list.length;
}

const count = rebuildStudyIndex();
console.log('Listed ' + count + ' Study Editions on study/index.html');

module.exports = { rebuildStudyIndex };
