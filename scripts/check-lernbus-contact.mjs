import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { bindContactForm, sendContactMessage } from '../src/lernbus/contact.js';

const endpoint = 'https://contact.example.test/f/lernbus';
const accepted = () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
const payload = {
  name: 'Example Parent', email: 'parent@example.test', phone: '+41 79 123 45 67',
  children_count: 2, children_ages_years: 'Child 1: 3; Child 2: 6.5',
  child_1_age_years: 3, child_2_age_years: 6.5,
  message: '', _gotcha: '', _subject: 'Lernbus: request a learning session', language: 'en'
};

class Element {
  constructor() {
    this.value = ''; this.readOnly = false; this.required = false; this.disabled = false;
    this.validationMessage = ''; this.listeners = {}; this.children = []; this.attributes = {};
  }
  setCustomValidity(message) { this.validationMessage = message; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatch(type) { for (const handler of this.listeners[type] || []) handler(); }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

function fixture(locale = 'en', action = endpoint) {
  const fields = Object.fromEntries(Object.entries({
    name: ' Example Parent ', email: ' parent@example.test ', phone: ' +41 79 123 45 67 ',
    children_count: '2', children_ages_years: '3; 6,5', message: '',
    _gotcha: '', _subject: locale === 'en' ? 'Lernbus: request a learning session' : 'Lernbus: Lernstunde anfragen', language: locale
  }).map(([name, value]) => [name, Object.assign(new Element(), { name, value })]));
  for (const name of ['name', 'email', 'phone', 'children_count', 'children_ages_years']) fields[name].required = true;
  const button = { textContent: locale === 'en' ? 'Request a learning session' : 'Lernstunde anfragen', disabled: false };
  const status = { textContent: '', dataset: {} };
  const attributes = {};
  const container = new Element();
  const fallback = { hidden: false };
  const fieldset = { hidden: true };
  const ageInputs = () => container.children.map(field => field.children[1]);
  const form = {
    action, dataset: { locale },
    ownerDocument: { createElement: () => new Element() },
    elements: { namedItem: name => fields[name] || ageInputs().find(input => input.name === name) },
    querySelector: selector => ({
      'button[type="submit"]': button, '[data-age-fields]': container,
      '[data-age-fallback]': fallback, '[data-child-ages]': fieldset
    })[selector],
    parentElement: { querySelector: () => status },
    reportValidity: () => [...Object.values(fields), ...ageInputs()].every(field => field.disabled || (
      !field.validationMessage && (!field.required || field.value.trim()) &&
      (field.type !== 'number' || (Number.isFinite(Number(field.value)) && Number(field.value) >= Number(field.min) && Number(field.value) <= Number(field.max)))
    )),
    setAttribute: (name, value) => { attributes[name] = value; },
    removeAttribute: name => { delete attributes[name]; },
    addEventListener: (name, handler) => { form[name] = handler; }
  };
  return { form, fields, button, status, attributes, ageInputs, container, fallback, fieldset };
}

const event = () => ({ preventDefault() { this.prevented = true; } });
const values = ui => [...['name', 'email', 'phone', 'children_count', 'message'].map(name => ui.fields[name].value), ...ui.ageInputs().map(field => field.value)];

test('JSON POST uses only the configured HTTPS action and strict Formspree acceptance', async () => {
  let call;
  assert.deepEqual(await sendContactMessage(endpoint, payload, {
    fetchImpl: async (url, options) => { call = { url, options }; return accepted(); }
  }), { ok: true });
  assert.equal(call.url, endpoint);
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers['Content-Type'], 'application/json');
  assert.equal(call.options.headers.Accept, 'application/json');
  assert.equal(call.options.redirect, 'error');
  assert.equal(call.options.credentials, 'omit');
  assert.deepEqual(JSON.parse(call.options.body), payload);
});

test('individual age fields preserve decimal ages and changes to the number of children', () => {
  const ui = fixture();
  bindContactForm(ui.form);
  assert.equal(ui.fallback.hidden, true);
  assert.equal(ui.fields.children_ages_years.disabled, true);
  assert.equal(ui.fieldset.hidden, false);
  assert.deepEqual(ui.ageInputs().map(input => input.value), ['3', '6,5']);
  assert.ok(ui.ageInputs().every(input => input.required && input.type === 'text' && input.inputMode === 'decimal' && input.maxLength === 8));
  assert.deepEqual(ui.container.children.map(field => field.children[0].textContent), ['Child 1', 'Child 2']);
  ui.ageInputs()[1].value = '7.5';
  ui.fields.children_count.value = '1'; ui.fields.children_count.dispatch('input');
  assert.equal(ui.ageInputs().length, 1);
  ui.fields.children_count.value = '3'; ui.fields.children_count.dispatch('input');
  assert.deepEqual(ui.ageInputs().map(input => input.value), ['3', '7.5', '']);
});

test('HTTP rejection preserves all parent and child inputs and allows an explicit retry', async () => {
  const ui = fixture();
  let attempts = 0;
  const submit = bindContactForm(ui.form, { fetchImpl: async () => ++attempts === 1 ? { ok: false, status: 422 } : accepted() });
  const original = values(ui);
  await submit(event());
  assert.deepEqual(values(ui), original);
  assert.equal(ui.status.dataset.state, 'error');
  assert.match(ui.status.textContent, /Everything you entered is still in the form/);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.attributes['aria-busy'], undefined);
  assert.ok(ui.ageInputs().every(input => !input.readOnly));
  await submit(event());
  assert.equal(attempts, 2);
  assert.equal(ui.status.dataset.state, 'success');
  assert.deepEqual(values(ui), ['', '', '', '1', '', '']);
});

