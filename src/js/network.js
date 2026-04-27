/* Background neural-network animation.

   A continuously alive network in the page background:
   - Each node breathes on its own sinusoidal phase (continuous activity).
   - Each node drifts gently in a Lissajous pattern (the network is alive).
   - Edges are quadratic Bézier curves with stable perpendicular offsets.
   - Spikes travel as sienna pulses along edges over ~1s; on arrival they
     trigger downstream spikes — cascading activity, like real brain waves.
   - Hebbian growth: edges that carry signals strengthen; unused edges decay.
   - Halos bloom around spiking nodes.

   Two-colour system: fountain-pen blue for structure, burnt sienna for the
   moving signal. */

(function () {
  console.log("[network] script loaded");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "network-bg";
  canvas.setAttribute("aria-hidden", "true");

  let ctx;
  try {
    ctx = canvas.getContext("2d", { alpha: true });
  } catch (err) {
    console.error("[network] getContext failed:", err);
    return;
  }
  if (!ctx) return;

  /* ---- state ---------------------------------------------------------- */

  let dpr = 1;
  let W = 0;
  let H = 0;
  let nodes = [];
  let edges = [];
  let pulses = [];
  let lastTime = 0;
  let rafId = 0;

  /* ---- tuning --------------------------------------------------------- */

  const NODE_COUNT_DESKTOP = 130;
  const NODE_COUNT_TABLET = 75;
  const EDGE_DISTANCE = 145;
  const MAX_NEIGHBORS = 4;

  const DRIFT_AMPLITUDE = 8;
  const DRIFT_RATE_MIN = 0.00018;
  const DRIFT_RATE_MAX = 0.00055;

  const PHASE_SPEED_MIN = 0.0008;
  const PHASE_SPEED_MAX = 0.0030;

  const SPIKE_PROB_PER_MS = 0.000035;
  const SPIKE_DECAY_RATE = 0.0015; // per ms

  const PULSE_DURATION_MS = 950;
  const PULSE_CASCADE_PROB = 0.55;
  const PULSE_DELIVERY_GAIN = 0.7;

  const HEBBIAN_GROWTH = 0.05;
  const STRENGTH_DECAY = 0.99935;

  const ACCENT_BLUE = "26, 58, 94";
  const ACCENT_WARM = "154, 58, 20";

  /* ---- setup ---------------------------------------------------------- */

  function nodeCountFor(w) {
    if (w < 700) return 0;
    if (w < 1100) return NODE_COUNT_TABLET;
    return NODE_COUNT_DESKTOP;
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    seed(nodeCountFor(W));
  }

  function seed(count) {
    pulses = [];
    nodes = new Array(count);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      nodes[i] = {
        x, y,
        baseX: x, baseY: y,
        driftPhaseX: Math.random() * Math.PI * 2,
        driftPhaseY: Math.random() * Math.PI * 2,
        driftSpeedX: DRIFT_RATE_MIN + Math.random() * (DRIFT_RATE_MAX - DRIFT_RATE_MIN),
        driftSpeedY: DRIFT_RATE_MIN + Math.random() * (DRIFT_RATE_MAX - DRIFT_RATE_MIN),
        omega: PHASE_SPEED_MIN + Math.random() * (PHASE_SPEED_MAX - PHASE_SPEED_MIN),
        phase: Math.random() * Math.PI * 2,
        spike: 0,
        baseSize: 1.0 + Math.random() * 1.6,
        edgeIndices: [],
      };
    }

    const built = new Set();
    edges = [];
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const candidates = [];
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = b.baseX - a.baseX;
        const dy = b.baseY - a.baseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < EDGE_DISTANCE * EDGE_DISTANCE) candidates.push({ j, d2 });
      }
      candidates.sort((p, q) => p.d2 - q.d2);
      const k = Math.min(candidates.length, MAX_NEIGHBORS);
      for (let n = 0; n < k; n++) {
        const j = candidates[n].j;
        const lo = Math.min(i, j), hi = Math.max(i, j);
        const key = lo * 100000 + hi;
        if (built.has(key)) continue;
        built.add(key);
        edges.push({
          a: lo,
          b: hi,
          strength: 0.16 + Math.random() * 0.18,
          curve: (Math.random() - 0.5) * 16, // signed perpendicular offset magnitude
        });
      }
    }
    // adjacency
    for (let e = 0; e < edges.length; e++) {
      nodes[edges[e].a].edgeIndices.push(e);
      nodes[edges[e].b].edgeIndices.push(e);
    }
  }

  /* ---- maths ---------------------------------------------------------- */

  function bezierAt(p0x, p0y, cx, cy, p1x, p1y, t) {
    const u = 1 - t;
    return {
      x: u * u * p0x + 2 * u * t * cx + t * t * p1x,
      y: u * u * p0y + 2 * u * t * cy + t * t * p1y,
    };
  }

  function controlPoint(a, b, curveAmount, out) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    out.x = (a.x + b.x) * 0.5 + px * curveAmount;
    out.y = (a.y + b.y) * 0.5 + py * curveAmount;
  }

  /* ---- spike + pulse spawn ------------------------------------------- */

  function spawnPulsesFrom(nodeIdx, intensity) {
    const n = nodes[nodeIdx];
    const list = n.edgeIndices;
    for (let k = 0; k < list.length; k++) {
      const eIdx = list[k];
      const edge = edges[eIdx];
      if (edge.strength < 0.10) continue;
      // Probability scales with edge strength
      if (Math.random() < edge.strength * 1.4) {
        pulses.push({
          edge: eIdx,
          t: 0,
          fromA: edge.a === nodeIdx,
          strength: 0.7 + Math.random() * 0.3 * intensity,
        });
      }
    }
  }

  function triggerSpike(nodeIdx, magnitude) {
    const n = nodes[nodeIdx];
    if (n.spike > 0.6) return; // already spiking
    n.spike = Math.max(n.spike, magnitude);
    spawnPulsesFrom(nodeIdx, magnitude);
  }

  /* ---- per-frame update ---------------------------------------------- */

  const ctrl = { x: 0, y: 0 };

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;

    // 1. Drift + phase + spike decay
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.driftPhaseX += n.driftSpeedX * dt;
      n.driftPhaseY += n.driftSpeedY * dt;
      n.x = n.baseX + Math.sin(n.driftPhaseX) * DRIFT_AMPLITUDE;
      n.y = n.baseY + Math.cos(n.driftPhaseY) * DRIFT_AMPLITUDE;
      n.phase += n.omega * dt;
      n.spike *= Math.exp(-SPIKE_DECAY_RATE * dt);
    }

    // 2. Spontaneous spikes
    const spikeChance = SPIKE_PROB_PER_MS * dt;
    for (let i = 0; i < nodes.length; i++) {
      if (Math.random() < spikeChance) {
        triggerSpike(i, 1.0);
      }
    }

    // 3. Advance pulses
    const surviving = [];
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      pulse.t += dt / PULSE_DURATION_MS;
      if (pulse.t >= 1) {
        // delivered
        const edge = edges[pulse.edge];
        const target = pulse.fromA ? edge.b : edge.a;
        // Hebbian
        edge.strength = Math.min(1, edge.strength + HEBBIAN_GROWTH * pulse.strength);
        // Cascade
        nodes[target].spike = Math.min(1, nodes[target].spike + pulse.strength * PULSE_DELIVERY_GAIN);
        if (Math.random() < PULSE_CASCADE_PROB * pulse.strength) {
          spawnPulsesFrom(target, pulse.strength);
        }
      } else {
        surviving.push(pulse);
      }
    }
    pulses = surviving;

    // 4. Edge decay
    for (let e = 0; e < edges.length; e++) {
      edges[e].strength *= STRENGTH_DECAY;
    }

    drawFrame();
    rafId = requestAnimationFrame(tick);
  }

  /* ---- render --------------------------------------------------------- */

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Edges — curved, soft, blue
    ctx.lineCap = "round";
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      if (edge.strength < 0.04) continue;
      const a = nodes[edge.a], b = nodes[edge.b];
      controlPoint(a, b, edge.curve, ctrl);
      const opacity = Math.min(0.50, edge.strength * 0.65);
      ctx.strokeStyle = `rgba(${ACCENT_BLUE}, ${opacity})`;
      ctx.lineWidth = 0.6 + edge.strength * 0.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y);
      ctx.stroke();
    }

    // Halos for spiking nodes (drawn before nodes so node sits on top)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.spike < 0.15) continue;
      const r = 6 + n.spike * 22;
      const opacity = n.spike * 0.16;
      ctx.fillStyle = `rgba(${ACCENT_WARM}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes — breathing brightness
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const osc = (Math.sin(n.phase) + 1) * 0.5; // 0..1
      const activity = 0.30 + 0.25 * osc + n.spike * 0.50;
      const size = n.baseSize + n.spike * 1.8;
      const opacity = 0.32 + activity * 0.50;
      ctx.fillStyle = `rgba(${ACCENT_BLUE}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pulses — sienna dots travelling along edges (with short trail)
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      const edge = edges[pulse.edge];
      const a = nodes[edge.a], b = nodes[edge.b];
      controlPoint(a, b, edge.curve, ctrl);
      const p0x = pulse.fromA ? a.x : b.x;
      const p0y = pulse.fromA ? a.y : b.y;
      const p1x = pulse.fromA ? b.x : a.x;
      const p1y = pulse.fromA ? b.y : a.y;

      // Trail of three positions
      for (let s = 0; s < 3; s++) {
        const tt = pulse.t - s * 0.05;
        if (tt < 0 || tt > 1) continue;
        const pos = bezierAt(p0x, p0y, ctrl.x, ctrl.y, p1x, p1y, tt);
        const trailAlpha = pulse.strength * (1 - s * 0.32);
        const trailSize = 2.6 - s * 0.55;
        ctx.fillStyle = `rgba(${ACCENT_WARM}, ${trailAlpha})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---- boot ----------------------------------------------------------- */

  function init() {
    resize();
    if (reducedMotion) {
      drawFrame();
      console.log("[network] reduced-motion: static render only");
      return;
    }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
    window.addEventListener("resize", debounce(resize, 200));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !rafId) {
        lastTime = 0; // reset dt accumulator
        rafId = requestAnimationFrame(tick);
      } else if (document.visibilityState !== "visible" && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    });
  }

  function attach() {
    if (!document.body) return;
    document.body.insertBefore(canvas, document.body.firstChild);
    console.log("[network] canvas attached, dim:", window.innerWidth, "x", window.innerHeight);
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
