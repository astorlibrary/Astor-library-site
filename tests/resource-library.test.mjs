import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { presentations } from '../assets/presentation-data.js';
import worker from '../worker/index.mjs';
import {
  encodeLibraryCursor,
  hasRecentAuthentication,
  isSafeResourceId,
  isValidLastSlide,
  LIBRARY_PAGE_SIZE,
  LIBRARY_RECENT_LIMIT,
  parseLibraryCursor
} from '../worker/security.mjs';

const origin = 'https://astorlibrary.test';

function assetEnvironment(extra = {}) {
  let calls = 0;
  return {
    env: {
      ASSETS: {
        async fetch(request) {
          calls += 1;
          return new Response(`asset:${new URL(request.url).pathname}`);
        }
      },
      ...extra
    },
    get assetCalls() {
      return calls;
    }
  };
}

function accountRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Origin', origin);
  return new Request(`${origin}${path}`, { ...options, headers });
}

function jsonRequest(path, body, method = 'POST') {
  return accountRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('resource-library validation accepts only bounded slugs, slides and cursors', () => {
  assert.equal(isSafeResourceId('macbeth-quick-guide'), true);
  for (const invalid of ['', '-macbeth', 'macbeth-', 'Macbeth', 'macbeth/guide', 'a'.repeat(129), null]) {
    assert.equal(isSafeResourceId(invalid), false, String(invalid));
  }

  for (const valid of [null, undefined, 1, 250]) assert.equal(isValidLastSlide(valid), true);
  for (const invalid of [0, 251, 1.5, '2', Number.NaN]) assert.equal(isValidLastSlide(invalid), false);

  assert.equal(parseLibraryCursor(null), null);
  assert.equal(parseLibraryCursor(''), null);
  const cursor = encodeLibraryCursor('2026-08-11T12:34:56.123456+00:00', 'macbeth-quick-guide');
  assert.deepEqual(parseLibraryCursor(cursor), {
    savedAt: '2026-08-11T12:34:56.123456+00:00',
    resourceId: 'macbeth-quick-guide'
  });
  const sameMillisecond = encodeLibraryCursor('2026-08-11T12:34:56.123300+00:00', 'macbeth-summary-analysis');
  assert.equal(parseLibraryCursor(sameMillisecond).savedAt, '2026-08-11T12:34:56.123300+00:00');
  for (const invalid of ['!', 'not-a-valid-cursor', 'a'.repeat(513), 1]) {
    assert.equal(parseLibraryCursor(invalid), false, String(invalid));
  }
  assert.equal(encodeLibraryCursor('not-a-date', 'macbeth-quick-guide'), null);
  assert.equal(encodeLibraryCursor('2026-02-30T12:00:00+00:00', 'macbeth-quick-guide'), null);
  const impossibleDate = btoa(JSON.stringify(['2026-02-30T12:00:00+00:00', 'macbeth-quick-guide']))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  assert.equal(parseLibraryCursor(impossibleDate), false);
  assert.equal(encodeLibraryCursor('2026-08-11T12:34:56.000Z', '../macbeth'), null);
  assert.equal(LIBRARY_PAGE_SIZE, 50);
  assert.equal(LIBRARY_RECENT_LIMIT, 20);
});

test('recent authentication requires a current password or recovery AMR claim', () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(hasRecentAuthentication({ amr: [{ method: 'password', timestamp: now - 60 }] }), true);
  assert.equal(hasRecentAuthentication({ amr: [{ method: 'recovery', timestamp: now }] }), true);
  assert.equal(hasRecentAuthentication({ amr: [{ method: 'password', timestamp: now - 901 }] }), false);
  assert.equal(hasRecentAuthentication({ amr: [{ method: 'email', timestamp: now }] }), false);
  assert.equal(hasRecentAuthentication({ amr: [{ method: 'password', timestamp: now + 120 }] }), false);
  assert.equal(hasRecentAuthentication({ amr: 'password' }), false);
});

