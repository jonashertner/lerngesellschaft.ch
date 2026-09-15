import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { resolve } from 'node:path';

const source = readFileSync(new URL('../src/assets/hero-video.js', import.meta.url), 'utf8');

// Small controllable media/DOM surface: play promises and queued media events
// are separate so a late result cannot silently undo a visitor's newer choice.
function fixture({ reduced = false, language = 'de' } = {}) {
  // Homepage controls now come from a shared bilingual Nunjucks template.
  // Exercise the rendered labels that visitors receive; run the build first.
  const html = readFileSync(resolve(process.env.SOCIETY_BUILD_DIR || '_site', language === 'de' ? 'index.html' : 'en/index.html'), 'utf8');
  const buttonMarkup = html.match(/<button\b[^>]*class="film-toggle"[^>]*>/)?.[0];
  assert(buttonMarkup, 'The real homepage includes the movie control.');
  const labels = Object.fromEntries(['play', 'pause', 'pending'].map(kind => {
    const value = buttonMarkup.match(new RegExp(`data-${kind}-label="([^"]+)"`))?.[1];
    assert(value, `The ${language} control supplies its ${kind} label.`);
    return [`${kind}Label`, value];
  }));
  const label = { textContent: '' };
  const icon = { textContent: '' };
  const classes = new Set();
  const requests = [];
  const queuedEvents = [];
  const button = new EventTarget();
  Object.assign(button, {
    hidden: true,
    dataset: labels,
    querySelector: selector => selector === '.film-toggle-label' ? label : selector === '.film-toggle-icon' ? icon : null,
  });
  const video = new EventTarget();
  Object.assign(video, {
    paused: true,
    pauseCalls: 0,
    classList: {
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
    },
    play() {
      // The native paused property changes synchronously, before playing fires.
      video.paused = false;
      const request = {};
      request.promise = new Promise((resolve, reject) => Object.assign(request, { resolve, reject }));
      requests.push(request);
      return request.promise;
    },
    pause() {
      video.pauseCalls += 1;
      if (!video.paused) {
        video.paused = true;
        queuedEvents.push(() => video.dispatchEvent(new Event('pause')));
      }
    },
  });
  const mediaQuery = new EventTarget();
  mediaQuery.matches = reduced;
  vm.runInNewContext(source, {
    document: { querySelector: selector => selector === '.hero-video' ? video : selector === '.film-toggle' ? button : null },
    window: { matchMedia: () => mediaQuery },
  }, { filename: 'hero-video.js' });

  return {
    video, button, labels, requests,
    text: () => label.textContent,
    visible: () => classes.has('is-playing'),
    click: () => button.dispatchEvent(new Event('click')),
    event: name => video.dispatchEvent(new Event(name)),
    flushMediaEvents() { while (queuedEvents.length) queuedEvents.shift()(); },
    preference(matches) {
      mediaQuery.matches = matches;
      const event = new Event('change');
      Object.defineProperty(event, 'matches', { value: matches });
      mediaQuery.dispatchEvent(event);
    },
    start(index = requests.length - 1) {
      video.paused = false;
      video.dispatchEvent(new Event('playing'));
      requests[index].resolve();
    },
  };
}

async function settle() {
  // Let the controller's async play continuation observe a result.
  await Promise.resolve();
  await Promise.resolve();
}

