const fs = require('fs');
const path = require('path');
const resources = require('./resource-data');
const detailedResources = require('./resource-additions');

const root = process.cwd();
const detailedByUrl = new Map(detailedResources.map(resource => [resource.url, resource]));

const categories = {
  shakespeare: {
    label: 'Shakespeare',
    use: 'Keep the scene and its dramatic situation open beside the guide. The useful question is not simply what a theme means, but who is speaking, who is listening and what the language is trying to make happen.'
  },
  poetry: {
    label: 'Poetry',
    use: 'Read the poem aloud before settling on an interpretation. Sound, pace, line ending and repetition often carry an argument that a prose summary cannot preserve.'
  },
  'eighteenth-century': {
    label: 'Eighteenth-century fiction',
    use: 'Keep the form of the writing in view. Letters, narrators and claims to truth are part of the argument, not neutral containers for the story.'
  },
  regency: {
    label: 'Romantic & Regency',
    use: 'Return from the guide to the exact exchange or paragraph. Austen’s judgements are often made through distance, timing and the difference between what a character says and what the narration allows us to see.'
  },
  victorian: {
    label: 'Victorian & Gothic',
    use: 'Use the guide to keep plot, voice and historical pressure together. Documents, houses, secrets and divided narrators matter because of the work the novel makes them do.'
  },
  modern: {
    label: 'Modern fiction',
    use: 'Notice who is allowed to tell the story and what that account cannot settle. Historical context matters most when it changes how a voice, silence or formal choice can be read.'
  },
  american: {
    label: 'American literature',
    use: 'Keep voice and public language together. These guides are most useful when they send you back to the words through which freedom, success, race, power or national identity are being argued.'
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textOnly(value) {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&(?:rsquo|lsquo);/g, '’')
    .replace(/&(?:rdquo|ldquo);/g, '“')
    .replace(/\s+/g, ' ')
    .trim();
}

function inlineHtml(value) {
  return escapeHtml(value)
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>');
}

function assetPath(file) {
  return '/' + encodeURIComponent(file).replace(/'/g, '%27');
}

function header() {
  return `<header class="site-header">
<a class="brand" href="/" aria-label="Astor Library home"><span class="word">ASTOR</span><img class="torch-mark" src="/assets/astor-torch.svg" alt="Astor Library torch"><span class="word">LIBRARY</span></a>
<nav class="nav" aria-label="Primary navigation"><a class="nav-link" href="/">Home</a><a class="nav-link" href="/explore/">Explore</a><a class="nav-link" href="/passage-room/">Passages</a><a class="nav-link" href="/subjects/">Subjects</a><a class="nav-link" href="/authors/">Writers</a><a class="nav-link" href="/library/">All books</a><a class="nav-link" href="/study/">Study editions</a><a class="nav-link" href="/resources/" aria-current="page">Free resources</a></nav>
</header>`;
}

function bookTitle(href) {
  const file = path.join(root, href.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(file)) return 'Related Astor edition';
  const html = fs.readFileSync(file, 'utf8');
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return heading ? textOnly(heading[1]).replace(/\.$/, '') : 'Related Astor edition';
}

function relatedLinks(resource) {
  const books = resource.relatedBooks || [];
  if (books.length) {
    return books.map(href => `<a href="${escapeHtml(href)}"><span>Astor reading page</span><b>${escapeHtml(bookTitle(href))}</b><em>Read the book’s introduction, context and further material.</em></a>`).join('');
  }
  return `<a href="/subjects/"><span>Continue in Astor Library</span><b>Read by subject</b><em>Move from this guide to books joined by form, method or question.</em></a>
<a href="/explore/"><span>Search the whole library</span><b>Find another text or topic</b><em>Search books, writers, subjects, close readings and free guides together.</em></a>`;
}

function readingNotes(resource, detailed) {
  if (detailed?.readings?.length === 3) return detailed.readings;
  const primary = resource.tags[0] || 'The text';
  const focus = resource.tags[1] || 'Close reading';
  const category = categories[resource.category];
  return [
    {
      label: 'Begin with the guide',
      title: primary,
      copy: resource.description
    },
    {
      label: 'Return to the work',
      title: 'Keep the language in view',
      copy: category.use
    },
    {
      label: 'Carry one question',
      title: focus,
      copy: `Use ${focus.toLocaleLowerCase()} as a question to test against the text, rather than as a label that settles it in advance.`
    }
  ];
}

function page(resource) {
  const detailed = detailedByUrl.get(resource.url);
  const category = categories[resource.category];
  const tags = resource.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const notes = readingNotes(resource, detailed);
  const notesHtml = notes.map(item => `<article><p class="year">${escapeHtml(item.label)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.copy)}</p></article>`).join('');
  const guidePurpose = detailed?.deck || resource.description;
  const note = detailed?.note ||
    `Read the introduction here first, then open the complete guide. Keep the relevant chapter, scene or poem nearby so that the resource remains a way back into the writing.`;
  const scopeNote = detailed?.pageCount
    ? `${detailed.pageCount} sections · written and published by Astor Library`
    : 'Written and published by Astor Library';
  const contents = detailed?.includes?.length
    ? `<section class="resource-contents-section"><div class="resource-contents-heading"><p class="kicker">Inside the guide</p><h2>A full route through the subject.</h2><p>The online edition contains ${detailed.pageCount} sections. Its main lines of enquiry are set out here so that you can see the shape of the work before opening it.</p></div><ol class="resource-contents">${detailed.includes.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${inlineHtml(item)}</p></li>`).join('')}</ol></section>`
    : '';
  const readingHeading = detailed?.sectionHeading || 'Read, test, return.';
  const readingIntro = detailed?.sectionIntro || 'Use these notes as starting points, then test them against the words, scene or chapter in front of you.';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(resource.seoTitle || resource.title)} | Astor Library</title>
<meta name="description" content="${escapeHtml(resource.description)}">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="resource-detail-page">
${header()}
<main class="page-wrap resource-landing-page">
<section class="page-intro resource-page-intro"><div><p class="kicker">Free online guide · ${escapeHtml(category.label)}</p><h1>${resource.titleHtml}</h1><p class="deck">${inlineHtml(guidePurpose)}</p><div class="button-row"><a class="button primary" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">Read the complete guide <span aria-hidden="true">&nearr;</span></a><a class="button secondary" href="/resources/">All free resources</a></div></div><aside class="source-note"><p><strong>${escapeHtml(scopeNote)}</strong></p><p>The reading notes, catalogue links and guide record stay here on astorlibrary.com; the full illustrated guide opens in its own tab.</p></aside></section>

<section class="resource-layout resource-landing-hero">
  <figure class="resource-cover-panel"><img src="${assetPath(resource.image)}" alt="${escapeHtml(resource.title)} cover"><figcaption>Astor Library free resource</figcaption></figure>
  <article class="resource-meta">
    <div class="tag-row">${tags}</div>
    <p class="resource-availability">Free · no sign-in · read in your browser</p>
    <h2>The work in view.</h2>
    <p>${escapeHtml(resource.description)}</p>
    <p>${escapeHtml(category.use)}</p>
    <div class="resource-page-actions"><a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">Read the complete online guide <span aria-hidden="true">&nearr;</span></a><a href="/resources/">Return to the free library</a></div>
  </article>
</section>

${contents}

<section class="resource-reading-section"><div class="section-title guide-title"><p class="kicker">Reading notes</p><h2>${escapeHtml(readingHeading)}</h2><p>${inlineHtml(readingIntro)}</p></div><div class="guide-reading">${notesHtml}</div></section>

<aside class="note-box resource-use-note"><p><strong>A useful way in.</strong> ${escapeHtml(note)}</p></aside>

<section class="resource-open-band"><div><p class="kicker">The complete resource</p><h2>Read the illustrated guide.</h2><p>The full guide opens in a new tab. This page stays open as its catalogue record and route back into Astor Library.</p></div><a class="button primary" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">Open free guide <span aria-hidden="true">&nearr;</span></a></section>

<section class="resource-related"><div><p class="kicker">Continue with Astor</p><h2>Books and related reading.</h2></div><div class="resource-related-links">${relatedLinks(resource)}</div></section>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>The original work remains at the centre.</p></div><div class="footer-links"><a href="/resources/">All free resources</a><a href="/library/">Books</a><a href="/subjects/">Subjects</a><a href="/editorial/">How we work</a></div></footer>
</body>
</html>`;
}

for (const resource of resources) {
  const directory = path.join(root, resource.route.replace(/^\//, ''));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), page(resource));
}

console.log(`Built ${resources.length} Astor landing pages for the free online guides.`);
