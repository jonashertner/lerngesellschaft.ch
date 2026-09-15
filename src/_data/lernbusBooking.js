import { readFileSync } from 'node:fs';
import { bookingSettings } from '../lernbus/booking.js';

export default function () {
  const config = JSON.parse(readFileSync(new URL('../lernbus/booking-config.json', import.meta.url), 'utf8'));
  const weeklySlots = Object.entries(config.weeklySlots || {}).map(([day, slots]) => ({ day, slots: slots.map(start => {
    const [hour, minute] = start.split(':').map(Number);
    const endMinutes = hour * 60 + minute + config.durationMinutes;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    return `${start}–${end}`;
  }) }));
  if (!config.enabled) return { configured: false, bookingUrl: '', embedUrl: '', providerName: '', weeklySlots };
  const settings = bookingSettings(config);
  if (!settings) throw new Error('Lernbus booking is enabled but its public calendar configuration is invalid.');
  const locales = Object.fromEntries(Object.entries(config.locales || {}).map(([locale, urls]) => {
    const localized = bookingSettings({ ...config, ...urls });
    if (!localized) throw new Error(`Invalid Lernbus calendar configuration for ${locale}.`);
    return [locale, localized];
  }));
  return { configured: true, ...settings, locales, weeklySlots, firstLessonDate: config.firstLessonDate || '' };
}
