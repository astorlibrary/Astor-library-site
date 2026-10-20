// Lifts the drawings off every Astor cover so Revise can wear them.
//
//   node scripts/build-edition-art.mjs [slug ...]
//
// Astor covers are a flat ground scattered with small line drawings chosen for
// the book (Macbeth's crowns and ravens, Frankenstein's flasks and hearts).
// This script finds those drawings, wipes out the lettering, and writes two
// images per book into assets/editions/:
//
//   <slug>-field.png    the cover's own arrangement of drawings, lettering
//                       removed, as an alpha mask (white on transparent)
//   <slug>-motifs.png   up to eight different drawings, each centred in a
//                       square cell, in one strip: the book's emblems
//
// Both are masks, so the stylesheet can tint them with any colour of the
// edition. It writes assets/edition-art.json (how many motifs each book has,
// and the colour the drawings are printed in) for scripts/rebuild-study-data.js. Run by hand, like
// build-edition-colours.mjs, when a cover changes or a book is added; it needs
// Playwright's Chromium and decodes the covers in a canvas.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CELL = 96;
const MOTIFS = 8;

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  const globalRoot = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules');
  return createRequire(path.join(globalRoot, 'noop.js'))('playwright');
}

// The largest version of a cover: the thumbnail without its -360 suffix.
function coverFile(cover) {
  const thumb = path.join(root, cover.replace(/^\//, ''));
  const full = thumb.replace(/-360(\.\w+)$/, '$1');
  return fs.existsSync(full) ? full : thumb;
}

const only = new Set(process.argv.slice(2));
const shelf = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'revise-index.json'), 'utf8')).books
  .filter(book => book.cover && (!only.size || only.has(book.slug)));
const outDir = path.join(root, 'assets', 'editions');
fs.mkdirSync(outDir, { recursive: true });
const artFile = path.join(root, 'assets', 'edition-art.json');
// scripts/edition-overrides.json can drop a motif that is really a stray
// piece of lettering: "dropMotifs": [index, ...] in the strip as first drawn.
// Where a title is set among the drawings and runs into them, "eraseTitle":
// [top, bottom] (fractions of the cover's height), or a list of them, clears
// those rows.
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'edition-overrides.json'), 'utf8'));
const art = only.size && fs.existsSync(artFile) ? JSON.parse(fs.readFileSync(artFile, 'utf8')) : {};

const { chromium } = await loadPlaywright();
const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setContent('<body></body>');