for (const language of ['de', 'en']) {
  test(`${language}: reduced motion starts with a still and permits explicit playback`, async () => {
    const f = fixture({ language, reduced: true });
    assert.equal(f.button.hidden, false);
    assert.equal(f.requests.length, 0);
    assert.equal(f.text(), f.labels.playLabel);
    assert.equal(f.visible(), false);
    f.click();
    assert.equal(f.requests.length, 1);
    assert.equal(f.text(), f.labels.pendingLabel);
    f.start();
    await settle();
    assert.equal(f.text(), f.labels.pauseLabel);
    assert.equal(f.visible(), true);
    f.click();
    f.flushMediaEvents();
    assert.equal(f.video.paused, true);
    assert.equal(f.visible(), false);
    assert.equal(f.text(), f.labels.playLabel);
  });

  test(`${language}: readiness and promise resolution do not falsely report playing`, async () => {
    const f = fixture({ language });
    assert.equal(f.requests.length, 1);
    assert.equal(f.text(), f.labels.pendingLabel);
    f.event('canplay');
    f.requests[0].resolve();
    await settle();
    assert.equal(f.visible(), false);
    assert.equal(f.text(), f.labels.pendingLabel);
    f.event('playing');
    assert.equal(f.visible(), true);
    assert.equal(f.text(), f.labels.pauseLabel);
    f.video.pause();
    f.flushMediaEvents();
    assert.equal(f.visible(), false);
    assert.equal(f.text(), f.labels.playLabel);
  });
}

test('autoplay rejection preserves the still and allows a later user retry', async () => {
  const f = fixture();
  f.requests[0].reject(new Error('NotAllowedError'));
  await settle();
  f.flushMediaEvents();
  assert.equal(f.visible(), false);
  assert.equal(f.video.paused, true);
  assert.equal(f.text(), f.labels.playLabel);
  f.click();
  f.start();
  await settle();
  assert.equal(f.requests.length, 2);
  assert.equal(f.visible(), true);
});

test('cancelling pending playback survives its late resolution and playing event', async () => {
  const f = fixture();
  f.click();
  f.flushMediaEvents();
  f.requests[0].resolve();
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.visible(), false);
  f.start(0);
  f.flushMediaEvents();
  assert.equal(f.video.paused, true);
  assert.equal(f.visible(), false);
  assert.equal(f.text(), f.labels.playLabel);
});

test('a rejected obsolete attempt cannot cancel a newer successful request', async () => {
  const f = fixture();
  f.click();
  f.flushMediaEvents();
  f.click();
  f.start(1);
  f.requests[0].reject(new Error('AbortError'));
  await settle();
  assert.equal(f.video.paused, false);
  assert.equal(f.visible(), true);
  assert.equal(f.text(), f.labels.pauseLabel);
});

test('a resolved obsolete attempt cannot cancel a newer successful request', async () => {
  const f = fixture();
  f.click();
  f.flushMediaEvents();
  f.click();
  f.start(1);
  f.requests[0].resolve();
  await settle();
  assert.equal(f.video.paused, false);
  assert.equal(f.visible(), true);
  assert.equal(f.text(), f.labels.pauseLabel);
});

test('turning reduced motion on cancels pending playback without automatic restart', async () => {
  const f = fixture();
  f.preference(true);
  f.flushMediaEvents();
  f.requests[0].resolve();
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.visible(), false);
  f.preference(false);
  assert.equal(f.requests.length, 1);
  assert.equal(f.text(), f.labels.playLabel);
});

test('turning reduced motion on stops actual playback; explicit play still works', async () => {
  const f = fixture();
  f.start();
  await settle();
  f.preference(true);
  f.flushMediaEvents();
  assert.equal(f.video.paused, true);
  assert.equal(f.visible(), false);
  f.click();
  f.start();
  await settle();
  assert.equal(f.visible(), true);
  assert.equal(f.text(), f.labels.pauseLabel);
});

test('a media error returns to a still and ignores the obsolete play rejection', async () => {
  const f = fixture();
  f.event('error');
  f.flushMediaEvents();
  f.requests[0].reject(new Error('NotSupportedError'));
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.visible(), false);
  assert.equal(f.text(), f.labels.playLabel);
});

test('a queued pause event cannot override a newer user play request', async () => {
  const f = fixture();
  f.click(); // Queue pause from cancellation of the first request.
  f.click(); // The user starts playback again before that event is delivered.
  assert.equal(f.video.paused, false);
  f.flushMediaEvents();
  f.start(1);
  f.requests[0].reject(new Error('AbortError'));
  await settle();
  f.flushMediaEvents();
  assert.equal(f.video.paused, false);
  assert.equal(f.visible(), true);
  assert.equal(f.text(), f.labels.pauseLabel);
});