test('HTTP 200 without strict ok:true never shows success or clears input', async () => {
  for (const body of [{ ok: false }, { ok: 'true' }, { next: '/activate', message: 'Activate the form' }, null]) {
    const ui = fixture();
    const submit = bindContactForm(ui.form, { fetchImpl: async () => ({ ok: true, status: 200, json: async () => body }) });
    const original = values(ui);
    await submit(event());
    assert.equal(ui.status.dataset.state, 'error');
    assert.deepEqual(values(ui), original);
    assert.doesNotMatch(ui.status.textContent, /Activate/);
  }
});

test('HTTP errors cannot masquerade as successful acceptance', async () => {
  await assert.rejects(sendContactMessage(endpoint, payload, {
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ ok: true }) })
  }), error => error.code === 'error');
});

test('network and malformed-response errors preserve input and show usable guidance', async () => {
  for (const fetchImpl of [
    async () => { throw new TypeError('network offline'); },
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('not JSON'); } })
  ]) {
    const ui = fixture();
    const submit = bindContactForm(ui.form, { fetchImpl });
    const original = values(ui);
    await submit(event());
    assert.deepEqual(values(ui), original);
    assert.equal(ui.status.dataset.state, 'error');
    assert.match(ui.status.textContent, /info@lernbus.ch/);
    assert.equal(ui.button.disabled, false);
  }
});

test('pending guard prevents duplicate requests; optional message can be blank', async () => {
  const ui = fixture();
  let release, sent;
  let calls = 0;
  const submit = bindContactForm(ui.form, {
    fetchImpl: async (_url, options) => {
      calls++; sent = JSON.parse(options.body);
      return new Promise(resolve => { release = resolve; });
    }
  });
  const first = submit(event());
  const duplicate = event(); await submit(duplicate);
  assert.equal(duplicate.prevented, true);
  assert.equal(calls, 1);
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.attributes['aria-busy'], 'true');
  assert.equal(ui.status.dataset.state, 'pending');
  assert.ok(ui.ageInputs().every(input => input.readOnly));
  assert.ok(['name', 'email', 'phone', 'children_count', 'message'].every(name => ui.fields[name].readOnly));
  assert.deepEqual(sent, payload);
  release(accepted()); await first;
  assert.deepEqual(values(ui), ['', '', '', '1', '', '']);
  assert.equal(ui.fields.language.value, 'en');
  assert.equal(ui.status.dataset.state, 'success');
  assert.match(ui.status.textContent, /enquiry has been submitted/);
  assert.match(ui.status.textContent, /does not yet confirm a booking/);
  assert.doesNotMatch(ui.status.textContent, /delivered|inbox/i);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, 'Request a learning session');
});

