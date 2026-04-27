/* Background neural-field animation - scientifically informed margin field.

   This is not an anatomical connectome. It is a quiet, legible abstraction of
   local cortical circuit dynamics:

   - neurons stay fixed in space; only voltage, spikes, and synapses change
   - ~80/20 excitatory/inhibitory cell balance
   - directed local small-world synapses, not undirected graph edges
   - leaky integrate-and-fire membrane voltage with rest, reset, threshold,
     refractory period, and spike-frequency adaptation
   - conductance-like EPSP/IPSP inputs with different decay constants
   - axonal propagation delay proportional to connection length
   - probabilistic transmitter release
   - spike-timing-dependent plasticity with slow homeostatic return

   Biological time is slowed for readability; relative dynamics are the point. */

(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "network-bg";
  canvas.setAttribute("aria-hidden", "true");

  let ctx;
  try {
    ctx = canvas.getContext("2d", { alpha: true });
  } catch (err) {
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
  let readingBand = { left: 0, right: 0 };
  let lastTime = 0;
  let modelTime = 0;
  let lastScrollY = 0;
  let scrollDrive = 0;
  let rafId = 0;

  /* ---- visual geometry ------------------------------------------------ */

  const NODE_COUNT_DESKTOP = 180;
  const NODE_COUNT_TABLET = 90;
  const READING_BAND_PAD = 30;
  const Z_RANGE = 300;
  const FOCAL = 900;

  const CLUSTER_SIZE = 22;
  const CLUSTER_SPREAD_X = 72;
  const CLUSTER_SPREAD_Y = 125;
  const CLUSTER_SPREAD_Z = 115;

  const ACCENT_BLUE = "26, 58, 94";
  const ACCENT_WARM = "154, 58, 20";

  /* ---- circuit model -------------------------------------------------- */

  const EXCITATORY_FRACTION = 0.80;
  const OUT_DEGREE_MIN = 2;
  const OUT_DEGREE_MAX = 5;
  const EDGE_DISTANCE = 170;
  const LONG_RANGE_CHANCE = 0.035;

  // Slow model time down so millisecond-scale dynamics remain visible.
  const MODEL_MS_PER_REAL_MS = 0.22;

  const V_REST = -70;
  const V_RESET = -65;
  const V_THRESHOLD = -50;
  const V_FLOOR = -85;
  const E_EXCITATORY = 0;
  const E_INHIBITORY = -80;

  const MEMBRANE_TAU_MS = 22;
  const EXC_DECAY_TAU_MS = 5;
  const INH_DECAY_TAU_MS = 12;
  const NOISE_TAU_MS = 90;
  const NOISE_SIGMA = 0.19;
  const REFRACTORY_MS = 4;
  const ADAPTATION_INC_MV = 2.8;
  const ADAPTATION_TAU_MS = 260;

  const BACKGROUND_INPUT_RATE_HZ = 0.85;
  const SCROLL_INPUT_RATE_HZ = 1.7;
  const BACKGROUND_EPSC = 0.24;
  const RELEASE_PROBABILITY = 0.82;

  const MIN_WEIGHT = 0.018;
  const MAX_WEIGHT = 0.160;
  const EXCITATORY_WEIGHT = 0.060;
  const INHIBITORY_WEIGHT = 0.082;
  const EXCITATORY_GAIN = 1.15;
  const INHIBITORY_GAIN = 1.25;
  const WEIGHT_RELAX_TAU_MS = 14000;

  const AXON_DELAY_BASE_MS = 360;
  const AXON_DELAY_PER_PX = 3.6;
  const MAX_PULSES = 260;

  const STDP_WINDOW_MS = 45;
  const STDP_TAU_MS = 18;
  const STDP_POTENTIATION = 0.010;
  const STDP_DEPRESSION = 0.012;

  /* ---- setup ---------------------------------------------------------- */

  function nodeCountFor(w) {
    if (w < 700) return 0;
    if (w < 1100) return NODE_COUNT_TABLET;
    return NODE_COUNT_DESKTOP;
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function updateReadingBand() {
    const body = document.body;
    const measure = document.querySelector(".document > p") || document.querySelector(".cover");
    if (!body || !measure) {
      readingBand = { left: W * 0.25, right: W * 0.75 };
      return;
    }
    const rect = measure.getBoundingClientRect();
    readingBand = {
      left: Math.max(0, rect.left - READING_BAND_PAD),
      right: Math.min(W, rect.right + READING_BAND_PAD),
    };
  }

  function inReadingBand(x) {
    return x > readingBand.left && x < readingBand.right;
  }

  function segmentCrossesReadingBand(x1, x2) {
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    return lo < readingBand.right && hi > readingBand.left;
  }

  function randomMarginX() {
    const leftMax = Math.max(0, readingBand.left);
    const rightMin = Math.min(W, readingBand.right);
    const leftWidth = leftMax;
    const rightWidth = Math.max(0, W - rightMin);

    if (leftWidth <= 0 && rightWidth <= 0) return Math.random() * W;
    if (leftWidth <= 0) return rightMin + Math.random() * rightWidth;
    if (rightWidth <= 0) return Math.random() * leftWidth;

    return Math.random() < leftWidth / (leftWidth + rightWidth)
      ? Math.random() * leftWidth
      : rightMin + Math.random() * rightWidth;
  }

  function marginXNear(x) {
    const pad = 12;
    if (x < readingBand.left) return clamp(x, pad, Math.max(pad, readingBand.left - pad));
    if (x > readingBand.right) return clamp(x, Math.min(W - pad, readingBand.right + pad), W - pad);
    return randomMarginX();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    updateReadingBand();
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    seed(nodeCountFor(W));
    lastTime = 0;
    modelTime = 0;
    lastScrollY = window.scrollY || 0;
    scrollDrive = 0;

    if (!nodes.length) {
      ctx.clearRect(0, 0, W, H);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }

    if (reducedMotion) {
      renderStatic();
    } else if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function seed(count) {
    pulses = [];
    edges = [];
    nodes = new Array(count);

    const clusterCount = Math.max(4, Math.round(count / CLUSTER_SIZE));
    const clusters = new Array(clusterCount);
    for (let c = 0; c < clusterCount; c++) {
      clusters[c] = {
        x: randomMarginX(),
        y: Math.random() * H,
        z: gaussian() * Z_RANGE * 0.28,
      };
    }

    for (let i = 0; i < count; i++) {
      const cluster = clusters[Math.floor(Math.random() * clusters.length)];
      const x = marginXNear(cluster.x + gaussian() * CLUSTER_SPREAD_X);
      const y = clamp(cluster.y + gaussian() * CLUSTER_SPREAD_Y, 0, H);
      const z = clamp(cluster.z + gaussian() * CLUSTER_SPREAD_Z, -Z_RANGE, Z_RANGE);
      const inhibitory = Math.random() > EXCITATORY_FRACTION;

      nodes[i] = {
        x3: x,
        y3: y,
        z3: z,
        px: 0,
        py: 0,
        scale: 1,
        depthFade: 1,
        V: V_REST + Math.random() * 8,
        ge: 0,
        gi: 0,
        noise: 0,
        adaptation: Math.random() * 1.5,
        refractory: Math.random() * REFRACTORY_MS,
        lastSpike: -Infinity,
        spike: 0,
        baseSize: inhibitory ? 1.05 + Math.random() * 0.9 : 1.25 + Math.random() * 1.25,
        inhibitory,
        incoming: [],
        outgoing: [],
      };
    }

    buildSynapses();
    projectAll();

    // A few initial spikes prevent the field from starting in total silence.
    const starters = Math.min(5, Math.floor(count * 0.04));
    for (let i = 0; i < starters; i++) {
      const idx = Math.floor(Math.random() * nodes.length);
      fire(idx, true);
    }
  }

  function distance3(a, b) {
    const dx = b.x3 - a.x3;
    const dy = b.y3 - a.y3;
    const dz = b.z3 - a.z3;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function buildSynapses() {
    const built = new Set();

    for (let pre = 0; pre < nodes.length; pre++) {
      const a = nodes[pre];
      const candidates = [];
      for (let post = 0; post < nodes.length; post++) {
        if (pre === post) continue;
        const b = nodes[post];
        const d = distance3(a, b);
        if (d < EDGE_DISTANCE || Math.random() < LONG_RANGE_CHANCE) {
          candidates.push({ post, d });
        }
      }

      candidates.sort((p, q) => p.d - q.d);
      const outDegree = OUT_DEGREE_MIN + Math.floor(Math.random() * (OUT_DEGREE_MAX - OUT_DEGREE_MIN + 1));
      let made = 0;

      for (let c = 0; c < candidates.length && made < outDegree; c++) {
        const post = candidates[c].post;
        const key = pre + ">" + post;
        if (built.has(key)) continue;

        const d = candidates[c].d;
        const localBias = Math.exp(-(d * d) / (2 * EDGE_DISTANCE * EDGE_DISTANCE));
        if (d > EDGE_DISTANCE && Math.random() > LONG_RANGE_CHANCE * localBias) continue;

        built.add(key);
        addSynapse(pre, post, d);
        made++;
      }
    }
  }

  function addSynapse(pre, post, distance) {
    const preNode = nodes[pre];
    const inhibitory = preNode.inhibitory;
    const baseline = inhibitory
      ? INHIBITORY_WEIGHT * (0.75 + Math.random() * 0.50)
      : EXCITATORY_WEIGHT * (0.75 + Math.random() * 0.50);
    const idx = edges.length;
    edges.push({
      pre,
      post,
      inhibitory,
      strength: clamp(baseline, MIN_WEIGHT, MAX_WEIGHT),
      baseline: clamp(baseline, MIN_WEIGHT, MAX_WEIGHT),
      delay: AXON_DELAY_BASE_MS + distance * AXON_DELAY_PER_PX + Math.random() * 120,
      lastArrival: -Infinity,
    });
    nodes[pre].outgoing.push(idx);
    nodes[post].incoming.push(idx);
  }

  /* ---- projection ----------------------------------------------------- */

  function projectNode(n) {
    const cx = W * 0.5;
    const cy = H * 0.5;
    const scale = FOCAL / (FOCAL + n.z3);
    n.px = cx + (n.x3 - cx) * scale;
    n.py = cy + (n.y3 - cy) * scale;
    n.scale = scale;
    const df = (FOCAL * 0.62) / (FOCAL + n.z3);
    n.depthFade = Math.min(1, Math.max(0.32, df * 1.35));
  }

  function projectAll() {
    for (let i = 0; i < nodes.length; i++) projectNode(nodes[i]);
  }

  /* ---- spikes, pulses, plasticity ------------------------------------ */

  function strengthen(edge, amount) {
    edge.strength = clamp(edge.strength + amount * (MAX_WEIGHT - edge.strength), MIN_WEIGHT, MAX_WEIGHT);
  }

  function weaken(edge, amount) {
    edge.strength = clamp(edge.strength - amount * (edge.strength - MIN_WEIGHT), MIN_WEIGHT, MAX_WEIGHT);
  }

  function applyPostSpikePlasticity(postIdx) {
    const post = nodes[postIdx];
    for (let i = 0; i < post.incoming.length; i++) {
      const edge = edges[post.incoming[i]];
      const dt = modelTime - edge.lastArrival;
      if (dt > 0 && dt < STDP_WINDOW_MS) {
        strengthen(edge, STDP_POTENTIATION * Math.exp(-dt / STDP_TAU_MS));
      }
    }
  }

  function fire(nodeIdx, seeded) {
    const n = nodes[nodeIdx];
    if (!seeded && n.refractory > 0) return;

    applyPostSpikePlasticity(nodeIdx);

    n.V = V_RESET;
    n.refractory = REFRACTORY_MS;
    n.adaptation += ADAPTATION_INC_MV;
    n.lastSpike = modelTime;
    n.spike = 1;

    for (let i = 0; i < n.outgoing.length; i++) {
      const edgeIdx = n.outgoing[i];
      if (pulses.length >= MAX_PULSES) break;
      if (Math.random() > RELEASE_PROBABILITY) continue;
      pulses.push({
        edge: edgeIdx,
        age: 0,
        strength: 0.82 + Math.random() * 0.28,
      });
    }
  }

  function deliverPulse(pulse) {
    const edge = edges[pulse.edge];
    const post = nodes[edge.post];
    const conductance = edge.strength * pulse.strength;

    edge.lastArrival = modelTime;

    if (edge.inhibitory) {
      post.gi += conductance * INHIBITORY_GAIN;
    } else {
      post.ge += conductance * EXCITATORY_GAIN;
    }

    const postBeforePre = modelTime - post.lastSpike;
    if (postBeforePre > 0 && postBeforePre < STDP_WINDOW_MS) {
      weaken(edge, STDP_DEPRESSION * Math.exp(-postBeforePre / STDP_TAU_MS));
    }
  }

  /* ---- per-frame ------------------------------------------------------ */

  function updateNode(n, idx, dt, bioDt, inputRateHz) {
    n.spike *= Math.exp(-dt / 170);
    n.adaptation *= Math.exp(-bioDt / ADAPTATION_TAU_MS);

    if (Math.random() < (inputRateHz * dt) / 1000) {
      n.ge += BACKGROUND_EPSC * (0.65 + Math.random() * 0.70);
    }

    n.ge *= Math.exp(-bioDt / EXC_DECAY_TAU_MS);
    n.gi *= Math.exp(-bioDt / INH_DECAY_TAU_MS);
    n.ge = Math.min(n.ge, 0.75);
    n.gi = Math.min(n.gi, 0.95);
    n.noise += (-n.noise * bioDt) / NOISE_TAU_MS + gaussian() * NOISE_SIGMA * Math.sqrt(Math.max(bioDt, 0.001));

    if (n.refractory > 0) {
      n.refractory -= bioDt;
      n.V = V_RESET;
      return;
    }

    const synapticDrive = n.ge * (E_EXCITATORY - n.V) + n.gi * (E_INHIBITORY - n.V);
    const leak = V_REST - n.V;
    n.V += ((leak + synapticDrive + n.noise) * bioDt) / MEMBRANE_TAU_MS;
    n.V = clamp(n.V, V_FLOOR, V_THRESHOLD + 8);

    if (n.V >= V_THRESHOLD + n.adaptation) {
      fire(idx, false);
    }
  }

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;
    const bioDt = dt * MODEL_MS_PER_REAL_MS;
    modelTime += bioDt;

    const scrollY = window.scrollY || 0;
    const scrollDelta = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    scrollDrive = scrollDrive * Math.exp(-dt / 420) + Math.min(1, scrollDelta / 260);
    const inputRateHz = BACKGROUND_INPUT_RATE_HZ + scrollDrive * SCROLL_INPUT_RATE_HZ;

    for (let i = 0; i < nodes.length; i++) {
      updateNode(nodes[i], i, dt, bioDt, inputRateHz);
    }

    const remaining = [];
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      pulse.age += dt;
      if (pulse.age >= edges[pulse.edge].delay) {
        deliverPulse(pulse);
      } else {
        remaining.push(pulse);
      }
    }
    pulses = remaining;

    const relax = 1 - Math.exp(-dt / WEIGHT_RELAX_TAU_MS);
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      edge.strength += (edge.baseline - edge.strength) * relax;
    }

    drawFrame();
    rafId = requestAnimationFrame(tick);
  }

  /* ---- render --------------------------------------------------------- */

  function signalColour(edge) {
    return edge.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      const pre = nodes[edge.pre];
      const post = nodes[edge.post];
      if (inReadingBand(pre.px) || inReadingBand(post.px) || segmentCrossesReadingBand(pre.px, post.px)) continue;

      const strengthNorm = (edge.strength - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
      const depthFade = (pre.depthFade + post.depthFade) * 0.5;
      const colour = edge.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const opacity = (0.030 + strengthNorm * 0.145) * depthFade * (edge.inhibitory ? 0.72 : 1);

      ctx.strokeStyle = `rgba(${colour}, ${opacity})`;
      ctx.lineWidth = (0.45 + strengthNorm * 0.55) * Math.min(1, depthFade + 0.15);
      ctx.beginPath();
      ctx.moveTo(pre.px, pre.py);
      ctx.lineTo(post.px, post.py);
      ctx.stroke();
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (inReadingBand(n.px) || n.spike < 0.24) continue;
      const colour = n.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const r = (5.2 + n.spike * 9.5) * n.scale;
      const opacity = n.spike * 0.052 * n.depthFade;
      ctx.fillStyle = `rgba(${colour}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (inReadingBand(n.px)) continue;
      const threshold = V_THRESHOLD + n.adaptation;
      const charge = clamp((n.V - V_REST) / (threshold - V_REST), 0, 1);
      const colour = n.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const size = (n.baseSize + n.spike * 1.05 + charge * 0.35) * n.scale;
      const opacity = (0.13 + charge * 0.12 + n.spike * 0.30) * n.depthFade * (n.inhibitory ? 0.86 : 1);

      ctx.fillStyle = `rgba(${colour}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      const edge = edges[pulse.edge];
      const pre = nodes[edge.pre];
      const post = nodes[edge.post];
      if (inReadingBand(pre.px) || inReadingBand(post.px) || segmentCrossesReadingBand(pre.px, post.px)) continue;

      const t = pulse.age / edge.delay;
      const colour = signalColour(edge);

      for (let s = 0; s < 2; s++) {
        const tt = t - s * 0.055;
        if (tt < 0 || tt > 1) continue;
        const px = pre.px + (post.px - pre.px) * tt;
        const py = pre.py + (post.py - pre.py) * tt;
        if (inReadingBand(px)) continue;

        const df = pre.depthFade + (post.depthFade - pre.depthFade) * tt;
        const sc = pre.scale + (post.scale - pre.scale) * tt;
        const alpha = pulse.strength * (1 - s * 0.52) * (edge.inhibitory ? 0.34 : 0.30) * df;
        const radius = (1.9 - s * 0.62) * sc;

        ctx.fillStyle = `rgba(${colour}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function renderStatic() {
    if (!nodes.length) return;
    projectAll();
    drawFrame();
  }

  /* ---- boot ----------------------------------------------------------- */

  function init() {
    window.addEventListener("resize", debounce(resize, 200));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && nodes.length && !reducedMotion && !rafId) {
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
      } else if (document.visibilityState !== "visible" && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    });
    resize();
  }

  function attach() {
    if (!document.body) return;
    document.body.insertBefore(canvas, document.body.firstChild);
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
