/* A living field of connected light; motion stays optional and locally controlled. */
(() => {
  'use strict';
  const evolution = window.learningSocietyEvolution;
  if (!evolution || typeof evolution.stateAt !== 'function' || typeof evolution.curve !== 'function') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = [], controls = [];
  let time = 0;
  let userPaused = null;
  let frame = 0, lastDraw = 0, pageActive = true;
  const paused = () => userPaused === null ? reduced.matches : userPaused;
  const canDraw = surface => surface.available && !surface.contextLost;
  const running = () => !paused() && !document.hidden && pageActive &&
    surfaces.some(surface => surface.seen && canDraw(surface));

  function fallback(surface) {
    if (surface.gpu) { try { surface.gpu.dispose(); } catch (_) { /* Lost contexts already release resources. */ } }
    const replacement = surface.canvas.cloneNode(false);
    surface.canvas.replaceWith(replacement); surface.canvas = replacement;
    surface.gl = surface.gpu = null; surface.contextLost = false;
    surface.ctx = replacement.getContext('2d', { alpha: false });
    surface.stage.dataset.renderer = 'canvas2d';
    surface.available = Boolean(surface.ctx);
    return surface.available;
  }

  function fallbackPoint(surface, u, lane, group) {
    const { curves, point, pointer, width, height, scale } = surface;
    const scaled = u * 64, at = Math.min(63, Math.floor(scaled)), along = scaled - at;
    const base = (group * 65 + at) * 9 + (lane < 0 ? 0 : 3);
    const across = lane < 0 ? lane + 1 : lane;
    for (let axis = 0; axis < 3; axis += 1) {
      const a = base + axis;
      point[axis] = (curves[a] + (curves[a + 3] - curves[a]) * across) * (1 - along) +
        (curves[a + 9] + (curves[a + 12] - curves[a + 9]) * across) * along;
    }
    const perspective = 4.8 / (4.8 - point[2]);
    const px = surface.mobile ? point[0] * 0.9950041653 - point[1] * 0.0998334166 : point[0];
    const py = surface.mobile ? point[0] * 0.0998334166 + point[1] * 0.9950041653 : point[1];
    let x = width * 0.5 + px * scale * perspective, y = height * 0.5 - py * scale * perspective;
    if (pointer.strength > 0.001) {
      const handX = (pointer.x + 1) * width / 2, handY = (pointer.y + 1) * height / 2;
      const distance = Math.hypot(x - handX, y - handY) / scale;
      const influence = Math.exp(-distance * distance * 3.8) * pointer.strength;
      x += (handX - x) * influence * 0.12; y += (handY - y) * influence * 0.12;
    }
    if (surface.burst) {
      const burst = surface.burst;
      const dx = x - (burst.x + 1) * width / 2, dy = y - (burst.y + 1) * height / 2;
      const distance = Math.hypot(dx, dy), age = time - burst.time;
      const wave = Math.exp(-Math.pow(distance / scale - age * 1.35, 2) * 20 - age * 0.95);
      x += dx / Math.max(distance, 1) * wave * scale * 0.11;
      y += dy / Math.max(distance, 1) * wave * scale * 0.11;
    }
    point[0] = x; point[1] = y;
    return point;
  }

  function drawFallback(surface) {
    const { ctx, width, height, curves, state } = surface;
    evolution.stateAt(time, state);
    // Shared samples keep the no-WebGL path light enough for display-paced motion.
    for (let group = 0; group < 6; group += 1) {
      for (let j = 0; j <= 64; j += 1) {
        for (let edge = 0; edge < 3; edge += 1) {
          evolution.curve(j / 64, edge - 1, group, state, curves, (group * 65 + j) * 9 + edge * 3);
        }
      }
    }
    ctx.fillStyle = '#080e20'; ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const count = surface.mobile ? 72 : 108;
    for (let i = 0; i < count; i += 1) {
      const group = i % 6, lane = (Math.floor(i / 6) / (count / 6 - 1) - 0.5) * 2;
      ctx.beginPath();
      for (let j = 0; j <= 64; j += 1) {
        const p = fallbackPoint(surface, j / 64, lane, group);
        if (j === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      const crest = Math.pow(0.5 + 0.5 * Math.sin(state.pulsePhase[group] * 0.5 + group * 1.7 + lane), 5);
      ctx.strokeStyle = i % 17 === 0 ? 'rgba(239,164,93,.35)' :
        `rgba(${Math.round(82 + crest * 140)},${Math.round(118 + crest * 110)},${Math.round(200 + crest * 46)},${0.19 + crest * 0.30})`;
      ctx.lineWidth = i % 11 === 0 ? 1.1 : 0.65; ctx.stroke();
      if (i % 3 === 0) {
        const p = fallbackPoint(surface, (state.flow[group] + i * 0.061) % 1, lane, group);
        ctx.fillStyle = i % 17 === 0 ? 'rgba(255,200,121,.8)' : 'rgba(225,238,255,.72)';
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw(surface) {
    if (!canDraw(surface) || surface.width < 2 || surface.height < 2) return;
    if (surface.gpu) {
      const args = surface.drawArgs;
      args.time = time; args.width = surface.width; args.height = surface.height;
      args.pixelRatio = surface.pixelRatio; args.mobile = surface.mobile;
      args.burst = surface.burst;
      if (args.burst) args.burst.age = time - args.burst.time;
      try { surface.gpu.draw(args); return; }
      catch (_) { if (!fallback(surface)) return; resize(surface); return; }
    }
    if (surface.ctx) drawFallback(surface);
  }

  function updateControls() {
    const value = paused();
    document.documentElement.classList.toggle('motion-paused', value);
    for (const control of controls) {
      const text = value ? control.dataset.play : control.dataset.pause;
      control.setAttribute('aria-pressed', String(value)); control.setAttribute('aria-label', text);
      control.dataset.motion = value ? 'paused' : 'playing';
      control.disabled = !surfaces.some(canDraw);
      const label = control.querySelector('.motion-label');
      if (label) label.textContent = text; else control.textContent = text;
    }
  }

  function tick(now) {
    frame = 0;
    if (!running()) { lastDraw = 0; return; }
    const delta = lastDraw ? Math.max(0, Math.min((now - lastDraw) / 1000, 0.1)) : 0;
    lastDraw = now; time += delta;
    // One display clock for both scenes; no 30fps gate or offscreen render loop.
    const ease = 1 - Math.exp(-delta * 3);
    for (const surface of surfaces) {
      const pointer = surface.pointer;
      pointer.x += (pointer.tx - pointer.x) * ease; pointer.y += (pointer.ty - pointer.y) * ease;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * ease;
      if (surface.burst && time - surface.burst.time > 5) surface.burst = null;
      if (surface.seen) draw(surface);
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function sync() {
    updateControls();
    if (running()) { if (!frame) frame = requestAnimationFrame(tick); }
    else {
      cancelAnimationFrame(frame); frame = 0; lastDraw = 0;
      for (const surface of surfaces) { surface.press = null; surface.pointer.active = false; }
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
    surface.pixelRatio = Math.min(devicePixelRatio || 1, surface.mobile ? 1.25 : 1.5);
    surface.scale = Math.min(surface.width, surface.height) * (surface.mobile ? 0.31 : 0.33);
    const w = Math.round(surface.width * surface.pixelRatio), h = Math.round(surface.height * surface.pixelRatio);
    // Repeated ResizeObserver/window events must not clear and reallocate a canvas.
    if (surface.canvas.width !== w) surface.canvas.width = w;
    if (surface.canvas.height !== h) surface.canvas.height = h;
    if (surface.ctx) surface.ctx.setTransform(surface.pixelRatio, 0, 0, surface.pixelRatio, 0, 0);
    draw(surface);
  }
  function locate(surface, event) {
    const r = surface.stage.getBoundingClientRect();
    return { x: Math.max(-1, Math.min(1, (event.clientX - r.left) / surface.width * 2 - 1)),
      y: Math.max(-1, Math.min(1, (event.clientY - r.top) / surface.height * 2 - 1)) };
  }
  function release(surface) { surface.pointer.active = false; surface.press = null; }
  function connectPointer(surface) {
    const stage = surface.stage, pointer = surface.pointer;
    stage.addEventListener('pointermove', event => {
      if (paused() || event.pointerType === 'touch') return;
      const p = locate(surface, event); pointer.tx = p.x; pointer.ty = p.y; pointer.active = true;
    }, { passive: true });
    stage.addEventListener('pointerleave', () => release(surface), { passive: true });
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
      if (event.pointerType === 'touch') release(surface);
    }, { passive: true });
    stage.addEventListener('pointercancel', () => release(surface), { passive: true });
  }

  function connect(canvasId, controlId, interactive) {
    const canvas = document.getElementById(canvasId), control = document.getElementById(controlId);
    const stage = canvas && canvas.closest('.sculpture-stage, .footer-world-stage');
    if (!canvas || !stage || !control) return;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, active: false };
    const surface = { canvas, stage, pointer, gl: null, ctx: null, gpu: null, contextLost: false,
      width: 1, height: 1, pixelRatio: 1, mobile: false, scale: 1, available: true, seen: false,
      burst: null, press: null, state: {}, point: new Float32Array(3), curves: new Float32Array(6 * 65 * 9),
      drawArgs: { pointer } };
    try {
      surface.gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power' });
      if (surface.gl && typeof window.createLearningUniverseRenderer === 'function') {
        surface.gpu = window.createLearningUniverseRenderer(surface.gl); stage.dataset.renderer = 'webgl';
      } else if (!fallback(surface)) return;
    } catch (_) { if (!fallback(surface)) return; }
    surface.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); surface.contextLost = true; release(surface); sync();
    });
    surface.canvas.addEventListener('webglcontextrestored', () => {
      if (!surface.gl) return;
      try { surface.gpu = window.createLearningUniverseRenderer(surface.gl); surface.contextLost = false; }
      catch (_) { if (!fallback(surface)) return; }
      resize(surface); checkVisibility();
    });
    surfaces.push(surface); controls.push(control);
    control.addEventListener('click', () => { userPaused = !paused(); sync(); });
    if (interactive) connectPointer(surface);
    surface.canvas.setAttribute('aria-hidden', 'true'); resize(surface); control.hidden = false;
  }

  connect('world-canvas', 'motion-toggle', true);
  connect('footer-world-canvas', 'footer-motion-toggle', false);
  if (!surfaces.length) return;
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; surfaces.forEach(resize); checkVisibility(); });
  if (reduced.addEventListener) reduced.addEventListener('change', sync); else reduced.addListener(sync);
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
