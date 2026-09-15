import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { bindContactForm, sendContactMessage } from '../src/lernbus/contact.js';

const endpoint = 'https://contact.example.test/f/lernbus';
const accepted = () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
const payload = {
  name: 'Example Parent', email: 'parent@example.test', message: 'A test question.',
  _gotcha: '', _subject: 'Lernbus enquiry', language: 'en'
};

function fixture(locale = 'en', action = endpoint) {
  const fields = Object.fromEntries(Object.entries({
    name: ' Example Parent ', email: ' parent@example.test ', message: ' A test question. ',
    _gotcha: '', _subject: locale === 'en' ? 'Lernbus enquiry' : 'Kontakt Lernbus', language: locale
  }).map(([name, value]) => [name, {
    value, readOnly: false, validationMessage: '',
    setCustomValidity(message) { this.validationMessage = message; },
    addEventListener(type, handler) { this[type] = handler; }
  }]));
  const button = { textContent: locale === 'en' ? 'Send message' : 'Nachricht senden', disabled: false };
  const status = { textContent: '', dataset: {} };
  const attributes = {};
  const form = {
    action, dataset: { locale }, elements: { namedItem: name => fields[name] },
    querySelector: () => button,
    parentElement: { querySelector: () => status },
    reportValidity: () => Object.values(fields).every(field => !field.validationMessage),
    setAttribute: (name, value) => { attributes[name] = value; },
    removeAttribute: name => { delete attributes[name]; },
    addEventListener: (name, handler) => { form[name] = handler; }
  };
  return { form, fields, button, status, attributes };
}

const event = () => ({ preventDefault() { this.prevented = true; } });
const values = fields => ['name', 'email', 'message'].map(name => fields[name].value);

test('JSON POST uses the configured HTTPS action and the Formspree acceptance contract', async () => {
  let call;
  const result = await sendContactMessage(endpoint, payload, {
    fetchImpl: async (url, options) => { call = { url, options }; return accepted(); }
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(call.url, endpoint);
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers['Content-Type'], 'application/json');
  assert.equal(call.options.headers.Accept, 'application/json');
  assert.equal(call.options.redirect, 'error');
  assert.equal(call.options.credentials, 'omit');
  assert.deepEqual(JSON.parse(call.options.body), payload);
});

test('HTTP rejection preserves inputs and re-enables the form for retry', async () => {
  const ui = fixture();
  const original = values(ui.fields);
  let attempts = 0;
  const submit = bindContactForm(ui.form, {
    fetchImpl: async () => ++attempts === 1 ? { ok: false, status: 422 } : accepted()
  });
  await submit(event());
  assert.deepEqual(values(ui.fields), original);
  assert.equal(ui.status.dataset.state, 'error');
  assert.match(ui.status.textContent, /Everything you entered is still in the form/);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.attributes['aria-busy'], undefined);
  assert.ok(['name', 'email', 'message'].every(name => !ui.fields[name].readOnly));
  await submit(event());
  assert.equal(attempts, 2);
  assert.equal(ui.status.dataset.state, 'success');
  assert.deepEqual(values(ui.fields), ['', '', '']);
});

test('HTTP 200 without strict ok:true never shows success or clears input', async () => {
  for (const body of [{ ok: false }, { ok: 'true' }, { next: '/activate', message: 'Activate the form' }, null]) {
    const ui = fixture();
    const original = values(ui.fields);
    await bindContactForm(ui.form, {
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => body })
    })(event());
    assert.equal(ui.status.dataset.state, 'error');
    assert.deepEqual(values(ui.fields), original);
    assert.doesNotMatch(ui.status.textContent, /Activate/);
  }
});

test('HTTP errors cannot masquerade as successful acceptance', async () => {
  await assert.rejects(sendContactMessage(endpoint, payload, {
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ ok: true }) })
  }), error => error.code === 'error');
});

test('network and malformed-response errors preserve input and show a usable error', async () => {
  for (const fetchImpl of [
    async () => { throw new TypeError('network offline'); },
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('not JSON'); } })
  ]) {
    const ui = fixture();
    const original = values(ui.fields);
    await bindContactForm(ui.form, { fetchImpl })(event());
    assert.deepEqual(values(ui.fields), original);
    assert.equal(ui.status.dataset.state, 'error');
    assert.match(ui.status.textContent, /info@lernbus.ch/);
    assert.equal(ui.button.disabled, false);
  }
});

test('a pending request gates duplicate submissions and clears only editable message fields on acceptance', async () => {
  const ui = fixture();
  let release;
  let calls = 0;
  let sent;
  const submit = bindContactForm(ui.form, {
    fetchImpl: async (_url, options) => {
      calls++;
      sent = JSON.parse(options.body);
      return new Promise(resolve => { release = resolve; });
    }
  });
  const first = submit(event());
  const duplicate = event();
  await submit(duplicate);
  assert.equal(duplicate.prevented, true);
  assert.equal(calls, 1);
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.attributes['aria-busy'], 'true');
  assert.equal(ui.status.dataset.state, 'pending');
  assert.ok(['name', 'email', 'message'].every(name => ui.fields[name].readOnly));
  assert.deepEqual(sent, payload);
  release(accepted());
  await first;
  assert.deepEqual(values(ui.fields), ['', '', '']);
  assert.equal(ui.fields.language.value, 'en');
  assert.equal(ui.fields._subject.value, 'Lernbus enquiry');
  assert.equal(ui.status.dataset.state, 'success');
  assert.match(ui.status.textContent, /message has been submitted/);
  assert.doesNotMatch(ui.status.textContent, /delivered|inbox/i);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, 'Send message');
});

