const messages = {
  de: {
    nameRequired: 'Bitte geben Sie Ihren Namen ein.',
    phoneRequired: 'Bitte geben Sie eine Telefonnummer mit mindestens sechs Ziffern ein.',
    countRequired: 'Bitte geben Sie die Anzahl Kinder an (1 bis 10).',
    ageRequired: 'Bitte geben Sie das Alter jedes Kindes in Jahren an (0 bis 18).',
    child: 'Kind',
    sending: 'Anfrage wird gesendet …',
    success: 'Vielen Dank. Ihre Anfrage wurde zur Übermittlung angenommen. Wir melden uns innert weniger Tage. Eine Buchung ist damit noch nicht bestätigt.',
    error: 'Ihre Nachricht konnte nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut oder schreiben Sie an info@lernbus.ch.',
    timeout: 'Die Übermittlung konnte noch nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es später erneut oder schreiben Sie an info@lernbus.ch.',
    rate: 'Es wurden zu viele Nachrichten in kurzer Zeit angefragt. Bitte warten Sie einige Minuten und versuchen Sie es erneut. Ihre Eingaben bleiben erhalten.',
    unavailable: 'Das Formular ist momentan nicht verfügbar. Bitte schreiben Sie an info@lernbus.ch.'
  },
  en: {
    nameRequired: 'Please enter your name.',
    phoneRequired: 'Please enter a phone number with at least six digits.',
    countRequired: 'Please enter the number of children (1 to 10).',
    ageRequired: 'Please enter every child’s age in years (0 to 18).',
    child: 'Child',
    sending: 'Sending enquiry …',
    success: 'Thank you. Your enquiry has been submitted. We will get back to you within a few days. This does not yet confirm a booking.',
    error: 'We could not confirm that your message was sent. Everything you entered is still in the form. Please try again or email info@lernbus.ch.',
    timeout: 'Sending is taking longer than expected, and we cannot yet confirm that your message was sent. Everything you entered is still in the form. Please try again later or email info@lernbus.ch.',
    rate: 'Too many messages have been submitted in a short time. Please wait a few minutes and try again. Everything you entered is still in the form.',
    unavailable: 'The form is temporarily unavailable. Please email info@lernbus.ch.'
  }
};

export class ContactError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ContactError';
    this.code = code;
  }
}

function contactEndpoint(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    return url.href;
  } catch {
    throw new ContactError('unavailable');
  }
}

// The configured form action is the only destination; redirects are rejected.
// HTTP success alone is insufficient: the service must confirm acceptance.
export async function sendContactMessage(endpoint, payload, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000
} = {}) {
  const destination = contactEndpoint(endpoint);
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new ContactError('timeout'));
      controller.abort();
    }, timeoutMs);
  });
  const request = async () => {
    const response = await fetchImpl(destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      // Formspree uses the page origin for its domain-based spam checks.
      referrerPolicy: 'strict-origin-when-cross-origin'
    });
    if (!response.ok) throw new ContactError(response.status === 429 ? 'rate' : 'error');
    const result = await response.json();
    if (result?.ok !== true) throw new ContactError('error');
    return result;
  };
  try {
    return await Promise.race([request(), timeout]);
  } catch (error) {
    throw error instanceof ContactError ? error : new ContactError('error');
  } finally {
    clearTimeout(timer);
  }
}

const contactBinding = Symbol.for('lernbus.contact.binding');

const validCount = value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10;
const normalizedAge = value => value.trim().replace(',', '.');
const validAge = value => {
  const normalized = normalizedAge(value);
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized) && Number(normalized) >= 0 && Number(normalized) <= 18;
};

// A required text field remains usable without JavaScript. Enhance it only after
// the individually labelled controls have been created successfully.
function createAgeFields(form, copy) {
  const count = form.elements.namedItem('children_count');
  const fallback = form.elements.namedItem('children_ages_years');
  const fallbackWrap = form.querySelector('[data-age-fallback]');
  const fieldset = form.querySelector('[data-child-ages]');
  const container = form.querySelector('[data-age-fields]');
  const doc = form.ownerDocument;
  const remembered = fallback.value.split(/[;\n]/).map(value => value.trim());
  let controls = [];
  const sync = () => {
    controls.forEach((input, index) => { remembered[index] = input.value; });
    if (!validCount(count.value.trim())) return;
    const next = [];
    const fields = [];
    for (let index = 0; index < Number(count.value); index++) {
      const field = doc.createElement('div');
      field.className = 'field';
      const label = doc.createElement('label');
      const input = doc.createElement('input');
      input.id = `f-child-age-${index + 1}`;
      input.name = `child_${index + 1}_age_years`;
      // Number inputs can silently drop a typed decimal comma in Chromium.
      // Keep the parent's text intact and normalize only for validation/sending.
      input.type = 'text';
      input.inputMode = 'decimal';
      input.maxLength = 8;
      input.required = true;
      input.value = remembered[index] || '';
      input.setAttribute('aria-describedby', 'contact-age-unit');
      input.addEventListener('input', () => input.setCustomValidity(''));
      label.htmlFor = input.id;
      label.textContent = `${copy.child} ${index + 1}`;
      field.append(label, input);
      fields.push(field);
      next.push(input);
    }
    container.replaceChildren(...fields);
    controls = next;
    fallback.required = false;
    fallback.disabled = true;
    fallbackWrap.hidden = true;
    fieldset.hidden = false;
  };
  sync();
  return {
    sync,
    get inputs() { return controls; },
    clear() {
      remembered.length = 0;
      controls = [];
      fallback.value = '';
      count.value = '1';
      sync();
    }
  };
}

