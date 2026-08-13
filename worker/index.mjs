import { createServerClient } from '@supabase/ssr';
import { parseCookie, stringifySetCookie } from 'cookie';
import { presentations } from '../assets/presentation-data.js';
import {
  hasRecentAuthentication,
  hasRecentRecovery,
  encodeLibraryCursor,
  isSafeResourceId,
  isValidLastSlide,
  LIBRARY_PAGE_SIZE,
  LIBRARY_RECENT_LIMIT,
  parseLibraryCursor,
  PREVIEW_SLIDES
} from './security.mjs';

const KNOWN_RESOURCE_IDS = new Set(Object.keys(presentations));
const RESOURCE_ACTIONS = new Set(['view', 'save', 'unsave']);
const requestResponseAppliers = new WeakMap();

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff'
};

class PublicError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function configured(env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);
}

function publicOrigin(request, env) {
  const candidate = env.SITE_URL || new URL(request.url).origin;
  try {
    return new URL(candidate).origin;
  } catch {
    return new URL(request.url).origin;
  }
}

function isLocalOrigin(request, env) {
  const hostname = new URL(publicOrigin(request, env)).hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function safeNext(value, fallback = '/resources/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const url = new URL(value, 'https://astorlibrary.invalid');
    return url.origin === 'https://astorlibrary.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

function assertSameOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  const allowed = new Set([requestOrigin, publicOrigin(request, env)]);
  for (const item of String(env.ALLOWED_ORIGINS || '').split(',')) {
    if (item.trim()) allowed.add(item.trim());
  }
  if (!allowed.has(origin)) throw new PublicError('This request was not accepted.', 403);
}

async function readJson(request) {
  const size = Number(request.headers.get('Content-Length') || 0);
  if (size > 16_384) throw new PublicError('The request is too large.', 413);
  let bytes;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    throw new PublicError('Send this form again.', 400);
  }
  if (bytes.byteLength > 16_384) throw new PublicError('The request is too large.', 413);

  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PublicError('Send this form again.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PublicError('Send this form again.', 400);
  }
  return body;
}

function normaliseEmail(value) {
  const email = String(value || '').trim().toLocaleLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new PublicError('Enter a valid email address.');
  }
  return email;
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 8) throw new PublicError('Use at least 8 characters for your password.');
  if (password.length > 256) throw new PublicError('The password is too long.');
  return password;
}

function friendlyAuthError(error, fallback) {
  const message = String(error?.message || '').toLocaleLowerCase();
  if (message.includes('invalid login credentials')) return 'The email address or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Confirm your email address before signing in.';
  if (message.includes('password') && message.includes('weak')) return 'Choose a stronger password and try again.';
  if (message.includes('rate limit') || error?.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  return fallback;
}

async function verifyTurnstile(request, env, token, action) {
  const siteKey = String(env.TURNSTILE_SITE_KEY || '');
  const secret = String(env.TURNSTILE_SECRET_KEY || '');
  if (!siteKey || !secret) {
    if (isLocalOrigin(request, env)) return;
    throw new PublicError('The account security check has not been configured yet.', 503);
  }

  const responseToken = String(token || '');
  if (!responseToken || responseToken.length > 2_048) {
    throw new PublicError('Complete the security check and try again.');
  }

  const form = new FormData();
  form.set('secret', secret);
  form.set('response', responseToken);
  const remoteAddress = request.headers.get('CF-Connecting-IP');
  if (remoteAddress) form.set('remoteip', remoteAddress);

  let result;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form
    });
    result = await response.json();
  } catch {
    throw new PublicError('The security check is temporarily unavailable. Try again.', 503);
  }

  const expectedHostname = new URL(publicOrigin(request, env)).hostname;
  if (!result?.success || result.action !== action || (!isLocalOrigin(request, env) && result.hostname !== expectedHostname)) {
    throw new PublicError('The security check was not accepted. Complete it again.');
  }
}

