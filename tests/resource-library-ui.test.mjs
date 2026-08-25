import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { presentations } from '../assets/presentation-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function walkHtml(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walkHtml(target, output);
    else if (entry.isFile() && entry.name === 'index.html') output.push(target);
  }
  return output;
}

test('the compact dashboard catalogue covers every presentation with valid local targets', () => {
  const payload = JSON.parse(read('assets/resource-library-data.json'));
  assert.ok(Array.isArray(payload.resources));
  assert.equal(payload.resources.length, Object.keys(presentations).length);

  const records = new Map(payload.resources.map(item => [item.id, item]));
  assert.equal(records.size, payload.resources.length, 'resource IDs must be unique');
  assert.deepEqual([...records.keys()].sort(), Object.keys(presentations).sort());

  for (const [id, item] of records) {
    assert.ok(item.title, `${id} needs a title`);
    const viewer = new URL(item.viewerUrl, 'https://astorlibrary.test');
    assert.equal(viewer.origin, 'https://astorlibrary.test');
    assert.equal(viewer.pathname, '/presentations/');
    assert.equal(viewer.searchParams.get('presentation'), id);
    assert.equal(item.image, presentations[id].backdrop, `${id} should use the lightweight landscape viewer image`);

    const imagePath = decodeURIComponent(new URL(item.image, 'https://astorlibrary.test').pathname).replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(root, imagePath)), `${id} image must exist: ${imagePath}`);
    if (item.resourceHref) {
      const resourcePath = new URL(item.resourceHref, 'https://astorlibrary.test').pathname.replace(/^\//, '');
      assert.ok(fs.existsSync(path.join(root, resourcePath, 'index.html')), `${id} resource page must exist`);
    }
  }
});

test('all generated resource pages expose the appropriate library or external actions', () => {
  assert.match(read('assets/styles.css'), /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/i);
  const pages = walkHtml(path.join(root, 'resources'))
    .filter(file => read(path.relative(root, file)).includes('data-resource-library'));
  assert.equal(pages.length, Object.keys(presentations).length);

  for (const file of pages) {
    const relative = path.relative(root, file);
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('resource-library-panel--external')) {
      assert.doesNotMatch(html, /data-resource-id=/i, relative);
      assert.match(html, /External guide · access is handled on the linked site/i, relative);
      assert.doesNotMatch(html, /data-resource-save/i, relative);
      continue;
    }
    const resourceId = html.match(/data-resource-id="([a-z0-9-]+)"/)?.[1];
    assert.ok(resourceId && presentations[resourceId], `${relative} needs a catalogue resource ID`);
    assert.match(html, /<button[^>]*data-resource-save[^>]*aria-pressed="false"/i, relative);
    assert.match(html, /data-resource-account/i, relative);
    assert.match(html, /data-resource-access-status/i, relative);
    assert.equal((html.match(/\/assets\/resource-library\.js/g) || []).length, 1, relative);
    assert.equal((html.match(/\/assets\/auth\.js/g) || []).length, 1, relative);
  }
});

test('dashboard and viewer expose the complete private-library interaction contract', () => {
  const account = read('account/index.html');
  for (const marker of [
    'Continue Learning',
    'Saved Resources',
    'Recently Viewed',
    'Account Settings',
    'data-load-more-saved',
    'data-current-consent',
    'data-email-change-form',
    'data-delete-account-form'
  ]) assert.match(account, new RegExp(marker), marker);

  const auth = read('assets/auth.js');
  assert.match(auth, /\/api\/account\/library/);
  assert.match(auth, /query\.set\('cursor', cursor\)/);
  assert.match(auth, /\/api\/account\/resource/);
  assert.match(auth, /\/api\/account\/delete/);
  assert.match(read('assets/account.js'), /'update-email'/);

  const presentationPage = read('presentations/index.html');
  assert.match(presentationPage, /params\.get\('slide'\)/);
  assert.match(presentationPage, /viewer\.initialSlide = requestedSlide/);

  const viewer = read('assets/presentation-viewer.js');
  assert.match(viewer, /resourceAction\('view', this\._presentation\.slug, slide\)/);
  assert.match(viewer, /data-save-control/);
  assert.match(viewer, /data-account-control/);
});
