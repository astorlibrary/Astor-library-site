// A one-page revision sheet, built from a book's record.
//
// The shape of the book, who is who, the themes in a sentence each, the lines
// worth knowing with their references, the techniques, and three questions to
// practise on. It is drawn on the page so it can be read there, and the print
// stylesheet drops everything else when it is sent to a printer.

import { el } from './util.mjs';

function firstSentence(text) {
  const match = /^(.+?[.!?])(\s|$)/.exec(String(text || '').trim());
  return match ? match[1] : String(text || '');
}

// One quotation per theme first, so the sheet covers the book rather than
// one part of it, and then the rest in order until there are eight.
function chooseQuotations(book, limit = 8) {
  const chosen = [];
  const used = new Set();
  for (const theme of book.themes) {
    const quotation = book.quotations.find(item => !used.has(item.id) && (item.themes || []).includes(theme.id));
    if (quotation) { chosen.push(quotation); used.add(quotation.id); }
    if (chosen.length >= limit) break;
  }
  for (const quotation of book.quotations) {
    if (chosen.length >= limit) break;
    if (!used.has(quotation.id)) { chosen.push(quotation); used.add(quotation.id); }
  }
  return chosen;
}

export function buildSheet(book) {
  const glance = (book.atAGlance || []).slice(0, 3).map(item => item.label + ': ' + item.value);
  const sheet = el('article', { class: 'astor-sheet', 'aria-label': 'Revision sheet for ' + book.title });

  sheet.append(el('header', { class: 'astor-sheet-head' }, [
    el('p', { class: 'kicker', text: 'Astor Library · revision sheet' }),
    el('h2', { text: book.title }),
    el('p', { text: [book.author, book.form ? book.form.replace(/^./, character => character.toUpperCase()) : '', book.period].filter(Boolean).join(' · ') +
      (glance.length ? ' · ' + glance.join(' · ') : '') })
  ]));

  const columns = el('div', { class: 'astor-sheet-columns' });

  columns.append(el('section', {}, [
    el('h3', { text: 'Structure' }),
    el('ol', { class: 'astor-sheet-list' }, book.structure.map(stage =>
      el('li', {}, [el('b', { text: stage.label }), document.createTextNode(stage.title ? ' — ' + stage.title : '')])))
  ]));

  columns.append(el('section', {}, [
    el('h3', { text: 'Characters' }),
    el('ul', { class: 'astor-sheet-list' }, book.characters.map(character =>
      el('li', {}, [el('b', { text: character.name }), document.createTextNode(character.role ? ' — ' + character.role : '')])))
  ]));

  columns.append(el('section', {}, [
    el('h3', { text: 'Themes' }),
    el('ul', { class: 'astor-sheet-list' }, book.themes.map(theme =>
      el('li', {}, [el('b', { text: theme.name }), document.createTextNode(' — ' + firstSentence(theme.summary))])))
  ]));

  columns.append(el('section', {}, [
    el('h3', { text: 'Form and language' }),
    el('ul', { class: 'astor-sheet-list' }, book.techniques.slice(0, 5).map(technique =>
      el('li', {}, [el('b', { text: technique.name }), document.createTextNode(' — ' + firstSentence(technique.inThisBook || technique.definition))])))
  ]));

  sheet.append(columns);

  sheet.append(el('section', { class: 'astor-sheet-quotes' }, [
    el('h3', { text: 'Lines to know' }),
    el('ul', { class: 'astor-sheet-list' }, chooseQuotations(book).map(quotation =>
      el('li', {}, [
        el('q', { text: quotation.text }),
        el('small', { text: ' ' + (quotation.speaker ? quotation.speaker + ', ' : '') + quotation.reference })
      ])))
  ]));

  if ((book.essayQuestions || []).length) {
    sheet.append(el('section', {}, [
      el('h3', { text: 'Questions to practise' }),
      el('ol', { class: 'astor-sheet-list' }, book.essayQuestions.slice(0, 3).map(question =>
        el('li', { text: question.question })))
    ]));
  }

  sheet.append(el('footer', { class: 'astor-sheet-foot', text: 'Every quotation is checked against the source text. astorlibrary.com' + book.href }));
  return sheet;
}