function createRequestClient(request, env) {
  if (!configured(env)) throw new PublicError('Account access has not been configured yet.', 503);

  const url = new URL(request.url);
  const incoming = parseCookie(request.headers.get('Cookie') || '');
  const pendingCookies = [];
  const pendingHeaders = new Headers();
  const secure = url.protocol === 'https:';

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { path: '/', sameSite: 'lax', secure, httpOnly: true },
    cookies: {
      getAll() {
        return Object.entries(incoming).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headersToSet) {
        pendingCookies.push(...cookiesToSet);
        if (headersToSet instanceof Headers) {
          for (const [name, value] of headersToSet) pendingHeaders.append(name, value);
        } else if (Array.isArray(headersToSet)) {
          for (const [name, value] of headersToSet) pendingHeaders.append(name, value);
        } else if (headersToSet && typeof headersToSet === 'object') {
          for (const [name, value] of Object.entries(headersToSet)) pendingHeaders.append(name, value);
        }
      }
    }
  });

  function apply(response) {
    const headers = new Headers(response.headers);
    for (const [name, value] of pendingHeaders) headers.append(name, value);
    for (const item of pendingCookies) {
      headers.append('Set-Cookie', stringifySetCookie({
        name: item.name,
        value: item.value,
        ...item.options,
        path: item.options?.path || '/',
        sameSite: 'lax',
        secure,
        httpOnly: true
      }));
    }
    if (pendingCookies.length) headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  requestResponseAppliers.set(request, apply);
  return { supabase, apply };
}

async function sessionPayload(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { authenticated: false };

  const { data: claimsData } = await supabase.auth.getClaims();

  const { data: profile } = await supabase
    .from('profiles')
    .select('marketing_consent, marketing_consent_at, marketing_consent_withdrawn_at')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    authenticated: true,
    email: data.user.email || '',
    canResetPassword: hasRecentRecovery(claimsData?.claims),
    marketingConsent: Boolean(profile?.marketing_consent),
    marketingConsentAt: profile?.marketing_consent_at || null,
    marketingConsentWithdrawnAt: profile?.marketing_consent_withdrawn_at || null
  };
}

async function requireUser(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new PublicError('Sign in to use your resource library.', 401);
  return data.user;
}

function libraryRecord(row, saved = false) {
  const record = {
    resourceId: row.resource_id,
    lastViewedAt: row.last_viewed_at || null,
    lastSlide: Number.isSafeInteger(row.last_slide) ? row.last_slide : null
  };
  if (saved) record.savedAt = row.saved_at;
  return record;
}

