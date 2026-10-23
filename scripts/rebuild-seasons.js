const fs = require('fs');
const path = require('path');
const { seasons, e, hrefFor, booksFor, resourcesFor } = require('./seasonal-helpers');
const { scene, emblem, garland } = require('./seasonal-art');
const index = JSON.parse(fs.readFileSync('assets/content-index.json', 'utf8'));
const bookMap = new Map(index.books.map(b => [b.href, b]));
function book(href) { const b = bookMap.get(href); if (!b) throw new Error('Unknown seasonal book ' + href); return b; }
const seasonCount = ['none','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'][seasons.length] || String(seasons.length);
const SeasonCount = seasonCount.charAt(0).toUpperCase() + seasonCount.slice(1);
function coverFan(s) {return '<div class="season-art">'+scene(s.theme)+'<div class="season-cover-fan">'+s.heroBooks.map((href,i)=>{const b=book(href);return '<a class="season-cover season-cover-'+i+'" href="'+e(href)+'"><img src="'+e(b.image)+'" alt="'+e(b.imageAlt)+'" width="240" height="360"'+(i===0?'':' loading="lazy"')+'><span class="season-sr-only">'+e(b.title)+'</span></a>';}).join('')+'</div><p class="season-art-caption">Complete texts · Astor editions</p></div>';}
function head(title,description) {return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+e(title)+' | Astor Library</title><meta name="description" content="'+e(description)+'"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/seasons.css"></head><body><header class="site-header"><a class="brand" href="/">Astor Library</a><nav class="nav" aria-label="Primary navigation"><a href="/library/">All books</a><a href="/explore/">Search</a><a href="/study/">Study editions</a><a href="/resources/">Free resources</a><a href="/seasons/">Seasons</a></nav></header>';}
const footer = '<footer class="site-footer"></footer></body></html>';
function seasonTile(s) {return '<a class="season-tile theme-'+e(s.theme)+'" href="'+hrefFor(s)+'">'+garland(s.theme)+'<span class="season-tile-period">'+e(s.period)+'</span><h3>'+e(s.shortTitle||s.title)+'</h3><p>'+e(s.deck)+'</p><div class="season-tile-stage" aria-hidden="true">'+scene(s.theme)+'<div class="season-tile-covers">'+s.heroBooks.slice(0,3).map(href=>'<img src="'+e(book(href).image)+'" alt="" width="120" height="180" loading="lazy">').join('')+'</div></div><span class="season-tile-link">Open the collection <b aria-hidden="true">↗</b></span></a>';}
for (const s of seasons) {
 const hrefs=booksFor(s); if(new Set(hrefs).size!==hrefs.length)throw new Error('Repeated seasonal book: '+s.slug);
 const resources=resourcesFor(s,index); const free=resources.filter(r=>r.type!=='study'); const studies=resources.filter(r=>r.type==='study');
 const sections=s.sections.map((section,i)=>'<section class="season-books" id="shelf-'+(i+1)+'"><div class="season-section-head"><div class="season-section-mark">'+emblem(s.theme)+'</div><p class="season-eyebrow">The books / '+String(i+1).padStart(2,'0')+'</p><h2>'+e(section.title)+'</h2><p>'+e(section.description)+'</p></div><div class="season-book-grid">'+section.books.map(href=>{const b=book(href); const html=fs.readFileSync(path.join(process.cwd(),href,'index.html'),'utf8'); const formats=html.includes('is-hardback')?'Paperback & hardback':'Astor edition';return '<article class="season-book"><a class="season-book-image" href="'+e(href)+'">'+emblem(s.theme)+'<img src="'+e(b.image)+'" alt="'+e(b.imageAlt)+'" width="200" height="300" loading="lazy"></a><div class="season-book-copy"><p class="season-eyebrow">'+e(b.collection)+' · '+formats+'</p><h3><a href="'+e(href)+'">'+e(b.title)+'</a></h3><p class="season-book-author">'+e(b.author.split(', ').length > 3 ? b.author.split(', ').slice(0, 2).join(', ') + ' and others' : b.author)+'</p><p>'+e(b.description)+'</p><a class="season-text-link" href="'+e(href)+'">Read about the edition <span aria-hidden="true">→</span></a></div></article>';}).join('')+'</div></section>').join('');
 function resourceCards(items) {return items.map(r=>'<a class="season-resource" href="'+e(r.href)+'"><span class="season-eyebrow">'+(r.type==='study'?'Study edition · purchase options':r.type==='passage'?'Free close reading':'Free illustrated guide')+'</span><h3>'+e(r.title)+'</h3><p>'+e(r.description)+'</p><span class="season-text-link">'+(r.type==='study'?'View the study edition':'Open the resource')+' <span aria-hidden="true">→</span></span></a>').join('');}
 const schema={'@context':'https://schema.org','@type':'CollectionPage','@id':'https://astorlibrary.com'+hrefFor(s)+'#collection',url:'https://astorlibrary.com'+hrefFor(s),name:s.title,description:s.deck,inLanguage:'en-GB',isPartOf:{'@type':'CollectionPage',url:'https://astorlibrary.com/seasons/',name:'The Seasonal Library'},breadcrumb:{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'The Seasonal Library',item:'https://astorlibrary.com/seasons/'},{'@type':'ListItem',position:2,name:s.title,item:'https://astorlibrary.com'+hrefFor(s)}]},mainEntity:{'@type':'ItemList',itemListElement:hrefs.map((href,i)=>({'@type':'ListItem',position:i+1,url:'https://astorlibrary.com'+href,name:book(href).title}))}};
 const html=head(s.title,s.deck)+'<main class="season-page theme-'+e(s.theme)+'" id="main-content"><section class="season-hero">'+garland(s.theme)+'<div class="season-wrap"><nav class="season-breadcrumb" aria-label="Breadcrumb"><a href="/">Astor Library</a><span aria-hidden="true">/</span><a href="/seasons/">The seasonal library</a></nav><div class="season-hero-grid"><div class="season-hero-copy"><p class="season-eyebrow">'+e(s.kicker)+'</p><h1>'+e(s.title)+'</h1><p class="season-deck">'+e(s.deck)+'</p><div class="season-hero-actions"><a class="season-button" href="#books">Explore the books <span aria-hidden="true">↓</span></a>'+(resources.length?'<a href="'+(free.length?'#resources':'#study-editions')+'">Read & study</a>':'')+'</div><p class="season-period">'+e(s.period)+' <span aria-hidden="true">✦</span> Open all year</p></div>'+coverFan(s)+'</div></div></section><nav class="season-jump" aria-label="Seasonal page sections"><div class="season-wrap"><a href="#books">'+hrefs.length+' books</a>'+(free.length?'<a href="#resources">'+free.length+' free resources</a>':'')+(studies.length?'<a href="#study-editions">'+studies.length+' study editions</a>':'')+'<a href="#reading-note">Reading notes</a><a href="/seasons/">All seasons ↗</a></div></nav><div class="season-wrap season-content"><section class="season-introduction" id="books"><p class="season-eyebrow">Your '+e(s.shortTitle||s.title)+' reading list</p><div>'+s.intro.map(p=>'<p>'+e(p)+'</p>').join('')+'</div></section>'+sections+(free.length?'<section class="season-resources" id="resources"><div class="season-section-head"><div class="season-section-mark">'+emblem(s.theme)+'</div><p class="season-eyebrow">Read, look closer, teach</p><h2>The free reading room.</h2><p>Illustrated guides and close readings to go with these books.</p></div><div class="season-resource-grid">'+resourceCards(free)+'</div></section>':'')+(studies.length?'<section class="season-resources" id="study-editions"><div class="season-section-head"><div class="season-section-mark">'+emblem(s.theme)+'</div><p class="season-eyebrow">For further study</p><h2>Study editions.</h2><p>Printed editions for students, with closer analysis, key quotations and context.</p></div><div class="season-resource-grid">'+resourceCards(studies)+'</div></section>':'')+'<aside class="season-note" id="reading-note">'+garland(s.theme)+'<div><p class="season-eyebrow">The Astor reading note</p><h2>'+e(s.readingNote.title)+'</h2></div><div>'+s.readingNote.paragraphs.map(p=>'<p>'+e(p)+'</p>').join('')+(s.readingNote.sources?.length?'<ul class="season-sources">'+s.readingNote.sources.map(r=>'<li><a href="'+e(r.href)+'">'+e(r.label)+'</a></li>').join('')+'</ul>':'')+'</div></aside><section class="season-more"><div class="season-section-head"><div class="season-section-mark">'+emblem(s.theme)+'</div><p class="season-eyebrow">Keep a place in the calendar</p><h2>Another season, another shelf.</h2><p>Every collection stays open throughout the year.</p></div><div class="season-tile-grid">'+seasons.filter(x=>x.slug!==s.slug).slice(0,3).map(seasonTile).join('')+'</div><a class="season-text-link" href="/seasons/">Explore all '+seasonCount+' seasonal collections →</a></section></div></main><script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>'+footer;
 const dir=path.join('seasons',s.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
}
const home=head('The Seasonal Library','Books for Halloween, Christmas, Bonfire Night and the changing seasons, with free literature guides, close readings and study editions.')+'<main class="season-page theme-autumn" id="main-content"><section class="season-directory-hero"><div class="season-wrap"><p class="season-eyebrow">Astor Library / A year of reading</p><h1>The seasonal<br><em>library.</em></h1><p>Ghost stories for October. Dickens for Christmas. Adventures for summer. '+SeasonCount+' collections of books and resources, ready whenever you are.</p><div class="season-calendar">'+seasons.map(s=>'<a href="'+hrefFor(s)+'">'+e(s.shortTitle||s.title)+'</a>').join('')+'</div></div></section><section class="season-wrap season-directory"><div class="season-section-head"><div class="season-section-mark">'+emblem('autumn')+'</div><p class="season-eyebrow">Choose a season or occasion</p><h2>Something to look forward to.</h2><p>Complete Astor editions, free guides and close readings brought together by season. Each collection stays open all year.</p></div><div class="season-tile-grid">'+seasons.map(seasonTile).join('')+'</div></section></main>'+footer;
fs.writeFileSync('seasons/index.html',home);
// The homepage hero follows the calendar in home-calendar.json: a season's
// own collection for most of the year, with features for the occasions in
// between (Easter, Shakespeare's birthday, Remembrance Day and the rest).
// Every hero is built here. The one for the build date goes into index.html,
// and each is also published as a fragment under /assets/home-heroes/, so
// the calendar script in the page can swap in the right one when a date
// passes before the next deploy. ASTOR_HOME_DATE=YYYY-MM-DD builds the page
// as of another day, and ASTOR_HOME_SEASON=<theme> forces a theme.
// "Explore autumn reading", but "Explore Halloween reading": the seasons of
// the year are common nouns and the festivals are names.
function seasonName(s) {
  const name = s.shortTitle || s.title;
  return /^(spring|summer|autumn|winter)$/i.test(name) ? name.toLowerCase() : name;
}
const calendar = JSON.parse(fs.readFileSync(path.join(__dirname, 'home-calendar.json'), 'utf8'));
const { astorHomeCalendar } = require('./home-calendar-rules');
const thumbnails = JSON.parse(fs.readFileSync('assets/book-thumbnails.json', 'utf8'));

