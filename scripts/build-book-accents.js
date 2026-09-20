// Gives every book with a study record a colour of its own, taken from its
// own cover.
//
//   node scripts/build-book-accents.js
//
// Run by hand on a Mac: it shells out to sips, which is not available on the
// build machine. The result, assets/book-accents.json, is committed and read
// at build time. Re-run it when a cover changes or a record is added.
//
// The colour is not the cover's average, which is always mud. Pixels that are
// nearly white, nearly black or nearly grey are dropped, the remaining hues
// are gathered into twelve buckets, and the largest bucket wins. Saturation
// and lightness are then pinned to a narrow range, so a garish cover and a
// muted one both give an accent that sits properly on cream paper and holds
// its contrast against it.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadBooks } = require('./book-data');

const root = path.join(__dirname, '..');
const out = path.join(root, 'assets', 'book-accents.json');

// The source pages still name the original cover files; build-static is what
// points them at the thumbnails, so the built page is the one to read.
function coverFor(slug) {
  const page = path.join(root, 'dist', 'books', slug, 'index.html');
  if (!fs.existsSync(page)) return null;
  const html = fs.readFileSync(page, 'utf8');
  const match = html.match(/\/assets\/book-thumbs\/[a-z0-9-]+\.jpg/);
  if (!match) return null;
  const file = path.join(root, match[0].replace(/^\//, ''));
  return fs.existsSync(file) ? file : null;
}

// A 24-bit BMP is bottom-up, BGR, with each row padded to four bytes.
function pixelsOf(file) {
  const temporary = path.join(root, '.cache', 'accent.bmp');
  fs.mkdirSync(path.dirname(temporary), { recursive: true });
  execFileSync('sips', ['-s', 'format', 'bmp', '-Z', '32', file, '--out', temporary], { stdio: 'ignore' });
  const data = fs.readFileSync(temporary);
  const offset = data.readUInt32LE(10);
  const width = data.readInt32LE(18);
  const height = Math.abs(data.readInt32LE(22));
  const depth = data.readUInt16LE(28);
  if (depth !== 24) return [];
  const stride = Math.ceil((width * 3) / 4) * 4;
  const pixels = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = offset + y * stride + x * 3;
      pixels.push([data[at + 2], data[at + 1], data[at]]);
    }
  }
  return pixels;
}

function toHsl([r, g, b]) {
  const red = r / 255, green = g / 255, blue = b / 255;
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const span = max - min;
  const saturation = lightness > 0.5 ? span / (2 - max - min) : span / (max + min);
  let hue;
  if (max === red) hue = ((green - blue) / span + (green < blue ? 6 : 0)) / 6;
  else if (max === green) hue = ((blue - red) / span + 2) / 6;
  else hue = ((red - green) / span + 4) / 6;
  return [hue * 360, saturation, lightness];
}

function toHex(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const table = [[chroma, second, 0], [second, chroma, 0], [0, chroma, second], [0, second, chroma], [second, 0, chroma], [chroma, 0, second]];
  const [r, g, b] = table[sector].map(value => Math.round((value + match) * 255));
  return '#' + [r, g, b].map(value => value.toString(16).padStart(2, '0')).join('');
}

function accentOf(file, floor) {
  const pixels = pixelsOf(file);
  if (!pixels.length) return null;
  const buckets = new Map();
  for (const pixel of pixels) {
    const [hue, saturation, lightness] = toHsl(pixel);
    if (saturation < floor || lightness < 0.08 || lightness > 0.92) continue;
    const bucket = Math.floor(hue / 30) % 12;
    if (!buckets.has(bucket)) buckets.set(bucket, { weight: 0, hues: [], saturation: 0 });
    const entry = buckets.get(bucket);
    entry.weight += saturation;
    entry.hues.push(hue);
    entry.saturation += saturation;
  }
  if (!buckets.size) return null;
  const [, best] = [...buckets.entries()].sort((a, b) => b[1].weight - a[1].weight)[0];
  best.hues.sort((a, b) => a - b);
  const hue = best.hues[Math.floor(best.hues.length / 2)];
  const saturation = Math.min(0.62, Math.max(0.34, best.saturation / best.hues.length));
  // Yellows and greens read lighter than reds and blues at the same lightness,
  // so they are darkened to keep every accent the same visual weight on cream.
  const lift = hue > 40 && hue < 190 ? -0.05 : 0;
  return toHex(hue, saturation, 0.34 + lift);
}

// A cover printed in black, cream and one ink gives very little to go on, so
// the search is tried again with a lower bar before anything is given up.
const accents = {};
const missing = [];
for (const book of loadBooks()) {
  const cover = coverFor(book.slug);
  if (!cover) { missing.push(book.slug + ' (no cover)'); continue; }
  const accent = accentOf(cover, 0.18) || accentOf(cover, 0.08) || accentOf(cover, 0.03);
  if (!accent) { missing.push(book.slug + ' (cover has no colour)'); continue; }
  accents[book.slug] = accent;
}

// Two books with the same hex would undo the point of the exercise. Where
// covers agree, later books are nudged a few degrees around the wheel until
// each title has a colour of its own.
const taken = new Map();
for (const slug of Object.keys(accents).sort()) {
  let hex = accents[slug];
  let tries = 0;
  while (taken.has(hex) && tries < 24) {
    const [r, g, b] = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16));
    const [hue, saturation, lightness] = toHsl([r, g, b]);
    const step = tries % 2 ? 1 : -1;
    hex = toHex((hue + step * (4 + Math.floor(tries / 2) * 4) + 360) % 360, saturation, lightness + (tries > 7 ? step * 0.03 : 0));
    tries += 1;
  }
  taken.set(hex, slug);
  accents[slug] = hex;
}
if (missing.length) console.log('left without a colour: ' + missing.join(', '));
fs.writeFileSync(out, JSON.stringify(accents, null, 2) + '\n');
console.log('wrote ' + Object.keys(accents).length + ' accents to assets/book-accents.json');
