'use strict';

// Where a close reading leads next.
//
// Each page in the Passage Room ends with a short list of the places a reader
// is likely to want after the passage, each named for what it is and with a
// line saying what is there:
//
//   - the passage's own lines in the guide's key quotations, with their analysis
//   - What happens in the scene or chapter the passage comes from
//   - the free study guide to the book
//   - Revise, for the same book
//   - the Astor edition (the book page, with every format and where to buy it)
//   - the printed Study Edition, where there is one
//   - any subject, writer or collection page the reading itself pointed to
//
// The lines are found by matching the passage against the book's key
// quotations, and the scene by matching the place named under the cover
// ("Act 2, Scene 1", "Chapter XV", "Book XXIII") against the guide's scenes.
// Nothing is linked unless it matches one place exactly.

const { sceneAnchors, guideHref } = require('./rebuild-guides');
const { placeOf, quoteOpening: shortQuote } = require('./book-places');

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plain = html => String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const fold = text => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

function sceneFor(book, label) {
  const isPlay = book.form === 'play';
  const wanted = placeOf(label, isPlay);
  if (!wanted || wanted.from !== wanted.to) return null;
  const anchors = sceneAnchors(book);
  const found = [];
  for (const stage of book.structure || []) {
    for (const scene of stage.scenes || []) {
      const place = placeOf(scene.ref, isPlay);
      if (place && place.kind === wanted.kind && place.from <= wanted.from && wanted.from <= place.to) found.push(scene);
    }
  }
  const name = String(label).split('·')[0].trim();
  if (found.length === 1) return { scene: found[0], id: anchors.get(found[0]), label: name };
  if (found.length) return null;
  // No scene of that number: a part of the book with that number ("Stave One").
  const stages = (book.structure || []).filter(stage => {
    const place = placeOf(stage.label || '', isPlay);
    return place && place.kind === wanted.kind && place.from <= wanted.from && wanted.from <= place.to;
  });
  if (stages.length !== 1) return null;
  return { scene: { summary: stages[0].summary || '' }, id: stages[0].id, label: name };
}

