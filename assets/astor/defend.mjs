// Defend the reading.
//
// A critical position appears with the strongest objection to it already in
// view. The reader assembles the evidence for their side, then has to say what
// the best counter-evidence actually costs them. It is the part of literary
// argument a quiz cannot test: holding two defensible readings at once and
// choosing between them for a reason.
//
// The positions are described in Astor Library's own words. No words are put
// into a named critic's mouth.

import { el, clear, shuffle } from './util.mjs';
import { withBooks } from './chooser.mjs';

const chooser = document.querySelector('#astor-defend-chooser');
const mount = document.querySelector('#astor-defend');

if (mount) {
  withBooks(chooser, {
    label: 'Argue about which book?',
    filter: book => (book.criticalViews || []).length >= 2 && book.quotations.length >= 6
  }, book => render(book));
}

function render(book) {
  clear(mount);
  const views = book.criticalViews;
  let index = 0;
  let side = 'for';
  const chosen = new Set();
  let concession = '';

  const panel = el('div', { class: 'astor-toolkit' });
  mount.append(panel);

  function draw() {
    clear(panel);
    const view = views[index];

    panel.append(el('div', { class: 'astor-toolkit-head' }, [
      el('div', {}, [
        el('p', { class: 'kicker', text: 'A reading of ' + book.title }),
        el('h2', { text: view.position }),
        el('p', { text: view.summary })
      ]),
      el('div', { class: 'astor-toolkit-actions' }, [
        el('button', {
          class: 'button secondary', type: 'button', text: 'Another reading',
          onclick: () => { index = (index + 1) % views.length; chosen.clear(); concession = ''; draw(); }
        })
      ])
    ]));

    const inner = el('div', { class: 'astor-panel' });

    inner.append(el('article', { class: 'astor-note' }, [
      el('h4', { text: 'The strongest thing against it' }),
      el('p', { text: view.counter || 'No standing objection is recorded for this reading. Construct one: what would the play have to do differently for this reading to fail?' })
    ]));

    inner.append(el('p', { class: 'astor-compare-heading', text: 'Which side are you taking?' }));
    const sides = el('div', { class: 'astor-tag-row' });
    for (const [key, label] of [['for', 'Defend the reading'], ['against', 'Argue against it']]) {
      sides.append(el('button', {
        class: 'astor-filter', type: 'button', 'aria-pressed': String(side === key), text: label,
        onclick: () => { side = key; draw(); }
      }));
    }
    inner.append(sides);

    inner.append(el('p', { class: 'astor-compare-heading', text: 'Your evidence' }));
    inner.append(el('p', {
      class: 'astor-inline-note',
      text: 'Choose three or four quotations that carry your side of the argument. A reading defended on one line is a reading that has not been tested.'
    }));

    const list = el('div', { class: 'astor-quote-list' });
    for (const quotation of book.quotations) {
      const card = el('article', { class: 'astor-quote-card' });
      card.append(el('blockquote', {}, [el('p', { text: quotation.text })]));
      card.append(el('p', {
        class: 'astor-quote-attribution',
        text: (quotation.speaker ? quotation.speaker + ' · ' : '') + book.title + ' ' + quotation.reference
      }));
      const pick = el('button', {
        class: 'astor-save-quote', type: 'button',
        'aria-pressed': String(chosen.has(quotation.id)),
        text: chosen.has(quotation.id) ? 'In your case' : 'Use this'
      });
      pick.addEventListener('click', () => {
        if (chosen.has(quotation.id)) chosen.delete(quotation.id); else chosen.add(quotation.id);
        draw();
      });
      card.append(el('div', { class: 'astor-quote-foot' }, [pick]));
      list.append(card);
    }
    inner.append(list);

    if (chosen.size >= 2) {
      inner.append(el('p', { class: 'astor-compare-heading', text: 'Now the hard part' }));
      const counterQuote = pickCounterEvidence(book, chosen);
      if (counterQuote) {
        inner.append(el('article', { class: 'astor-note' }, [
          el('h4', { text: 'Evidence you have not used' }),
          el('blockquote', { class: 'astor-game-quote' }, [el('p', { text: counterQuote.text })]),
          el('p', { class: 'astor-quote-attribution', text: (counterQuote.speaker ? counterQuote.speaker + ' · ' : '') + book.title + ' ' + counterQuote.reference }),
          el('p', { class: 'astor-note-aside', text: counterQuote.analysis })
        ]));
      }
      const note = el('textarea', {
        value: concession,
        'aria-label': 'What the other side costs your argument',
        placeholder: 'What does the strongest objection actually cost you? An argument that concedes nothing has not met the other side.'
      });
      note.addEventListener('input', () => { concession = note.value; });
      inner.append(note);
      inner.append(el('div', { class: 'button-row' }, [
        el('button', {
          class: 'button primary', type: 'button', text: 'Show me the case I have built',
          onclick: () => showCase(book, view, side, chosen, concession)
        })
      ]));
    }

    panel.append(inner);
  }

  function showCase(currentBook, view, currentSide, ids, currentConcession) {
    const quotations = currentBook.quotations.filter(quotation => ids.has(quotation.id));
    const lines = [
      currentSide === 'for' ? 'Defending: ' + view.position : 'Arguing against: ' + view.position,
      '',
      view.summary,
      '',
      'Evidence:'
    ];
    for (const quotation of quotations) {
      lines.push('  “' + quotation.text + '” — ' + currentBook.title + ' ' + quotation.reference);
    }
    lines.push('', 'The objection: ' + (view.counter || '—'));
    lines.push('What it costs: ' + (currentConcession.trim() || '[not yet written]'));

    const sheet = el('section', { class: 'astor-worksheet' });
    sheet.append(el('h3', { text: 'Your case' }));
    sheet.append(el('p', { class: 'astor-worksheet-meta', text: currentBook.title + ' · ' + quotations.length + ' pieces of evidence' }));
    sheet.append(el('pre', { class: 'astor-analysis', style: 'white-space:pre-wrap;font-family:inherit', text: lines.join('\n') }));
    if (!currentConcession.trim()) {
      sheet.append(el('p', { class: 'astor-inline-note', text: 'The case is not finished until you have said what the objection costs it.' }));
    }
    const existing = mount.querySelector('.astor-worksheet');
    if (existing) existing.replaceWith(sheet); else mount.append(sheet);
    sheet.scrollIntoView({ block: 'start' });
  }

  draw();
}

// Something the reader has deliberately not used is a better prompt than a
// random line: it is the evidence their argument has to survive.
function pickCounterEvidence(book, chosen) {
  const unused = book.quotations.filter(quotation => !chosen.has(quotation.id));
  const chosenThemes = new Set(book.quotations
    .filter(quotation => chosen.has(quotation.id))
    .flatMap(quotation => quotation.themes || []));
  const contrasting = unused.filter(quotation => !(quotation.themes || []).some(id => chosenThemes.has(id)));
  return shuffle(contrasting.length ? contrasting : unused)[0] || null;
}
