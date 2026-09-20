import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(fetch) {
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.events = {}; this.value = ''; }
    setAttribute(k, v) { this.attrs[k] = v; if (k === 'id') this.id = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    append(...nodes) { this.children.push(...nodes); }
    get firstChild() { return this.children[0]; }
    removeChild(node) { this.children.splice(this.children.indexOf(node), 1); }
    addEventListener(k, fn) { this.events[k] = fn; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    scrollIntoView() {}
    querySelectorAll(selector) { return this.children.flatMap(n => [...(selector === '[role=option]' && n.attrs.role === 'option' ? [n] : []), ...n.querySelectorAll(selector)]); }
    querySelector(selector) { return this.children.find(n => n.tagName === selector.toUpperCase()); }
    click() { clicked = this.attrs.href; }
  }
  let clicked;
  const trigger = new Element('a');
  const document = { body: new Element('body'), activeElement: trigger, createElement: tag => new Element(tag), addEventListener() {}, querySelectorAll: () => [trigger] };
  const context = vm.createContext({ document, fetch, encodeURIComponent });
  const util = fs.readFileSync(new URL('../assets/astor/util.mjs', import.meta.url), 'utf8').replaceAll('export ', '');
  const source = fs.readFileSync(new URL('../assets/astor/palette.mjs', import.meta.url), 'utf8').replace(/^import .*;$/gm, '');
  vm.runInContext(util + '\n' + source, context);
  return { run: code => vm.runInContext(code, context), clicked: () => clicked, trigger };
}

test('search opens modally, finds a book, supports keyboard selection and restores focus', async () => {
  const app = setup(async () => ({ ok: true, json: async () => ({ entries: [{ k: 'Book', t: 'Macbeth', s: 'macbeth shakespeare', h: '/books/macbeth/' }] }) }));
  await app.run('open()');
  assert.equal(app.run('palette.open'), true);
  app.run("input.value = 'Macbeth'; render()");
  assert.equal(app.run('list.children.length'), 1);
  assert.equal(app.run("input.attrs['aria-activedescendant']"), 'astor-result-0');
  app.run("onKey({key:'Enter', preventDefault(){}})");
  assert.equal(app.clicked(), '/books/macbeth/');
  app.run('close()');
  assert.equal(app.run('palette.open'), false);
  assert.equal(app.run('document.activeElement'), app.trigger);
});

test('Enter opens the catalogue fallback when no results match', async () => {
  const app = setup(async () => ({ ok: true, json: async () => ({ entries: [] }) }));
  await app.run('open()');
  app.run("input.value = 'no such book'; render(); onKey({key:'Enter', preventDefault(){}})");
  assert.equal(app.clicked(), '/explore/?q=no%20such%20book');
});

test('failed index requests offer a working fallback and retry on reopening', async () => {
  let attempts = 0;
  const app = setup(async () => { attempts++; return { ok: false }; });
  await app.run('open()');
  app.run("onKey({key:'Enter', preventDefault(){}})");
  assert.equal(app.clicked(), '/explore/?q=');
  app.run('close()');
  await app.run('open()');
  assert.equal(attempts, 2);
});

test('modified search clicks preserve native link behaviour', () => {
  const app = setup();
  let prevented = false;
  app.trigger.events.click({ button: 0, ctrlKey: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(app.run('palette'), null);
});

test('generated pages version search styles and script together to bypass stale offline assets', async () => {
  const { createHash } = await import('node:crypto');
  const root = new URL('../', import.meta.url);
  const version = createHash('sha256')
    .update(fs.readFileSync(new URL('assets/navigation.css', root)))
    .update(fs.readFileSync(new URL('assets/astor/palette.mjs', root)))
    .digest('hex').slice(0, 10);
  for (const page of ['index.html', 'books/macbeth/index.html', 'explore/index.html']) {
    const html = fs.readFileSync(new URL('dist/' + page, root), 'utf8');
    assert.ok(html.includes('/assets/navigation.css?v=' + version), page);
    assert.ok(html.includes('/assets/astor/palette.mjs?v=' + version), page);
  }
});