async function handleAuth(request, env, action) {
  assertSameOrigin(request, env);
  if (request.method !== 'POST' && action !== 'session' && action !== 'config') {
    throw new PublicError('Method not allowed.', 405);
  }
  if ((action === 'session' || action === 'config') && request.method !== 'GET') throw new PublicError('Method not allowed.', 405);

  if (action === 'config') {
    const turnstileRequired = !isLocalOrigin(request, env) || Boolean(env.TURNSTILE_SITE_KEY || env.TURNSTILE_SECRET_KEY);
    return json({
      turnstileRequired,
      turnstileSiteKey: turnstileRequired ? String(env.TURNSTILE_SITE_KEY || '') : ''
    });
  }

  const client = createRequestClient(request, env);
  const { supabase, apply } = client;

  if (action === 'session') {
    return apply(json(await sessionPayload(supabase)));
  }

  const body = await readJson(request);

  if (action === 'sign-up') {
    await verifyTurnstile(request, env, body.turnstileToken, 'signup');
    const email = normaliseEmail(body.email);
    const password = validatePassword(body.password);
    const marketingConsent = body.marketingConsent === true;
    const callback = new URL('/account/callback/', publicOrigin(request, env));
    callback.searchParams.set('next', safeNext(body.next));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callback.toString(),
        data: {
          marketing_consent: marketingConsent,
          marketing_consent_source: 'account_registration',
          marketing_consent_text_version: '2026-08-11'
        }
      }
    });
    if (error) throw new PublicError(friendlyAuthError(error, 'The account could not be created. Try again.'), error.status || 400);
    return apply(json({
      ok: true,
      authenticated: Boolean(data.session),
      requiresEmailConfirmation: !data.session,
      message: data.session
        ? 'Your account is ready.'
        : 'Check your email and use the confirmation link to finish creating your account.'
    }, 201));
  }

  if (action === 'sign-in') {
    await verifyTurnstile(request, env, body.turnstileToken, 'signin');
    const email = normaliseEmail(body.email);
    const password = validatePassword(body.password);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new PublicError(friendlyAuthError(error, 'Sign-in failed. Try again.'), error.status || 400);
    return apply(json({ ok: true, ...(await sessionPayload(supabase)) }));
  }

  if (action === 'sign-out') {
    await supabase.auth.signOut({ scope: 'local' });
    return apply(json({ ok: true, authenticated: false }));
  }

  if (action === 'recover') {
    await verifyTurnstile(request, env, body.turnstileToken, 'recover');
    const email = normaliseEmail(body.email);
    const redirect = new URL('/account/reset/', publicOrigin(request, env));
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect.toString() });
    if (error && (error.status === 429 || String(error.message).toLocaleLowerCase().includes('rate limit'))) {
      throw new PublicError('Too many attempts. Wait a few minutes and try again.', 429);
    }
    return apply(json({
      ok: true,
      message: 'If an account exists for that address, a password-reset link is on its way.'
    }));
  }

  if (action === 'exchange-code') {
    const code = String(body.code || '');
    if (!code || code.length > 2_048) throw new PublicError('The sign-in link is invalid or has expired.');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new PublicError('The sign-in link is invalid or has expired. Request a new link.');
    return apply(json({ ok: true, ...(await sessionPayload(supabase)) }));
  }

  if (action === 'update-password') {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !hasRecentRecovery(claimsData?.claims)) {
      throw new PublicError('Request a new password-reset link before choosing a new password.', 403);
    }
    const password = validatePassword(body.password);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new PublicError(friendlyAuthError(error, 'The password could not be updated. Request a new reset link.'), error.status || 400);
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) console.error('Password changed, but other sessions could not be revoked', signOutError);
    return apply(json({ ok: true, authenticated: false, message: 'Your password has been updated. Sign in again with the new password.' }));
  }

  if (action === 'update-email') {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.email) throw new PublicError('Sign in to change your email address.', 401);
    const email = normaliseEmail(body.email);
    const password = validatePassword(body.password);
    if (email === userData.user.email.toLocaleLowerCase()) {
      throw new PublicError('Enter a different email address.');
    }

    const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password
    });
    if (reauthenticationError) {
      throw new PublicError('The current password is incorrect. Your email address was not changed.', 403);
    }

    const callback = new URL('/account/callback/', publicOrigin(request, env));
    callback.searchParams.set('next', '/account/');
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: callback.toString() });
    if (error) {
      throw new PublicError(friendlyAuthError(error, 'The email change could not be started. Try again.'), error.status || 400);
    }
    return apply(json({
      ok: true,
      message: 'Check the confirmation email messages. Your sign-in address changes only after the required confirmation links are used.'
    }, 202));
  }

  if (action === 'marketing-consent') {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) throw new PublicError('Sign in to update your email choice.', 401);
    const marketingConsent = body.marketingConsent === true;
    const { error } = await supabase.rpc('set_marketing_consent', { consent: marketingConsent });
    if (error) throw new PublicError('Your email choice could not be saved. Try again.');
    return apply(json({ ok: true, marketingConsent }));
  }

  throw new PublicError('Not found.', 404);
}