export function bindContactForm(form, options = {}) {
  if (form[contactBinding]) return form[contactBinding];
  const locale = form.dataset.locale === 'en' ? 'en' : 'de';
  const recipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.dataset.contactEmail || '') ? form.dataset.contactEmail : 'info@lernbus.ch';
  const copy = Object.fromEntries(Object.entries(messages[locale]).map(([key, value]) => [key, value.replaceAll('info@lernbus.ch', recipient)]));
  const button = form.querySelector('button[type="submit"]');
  const status = form.parentElement.querySelector('[data-contact-status]');
  const field = name => form.elements.namedItem(name);
  const baseInputs = ['name', 'email', 'phone', 'children_count', 'message'].map(field);
  baseInputs.forEach(input => {
    input.addEventListener('input', () => input.setCustomValidity(''));
  });
  const ages = createAgeFields(form, copy);
  const readyLabel = button.textContent;
  let pending = false;
  let endpoint;
  field('children_count').addEventListener('input', () => {
    if (!pending) ages.sync();
  });

  const announce = (state, text) => {
    status.dataset.state = state;
    status.textContent = text;
  };
  try {
    endpoint = contactEndpoint(form.action);
    button.disabled = false;
  } catch {
    button.disabled = true;
    announce('error', copy.unavailable);
  }

  const submit = async event => {
    event.preventDefault();
    if (pending || !endpoint) return;
    const value = name => field(name)?.value.trim() || '';
    field('name').setCustomValidity(value('name') ? '' : copy.nameRequired);
    field('phone').setCustomValidity(value('phone').replace(/\D/g, '').length >= 6 ? '' : copy.phoneRequired);
    field('children_count').setCustomValidity(validCount(value('children_count')) ? '' : copy.countRequired);
    // Restore/autofill can change the count without an input event. Reconcile
    // first, so only the active children are required and every new age is checked.
    if (validCount(value('children_count')) && ages.inputs.length !== Number(value('children_count'))) ages.sync();
    ages.inputs.forEach(input => {
      input.setCustomValidity(validAge(input.value.trim()) ? '' : copy.ageRequired);
    });
    if (!form.reportValidity()) return;
    const payload = {
      name: value('name'),
      email: value('email'),
      phone: value('phone'),
      children_count: Number(value('children_count')),
      children_ages_years: ages.inputs.map((input, index) => `${copy.child} ${index + 1}: ${Number(normalizedAge(input.value))}`).join('; '),
      ...Object.fromEntries(ages.inputs.map((input, index) => [`child_${index + 1}_age_years`, Number(normalizedAge(input.value))])),
      message: value('message'),
      _gotcha: value('_gotcha'),
      _subject: locale === 'en' ? 'Lernbus: request a learning session' : 'Lernbus: Lernstunde anfragen',
      language: locale
    };
    const inputs = [...baseInputs, ...ages.inputs];
    const previousReadOnly = inputs.map(input => input.readOnly);
    pending = true;
    button.disabled = true;
    button.textContent = copy.sending;
    form.setAttribute('aria-busy', 'true');
    inputs.forEach(input => { input.readOnly = true; });
    announce('pending', copy.sending);
    try {
      await sendContactMessage(endpoint, payload, options);
      inputs.forEach(input => { input.value = ''; });
      ages.clear();
      announce('success', copy.success);
    } catch (error) {
      announce('error', copy[error.code] || copy.error);
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = readyLabel;
      form.removeAttribute('aria-busy');
      inputs.forEach((input, index) => { input.readOnly = previousReadOnly[index]; });
    }
  };
  form[contactBinding] = submit;
  form.addEventListener('submit', submit);
  // Let the handler reconcile age fields before native validation. The required
  // no-JavaScript fallback still uses the browser's normal submit validation.
  form.noValidate = true;
  return submit;
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-direct-contact]').forEach(form => bindContactForm(form));
}
