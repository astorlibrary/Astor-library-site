import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  bindConfirmationAction,
  confirmationAction,
  confirmationTarget
} from '../assets/confirmation-action.mjs';
import worker from '../worker/index.mjs';
import {
  normaliseEmailTokenHash,
  normaliseEmailTokenType,
  normalisePkceFlowId
} from '../worker/security.mjs';

const projectOrigin = 'https://mxhptvdxouvfvfyhlhpy.supabase.co';
const token = 'a'.repeat(64);
const callback = 'https://astorlibrary.com/account/callback/?next=%2Fresources%2F';
const confirmationUrl = `${projectOrigin}/auth/v1/verify?token=${token}&type=signup&redirect_to=${encodeURIComponent(callback)}`;

test('token-hash actions stay in the fragment and accept only published action types', () => {
  const tokenHash = 'b'.repeat(64);
  assert.deepEqual(confirmationAction(`#token_hash=${tokenHash}&type=email`), {
    mode: 'token', tokenHash, type: 'email', next: null
  });
  assert.deepEqual(confirmationAction(`#token_hash=${tokenHash}&type=recovery`), {
    mode: 'token', tokenHash, type: 'recovery', next: null
  });
  assert.deepEqual(confirmationAction(`#token_hash=${tokenHash}&type=email_change`), {
    mode: 'token', tokenHash, type: 'email_change', next: null
  });
  const resourceCallback = encodeURIComponent('https://astorlibrary.com/account/callback/?next=%2Fresources%2Fmacbeth%2F');
  assert.deepEqual(confirmationAction(`#token_hash=${tokenHash}&type=email&next=${resourceCallback}`), {
    mode: 'token', tokenHash, type: 'email', next: '/resources/macbeth/'
  });
  for (const invalid of [
    `#token_hash=${tokenHash}`,
    '#token_hash=short&type=email',
    `#token_hash=${tokenHash}&type=signup`,
    `#token_hash=${tokenHash}&type=email&type=recovery`,
    `#token_hash=${tokenHash}&type=email&next=https%3A%2F%2Fevil.example%2F`,
    `#token_hash=${tokenHash}&type=email&next=%2F%2Fevil.example%2F`,
    `#token_hash=${tokenHash}&type=email&next=${encodeURIComponent('https://astorlibrary.com/account/?next=%2Fresources%2F')}`,
    `#token_hash=${tokenHash}&type=recovery&next=${resourceCallback}`,
    `#token_hash=${tokenHash}&type=email_change&next=${resourceCallback}`,
    `#token_hash=${tokenHash}%2F&type=email`
  ]) assert.equal(confirmationAction(invalid), null, invalid);
});

test('the raw confirmation fragment preserves the nested Supabase query', () => {
  const target = confirmationTarget(`#confirmation_url=${confirmationUrl}`);
  assert.ok(target);
  const parsed = new URL(target);
  assert.equal(parsed.origin, projectOrigin);
  assert.equal(parsed.pathname, '/auth/v1/verify');
  assert.equal(parsed.searchParams.get('token'), token);
  assert.equal(parsed.searchParams.get('type'), 'signup');
  assert.equal(parsed.searchParams.get('redirect_to'), callback);

  const recovery = `${projectOrigin}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${encodeURIComponent('https://astorlibrary.com/account/reset/')}`;
  const emailChange = `${projectOrigin}/auth/v1/verify?token=${token}&type=email_change&redirect_to=${encodeURIComponent('https://astorlibrary.com/account/callback/?next=%2Faccount%2F')}`;
  assert.equal(confirmationTarget(`#confirmation_url=${recovery}`), recovery);
  assert.equal(confirmationTarget(`#confirmation_url=${emailChange}`), emailChange);
});

test('confirmation actions reject non-project, malformed and unsafe targets', () => {
  const unsafe = [
    '',
    `#other=${confirmationUrl}`,
    '#confirmation_url=javascript:alert(1)',
    `#confirmation_url=http://mxhptvdxouvfvfyhlhpy.supabase.co/auth/v1/verify?token=${token}&type=signup`,
    `#confirmation_url=https://mxhptvdxouvfvfyhlhpy.supabase.co.evil.example/auth/v1/verify?token=${token}&type=signup`,
    `#confirmation_url=https://mxhptvdxouvfvfyhlhpy.supabase.co@evil.example/auth/v1/verify?token=${token}&type=signup`,
    `#confirmation_url=${projectOrigin}/auth/v1/admin?token=${token}&type=signup`,
    `#confirmation_url=${projectOrigin}/auth/v1/verify?type=signup`,
    `#confirmation_url=${projectOrigin}/auth/v1/verify?token=${token}&type=unknown`,
    `#confirmation_url=${projectOrigin}/auth/v1/verify?token=${token}&type=signup&type=recovery`,
    `#confirmation_url=${projectOrigin}/auth/v1/verify?token=${token}&type=signup&redirect_to=${encodeURIComponent('https://evil.example/account/callback/')}`
  ];
  for (const hash of unsafe) assert.equal(confirmationTarget(hash), null, hash);
});

