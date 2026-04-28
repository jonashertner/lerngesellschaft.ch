/* Background neural-field animation - scientifically informed margin field.

   This is not an anatomical connectome. It is a quiet, legible abstraction of
   local cortical circuit dynamics:

   - neurons stay fixed in space; only voltage, spikes, and synapses change
   - ~80/20 excitatory/inhibitory cell balance, following Dale's principle
   - six soft cortical depth layers and local dendritic/arbor fields
   - directed local small-world synapses, mostly hidden from view rather than
     drawn as a graph
   - Izhikevich regular-spiking excitatory cells and fast-spiking inhibitory
     interneurons, with reset and recovery variables
   - conductance-like EPSP/IPSP inputs with different decay constants
   - log-normal-ish synaptic weights and distance-based axonal delay
   - probabilistic transmitter release with short-term facilitation/depression
   - spike-timing-dependent plasticity with slow homeostatic return
   - theta/gamma-like rhythmic modulation of background input
   - slow spatial field waves that softly recruit nearby cells
   - scroll turns the 3D camera; it does not move neurons in model space

   Biological time is slowed for readability. Dendrites and neuropil are
   rendered as local fields, not individually simulated cable compartments;
   relative dynamics are the point. */

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
  let fieldWaves = [];
  let readingBand = { left: 0, right: 0 };
  let lastTime = 0;
  let modelTime = 0;
  let lastScrollY = 0;
  let scrollDrive = 0;
  let targetYaw = 0;
  let currentYaw = 0;
  let targetPitch = 0;
  let currentPitch = 0;
  let rhythmPhase = Math.random() * Math.PI * 2;
  let rhythmDrive = 1;
  let rafId = 0;

  /* ---- visual geometry ------------------------------------------------ */

  const NODE_COUNT_DESKTOP = 150;
  const NODE_COUNT_TABLET = 72;
  const READING_BAND_PAD = 30;
  const Z_RANGE = 300;
  const FOCAL = 900;

  const CLUSTER_SIZE = 22;
  const CLUSTER_SPREAD_X = 72;
  const CLUSTER_SPREAD_Y = 125;
  const CLUSTER_SPREAD_Z = 115;
  const CORTICAL_LAYERS = [
    { z: -190, spread: 28, weight: 0.06 },
    { z: -132, spread: 38, weight: 0.16 },
    { z: -68, spread: 43, weight: 0.23 },
    { z: 6, spread: 45, weight: 0.23 },
    { z: 86, spread: 45, weight: 0.18 },
    { z: 166, spread: 40, weight: 0.14 },
  ];

  const BASE_PITCH = 0.10;
  const SCROLL_YAW_RANGE = 0.62;
  const SCROLL_PITCH_RANGE = 0.13;
  const CAMERA_LERP = 0.065;

  const ACCENT_BLUE = "0, 126, 172";
  const ACCENT_WARM = "226, 94, 45";

  /* ---- circuit model -------------------------------------------------- */

  const EXCITATORY_FRACTION = 0.80;
  const OUT_DEGREE_MIN = 2;
  const OUT_DEGREE_MAX = 4;
  const EDGE_DISTANCE = 150;
  const LONG_RANGE_CHANCE = 0.026;

  // Slow model time down so millisecond-scale dynamics remain visible.
  const MODEL_MS_PER_REAL_MS = 0.22;
  const DISPLAY_MS_PER_MODEL_MS = 48;

  const REGULAR_SPIKING = { a: 0.02, b: 0.20, c: -65, d: 8, refractory: 3 };
  const FAST_SPIKING = { a: 0.10, b: 0.20, c: -65, d: 2, refractory: 2 };

  const V_REST = -70;
  const SPIKE_PEAK = 30;
  const V_FLOOR = -90;
  const E_EXCITATORY = 0;
  const E_INHIBITORY = -80;

  const EXC_DECAY_TAU_MS = 5;
  const INH_DECAY_TAU_MS = 10;
  const NOISE_TAU_MS = 80;
  const NOISE_SIGMA = 0.55;

  const BACKGROUND_INPUT_RATE_HZ = 0.82;
  const SCROLL_INPUT_RATE_HZ = 1.55;
  const BACKGROUND_EPSC = 0.052;
  const RELEASE_PROBABILITY = 0.68;
  const THETA_RATE_HZ = 6.0;
  const GAMMA_RATE_HZ = 42.0;
  const THETA_INPUT_DEPTH = 0.18;
  const GAMMA_INPUT_DEPTH = 0.045;
  const FIELD_WAVE_RATE_HZ = 0.14;
  const FIELD_WAVE_SCROLL_RATE_HZ = 0.34;
  const FIELD_WAVE_SPEED_PX_PER_S = 126;
  const FIELD_WAVE_WIDTH = 118;
  const FIELD_WAVE_MAX_AGE_MS = 4300;
  const FIELD_WAVE_DRIVE = 0.42;
  const MAX_FIELD_WAVES = 4;

  const MIN_WEIGHT = 0.006;
  const MAX_WEIGHT = 0.070;
  const EXCITATORY_WEIGHT = 0.022;
  const INHIBITORY_WEIGHT = 0.034;
  const EXCITATORY_GAIN = 1.05;
  const INHIBITORY_GAIN = 1.30;
  const WEIGHT_RELAX_TAU_MS = 14000;

  const AXON_DELAY_BASE_MS = 1.2;
  const AXON_DELAY_PER_PX = 0.018;
  const MAX_PULSES = 160;
  const VISIBLE_TRACE_DISTANCE = 118;
  const VISIBLE_TRACE_CHANCE = 0.115;
  const SHORT_TERM_RECOVERY_TAU_MS = 650;
  const SHORT_TERM_FACILITATION_TAU_MS = 180;
  const SHORT_TERM_FACILITATION_STEP = 0.055;

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

  function logNormal(mean, sigma) {
    return mean * Math.exp(gaussian() * sigma - 0.5 * sigma * sigma);
  }

  function randomLayerZ() {
    const layer = CORTICAL_LAYERS[chooseLayer()];
    return clamp(layer.z + gaussian() * layer.spread, -Z_RANGE, Z_RANGE);
  }

  function chooseLayer() {
    let r = Math.random();
    for (let i = 0; i < CORTICAL_LAYERS.length; i++) {
      r -= CORTICAL_LAYERS[i].weight;
      if (r <= 0) return i;
    }
    return CORTICAL_LAYERS.length - 1;
  }

  function layerOffset(layerIndex) {
    return layerIndex - (CORTICAL_LAYERS.length - 1) * 0.5;
  }

  function makeArbors(inhibitory, layerIndex) {
    const arbors = [];
    const basalCount = inhibitory ? 4 : 3 + Math.floor(Math.random() * 2);

    if (!inhibitory) {
      arbors.push({
        angle: -Math.PI / 2 + layerOffset(layerIndex) * 0.09 + gaussian() * 0.16,
        length: 34 + Math.random() * 36,
        curve: gaussian() * 9,
        forkAt: 0.54 + Math.random() * 0.22,
        forkAngle: (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.38),
        forkLength: 0.32 + Math.random() * 0.18,
        alpha: 1,
      });
    }

    for (let i = 0; i < basalCount; i++) {
      arbors.push({
        angle: Math.random() * Math.PI * 2,
        length: (inhibitory ? 15 : 20) + Math.random() * (inhibitory ? 17 : 24),
        curve: gaussian() * (inhibitory ? 6 : 8),
        forkAt: inhibitory ? 0 : 0.44 + Math.random() * 0.24,
        forkAngle: (Math.random() < 0.5 ? -1 : 1) * (0.50 + Math.random() * 0.42),
        forkLength: 0.24 + Math.random() * 0.16,
        alpha: inhibitory ? 0.76 : 0.58,
      });
    }

    return arbors;
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
    lastTime = 0;
    modelTime = 0;
    lastScrollY = window.scrollY || 0;
    scrollDrive = 0;
    updateCamera(true);
    seed(nodeCountFor(W));

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
    fieldWaves = [];
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
      const layerIndex = chooseLayer();
      const layer = CORTICAL_LAYERS[layerIndex];
      const x = marginXNear(cluster.x + gaussian() * CLUSTER_SPREAD_X);
      const y = clamp(cluster.y + gaussian() * CLUSTER_SPREAD_Y + layerOffset(layerIndex) * 6, 0, H);
      const z = clamp(
        layer.z + cluster.z * 0.22 + gaussian() * (layer.spread + CLUSTER_SPREAD_Z * 0.12),
        -Z_RANGE,
        Z_RANGE
      );
      const inhibitory = Math.random() > EXCITATORY_FRACTION;
      const cell = inhibitory ? FAST_SPIKING : REGULAR_SPIKING;
      const v0 = cell.c + Math.random() * 9;

      nodes[i] = {
        x3: x,
        y3: y,
        z3: z,
        px: 0,
        py: 0,
        scale: 1,
        depthFade: 1,
        V: v0,
        U: cell.b * v0,
        ge: 0,
        gi: 0,
        synGlowE: 0,
        synGlowI: 0,
        fieldGlow: 0,
        lifePhase: Math.random() * Math.PI * 2,
        noise: 0,
        bias: inhibitory ? 2.2 + Math.random() * 1.2 : 2.7 + Math.random() * 1.6,
        refractory: Math.random() * cell.refractory,
        lastSpike: -Infinity,
        spike: 0,
        baseSize: (inhibitory ? 1.05 + Math.random() * 0.9 : 1.25 + Math.random() * 1.25) *
          (0.96 + layerIndex * 0.025),
        inhibitory,
        layer: layerIndex,
        arbors: makeArbors(inhibitory, layerIndex),
        cell,
        incoming: [],
        outgoing: [],
      };
    }

    buildSynapses();
    projectAll();

    // Start with a soft ongoing field wave so the page never feels inert.
    if (count) {
      spawnFieldWave(0.55);
      fieldWaves[0].age = FIELD_WAVE_MAX_AGE_MS * (0.12 + Math.random() * 0.34);
    }

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
        const local = Math.exp(-(d * d) / (2 * EDGE_DISTANCE * EDGE_DISTANCE));
        const layerDistance = Math.abs(a.layer - b.layer);
        const laminarAffinity = layerDistance === 0 ? 1.16 : Math.exp(-layerDistance * 0.34);
        const inhibitoryLocality = a.inhibitory ? Math.exp(-layerDistance * 0.52) : 1;
        const weight = local * laminarAffinity * inhibitoryLocality + LONG_RANGE_CHANCE * 0.12;
        candidates.push({ post, d, weight });
      }

      const outDegree = OUT_DEGREE_MIN + Math.floor(Math.random() * (OUT_DEGREE_MAX - OUT_DEGREE_MIN + 1));
      let made = 0;

      while (candidates.length && made < outDegree) {
        const candidate = takeWeightedCandidate(candidates);
        if (!candidate) break;
        const key = pre + ">" + candidate.post;
        if (built.has(key)) continue;
        built.add(key);
        addSynapse(pre, candidate.post, candidate.d);
        made++;
      }
    }
  }

  function takeWeightedCandidate(candidates) {
    let total = 0;
    for (let i = 0; i < candidates.length; i++) total += candidates[i].weight;
    if (total <= 0) return candidates.pop();

    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= candidates[i].weight;
      if (r <= 0) return candidates.splice(i, 1)[0];
    }
    return candidates.pop();
  }

  function addSynapse(pre, post, distance) {
    const preNode = nodes[pre];
    const inhibitory = preNode.inhibitory;
    const baseline = inhibitory
      ? logNormal(INHIBITORY_WEIGHT, 0.42)
      : logNormal(EXCITATORY_WEIGHT, 0.48);
    const delay = AXON_DELAY_BASE_MS + distance * AXON_DELAY_PER_PX + Math.random() * 0.8;
    const releaseBaseline = inhibitory ? 0.24 + Math.random() * 0.08 : 0.17 + Math.random() * 0.07;
    const visibleChance = VISIBLE_TRACE_CHANCE * (inhibitory ? 0.55 : 1) * Math.exp(-distance / VISIBLE_TRACE_DISTANCE);
    const idx = edges.length;
    edges.push({
      pre,
      post,
      distance,
      inhibitory,
      strength: clamp(baseline, MIN_WEIGHT, MAX_WEIGHT),
      baseline: clamp(baseline, MIN_WEIGHT, MAX_WEIGHT),
      delay,
      displayDelay: delay * DISPLAY_MS_PER_MODEL_MS,
      lastArrival: -Infinity,
      release: releaseBaseline,
      releaseBaseline,
      resources: 0.88 + Math.random() * 0.12,
      bend: clamp(gaussian() * 0.42, -0.85, 0.85),
      visibleTrace: distance < VISIBLE_TRACE_DISTANCE && Math.random() < visibleChance,
      visualAlpha: 0.52 + Math.random() * 0.55,
    });
    nodes[pre].outgoing.push(idx);
    nodes[post].incoming.push(idx);
  }

  /* ---- projection ----------------------------------------------------- */

  function updateCamera(immediate) {
    const page = document.documentElement;
    const scrollable = Math.max(1, page.scrollHeight - H);
    const progress = clamp((window.scrollY || 0) / scrollable, 0, 1);
    targetYaw = progress * SCROLL_YAW_RANGE;
    targetPitch = BASE_PITCH + progress * SCROLL_PITCH_RANGE;

    if (immediate) {
      currentYaw = targetYaw;
      currentPitch = targetPitch;
    } else {
      currentYaw += (targetYaw - currentYaw) * CAMERA_LERP;
      currentPitch += (targetPitch - currentPitch) * CAMERA_LERP;
    }
  }

  function projectNode(n) {
    const cx = W * 0.5;
    const cy = H * 0.5;
    const dx = n.x3 - cx;
    const dy = n.y3 - cy;
    const dz = n.z3;

    const cosY = Math.cos(currentYaw);
    const sinY = Math.sin(currentYaw);
    const cosX = Math.cos(currentPitch);
    const sinX = Math.sin(currentPitch);

    const x1 = dx * cosY + dz * sinY;
    const y1 = dy;
    const z1 = -dx * sinY + dz * cosY;
    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;

    const scale = FOCAL / (FOCAL + z2);
    n.px = cx + x2 * scale;
    n.py = cy + y2 * scale;
    n.scale = scale;
    const df = (FOCAL * 0.62) / (FOCAL + z2);
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

    n.V = n.cell.c;
    n.U += n.cell.d;
    n.refractory = n.cell.refractory;
    n.lastSpike = modelTime;
    n.spike = 1;

    for (let i = 0; i < n.outgoing.length; i++) {
      const edgeIdx = n.outgoing[i];
      const edge = edges[edgeIdx];
      if (pulses.length >= MAX_PULSES) break;
      const releaseChance = RELEASE_PROBABILITY * clamp(edge.resources * (0.74 + edge.release), 0.08, 1.06);
      if (Math.random() > releaseChance) continue;
      const releaseStrength = (0.80 + Math.random() * 0.24) *
        (0.58 + edge.resources * 0.52) *
        (0.88 + edge.release * 0.34);
      edge.resources = clamp(edge.resources * (1 - edge.release * 0.74), 0.04, 1);
      edge.release = clamp(edge.release + (1 - edge.release) * SHORT_TERM_FACILITATION_STEP, 0, 1);
      pulses.push({
        edge: edgeIdx,
        age: 0,
        ageBio: 0,
        delivered: false,
        strength: releaseStrength,
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
      post.synGlowI += conductance * 1.9;
    } else {
      post.ge += conductance * EXCITATORY_GAIN;
      post.synGlowE += conductance * 1.6;
    }

    const postBeforePre = modelTime - post.lastSpike;
    if (postBeforePre > 0 && postBeforePre < STDP_WINDOW_MS) {
      weaken(edge, STDP_DEPRESSION * Math.exp(-postBeforePre / STDP_TAU_MS));
    }
  }

  /* ---- per-frame ------------------------------------------------------ */

  function spawnFieldWave(strength) {
    fieldWaves.push({
      x3: randomMarginX(),
      y3: H * (0.12 + Math.random() * 0.76),
      z3: randomLayerZ(),
      age: 0,
      strength: strength * (0.72 + Math.random() * 0.48),
      phase: Math.random() * Math.PI * 2,
    });

    while (fieldWaves.length > MAX_FIELD_WAVES) fieldWaves.shift();
  }

  function updateFieldWaves(dt) {
    const chance = (FIELD_WAVE_RATE_HZ + scrollDrive * FIELD_WAVE_SCROLL_RATE_HZ) * dt / 1000;
    if (fieldWaves.length < MAX_FIELD_WAVES && Math.random() < chance) {
      spawnFieldWave(0.78 + scrollDrive * 0.38);
    }

    const alive = [];
    for (let i = 0; i < fieldWaves.length; i++) {
      const wave = fieldWaves[i];
      wave.age += dt;
      if (wave.age < FIELD_WAVE_MAX_AGE_MS) alive.push(wave);
    }
    fieldWaves = alive;
  }

  function fieldWaveDrive(n) {
    let drive = 0;
    for (let i = 0; i < fieldWaves.length; i++) {
      const wave = fieldWaves[i];
      const dx = n.x3 - wave.x3;
      const dy = n.y3 - wave.y3;
      const dz = (n.z3 - wave.z3) * 0.62;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const radius = (wave.age / 1000) * FIELD_WAVE_SPEED_PX_PER_S;
      const shell = Math.exp(-Math.pow(distance - radius, 2) / (2 * FIELD_WAVE_WIDTH * FIELD_WAVE_WIDTH));
      const fade = Math.sin(Math.PI * clamp(wave.age / FIELD_WAVE_MAX_AGE_MS, 0, 1));
      drive += wave.strength * shell * fade;
    }
    return clamp(drive, 0, 1.35);
  }

  function lifeBreath(n, offset) {
    return 0.5 + 0.5 * Math.sin(modelTime * 0.0022 + n.lifePhase + n.layer * 0.42 + offset);
  }

  function updateRhythm() {
    const t = modelTime / 1000;
    const theta = Math.sin(Math.PI * 2 * THETA_RATE_HZ * t + rhythmPhase);
    const gamma = Math.sin(Math.PI * 2 * GAMMA_RATE_HZ * t + rhythmPhase * 0.37);
    rhythmDrive = clamp(1 + theta * THETA_INPUT_DEPTH + gamma * GAMMA_INPUT_DEPTH * (0.75 + theta * 0.25), 0.76, 1.26);
    return rhythmDrive;
  }

  function updateNode(n, idx, dt, bioDt, inputRateHz) {
    n.spike *= Math.exp(-dt / 280);
    n.synGlowE *= Math.exp(-dt / 280);
    n.synGlowI *= Math.exp(-dt / 340);
    n.fieldGlow *= Math.exp(-dt / 920);

    if (Math.random() < (inputRateHz * dt) / 1000) {
      n.ge += BACKGROUND_EPSC * (0.65 + Math.random() * 0.70);
    }

    const waveDrive = fieldWaveDrive(n);
    if (waveDrive > 0.001) {
      n.ge += BACKGROUND_EPSC * FIELD_WAVE_DRIVE * waveDrive;
      n.fieldGlow = Math.max(n.fieldGlow, waveDrive * 0.42);
      n.synGlowE += waveDrive * 0.010;
    }

    n.ge *= Math.exp(-bioDt / EXC_DECAY_TAU_MS);
    n.gi *= Math.exp(-bioDt / INH_DECAY_TAU_MS);
    n.ge = Math.min(n.ge, 0.75);
    n.gi = Math.min(n.gi, 0.95);
    n.noise += (-n.noise * bioDt) / NOISE_TAU_MS + gaussian() * NOISE_SIGMA * Math.sqrt(Math.max(bioDt, 0.001));

    if (n.refractory > 0) {
      n.refractory -= bioDt;
      return;
    }

    const steps = Math.max(1, Math.ceil(bioDt));
    const h = bioDt / steps;
    for (let step = 0; step < steps; step++) {
      const synapticDrive = n.ge * (E_EXCITATORY - n.V) + n.gi * (E_INHIBITORY - n.V);
      const dv = 0.04 * n.V * n.V + 5 * n.V + 140 - n.U + n.bias + synapticDrive + n.noise;
      const du = n.cell.a * (n.cell.b * n.V - n.U);
      n.V += dv * h;
      n.U += du * h;

      if (n.V >= SPIKE_PEAK) {
        fire(idx, false);
        break;
      }
      n.V = clamp(n.V, V_FLOOR, SPIKE_PEAK + 5);
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
    const inputRateHz = (BACKGROUND_INPUT_RATE_HZ + scrollDrive * SCROLL_INPUT_RATE_HZ) * updateRhythm();
    updateCamera(false);
    projectAll();
    updateFieldWaves(dt);

    for (let i = 0; i < nodes.length; i++) {
      updateNode(nodes[i], i, dt, bioDt, inputRateHz);
    }

    const remaining = [];
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      pulse.age += dt;
      pulse.ageBio += bioDt;
      if (!pulse.delivered && pulse.ageBio >= edges[pulse.edge].delay) {
        deliverPulse(pulse);
        pulse.delivered = true;
      }
      if (pulse.age < edges[pulse.edge].displayDelay) {
        remaining.push(pulse);
      }
    }
    pulses = remaining;

    const relax = 1 - Math.exp(-dt / WEIGHT_RELAX_TAU_MS);
    const recover = 1 - Math.exp(-bioDt / SHORT_TERM_RECOVERY_TAU_MS);
    const releaseRelax = 1 - Math.exp(-bioDt / SHORT_TERM_FACILITATION_TAU_MS);
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      edge.strength += (edge.baseline - edge.strength) * relax;
      edge.resources += (1 - edge.resources) * recover;
      edge.release += (edge.releaseBaseline - edge.release) * releaseRelax;
    }

    drawFrame();
    rafId = requestAnimationFrame(tick);
  }

  /* ---- render --------------------------------------------------------- */

  function edgeControl(pre, post, edge) {
    const mx = (pre.px + post.px) * 0.5;
    const my = (pre.py + post.py) * 0.5;
    const dx = post.px - pre.px;
    const dy = post.py - pre.py;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const bend = edge.bend * Math.min(54, len * 0.18);

    return {
      x: mx - (dy / len) * bend,
      y: my + (dx / len) * bend,
    };
  }

  function quadraticPoint(x1, y1, cx, cy, x2, y2, t) {
    const u = 1 - t;
    return {
      x: u * u * x1 + 2 * u * t * cx + t * t * x2,
      y: u * u * y1 + 2 * u * t * cy + t * t * y2,
    };
  }

  function drawNeuropilHaze() {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (inReadingBand(n.px)) continue;

      const charge = clamp((n.V - V_REST) / (SPIKE_PEAK - V_REST), 0, 1);
      const synGlow = clamp(n.synGlowE + n.synGlowI, 0, 0.32);
      const fieldGlow = clamp(n.fieldGlow, 0, 0.56);
      const breath = lifeBreath(n, 0);
      const colour = n.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const radius = (11 + n.baseSize * 4.6 + charge * 3.4 + synGlow * 11 + fieldGlow * 20 + n.spike * 3.5) * n.scale;
      const alpha = (0.0080 + breath * 0.0024 + charge * 0.0025 + synGlow * 0.014 + fieldGlow * 0.020 + n.spike * 0.0045) *
        n.depthFade *
        (n.inhibitory ? 0.72 : 1);

      const gradient = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, radius);
      gradient.addColorStop(0, `rgba(${colour}, ${alpha})`);
      gradient.addColorStop(0.48, `rgba(${colour}, ${alpha * 0.36})`);
      gradient.addColorStop(1, `rgba(${colour}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.px, n.py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawArbors() {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (inReadingBand(n.px)) continue;

      const charge = clamp((n.V - V_REST) / (SPIKE_PEAK - V_REST), 0, 1);
      const synGlow = clamp(n.synGlowE + n.synGlowI, 0, 0.28);
      const fieldGlow = clamp(n.fieldGlow, 0, 0.50);
      const breath = lifeBreath(n, 0.7);
      const colour = n.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const alphaBase = (n.inhibitory ? 0.043 : 0.037) *
        n.depthFade *
        (0.66 + breath * 0.12 + charge * 0.18 + n.spike * 0.24 + synGlow * 1.05 + fieldGlow * 0.82) *
        (0.94 + rhythmDrive * 0.06);

      for (let a = 0; a < n.arbors.length; a++) {
        const arbor = n.arbors[a];
        const sway = Math.sin(modelTime * 0.003 + n.lifePhase + a * 1.7) * (0.008 + fieldGlow * 0.020);
        const angle = arbor.angle + currentYaw * 0.30 - currentPitch * 0.10 + sway;
        const length = arbor.length * n.scale * (0.92 + breath * 0.020 + charge * 0.10 + fieldGlow * 0.045);
        const x2 = n.px + Math.cos(angle) * length;
        const y2 = n.py + Math.sin(angle) * length;

        if (inReadingBand(x2) || segmentCrossesReadingBand(n.px, x2)) continue;

        const cx = n.px + Math.cos(angle) * length * 0.52 - Math.sin(angle) * arbor.curve * n.scale;
        const cy = n.py + Math.sin(angle) * length * 0.52 + Math.cos(angle) * arbor.curve * n.scale;
        const alpha = alphaBase * arbor.alpha;

        ctx.strokeStyle = `rgba(${colour}, ${alpha})`;
        ctx.lineWidth = Math.max(0.26, (0.38 + n.spike * 0.04 + synGlow * 0.20) * n.scale);
        ctx.beginPath();
        ctx.moveTo(n.px, n.py);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();

        if (!arbor.forkAt) continue;

        const fork = quadraticPoint(n.px, n.py, cx, cy, x2, y2, arbor.forkAt);
        const forkAngle = angle + arbor.forkAngle;
        const fx2 = fork.x + Math.cos(forkAngle) * length * arbor.forkLength;
        const fy2 = fork.y + Math.sin(forkAngle) * length * arbor.forkLength;
        if (inReadingBand(fx2) || segmentCrossesReadingBand(fork.x, fx2)) continue;

        ctx.strokeStyle = `rgba(${colour}, ${alpha * 0.72})`;
        ctx.beginPath();
        ctx.moveTo(fork.x, fork.y);
        ctx.lineTo(fx2, fy2);
        ctx.stroke();
      }
    }
  }

  function signalColour(edge) {
    return edge.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    drawNeuropilHaze();

    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      if (!edge.visibleTrace) continue;
      const pre = nodes[edge.pre];
      const post = nodes[edge.post];
      if (inReadingBand(pre.px) || inReadingBand(post.px) || segmentCrossesReadingBand(pre.px, post.px)) continue;

      const strengthNorm = (edge.strength - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT);
      const depthFade = (pre.depthFade + post.depthFade) * 0.5;
      const colour = edge.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const opacity = (0.0055 + strengthNorm * 0.030) *
        depthFade *
        (edge.inhibitory ? 0.72 : 1) *
        (0.92 + rhythmDrive * 0.08) *
        edge.visualAlpha;
      const control = edgeControl(pre, post, edge);

      ctx.strokeStyle = `rgba(${colour}, ${opacity})`;
      ctx.lineWidth = (0.28 + strengthNorm * 0.25) * Math.min(1, depthFade + 0.15);
      ctx.beginPath();
      ctx.moveTo(pre.px, pre.py);
      ctx.quadraticCurveTo(control.x, control.y, post.px, post.py);
      ctx.stroke();
    }

    drawArbors();

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (inReadingBand(n.px) || n.spike < 0.24) continue;
      const colour = n.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const r = (3.8 + n.spike * 5.8) * n.scale;
      const opacity = n.spike * 0.011 * n.depthFade;
      ctx.fillStyle = `rgba(${colour}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (inReadingBand(n.px)) continue;
      const charge = clamp((n.V - V_REST) / (SPIKE_PEAK - V_REST), 0, 1);
      const synGlow = clamp(n.synGlowE + n.synGlowI, 0, 0.32);
      const fieldGlow = clamp(n.fieldGlow, 0, 0.48);
      const breath = lifeBreath(n, 1.4);
      const colour = n.inhibitory ? ACCENT_WARM : ACCENT_BLUE;
      const size = (n.baseSize * (0.80 + breath * 0.045) + n.spike * 0.42 + charge * 0.18 + synGlow * 0.36 + fieldGlow * 0.36) * n.scale;
      const opacity = (0.088 + breath * 0.024 + charge * 0.040 + n.spike * 0.046 + synGlow * 0.082 + fieldGlow * 0.085) *
        n.depthFade *
        (n.inhibitory ? 0.78 : 1);

      ctx.fillStyle = `rgba(${colour}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      const edge = edges[pulse.edge];
      if (!edge.visibleTrace) continue;
      const pre = nodes[edge.pre];
      const post = nodes[edge.post];
      if (inReadingBand(pre.px) || inReadingBand(post.px) || segmentCrossesReadingBand(pre.px, post.px)) continue;

      const t = pulse.age / edge.displayDelay;
      const colour = signalColour(edge);
      const control = edgeControl(pre, post, edge);

      for (let s = 0; s < 2; s++) {
        const tt = t - s * 0.055;
        if (tt < 0 || tt > 1) continue;
        const point = quadraticPoint(pre.px, pre.py, control.x, control.y, post.px, post.py, tt);
        if (inReadingBand(point.x)) continue;

        const df = pre.depthFade + (post.depthFade - pre.depthFade) * tt;
        const sc = pre.scale + (post.scale - pre.scale) * tt;
        const alpha = pulse.strength * (1 - s * 0.52) * (edge.inhibitory ? 0.062 : 0.052) * df;
        const radius = (1.18 - s * 0.42) * sc;

        ctx.fillStyle = `rgba(${colour}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
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
