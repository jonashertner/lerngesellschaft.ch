const messages = {
  de: {
    nameRequired: 'Bitte geben Sie Ihren Namen ein.',
    messageRequired: 'Bitte schreiben Sie eine Nachricht.',
    sending: 'Nachricht wird gesendet …',
    success: 'Vielen Dank. Ihre Nachricht wurde zur Übermittlung angenommen. Wir melden uns innert weniger Tage.',
    error: 'Ihre Nachricht konnte nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut oder schreiben Sie an info@lernbus.ch.',
    timeout: 'Die Übermittlung konnte noch nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es später erneut oder schreiben Sie an info@lernbus.ch.',
    rate: 'Es wurden zu viele Nachrichten in kurzer Zeit angefragt. Bitte warten Sie einige Minuten und versuchen Sie es erneut. Ihre Eingaben bleiben erhalten.',
    unavailable: 'Das Formular ist momentan nicht verfügbar. Bitte schreiben Sie an info@lernbus.ch.'
  },
  en: {
    nameRequired: 'Please enter your name.',
    messageRequired: 'Please write a message.',
    sending: 'Sending message …',
    success: 'Thank you. Your message has been submitted. We will get back to you within a few days.',
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

export function bindContactForm(form, options = {}) {
  const locale = form.dataset.locale === 'en' ? 'en' : 'de';
  const copy = messages[locale];
  const button = form.querySelector('button[type="submit"]');
  const status = form.parentElement.querySelector('[data-contact-status]');
  const inputs = ['name', 'email', 'message'].map(name => form.elements.namedItem(name));
  const requiredText = [
    { input: inputs[0], message: copy.nameRequired },
    { input: inputs[2], message: copy.messageRequired }
  ];
  requiredText.forEach(({ input }) => {
    input.addEventListener('input', () => input.setCustomValidity(''));
  });
  const readyLabel = button.textContent;
  let pending = false;
  let endpoint;

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
    requiredText.forEach(({ input, message }) => {
      input.setCustomValidity(input.value.trim() ? '' : message);
    });
    if (!form.reportValidity()) return;
    const value = name => form.elements.namedItem(name)?.value.trim() || '';
    const payload = {
      name: value('name'),
      email: value('email'),
      message: value('message'),
      _gotcha: value('_gotcha'),
      _subject: locale === 'en' ? 'Lernbus enquiry' : 'Kontakt Lernbus',
      language: locale
    };
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
  form.addEventListener('submit', submit);
  return submit;
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-direct-contact]').forEach(form => bindContactForm(form));
}