test('the confirmation URL is followed only after an explicit form submission', () => {
  let submitHandler = null;
  let submitOptions = null;
  let prevented = false;
  const button = {
    disabled: false,
    attributes: {},
    textContent: '',
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  const title = { textContent: '' };
  const form = {
    hidden: true,
    addEventListener(type, handler, options) {
      assert.equal(type, 'submit');
      submitHandler = handler;
      submitOptions = options;
    },
    querySelector(selector) {
      if (selector === '[data-confirmation-title]') return title;
      if (selector === 'button[type="submit"]') return button;
      assert.fail(`Unexpected selector: ${selector}`);
    }
  };
  const status = { hidden: true, dataset: {}, textContent: '', focus() {} };
  const fallback = { hidden: false, dataset: {}, textContent: '', focus() {} };
  const navigations = [];
  let legacySecretCleared = 0;

  const ready = bindConfirmationAction({
    hash: `#confirmation_url=${confirmationUrl}`,
    form,
    status,
    fallback,
    navigate: target => navigations.push(target),
    clearSecret: () => { legacySecretCleared += 1; }
  });

  assert.equal(ready, true);
  assert.equal(form.hidden, false);
  assert.equal(fallback.hidden, true);
  assert.equal(title.textContent, 'Confirm your email address.');
  assert.equal(button.textContent, 'Confirm email address');
  assert.deepEqual(navigations, [], 'loading or binding the page must not consume the link');
  assert.equal(legacySecretCleared, 1, 'the validated bearer value must be removed from browser history immediately');
  assert.equal(typeof submitHandler, 'function');
  assert.equal(submitOptions, undefined);

  submitHandler({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(button.disabled, true);
  assert.equal(button.attributes['aria-busy'], 'true');
  assert.deepEqual(navigations, [confirmationUrl]);
});

test('a token hash is verified only on submit and the secret is cleared before redirect', async () => {
  const tokenHash = 'c'.repeat(64);
  let submitHandler;
  let clearCount = 0;
  const navigations = [];
  const verified = [];
  const button = { disabled: false, textContent: '', setAttribute() {} };
  const form = {
    hidden: true,
    addEventListener(type, handler) {
      assert.equal(type, 'submit');
      submitHandler = handler;
    },
    querySelector(selector) {
      if (selector === '[data-confirmation-title]') return { textContent: '' };
      if (selector === 'button[type="submit"]') return button;
      assert.fail(`Unexpected selector: ${selector}`);
    }
  };
  const status = { hidden: true, dataset: {}, textContent: '', focus() {} };

  assert.equal(bindConfirmationAction({
    hash: `#token_hash=${tokenHash}&type=email`,
    form,
    status,
    navigate: (target, replace) => navigations.push([target, replace]),
    verifyToken: async payload => {
      verified.push(payload);
      return { authenticated: true, intermediate: false };
    },
    clearSecret: () => { clearCount += 1; }
  }), true);
  assert.equal(clearCount, 1);
  assert.deepEqual(verified, []);
  assert.deepEqual(navigations, []);

  await submitHandler({ preventDefault() {} });
  assert.deepEqual(verified, [{ tokenHash, type: 'email' }]);
  assert.equal(clearCount, 1);
  assert.deepEqual(navigations, [['/resources/', true]]);
});

test('the first secure-email-change confirmation reports success without staying busy', async () => {
  const tokenHash = 'e'.repeat(64);
  let submitHandler;
  const attributes = {};
  const button = {
    disabled: false,
    textContent: '',
    setAttribute(name, value) { attributes[name] = value; }
  };
  const form = {
    hidden: true,
    addEventListener(_type, handler) { submitHandler = handler; },
    querySelector(selector) {
      if (selector === '[data-confirmation-title]') return { textContent: '' };
      if (selector === 'button[type="submit"]') return button;
      assert.fail(`Unexpected selector: ${selector}`);
    }
  };
  const status = { hidden: true, dataset: {}, textContent: '', focus() {} };
  const navigations = [];
  bindConfirmationAction({
    hash: `#token_hash=${tokenHash}&type=email_change`,
    form,
    status,
    navigate: target => navigations.push(target),
    verifyToken: async () => ({ intermediate: true }),
    clearSecret() {}
  });
  await submitHandler({ preventDefault() {} });
  assert.match(status.textContent, /First confirmation accepted/);
  assert.equal(status.dataset.kind, 'success');
  assert.equal(attributes['aria-busy'], 'false');
  assert.deepEqual(navigations, []);
});

test('the action page uses a fragment and preserves the legacy PKCE callback', () => {
  const actionSource = fs.readFileSync(new URL('../assets/confirmation-action.mjs', import.meta.url), 'utf8');
  const actionPage = fs.readFileSync(new URL('../account/action/index.html', import.meta.url), 'utf8');
  const accountSource = fs.readFileSync(new URL('../assets/account.js', import.meta.url), 'utf8');
  const workerSource = fs.readFileSync(new URL('../worker/index.mjs', import.meta.url), 'utf8');

  assert.match(actionSource, /rawHash\.slice\(CONFIRMATION_PREFIX\.length\)/);
  assert.match(actionSource, /new URLSearchParams\(rawHash\.slice\(1\)\)/);
  assert.doesNotMatch(actionSource, /new URLSearchParams\(rawHash\.slice\(CONFIRMATION_PREFIX|new URLSearchParams\(window\.location\.hash/);
  assert.match(actionPage, /data-confirmation-action hidden/);
  assert.match(actionPage, /<noscript>/);
  assert.match(actionPage, /button[^>]+type="submit"/);
  assert.match(actionPage, /meta name="referrer" content="no-referrer"/);
  assert.match(accountSource, /params\.get\('code'\)/);
  assert.match(accountSource, /params\.get\('sb_flow_id'\)/);
  assert.match(workerSource, /appendPkceFlowIdToRedirects: true/);
  assert.match(workerSource, /exchangeCodeForSession\(code, flowId \? \{ flowId \} : undefined\)/);
  assert.match(workerSource, /verifyOtp\(\{ token_hash: tokenHash, type \}\)/);
  assert.match(accountSource, /First confirmation accepted\. Now open the confirmation message sent to the other email address\./);
});

test('separate outstanding PKCE links retain separate flow identifiers', () => {
  const firstFlow = 'a1_First-flow_2026';
  const secondFlow = 'b2_Second-flow_2026';
  assert.equal(normalisePkceFlowId(firstFlow), firstFlow);
  assert.equal(normalisePkceFlowId(secondFlow), secondFlow);
  assert.notEqual(normalisePkceFlowId(firstFlow), normalisePkceFlowId(secondFlow));
  for (const invalid of ['', 'short', 'contains spaces', '../flow', 'a'.repeat(65), 42]) {
    assert.equal(normalisePkceFlowId(invalid), false, String(invalid));
  }
  assert.equal(normalisePkceFlowId(undefined), null);
});

test('published action templates use token hashes and never direct confirmation URLs', () => {
  const templates = [
    ['confirm-signup.html', 'type=email', true],
    ['reset-password.html', 'type=recovery'],
    ['change-email.html', 'type=email_change']
  ];
  for (const [name, type, hasRedirect] of templates) {
    const source = fs.readFileSync(new URL(`../supabase/email-templates/${name}`, import.meta.url), 'utf8');
    assert.match(source, /#token_hash=\{\{ \.TokenHash \}\}/, name);
    assert.match(source, new RegExp(type), name);
    assert.doesNotMatch(source, /\.ConfirmationURL/, name);
    if (hasRedirect) assert.match(source, /urlquery \.RedirectTo/, name);
  }
});

test('the Worker validates token-hash actions before calling Supabase', async () => {
  const tokenHash = 'd'.repeat(64);
  assert.equal(normaliseEmailTokenHash(tokenHash), tokenHash);
  assert.equal(normaliseEmailTokenHash('short'), false);
  for (const type of ['email', 'recovery', 'email_change']) assert.equal(normaliseEmailTokenType(type), type);
  for (const type of ['signup', 'magiclink', '', null]) assert.equal(normaliseEmailTokenType(type), false);

  const response = await worker.fetch(new Request('https://astorlibrary.com/api/auth/verify-email', {
    method: 'POST',
    headers: { Origin: 'https://astorlibrary.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenHash: 'short', type: 'email' })
  }), {
    SUPABASE_URL: projectOrigin,
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    PUBLIC_SITE_URL: 'https://astorlibrary.com'
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /incomplete or invalid/i);
});