test('timeout aborts without automatic resend or discarding inputs', async () => {
  const ui = fixture(); let signal; let calls = 0;
  const submit = bindContactForm(ui.form, {
    timeoutMs: 5,
    fetchImpl: (_url, options) => { calls++; signal = options.signal; return new Promise(() => {}); }
  });
  const original = values(ui);
  await submit(event());
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
  assert.deepEqual(values(ui), original);
  assert.equal(ui.status.dataset.state, 'error');
  assert.match(ui.status.textContent, /cannot yet confirm/);
  assert.equal(ui.button.disabled, false);
});

test('rate limiting retains data and gives localized retry guidance', async () => {
  const ui = fixture('de');
  const submit = bindContactForm(ui.form, { fetchImpl: async () => ({ ok: false, status: 429 }) });
  const original = values(ui);
  await submit(event());
  assert.deepEqual(values(ui), original);
  assert.match(ui.status.textContent, /einige Minuten/);
  assert.equal(ui.button.textContent, 'Lernstunde anfragen');
});

test('German requests carry unambiguous child ages and German metadata', async () => {
  const ui = fixture('de'); let sent;
  await bindContactForm(ui.form, {
    fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return accepted(); }
  })(event());
  assert.equal(sent.language, 'de');
  assert.equal(sent._subject, 'Lernbus: Lernstunde anfragen');
  assert.equal(sent.children_count, 2);
  assert.equal(sent.children_ages_years, 'Kind 1: 3; Kind 2: 6.5');
  assert.match(ui.status.textContent, /zur Übermittlung angenommen/);
});

test('decimal comma remains editable and is sent as the intended fractional age', async () => {
  const ui = fixture('de'); let sent;
  const submit = bindContactForm(ui.form, {
    fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return { ok: false, status: 422 }; }
  });
  ui.ageInputs()[0].value = '3,5';
  ui.ageInputs()[1].value = '6.25';
  await submit(event());
  assert.equal(sent.child_1_age_years, 3.5);
  assert.equal(sent.child_2_age_years, 6.25);
  assert.equal(sent.children_ages_years, 'Kind 1: 3.5; Kind 2: 6.25');
  assert.deepEqual(ui.ageInputs().map(input => input.value), ['3,5', '6.25']);
  ui.fields.children_count.value = '3'; ui.fields.children_count.dispatch('input');
  assert.equal(ui.ageInputs()[0].value, '3,5');
});

test('invalid browser validation and endpoint configuration prevent all requests', async () => {
  let calls = 0;
  const options = { fetchImpl: async () => { calls++; return accepted(); } };
  const invalid = fixture(); invalid.form.reportValidity = () => false;
  await bindContactForm(invalid.form, options)(event());
  for (const action of ['http://contact.example.test/', 'mailto:info@lernbus.ch', 'https://user:password@contact.example.test/']) {
    const ui = fixture('en', action);
    await bindContactForm(ui.form, options)(event());
    assert.equal(ui.button.disabled, true);
    assert.equal(ui.status.dataset.state, 'error');
  }
  assert.equal(calls, 0);
});

test('required parent details, whole child count, and every age are validated', async () => {
  for (const [name, invalid] of [['name', '   '], ['phone', '   '], ['phone', 'abc123'], ['children_count', '0'], ['children_count', '11'], ['children_count', '1.5'], ['child_2_age_years', ''], ['child_2_age_years', '-1'], ['child_2_age_years', '19'], ['child_2_age_years', '18,1'], ['child_2_age_years', '3,5.0'], ['child_2_age_years', '3,5,0']]) {
    const ui = fixture(); let calls = 0;
    const submit = bindContactForm(ui.form, { fetchImpl: async () => { calls++; return accepted(); } });
    const input = ui.form.elements.namedItem(name);
    input.value = invalid;
    await submit(event());
    assert.equal(calls, 0, `${name}: ${invalid}`);
    assert.notEqual(input.validationMessage, '');
    assert.equal(ui.button.disabled, false);
    input.value = name === 'name' ? 'Example Parent' : name === 'phone' ? '+41 79 123 45 67' : name === 'children_count' ? '2' : '6.5';
    input.dispatch('input');
    assert.equal(input.validationMessage, '');
    await submit(event());
    assert.equal(calls, 1, `${name}: corrected submission`);
  }
});

