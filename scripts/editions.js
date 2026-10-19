// Each book's Revise "edition": the design that makes revising Pride and
// Prejudice feel different from revising Frankenstein, worked out from the
// book's actual Astor edition rather than drawn by hand for every title.
//
// An edition has two parts.
//
//   Palettes  a light and a dark set of colours, both drawn from the cover
//             (assets/edition-colours.json: the ground it is printed on) and
//             the book's accent (assets/book-accents.json: the hue of its
//             drawings). Every pair that carries text is checked here for
//             contrast, so no edition can ship unreadable. `mode` says which
//             of the two the book wears by default: a cover printed on a deep
//             colour, or a Gothic tale, starts dark; the reader can override.
//
//   Register  the book's character, as three choices the stylesheet knows:
//               layout   centred | page | framed   how a question, a result
//                        and the book's home are composed
//               voice    italic | roman | caps     how the display type speaks
//               texture  plain | laid | ruled | grain | glow
//             chosen from the book's period, form and genre, so a Regency
//             novel reads like a page, a tragedy like a speech and a modern
//             novel like a jacket.
//
// scripts/edition-overrides.json can set any of these for a particular title.
// The game mechanics, navigation and accessibility never vary: only these
// tokens and three data attributes do (see the "rx: editions" block of
// assets/astor-study.css).

const fs = require('fs');
const path = require('path');

// --- colour arithmetic -------------------------------------------------------

