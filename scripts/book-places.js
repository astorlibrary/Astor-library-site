'use strict';

// Places in a book, read the way the guides and the close readings write them:
// "Act 2, Scene 1" and "2.1" in a play, "Chapter XV", "Chapters IX-X",
// "Book 23", "Stave One", "Sonnet 130". Shared by the What happens pages,
// which list the key lines from each scene, and the close readings, which
// link to the scene their passage comes from.

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

function toNumber(word) {
  const text = String(word).toLowerCase();
  if (/^\d+$/.test(text)) return Number(text);
  if (NUMBER_WORDS[text]) return NUMBER_WORDS[text];
  if (!/^[ivxlc]+$/.test(text)) return NaN;
  const values = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  let total = 0;
  for (let index = 0; index < text.length; index++) {
    const value = values[text[index]];
    const next = values[text[index + 1]] || 0;
    total += value < next ? -value : value;
  }
  return total;
}

// "Act 2, Scene 1" → { kind: 'act', from: 2001, to: 2001 }; "Chapters IX-X" →
// { kind: 'chapter', from: 9, to: 10 }. In a play "2.1" and "2.1.32" are
// scene 2.1. Anything else is null.
function placeOf(text, isPlay) {
  const label = String(text).split('·')[0].trim();
  const act = label.match(/^act (\w+),? scene (\w+)$/i);
  if (act) {
    const at = toNumber(act[1]) * 1000 + toNumber(act[2]);
    return Number.isFinite(at) ? { kind: 'act', from: at, to: at } : null;
  }
  const dotted = label.match(/^(\d+)\.(\d+)(?:\.\d+(?:[-–]\d+)?)?$/);
  if (dotted && isPlay) {
    const at = Number(dotted[1]) * 1000 + Number(dotted[2]);
    return { kind: 'act', from: at, to: at };
  }
  const named = label.match(/^(chapter|book|sonnet|scene|part|letter|stave|canto)s? (\w+)(?:\s*[-–]\s*(\w+))?$/i);
  if (!named) return null;
  const from = toNumber(named[2]);
  const to = named[3] ? toNumber(named[3]) : from;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { kind: named[1].toLowerCase(), from, to };
}

const fold = text => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Whether a reference ("2.1.32", "Chapter 23", "Story of the Door") falls in a
// scene of the guide ("2.1", "Chapters 22-23", "Story of the Door").
function inScene(reference, sceneRef, isPlay) {
  const scene = placeOf(sceneRef, isPlay);
  let place = placeOf(reference, isPlay);
  // A sonnet's lines are given as "18.1–2".
  const numbered = String(reference).match(/^(\d+)\.\d/);
  if (!place && scene && scene.kind === 'sonnet' && numbered) place = { kind: 'sonnet', from: Number(numbered[1]), to: Number(numbered[1]) };
  if (place && scene) return place.kind === scene.kind && scene.from <= place.from && place.to <= scene.to;
  return Boolean(fold(reference)) && fold(reference) === fold(sceneRef);
}

// The first line of a quotation, or its first phrase when the line is long.
// A line that carries its own speech marks keeps them and gets no more.
function quoteOpening(text) {
  let line = String(text).split(/\s\/\s/)[0].trim();
  const wrapped = /^[“"]/.test(line) && !/[”"]\s*\S/.test(line.slice(1).replace(/[”"][\s.,;:!?]*$/, ''));
  if (wrapped) line = line.replace(/^[“"]/, '').replace(/[”"]([.,;:!?]*)$/, '$1');
  const words = line.split(/\s+/);
  let cut = line;
  if (words.length > 12) {
    let end = words.findIndex((word, index) => index >= 4 && /[,;:.!?][”’"]?$/.test(word) && !/^(?:Mr|Mrs|Dr|St|Mme|Mlle|Messrs)\.$/.test(word));
    if (end < 0 || end > 9) end = 7;
    cut = words.slice(0, end + 1).join(' ');
    // A sentence that ends there needs no dots after it.
    if (!/[.!?][”’"]?$/.test(cut)) cut = cut.replace(/[,;:—–-]+([”’"]?)$/, '$1') + '…';
  } else {
    cut = line.replace(/[,;:]$/, '');
  }
  if (!/[“”"]/.test(cut)) return '“' + cut + '”';
  // Speech marks of its own: close any the cut left open, open any it closes.
  const opened = (cut.match(/“/g) || []).length - (cut.match(/”/g) || []).length;
  if (opened > 0) return cut + '”';
  if (opened < 0) return '“' + cut;
  return cut;
}

module.exports = { toNumber, placeOf, inScene, quoteOpening };
