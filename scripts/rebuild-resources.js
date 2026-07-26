const fs = require('fs');
const path = require('path');
const resources = require('./resource-data');

const root = process.cwd();

const categories = [
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
  const tags = resource.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  return `<a class="resource-card" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
<img class="resource-thumb" src="${assetPath(resource.image)}" alt="${escapeHtml(resource.title)} cover">
<div class="tag-row">${tags}</div>
<h3>${resource.titleHtml}</h3>
<p>${escapeHtml(resource.description)}</p>
<span class="button primary">Open online guide</span>
</a>`;
}

const filters = categories.map(category =>
  `<button class="resource-filter" type="button" data-resource-filter="${category.id}" aria-pressed="false">${escapeHtml(category.label)}</button>`
).join('');

const jumpLinks = categories.map(category =>
  `<a class="button secondary" href="#${category.id}">${escapeHtml(category.short)}</a>`
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
<style>.resource-hero{margin-top:34px;display:grid;grid-template-columns:1.1fr .9fr;gap:24px}.resource-panel{border:1px solid var(--line);background:var(--charcoal);color:#fff8ef;padding:28px}.resource-panel p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#f4eadf}.resource-panel h2{font-size:clamp(34px,5vw,62px);line-height:.95;letter-spacing:-.045em;margin:0 0 14px}.resource-section{border-top:1px solid var(--line);padding-top:26px;margin:48px 0 20px}.resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.resource-card{border:1px solid var(--line);background:rgba(255,248,239,.88);padding:14px 14px 20px;min-height:250px;text-decoration:none;display:flex;flex-direction:column;gap:12px}.resource-thumb{width:100%;height:260px;object-fit:contain;object-position:center;background:#f3e8dd;border:1px solid rgba(32,28,26,.08)}.resource-card h3{font-size:30px;line-height:1.02;margin:0}.resource-card p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#423b36;margin:0}.resource-card .button{margin-top:auto}.tag-row{display:flex;gap:8px;flex-wrap:wrap}.tag{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:var(--burgundy);background:#f2e4d7;border:1px solid var(--line);padding:6px 8px}.support-box{margin-top:48px;border:1px solid var(--line);background:#fff8ef;padding:22px;display:flex;justify-content:space-between;gap:18px;align-items:center}.support-box p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.55;margin:0;color:#423b36}.resource-finder{margin:28px 0 54px;border:1px solid var(--line);background:rgba(255,248,239,.9);padding:24px}.resource-finder-head{display:flex;justify-content:space-between;gap:22px;align-items:end}.resource-finder-head>div{min-width:250px}.resource-finder h2{font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-.045em;margin:0}.resource-finder label{display:block;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:850;color:var(--burgundy);margin-top:20px;margin-bottom:8px}.resource-search-row{display:grid;grid-template-columns:1fr auto;gap:12px}.resource-search-row input{width:100%;min-height:54px;border:1px solid var(--line);background:#fff;padding:0 16px;font:17px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--ink)}#resource-count{min-width:105px;margin:0;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;padding:0 14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:850;color:var(--burgundy)}.resource-filters{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.resource-filter{border:1px solid var(--line);background:#fff8ef;color:var(--ink);min-height:38px;padding:0 12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:750;cursor:pointer}.resource-filter.is-active{background:var(--charcoal);color:#fff8ef}.resource-empty{border:1px solid var(--line);background:#fff8ef;padding:22px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6}.resource-card[hidden],.resource-grid[hidden],.resource-section[hidden],.resource-empty[hidden]{display:none}.resource-editorial{display:grid;grid-template-columns:minmax(240px,.7fr) minmax(0,1.3fr);gap:32px;margin-top:58px;padding-top:34px;border-top:1px solid var(--line)}.resource-editorial h2{font-size:clamp(38px,5vw,66px);line-height:.94;margin:0}.resource-editorial-copy p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.67;color:#423b36}@media(max-width:900px){.resource-hero,.resource-grid,.resource-editorial{grid-template-columns:1fr}.support-box{display:block}.support-box .button-row{margin-top:16px}.resource-thumb{height:auto;max-height:360px}}@media(max-width:700px){.resource-finder-head,.resource-search-row{display:grid;grid-template-columns:1fr}.resource-finder{padding:19px}#resource-count{min-height:46px;justify-content:flex-start}}</style>
<script src="/assets/resources.js" defer></script>
</head>
<body>
${header()}
<main class="page-wrap">
<section class="page-intro"><div><p class="kicker">Astor Study</p><h1>Free literature resources.</h1><p class="deck">${resources.length} free online guides to Shakespeare, poetry, fiction and drama. Each guide opens in a clear, browser-friendly reading format.</p></div><aside class="source-note"><p><strong>Choose a text or topic.</strong> Browse by category or search for a title, character, theme or kind of help.</p></aside></section>
<section class="resource-hero"><div class="resource-panel"><h2>Find what you need.</h2><p>Go straight to a period or tradition, then open any guide online.</p><div class="button-row">${jumpLinks}</div></div><div class="resource-panel"><h2>Free to read and use.</h2><p>Every guide is available without charge. Ko-fi support helps Astor Library keep producing and sharing careful literature resources.</p><div class="button-row"><a class="button primary" href="https://ko-fi.com/astorlibrary">Support Astor Library</a></div></div></section>
<section class="resource-finder" aria-labelledby="resource-finder-title"><div class="resource-finder-head"><div><p class="kicker">Free literature guides</p><h2 id="resource-finder-title">Find a guide.</h2></div><p class="deck">Search a title, character, theme or kind of help. You can also narrow the shelves without losing sight of the whole library.</p></div><label for="resource-search">What are you studying?</label><div class="resource-search-row"><input id="resource-search" type="search" autocomplete="off" placeholder="Try Gatsby, Dracula, Shakespeare or gender"><p id="resource-count" aria-live="polite">${resources.length} guides</p></div><div class="resource-filters" aria-label="Filter free resources"><button class="resource-filter is-active" type="button" data-resource-filter="all" aria-pressed="true">All guides</button>${filters}</div></section>
<p class="resource-empty" id="resource-empty" hidden>No guide matches that search yet. Try the book title, an author or a broader idea.</p>
${sections}
<section class="resource-editorial"><div><p class="kicker">Using the free library</p><h2>More than a worksheet.</h2></div><div class="resource-editorial-copy"><p><strong>Each resource begins with the text.</strong> A plot guide keeps cause and consequence clear; a passage guide slows down over language and form; a context guide explains the history that the writing actually uses.</p><p>Teachers may use the guides for planning or discussion; students can revise a section, check an argument or begin closer reading. <a href="/site-index/#free-guides">See every guide in the site index.</a></p></div></section>
<section class="support-box"><p><strong>Astor resources are free.</strong><br>Support helps keep them open for students, teachers and independent readers.</p><div class="button-row"><a class="button primary" href="https://ko-fi.com/astorlibrary">Support Astor Library</a></div></section>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Making classic literature easier to read, teach and study, while keeping the original texts intact.</p></div><div class="footer-links"><a href="/library/">Library</a><a href="/study/">Study editions</a><a href="/resources/">Resources</a><a href="https://ko-fi.com/astorlibrary">Support</a></div></footer>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'resources', 'index.html'), html);
console.log(`Rebuilt the free-resource catalogue with ${resources.length} online guides.`);
