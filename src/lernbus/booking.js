// The scheduler owns availability, reservations and confirmation. No invented local slots.
// Public configuration only; never put credentials or private calendar URLs in this file.
export function publicBookingUrl(value) {
  try {
    const url = new URL(value);
    const allowed = ['outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft', 'bookings.cloud.microsoft', 'book.ms', 'calendar.google.com', 'calendly.com', 'cal.com'];
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
    const status = root.querySelector('[data-calendar-status]');
    const opening = root.querySelector('[data-calendar-opening]');
    if (opening) {
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
      // Explain the month switch only while the calendar opens before the start month.
      opening.hidden = !/^\d{4}-\d{2}-\d{2}$/.test(opening.dataset.firstLesson || '') || today.slice(0, 7) >= opening.dataset.firstLesson.slice(0, 7);
    }
    fallback.hidden = true;
    ready.hidden = false;
    if (!settings.embedUrl) {
      // Some booking pages prohibit framing. Keep their fully functional direct booking link.
      button.hidden = true;
      root.querySelector('.booking-disclosure').textContent = root.dataset.locale === 'de'
        ? `Wählen Sie Ihren Wunschtermin bei ${settings.providerName}.`
        : `Choose your preferred date and time with ${settings.providerName}.`;
      return;
    }
    button.hidden = false;
    root.querySelector('[data-calendar-launch]').hidden = false;
    button.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'true');
      frameHost.hidden = false;
      status.hidden = false;
      status.textContent = status.dataset.loading;
      root.classList.add('calendar-open');
      root.querySelector('[data-calendar-assistance]').hidden = false;
      const frame = document.createElement('iframe');
      frame.title = root.dataset.locale === 'de' ? `Lektion anfragen · ${settings.providerName}` : `Request a lesson · ${settings.providerName}`;
      frame.src = settings.embedUrl;
      frame.referrerPolicy = 'no-referrer';
      const slow = setTimeout(() => { status.textContent = status.dataset.slow; }, 12000);
      frame.addEventListener('load', () => { clearTimeout(slow); status.hidden = true; }, { once: true });
      frameHost.append(frame);
      // A cross-origin load event does not prove successful rendering or a booking.
      // Direct opening and email remain available above/below the frame for recovery.
      frame.focus();
      root.querySelector('[data-calendar-launch]').hidden = true;
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
