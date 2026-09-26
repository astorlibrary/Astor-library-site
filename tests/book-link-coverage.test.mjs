import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import catalogue from '../worker/book-links.json' with { type: 'json' };
import { handleBookRedirect } from '../worker/book-redirects.mjs';

test('every published purchase button has a registered Astor route and no retired provider links', () => {
  let count = 0;
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (/\.(?:html|json|js)$/.test(file)) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /https?:\/\/(?:mybook\.to|booklinker\.(?:net|com)|geni\.us)\//, file);
        for (const match of source.matchAll(/https:\/\/astorlibrary\.com\/go\/([a-z0-9-]+)/g)) {
          const slug = catalogue.aliases[match[1]] || match[1];
          assert.ok(Object.hasOwn(catalogue.books, slug), `${file}: ${match[0]}`);
          count++;
        }
      }
    }
  }
  scan('dist');
  assert.ok(count > 0, 'build the site before checking purchase links');
});

test('every registered book routes to its configured country and offers a chooser', async () => {
  for (const [slug, book] of Object.entries(catalogue.books)) {
    for (const [country, destination] of Object.entries(book.destinations)) {
      const req = new Request(`https://astorlibrary.com/go/${slug}`);
      Object.defineProperty(req, 'cf', { value: { country } });
      const response = handleBookRedirect(req);
      assert.equal(response.status, destination.kind === 'product' ? 302 : 200, `${slug}/${country}`);
      if (destination.kind === 'product') assert.equal(response.headers.get('Location'), destination.url);
    }
    const response = handleBookRedirect(new Request(`https://astorlibrary.com/go/${slug}?choose=1`));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Choose your Amazon store/);
  }
});
