// The scheduler owns availability, reservations and confirmation. No invented local slots.
// Public configuration only; never put credentials or private calendar URLs in this file.
export function publicBookingUrl(value) {
  try {
    const url = new URL(value);
    const allowed = ['outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft', 'book.ms', 'calendar.google.com', 'calendly.com', 'cal.com'];
    if (url.protocol !== 'https:' || url.username || url.password || !allowed.includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function bookingSettings(config) {
  if (!config || config.enabled !== true || config.durationMinutes !== 60 || config.contactEmail !== 'info@lernbus.ch') return null;
  const bookingUrl = publicBookingUrl(config.bookingUrl);
  const embedUrl = config.embedUrl ? publicBookingUrl(config.embedUrl) : null;
  if (!bookingUrl || (config.embedUrl && !embedUrl) || typeof config.providerName !== 'string' || !config.providerName.trim()) return null;
  return { bookingUrl, embedUrl, providerName: config.providerName.trim() };
}

export function mountBooking(root) {
  const fallback = root.querySelector('[data-booking-fallback]');
  const ready = root.querySelector('[data-booking-ready]');
  const error = root.querySelector('[data-booking-error]');
  try {
    if (!root.dataset.bookingUrl) return;
    const config = { enabled: true, durationMinutes: 60, contactEmail: 'info@lernbus.ch', bookingUrl: root.dataset.bookingUrl, embedUrl: root.dataset.embedUrl, providerName: root.dataset.providerName };
    const settings = bookingSettings(config);
    if (!settings) throw new Error('Calendar configuration incomplete');
    const external = root.querySelector('[data-calendar-external]');
    external.href = settings.bookingUrl;
    const button = root.querySelector('[data-calendar-load]');
    const frameHost = root.querySelector('[data-calendar-frame]');
    fallback.hidden = true;
    ready.hidden = false;
    if (!settings.embedUrl) {
      // Some booking pages prohibit framing. Keep their fully functional direct booking link.
      button.hidden = true;
      root.querySelector('.booking-disclosure').textContent = root.dataset.locale === 'de'
        ? `Wählen und bestätigen Sie Ihren Termin bei ${settings.providerName}.`
        : `Choose and confirm your appointment with ${settings.providerName}.`;
      return;
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      button.hidden = true;
      frameHost.hidden = false;
      // Give the provider room for its date picker and form on every screen size.
      root.closest('.booking-section').append(frameHost);
      const frame = document.createElement('iframe');
      frame.title = root.dataset.locale === 'de' ? `Kennenlerngespräch buchen · ${settings.providerName}` : `Book an introduction · ${settings.providerName}`;
      frame.src = settings.embedUrl;
      frame.referrerPolicy = 'no-referrer';
      frameHost.append(frame);
      // The provider confirms the booking; an iframe load is never treated as success.
      frame.focus();
    }, { once: true });
  } catch {
    fallback.hidden = false;
    ready.hidden = true;
    error.hidden = false;
  }
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-booking]');
  if (root) mountBooking(root);
}