test('account-library routes fail closed and never fall through to static assets', async () => {
  const fixture = assetEnvironment();
  for (const [request, expectedStatus] of [
    [accountRequest('/api/account/library'), 503],
    [accountRequest('/api/account/library?offset=-1'), 400],
    [accountRequest('/api/account/library?offset=0&offset=50'), 400],
    [accountRequest('/api/account/library?cursor=bad!'), 400],
    [accountRequest('/api/account/library?cursor=abc&cursor=def'), 400],
    [accountRequest('/api/account/library', { method: 'POST' }), 405],
    [accountRequest('/api/account/resource'), 405],
    [accountRequest('/api/account/delete'), 405],
    [accountRequest('/api/account/not-a-route'), 404]
  ]) {
    const response = await worker.fetch(request, fixture.env);
    assert.equal(response.status, expectedStatus, request.url);
    assert.match(response.headers.get('Cache-Control') || '', /no-store/);
  }
  assert.equal(fixture.assetCalls, 0);
});

test('account JSON endpoints reject non-object and oversized bodies cleanly', async () => {
  const fixture = assetEnvironment();
  for (const body of ['null', '[]', '"resource"']) {
    const response = await worker.fetch(accountRequest('/api/account/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    }), fixture.env);
    assert.equal(response.status, 400, body);
  }

  const oversized = JSON.stringify({ padding: 'x'.repeat(17_000) });
  const response = await worker.fetch(accountRequest('/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: oversized
  }), fixture.env);
  assert.equal(response.status, 413);
  assert.equal(fixture.assetCalls, 0);
});

test('resource mutations require a real catalogue slug before touching Supabase', async () => {
  const fixture = assetEnvironment();
  const knownResourceId = Object.keys(presentations)[0];
  assert.ok(knownResourceId, 'the presentation catalogue must not be empty');

  for (const body of [
    { action: 'delete', resourceId: knownResourceId },
    { action: 'save', resourceId: '../macbeth' },
    { action: 'save', resourceId: 'syntactically-valid-but-not-in-the-catalogue' },
    { action: 'view', resourceId: knownResourceId, lastSlide: 0 },
    { action: 'view', resourceId: knownResourceId, lastSlide: 251 },
    { action: 'view', resourceId: knownResourceId, lastSlide: '2' }
  ]) {
    const response = await worker.fetch(jsonRequest('/api/account/resource', body), fixture.env);
    assert.equal(response.status, 400, JSON.stringify(body));
  }

  for (const action of ['view', 'save', 'unsave']) {
    const response = await worker.fetch(jsonRequest('/api/account/resource', {
      action,
      resourceId: knownResourceId,
      lastSlide: action === 'view' ? 1 : undefined
    }), fixture.env);
    assert.equal(response.status, 503, action);
  }

  const knownPresentation = presentations[knownResourceId];
  for (const body of [
    { action: 'view', resourceId: knownResourceId, lastSlide: knownPresentation.slideCount + 1 },
    { action: 'save', resourceId: knownResourceId, lastSlide: 1 },
    { action: 'unsave', resourceId: knownResourceId, lastSlide: 1 }
  ]) {
    const response = await worker.fetch(jsonRequest('/api/account/resource', body), fixture.env);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.equal(fixture.assetCalls, 0);
});

test('account deletion requires the exact destructive confirmation before auth', async () => {
  const fixture = assetEnvironment();
  for (const confirmation of [undefined, '', 'delete', ' DELETE ', true]) {
    const response = await worker.fetch(jsonRequest('/api/account/delete', { confirmation }), fixture.env);
    assert.equal(response.status, 400, String(confirmation));
  }
  const missingPassword = await worker.fetch(jsonRequest('/api/account/delete', { confirmation: 'DELETE' }), fixture.env);
  assert.equal(missingPassword.status, 400);
  const confirmed = await worker.fetch(jsonRequest('/api/account/delete', {
    confirmation: 'DELETE',
    password: 'current-password'
  }), fixture.env);
  assert.equal(confirmed.status, 503);
  assert.equal(fixture.assetCalls, 0);

  const source = fs.readFileSync(new URL('../worker/index.mjs', import.meta.url), 'utf8');
  const handler = source.match(/async function handleAccountDelete[\s\S]*?\n}/)?.[0] || '';
  assert.match(handler, /signInWithPassword\(\{[\s\S]*password/);
});

test('sign-in email changes require a configured authenticated service before reauthentication', async () => {
  const fixture = assetEnvironment();
  const response = await worker.fetch(jsonRequest('/api/auth/update-email', {
    email: 'new-address@example.com',
    password: 'current-password'
  }), fixture.env);
  assert.equal(response.status, 503);
  assert.equal(fixture.assetCalls, 0);

  const source = fs.readFileSync(new URL('../worker/index.mjs', import.meta.url), 'utf8');
  const handler = source.match(/if \(action === 'update-email'\)[\s\S]*?\n  }/)?.[0] || '';
  assert.match(handler, /getUser\(\)/);
  assert.match(handler, /signInWithPassword\(\{[\s\S]*password/);
  assert.match(handler, /updateUser\(\{ email \}, \{ emailRedirectTo: callback\.toString\(\) \}\)/);
});

test('the migration enforces private ownership, uniqueness, cascade and scoped deletion', () => {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/202608110002_resource_library.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /primary key \(user_id, resource_id\)/i);
  assert.match(sql, /references auth\.users \(id\) on delete cascade/i);
  assert.match(sql, /references public\.resource_catalogue \(resource_id\) on update cascade on delete cascade/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.equal(
    (sql.match(/on conflict on constraint resource_library_items_pkey/gi) || []).length,
    2,
    'upserts must name the primary-key constraint so PL/pgSQL output variables cannot make conflict columns ambiguous'
  );
  assert.doesNotMatch(sql, /on conflict\s*\(\s*user_id\s*,\s*resource_id\s*\)/i);
  assert.match(sql, /p_action <> 'view' and p_last_slide is not null/i);
  assert.match(sql, /from public\.resource_catalogue as catalogue[\s\S]*catalogue\.resource_id = p_resource_id/i);
  assert.match(sql, /p_last_slide > catalogue_slide_count/i);
  assert.match(sql, /delete from public\.resource_library_items as stale[\s\S]*saved_at is null[\s\S]*offset 50/i);
  assert.match(sql, /delete from auth\.users[\s\S]*where account\.id = account_id/i);
  assert.match(sql, /method ->> 'method' in \('password', 'recovery'\)/i);
  const relationshipColumns = sql.match(/create table if not exists public\.resource_library_items \(([\s\S]*?)\n\);/i)?.[1] || '';
  assert.doesNotMatch(relationshipColumns, /\b(title|description|backdrop|folder|slide_count)\b\s+(?:text|integer|jsonb)/i);
  assert.doesNotMatch(relationshipColumns, /\b(first_viewed_at|updated_at)\b/i);
});

test('the database integrity catalogue exactly matches the presentation catalogue', () => {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/202608110002_resource_library.sql', import.meta.url),
    'utf8'
  );
  const entries = Array.from(sql.matchAll(/\('([a-z0-9-]+)',\s*(\d+)\)/g), match => [match[1], Number(match[2])]);
  const expected = Object.fromEntries(Object.entries(presentations).map(([id, item]) => [id, item.slideCount]));
  assert.equal(entries.length, Object.keys(expected).length);
  assert.deepEqual(Object.fromEntries(entries), expected);
  assert.match(sql, /revoke all on table public\.resource_catalogue from anon, authenticated/i);
});

test('the Supabase hardening migration closes internal RPC access and covers catalogue integrity', () => {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/202608130003_supabase_hardening.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /revoke all on function public\.handle_new_auth_user\(\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.sync_auth_user_identity\(\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /create index if not exists resource_library_resource_idx[\s\S]*on public\.resource_library_items \(resource_id\)/i);
});

test('saved pagination is deterministic and error responses preserve SSR cookie updates', () => {
  const source = fs.readFileSync(new URL('../worker/index.mjs', import.meta.url), 'utf8');
  assert.match(source, /order\('saved_at', \{ ascending: false \}\)[\s\S]*order\('resource_id', \{ ascending: true \}\)/);
  assert.match(source, /saved_at\.lt\.\$\{timestamp\}[\s\S]*resource_id\.gt\.\$\{cursor\.resourceId\}/);
  assert.match(source, /limit\(LIBRARY_PAGE_SIZE \+ 1\)/);
  assert.match(source, /savedCursor:[\s\S]*encodeLibraryCursor/);
  assert.match(source, /requestResponseAppliers\.set\(request, apply\)/);
  assert.match(source, /const apply = requestResponseAppliers\.get\(request\)[\s\S]*return apply \? apply\(response\) : response/);
  assert.match(source, /return client \? client\.apply\(missing\) : missing/);
});
