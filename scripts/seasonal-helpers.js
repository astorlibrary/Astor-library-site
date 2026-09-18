const seasons = require('./seasonal-data.json');
const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hrefFor = s => '/seasons/' + s.slug + '/';
function booksFor(s) { return s.sections.flatMap(section => section.books); }
function discoveryEntries(books) {
  return seasons.map(s => ({ type: 'season', typeLabel: 'Seasonal reading', title: s.title, description: s.deck, href: hrefFor(s), image: books.find(b => b.href === s.heroBooks[0]).image, imageAlt: s.title + ' — featured Astor edition', relatedBooks: booksFor(s), search: [s.title, s.period, s.deck, ...s.sections.map(x => x.title)].join(' ') }));
}
function resourcesFor(s, index) {
  const selected = new Set(s.resourceBooks || booksFor(s));
  return ['resources', 'passages', 'studyEditions'].flatMap(key => index[key] || []).filter(r => !s.excludedResources?.includes(r.href) && (r.relatedBooks?.some(href => selected.has(href)) || s.resources?.includes(r.href)));
}
module.exports = { seasons, e, hrefFor, booksFor, discoveryEntries, resourcesFor };
