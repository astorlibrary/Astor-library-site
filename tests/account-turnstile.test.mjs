import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const accountSource = fs.readFileSync(new URL('../assets/account.js', import.meta.url), 'utf8');

async function flushUntil(predicate, message) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail(message);
}

test('mobile auth waits for the Turnstile success callback and refreshes stale challenges', async () => {
  let submitHandler = null;
  let renderOptions = null;
  let prevented = false;
  let nextTimer = 0;
  const timers = [];
  const resets = [];
  const requests = [];

  const button = {
    attributes: {},
    dataset: {},
    disabled: false,
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = String(value); }
  };
  const status = {
    dataset: {},
    hidden: true,
    textContent: '',
    focusCount: 0,
    focus() { this.focusCount += 1; }
  };
  const container = {
    dataset: { turnstileAction: 'recover' },
    hidden: false,
    getBoundingClientRect() { return { width: 284 }; }
  };
  const form = {
    elements: { email: { value: 'reader@example.com' } },
    addEventListener(type, handler) {
      assert.equal(type, 'submit');
      submitHandler = handler;
    },
    querySelector(selector) {
      if (selector === '[data-turnstile-action]') return container;
      if (selector === '[data-form-status]') return status;
      if (selector === 'button[type="submit"]') return button;
      assert.fail(`Unexpected form selector: ${selector}`);
    }
  };
  const turnstile = {
    getResponse() { return ''; },
    render(renderContainer, options) {
      assert.equal(renderContainer, container);
      renderOptions = options;
      return 'mobile-widget';
    },
    reset(widget) { resets.push(widget); }
  };
  const auth = {
    async configuration() {
      return { turnstileRequired: true, turnstileSiteKey: 'test-site-key' };
    },
    async request(action, body) {
      requests.push({ action, body });
      return { message: 'If an account exists, a reset email has been sent.' };
    }
  };
  const window = {
    AstorAuth: auth,
    clearTimeout(id) {
      const timer = timers.find(item => item.id === id);
      if (timer) timer.cleared = true;
    },
    setTimeout(callback, delay) {
      const timer = { callback, cleared: false, delay, id: ++nextTimer };
      timers.push(timer);
      return timer.id;
    },
    turnstile
  };
  const document = {
    querySelector(selector) {
      if (selector === '[data-recovery-form]') return form;
      if (['[data-account-shell]', '[data-auth-callback]', '[data-reset-form]'].includes(selector)) return null;
      assert.fail(`Unexpected document selector: ${selector}`);
    }
  };
  window.document = document;
  window.window = window;

  vm.runInContext(accountSource, vm.createContext({
    document,
    URL,
    URLSearchParams,
    WeakMap,
    window
  }));

  await flushUntil(() => renderOptions !== null, 'Turnstile was not rendered');
  assert.equal(renderOptions.action, 'recover');
  assert.equal(renderOptions.size, 'compact', 'a sub-300px mobile form must use the compact widget');
  assert.equal(typeof renderOptions.callback, 'function');
  assert.equal(typeof submitHandler, 'function');

  const submission = submitHandler({ preventDefault() { prevented = true; } });
  await flushUntil(() => status.textContent.includes('continue automatically'), 'submission did not wait for Turnstile');
  assert.equal(prevented, true);
  assert.equal(button.disabled, true);
  assert.equal(button.attributes['aria-busy'], 'true');
  assert.deepEqual(requests, [], 'credentials must not be sent before the challenge succeeds');

  renderOptions['error-callback']();
  assert.match(status.textContent, /retry automatically/i);
  assert.deepEqual(requests, [], 'an automatic Turnstile retry must keep the submission pending');

  renderOptions['expired-callback']();
  renderOptions['timeout-callback']();
  for (const timer of timers.filter(item => item.delay === 0 && !item.cleared)) timer.callback();
  assert.deepEqual(resets, ['mobile-widget', 'mobile-widget']);
  assert.deepEqual(requests, []);

  renderOptions.callback('callback-token-from-mobile-safari');
  await submission;

  assert.equal(requests.length, 1);
  assert.equal(requests[0].action, 'recover');
  assert.equal(requests[0].body.email, 'reader@example.com');
  assert.equal(requests[0].body.turnstileToken, 'callback-token-from-mobile-safari');
  assert.deepEqual(resets, ['mobile-widget', 'mobile-widget', 'mobile-widget']);
  assert.equal(button.disabled, false);
  assert.equal(button.attributes['aria-busy'], 'false');
  assert.equal(status.dataset.kind, 'success');
  assert.match(status.textContent, /reset email/i);
});