async function handleAccountLibrary(request, env) {
  assertSameOrigin(request, env);
  if (request.method !== 'GET') throw new PublicError('Method not allowed.', 405);

  const url = new URL(request.url);
  const cursorValues = url.searchParams.getAll('cursor');
  const hasUnknownParameter = [...url.searchParams.keys()].some(key => key !== 'cursor');
  const cursor = cursorValues.length <= 1 ? parseLibraryCursor(cursorValues[0] ?? null) : false;
  if (hasUnknownParameter || cursor === false) throw new PublicError('Use a valid saved-resource cursor.');

  const client = createRequestClient(request, env);
  const { supabase, apply } = client;
  const user = await requireUser(supabase);

  let savedQuery = supabase
    .from('resource_library_items')
    .select('resource_id, saved_at, last_viewed_at, last_slide')
    .eq('user_id', user.id)
    .not('saved_at', 'is', null)
    .order('saved_at', { ascending: false })
    .order('resource_id', { ascending: true })
    .limit(LIBRARY_PAGE_SIZE + 1);
  if (cursor) {
    const timestamp = `"${cursor.savedAt}"`;
    savedQuery = savedQuery.or(
      `saved_at.lt.${timestamp},and(saved_at.eq.${timestamp},resource_id.gt.${cursor.resourceId})`
    );
  }

  const [savedResult, savedCountResult, recentResult] = await Promise.all([
    savedQuery,
    supabase
      .from('resource_library_items')
      .select('resource_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('saved_at', 'is', null),
    supabase
      .from('resource_library_items')
      .select('resource_id, last_viewed_at, last_slide')
      .eq('user_id', user.id)
      .not('last_viewed_at', 'is', null)
      .order('last_viewed_at', { ascending: false })
      .order('resource_id', { ascending: true })
      .limit(LIBRARY_RECENT_LIMIT)
  ]);

  if (savedResult.error || savedCountResult.error || recentResult.error) {
    throw new PublicError('Your resource library could not be loaded. Try again.', 500);
  }

  const savedRows = savedResult.data || [];
  const savedHasMore = savedRows.length > LIBRARY_PAGE_SIZE;
  const savedPage = savedRows.slice(0, LIBRARY_PAGE_SIZE);
  const lastSaved = savedPage.at(-1);

  return apply(json({
    saved: savedPage.map(row => libraryRecord(row, true)),
    savedTotal: savedCountResult.count ?? 0,
    recent: (recentResult.data || []).map(row => libraryRecord(row)),
    savedCursor: savedHasMore && lastSaved
      ? encodeLibraryCursor(lastSaved.saved_at, lastSaved.resource_id)
      : null,
    savedHasMore,
    savedLimit: LIBRARY_PAGE_SIZE
  }));
}

async function handleAccountResource(request, env) {
  assertSameOrigin(request, env);
  if (request.method !== 'POST') throw new PublicError('Method not allowed.', 405);
  const body = await readJson(request);
  const action = body.action;
  const resourceId = body.resourceId;
  const lastSlide = body.lastSlide == null ? null : body.lastSlide;

  if (!RESOURCE_ACTIONS.has(action)) throw new PublicError('Choose a valid resource-library action.');
  const presentation = isSafeResourceId(resourceId) ? presentations[resourceId] : null;
  if (!presentation || !KNOWN_RESOURCE_IDS.has(resourceId)) {
    throw new PublicError('Choose a valid Astor Library resource.');
  }
  if (!isValidLastSlide(lastSlide) ||
      (lastSlide !== null && (action !== 'view' || lastSlide > presentation.slideCount))) {
    throw new PublicError('Use a valid slide number for this resource.');
  }

  const client = createRequestClient(request, env);
  const { supabase, apply } = client;
  await requireUser(supabase);

  const { data, error } = await supabase.rpc('mutate_resource_library', {
    p_action: action,
    p_resource_id: resourceId,
    p_last_slide: lastSlide
  });
  if (error) throw new PublicError('Your resource library could not be updated. Try again.', 500);

  const row = Array.isArray(data) ? data[0] : data;
  return apply(json({
    ok: true,
    action,
    resourceId,
    saved: Boolean(row?.saved_at),
    savedAt: row?.saved_at || null,
    lastViewedAt: row?.last_viewed_at || null,
    lastSlide: Number.isSafeInteger(row?.last_slide) ? row.last_slide : null
  }));
}

async function handleAccountDelete(request, env) {
  assertSameOrigin(request, env);
  if (request.method !== 'POST') throw new PublicError('Method not allowed.', 405);
  const body = await readJson(request);
  if (body.confirmation !== 'DELETE') {
    throw new PublicError('Type DELETE to confirm permanent account deletion.');
  }
  const password = validatePassword(body.password);

  const client = createRequestClient(request, env);
  const { supabase, apply } = client;
  const user = await requireUser(supabase);
  if (!user.email) throw new PublicError('Sign in again before deleting your account.', 401);
  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });
  if (reauthenticationError) {
    throw new PublicError('The current password is incorrect. Your account was not deleted.', 403);
  }
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || claimsData?.claims?.sub !== user.id) {
    throw new PublicError('Sign in again before deleting your account.', 401);
  }
  if (!hasRecentAuthentication(claimsData.claims)) {
    throw new PublicError('Sign in again before deleting your account.', 403);
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    const message = String(error.message || '').toLocaleLowerCase();
    if (message.includes('recent authentication required')) {
      throw new PublicError('Sign in again before deleting your account.', 403);
    }
    throw new PublicError('Your account could not be deleted. Try again.', 500);
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) console.error('Account deleted, but local session cleanup failed', signOutError);
  return apply(json({
    ok: true,
    authenticated: false,
    deleted: true,
    message: 'Your account has been deleted.'
  }));
}

function normalisedPathname(url) {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    throw new PublicError('The requested path is invalid.', 400);
  }
}

function slideNumber(pathname) {
  const match = pathname.match(/^\/assets\/presentations\/[^/]+\/(\d+)\.png(?:\.part-\d{3})?$/);
  return match ? Number(match[1]) : null;
}

