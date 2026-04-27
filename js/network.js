/* Background neural-network animation — 3D, scroll-coupled rotation.

   Each node is a leaky integrate-and-fire neuron in 3D space. Membrane
   potential V accumulates from incoming pulses + Wiener noise; when V
   crosses threshold the cell fires (refractory period 320ms blocks
   re-firing). ~20% of nodes are inhibitory (their pulses subtract V
   from targets — cortical interneurons). Hebbian growth on successful
   pulse delivery; idle edges decay.

   3D: nodes positioned in a viewport-wide volume with depth ±300px.
   Edges connect by 3D Euclidean distance. Each frame the volume
   rotates: a constant X-tilt for depth visibility, plus a Y-rotation
   that lerps toward scrollY (so reading rotates the network). Render
   uses perspective projection — far nodes smaller and dimmer.

   Two-colour system: blue is structure, sienna is moving signal. */

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

  // Rotation state
  let targetYAngle = 0;
  let currentYAngle = 0;
  const X_TILT = 0.18; // constant ~10° forward tilt for 3D visibility
  const Y_SCROLL_RATIO = 0.00009; // rad per scroll px
  const Y_TIME_RATE = 0.000028; // rad per ms — gentle constant rotation
  const ANGLE_LERP = 0.07;

  // 3D depth
  const Z_RANGE = 320;
  const FOCAL = 850;

  /* ---- tuning (neural sim) ------------------------------------------- */

  const NODE_COUNT_DESKTOP = 220;
  const NODE_COUNT_TABLET = 130;
  const EDGE_DISTANCE = 145;
  const MAX_NEIGHBORS = 4;

  const INHIBITORY_FRACTION = 0.20;

  const DRIFT_AMPLITUDE = 6;
  const DRIFT_RATE_MIN = 0.00012;
  const DRIFT_RATE_MAX = 0.00040;

  const V_DECAY = 0.985;
  const V_NOISE = 0.0008;
  const THRESHOLD = 1.0;
  const REFRACTORY_MS = 320;

  const SPIKE_DECAY_RATE = 0.0035;
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
      // 3D position: x, y, z all randomised within volume
      const x = Math.random() * W;
      const y = Math.random() * H;
      // Gaussian-ish z (sum of three uniforms biases toward zero)
      const z = (Math.random() + Math.random() + Math.random() - 1.5) * Z_RANGE * 0.85;
      nodes[i] = {
        x3: x, y3: y, z3: z,             // current 3D
        baseX3: x, baseY3: y, baseZ3: z, // anchor for drift
        driftPhaseX: Math.random() * Math.PI * 2,
        driftPhaseY: Math.random() * Math.PI * 2,
        driftPhaseZ: Math.random() * Math.PI * 2,
        driftSpeedX: DRIFT_RATE_MIN + Math.random() * (DRIFT_RATE_MAX - DRIFT_RATE_MIN),
        driftSpeedY: DRIFT_RATE_MIN + Math.random() * (DRIFT_RATE_MAX - DRIFT_RATE_MIN),
        driftSpeedZ: DRIFT_RATE_MIN + Math.random() * (DRIFT_RATE_MAX - DRIFT_RATE_MIN),
        // Projected coords (computed each frame)
        px: 0, py: 0, scale: 1, depthFade: 1,
        // Neuron state
        V: Math.random() * 0.3,
        spike: 0,
        refractory: 0,
        baseSize: 1.1 + Math.random() * 1.5,
        inhibitory: Math.random() < INHIBITORY_FRACTION,
        edgeIndices: [],
      };
    }

    // Build edges by 3D proximity
    const built = new Set();
    edges = [];
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const candidates = [];
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = b.baseX3 - a.baseX3;
        const dy = b.baseY3 - a.baseY3;
        const dz = b.baseZ3 - a.baseZ3;
        const d2 = dx * dx + dy * dy + dz * dz;
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
        });
      }
    }
    for (let e = 0; e < edges.length; e++) {
      nodes[edges[e].a].edgeIndices.push(e);
      nodes[edges[e].b].edgeIndices.push(e);
    }
  }

  /* ---- 3D projection -------------------------------------------------- */

  function projectNode(n, cosY, sinY, cosX, sinX) {
    // Translate to center
    const cx = W * 0.5, cy = H * 0.5;
    const dx = n.x3 - cx;
    const dy = n.y3 - cy;
    const dz = n.z3;
    // Rotate around Y axis
    const x1 = dx * cosY + dz * sinY;
    const y1 = dy;
    const z1 = -dx * sinY + dz * cosY;
    // Rotate around X axis
    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;
    // Perspective project
    const scale = FOCAL / (FOCAL + z2);
    n.px = cx + x2 * scale;
    n.py = cy + y2 * scale;
    n.scale = scale;
    // Depth fade — far points dimmer (z2 large positive)
    // depthFade ranges from ~0.4 (far) to ~1.2 (near), clamp 0.35..1
    const df = (FOCAL * 0.6) / (FOCAL + z2);
    n.depthFade = Math.min(1, Math.max(0.30, df * 1.4));
  }

  /* ---- spike + pulse ------------------------------------------------- */

  function spawnPulsesFrom(nodeIdx) {
    const n = nodes[nodeIdx];
    const list = n.edgeIndices;
    for (let k = 0; k < list.length; k++) {
      const eIdx = list[k];
      const edge = edges[eIdx];
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

  /* ---- per-frame ------------------------------------------------------ */

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;

    // 1. Drift in 3D, leaky integrate-and-fire dynamics
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.driftPhaseX += n.driftSpeedX * dt;
      n.driftPhaseY += n.driftSpeedY * dt;
      n.driftPhaseZ += n.driftSpeedZ * dt;
      n.x3 = n.baseX3 + Math.sin(n.driftPhaseX) * DRIFT_AMPLITUDE;
      n.y3 = n.baseY3 + Math.cos(n.driftPhaseY) * DRIFT_AMPLITUDE;
      n.z3 = n.baseZ3 + Math.sin(n.driftPhaseZ) * DRIFT_AMPLITUDE * 0.6;

      n.spike *= Math.exp(-SPIKE_DECAY_RATE * dt);

      if (n.refractory > 0) {
        n.refractory -= dt;
        continue;
      }
      n.V += (Math.random() - 0.48) * V_NOISE * dt;
      n.V *= Math.pow(V_DECAY, dt / 16);
      if (n.V < 0) n.V = 0;
      if (n.V >= THRESHOLD) fire(i);
    }

    // 2. Pulses
    const surviving = [];
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      pulse.t += dt / PULSE_DURATION_MS;
      if (pulse.t >= 1) {
        const edge = edges[pulse.edge];
        const target = pulse.fromA ? edge.b : edge.a;
        const node = nodes[target];
        edge.strength = Math.min(1, edge.strength + HEBBIAN_GROWTH * pulse.strength);
        if (node.refractory <= 0) {
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

    // 3. Edge decay
    for (let e = 0; e < edges.length; e++) {
      edges[e].strength *= Math.pow(STRENGTH_DECAY, dt / 16);
    }

    // 4. Update rotation
    targetYAngle = window.scrollY * Y_SCROLL_RATIO + time * Y_TIME_RATE;
    currentYAngle += (targetYAngle - currentYAngle) * ANGLE_LERP;

    // 5. Project all nodes once
    const cosY = Math.cos(currentYAngle), sinY = Math.sin(currentYAngle);
    const cosX = Math.cos(X_TILT), sinX = Math.sin(X_TILT);
    for (let i = 0; i < nodes.length; i++) {
      projectNode(nodes[i], cosY, sinY, cosX, sinX);
    }

    drawFrame();
    rafId = requestAnimationFrame(tick);
  }

  /* ---- render --------------------------------------------------------- */

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    // Network elements are dialed back ~40% — text now reads over them
    // with the help of a small white text-shadow.

    // Edges
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      if (edge.strength < 0.03) continue;
      const a = nodes[edge.a], b = nodes[edge.b];
      const depthFade = (a.depthFade + b.depthFade) * 0.5;
      const opacity = Math.min(0.18, edge.strength * 0.24) * depthFade;
      ctx.strokeStyle = `rgba(${ACCENT_BLUE}, ${opacity})`;
      ctx.lineWidth = (0.5 + edge.strength * 0.3) * Math.min(1, depthFade + 0.2);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // Halos
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.spike < 0.35) continue;
      const r = (5 + n.spike * 9) * n.scale;
      const opacity = n.spike * 0.045 * n.depthFade;
      ctx.fillStyle = `rgba(${ACCENT_WARM}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const charge = Math.min(1, n.V / THRESHOLD);
      const activity = 0.18 + 0.18 * charge + n.spike * 0.35;
      const size = (n.baseSize + n.spike * 1.0) * n.scale;
      const opacity = (0.12 + activity * 0.30) * n.depthFade;
      ctx.fillStyle = `rgba(${ACCENT_BLUE}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pulses
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      const edge = edges[pulse.edge];
      const a = nodes[edge.a], b = nodes[edge.b];
      const fromA = pulse.fromA;
      const ax = fromA ? a.px : b.px, ay = fromA ? a.py : b.py;
      const bx = fromA ? b.px : a.px, by = fromA ? b.py : a.py;
      const aDF = fromA ? a.depthFade : b.depthFade;
      const bDF = fromA ? b.depthFade : a.depthFade;
      const aS = fromA ? a.scale : b.scale;
      const bS = fromA ? b.scale : a.scale;

      for (let s = 0; s < 2; s++) {
        const tt = pulse.t - s * 0.06;
        if (tt < 0 || tt > 1) continue;
        const px = ax + (bx - ax) * tt;
        const py = ay + (by - ay) * tt;
        const df = aDF + (bDF - aDF) * tt;
        const sc = aS + (bS - aS) * tt;
        const trailAlpha = pulse.strength * (1 - s * 0.50) * 0.42 * df;
        const trailSize = (1.8 - s * 0.6) * sc;
        ctx.fillStyle = `rgba(${ACCENT_WARM}, ${trailAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---- boot ----------------------------------------------------------- */

  function init() {
    resize();
    if (reducedMotion) {
      // Render once, no rotation, no rAF
      const cosY = 1, sinY = 0;
      const cosX = Math.cos(X_TILT), sinX = Math.sin(X_TILT);
      for (let i = 0; i < nodes.length; i++) {
        projectNode(nodes[i], cosY, sinY, cosX, sinX);
      }
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