for (const book of shelf) {
  const file = coverFile(book.cover);
  if (!fs.existsSync(file)) continue;
  const src = 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64');
  const drop = (overrides[book.slug] || {}).dropMotifs || [];
  const erase = (overrides[book.slug] || {}).eraseTitle || null;
  const result = await page.evaluate(async ({ src, CELL, MOTIFS, drop, erase }) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, w, h);

    // The ground: the median of the outer frame.
    const frame = [[], [], []];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (x >= 12 && x < w - 12 && y >= 12 && y < h - 12) continue;
        const at = (y * w + x) * 4;
        for (let c = 0; c < 3; c += 1) frame[c].push(data[at + c]);
      }
    }
    const ground = frame.map(list => list.sort((a, b) => a - b)[list.length >> 1]);
    const dist = new Float32Array(w * h);
    for (let i = 0; i < w * h; i += 1) {
      dist[i] = Math.hypot(data[i * 4] - ground[0], data[i * 4 + 1] - ground[1], data[i * 4 + 2] - ground[2]);
    }
    const ink = Uint8Array.from(dist, d => (d > 60 ? 1 : 0));
    // The drawings' own colour: the median of the strongest strokes, clear of
    // the softened edges.
    let far = 0;
    for (const d of dist) if (d > far) far = d;
    const strong = [[], [], []];
    for (let i = 0; i < w * h; i += 1) {
      if (dist[i] < far * 0.8) continue;
      for (let c = 0; c < 3; c += 1) strong[c].push(data[i * 4 + c]);
    }
    const inkColour = '#' + strong.map(list => list.sort((a, b) => a - b)[list.length >> 1]).map(v => v.toString(16).padStart(2, '0')).join('');

    const dilate = (mask, rx, ry) => {
      const across = new Uint8Array(w * h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (!mask[y * w + x]) continue;
          for (let d = Math.max(0, x - rx); d <= Math.min(w - 1, x + rx); d += 1) across[y * w + d] = 1;
        }
      }
      const out = new Uint8Array(w * h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (!across[y * w + x]) continue;
          for (let d = Math.max(0, y - ry); d <= Math.min(h - 1, y + ry); d += 1) out[d * w + x] = 1;
        }
      }
      return out;
    };
    // Connected groups, each with its bounding box and pixel count.
    const groups = mask => {
      const seen = new Int32Array(w * h);
      const found = [];
      const stack = [];
      for (let start = 0; start < w * h; start += 1) {
        if (!mask[start] || seen[start]) continue;
        const id = found.length + 1;
        const box = { x1: w, y1: h, x2: 0, y2: 0, count: 0 };
        seen[start] = id;
        stack.push(start);
        while (stack.length) {
          const at = stack.pop();
          const x = at % w;
          const y = (at - x) / w;
          box.count += 1;
          if (x < box.x1) box.x1 = x;
          if (x > box.x2) box.x2 = x;
          if (y < box.y1) box.y1 = y;
          if (y > box.y2) box.y2 = y;
          for (const next of [at - 1, at + 1, at - w, at + w]) {
            if (next < 0 || next >= w * h || seen[next] || !mask[next]) continue;
            if ((next === at - 1 && x === 0) || (next === at + 1 && x === w - 1)) continue;
            seen[next] = id;
            stack.push(next);
          }
        }
        box.id = id;
        found.push(box);
      }
      found.seen = seen;
      return found;
    };

    // Lettering: letters run together into words once spread sideways, and a
    // word is wide and short where a drawing is not. The wordmark's torch sits
    // alone at the top centre.
    const text = new Uint8Array(w * h);
    const sx = w / 483;
    const words = [];
    for (const box of groups(dilate(ink, Math.round(9 * sx), Math.round(2 * sx)))) {
      const bw = box.x2 - box.x1 + 1;
      const bh = box.y2 - box.y1 + 1;
      if (bw > 70 * sx && bh < 90 * sx && bw > 1.8 * bh) {
        words.push(box);
        for (let y = Math.max(0, box.y1 - 4); y <= Math.min(h - 1, box.y2 + 4); y += 1) {
          for (let x = Math.max(0, box.x1 - 4); x <= Math.min(w - 1, box.x2 + 4); x += 1) text[y * w + x] = 1;
        }
      }
    }
    // Short words (AND, OF, a numeral) are too narrow to be caught alone, so
    // the whole title block, from its first word to its last, counts as
    // lettering.
    const title = { x1: w, y1: h, x2: 0, y2: 0 };
    for (const box of words) {
      const middle = (box.y1 + box.y2) / 2;
      if (middle < h * 0.16 || middle > h * 0.86) continue;
      title.x1 = Math.min(title.x1, box.x1); title.x2 = Math.max(title.x2, box.x2);
      title.y1 = Math.min(title.y1, box.y1); title.y2 = Math.max(title.y2, box.y2);
    }
    if (title.x2 > title.x1) {
      for (let y = Math.max(0, title.y1 - 8); y <= Math.min(h - 1, title.y2 + 8); y += 1) {
        for (let x = Math.max(0, title.x1 - 8); x <= Math.min(w - 1, title.x2 + 8); x += 1) text[y * w + x] = 1;
      }
    }
    for (const [top, bottom] of erase ? (Array.isArray(erase[0]) ? erase : [erase]) : []) {
      for (let y = Math.round(top * h); y <= Math.round(bottom * h); y += 1) {
        for (let x = Math.round(w * 0.13); x < Math.round(w * 0.87); x += 1) text[y * w + x] = 1;
      }
    }
    for (let y = Math.round(20 * sx); y < Math.round(80 * sx); y += 1) {
      for (let x = Math.round(w / 2 - 30 * sx); x < Math.round(w / 2 + 30 * sx); x += 1) text[y * w + x] = 1;
    }

    const alpha = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i += 1) alpha[i] = text[i] ? 0 : Math.max(0, Math.min(255, (dist[i] - 30) / 60 * 255));
    const motif = Uint8Array.from(ink, (value, i) => (value && !text[i] ? 1 : 0));

    const maskCanvas = (width, height, paint) => {
      const out = document.createElement('canvas');
      out.width = width;
      out.height = height;
      const ctx = out.getContext('2d');
      const pixels = ctx.createImageData(width, height);
      paint(pixels.data);
      ctx.putImageData(pixels, 0, 0);
      return out;
    };
    const field = maskCanvas(w, h, px => {
      for (let i = 0; i < w * h; i += 1) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255; px[i * 4 + 3] = alpha[i]; }
    });

    // The emblems: whole drawings (strokes gathered together), not specks,
    // chosen to differ from one another so a book of branches still shows its
    // crown and its raven.
    const gathered = groups(dilate(motif, Math.round(4 * sx), Math.round(4 * sx)));
    const drawings = gathered
      .filter(box => box.count > 150 * sx * sx && box.x2 - box.x1 < 130 * sx && box.y2 - box.y1 < 130 * sx)
      .filter(box => box.x1 > 2 && box.y1 > 2 && box.x2 < w - 3 && box.y2 < h - 3)
      // A letter left over from a word: on the same line as it, at its height.
      .filter(box => !words.some(word => {
        const overlap = Math.min(box.y2, word.y2) - Math.max(box.y1, word.y1);
        const height = box.y2 - box.y1 + 1;
        const wordHeight = word.y2 - word.y1 + 1;
        return overlap > height * 0.6 && height < wordHeight * 1.7;
      }));
    const signature = box => {
      const size = 12;
      const bw = box.x2 - box.x1 + 1;
      const bh = box.y2 - box.y1 + 1;
      const side = Math.max(bw, bh);
      const cells = new Float32Array(size * size);
      for (let y = box.y1; y <= box.y2; y += 1) {
        for (let x = box.x1; x <= box.x2; x += 1) {
          const cx = Math.min(size - 1, Math.floor(((x - box.x1) + (side - bw) / 2) / side * size));
          const cy = Math.min(size - 1, Math.floor(((y - box.y1) + (side - bh) / 2) / side * size));
          cells[cy * size + cx] += alpha[y * w + x] / 255;
        }
      }
      const total = cells.reduce((a, b) => a + b, 0) || 1;
      const norm = cells.map(v => v / total);
      const mirror = norm.map((_, i) => norm[Math.floor(i / size) * size + (size - 1 - (i % size))]);
      return { cells: norm, mirror, aspect: bw / bh };
    };
    for (const box of drawings) {
      box.sig = signature(box);
      // Branches and sprigs are long, thin and sparse; prefer the emblems,
      // which fill their box.
      box.fill = box.count / ((box.x2 - box.x1 + 1) * (box.y2 - box.y1 + 1));
      box.weight = Math.min(box.count, 700 * sx * sx) * box.fill * box.fill;
    }
    const difference = (a, b) => {
      let sum = 0;
      let flipped = 0;
      for (let i = 0; i < a.cells.length; i += 1) {
        sum += Math.abs(a.cells[i] - b.cells[i]);
        flipped += Math.abs(a.cells[i] - b.mirror[i]);
      }
      return Math.min(sum, flipped) + Math.abs(Math.log(a.aspect / b.aspect)) * 0.5;
    };
    const chosen = [];
    const pool = drawings.slice().sort((a, b) => b.weight - a.weight);
    while (chosen.length < MOTIFS && pool.length) {
      let best = 0;
      let bestScore = -1;
      pool.forEach((box, index) => {
        const apart = chosen.length ? Math.min(...chosen.map(other => difference(box.sig, other.sig))) : 1;
        const score = apart * Math.sqrt(box.weight);
        if (score > bestScore) { bestScore = score; best = index; }
      });
      const pick = pool.splice(best, 1)[0];
      if (chosen.length && Math.min(...chosen.map(other => difference(pick.sig, other.sig))) < 0.35) break;
      chosen.push(pick);
    }
    // Emblems before branches: the fullest drawings first.
    chosen.sort((a, b) => b.fill - a.fill);
    for (const index of drop.slice().sort((a, b) => b - a)) chosen.splice(index, 1);

    const strip = document.createElement('canvas');
    strip.width = CELL * Math.max(1, chosen.length);
    strip.height = CELL;
    const stripContext = strip.getContext('2d');
    chosen.forEach((box, index) => {
      const pad = 3;
      const x1 = Math.max(0, box.x1 - pad);
      const y1 = Math.max(0, box.y1 - pad);
      const bw = Math.min(w - 1, box.x2 + pad) - x1 + 1;
      const bh = Math.min(h - 1, box.y2 + pad) - y1 + 1;
      const piece = maskCanvas(bw, bh, px => {
        for (let y = 0; y < bh; y += 1) {
          for (let x = 0; x < bw; x += 1) {
            const i = (y + y1) * w + (x + x1);
            const o = (y * bw + x) * 4;
            px[o] = px[o + 1] = px[o + 2] = 255;
            px[o + 3] = gathered.seen[i] === box.id ? alpha[i] : 0;
          }
        }
      });
      const scale = (CELL - 8) / Math.max(bw, bh);
      stripContext.imageSmoothingQuality = 'high';
      stripContext.drawImage(piece, index * CELL + (CELL - bw * scale) / 2, (CELL - bh * scale) / 2, bw * scale, bh * scale);
    });
    return { field: field.toDataURL('image/png'), motifs: strip.toDataURL('image/png'), count: chosen.length, ink: inkColour };
  }, { src, CELL, MOTIFS, drop, erase });

  const write = (name, dataUrl) => fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
  write(book.slug + '-field.png', result.field);
  if (result.count) write(book.slug + '-motifs.png', result.motifs);
  art[book.slug] = { motifs: result.count, ink: result.ink };
}
await browser.close();

const sorted = Object.fromEntries(Object.keys(art).sort().map(key => [key, art[key]]));
fs.writeFileSync(artFile, JSON.stringify(sorted, null, 2) + '\n');
console.log('Lifted the drawings from ' + shelf.length + ' covers.');
