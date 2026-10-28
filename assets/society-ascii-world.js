/* Roots and wings share one clock and an optional, accessible motion preference. */
(() => {
  'use strict';
  if (typeof window.createRootsAndWingsRenderer !== 'function') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = [], controls = [];
  let time = 0, userPaused = null, frame = 0, lastDraw = 0, pageActive = true;
  const paused = () => userPaused === null ? reduced.matches : userPaused;
  const running = () => !paused() && !document.hidden && pageActive &&
    surfaces.some(surface => surface.seen && surface.available);

  function updateControls() {
    const value = paused();
    document.documentElement.classList.toggle('motion-paused', value);
    for (const control of controls) {
      const text = value ? control.dataset.play : control.dataset.pause;
      control.setAttribute('aria-pressed', String(value));
      control.setAttribute('aria-label', text);
      control.dataset.motion = value ? 'paused' : 'playing';
      control.disabled = !surfaces.some(surface => surface.available);
      const label = control.querySelector('.motion-label');
      if (label) label.textContent = text;
    }
  }

  function draw(surface) {
    if (!surface.available || surface.width < 2 || surface.height < 2) return;
    const args = surface.args;
    args.time = time;
    args.width = surface.width; args.height = surface.height;
    args.pixelRatio = surface.pixelRatio; args.mobile = surface.mobile;
    args.hero = surface.hero; args.arrivalTime = surface.arrivalTime;
    args.burst = surface.burst;
    if (args.burst) args.burst.age = time - args.burst.time;
    try { surface.renderer.draw(args); }
    catch (_) {
      surface.available = false;
      surface.stage.dataset.renderer = 'unavailable';
      updateControls();
    }
  }

  function tick(now) {
    frame = 0;
    if (!running()) { lastDraw = 0; return; }
    const delta = lastDraw ? Math.max(0, Math.min((now - lastDraw) / 1000, .1)) : 0;
    lastDraw = now; time += delta;
    const ease = 1 - Math.exp(-delta * 3);
    for (const surface of surfaces) {
      const pointer = surface.pointer;
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * ease;
      if (surface.burst && time - surface.burst.time > 5) surface.burst = null;
      if (surface.seen && surface.available) {
        if (surface.hero && surface.arrivalTime !== null) surface.arrivalTime += delta;
        draw(surface);
      }
    }
    if (running()) { if (!frame) frame = requestAnimationFrame(tick); }
    else lastDraw = 0;
  }

  function sync() {
    updateControls();
    if (running()) { if (!frame) frame = requestAnimationFrame(tick); }
    else {
      cancelAnimationFrame(frame); frame = 0; lastDraw = 0;
      surfaces.forEach(surface => { surface.press = null; surface.pointer.active = false; });
    }
  }

  function checkVisibility() {
    for (const surface of surfaces) {
      const r = surface.stage.getBoundingClientRect();
      surface.seen = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    }
    sync();
  }

  function resize(surface) {
    const r = surface.canvas.getBoundingClientRect();
    surface.width = Math.max(1, r.width); surface.height = Math.max(1, r.height);
    surface.mobile = innerWidth < 760;
    surface.pixelRatio = Math.min(devicePixelRatio || 1, surface.mobile ? 1.5 : 2);
    const w = Math.round(surface.width * surface.pixelRatio);
    const h = Math.round(surface.height * surface.pixelRatio);
    if (surface.canvas.width !== w) surface.canvas.width = w;
    if (surface.canvas.height !== h) surface.canvas.height = h;
    draw(surface);
  }

  function locate(surface, event) {
    const r = surface.stage.getBoundingClientRect();
    return { x: Math.max(-1, Math.min(1, (event.clientX - r.left) / surface.width * 2 - 1)),
      y: Math.max(-1, Math.min(1, (event.clientY - r.top) / surface.height * 2 - 1)) };
  }

  function connectPointer(surface) {
    const { stage, pointer } = surface;
    const release = () => { pointer.active = false; surface.press = null; };
    stage.addEventListener('pointermove', event => {
      if (paused() || event.pointerType === 'touch') return;
      const p = locate(surface, event);
      pointer.tx = p.x; pointer.ty = p.y; pointer.active = true;
    }, { passive: true });
    stage.addEventListener('pointerleave', release, { passive: true });
    stage.addEventListener('pointercancel', release, { passive: true });
    stage.addEventListener('pointerdown', event => {
      if (paused() || event.isPrimary === false || event.button !== 0) return;
      surface.press = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }, { passive: true });
    stage.addEventListener('pointerup', event => {
      const press = surface.press;
      if (!press || paused()) { surface.press = null; return; }
      if (press.id !== event.pointerId) return;
      surface.press = null;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 12) {
        const p = locate(surface, event); surface.burst = { x: p.x, y: p.y, time, age: 0 };
      }
      if (event.pointerType === 'touch') release();
    }, { passive: true });
  }

  function connect(canvasId, controlId, interactive) {
    const canvas = document.getElementById(canvasId), control = document.getElementById(controlId);
    const stage = canvas && canvas.closest('.sculpture-stage, .footer-world-stage');
    if (!stage || !control) return;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, active: false };
    let renderer;
    try { renderer = window.createRootsAndWingsRenderer(canvas); }
    catch (_) { return; }
    if (!renderer || typeof renderer.draw !== 'function') return;
    const surface = { canvas, stage, renderer, pointer, available: true, seen: false,
      hero: interactive, arrivalTime: interactive && !reduced.matches ? 0 : null,
      width: 1, height: 1, pixelRatio: 1, mobile: false, burst: null, press: null,
      args: { pointer } };
    surfaces.push(surface); controls.push(control);
    stage.dataset.renderer = 'ascii';
    control.addEventListener('click', () => { userPaused = !paused(); sync(); });
    canvas.addEventListener('contextlost', event => {
      event.preventDefault(); surface.available = false;
      surface.press = null; surface.pointer.active = false; sync();
    });
    canvas.addEventListener('contextrestored', () => {
      try {
        surface.renderer.dispose();
        surface.renderer = window.createRootsAndWingsRenderer(canvas);
        surface.available = Boolean(surface.renderer);
        resize(surface); checkVisibility();
      } catch (_) { surface.available = false; sync(); }
    });
    if (interactive) connectPointer(surface);
    resize(surface); control.hidden = !surface.available;
  }

  connect('world-canvas', 'motion-toggle', true);
  connect('footer-world-canvas', 'footer-motion-toggle', false);
  if (!surfaces.length) return;
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; surfaces.forEach(resize); checkVisibility(); });
  function preferenceChanged() {
    if (reduced.matches && userPaused === null) {
      for (const surface of surfaces) {
        if (surface.hero) { surface.arrivalTime = null; draw(surface); }
      }
    }
    sync();
  }
  if (reduced.addEventListener) reduced.addEventListener('change', preferenceChanged); else reduced.addListener(preferenceChanged);
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const surface = surfaces.find(item => item.stage === entry.target);
        if (surface) surface.seen = entry.isIntersecting;
      }
      sync();
    });
    surfaces.forEach(surface => observer.observe(surface.stage));
  } else window.addEventListener('scroll', checkVisibility, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const surface = surfaces.find(item => item.stage === entry.target);
        if (surface) resize(surface);
      }
      checkVisibility();
    });
    surfaces.forEach(surface => observer.observe(surface.stage));
  }
  window.addEventListener('resize', () => { surfaces.forEach(resize); checkVisibility(); }, { passive: true });
  checkVisibility();
})();