// Covers go out as the catalogue thumbnails, as build-static would make
// them, because the fragments never pass through build-static.
function cover(b, extra = '') {
  const src = thumbnails[b.image] || b.image;
  const small = src.replace(/\.jpg$/, '-360.jpg');
  const srcset = src.startsWith('/assets/book-thumbs/') && fs.existsSync(small.slice(1)) ? ' srcset="' + e(small) + ' 360w, ' + e(src) + ' 720w" sizes="240px"' : '';
  return '<img' + srcset + ' src="' + e(src) + '" alt="' + e(b.imageAlt) + '" width="240" height="360" loading="lazy"' + extra + '>';
}
// "Halloween *at* Astor" becomes "Halloween <em>at</em> Astor."
function headline(text) {
  return e(text).replace(/\*([^*]+)\*/g, '<em>$1</em>') + '.';
}
function heroData(theme) {
  if (theme.season) {
    const s = seasons.find(x => x.slug === theme.season);
    if (!s || !s.home) throw new Error('Calendar theme ' + theme.slug + ' needs a season with a home block');
    const [first, ...rest] = s.title.split(' ');
    return {
      visual: s.theme, headline: first + ' *' + rest.slice(0, -1).join(' ') + '* ' + rest[rest.length - 1],
      kicker: s.kicker, deck: s.deck, period: s.period, openAllYear: true,
      cta: { href: hrefFor(s), text: 'Explore ' + seasonName(s) + ' reading' },
      heroBooks: s.home.heroBooks || s.heroBooks, shelf: s.home.shelf, label: s.title, varied: s.home.varied !== false
    };
  }
  const f = theme.feature;
  if (!f) throw new Error('Calendar theme ' + theme.slug + ' has neither a season nor a feature');
  return { ...f, openAllYear: false, label: f.headline.replace(/\*/g, ''), varied: f.varied !== false };
}
function homeHero(theme) {
  const h = heroData(theme);
  if (h.heroBooks.length !== 3 || h.shelf.length !== 6) throw new Error('Calendar theme ' + theme.slug + ' needs three hero books and a shelf of six');
  const covers = h.heroBooks.map((href, i) => {
    const b = book(href);
    return '<a class="season-cover season-cover-' + i + '" href="' + e(href) + '">' + cover(b) + '<span class="season-sr-only">' + e(b.title) + '</span></a>';
  }).join('');
  const shelf = h.shelf.map(item => '<a href="' + e(item.href) + '">' + cover(book(item.href), ' decoding="async"') + '<small>' + e(item.label) + '</small><strong>' + item.title + '</strong></a>').join('');
  const actions = h.cta
    ? '<div class="season-hero-actions"><a class="season-button" href="' + e(h.cta.href) + '">' + e(h.cta.text) + ' <span aria-hidden="true">&rarr;</span></a><a href="/seasons/">All ' + seasonCount + ' seasons</a></div>'
    : '';
  return '<section class="home-season theme-' + e(h.visual) + '" data-home-theme="' + e(theme.slug) + '"' + (h.varied ? '' : ' data-home-single-collection') + ' aria-labelledby="home-season-title">' + garland(h.visual) +
    '<div class="season-wrap"><div class="season-hero-grid"><div class="season-hero-copy">' +
    '<p class="home-occasion" data-home-occasion hidden></p>' +
    '<p class="season-eyebrow">' + e(h.kicker) + '</p>' +
    '<h2 class="home-season-title" id="home-season-title">' + headline(h.headline) + '</h2>' +
    '<p class="season-deck">' + e(h.deck) + '</p>' + actions +
    '<p class="season-period">' + e(h.period) + (h.openAllYear ? ' <span aria-hidden="true">&#10022;</span> Open all year' : '') + '</p>' +
    '</div><div class="season-art">' + scene(h.visual) + '<div class="season-cover-fan">' + covers + '</div>' +
    '<p class="season-art-caption">Complete texts &middot; Astor editions</p></div></div>' +
    '<nav class="season-shelf" aria-label="' + e(h.label) + ' reading from the Astor catalogue">' + shelf + '</nav>' +
    '</div></section>';
}

