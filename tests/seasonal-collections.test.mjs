import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import helpers from '../scripts/seasonal-helpers.js';
import seo from '../scripts/seo-validation.js';
const index = JSON.parse(fs.readFileSync('assets/content-index.json', 'utf8'));
const thumb = JSON.parse(fs.readFileSync('assets/book-thumbnails.json', 'utf8'));
const books = new Map(index.books.map(b => [b.href, b]));
const root = path.resolve('dist');
const htmlAt = href => fs.readFileSync(path.join(root, href, 'index.html'), 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
test('seasonal shelves retain their complete catalogue and resource membership', () => {
  for (const s of helpers.seasons) {
    const hrefs = helpers.booksFor(s);
    assert.equal(new Set(hrefs).size, hrefs.length, `${s.slug}: duplicate book`);
    const html = htmlAt(helpers.hrefFor(s));
    assert.equal((html.match(/class="season-book"/g) || []).length, hrefs.length);
    for (const href of hrefs) {
      const b = books.get(href);
      assert.ok(b, `${s.slug}: unknown book ${href}`);
      assert.ok(html.includes(`href="${href}"`));
      assert.ok(html.includes(`src="${esc(thumb[b.image] || b.image)}"`), `${s.slug}: incorrect cover for ${href}`);
      assert.ok(htmlAt(href).includes(`href="${helpers.hrefFor(s)}"`), `${href}: missing seasonal return link`);
    }
    for (const href of s.heroBooks) assert.ok(hrefs.includes(href), `${s.slug}: hero is outside the shelf`);
    const resources = helpers.resourcesFor(s, index);
    assert.equal((html.match(/class="season-resource"/g) || []).length, resources.length);
    for (const r of resources) assert.ok(html.includes(`href="${esc(r.href)}"`), `${s.slug}: missing resource ${r.href}`);
    for (const href of s.excludedResources || []) assert.ok(!resources.some(r => r.href === href), `${s.slug}: excluded resource ${href}`);
    for (const href of s.resources || []) assert.ok(resources.some(r => r.href === href), `${s.slug}: unresolved curated resource ${href}`);
    for (const [,id] of html.matchAll(/href="#([^\"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `${s.slug}: broken anchor ${id}`);
  }
});
test('seasonal pages are discoverable, canonical and accurately described for search', () => {
  const sitemap=fs.readFileSync('dist/sitemap.xml','utf8');
  const search=htmlAt('/explore/');
  for(const s of helpers.seasons) {
    const href=helpers.hrefFor(s),html=htmlAt(href);
    assert.deepEqual(seo.validatePageSeo(html,'https://astorlibrary.com'+href),[]);
    assert.equal(seo.metadata(html).noindex,false);
    assert.ok(sitemap.includes('https://astorlibrary.com'+href));
    assert.ok(search.includes(`href="${href}"`));
    assert.ok(htmlAt('/site-index/').includes(`href="${href}"`));
    const schemas=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    const collection=schemas.filter(s=>s['@type']==='CollectionPage');
    assert.equal(collection.length,1);
    assert.deepEqual(collection[0].mainEntity.itemListElement.map(x=>x.url),helpers.booksFor(s).map(x=>'https://astorlibrary.com'+x));
  }
});
