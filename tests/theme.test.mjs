import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const read = file => fs.readFileSync(file, 'utf8');
const theme = read('assets/theme.css');
const sheets = ['styles', 'astor-study', 'navigation', 'home', 'account', 'seasons', 'presentation-viewer', 'seasonal-theme']
  .map(name => ({ name, css: read(`assets/${name}.css`) }));

const declared = css => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
const themeTokens = declared(theme);
const lightTokens = new Set(sheets.flatMap(sheet => [...declared(sheet.css)]));
// Tokens that only theme.css defines: in light mode they do not exist, so every
// use must carry the original light colour as its fallback.
const darkOnly = [...themeTokens].filter(token => !lightTokens.has(token));

test('every dark-only token read by a stylesheet has a light fallback', () => {
  assert.ok(darkOnly.length > 20, 'expected the dark palette to define its own tokens');
  for (const sheet of sheets) {
    for (const token of darkOnly) {
      const bare = new RegExp('var\\(' + token + '(?![\\w-])(?!\\s*,)', 'g');
      assert.equal((sheet.css.match(bare) || []).length, 0, `${sheet.name}.css reads ${token} without a light fallback`);
    }
  }
});

test('every theme token the stylesheets reach for is defined for dark mode', () => {
  const family = /^--(surface|surface-paper|surface-sand|surface-rgb|tint-amount|tint-ground|text|text-soft|text-muted|text-faint|line-rgb|wine-text|wine-rgb|gold-text|green-text|green-rgb|red-text|red-rgb|navy-rule|map-[a-z-]+|[a-z-]+-ink)$/;
  const inline = [...['about', 'editorial', 'presentations', 'reading-routes', 'resources', 'site-index', 'study']
    .map(page => ({ name: `${page}/index.html`, css: read(`${page}/index.html`) }))];
  for (const { name, css } of [...sheets, ...inline]) {
    for (const [, token] of css.matchAll(/var\((--[\w-]+)\s*,/g)) {
      if (family.test(token)) assert.ok(themeTokens.has(token), `${name} uses ${token}, which theme.css never defines`);
    }
  }
});

test('the dark palette keeps text readable on every surface it is used on', () => {
  const value = token => {
    const match = theme.match(new RegExp(token + '\\s*:\\s*(#[0-9a-f]{6})', 'i'));
    assert.ok(match, `${token} should be a hex colour in theme.css`);
    return match[1];
  };
  const channel = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = hex => { const [r, g, b] = channel(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const surfaces = ['--surface-paper', '--surface', '--surface-sand'].map(value);
  for (const token of ['--text', '--text-soft', '--text-muted', '--text-faint', '--wine-text', '--gold-text', '--green-text', '--red-text']) {
    for (const surface of surfaces) {
      assert.ok(contrast(value(token), surface) >= 4.5, `${token} on ${surface} is ${contrast(value(token), surface).toFixed(2)}:1`);
    }
  }
  for (const surface of surfaces) assert.ok(contrast(value('--navy-rule'), surface) >= 3, `--navy-rule on ${surface}`);
});

// The script that runs before first paint, exactly as built into the pages.
function resolveTheme({ saved, system, storageThrows = false }) {
  const html = read('dist/index.html');
  const script = html.match(/<script data-theme-init>([\s\S]*?)<\/script>/)[1];
  const attributes = {};
  const style = {};
  const meta = { content: '#fffaf4', setAttribute(name, content) { if (name === 'content') meta.content = content; } };
  const root = {
    setAttribute: (name, content) => { attributes[name] = content; },
    style,
    querySelector: selector => (selector === 'meta[name=theme-color]' ? meta : null)
  };
  vm.runInNewContext(script, {
    document: { documentElement: root },
    localStorage: { getItem: () => { if (storageThrows) throw new Error('blocked'); return saved ?? null; } },
    matchMedia: query => ({ matches: query.includes('dark') && system === 'dark' })
  });
  return { theme: attributes['data-theme'], scheme: style.colorScheme, chrome: meta.content };
}

test('first paint uses the saved choice, else the system setting, else light', () => {
  assert.deepEqual(resolveTheme({ saved: 'dark', system: 'light' }), { theme: 'dark', scheme: 'dark', chrome: '#1b1714' });
  assert.deepEqual(resolveTheme({ saved: 'light', system: 'dark' }), { theme: 'light', scheme: 'light', chrome: '#fffaf4' });
  assert.equal(resolveTheme({ system: 'dark' }).theme, 'dark');
  assert.equal(resolveTheme({ system: 'light' }).theme, 'light');
  assert.equal(resolveTheme({ saved: 'sepia', system: 'dark' }).theme, 'dark', 'an unknown stored value is ignored');
  assert.equal(resolveTheme({ system: 'dark', storageThrows: true }).theme, 'dark', 'blocked storage falls back to the system');
});

test('every built page picks its theme before any stylesheet and offers the toggle', () => {
  const pages = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'assets') walk(full); } else if (entry.name.endsWith('.html')) pages.push(full);
    }
  };
  walk('dist');
  assert.ok(pages.length > 100);
  for (const page of pages) {
    const html = read(page);
    if (/http-equiv=["']refresh["']/i.test(html)) continue;
    const init = html.indexOf('data-theme-init');
    const firstSheet = html.search(/<link rel="stylesheet"/);
    assert.ok(init > -1, `${page} has no theme script`);
    assert.ok(firstSheet === -1 || init < firstSheet, `${page} loads a stylesheet before choosing its theme`);
    const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
    assert.match(sheets.at(-1), /^\/assets\/theme\.css\?v=\w+$/, `${page} should load theme.css last`);
    assert.equal((html.match(/<meta name="theme-color"/g) || []).length, 1, `${page} should have one theme-color`);
    if (html.includes('astor-global-header')) {
      assert.equal((html.match(/data-theme-toggle/g) || []).length, 2, `${page} should have the header toggle (desktop and phone)`);
    }
  }
});

test('the offline cache keeps the dark palette', () => {
  assert.ok(read('sw.js').includes("'/assets/theme.css'"));
});
