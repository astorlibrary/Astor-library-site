import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBookRedirect, handleStoreCountry } from '../worker/book-redirects.mjs';
import catalogue from '../worker/book-links.json' with { type: 'json' };
const sample = { associates: {}, aliases: { shorter: 'sample' }, books: { sample: { title: 'An edition', format: 'Paperback', destinations: {
  GB: { url: 'https://www.amazon.co.uk/dp/B0GPHPD6BN', kind: 'product' },
  US: { url: 'https://www.amazon.com/dp/B0GPHPD6BN', kind: 'product' },
  CA: { url: 'https://www.amazon.ca/s?k=known-edition', kind: 'search' }
} } } };
function request(path, country, method = 'GET') {
  const req = new Request('https://astorlibrary.com' + path, { method });
  if (country) Object.defineProperty(req, 'cf', { value: { country } });
  return req;
}
test('country redirects are independent and never shared or permanently cached', () => {
  for (const [country, host] of [['GB', 'co.uk'], ['US', 'com']]) {
    const response = handleBookRedirect(request('/go/sample', country), sample);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), `https://www.amazon.${host}/dp/B0GPHPD6BN`);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
});
test('explicit store choice overrides geolocation and aliases keep working', () => {
  const response = handleBookRedirect(request('/go/shorter/?country=UK', 'US'), sample);
  assert.equal(response.headers.get('Location'), sample.books.sample.destinations.GB.url);
});
test('missing locations and unconfirmed local listings display the country choice', async () => {
  for (const country of [undefined, 'FR', 'CA', 'AU']) {
    const response = handleBookRedirect(request('/go/sample', country), sample);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Choose your Amazon store/);
    assert.match(html, /Search Amazon Canada/);
    assert.doesNotMatch(html, /mybook\.to|booklinker|geniuslink/);
  }
  assert.equal(handleBookRedirect(request('/go/sample?choose=1', 'GB'), sample).status, 200);
});
test('arbitrary redirect URLs, unknown slugs and prototype keys are rejected', () => {
  for (const path of ['/go/unknown', '/go/constructor', '/go/sample/extra']) assert.equal(handleBookRedirect(request(path), sample).status, 404);
  assert.equal(handleBookRedirect(request('/go/sample?country=FR'), sample).status, 400);
  assert.equal(handleBookRedirect(request('/go/sample?url=https://evil.example', 'GB'), sample).headers.get('Location'), sample.books.sample.destinations.GB.url);
  assert.equal(handleBookRedirect(request('/books/macbeth/'), sample), null);
});
test('HEAD does not include a page body; POST is not redirected', async () => {
  const response = handleBookRedirect(request('/go/sample', 'FR', 'HEAD'), sample);
  assert.equal(response.status, 200); assert.equal(await response.text(), '');
  assert.equal(handleBookRedirect(request('/go/sample', 'GB', 'POST'), sample).status, 405);
});
test('optional owner affiliate IDs apply only to the selected country', () => {
  const data = { ...sample, associates: { GB: 'owner-21' } };
  assert.match(handleBookRedirect(request('/go/sample', 'GB'), data).headers.get('Location'), /tag=owner-21$/);
  assert.equal(handleBookRedirect(request('/go/sample', 'US'), data).headers.get('Location'), sample.books.sample.destinations.US.url);
});
test('catalogue destinations use explicit Amazon stores and no inherited tracking', () => {
  const hosts = { GB: 'www.amazon.co.uk', US: 'www.amazon.com', CA: 'www.amazon.ca', AU: 'www.amazon.com.au' };
  for (const [slug, book] of Object.entries(catalogue.books)) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(book.title && book.format && Object.keys(book.destinations).length);
    for (const [country, destination] of Object.entries(book.destinations)) {
      assert.ok(Object.hasOwn(hosts, country), `${slug}/${country}`);
      if (destination.kind === 'unavailable') { assert.equal(destination.url, undefined, `${slug}/${country}`); continue; }
      const url = new URL(destination.url);
      assert.equal(url.hostname, hosts[country]); assert.equal(url.protocol, 'https:');
      assert.equal(url.searchParams.has('tag'), false); assert.equal(url.searchParams.has('geniuslink'), false);
      if (destination.kind === 'product') assert.match(url.pathname, /^\/dp\/[A-Z0-9]{10}$/);
    }
  }
});
test('a store marked unavailable is named as unavailable and never linked', async () => {
  const data = { associates: {}, aliases: {}, books: { sample: { title: 'An edition', format: 'Paperback', note: 'Not sold in the UK.', destinations: {
    GB: { kind: 'unavailable' },
    US: { url: 'https://www.amazon.com/dp/B0GPHPD6BN', kind: 'product' }
  } } } };
  const response = handleBookRedirect(request('/go/sample', 'GB'), data);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Not sold on Amazon UK\./);
  assert.match(html, /Not sold in the UK\./);
  assert.match(html, /href="https:\/\/www\.amazon\.com\/dp\/B0GPHPD6BN"/);
  assert.doesNotMatch(html, /amazon\.co\.uk/);
  assert.equal(handleBookRedirect(request('/go/sample?country=UK', 'US'), data).status, 200);
  assert.equal(handleBookRedirect(request('/go/sample', 'US'), data).status, 302);
});
test('the store-country endpoint gives only a two-letter country and is never cached', async () => {
  const response = handleStoreCountry(request('/api/store-country', 'GB'));
  assert.deepEqual(await response.json(), { country: 'GB' });
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.deepEqual(await handleStoreCountry(request('/api/store-country')).json(), { country: null });
  assert.deepEqual(await handleStoreCountry(request('/api/store-country', 'T1')).json(), { country: null });
  assert.equal(handleStoreCountry(request('/api/store-country', 'GB', 'POST')).status, 405);
  assert.equal(handleStoreCountry(request('/go/sample', 'GB')), null);
});
