/* A quiet, decorative atmosphere; the artwork and all content work without it. */
(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  const hero = document.getElementById('top');
  const toggle = document.getElementById('motion-toggle');
  if (!canvas || !hero || !toggle) return;

  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: true }); } catch (_) { return; }
  if (!ctx) return;

  const art = hero.querySelector('.world-artwork');
  const label = toggle.querySelector('.motion-label');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const particles = [];
  const ripples = [];
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 1;
  let height = 1;
  let cx = 0;
  let cy = 0;
  let radius = 1;
  let time = 0;
  let previous = 0;
  let frame = 0;
  let onScreen = true;
  let pageActive = true;
  let choice = null;
  let seed = 1407;

  // Stable composition across resizes, screenshots and the two language pages.
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 86; i += 1) {
    particles.push({
      angle: random() * TAU,
      distance: 0.45 + Math.sqrt(random()) * 1.4,
      depth: random(),
      phase: random() * TAU,
      speed: 0.009 + random() * 0.012,
      size: 0.45 + random() * 1.1,
      warm: random() > 0.3,
    });
  }

  const paused = () => choice === null ? reduced.matches : choice;
  const running = () => !paused() && onScreen && !document.hidden && pageActive;

  function updateControl() {
    const isPaused = paused();
    const text = isPaused
      ? toggle.dataset.play || 'Play animation'
      : toggle.dataset.pause || 'Pause animation';
    toggle.setAttribute('aria-pressed', String(isPaused));
    toggle.setAttribute('aria-label', text);
    toggle.dataset.motion = isPaused ? 'paused' : 'playing';
    const icon = toggle.querySelector('.motion-icon');
    if (icon) icon.textContent = isPaused ? '▶' : 'Ⅱ';
    if (label) label.textContent = text;
    else toggle.textContent = text;
  }

  function setParallax() {
    if (!art) return;
    art.style.setProperty('--world-x', `${(pointer.x * 9).toFixed(2)}px`);
    art.style.setProperty('--world-y', `${(pointer.y * 7).toFixed(2)}px`);
  }

  function projection(angle, ring) {
    const r = radius * (1.04 + ring * 0.16);
    const tilt = [-0.40, 0.48, -0.97][ring];
    const a = angle + time * (ring % 2 ? -0.012 : 0.016);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = z * (0.30 + ring * 0.055);
    const perspective = 1 / (1 + z * 0.00055);
    const bend = Math.sin(a * 2 + time * 0.3) * pointer.x * 3;
    return {
      x: cx + (x * Math.cos(tilt) - y * Math.sin(tilt)) * perspective + pointer.x * 7,
      y: cy + (x * Math.sin(tilt) + y * Math.cos(tilt) + bend) * perspective + pointer.y * 5,
      z,
    };
  }

  function light(x, y, size, alpha, warm) {
    const rgb = warm ? '244,215,151' : '165,211,220';
    ctx.fillStyle = `rgba(${rgb},${alpha * 0.11})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    // Two depth passes give each filament a near and far side without a heavy glow.
    for (let ring = 0; ring < 3; ring += 1) {
      for (let side = 0; side < 2; side += 1) {
        ctx.beginPath();
        let drawing = false;
        for (let i = 0; i <= 144; i += 1) {
          const point = projection(i / 144 * TAU, ring);
          const visible = (point.z >= 0) === (side === 0);
          if (!visible) { drawing = false; continue; }
          if (!drawing) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
          drawing = true;
        }
        ctx.strokeStyle = side === 0
          ? `rgba(209,191,144,${0.19 - ring * 0.035})`
          : 'rgba(166,200,214,0.045)';
        ctx.lineWidth = side === 0 ? 0.65 : 0.45;
        ctx.stroke();
      }
      const orbiting = projection(time * (0.055 + ring * 0.007) + ring * 2.35, ring);
      light(orbiting.x, orbiting.y, 1.45, orbiting.z >= 0 ? 0.7 : 0.27, true);
    }

    const count = width < 680 ? 65 : particles.length;
    for (let i = 0; i < count; i += 1) {
      const p = particles[i];
      const angle = p.angle + time * p.speed;
      let x = cx + Math.cos(angle) * radius * p.distance;
      let y = cy + Math.sin(angle) * radius * p.distance * 0.79;
      x += Math.sin(time * 0.19 + p.phase) * 5 + pointer.x * (5 + p.depth * 10);
      y += Math.cos(time * 0.16 + p.phase) * 7 + pointer.y * (4 + p.depth * 7);
      for (const ripple of ripples) {
        const dx = x - ripple.x;
        const dy = y - ripple.y;
        const distance = Math.hypot(dx, dy) || 1;
        const age = time - ripple.started;
        const wave = Math.exp(-Math.pow((distance - age * 135) / 65, 2));
        const strength = wave * Math.max(0, 1 - age / 2.8) * 12;
        x += dx / distance * strength;
        y += dy / distance * strength;
      }
      // Keep the type side quiet, and avoid blinking or high-contrast flashes.
      const edge = Math.min(1, Math.max(0, x / width - 0.12) * 3);
      const breath = 0.77 + Math.sin(time * 0.43 + p.phase) * 0.23;
      light(x, y, p.size, (0.19 + p.depth * 0.42) * breath * edge, p.warm);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick(now) {
    frame = 0;
    if (!running()) { previous = 0; return; }
    const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    time += delta;
    const ease = 1 - Math.exp(-delta * 3.8);
    pointer.x += (pointer.targetX - pointer.x) * ease;
    pointer.y += (pointer.targetY - pointer.y) * ease;
    while (ripples.length && time - ripples[0].started > 2.8) ripples.shift();
    setParallax();
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    updateControl();
    if (running()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
      setParallax();
      if (onScreen && !document.hidden) draw();
    }
  }

  function checkVisibility() {
    const rect = hero.getBoundingClientRect();
    onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
    sync();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const narrow = width < 760;
    cx = width * (narrow ? 0.62 : 0.72);
    cy = height * (narrow ? 0.56 : 0.52);
    radius = Math.min(width * (narrow ? 0.64 : 0.29), height * 0.4);
    draw();
    checkVisibility();
  }

  function pointAt(event) {
    if (paused()) return;
    const rect = hero.getBoundingClientRect();
    pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / width * 2 - 1));
    pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / height * 2 - 1));
  }

  // Passive touch listeners preserve native scrolling; no pointer capture or drag trap.
  hero.addEventListener('pointermove', pointAt, { passive: true });
  hero.addEventListener('pointerdown', (event) => {
    if (paused() || event.target.closest('button, a, input, select, textarea')) return;
    pointAt(event);
    const rect = canvas.getBoundingClientRect();
    ripples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, started: time });
    if (ripples.length > 2) ripples.shift();
  }, { passive: true });
  const release = () => { pointer.targetX = pointer.targetY = 0; };
  hero.addEventListener('pointerleave', release, { passive: true });
  hero.addEventListener('pointercancel', release, { passive: true });
  hero.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') release();
  }, { passive: true });
  toggle.addEventListener('click', () => { choice = !paused(); sync(); });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; resize(); });
  if (reduced.addEventListener) reduced.addEventListener('change', sync);
  else if (reduced.addListener) reduced.addListener(sync);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    }).observe(hero);
  } else {
    window.addEventListener('scroll', checkVisibility, { passive: true });
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize, { passive: true });
  canvas.setAttribute('aria-hidden', 'true');
  resize();
  toggle.hidden = false;
})();
