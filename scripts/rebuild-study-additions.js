const fs = require('fs');
const path = require('path');
const additions = require('./study-additions');

const file = path.join(process.cwd(), 'study', 'index.html');
const marker = '</section><section class="section-title" id="paired-editions">';
let html = fs.readFileSync(file, 'utf8');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const cards = additions.map(function (edition) {
  return '<a class="study-card" href="' + escapeHtml(edition.pageHref || edition.url) + '"' +
    (edition.pageHref ? ' data-buy-url="' + escapeHtml(edition.url) + '"' : '') + '>' +
    '<img src="/' + encodeURIComponent(edition.image).replace(/'/g, '%27') + '" alt="' + escapeHtml(edition.title) + ' Study cover">' +
    '<span class="mini-kicker">Study edition</span>' +
    '<h3><em>' + escapeHtml(edition.title) + '</em></h3>' +
    '<p>' + escapeHtml(edition.description) + '</p>' +
    '<span class="button primary">Buy / view</span>' +
    '</a>';
}).join('');

html = html.replace(/<a class="study-card" href="https:\/\/mybook\.to\/lhbh">[\s\S]*?(?=<\/section><section class="section-title" id="paired-editions")/g, '');
if (!html.includes(marker)) throw new Error('Could not find the paired-editions marker in study/index.html');
html = html.replace(marker, cards + marker);
fs.writeFileSync(file, html);

console.log('Added ' + additions.length + ' current study editions to study/index.html');
