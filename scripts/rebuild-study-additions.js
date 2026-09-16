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
  // Cards without an on-site page go straight to the retailer; say so
  // honestly rather than looking like an internal destination.
  const external = !edition.pageHref;
  return '<a class="study-card" href="' + escapeHtml(edition.pageHref || edition.url) + '"' +
    (edition.pageHref ? ' data-buy-url="' + escapeHtml(edition.url) + '"' : ' target="_blank" rel="noopener noreferrer"') + '>' +
    '<img src="/' + encodeURIComponent(edition.image).replace(/'/g, '%27') + '" alt="' + escapeHtml(edition.title) + ' Study cover">' +
    '<span class="mini-kicker">Study edition</span>' +
    '<h3><em>' + escapeHtml(edition.title) + '</em></h3>' +
    '<p>' + escapeHtml(edition.description) + '</p>' +
    '<span class="button primary">' + (external ? 'Buy / view on Amazon <span aria-hidden="true">&nearr;</span>' : 'Open the study page') + '</span>' +
    '</a>';
}).join('');

html = html.replace(/<a class="study-card" href="https:\/\/mybook\.to\/lhbh"[^>]*>[\s\S]*?(?=<\/section><section class="section-title" id="paired-editions")/g, '');
// Baseline hub cards whose study edition has an on-site page: link the page,
// keep the retailer link as data-buy-url, and label the button accordingly.
const studyPages = {
  'https://mybook.to/cntRBz': '/study/macbeth/',
  'https://mybook.to/Q1lrp8': '/study/hamlet/',
  'https://mybook.to/A8uO': '/study/othello/',
  'https://mybook.to/wwhLC': '/study/romeo-and-juliet/',
  'https://mybook.to/OS3XKr': '/study/a-christmas-carol/',
  'https://mybook.to/ddk9RnO': '/study/jekyll-and-hyde/',
  'https://mybook.to/uGEUdh': '/study/frankenstein/'
};
for (const [buyUrl, pageHref] of Object.entries(studyPages)) {
  html = html.replace(
    '<a class="study-card" href="' + buyUrl + '">',
    '<a class="study-card" href="' + pageHref + '" data-buy-url="' + buyUrl + '">'
  );
}
// Every card that opens an on-site study page carries the same button label.
html = html.replace(
  /(<a class="study-card" href="\/study\/[^"]+"[^>]*>[\s\S]*?<span class="button primary">)[\s\S]*?(<\/span><\/a>)/g,
  '$1Open the study page$2'
);
if (!html.includes(marker)) throw new Error('Could not find the paired-editions marker in study/index.html');
html = html.replace(marker, cards + marker);
fs.writeFileSync(file, html);

console.log('Added ' + additions.length + ' current study editions to study/index.html');
