/* A seeded, continuous field shared by WebGL and Canvas. Time never resets. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const smooth = (a, b, value) => ease((value - a) / (b - a));
  function rotation(target, x, y, z) {
    const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y);
    const cz = Math.cos(z), sz = Math.sin(z);
    target[0] = cz * cy; target[1] = sz * cy; target[2] = -sy;
    target[3] = cz * sy * sx - sz * cx; target[4] = sz * sy * sx + cz * cx; target[5] = cy * sx;
    target[6] = cz * sy * cx + sz * sx; target[7] = sz * sy * cx - cz * sx; target[8] = cy * cx;
  }
  function seedValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
    if (typeof value === 'string') {
      let hash = 2166136261;
      for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
      return hash >>> 0;
    }
    const random = new Uint32Array(1);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(random);
      return random[0];
    }
    return (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  }

  function createLearningEvolution(inputSeed) {
    const seed = seedValue(inputSeed);
    // Independent integer hashes avoid a periodic noise texture and mutable RNG state.
    function random(channel, knot) {
      let h = seed ^ Math.imul(channel + 1, 0x9e3779b1) ^ Math.imul(knot + 1, 0x85ebca6b);
      h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
      h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    // C2 interpolation: value, velocity and acceleration match at every knot.
    function noise(channel, time, spacing) {
      const position = time / spacing + random(channel, -1) * 17;
      const knot = Math.floor(position), f = ease(position - knot);
      const a = random(channel, knot), b = random(channel, knot + 1);
      return (a + (b - a) * f) * 2 - 1;
    }
    // Jittered absolute anchors permit O(1), history-independent time queries.
    // Adjacent pairs choose different forms, without imposing a repeating order.
    const anchorTime = index => 6.2 + index * 10.6 + (random(900, index) - 0.5) * 2.8;
    function anchorForm(index) {
      if (index === 0) return 1;
      if (index === 1) return random(901, 0) < 0.5 ? 0 : 2;
      const pair = Math.floor(index / 2);
      const base = Math.floor(random(902, pair) * 3);
      return (base + (index % 2) * (1 + Math.floor(random(903, pair) * 2))) % 3;
    }
    const firstArrival = anchorTime(0);
    const rates = new Float64Array(18);
    for (let b = 0; b < 6; b += 1) {
      rates[b] = 0.24 + random(950, b) * 0.15;
      rates[b + 6] = 1.46 + random(951, b) * 0.38;
      rates[b + 12] = 0.040 + (b < 3 ? 0 : 0.012) + b * 0.0008 + random(952, b) * 0.004;
    }

    function stateAt(inputTime, out = {}) {
      const time = Number.isFinite(inputTime) ? Math.max(0, inputTime) : 0;
      if (!out.view) out.view = new Float64Array(9);
      if (!out.currentRotation) out.currentRotation = new Float64Array(9);
      if (!out.apertureRotation) out.apertureRotation = new Float64Array(9);
      if (!out.canopyRotation) out.canopyRotation = new Float64Array(9);
      if (!out.sway) out.sway = new Float64Array(12);
      if (!out.bundlePhase) out.bundlePhase = new Float64Array(6);
      if (!out.pulsePhase) out.pulsePhase = new Float64Array(6);
      if (!out.flow) out.flow = new Float64Array(6);
      if (!out.guides) out.guides = new Float64Array(24);
      let from = 0, to = 1, blend;
      if (time < firstArrival) {
        blend = smooth(0.45, firstArrival, time);
      } else {
        let index = Math.max(0, Math.floor((time - 6.2) / 10.6));
        while (anchorTime(index + 1) <= time) index += 1;
        while (anchorTime(index) > time && index > 0) index -= 1;
        const start = anchorTime(index), end = anchorTime(index + 1);
        const hold = 0.20 + random(904, index) * 0.18;
        from = anchorForm(index); to = anchorForm(index + 1);
        blend = smooth(start + (end - start) * hold, end, time);
      }
      out.time = time;
      out.current = (from === 0 ? 1 - blend : 0) + (to === 0 ? blend : 0);
      out.aperture = (from === 1 ? 1 - blend : 0) + (to === 1 ? blend : 0);
      out.canopy = (from === 2 ? 1 - blend : 0) + (to === 2 ? blend : 0);
      out.closure = smooth(0.94, 1, out.aperture);
      out.currentWidth = 4.05 + noise(10, time, 21.7) * 0.34;
      out.currentLift = 0.43 + noise(11, time, 13.3) * 0.15;
      out.currentTwist = noise(12, time, 17.9) * 0.22;
      out.apertureRadius = 0.84 + noise(20, time, 18.3) * 0.13;
      out.apertureAspect = 1 + noise(21, time, 23.1) * 0.24;
      out.apertureBraid = 0.11 + noise(22, time, 12.7) * 0.045;
      out.apertureDepth = 0.20 + noise(23, time, 16.1) * 0.10;
      out.apertureShear = noise(24, time, 14.9) * 0.17;
      out.canopyReach = 1.95 + noise(30, time, 19.3) * 0.25;
      out.canopyLift = 1.67 + noise(31, time, 15.7) * 0.19;
      out.canopyCurl = 0.19 + noise(32, time, 11.9) * 0.09;
      out.canopySpread = 1 + noise(33, time, 22.9) * 0.17;
      rotation(out.view, noise(40, time, 23.7) * 0.13,
        noise(41, time, 29.3) * 0.20, noise(42, time, 31.7) * 0.15);
      rotation(out.currentRotation, noise(43, time, 18.1) * 0.09,
        0.05 + noise(44, time, 27.1) * 0.10, 0.12 + noise(45, time, 20.3) * 0.16);
      rotation(out.apertureRotation, 0.58 + noise(46, time, 24.1) * 0.27,
        -0.42 + noise(47, time, 26.3) * 0.24, -0.23 + noise(48, time, 19.9) * 0.24);
      rotation(out.canopyRotation, -0.12 + noise(49, time, 21.1) * 0.16,
        0.05 + noise(50, time, 28.7) * 0.16, -0.14 + noise(51, time, 25.9) * 0.18);
      for (let b = 0; b < 6; b += 1) {
        const channel = 100 + b * 12;
        out.bundlePhase[b] = time * rates[b] + noise(channel, time, 8.7 + b * 0.43) * 0.8;
        out.pulsePhase[b] = time * rates[b + 6] - b * 0.65 + noise(channel + 1, time, 5.9 + b * 0.37) * 0.7;
        out.flow[b] = time * rates[b + 12] + (noise(channel + 2, time, 10.3 + b * 0.29) + 1) * 0.035;
        out.sway[b * 2] = noise(channel + 3, time, 3.7 + b * 0.23) * 0.16;
        out.sway[b * 2 + 1] = noise(channel + 4, time, 4.3 + b * 0.31) * 0.14;
        const angle = (-1.19 + b * 0.48) * out.canopySpread + noise(channel + 5, time, 9.1 + b * 0.47) * 0.17;
        out.guides[b * 4] = Math.sin(angle);
        out.guides[b * 4 + 1] = Math.cos(angle);
        out.guides[b * 4 + 2] = Math.sin(b * 1.0472 + 0.5) * 0.42 + noise(channel + 6, time, 12.1 + b * 0.61) * 0.22;
        out.guides[b * 4 + 3] = 1 + noise(channel + 7, time, 10.7 + b * 0.41) * 0.12;
      }
      return out;
    }

    // Evaluate only the three shared lane samples per bundle; renderers interpolate fibers.
    function curve(u, lane, bundle, state, target, offset = 0) {
      const group = bundle * 0.2, sub = bundle % 3 - 1, side = bundle < 3 ? -1 : 1;
      const phi = u * TAU, slow = state.bundlePhase[bundle];
      const flutter = 0.014 * Math.sin(phi * 4 + lane * 1.8 + bundle * 1.6 - slow);
      const fine = 0.005 * Math.sin(phi * 7 + lane * 3 - slow * 0.8 + bundle);
      const thread = lane * (0.048 + 0.012 * Math.sin(phi + bundle)) + flutter + fine;
      let x = 0, y = 0, z = 0;
      if (state.current > 0) {
        const twist = phi * (0.85 + state.currentTwist) + side * 0.65 + slow * 0.45;
        const cross = thread + sub * 0.115;
        const px = (u - 0.5) * state.currentWidth;
        const py = state.currentLift * Math.sin(phi * 1.15 + side * 0.72 + sub * 0.12 + slow) +
          side * 0.22 + (u - 0.5) * 0.22 + cross * Math.cos(twist);
        const pz = 0.43 * Math.cos(phi * 1.35 + side * 0.6 + sub * 0.22 + slow * 0.8) + cross * Math.sin(twist);
        const r = state.currentRotation, w = state.current;
        x += (r[0] * px + r[3] * py + r[6] * pz) * w;
        y += (r[1] * px + r[4] * py + r[7] * pz) * w;
        z += (r[2] * px + r[5] * py + r[8] * pz) * w;
      }
      if (state.aperture > 0) {
        const braid = phi * 2 + bundle * 1.04719755 + slow * 0.7;
        const radius = state.apertureRadius + state.apertureBraid * Math.cos(braid) + thread * 0.72;
        const px = radius * Math.cos(phi) * state.apertureAspect + state.apertureShear * Math.sin(phi * 2 + slow * 0.2);
        const py = radius * Math.sin(phi), pz = state.apertureDepth * Math.sin(braid) + thread * 0.7;
        const r = state.apertureRotation, w = state.aperture;
        x += (r[0] * px + r[3] * py + r[6] * pz + 0.06) * w;
        y += (r[1] * px + r[4] * py + r[7] * pz + 0.04) * w;
        z += (r[2] * px + r[5] * py + r[8] * pz) * w;
      }
      if (state.canopy > 0) {
        const fork = smooth(0.18 + (sub + 1) * 0.105, 1, u);
        const reach = fork * state.canopyReach * state.guides[bundle * 4 + 3];
        const curl = Math.sin(u * Math.PI) * (state.canopyCurl + group * 0.08);
        const width = thread * (0.65 + fork * 1.15);
        const gx = state.guides[bundle * 4], gy = state.guides[bundle * 4 + 1];
        const px = gx * reach + gy * curl * side + width * gy + fork * state.sway[bundle * 2];
        const py = -0.80 + u * state.canopyLift + (gy - 1) * reach * 0.70 -
          gx * curl * side - width * gx + fork * state.sway[bundle * 2 + 1];
        const pz = state.guides[bundle * 4 + 2] * fork + 0.16 * Math.sin(phi * 0.65 + slow * 0.7 + bundle * 0.3) + width * 0.8;
        const r = state.canopyRotation, w = state.canopy;
        x += (r[0] * px + r[3] * py + r[6] * pz) * w;
        y += (r[1] * px + r[4] * py + r[7] * pz) * w;
        z += (r[2] * px + r[5] * py + r[8] * pz) * w;
      }
      x += flutter * 0.5; y += fine; z += flutter * 0.7;
      const v = state.view;
      target[offset] = v[0] * x + v[3] * y + v[6] * z;
      target[offset + 1] = v[1] * x + v[4] * y + v[7] * z;
      target[offset + 2] = v[2] * x + v[5] * y + v[8] * z;
      return target;
    }
    return Object.freeze({ seed, stateAt, curve });
  }

  window.createLearningEvolution = createLearningEvolution;
  if (!window.learningSocietyEvolution) window.learningSocietyEvolution = createLearningEvolution();
})();
