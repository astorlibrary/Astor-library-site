const fs = require('fs');
const path = require('path');
const resources = require('./resource-data');

const root = process.cwd();

const categories = [
  { id: 'ancient-epic', label: 'Ancient & Epic', short: 'Ancient & Epic' },
  { id: 'renaissance-early-modern', label: 'Renaissance & Early Modern', short: 'Early Modern' },
  { id: 'shakespeare', label: 'Shakespeare', short: 'Shakespeare' },
  { id: 'poetry', label: 'Poetry', short: 'Poetry' },
  { id: 'eighteenth-century', label: 'Eighteenth-century fiction', short: 'Eighteenth century' },
  { id: 'regency', label: 'Romantic & Regency', short: 'Romantic & Regency' },
  { id: 'victorian', label: 'Victorian & Gothic', short: 'Victorian & Gothic' },
  { id: 'modern', label: 'Modern fiction', short: 'Modern' },
  { id: 'american', label: 'American literature', short: 'American' }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assetPath(file) {
  return '/' + encodeURIComponent(file).replace(/'/g, '%27');
}

function header() {
  return `<header class="site-header">
<a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
<nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/">Home</a><a class="nav-link" href="/explore/">Explore</a><a class="nav-link" href="/passage-room/">Passages</a><a class="nav-link" href="/subjects/">Subjects</a><a class="nav-link" href="/authors/">Writers</a><a class="nav-link" href="/library/">All books</a><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a></nav>
</header>`;
}

function card(resource) {
  const tags = resource.tags.join(' ');
  return `<a class="resource-card" href="${escapeHtml(resource.route)}" data-resource-tags="${escapeHtml(tags)}">
<img class="resource-thumb" src="${assetPath(resource.image)}" alt="${escapeHtml(resource.title)} cover" loading="lazy" decoding="async" width="52" height="70">
<span><h3>${resource.titleHtml}</h3>
<p>${escapeHtml(resource.description)}</p></span>
</a>`;
}

const filters = categories.map(category =>
  `<button class="resource-filter" type="button" data-resource-filter="${category.id}" aria-pressed="false">${escapeHtml(category.short)}</button>`
).join('');

const sections = categories.map(category => {
  const cards = resources.filter(resource => resource.category === category.id).map(card).join('\n');
  return `<section class="resource-section" id="${category.id}"><h2>${escapeHtml(category.label)}</h2></section>
<section class="resource-grid">${cards}</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Free Literature Study Guides | Astor Library</title>
<meta name="description" content="${resources.length} free online literature guides for Shakespeare, poetry, classic novels, modern fiction and American literature.">
<link rel="stylesheet" href="/assets/styles.css">
<style>.resource-finder{margin:26px 0 10px}.resource-finder label{display:block;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:850;color:var(--burgundy);margin:0 0 8px}.resource-search-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;max-width:640px}.resource-search-row input{width:100%;min-height:50px;border:1px solid var(--line);background:#fff;padding:0 14px;font:17px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--ink)}#resource-count{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:850;color:var(--burgundy);white-space:nowrap}.resource-filters{display:flex;gap:18px;flex-wrap:wrap;margin-top:16px}.resource-filter{border:0;border-bottom:2px solid transparent;background:none;color:#5c534d;min-height:34px;padding:0 0 2px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:750;cursor:pointer}.resource-filter.is-active{color:var(--ink);border-bottom-color:var(--burgundy)}.resource-section{border-top:1px solid var(--line);padding-top:16px;margin:44px 0 4px}.resource-section h2{font-size:clamp(22px,3.2vw,34px);line-height:1;letter-spacing:-.03em;margin:0}.resource-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 38px}.resource-card{display:grid;grid-template-columns:52px minmax(0,1fr);gap:15px;align-items:center;padding:15px 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit}.resource-thumb{width:52px;height:70px;object-fit:cover;background:#f3e8dd}.resource-card h3{font-size:19px;line-height:1.2;letter-spacing:-.01em;margin:0 0 5px}.resource-card p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.45;color:#5c534d;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.resource-card:hover h3,.resource-card:focus-visible h3{color:var(--burgundy)}.resource-empty{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;margin:24px 0}.resource-card[hidden],.resource-grid[hidden],.resource-section[hidden],.resource-empty[hidden]{display:none}.resource-editorial{border-top:1px solid var(--line);margin-top:52px;padding-top:22px;max-width:60ch}.resource-editorial h2{font-size:clamp(24px,3.4vw,34px);line-height:1.02;margin:0 0 10px}.resource-editorial p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#423b36;margin:0 0 10px}.resource-support{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#5c534d;margin:26px 0 0}@media(max-width:820px){.resource-grid{grid-template-columns:1fr}}</style>
<script src="/assets/resources.js" defer></script>
</head>
<body>
${header()}
<main class="page-wrap">
<section class="page-intro"><div><p class="kicker">Free guides</p><h1>Free literature guides.</h1><p class="deck">${resources.length} guides to Shakespeare, poetry, fiction and drama, free to read.</p></div></section>
<section class="resource-finder" aria-label="Find a guide"><label for="resource-search">What are you studying?</label><div class="resource-search-row"><input id="resource-search" type="search" autocomplete="off" placeholder="Try Gatsby, Dracula, Shakespeare or gender"><p id="resource-count" aria-live="polite">${resources.length} guides</p></div><div class="resource-filters" aria-label="Filter free resources"><button class="resource-filter is-active" type="button" data-resource-filter="all" aria-pressed="true">All</button>${filters}</div></section>
<p class="resource-empty" id="resource-empty" hidden>No guide matches that search yet. Try the book title, an author or a broader idea.</p>
${sections}
<section class="resource-editorial"><h2>What a guide holds.</h2><p>Plot, passages and context, with the quotations you are likely to need. Written to sit beside the book.</p><p><a href="/site-index/#free-guides">Every guide in the site index.</a></p></section>
<p class="resource-support">The guides are free. <a href="https://ko-fi.com/astorlibrary">Support Astor Library</a> if they help.</p>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="/library/">Library</a><a href="/study/">Study editions</a><a href="/resources/">Resources</a><a href="https://ko-fi.com/astorlibrary">Support</a></div></footer>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'resources', 'index.html'), html);
console.log(`Rebuilt the free-resource catalogue with ${resources.length} online guides.`);

// Keep the homepage's two resource totals aligned with the generated catalogue.
const homepagePath = path.join(root, 'index.html');
const homepage = fs.readFileSync(homepagePath, 'utf8');
const updatedHomepage = homepage
  .replace(/(<span>)\d+( guides and \d+ annotated passages)/, (_, before, after) => before + resources.length + after)
  .replace(/(href="\/resources\/">All )\d+( &rarr;)/, (_, before, after) => before + resources.length + after);
fs.writeFileSync(homepagePath, updatedHomepage);