test('timeout aborts the request, preserves input and does not claim acceptance', async () => {
  const ui = fixture();
  const original = values(ui.fields);
  let signal;
  await bindContactForm(ui.form, {
    timeoutMs: 5,
    fetchImpl: (_url, options) => { signal = options.signal; return new Promise(() => {}); }
  })(event());
  assert.equal(signal.aborted, true);
  assert.deepEqual(values(ui.fields), original);
  assert.equal(ui.status.dataset.state, 'error');
  assert.match(ui.status.textContent, /cannot yet confirm/);
  assert.equal(ui.button.disabled, false);
});

test('rate limiting gets retry guidance without clearing the message', async () => {
  const ui = fixture('de');
  const original = values(ui.fields);
  await bindContactForm(ui.form, { fetchImpl: async () => ({ ok: false, status: 429 }) })(event());
  assert.deepEqual(values(ui.fields), original);
  assert.match(ui.status.textContent, /einige Minuten/);
  assert.equal(ui.button.textContent, 'Nachricht senden');
});

test('German requests carry German metadata and confirmation', async () => {
  const ui = fixture('de');
  let sent;
  await bindContactForm(ui.form, {
    fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return accepted(); }
  })(event());
  assert.equal(sent.language, 'de');
  assert.equal(sent._subject, 'Kontakt Lernbus');
  assert.match(ui.status.textContent, /zur Übermittlung angenommen/);
});

test('browser validation and invalid endpoint configuration prevent any request', async () => {
  let calls = 0;
  const options = { fetchImpl: async () => { calls++; return accepted(); } };
  const invalidForm = fixture();
  invalidForm.form.reportValidity = () => false;
  await bindContactForm(invalidForm.form, options)(event());
  for (const action of ['http://contact.example.test/', 'mailto:info@lernbus.ch', 'https://user:password@contact.example.test/']) {
    const ui = fixture('en', action);
    await bindContactForm(ui.form, options)(event());
    assert.equal(ui.button.disabled, true);
    assert.equal(ui.status.dataset.state, 'error');
  }
  assert.equal(calls, 0);
});

test('whitespace-only required text cannot send and editing restores normal submission', async () => {
  for (const locale of ['de', 'en']) {
    for (const name of ['name', 'message']) {
      const ui = fixture(locale);
      ui.fields[name].value = '   ';
      const original = values(ui.fields);
      let calls = 0;
      const submit = bindContactForm(ui.form, {
        fetchImpl: async () => { calls++; return accepted(); }
      });
      await submit(event());
      assert.equal(calls, 0);
      assert.notEqual(ui.fields[name].validationMessage, '');
      assert.deepEqual(values(ui.fields), original);
      assert.equal(ui.button.disabled, false);
      assert.equal(ui.attributes['aria-busy'], undefined);
      ui.fields[name].value = name === 'name' ? 'Example Parent' : 'A test question.';
      ui.fields[name].input();
      assert.equal(ui.fields[name].validationMessage, '');
      await submit(event());
      assert.equal(calls, 1);
      assert.equal(ui.status.dataset.state, 'success');
    }
  }
});

test('both templates retain a native HTTPS POST shape, Formspree fields and an accessible status area', async () => {
  for (const route of ['index.html', 'en/index.html']) {
    const html = await readFile(new URL(`../src/lernbus/${route}`, import.meta.url), 'utf8');
    assert.match(html, /action="\{\{ lernbusContact\.endpoint \}\}" method="post" data-direct-contact/);
    for (const name of ['name', 'email', 'message', '_gotcha', '_subject', 'language']) {
      assert.match(html, new RegExp(`name="${name}"`));
    }
    assert.match(html, /data-contact-status role="status" aria-live="polite" aria-atomic="true"/);
    assert.match(html, /contact\.js\?v=\{\{ lernbusAssets\.contact \}\}/);
    assert.doesNotMatch(html, /action="mailto:|location\.href='mailto:/);
    assert.doesNotMatch(html, /type="submit"[^>]*disabled/);
  }
});


test('contact fallback follows the configured recipient and duplicate mounting sends once', async () => {
  const ui = fixture();
  ui.form.dataset.contactEmail = 'jonashertner@lernbus.ch';
  let calls = 0;
  const first = bindContactForm(ui.form, { fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } });
  const second = bindContactForm(ui.form, { fetchImpl: async () => { throw new Error('duplicate binding'); } });
  assert.equal(first, second);
  await ui.form.submit(event());
  assert.equal(calls, 1);
  assert.match(ui.status.textContent, /jonashertner@lernbus\.ch/);
  assert.doesNotMatch(ui.status.textContent, /info@lernbus\.ch/);
  assert.equal(ui.fields.message.value, ' A test question. ');
});
