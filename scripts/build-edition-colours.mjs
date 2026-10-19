// Reads the two colours that make each Astor cover what it is: the ground the
// cover is printed on and the ink its title and drawings are set in.
//
//   node scripts/build-edition-colours.mjs
//
// Run by hand, like build-book-accents.js, when a cover changes or a book is
// added; the result, assets/edition-colours.json, is committed and read by
// scripts/editions.js at build time. It needs Playwright's Chromium (present
// in the cloud build image; `npx playwright install chromium` elsewhere) and
// decodes each cover in a canvas, so no image library is required.
//
// The ground is the median of the cover's outer frame, where Astor covers are
// a flat colour. The ink is the commonest colour among the remaining pixels
// that stand clearly apart from the ground: the drawings and the lettering.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  const globalRoot = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules');
  return createRequire(path.join(globalRoot, 'noop.js'))('playwright');
}

const shelf = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'revise-index.json'), 'utf8')).books;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setContent('<canvas id="c" width="60" height="90"></canvas>');

const out = {};
for (const book of shelf) {
  if (!book.cover) continue;
  const file = path.join(root, book.cover.replace(/^\//, ''));
  if (!fs.existsSync(file)) continue;
  const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64');
  out[book.slug] = await page.evaluate(async src => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.getElementById('c');
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixel = (x, y) => { const at = (y * canvas.width + x) * 4; return [data[at], data[at + 1], data[at + 2]]; };
    const frame = [];
    const all = [];
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const value = pixel(x, y);
        all.push(value);
        const edge = x < 6 || x >= canvas.width - 6 || y < 6 || y >= canvas.height - 6;
        if (edge) frame.push(value);
      }
    }
    const median = list => [0, 1, 2].map(channel => list.map(value => value[channel]).sort((a, b) => a - b)[Math.floor(list.length / 2)]);
    const ground = median(frame);
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const buckets = new Map();
    for (const value of all) {
      if (distance(value, ground) < 70) continue;
      const key = value.map(channel => channel >> 5).join(',');
      const entry = buckets.get(key) || { count: 0, sum: [0, 0, 0] };
      entry.count += 1;
      entry.sum = entry.sum.map((total, channel) => total + value[channel]);
      buckets.set(key, entry);
    }
    const best = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
    const ink = best ? best.sum.map(total => Math.round(total / best.count)) : (ground.reduce((a, b) => a + b, 0) > 380 ? [32, 28, 26] : [245, 238, 228]);
    const hex = value => '#' + value.map(channel => channel.toString(16).padStart(2, '0')).join('');
    return { ground: hex(ground), ink: hex(ink) };
  }, dataUrl);
}
await browser.close();

const sorted = Object.fromEntries(Object.keys(out).sort().map(key => [key, out[key]]));
fs.writeFileSync(path.join(root, 'assets', 'edition-colours.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log('Read the cover colours of ' + Object.keys(sorted).length + ' editions.');
void require;
