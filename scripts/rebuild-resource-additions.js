const fs = require('fs');
const path = require('path');
const resources = require('./resource-additions');

const root = process.cwd();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function assetPath(file) {
  return '/' + encodeURI(file).replace(/'/g, '%27');
}

function header() {
  return `<header class="site-header">
<a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
<nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/">Home</a><a class="nav-link" href="/explore/">Explore</a><a class="nav-link" href="/library/">All books</a><a class="nav-link" href="/authors/">Writers</a><a class="nav-link" href="/subjects/">Subjects</a><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/">Free resources</a></nav>
</header>`;
}

function page(resource) {
  const pdf = assetPath(resource.pdf);
  const image = assetPath(resource.image);
  const tags = resource.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const includes = resource.includes.map(item => `<li>${item}</li>`).join('');
  const readings = resource.readings.map(item => `<article><p class="year">${escapeHtml(item.label)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.copy)}</p></article>`).join('');
  const related = resource.relatedBooks.map(item => `<a href="${item.href}">${escapeHtml(item.label)}</a>`).join('');
  const footerRelated = resource.relatedBooks.map(item => `<a href="${item.href}">${escapeHtml(item.label.replace(/^Read the | book page$/g, ''))}</a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(resource.title)} | Astor Library</title>
<meta name="description" content="${escapeHtml(resource.description)}">
<link rel="stylesheet" href="/assets/styles.css">
<style>.resource-layout{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:28px;margin-top:34px}.preview-panel,.resource-meta,.note-box{border:1px solid var(--line);background:#fff8ef;padding:18px}.preview-panel img{width:100%;max-height:760px;display:block;object-fit:contain;background:#f3e8dd}.resource-meta p,.resource-meta li,.note-box p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.58;color:#423b36}.resource-meta ul{padding-left:21px}.resource-meta li+li{margin-top:8px}.tag-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.tag{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;color:var(--burgundy);background:#f2e4d7;border:1px solid var(--line);padding:6px 8px}.page-count{margin:0 0 18px;color:var(--burgundy)!important;font-weight:850}.link-list{display:grid;gap:10px;margin-top:20px}.link-list a{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;border:1px solid var(--line);background:#fff8ef;padding:12px;text-decoration:none;color:var(--burgundy);font-weight:800}.guide-title{margin-top:56px}.guide-reading{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:22px}.guide-reading article{border:1px solid var(--line);background:rgba(255,248,239,.86);padding:22px;min-height:230px}.guide-reading h3{font-size:29px;line-height:1;margin:0 0 12px}.guide-reading p{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.62;color:#423b36}.guide-reading .year{color:var(--burgundy);font-weight:850;text-transform:uppercase;letter-spacing:.13em;font-size:11px}@media(max-width:900px){.resource-layout{grid-template-columns:1fr}.preview-panel{order:0}.resource-meta{order:1}.preview-panel img{max-height:560px}}@media(max-width:800px){.guide-reading{grid-template-columns:1fr}.guide-reading article{min-height:0}}@media(max-width:520px){.resource-layout{gap:14px}.preview-panel,.resource-meta,.note-box{padding:14px}.guide-reading article{padding:18px}.guide-reading h3{font-size:26px}}</style>
</head>
<body>
${header()}
<main class="page-wrap">
<section class="page-intro"><div><p class="kicker">Free Astor resource · ${resource.pageCount} pages</p><h1>${resource.titleHtml}</h1><p class="deck">${resource.deck}</p></div><aside class="source-note"><p><strong>Read the complete guide.</strong> Open the PDF on screen or keep it beside the text while you study.</p><div class="button-row"><a class="button primary" href="${pdf}">Open PDF</a><a class="button secondary" href="https://ko-fi.com/astorlibrary">Support Astor Library</a></div></aside></section>
<section class="resource-layout"><article class="preview-panel"><img src="${image}" alt="Cover of ${escapeHtml(resource.title)}"></article><aside class="resource-meta"><div class="tag-row">${tags}</div><p class="page-count">${resource.pageCount}-page illustrated guide</p><p>The guide includes:</p><ul>${includes}</ul><div class="link-list"><a href="${pdf}">Open the complete PDF</a>${related}<a href="/resources/">Browse every free resource</a></div></aside></section>
<section class="section-title guide-title"><h2>${escapeHtml(resource.sectionHeading)}</h2><p>${escapeHtml(resource.sectionIntro)}</p></section>
<section class="guide-reading">${readings}</section>
<section class="note-box"><p><strong>A useful way in.</strong> ${escapeHtml(resource.note)}</p></section>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Making classic literature easier to read, teach and study, while keeping the original texts intact.</p></div><div class="footer-links">${footerRelated}<a href="/resources/">All resources</a><a href="/library/">Library</a></div></footer>
</body>
</html>`;
}

for (const resource of resources) {
  const directory = path.join(root, resource.route);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), page(resource));
}

console.log(`Built ${resources.length} new resource pages.`);
