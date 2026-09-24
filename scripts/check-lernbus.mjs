import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { publicBookingUrl, bookingSettings } from '../src/lernbus/booking.js';

// Verify that calendar configuration cannot turn into an unsafe or fictitious booking link.
const config = { enabled: true, durationMinutes: 60, contactEmail: 'info@lernbus.ch', providerName: 'Microsoft Bookings', bookingUrl: 'https://outlook.office.com/book/test-only/' };
assert.equal(bookingSettings({ ...config, enabled: false }), null);
assert.equal(bookingSettings({ ...config, durationMinutes: 30 }), null);
assert.equal(bookingSettings({ ...config, providerName: '' }), null);
assert.equal(bookingSettings({ ...config, embedUrl: 'https://untrusted.example/' }), null);
assert.equal(bookingSettings(config).bookingUrl, config.bookingUrl);
for (const url of ['javascript:alert(1)', 'http://cal.com/test', 'https://cal.com.evil.test/', 'https://secret@cal.com/test', '/relative']) assert.equal(publicBookingUrl(url), null);

// Check generated routes, fragments, asset references, and language/price parity.
const paths = ['lernbus/index.html', 'lernbus/en/index.html', 'lernbus/konzept/index.html', 'lernbus/en/konzept/index.html', 'lernbus/forschung/index.html', 'lernbus/en/research/index.html', 'lernbus/team/index.html', 'lernbus/team/en/index.html', 'lernbus/agb/index.html', 'lernbus/en/terms/index.html', 'agb/index.html'];
let references = 0;
for (const path of paths) {
  const full = resolve('_site', path);
  const html = readFileSync(full, 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one main heading`);
  assert(!html.includes('ß'), `${path}: Swiss spelling`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${path}: unique ids`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    const [reference, hash] = value.split('#');
    const url = reference.split('?')[0];
    let target = url.startsWith('/') ? resolve('_site', '.' + url) : resolve(dirname(full), url || '.');
    if (!url) target = full;
    else if (url.endsWith('/') || !/\.[a-z0-9]+$/i.test(url)) target = resolve(target, 'index.html');
    assert(existsSync(target), `${path}: missing ${value}`);
    if (hash) assert(readFileSync(target, 'utf8').includes(`id="${hash}"`), `${path}: missing fragment ${value}`);
    references++;
  }
  if (['lernbus/index.html', 'lernbus/en/index.html'].includes(path)) {
    const prices = html.match(/<table class="tariffs\b[\s\S]*?<\/table>/)?.[0];
    assert(prices, 'The existing lesson prices remain available');
    assert.equal((prices.match(/<td\b/g)||[]).length, 8);
    for (const amount of ['10','75','60','100','125','90']) assert(new RegExp(`<td[^>]*>CHF ${amount.replace('.', '\\.')}</td>`).test(html));
    assert(!/<iframe\b/.test(html), 'No third-party calendar loaded before parent chooses');
  }
}
console.log(`Lernbus checks passed: ${paths.length} routes, ${references} local links/assets, tariff parity and calendar configuration guards.`);
