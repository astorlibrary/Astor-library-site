const fs = require('fs');
const path = require('path');
const resources = require('./resource-data');
const detailedResources = require('./resource-additions');

const root = process.cwd();
const detailedByUrl = new Map(detailedResources.map(resource => [resource.url, resource]));
const PREVIEW_SLIDES = 3;

function singleQuotedProperty(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*'((?:\\\\.|[^'])*)'`));
  return match ? match[1].replace(/\\(['\\])/g, '$1') : '';
}

function presentationCatalog() {
  const source = fs.readFileSync(path.join(root, 'assets', 'presentation-data.js'), 'utf8');
  const starts = Array.from(source.matchAll(/^  '([^']+)':/gm));
  const catalog = new Map();

  starts.forEach((match, index) => {
    const blockEnd = starts[index + 1]?.index ?? source.indexOf('\n};', match.index);
    const block = source.slice(match.index, blockEnd);
    const slideCount = Number(block.match(/slideCount:\s*(\d+)/)?.[1]);
    const title = singleQuotedProperty(block, 'title');
    const backdrop = singleQuotedProperty(block, 'backdrop');
    if (title && backdrop && Number.isSafeInteger(slideCount) && slideCount > 0) {
      catalog.set(match[1], { slug: match[1], title, backdrop, slideCount });
    }
  });

  return catalog;
}

const presentationsBySlug = presentationCatalog();

const categories = {
  shakespeare: {
    label: 'Shakespeare',
    use: 'Check each claim against the scene. Identify the speaker, listener, dramatic situation and action produced by the speech.'
  },
  poetry: {
    label: 'Poetry',
    use: 'Read the poem aloud and examine sound, pace, line endings and repetition before using the prose summary.'
  },
  'eighteenth-century': {
    label: 'Eighteenth-century fiction',
    use: 'Examine the letters, narrators and claims to truth as formal parts of the argument.'
  },
  regency: {
    label: 'Romantic & Regency',
    use: 'Check the exact exchange or paragraph. Austen often creates judgement through narrative distance, timing and differences between speech and narration.'
  },
  victorian: {
    label: 'Victorian & Gothic',
    use: 'Use the guide to check plot, narrative voice and historical context. Examine how documents, houses, secrets and divided narrators function in the novel.'
  },
  modern: {
    label: 'Modern fiction',
    use: 'Identify who narrates the story, what the account omits and how historical context affects the interpretation of voice, silence and form.'
  },
  american: {
    label: 'American literature',
    use: 'Examine the language used to discuss freedom, success, race, power and national identity, and distinguish the narrator’s wording from the guide’s interpretation.'
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

function presentationSlug(url) {
  if (!url.startsWith('/presentations/?')) return '';
  return new URL(url, 'https://astorlibrary.invalid').searchParams.get('presentation') || '';
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
  return `<a href="/subjects/"><span>Subject guides</span><b>Browse subjects and genres</b><em>Find books grouped by form, method or historical subject.</em></a>
<a href="/explore/"><span>Catalogue search</span><b>Find another text or topic</b><em>Search books, writers, subjects, annotated passages and free guides.</em></a>`;
}

function readingNotes(resource, detailed) {
  if (detailed?.readings?.length === 3) return detailed.readings;
  const primary = resource.tags[0] || 'The text';
  const focus = resource.tags[1] || 'Close reading';
  const category = categories[resource.category];
  return [
    {
      label: 'Guide summary',
      title: primary,
      copy: resource.description
    },
    {
      label: 'Textual evidence',
      title: 'Check the language and form',
      copy: category.use
    },
    {
      label: 'Study question',
      title: focus,
      copy: `Use ${focus.toLocaleLowerCase()} as a question and support the answer with quotations or precise references to the text.`
    }
  ];
}

function page(resource) {
  const detailed = detailedByUrl.get(resource.url);
  const category = categories[resource.category];
  const resourceId = presentationSlug(resource.url);
  const isAstorPresentation = Boolean(resourceId && presentationsBySlug.has(resourceId));
  const slideCount = presentationsBySlug.get(resourceId)?.slideCount || null;
  const focus = resource.tags[1] || resource.tags[0] || '';
  const tags = resource.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const facts = [
    ['Resource type', 'Illustrated study guide'],
    ['Subject', category.label],
    focus ? ['Focus', focus] : null,
    slideCount ? ['Length', `${slideCount} slides`] : null
  ].filter(Boolean);
  const factsHtml = `<dl class="resource-facts" aria-label="Resource details">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
  const notes = readingNotes(resource, detailed);
  const notesHtml = notes.map(item => `<article><p class="year">${escapeHtml(item.label)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.copy)}</p></article>`).join('');
  const guidePurpose = detailed?.deck || resource.description;
  const note = detailed?.note || (isAstorPresentation
    ? `Read the introduction and three-slide preview here, then sign in with a free account to continue. Check the guide’s summaries and interpretations against the relevant chapter, scene or poem.`
    : `Read the introduction here, then open the external guide. Check its summaries and interpretations against the relevant chapter, scene or poem.`);
  const scopeNote = isAstorPresentation
    ? `${slideCount} slides · written and published by Astor Library`
    : 'External online guide';
  const contents = detailed?.includes?.length
    ? `<section class="resource-contents-section"><div class="resource-contents-heading"><p class="kicker">Guide contents</p><h2>What the guide covers.</h2><p>${slideCount ? `The complete guide contains ${slideCount} slides.` : 'The complete illustrated guide is available online.'} These principal areas are listed before the link to the preview.</p></div><ol class="resource-contents">${detailed.includes.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${inlineHtml(item)}</p></li>`).join('')}</ol></section>`
    : '';
  const readingHeading = detailed?.sectionHeading || 'Questions and evidence.';
  const readingIntro = detailed?.sectionIntro || 'Use these notes with the relevant words, scene or chapter and cite the evidence for each conclusion.';
  const linkAttributes = isAstorPresentation ? '' : ' target="_blank" rel="noopener noreferrer"';
  const externalArrow = isAstorPresentation ? '&rarr;' : '&nearr;';
  const completionNote = isAstorPresentation
    ? `Preview the first ${PREVIEW_SLIDES} slides without signing in. A free account opens the complete illustrated guide in your browser.`
    : 'This page lists the guide’s contents and related Astor editions. The complete illustrated guide opens in a new tab.';
  const openCopy = isAstorPresentation
    ? `Read the first ${PREVIEW_SLIDES} slides without signing in. Create a free Astor account or sign in when you are ready to continue.`
    : 'The guide is free to read in a browser and opens in a new tab.';
  const metaDescription = isAstorPresentation
    ? `${resource.description} Preview three slides and use a free Astor account to read the complete guide.`
    : `${resource.description} Open the complete guide online.`;
  const availability = isAstorPresentation
    ? `${PREVIEW_SLIDES}-slide preview · free account for the full guide`
    : 'External online guide';
  const primaryAction = isAstorPresentation ? 'Preview the guide' : 'Open the guide';
  const heroAction = isAstorPresentation ? `Open the ${PREVIEW_SLIDES}-slide preview` : 'Open the complete guide';
  const openKicker = isAstorPresentation ? 'Preview and continue' : 'Open online';
  const next = encodeURIComponent(resource.route);
  const libraryPanel = isAstorPresentation
    ? `<section class="resource-library-panel" data-resource-library data-resource-id="${escapeHtml(resourceId)}" aria-labelledby="resource-library-title">
  <div><p class="kicker">Your Astor library</p><h2 id="resource-library-title">Read now. Save for later.</h2><p class="resource-library-access" data-resource-access-status>Guest access · first ${PREVIEW_SLIDES} slides available</p><p class="resource-library-message" data-resource-library-status role="status" aria-live="polite">Preview ${PREVIEW_SLIDES} slides now. Sign in to save this guide and read every slide.</p></div>
  <div class="resource-library-actions"><button type="button" data-resource-save aria-pressed="false" hidden>Save guide</button><a href="/account/" data-resource-account hidden>Account</a><a href="/account/?mode=signin&amp;next=${next}" data-resource-signin>Sign in</a><a href="/account/?mode=register&amp;next=${next}" data-resource-register>Create free account</a></div>
</section>`
    : `<section class="resource-library-panel resource-library-panel--external" data-resource-library aria-labelledby="resource-library-title">
  <div><p class="kicker">External resource</p><h2 id="resource-library-title">Continue on the linked site.</h2><p class="resource-library-access" data-resource-access-status>External guide · access is handled on the linked site</p><p class="resource-library-message" data-resource-library-status role="status" aria-live="polite">This external resource is not stored in your Astor account.</p></div>
</section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(resource.seoTitle || resource.title)} | Astor Library</title>
<meta name="description" content="${escapeHtml(metaDescription)}">
<link rel="stylesheet" href="/assets/styles.css">
<script src="/assets/auth.js" defer></script>
<script src="/assets/resource-library.js" defer></script>
</head>
<body class="resource-detail-page">
${header()}
<main class="page-wrap resource-landing-page">
<section class="page-intro resource-page-intro"><div><p class="kicker">Free online guide · ${escapeHtml(category.label)}</p><h1>${resource.titleHtml}</h1><p class="deck">${inlineHtml(guidePurpose)}</p><div class="button-row"><a class="button primary" href="${escapeHtml(resource.url)}"${linkAttributes}>${primaryAction} <span aria-hidden="true">${externalArrow}</span></a><a class="button secondary" href="/resources/">All free resources</a></div></div><aside class="source-note"><p><strong>${escapeHtml(scopeNote)}</strong></p><p>${completionNote}</p></aside></section>

${libraryPanel}

<section class="resource-layout resource-landing-hero">
  <figure class="resource-cover-panel"><img src="${assetPath(resource.image)}" alt="${escapeHtml(resource.title)} cover"><figcaption>Astor Library free resource</figcaption></figure>
  <article class="resource-meta">
    <div class="tag-row">${tags}</div>
    <p class="resource-availability">${availability}</p>
    <h2>Subject and purpose of the guide.</h2>
    <p>${escapeHtml(resource.description)}</p>
    <p>${escapeHtml(category.use)}</p>
    ${factsHtml}
    <div class="resource-page-actions"><a href="${escapeHtml(resource.url)}"${linkAttributes}>${heroAction} <span aria-hidden="true">${externalArrow}</span></a><a href="/resources/">Return to the free library</a></div>
  </article>
</section>

${contents}

<section class="resource-reading-section"><div class="section-title guide-title"><p class="kicker">Reading notes</p><h2>${escapeHtml(readingHeading)}</h2><p>${inlineHtml(readingIntro)}</p></div><div class="guide-reading">${notesHtml}</div></section>

<aside class="note-box resource-use-note"><p><strong>How to use this guide.</strong> ${escapeHtml(note)}</p></aside>

<section class="resource-open-band"><div><p class="kicker">${openKicker}</p><h2>Open the illustrated guide.</h2><p>${openCopy}</p></div><a class="button primary" href="${escapeHtml(resource.url)}"${linkAttributes}>${primaryAction} <span aria-hidden="true">${externalArrow}</span></a></section>

<section class="resource-related"><div><p class="kicker">Related catalogue pages</p><h2>Relevant books and subject guides.</h2></div><div class="resource-related-links">${relatedLinks(resource)}</div></section>
</main>
<footer class="site-footer"><div><p class="footer-brand">Astor Library</p><p>Complete classic texts, study editions and free literature resources.</p></div><div class="footer-links"><a href="/resources/">All free resources</a><a href="/library/">Books</a><a href="/subjects/">Subjects</a><a href="/editorial/">Editorial standards</a></div></footer>
</body>
</html>`;
}

for (const resource of resources) {
  const directory = path.join(root, resource.route.replace(/^\//, ''));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), page(resource));
}

const landingByPresentation = new Map();
for (const resource of resources) {
  const slug = presentationSlug(resource.url);
  if (slug && !landingByPresentation.has(slug)) landingByPresentation.set(slug, resource);
}

const libraryData = Array.from(presentationsBySlug.values()).map(presentation => {
  const resource = landingByPresentation.get(presentation.slug);
  const category = resource ? categories[resource.category] : null;
  return {
    id: presentation.slug,
    title: resource?.title || presentation.title,
    description: resource?.description || '',
    resourceHref: resource?.route || '',
    viewerUrl: `/presentations/?presentation=${presentation.slug}`,
    image: presentation.backdrop,
    type: 'Illustrated study guide',
    subject: category?.label || '',
    focus: resource?.tags?.[1] || resource?.tags?.[0] || ''
  };
});

fs.writeFileSync(
  path.join(root, 'assets', 'resource-library-data.json'),
  `${JSON.stringify({ resources: libraryData }, null, 2)}\n`
);

console.log(`Built ${resources.length} Astor landing pages and ${libraryData.length} dashboard resource records.`);
