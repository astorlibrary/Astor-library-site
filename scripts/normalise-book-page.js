// Brings every book page into one order without losing a single block.
const VOID = new Set(['img','br','hr','meta','link','input','source','col','area','base','embed','track','wbr','path','circle','rect','line','polygon','polyline','ellipse','use','stop']);

// Returns the index just past the element that starts at `from`.
function elementEnd(html, from) {
  const tagName = (html.slice(from).match(/^<([a-zA-Z][\w-]*)/) || [])[1];
  if (!tagName) return -1;
  if (VOID.has(tagName.toLowerCase())) return html.indexOf('>', from) + 1;
  const pattern = new RegExp('<(/?)' + tagName + '\\b[^>]*?(/?)>', 'gi');
  pattern.lastIndex = from;
  let depth = 0;
  let match;
  while ((match = pattern.exec(html))) {
    if (match[2] === '/') continue;
    depth += match[1] ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  return -1;
}

// The top-level children of <main>, in source order.
function topLevelBlocks(inner) {
  const blocks = [];
  let at = 0;
  while (at < inner.length) {
    const next = inner.indexOf('<', at);
    if (next === -1) { if (inner.slice(at).trim()) blocks.push({ text: inner.slice(at), loose: true }); break; }
    if (inner.slice(at, next).trim()) blocks.push({ text: inner.slice(at, next), loose: true });
    if (inner.startsWith('<!--', next)) { const close = inner.indexOf('-->', next) + 3; blocks.push({ text: inner.slice(next, close), loose: true }); at = close; continue; }
    const end = elementEnd(inner, next);
    if (end === -1) { blocks.push({ text: inner.slice(next), loose: true }); break; }
    blocks.push({ text: inner.slice(next, end), loose: false });
    at = end;
  }
  return blocks;
}

const ORDER = [
  { rank: 0, test: b => /^<nav[^>]*class="[^"]*book-breadcrumb/.test(b) },
  { rank: 1, test: b => /^<section[^>]*class="[^"]*page-intro/.test(b) },
  // A few pages open on a hero of their own (crown-hero, storm-hero…), which
  // holds the title and belongs at the top like any other.
  { rank: 1, test: b => /^<section[^>]*class="[a-z]+-hero\b/.test(b) },
  { rank: 1.5, test: b => /^<nav[^>]*class="book-ways/.test(b) },
  { rank: 2, test: b => /^<aside[^>]*class="[^"]*astor-page-credit/.test(b) },
  { rank: 2.5, test: b => /^<section[^>]*class="astor-buy"/.test(b) },
  { rank: 3, test: b => /^<section[^>]*class="[^"]*quick-facts/.test(b) },
  { rank: 4, test: b => /^<nav[^>]*class="[^"]*page-contents/.test(b) },
  { rank: 5, test: b => /^<section[^>]*class="astor-toolkit"/.test(b) },
  // What the edition is comes before the book's history: its sample pages,
  // its card, its formats and the choice between editions.
  { rank: 6, test: b => /^<(?:section|article)[^>]*class="(?:edition-sample|edition-card|edition-format-panel|edition-choice-band)\b/.test(b) },
  { rank: 6.5, test: b => /^<section[^>]*class="book-study"/.test(b) },
  { rank: 9, test: b => /^<section[^>]*class="[^"]*book-passage-shelf/.test(b) },
  { rank: 10, test: b => /^<section[^>]*class="[^"]*context-image-shelf/.test(b) },
  { rank: 11, test: b => /^<aside[^>]*class="[^"]*season-book-backlinks/.test(b) },
  { rank: 12, test: b => /^<nav[^>]*class="[^"]*book-end-nav/.test(b) }
];

function rankOf(text) {
  for (const entry of ORDER) if (entry.test(text)) return entry.rank;
  return 7; // the book's own material keeps its place in the middle
}

// A heading that introduces the edition itself ("What this Astor edition
// contains", the editorial method), which moves up with the block it heads.
function headsEdition(text) {
  if (!/^<section[^>]*class="section-title/.test(text)) return false;
  if (/\bid="(?:edition|editorial)"/.test(text.slice(0, text.indexOf('>') + 1))) return true;
  const heading = (text.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [, ''])[1].replace(/<[^>]+>/g, '');
  return /Astor edition|edition contains|Edition contents|Choose your edition/i.test(heading);
}

function normaliseBookOrder(html) {
  const mainMatch = html.match(/<main\b[^>]*>/);
  if (!mainMatch) return html;
  const innerStart = mainMatch.index + mainMatch[0].length;
  const innerEnd = html.lastIndexOf('</main>');
  if (innerEnd <= innerStart) return html;
  let inner = html.slice(innerStart, innerEnd);

  // The study tools are injected wherever an edition card happened to sit.
  // Lift them out so they can take the same place on every page.
  const toolkitStart = inner.indexOf('<section class="astor-toolkit"');
  let toolkit = '';
  if (toolkitStart !== -1) {
    const toolkitEnd = elementEnd(inner, toolkitStart);
    if (toolkitEnd !== -1) {
      toolkit = inner.slice(toolkitStart, toolkitEnd);
      inner = inner.slice(0, toolkitStart) + inner.slice(toolkitEnd);
    }
  }

  const blocks = topLevelBlocks(inner).filter(block => block.text.trim());
  if (toolkit) blocks.push({ text: toolkit, loose: false });

  const ranked = blocks.map((block, index) => ({ ...block, index, rank: block.loose ? 7 : rankOf(block.text.trim()) }));
  for (let at = 0; at < ranked.length; at += 1) {
    if (ranked[at].loose || !headsEdition(ranked[at].text.trim())) continue;
    ranked[at].rank = 6;
    const next = ranked[at + 1];
    if (next && !next.loose && next.rank === 7 && !/^<section[^>]*class="section-title/.test(next.text.trim())) next.rank = 6;
  }
  const ordered = ranked.slice().sort((a, b) => a.rank - b.rank || a.index - b.index);

  // Nothing may be lost: the same blocks must come out as went in.
  const before = blocks.map(b => b.text.trim()).sort().join('\u0000');
  const after = ordered.map(b => b.text.trim()).sort().join('\u0000');
  if (before !== after) return html;

  const rebuilt = '\n  ' + ordered.map(block => block.text.trim()).join('\n\n  ') + '\n';
  return html.slice(0, innerStart) + rebuilt + html.slice(innerEnd);
}

module.exports = { normaliseBookOrder, topLevelBlocks, elementEnd };