// The book's key quotations that appear in the passage, in the passage's order.
// Five words running together are enough: a quotation may begin before the
// passage does, or the passage may print a line with different punctuation.
function linesIn(book, passageHtml) {
  const text = ' ' + fold(passageHtml.replace(/<sup>[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, ' ')) + ' ';
  const found = [];
  for (const quotation of book.quotations || []) {
    const words = fold(quotation.text.replace(/\s\/\s/g, ' ')).split(' ');
    const size = Math.min(5, words.length);
    if (size < 3) continue;
    let at = -1;
    for (let index = 0; index + size <= words.length && at < 0; index++) {
      at = text.indexOf(' ' + words.slice(index, index + size).join(' ') + ' ');
    }
    if (at >= 0) found.push({ quotation, at });
  }
  return found.sort((a, b) => a.at - b.at).map(item => item.quotation);
}

function item(href, label, note) {
  return '<li><a href="' + escapeHtml(href) + '">' + label + '</a>' + (note ? '<span>' + note + '</span>' : '') + '</li>';
}

const EDITION_NOTE = {
  play: 'The complete play with scene summaries, line numbers and notes on the same page, in every format, with where to buy it.',
  default: 'The complete text with notes and context, in every format, with where to buy it.'
};

// html: the built page. context: { book (study record or null), bookHref, studyHref, discovery }.
function passageRoutes(html, context) {
  return html.replace(/<section class="passage-context">([\s\S]*?)(<aside>[\s\S]*?<\/aside>)?\s*<\/section>/, (whole, content, consulted) => {
    const heading = (content.match(/<h2>([\s\S]*?)<\/h2>/) || [, ''])[1];
    const paragraph = (content.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/) || [, ''])[1];
    const links = [...content.matchAll(/<a class="button (?:primary|secondary)" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(match => ({ href: match[1], label: match[2] }));
    const { book, discovery = {} } = context;
    const bookHref = context.bookHref || (links.find(link => link.href.startsWith('/books/')) || {}).href || '';
    const studyLink = links.find(link => /^\/study\/[^/]+\/$/.test(link.href));
    const studyHref = (book && book.studyHref && (discovery.studyEditions || []).some(edition => edition.href === book.studyHref) && book.studyHref) || (studyLink && studyLink.href) || '';
    const endNav = (html.match(/<nav class="passage-end-nav"[\s\S]*?<\/nav>/) || [''])[0];
    const items = [];

    if (book) {
      const passage = (html.match(/<blockquote class="passage-text[^"]*">([\s\S]*?)<\/blockquote>/) || [, ''])[1];
      const lines = linesIn(book, passage).slice(0, 3);
      const where = quotation => guideHref(book.slug, 'quotations') + '#astor-quote-' + quotation.id;
      if (lines.length === 1) {
        items.push(item(where(lines[0]), 'This line in the key quotations',
          escapeHtml(shortQuote(lines[0].text)) + ' (' + escapeHtml(lines[0].reference) + '), with its analysis.'));
      } else if (lines.length > 1) {
        const list = lines.map(line => '<a href="' + escapeHtml(where(line)) + '">' + escapeHtml(shortQuote(line.text)) + '</a> (' + escapeHtml(line.reference) + ')');
        items.push(item(where(lines[0]), 'These lines in the key quotations',
          list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] + ', each with its analysis.'));
      }
      const label = plain((html.match(/<section class="passage-reading-hero">[\s\S]*?<aside>[\s\S]*?<b>([\s\S]*?)<\/b>/) || [, ''])[1]);
      const scene = label ? sceneFor(book, label) : null;
      if (scene && scene.id) {
        items.push(item(guideHref(book.slug, 'what-happens') + '#' + scene.id, 'What happens in ' + escapeHtml(scene.label), escapeHtml(scene.scene.summary || '')));
      }
      items.push(item(guideHref(book.slug), 'Study guide', 'What happens, the characters, the themes and the key quotations. Free on the web, no account.'));
      items.push(item('/play/?book=' + book.slug, 'Revise', 'Ten questions on the book, then quizzes and flashcards on its key lines.'));
    }

    if (bookHref) {
      const own = /^(?:The full (?:Astor|reading) page|Read the full Astor page)/.test(paragraph)
        ? paragraph.replace(/^Read the full Astor page for (\S)/, (match, letter) => letter.toUpperCase())
        : '';
      items.push(item(bookHref, 'The Astor edition', own || EDITION_NOTE[book && book.form === 'play' ? 'play' : 'default']));
    }
    if (studyHref) {
      items.push(item(studyHref, 'Study Edition', 'Printed for students: the complete text with closer analysis, key quotations and context.'));
    }

    // Other pages the reading pointed to: a subject, a writer, a collection,
    // another close reading not already next door.
    const kinds = [discovery.subjects, discovery.authors, discovery.collections, discovery.passages];
    for (const link of links) {
      if (link.href === bookHref || link.href === studyHref || /^\/(?:books|study|resources)\//.test(link.href)) continue;
      if (/^\/passage-room\/./.test(link.href) && endNav.includes('href="' + link.href + '"')) continue;
      const target = kinds.flatMap(list => list || []).find(entry => entry.href === link.href);
      if (!target) continue;
      items.push(item(link.href, escapeHtml(plain(target.title)), escapeHtml(plain(target.description || ''))));
    }

    const title = heading ? ' with <em>' + heading.replace(/<\/?em>/g, '') + '</em>' : '';
    return '<section class="passage-context"><div><h2>Where next' + title + '</h2><ul class="passage-routes">' + items.join('') + '</ul></div>' + (consulted || '') + '</section>';
  });
}

module.exports = { passageRoutes, linesIn, sceneFor, placeOf, shortQuote };
