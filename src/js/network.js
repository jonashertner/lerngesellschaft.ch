/* Background neural-network animation.

   Integrate-and-fire neurons with refractory periods, Hebbian
   plasticity, and sparse activity — the most biologically accurate
   simulation we can render in real time at this scale.

   Each node is a leaky integrator with membrane potential V.
   Synaptic input from a pulse adds (or subtracts, for inhibitory
   edges) to V. When V crosses threshold the neuron spikes:
   V resets, refractory period engages, pulses emit on outgoing
   edges. While refractory, the cell ignores incoming pulses.

   ~20% of nodes are inhibitory (their outgoing pulses subtract V
   from targets), modelling cortical inhibition. Hebbian: edges
   that successfully deliver pulses strengthen.

   Two-colour system: fountain-pen blue is structure (substrate);
   burnt sienna is signal (electrochemical activity, transient). */

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

  const NODE_COUNT_DESKTOP = 200;
  const NODE_COUNT_TABLET = 110;
  const EDGE_DISTANCE = 130;
  const MAX_NEIGHBORS = 4;

  const INHIBITORY_FRACTION = 0.20; // ~20% of cells are inhibitory (cortical fraction)

  const DRIFT_AMPLITUDE = 6;
  const DRIFT_RATE_MIN = 0.00012;
  const DRIFT_RATE_MAX = 0.00040;

  // Membrane dynamics
  const V_DECAY = 0.985;          // per frame leak toward 0
  const V_NOISE = 0.0008;         // per-ms stochastic drive (random walk on V)
  const THRESHOLD = 1.0;
  const REFRACTORY_MS = 320;

  // Spike & pulse
  const SPIKE_DECAY_RATE = 0.0035; // per ms (visual decay only)
  const PULSE_DURATION_MS = 1100;
  const PULSE_DELIVERY_V = 0.55;
  const HEBBIAN_GROWTH = 0.025;
  const STRENGTH_DECAY = 0.99965;

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
        V: Math.random() * 0.3,
        spike: 0,
        refractory: 0,
        baseSize: 1.0 + Math.random() * 1.4,
        inhibitory: Math.random() < INHIBITORY_FRACTION,
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
          strength: 0.10 + Math.random() * 0.14,
          curve: (Math.random() - 0.5) * 14,
        });
      }
    }
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

  function spawnPulsesFrom(nodeIdx) {
    const n = nodes[nodeIdx];
    const list = n.edgeIndices;
    for (let k = 0; k < list.length; k++) {
      const eIdx = list[k];
      const edge = edges[eIdx];
      // Probability scales with edge strength; stronger edges fire reliably
      if (Math.random() < edge.strength * 1.6) {
        pulses.push({
          edge: eIdx,
          t: 0,
          fromA: edge.a === nodeIdx,
          inhibitory: n.inhibitory,
          strength: 0.6 + Math.random() * 0.3,
        });
      }
    }
  }

  function fire(nodeIdx) {
    const n = nodes[nodeIdx];
    n.spike = 1.0;
    n.V = 0;
    n.refractory = REFRACTORY_MS;
    spawnPulsesFrom(nodeIdx);
  }

  /* ---- per-frame update ---------------------------------------------- */

  const ctrl = { x: 0, y: 0 };

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;

    // 1. Drift, V leak, V noise drive, refractory countdown, spike decay
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.driftPhaseX += n.driftSpeedX * dt;
      n.driftPhaseY += n.driftSpeedY * dt;
      n.x = n.baseX + Math.sin(n.driftPhaseX) * DRIFT_AMPLITUDE;
      n.y = n.baseY + Math.cos(n.driftPhaseY) * DRIFT_AMPLITUDE;

      n.spike *= Math.exp(-SPIKE_DECAY_RATE * dt);

      if (n.refractory > 0) {
        n.refractory -= dt;
        continue; // refractory: ignore inputs, no integration
      }

      // Stochastic drift on V (Wiener-like noise — drives sparse spontaneous spikes)
      n.V += (Math.random() - 0.48) * V_NOISE * dt;
      // Leak
      n.V *= Math.pow(V_DECAY, dt / 16);
      if (n.V < 0) n.V = 0;
      // Threshold check
      if (n.V >= THRESHOLD) {
        fire(i);
      }
    }

    // 2. Advance pulses; deliveries
    const surviving = [];
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      pulse.t += dt / PULSE_DURATION_MS;
      if (pulse.t >= 1) {
        const edge = edges[pulse.edge];
        const target = pulse.fromA ? edge.b : edge.a;
        const node = nodes[target];
        // Hebbian growth applies regardless of refractory (the synapse remembers)
        edge.strength = Math.min(1, edge.strength + HEBBIAN_GROWTH * pulse.strength);
        if (node.refractory <= 0) {
          // Excitatory or inhibitory contribution to V
          const sign = pulse.inhibitory ? -1.0 : 1.0;
          node.V += sign * pulse.strength * PULSE_DELIVERY_V;
          if (node.V < 0) node.V = 0;
          if (node.V >= THRESHOLD) fire(target);
        }
      } else {
        surviving.push(pulse);
      }
    }
    pulses = surviving;

    // 3. Edge slow decay
    for (let e = 0; e < edges.length; e++) {
      edges[e].strength *= Math.pow(STRENGTH_DECAY, dt / 16);
    }

    drawFrame();
    rafId = requestAnimationFrame(tick);
  }

  /* ---- render --------------------------------------------------------- */

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Edges — soft, blue, low opacity
    ctx.lineCap = "round";
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      if (edge.strength < 0.03) continue;
      const a = nodes[edge.a], b = nodes[edge.b];
      controlPoint(a, b, edge.curve, ctrl);
      const opacity = Math.min(0.22, edge.strength * 0.30);
      ctx.strokeStyle = `rgba(${ACCENT_BLUE}, ${opacity})`;
      ctx.lineWidth = 0.5 + edge.strength * 0.3;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y);
      ctx.stroke();
    }

    // Halos (only for strong spikes; very faint)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.spike < 0.30) continue;
      const r = 5 + n.spike * 11;
      const opacity = n.spike * 0.06;
      ctx.fillStyle = `rgba(${ACCENT_WARM}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes — dim by default, brighter when V is high or spiking
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const charge = Math.min(1, n.V / THRESHOLD); // 0..1
      const activity = 0.18 + 0.18 * charge + n.spike * 0.35;
      const size = n.baseSize + n.spike * 1.2;
      const opacity = 0.15 + activity * 0.40;
      ctx.fillStyle = `rgba(${ACCENT_BLUE}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pulses — sienna; small dot with brief trail
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      const edge = edges[pulse.edge];
      const a = nodes[edge.a], b = nodes[edge.b];
      controlPoint(a, b, edge.curve, ctrl);
      const p0x = pulse.fromA ? a.x : b.x;
      const p0y = pulse.fromA ? a.y : b.y;
      const p1x = pulse.fromA ? b.x : a.x;
      const p1y = pulse.fromA ? b.y : a.y;
      // Tail of two positions
      for (let s = 0; s < 2; s++) {
        const tt = pulse.t - s * 0.05;
        if (tt < 0 || tt > 1) continue;
        const pos = bezierAt(p0x, p0y, ctrl.x, ctrl.y, p1x, p1y, tt);
        const trailAlpha = pulse.strength * (1 - s * 0.45) * 0.55;
        const trailSize = 2.0 - s * 0.55;
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
        lastTime = 0;
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
