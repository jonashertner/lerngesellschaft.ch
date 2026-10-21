/* A living field of connected light; motion stays optional and locally controlled. */
(() => {
  'use strict';
  let canvas = document.getElementById('world-canvas');
  const control = document.getElementById('motion-toggle');
  if (!canvas || !control) return;
  const stage = canvas.closest('.sculpture-stage');
  const label = control.querySelector('.motion-label');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, active: false };
  let gl = null, ctx = null, gpu = null;
  let width = 1, height = 1, pixelRatio = 1, mobile = false;
  let time = 0;
  let userPaused = null;
  let frame = 0, lastDraw = 0, nextDraw = 0, seen = true, pageActive = true, contextLost = false;
  let press = null, burst = null;
  const paused = () => userPaused === null ? reduced.matches : userPaused;
  const running = () => !paused() && !contextLost && seen && !document.hidden && pageActive;

  function fallback() {
    if (gpu) { try { gpu.dispose(); } catch (_) { /* A lost context already releases resources. */ } }
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement); canvas = replacement;
    gl = gpu = null; contextLost = false;
    ctx = canvas.getContext('2d', { alpha: false });
    stage.dataset.renderer = 'canvas2d';
    return Boolean(ctx);
  }

  // Both renderers follow the same evolving field and the same visit seed.
  const evolution = window.learningSocietyEvolution;
  if (!evolution || typeof evolution.stateAt !== 'function' || typeof evolution.curve !== 'function') return;
  const fallbackState = {};
  const fallbackPosition = new Float32Array(3);
  function fallbackPoint(u, lane, group) {
    evolution.curve(u, lane, group, fallbackState, fallbackPosition, 0);
    const p = fallbackPosition;
    const perspective = 4.8 / (4.8 - p[2]);
    const scale = Math.min(width, height) * (mobile ? 0.31 : 0.33);
    const px = mobile ? p[0] * 0.9950041653 - p[1] * 0.0998334166 : p[0];
    const py = mobile ? p[0] * 0.0998334166 + p[1] * 0.9950041653 : p[1];
    let x = width * 0.5 + px * scale * perspective;
    let y = height * 0.5 - py * scale * perspective;
    const handX = (pointer.x + 1) * width / 2, handY = (pointer.y + 1) * height / 2;
    const distance = Math.hypot(x - handX, y - handY) / scale;
    const influence = Math.exp(-distance * distance * 3.8) * pointer.strength;
    x += (handX - x) * influence * 0.12;
    y += (handY - y) * influence * 0.12;
    if (burst) {
      const dx = x - (burst.x + 1) * width / 2, dy = y - (burst.y + 1) * height / 2;
      const d = Math.hypot(dx, dy), age = time - burst.time;
      const wave = Math.exp(-Math.pow(d / scale - age * 1.35, 2) * 20 - age * 0.95);
      x += dx / Math.max(d, 1) * wave * scale * 0.11;
      y += dy / Math.max(d, 1) * wave * scale * 0.11;
    }
    return [x, y, p[2]];
  }

  function drawFallback() {
    evolution.stateAt(time, fallbackState);
    ctx.fillStyle = '#080e20'; ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const count = mobile ? 72 : 108;
    for (let i = 0; i < count; i++) {
      const group = i % 6, lane = (Math.floor(i / 6) / (count / 6 - 1) - 0.5) * 2;
      ctx.beginPath();
      for (let j = 0; j <= 64; j++) {
        const p = fallbackPoint(j / 64, lane, group);
        if (j === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      const crest = Math.pow(0.5 + 0.5 * Math.sin(fallbackState.pulsePhase[group] * 0.5 + group * 1.7 + lane), 5);
      ctx.strokeStyle = i % 17 === 0 ? 'rgba(239,164,93,.35)' :
        `rgba(${Math.round(82 + crest * 140)},${Math.round(118 + crest * 110)},${Math.round(200 + crest * 46)},${0.19 + crest * 0.30})`;
      ctx.lineWidth = i % 11 === 0 ? 1.1 : 0.65; ctx.stroke();
      if (i % 3 === 0) {
        const u = (fallbackState.flow[group] + i * 0.061) % 1;
        const p = fallbackPoint(u, lane, group);
        ctx.fillStyle = i % 17 === 0 ? 'rgba(255,200,121,.8)' : 'rgba(225,238,255,.72)';
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw() {
    if (width < 2 || height < 2 || contextLost) return;
    if (gpu) {
      try {
        gpu.draw({ time, width, height, pixelRatio, mobile,
          pointer: { x: pointer.x, y: pointer.y, strength: pointer.strength },
          burst: burst ? { x: burst.x, y: burst.y, age: time - burst.time } : null });
        return;
      } catch (_) { if (!fallback()) return; resize(); return; }
    }
    if (ctx) drawFallback();
  }

  function updateControl() {
    const value = paused();
    const text = value ? control.dataset.play : control.dataset.pause;
    control.setAttribute('aria-pressed', String(value));
    control.setAttribute('aria-label', text);
    control.dataset.motion = value ? 'paused' : 'playing';
    control.disabled = contextLost;
    document.documentElement.classList.toggle('motion-paused', value);
    if (label) label.textContent = text; else control.textContent = text;
  }

  function tick(now) {
    frame = 0;
    if (!running()) { lastDraw = nextDraw = 0; return; }
    if (!nextDraw) nextDraw = now;
    if (now + 0.75 >= nextDraw) {
      const delta = lastDraw ? Math.min((now - lastDraw) / 1000, 0.1) : 0;
      lastDraw = now; time += delta;
      // Keep a steady deadline: small RAF timing variations must not lose a frame.
      nextDraw += 1000 / 30;
      if (nextDraw <= now) nextDraw = now + 1000 / 30;
      const ease = 1 - Math.exp(-delta * 3);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * ease;
      if (burst && time - burst.time > 5) burst = null;
      draw();
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function sync() {
    updateControl();
    if (running()) { if (!frame) frame = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(frame); frame = 0; lastDraw = nextDraw = 0; }
  }
  function checkVisibility() {
    const r = stage.getBoundingClientRect(); seen = r.bottom > 0 && r.top < innerHeight; sync();
  }
  function resize() {
    const r = canvas.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    mobile = innerWidth < 760;
    pixelRatio = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
    if (ctx) ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(); checkVisibility();
  }
  function locate(event) {
    const r = stage.getBoundingClientRect();
    return { x: Math.max(-1, Math.min(1, (event.clientX - r.left) / width * 2 - 1)),
      y: Math.max(-1, Math.min(1, (event.clientY - r.top) / height * 2 - 1)) };
  }
  function release() { pointer.active = false; }
  stage.addEventListener('pointermove', event => {
    if (paused() || event.pointerType === 'touch') return;
    const p = locate(event); pointer.tx = p.x; pointer.ty = p.y; pointer.active = true;
  }, { passive: true });
  stage.addEventListener('pointerleave', release, { passive: true });
  stage.addEventListener('pointerdown', event => {
    if (!paused()) press = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  stage.addEventListener('pointerup', event => {
    if (!press || paused()) { press = null; return; }
    const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y); press = null;
    if (distance < 12) { const p = locate(event); burst = { ...p, time }; }
    if (event.pointerType === 'touch') release();
  }, { passive: true });
  stage.addEventListener('pointercancel', () => { press = null; release(); }, { passive: true });

  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (gl && typeof window.createLearningUniverseRenderer === 'function') {
      gpu = window.createLearningUniverseRenderer(gl); stage.dataset.renderer = 'webgl';
    } else if (!fallback()) return;
  } catch (_) { if (!fallback()) return; }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; sync(); });
  canvas.addEventListener('webglcontextrestored', () => {
    if (!gl) return;
    try { gpu = window.createLearningUniverseRenderer(gl); contextLost = false; }
    catch (_) { if (!fallback()) return; }
    resize();
  });
  control.addEventListener('click', () => { userPaused = !paused(); sync(); });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; resize(); });
  if (reduced.addEventListener) reduced.addEventListener('change', sync); else reduced.addListener(sync);
  if (typeof IntersectionObserver === 'function') new IntersectionObserver(([entry]) => { seen = entry.isIntersecting; sync(); }).observe(stage);
  else window.addEventListener('scroll', checkVisibility, { passive: true });
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize, { passive: true });
  canvas.setAttribute('aria-hidden', 'true'); resize(); control.hidden = false;
})();
