import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { astorHomeFeature } = require('../scripts/home-feature-rules.js');
const plan = JSON.parse(fs.readFileSync(new URL('../scripts/home-features.json', import.meta.url), 'utf8'));
const on = iso => { const [y, m, d] = iso.split('-').map(Number); return astorHomeFeature(new Date(y, m - 1, d), plan); };
const fragment = slug => JSON.parse(fs.readFileSync(new URL('../assets/home-features/' + slug + '.json', import.meta.url), 'utf8')).html;

test('the homepage close reading changes on Mondays and follows the year', () => {
  // The same reading from Monday to Sunday, a different one the next Monday.
  assert.equal(on('2026-11-16'), on('2026-11-22'));
  assert.notEqual(on('2026-11-16'), on('2026-11-23'));
  // The shorter window wins where two overlap.
  assert.ok(plan.windows.find(window => window.name === 'Halloween').slugs.includes(on('2027-10-20')));
  assert.equal(on('2027-11-05'), 'macbeth-unsex-me-here');
  assert.ok(plan.windows.find(window => window.name === 'Christmas').slugs.includes(on('2027-12-24')));
  assert.equal(on('2026-12-22'), 'christmas-carol-prisons');
  // A window that runs over New Year holds on both sides of it.
  const newYear = plan.windows.find(window => window.name === 'New Year').slugs;
  assert.ok(newYear.includes(on('2026-12-30')) && newYear.includes(on('2027-01-03')));
});

test('every reading in the plan exists and gives the homepage two marked phrases with their notes', () => {
  const slugs = new Set(plan.order);
  for (const window of plan.windows) for (const slug of window.slugs) slugs.add(slug);
  for (const slug of slugs) {
    assert.ok(fs.existsSync(new URL('../passage-room/' + slug + '/index.html', import.meta.url)), slug + ' is not a close reading');
    const html = fragment(slug);
    assert.equal((html.match(/<mark>/g) || []).length, 2, slug + ' marks');
    assert.equal((html.match(/class="home-feature-number"/g) || []).length, 2, slug + ' notes');
    // Each number printed in the passage is the number on a note beneath it.
    const inText = [...html.matchAll(/<sup>(\d+)<\/sup>/g)].map(match => match[1]);
    const onNotes = [...html.matchAll(/class="home-feature-number" aria-hidden="true">(\d+)</g)].map(match => match[1]);
    assert.deepEqual(inText, onNotes, slug + ' numbers its notes differently from its phrases');
    assert.match(html, /<a class="home-button" href="\/passage-room\/[a-z0-9-]+\/">Read all /, slug + ' has no way to the whole reading');
    assert.doesNotMatch(html, /tabindex|data-passage-mark|class="ln"/, slug + ' carries markup that belongs to the close reading page');
  }
});

test('the homepage carries the reading, the script that changes it and a route to study', () => {
  const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const feature = home.match(/<section class="home-feature"[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(feature, 'no close reading on the homepage');
  assert.match(feature, /href="\/guides\/[a-z0-9-]+\/"/, 'no route to a study guide');
  assert.match(feature, /href="\/play\/\?book=[a-z0-9-]+"/, 'no route to revision');
  assert.match(home, /<\/section>\s*<script data-home-feature-calendar>/);
  assert.match(home, /<form class="home-search" role="search" action="\/explore\/" method="get">/, 'no search box in the opening');
  assert.doesNotMatch(home, /home-free/, 'the list of four links has come back');
});