async function servePresentationAsset(request, env, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') throw new PublicError('Method not allowed.', 405);
  const number = slideNumber(pathname);

  // One legacy viewer backdrop and the first three numbered slides are intentionally public.
  if (number === null) {
    if (pathname === '/assets/presentations/romeo-and-juliet/backdrop.webp') return env.ASSETS.fetch(request);
    throw new PublicError('Not found.', 404);
  }
  if (number < 1) throw new PublicError('Not found.', 404);
  if (number <= PREVIEW_SLIDES) return env.ASSETS.fetch(request);

  const client = createRequestClient(request, env);
  // Check the user with the Auth server, rather than trusting the JWT alone.
  // This makes account deletion revoke protected-slide access on other devices
  // as soon as their next slide request is made.
  const { data, error } = await client.supabase.auth.getUser();
  if (error || !data?.user) {
    return client.apply(json({
      error: 'Sign in to continue past the preview.',
      code: 'RESOURCE_SIGN_IN_REQUIRED',
      previewSlides: PREVIEW_SLIDES
    }, 401));
  }

  const asset = await env.ASSETS.fetch(request);
  const headers = new Headers(asset.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Vary', 'Cookie');
  return client.apply(new Response(asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers
  }));
}

function presentationSlideRoute(pathname) {
  const match = pathname.match(/^\/api\/presentations\/([a-z0-9-]+)\/(\d+)\.png$/);
  if (!match) return null;
  const number = Number(match[2]);
  if (!Number.isSafeInteger(number) || number < 1 || number > 250) return null;
  return { deck: match[1], number };
}

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = '';
  return new Request(url, {
    method: 'GET',
    headers: { Accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8' }
  });
}

async function readSlideFromAssets(request, env, deck, number) {
  const base = `/assets/presentations/${deck}/${number}.png`;
  const direct = await env.ASSETS.fetch(assetRequest(request, base));
  if (direct.ok) return direct;

  const parts = [];
  for (let index = 1; index <= 16; index += 1) {
    const path = `${base}.part-${String(index).padStart(3, '0')}`;
    const response = await env.ASSETS.fetch(assetRequest(request, path));
    if (!response.ok) break;
    parts.push(await response.arrayBuffer());
  }
  if (!parts.length) return null;
  return new Response(new Blob(parts, { type: 'image/png' }), {
    headers: {
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function servePresentationSlide(request, env, route) {
  if (request.method !== 'GET') throw new PublicError('Method not allowed.', 405);
  let client = null;

  if (route.number > PREVIEW_SLIDES) {
    client = createRequestClient(request, env);
    const { data, error } = await client.supabase.auth.getUser();
    if (error || !data?.user) {
      return client.apply(json({
        error: 'Sign in to continue past the preview.',
        code: 'RESOURCE_SIGN_IN_REQUIRED',
        previewSlides: PREVIEW_SLIDES
      }, 401));
    }
  }

  const slide = await readSlideFromAssets(request, env, route.deck, route.number);
  if (!slide) {
    const missing = json({ error: 'This slide could not be found.' }, 404);
    return client ? client.apply(missing) : missing;
  }
  const headers = new Headers(slide.headers);
  headers.set('Cache-Control', route.number <= PREVIEW_SLIDES
    ? 'public, max-age=3600, stale-while-revalidate=86400'
    : 'private, no-store');
  if (route.number > PREVIEW_SLIDES) headers.set('Vary', 'Cookie');
  const response = new Response(slide.body, { status: slide.status, headers });
  return client ? client.apply(response) : response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const pathname = normalisedPathname(url);
      const slide = presentationSlideRoute(pathname);
      if (slide) return await servePresentationSlide(request, env, slide);
      if (pathname === '/api/account/library') return await handleAccountLibrary(request, env);
      if (pathname === '/api/account/resource') return await handleAccountResource(request, env);
      if (pathname === '/api/account/delete') return await handleAccountDelete(request, env);
      if (pathname === '/api/account' || pathname.startsWith('/api/account/')) {
        throw new PublicError('Not found.', 404);
      }
      if (pathname.startsWith('/api/auth/')) {
        const action = pathname.slice('/api/auth/'.length).replace(/\/+$/, '');
        return await handleAuth(request, env, action);
      }
      if (pathname.startsWith('/assets/presentations/')) {
        return await servePresentationAsset(request, env, pathname);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      const apply = requestResponseAppliers.get(request);
      if (error instanceof PublicError) {
        const response = json({ error: error.message }, error.status);
        return apply ? apply(response) : response;
      }
      console.error('Astor Worker request failed', error);
      const response = json({ error: 'Something went wrong. Try again.' }, 500);
      return apply ? apply(response) : response;
    }
  }
};