function parse(hex) {
  const value = String(hex).replace('#', '');
  return [0, 2, 4].map(at => parseInt(value.slice(at, at + 2), 16));
}
function hex(rgb) {
  return '#' + rgb.map(channel => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, amount) {
  const left = parse(a);
  const right = parse(b);
  return hex(left.map((channel, index) => channel + (right[index] - channel) * amount));
}
function luminance(colour) {
  const [r, g, b] = parse(colour).map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
// Move a colour towards `towards` in small steps until it reaches the ratio
// against `against`; the hue survives because the steps are small.
function reach(colour, against, ratio, towards) {
  let value = colour;
  for (let step = 0; step < 40 && contrast(value, against) < ratio; step += 1) value = mix(value, towards, 0.08);
  return value;
}
// Darken or lighten a colour (by mixing with black or a warm white) until its
// luminance is close to `target`.
function toLuminance(colour, target) {
  let low = 0;
  let high = 1;
  const towards = luminance(colour) > target ? '#000000' : '#fffaf2';
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2;
    if ((luminance(mix(colour, towards, middle)) > target) === (towards === '#000000')) low = middle; else high = middle;
  }
  return mix(colour, towards, (low + high) / 2);
}
function rgba(colour, alpha) {
  return 'rgba(' + parse(colour).join(',') + ',' + alpha + ')';
}

// --- the two palettes --------------------------------------------------------

const PAPER = '#fbf8f2';
const NIGHT = '#0d0c0a';
const CREAM = '#f6f1e8';

function lightPalette(ground, accent) {
  // A light cover keeps its own paper (Macbeth's ivory); a coloured or dark
  // one tints the house paper with its hue (Austen's sage).
  const paper = luminance(ground) > 0.62 ? mix(ground, PAPER, 0.35) : mix(PAPER, luminance(ground) > 0.2 ? ground : accent, luminance(ground) > 0.2 ? 0.24 : 0.12);
  const surface = mix(paper, '#ffffff', 0.62);
  const sunk = mix(paper, accent, 0.07);
  const ink = reach(mix('#1a1613', accent, 0.12), paper, 12, '#000000');
  const soft = reach(mix(ink, paper, 0.38), paper, 5.2, ink);
  const accentText = reach(accent, sunk, 5, '#000000');
  const button = accentText;
  const buttonInk = reach('#fffaf3', button, 4.6, '#ffffff');
  const hero = reach(mix(accent, '#000000', 0.32), CREAM, 7, '#000000');
  return {
    ground: paper, surface, sunk, ink, soft, accent, accentText, button, buttonInk,
    hero, heroInk: CREAM, line: rgba(ink, 0.13), lineStrong: rgba(ink, 0.26),
    right: reach('#2c6a43', surface, 4.6, '#000000'), wrong: reach('#a3352a', surface, 4.6, '#000000'),
    star: '#b8913f', onFill: '#ffffff'
  };
}

function darkPalette(ground, accent) {
  // The cover's own ground, taken down to lamplight; a pale cover lends its
  // hue to the night instead.
  const base = luminance(ground) < 0.2 ? ground : mix(ground, accent, 0.5);
  const night = toLuminance(mix(base, NIGHT, 0.15), 0.018);
  const surface = mix(night, '#ffffff', 0.065);
  const sunk = mix(night, '#ffffff', 0.04);
  const ink = reach(mix(CREAM, base, 0.08), surface, 12, '#ffffff');
  const soft = reach(mix(ink, night, 0.35), surface, 5.2, ink);
  const accentText = reach(mix(accent, CREAM, 0.28), surface, 5.5, CREAM);
  const button = reach(mix(accent, CREAM, 0.5), night, 8, CREAM);
  const buttonInk = night;
  const hero = mix(night, base, 0.35);
  return {
    ground: night, surface, sunk, ink, soft, accent: accentText, accentText, button, buttonInk,
    hero, heroInk: ink, line: rgba(ink, 0.14), lineStrong: rgba(ink, 0.28),
    right: '#8fd0a4', wrong: '#f4a79e', star: '#e4c784', onFill: night
  };
}

// --- the register --------------------------------------------------------------

const DARK_GENRES = /gothic|ghost|weird|horror|sensation|metaphysical/i;

function registerFor(book) {
  const genre = String(book.genre || '');
  const period = String(book.period || '');
  const form = String(book.form || '');
  if (DARK_GENRES.test(genre)) return { layout: 'framed', voice: 'roman', texture: 'glow' };
  if (form === 'play') {
    if (/comedy/i.test(genre)) return { layout: 'framed', voice: 'italic', texture: 'plain' };
    if (/history/i.test(genre)) return { layout: 'page', voice: 'caps', texture: 'laid' };
    return { layout: 'centred', voice: 'italic', texture: 'plain' };
  }
  if (/poem|poetry/.test(form)) return { layout: 'centred', voice: 'italic', texture: 'laid' };
  if (period === 'Romantic & Regency') return { layout: 'page', voice: 'roman', texture: 'laid' };
  if (period === 'Restoration & Enlightenment' || period === 'Renaissance & Early Modern') return { layout: 'page', voice: 'italic', texture: 'laid' };
  if (period === 'Victorian') return { layout: 'page', voice: 'roman', texture: 'ruled' };
  if (period === 'Ancient & Epic') return { layout: 'centred', voice: 'caps', texture: 'grain' };
  if (period === 'Russian') return { layout: 'page', voice: 'caps', texture: 'grain' };
  return { layout: 'framed', voice: 'caps', texture: 'plain' };
}

// --- one edition ----------------------------------------------------------------

function editionFor(book, colours = {}, overrides = {}) {
  const override = overrides[book.slug] || {};
  const accent = override.accent || book.accent || '#6e1f2b';
  const ground = override.ground || colours.ground || PAPER;
  const register = { ...registerFor(book), ...pick(override, ['layout', 'voice', 'texture']) };
  const mode = override.mode || (DARK_GENRES.test(String(book.genre || '')) || luminance(ground) < 0.12 ? 'dark' : 'light');
  return {
    mode,
    ...register,
    light: { ...lightPalette(ground, accent), ...(override.light || {}) },
    dark: { ...darkPalette(ground, accent), ...(override.dark || {}) }
  };
}

function pick(object, keys) {
  return Object.fromEntries(keys.filter(key => object[key]).map(key => [key, object[key]]));
}

// The house edition, for pages that range across the library.
const HOUSE = editionFor({ slug: '', period: '', form: 'novel', genre: '', accent: '#6e1f2b' }, { ground: '#f7efe7' }, {});

function loadEditionSources(root = path.join(__dirname, '..')) {
  const read = file => { try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch { return {}; } };
  return { colours: read('assets/edition-colours.json'), overrides: read('scripts/edition-overrides.json') };
}

module.exports = { editionFor, registerFor, loadEditionSources, HOUSE, contrast, luminance, mix };