test('restored child count cannot submit an incomplete age list without an input event', async () => {
  const ui = fixture(); let calls = 0;
  const submit = bindContactForm(ui.form, { fetchImpl: async () => { calls++; return accepted(); } });
  ui.fields.children_count.value = '3';
  await submit(event());
  assert.equal(calls, 0);
  assert.equal(ui.ageInputs().length, 3);
  ui.ageInputs()[2].value = '4.25';
  await submit(event());
  assert.equal(calls, 1);
});

test('restored lower count removes obsolete required ages before validation', async () => {
  const ui = fixture(); let sent;
  assert.notEqual(ui.form.noValidate, true);
  const submit = bindContactForm(ui.form, {
    fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return { ok: false, status: 422 }; }
  });
  // With automatic native validation, this stale blank field would prevent
  // the submit event itself from reaching the synchronization handler.
  assert.equal(ui.form.noValidate, true);
  ui.ageInputs()[1].value = '';
  ui.fields.children_count.value = '1';
  assert.equal(ui.form.reportValidity(), false);
  await submit(event());
  assert.equal(ui.ageInputs().length, 1);
  assert.equal(sent.children_count, 1);
  assert.equal(sent.children_ages_years, 'Child 1: 3');
  assert.equal(sent.child_2_age_years, undefined);
  assert.equal(ui.ageInputs()[0].value, '3');
});

test('restored higher count validates remembered ages before sending', async () => {
  for (const invalid of ['19', '3,5.0']) {
    const ui = fixture(); let calls = 0; let sent;
    const submit = bindContactForm(ui.form, {
      fetchImpl: async (_url, options) => { calls++; sent = JSON.parse(options.body); return accepted(); }
    });
    ui.fields.children_count.value = '3'; ui.fields.children_count.dispatch('input');
    ui.ageInputs()[2].value = invalid;
    ui.fields.children_count.value = '2'; ui.fields.children_count.dispatch('input');
    ui.fields.children_count.value = '3'; // Browser restore/autofill without input.
    await submit(event());
    assert.equal(calls, 0, `remembered invalid age: ${invalid}`);
    assert.equal(ui.ageInputs()[2].value, invalid);
    assert.notEqual(ui.ageInputs()[2].validationMessage, '');
    ui.ageInputs()[2].value = '3,5'; ui.ageInputs()[2].dispatch('input');
    await submit(event());
    assert.equal(calls, 1);
    assert.equal(sent.children_count, 3);
    assert.equal(sent.child_3_age_years, 3.5);
  }
});

test('native fallback requires count and all ages, message stays optional, privacy and status remain accessible', async () => {
  const html = await readFile(new URL('../src/_includes/lernbus-contact.njk', import.meta.url), 'utf8');
  assert.match(html, /action="\{\{ lernbusContact\.endpoint \| escape \}\}" method="post" data-direct-contact/);
  for (const name of ['name', 'email', 'phone', 'children_count', 'children_ages_years']) {
    assert.match(html, new RegExp(`<input[^>]*name="${name}"[^>]*required`));
  }
  assert.match(html, /name="children_count"[^>]*min="1" max="10" step="1"/);
  assert.match(html, /name="children_ages_years"[^>]*aria-describedby="contact-ages-help"/);
  assert.match(html, /one age for every child/);
  assert.doesNotMatch(html.match(/<textarea[^>]*name="message"[^>]*>/)?.[0] || '', /required/);
  assert.match(html, /id="kontakt"/); assert.match(html, /id="gespraech"/);
  assert.match(html, /data-contact-status role="status" aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(html, /action="mailto:|type="submit"[^>]*disabled|type="date"|name="child_name"/);
  assert.doesNotMatch(html, /\bnovalidate\b/i);
});

test('recipient-specific fallback and duplicate mounting retain one handler', async () => {
  const ui = fixture(); ui.form.dataset.contactEmail = 'alternate@example.test';
  let calls = 0;
  const first = bindContactForm(ui.form, { fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } });
  const second = bindContactForm(ui.form, { fetchImpl: async () => { throw new Error('duplicate binding'); } });
  assert.equal(first, second);
  await ui.form.submit(event());
  assert.equal(calls, 1);
  assert.match(ui.status.textContent, /alternate@example\.test/);
  assert.doesNotMatch(ui.status.textContent, /info@lernbus\.ch/);
});
