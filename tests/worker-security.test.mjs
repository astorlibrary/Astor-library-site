import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import worker from '../worker/index.mjs';
import { hasRecentRecovery, PREVIEW_SLIDES } from '../worker/security.mjs';

const presentationMetadata = fs.readFileSync(new URL('../assets/presentation-data.js', import.meta.url), 'utf8');
const workerSource = fs.readFileSync(new URL('../worker/index.mjs', import.meta.url), 'utf8');
const workerConfiguration = fs.readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('../scripts/build-static.js', import.meta.url), 'utf8');
const packageSource = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const metadataPreviewSlides = Number(presentationMetadata.match(/DEFAULT_PRESENTATION_PREVIEW_SLIDES\s*=\s*(\d+)/)?.[1]);

function assetEnvironment(extra = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, {
          status: 200,
          headers: { 'Content-Type': 'image/png' }
        });
      }
    },
    ...extra
  };
}

test('public pages, preview slides and the explicit legacy backdrop remain public', async () => {
  assert.equal(metadataPreviewSlides, PREVIEW_SLIDES, 'viewer and Worker preview boundaries must stay aligned');
  const env = assetEnvironment();
  for (const path of [
    '/',
    '/api/presentations/demo/1.png',
    '/assets/presentations/demo/3.png.part-001',
    '/assets/presentations/romeo-and-juliet/backdrop.webp'
  ]) {
    const response = await worker.fetch(new Request(`https://astorlibrary.test${path}`), env);
    assert.equal(response.status, 200, path);
  }
});

test('protected slides and chunks fail closed when authentication is unavailable', async () => {
  const env = assetEnvironment();
  for (const path of [
    '/api/presentations/demo/4.png',
    '/assets/presentations/demo/4.png',
    '/assets/presentations/demo/4.png.part-001',
    '/assets/presentations/demo/%34.png',
    '/assets/presentations/demo/%34.png.part-001'
  ]) {
    const response = await worker.fetch(new Request(`https://astorlibrary.test${path}`), env);
    assert.equal(response.status, 503, path);
  }
});

test('protected slide access checks live users so account deletion revokes outstanding sessions', () => {
  const protectedAssetHandler = workerSource.match(/async function servePresentationAsset[\s\S]*?\n}/)?.[0] || '';
  const protectedSlideHandler = workerSource.match(/async function servePresentationSlide[\s\S]*?\n}/)?.[0] || '';
  assert.match(protectedAssetHandler, /supabase\.auth\.getUser\(\)/);
  assert.match(protectedSlideHandler, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(protectedAssetHandler, /supabase\.auth\.getClaims\(\)/);
  assert.doesNotMatch(protectedSlideHandler, /supabase\.auth\.getClaims\(\)/);
});

test('publishable slides use the gated Static Assets namespace without an R2 subscription', () => {
  assert.doesNotMatch(workerConfiguration, /\[\[r2_buckets\]\]|PRESENTATIONS/);
  assert.match(workerConfiguration, /run_worker_first\s*=\s*\["\/api\/\*", "\/assets\/presentations\/\*"\]/);
  assert.doesNotMatch(workerSource, /readSlideFromR2|env\.PRESENTATIONS/);
  assert.match(workerSource, /const slide = await readSlideFromAssets\(request, env, route\.deck, route\.number\)/);
  assert.doesNotMatch(buildSource, /Number\(presentationAsset\[1\]\)\s*>\s*3/);
  assert.doesNotMatch(packageSource, /stage:presentations/);
});

test('the presentation namespace rejects unknown non-slide files', async () => {
  const env = assetEnvironment();
  const response = await worker.fetch(
    new Request('https://astorlibrary.test/assets/presentations/demo/future-export.pdf'),
    env
  );
  assert.equal(response.status, 404);
});

test('auth endpoints reject cross-origin requests before touching providers', async () => {
  const env = assetEnvironment();
  const response = await worker.fetch(new Request('https://astorlibrary.test/api/auth/session', {
    headers: { Origin: 'https://attacker.test' }
  }), env);
  assert.equal(response.status, 403);
});

test('Turnstile is optional only on local development origins', async () => {
  const local = await worker.fetch(new Request('http://localhost:8787/api/auth/config'), assetEnvironment({
    SITE_URL: 'http://localhost:8787'
  }));
  assert.deepEqual(await local.json(), { turnstileRequired: false, turnstileSiteKey: '' });

  const production = await worker.fetch(new Request('https://astorlibrary.com/api/auth/config'), assetEnvironment({
    SITE_URL: 'https://astorlibrary.com'
  }));
  assert.deepEqual(await production.json(), { turnstileRequired: true, turnstileSiteKey: '' });
});

test('a password reset requires a recent recovery authentication method', () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(hasRecentRecovery({ amr: [{ method: 'recovery', timestamp: now - 60 }] }), true);
  assert.equal(hasRecentRecovery({ amr: [{ method: 'password', timestamp: now }] }), false);
  assert.equal(hasRecentRecovery({ amr: [{ method: 'recovery', timestamp: now - 3_600 }] }), false);
});