const heroes = new Map(calendar.themes.map(theme => [theme.slug, homeHero(theme)]));
const versions = {};
const fragmentDir = path.join('assets', 'home-heroes');
fs.mkdirSync(fragmentDir, { recursive: true });
for (const name of fs.readdirSync(fragmentDir)) {
  if (!heroes.has(name.replace(/\.json$/, ''))) fs.rmSync(path.join(fragmentDir, name));
}
for (const [slug, html] of heroes) {
  versions[slug] = require('crypto').createHash('sha256').update(html).digest('hex').slice(0, 10);
  fs.writeFileSync(path.join(fragmentDir, slug + '.json'), JSON.stringify({ slug, html }) + '\n');
}

// The script that runs in the reader's browser: the same calendar function,
// the windows (not the copy), and the version of each fragment. ?date=
// shows the homepage as it will look on another day.
const rules = fs.readFileSync(path.join(__dirname, 'home-calendar-rules.js'), 'utf8')
  .replace(/^\s*\/\/.*\n/gm, '')
  .replace(/\nif \(typeof module[\s\S]*$/, '')
  .replace(/\n\s+/g, '\n')
  .trim();
const windows = {
  themes: calendar.themes.map(theme => ({ slug: theme.slug, when: theme.when, priority: theme.priority })),
  notes: calendar.notes
};
const calendarScript = '<script data-home-calendar>(function(){var s=document.currentScript,h=s&&s.previousElementSibling;' +
  'if(!h||!h.hasAttribute("data-home-theme"))return;try{\n' + rules + '\n' +
  'var C=' + JSON.stringify(windows) + ',V=' + JSON.stringify(versions) + ',' +
  'q=/[?&]date=(\\d{4})-(\\d{2})-(\\d{2})/.exec(location.search),r=astorHomeCalendar(q?new Date(+q[1],q[2]-1,+q[3]):new Date(),C);' +
  'var notes=function(x){var p=x.querySelector("[data-home-occasion]");if(!p||!r.notes.length)return;' +
  'r.notes.forEach(function(o){var l=document.createElement("span"),t=o.text,k=t.indexOf("{link}"),a=null,m;l.className="home-occasion-line";' +
  'if(o.href){a=document.createElement("a");a.href=o.href;a.textContent=o.link}' +
  'if(k<0){l.appendChild(document.createTextNode(t));if(a){m=document.createElement("span");m.setAttribute("aria-hidden","true");m.textContent=" \u2192";a.appendChild(m);l.appendChild(document.createTextNode(" "));l.appendChild(a)}}' +
  'else{l.appendChild(document.createTextNode(t.slice(0,k)));l.appendChild(a||document.createTextNode(o.link));l.appendChild(document.createTextNode(t.slice(k+6)))}p.appendChild(l)});' +
  'p.hidden=false};' +
  'if(!r.theme||r.theme===h.getAttribute("data-home-theme")||!V[r.theme]){notes(h);return}' +
  'h.classList.add("is-switching");' +
  'fetch("/assets/home-heroes/"+r.theme+".json?v="+V[r.theme]).then(function(x){if(!x.ok)throw 0;return x.json()}).then(function(j){' +
  'var t=document.createElement("template");t.innerHTML=j.html;var f=t.content.firstElementChild;h.replaceWith(f);notes(f)})' +
  '.catch(function(){h.classList.remove("is-switching");notes(h)})' +
  '}catch(e){h.classList.remove("is-switching")}})()</script>';

const buildDate = process.env.ASTOR_HOME_DATE ? new Date(process.env.ASTOR_HOME_DATE + 'T12:00:00') : new Date();
const featured = process.env.ASTOR_HOME_SEASON || astorHomeCalendar(buildDate, calendar).theme;
if (!heroes.has(featured)) throw new Error('No homepage hero for ' + featured);
{
  const homepage = fs.readFileSync('index.html', 'utf8');
  const start = '<!-- seasonal-hero:start -->';
  const end = '<!-- seasonal-hero:end -->';
  const from = homepage.indexOf(start);
  const to = homepage.indexOf(end);
  if (from === -1 || to === -1) throw new Error('index.html is missing its seasonal hero markers');
  fs.writeFileSync('index.html', homepage.slice(0, from + start.length) + '\n  ' + heroes.get(featured) + '\n  ' + calendarScript + '\n  ' + homepage.slice(to));
  console.log('Put the ' + featured + ' hero on the homepage, with ' + heroes.size + ' calendar heroes ready to swap in.');
}
console.log('Built '+seasons.length+' permanent seasonal collections and their directory.');
