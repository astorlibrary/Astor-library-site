import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSetCookie, stringifyCookie } from 'cookie';
import worker from '../worker/index.mjs';

const siteOrigin = 'https://astorlibrary.com';
const supabaseOrigin = 'https://recovery-test.supabase.co';
const userId = '11111111-1111-4111-8111-111111111111';
const recoverySecret = 'test-only-recovery-cookie-secret-with-32-bytes';

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function accessToken(method = 'otp') {
  const now = Math.floor(Date.now() / 1_000);
  return [
    base64UrlJson({ alg: 'HS256', typ: 'JWT' }),
    base64UrlJson({
      sub: userId,
      email: 'reader@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      exp: now + 3_600,
      iat: now,
      session_id: '22222222-2222-4222-8222-222222222222',
      amr: [{ method, timestamp: now }]
    }),
    Buffer.from('test-signature').toString('base64url')
  ].join('.');
}

function user() {
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'reader@example.com',
    email_confirmed_at: '2026-08-13T12:00:00.000Z',
    phone: '',
    confirmed_at: '2026-08-13T12:00:00.000Z',
    last_sign_in_at: '2026-08-13T12:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-08-13T12:00:00.000Z',
    updated_at: '2026-08-13T12:00:00.000Z',
    is_anonymous: false
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function request(path, body, cookies = {}) {
  const headers = new Headers({ Origin: siteOrigin });
  if (Object.keys(cookies).length) headers.set('Cookie', stringifyCookie(cookies));
  const options = { headers };
  if (body !== undefined) {
    options.method = 'POST';
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(body);
  }
  return new Request(`${siteOrigin}${path}`, options);
}

function applySetCookies(jar, response) {
  for (const header of response.headers.getSetCookie()) {
    const cookie = parseSetCookie(header);
    if (cookie.maxAge === 0 || (cookie.expires && cookie.expires <= new Date())) delete jar[cookie.name];
    else jar[cookie.name] = cookie.value || '';
  }
}

test('token-hash recovery mints and consumes a signed capability without trusting OTP AMR', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let jwt = accessToken('otp');
  globalThis.fetch = async (input, init) => {
    const outgoing = input instanceof Request ? input : new Request(input, init);
    const url = new URL(outgoing.url);
    calls.push([outgoing.method, url.pathname, url.search]);

    if (url.pathname === '/auth/v1/verify' && outgoing.method === 'POST') {
      return jsonResponse({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 3_600,
        expires_at: Math.floor(Date.now() / 1_000) + 3_600,
        refresh_token: 'recovery-refresh-token',
        user: user()
      });
    }
    if (url.pathname === '/auth/v1/user' && outgoing.method === 'GET') {
      return outgoing.headers.get('Authorization') ? jsonResponse(user()) : jsonResponse({ message: 'missing token' }, 401);
    }
    if (url.pathname === '/auth/v1/user' && outgoing.method === 'PUT') return jsonResponse(user());
    if (url.pathname === '/auth/v1/logout' && outgoing.method === 'POST') return new Response(null, { status: 204 });
    if (url.pathname === '/rest/v1/profiles') {
      return jsonResponse({
        marketing_consent: false,
        marketing_consent_at: null,
        marketing_consent_withdrawn_at: null
      });
    }
    return jsonResponse({ message: `Unhandled test request: ${outgoing.method} ${url.pathname}` }, 500);
  };

  const baseEnv = {
    SUPABASE_URL: supabaseOrigin,
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    SITE_URL: siteOrigin
  };

  try {
    const tokenHash = 'a'.repeat(64);
    const missingSecret = await worker.fetch(request('/api/auth/verify-email', {
      tokenHash,
      type: 'recovery'
    }), baseEnv);
    assert.equal(missingSecret.status, 503);
    assert.equal(calls.filter(([, path]) => path === '/auth/v1/verify').length, 0, 'a missing signing secret must not consume the one-time link');

    const env = { ...baseEnv, RECOVERY_COOKIE_SECRET: recoverySecret };
    const verified = await worker.fetch(request('/api/auth/verify-email', {
      tokenHash,
      type: 'recovery'
    }), env);
    assert.equal(verified.status, 200);
    assert.equal((await verified.clone().json()).canResetPassword, true, 'the signed capability, not OTP AMR, authorises reset');
    const recoverySetCookie = verified.headers.getSetCookie().find(value => value.startsWith('astor_recovery_capability='));
    assert.match(recoverySetCookie || '', /Max-Age=900/);
    assert.match(recoverySetCookie || '', /HttpOnly/);
    assert.match(recoverySetCookie || '', /Secure/);
    assert.match(recoverySetCookie || '', /SameSite=Strict/);

    const cookies = {};
    applySetCookies(cookies, verified);
    assert.ok(cookies.astor_recovery_capability);
    assert.ok(Object.keys(cookies).some(name => name.startsWith('sb-')), 'the verified Supabase session must also be retained');

    const session = await worker.fetch(request('/api/auth/session', undefined, cookies), env);
    assert.equal(session.status, 200);
    assert.deepEqual((await session.json()).canResetPassword, true);

    const withoutCapability = { ...cookies };
    delete withoutCapability.astor_recovery_capability;
    const denied = await worker.fetch(request('/api/auth/update-password', {
      password: 'new-password-value'
    }, withoutCapability), env);
    assert.equal(denied.status, 403, 'a generic OTP session must not reset a password by itself');

    const updated = await worker.fetch(request('/api/auth/update-password', {
      password: 'new-password-value'
    }, cookies), env);
    assert.equal(updated.status, 200);
    assert.equal((await updated.clone().json()).authenticated, false);
    const cleared = updated.headers.getSetCookie().find(value => value.startsWith('astor_recovery_capability='));
    assert.match(cleared || '', /Max-Age=0/);
    assert.match(cleared || '', /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);

    jwt = accessToken('recovery');
    const legacyVerified = await worker.fetch(request('/api/auth/verify-email', {
      tokenHash: 'b'.repeat(64),
      type: 'email'
    }), env);
    const legacyCookies = {};
    applySetCookies(legacyCookies, legacyVerified);
    const legacyUpdated = await worker.fetch(request('/api/auth/update-password', {
      password: 'another-password-value'
    }, legacyCookies), env);
    assert.equal(legacyUpdated.status, 200, 'existing PKCE recovery-AMR sessions remain supported');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
