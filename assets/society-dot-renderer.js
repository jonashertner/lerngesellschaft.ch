/* A dot-matrix butterfly, watched with curiosity, settles on Basel on a slowly turning Earth. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const randomSeed = new Uint32Array(1);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(randomSeed);
  else randomSeed[0] = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  const visitSeed = randomSeed[0];
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
  const mix = (a, b, u) => a + (b - a) * u;
  function hash(value) {
    let n = visitSeed ^ Math.imul(value + 1, 0x9e3779b1);
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function noise(channel, time, spacing) {
    const p = time / spacing + hash(channel + 1200) * 19, k = Math.floor(p);
    const a = hash(channel * 4099 + k), b = hash(channel * 4099 + k + 1);
    return (a + (b - a) * smooth(p - k)) * 2 - 1;
  }

  // Wing plane: x runs away from the body, y towards the head. A swept forewing
  // and a rounded hindwing stay separate lobes, with a clear seam between them.
  const FORE = [[0.045, 0.110], [0.250, 0.290], [0.560, 0.470], [0.820, 0.560], [0.975, 0.575], [1.020, 0.500],
    [0.995, 0.360], [0.900, 0.215], [0.720, 0.090], [0.470, 0.010], [0.220, -0.015], [0.045, 0.005]];
  const HIND = [[0.045, -0.050], [0.230, -0.085], [0.470, -0.130], [0.660, -0.215], [0.775, -0.350], [0.790, -0.500],
    [0.700, -0.660], [0.540, -0.770], [0.370, -0.790], [0.220, -0.700], [0.110, -0.520], [0.050, -0.300]];
  const spline = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t +
    (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  function closedCurve(points, steps) {
    const curve = [], n = points.length;
    for (let k = 0; k < n; k += 1) {
      const a = points[(k + n - 1) % n], b = points[k], c = points[(k + 1) % n], d = points[(k + 2) % n];
      for (let s = 0; s < steps; s += 1) {
        const t = s / steps;
        curve.push([spline(a[0], b[0], c[0], d[0], t), spline(a[1], b[1], c[1], d[1], t)]);
      }
    }
    return curve;
  }
  function signedDistance(curve, x, y) {
    let best = Infinity, inside = false;
    for (let i = 0, j = curve.length - 1; i < curve.length; j = i++) {
      const ax = curve[j][0], ay = curve[j][1], ex = curve[i][0] - ax, ey = curve[i][1] - ay;
      if ((ay > y) !== (curve[i][1] > y) && x < ex * (y - ay) / ey + ax) inside = !inside;
      const t = clamp(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey));
      best = Math.min(best, Math.hypot(x - ax - ex * t, y - ay - ey * t));
    }
    return inside ? best : -best;
  }
  function buildLobe(points, root, veins) {
    const curve = closedCurve(points, 10), box = [Infinity, Infinity, -Infinity, -Infinity];
    let reach = 0;
    for (const p of curve) {
      reach = Math.max(reach, Math.hypot(p[0] - root[0], p[1] - root[1]));
      box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]);
      box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]);
    }
    // Veins fan across the angle the outer wing actually spans, not the root.
    let low = Infinity, high = -Infinity;
    for (const p of curve) {
      if (Math.hypot(p[0] - root[0], p[1] - root[1]) < reach * 0.35) continue;
      const angle = Math.atan2(p[1] - root[1], p[0] - root[0]);
      low = Math.min(low, angle); high = Math.max(high, angle);
    }
    return { points, curve, root, reach, box, low, frequency: veins * TAU / (high - low) };
  }
  const lobes = [buildLobe(FORE, [0.03, 0.05], 6), buildLobe(HIND, [0.03, -0.08], 7)];

  // One fixed, evenly spaced lattice of wing samples serves every frame and both
  // sides. Even spacing in the wing plane is what makes the lit field uniform.
  const STEP = 0.0125, ROW = STEP * 0.866, HALO = 0.034;
  const built = { x: [], y: [], lobe: [], reach: [], tone: [], light: [] };
  lobes.forEach((lobe, id) => {
    let row = 0;
    for (let y = lobe.box[1] - HALO; y <= lobe.box[3] + HALO; y += ROW, row += 1) {
      for (let x = Math.max(0.012, lobe.box[0] - HALO) + (row % 2) * STEP / 2; x <= lobe.box[2] + HALO; x += STEP) {
        const d = signedDistance(lobe.curve, x, y);
        if (d < -HALO) continue;
        const dx = x - lobe.root[0], dy = y - lobe.root[1], u = clamp(Math.hypot(dx, dy) / lobe.reach);
        const wave = 0.5 + 0.5 * Math.cos((Math.atan2(dy, dx) - lobe.low) * lobe.frequency);
        const outer = smooth(u * 1.9 - 0.55);
        let tone = 0.02, light = 0.13 * (1 + d / HALO);
        if (d >= 0) {
          const margin = 1 - smooth(d / 0.15), rim = 1 - smooth(d / 0.055);
          const band = Math.exp(-(((d - 0.11) / 0.038) ** 2)) * outer;
          const vein = Math.pow(wave, 9) * smooth(u * 4 - 0.3);
          tone = clamp(0.05 + 0.58 * smooth(u * 1.2 - 0.12) + 0.37 * margin * outer);
          light = 0.64 + 0.2 * vein - 0.16 * band + 0.3 * rim * outer * (0.55 + 0.45 * (1 - wave));
        }
        built.x.push(x); built.y.push(y); built.lobe.push(id); built.reach.push(u);
        built.tone.push(tone); built.light.push(light);
      }
    }
  });
  const sampleCount = built.x.length;
  const sampleX = Float32Array.from(built.x), sampleY = Float32Array.from(built.y);
  const sampleLobe = Uint8Array.from(built.lobe), sampleReach = Float32Array.from(built.reach);
  const sampleTone = Float32Array.from(built.tone), sampleLight = Float32Array.from(built.light);

  // Twenty-five observed points: eleven on each side, three along the body.
  const WING_MARKS = [[0.93, 0.50, 0], [0.80, 0.40, 0], [0.62, 0.36, 0], [0.86, 0.26, 0], [0.45, 0.16, 0], [0.30, 0.20, 0],
    [0.70, -0.42, 1], [0.56, -0.66, 1], [0.34, -0.72, 1], [0.40, -0.30, 1], [0.20, -0.45, 1]];
  const BODY_MARKS = [[0, 0.02], [0, 0.17], [0, -0.48]];
  const MARKS = WING_MARKS.length * 2 + BODY_MARKS.length, WING_TOTAL = WING_MARKS.length * 2;
  const THORAX = WING_TOTAL, APEX = WING_MARKS.length;

  const EARTH = 1, RIGHT = 2, LEFT = 3, BODY = 4, LEVELS = 8;
  const hex = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  function ramp(stops) {
    const table = new Uint8Array(768);
    for (let i = 0; i < 256; i += 1) {
      const t = i / 255; let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k += 1;
      const a = stops[k], b = stops[k + 1], u = clamp((t - a[0]) / (b[0] - a[0]));
      const from = hex(a[1]), to = hex(b[1]);
      for (let c = 0; c < 3; c += 1) table[i * 3 + c] = Math.round(mix(from[c], to[c], u));
    }
    return table;
  }
  const ramps = [];
  ramps[EARTH] = ramp([[0, '#34496b'], [0.5, '#6d89a9'], [1, '#bccfe1']]);
  ramps[RIGHT] = ramp([[0, '#2c58da'], [0.38, '#4f70f3'], [0.62, '#8569f1'], [0.82, '#c27ff0'], [1, '#f4aee3']]);
  ramps[LEFT] = ramp([[0, '#1d6157'], [0.4, '#2f9c7e'], [0.75, '#63dcb1'], [1, '#caffea']]);
  ramps[BODY] = ramp([[0, '#3f64e6'], [0.5, '#a0b5ff'], [1, '#f2f5ff']]);
  const WHITE = [244, 246, 255], GOLD = [240, 194, 138], WARM = [255, 244, 226];

  window.createDotButterflyRenderer = function createDotButterflyRenderer(canvas, options) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas is required.');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('The dot field requires Canvas2D.');
    const words = options && options.words ? options.words : null;
    const upper = text => String(text || '').toLocaleUpperCase(options && options.language || undefined);
    const text = words ? { count: upper(words.count), beat: upper(words.beat), forewing: upper(words.forewing),
      hindwing: upper(words.hindwing), focus: upper(words.focus), place: upper(words.place) } : null;
    const stampCanvas = document.createElement('canvas'), stampContext = stampCanvas.getContext('2d');
    if (!stampContext) throw new Error('The dot stamps are unavailable.');

    const SPIN = TAU / 210, ARRIVAL = 7.5, REST_BEAT = 3.3, FLIGHT_BEAT = 1.6;
    // Münsterplatz 17, Basel (official building address register, WGS84).
    const LAT = 47.5566 * RAD, LON = 7.5911 * RAD;
    // The globe leans its north towards the viewer by exactly Basel's latitude,
    // so a resting place on that parallel faces us squarely at its meridian.
    const PITCH = LAT, ROLL = 0;
    // The butterfly rides with the Earth across the middle of the disc, then
    // flutters back to a new resting place further west on the same parallel.
    const RIDE = 30, HOP = 8, CYCLE = RIDE + HOP, LEAP = CYCLE * SPIN, HOP_BEATS = 3;
    const START = -RIDE * SPIN / 2 - LON - ARRIVAL * SPIN, STILL = ARRIVAL + RIDE / 2;
    const cosPitch = Math.cos(PITCH), sinPitch = Math.sin(PITCH), cosRoll = Math.cos(ROLL), sinRoll = Math.sin(ROLL);
    const cosLat = Math.cos(LAT), sinLat = Math.sin(LAT);
    const longitude = k => LON - k * LEAP;

    let disposed = false, width = 1, height = 1, ratio = 1;
    let device = 0, cell = 0, columns = 0, rows = 0, gridKey = '';
    let energy = new Float32Array(0), tones = new Float32Array(0), peak = new Float32Array(0);
    let ground = new Float32Array(0), groundTones = new Float32Array(0), flags = new Uint8Array(0);
    let kinds = new Uint8Array(0), active = new Uint32Array(0), masks = [];
    let activeCount = 0, minColumn = 0, maxColumn = -1, minRow = 0, maxRow = -1;
    let background = null, pixels = null, backgroundKey = '', previous = null, overlay = null;
    let scene = null, surfaceWeight = 0, metrics = {}, lit = 0;
    let m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1;
    let originX = 0, originY = 0, originZ = 0, PX = 0, PY = 0, PV = 1, WX = 0, WY = 0, WZ = 0;
    let phase = 0, opening = null, depth = 1, bodyLift = 0, bankSin = 0;
    const sidePhase = [0, 0], sideBend = [0, 0];
    const markX = new Float32Array(MARKS), markY = new Float32Array(MARKS), markSeen = new Float32Array(MARKS);
    let focusX = 0, focusY = 0, focusStrength = 0, focusReach = 1, pointerShare = 0;
    let burst = null;
    const widths = new Map();
    const forget = () => widths.clear();
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', forget);

    const earth = [];
    // Quantized Natural Earth coordinates are decoded once; no runtime map request.
    const encoded = window.societyEarthPoints;
    if (typeof encoded === 'string') {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      for (let i = 0; i + 4 < bytes.length; i += 5) {
        const lon = (view.getUint16(i, true) / 65535 * 360 - 180) * RAD;
        const lat = (view.getUint16(i + 2, true) / 65535 * 180 - 90) * RAD;
        earth.push([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon), bytes[i + 4]]);
      }
    }

    const multiply = (v, k) => v.map(n => n * k);
    // Spin about the axis, lean the north towards the viewer, then roll slightly.
    function turn(v, angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      const x = v[0] * c + v[2] * s, z = v[2] * c - v[0] * s;
      const y = v[1] * cosPitch - z * sinPitch, near = v[1] * sinPitch + z * cosPitch;
      return [x * cosRoll - y * sinRoll, x * sinRoll + y * cosRoll, near];
    }
    function quaternion(b) {
      const m00 = b[0][0], m11 = b[1][1], m22 = b[2][2], trace = m00 + m11 + m22;
      let q;
      if (trace > 0) {
        const d = Math.sqrt(trace + 1) * 2;
        q = [(b[1][2] - b[2][1]) / d, (b[2][0] - b[0][2]) / d, (b[0][1] - b[1][0]) / d, d / 4];
      } else {
        const i = m00 > m11 && m00 > m22 ? 0 : m11 > m22 ? 1 : 2, j = (i + 1) % 3, k = (i + 2) % 3;
        const d = Math.sqrt(1 + b[i][i] - b[j][j] - b[k][k]) * 2;
        q = [0, 0, 0, 0]; q[i] = d / 4;
        q[j] = (b[i][j] + b[j][i]) / d; q[k] = (b[i][k] + b[k][i]) / d;
        q[3] = (b[j][k] - b[k][j]) / d;
      }
      return q;
    }
    function blendFrame(a, b, u) {
      const qa = quaternion(a), qb = quaternion(b);
      let cos = qa.reduce((sum, v, i) => sum + v * qb[i], 0);
      if (cos < 0) { for (let i = 0; i < 4; i += 1) qb[i] *= -1; cos = -cos; }
      const angle = Math.acos(Math.min(1, cos)), sin = Math.sin(angle);
      const wa = sin < 0.001 ? 1 - u : Math.sin((1 - u) * angle) / sin;
      const wb = sin < 0.001 ? u : Math.sin(u * angle) / sin;
      const q = qa.map((v, i) => v * wa + qb[i] * wb), l = Math.hypot(...q);
      const [x, y, z, w] = q.map(v => v / l);
      return [[1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
        [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
        [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)]];
    }
    // Integral of the quintic smoothstep; its complement eases cruise to rest.
    function integral(q) { return q ** 4 * (2.5 + q * (-3 + q)); }
    function perch(k, angle) {
      const lon = longitude(k), c = Math.cos(lon), s = Math.sin(lon);
      const normal = turn([cosLat * s, sinLat, cosLat * c], angle);
      return { normal, frame: [turn([c, 0, -s], angle), turn([-sinLat * s, cosLat, -sinLat * c], angle), normal] };
    }
    function pose(time, elapsed, mobile, hero) {
      const radius = hero ? Math.min(width * (mobile ? 0.36 : 0.205), height * (mobile ? 0.39 : 0.38)) : Math.min(width * 0.28, height * 0.36);
      // On phones the globe sits lower and further right, so that the wings
      // emerge beside the second line of the headline instead of hiding behind it.
      const center = [width * (mobile ? 0.50 : 0.755), height * (mobile ? 0.52 : 0.50)];
      const angle = START + time * SPIN;
      // After the first landing in Basel, rides and short flights alternate.
      // Both resting places are evaluated at the current time, so every
      // take-off and touchdown stays attached to the turning surface.
      const since = Math.max(0, time - ARRIVAL), stop = hero ? Math.floor(since / CYCLE) : 0;
      const leap = hero ? smooth((since - stop * CYCLE - RIDE) / HOP) : 0, air = 4 * leap * (1 - leap);
      const here = perch(stop, angle);
      let normal = here.normal, landed = here.frame;
      if (leap > 0) {
        const there = perch(stop + 1, angle);
        normal = here.normal.map((v, i) => mix(v, there.normal[i], leap));
        const length = Math.hypot(...normal);
        normal = normal.map(v => v / length);
        landed = blendFrame(here.frame, there.frame, leap);
      }
      const u = clamp(elapsed / ARRIVAL), settle = smooth((elapsed - 3.6) / 3.9);
      const progress = u < 0.65 ? u / 0.825 : (0.65 + 0.35 * ((u - 0.65) / 0.35 - integral((u - 0.65) / 0.35))) / 0.825;
      const size = radius * (mobile ? 0.66 : 0.6) * (1.12 - 0.12 * smooth(u));
      const target = multiply(normal, radius + size * 0.07 + radius * 0.3 * air);
      target[0] += radius * 0.05 * Math.sin(time * 1.9 + 1) * air;
      target[1] += radius * 0.045 * Math.sin(time * 2.3) * air;
      const startX = mobile ? -radius * 1.15 : -radius * 1.65;
      const drift = (1 - smooth(u)) * (1 - settle);
      const wave = Math.sin(elapsed * 0.60 + hash(36) * TAU);
      const rise = Math.sin(elapsed * 0.48 + hash(37) * TAU);
      // Both endpoints are evaluated at the current time. The remaining flight
      // offset vanishes with zero first and second derivatives on touchdown.
      const position = [mix(startX, target[0], progress) + radius * wave * 0.11 * drift,
        target[1] + radius * (rise * 0.22 - 0.25) * (1 - progress),
        target[2] + radius * 0.85 * (1 - progress)];
      const bank = -0.24 * (1 - settle) + Math.cos(elapsed * 0.6 + hash(36) * TAU) * 0.12 * drift;
      const yaw = 0.16 * Math.sin(elapsed * 0.41) * (1 - settle);
      const airborne = [[Math.cos(bank) * Math.cos(yaw), Math.sin(bank) * Math.cos(yaw), -Math.sin(yaw)],
        [-Math.sin(bank), Math.cos(bank), 0], [Math.cos(bank) * Math.sin(yaw), Math.sin(bank) * Math.sin(yaw), Math.cos(yaw)]];
      if (!hero) {
        center[0] = width * 0.5; center[1] = height * 0.5;
        const still = [Math.sin(time * 0.37) * radius * 0.04, Math.sin(time * 0.29) * radius * 0.05, 0];
        return { radius, center, angle, position: still, basis: airborne, size: radius * 0.92, settle: 0, hero, normal, air: 0, leap: 0, stop: 0 };
      }
      return { radius, center, angle, position, basis: blendFrame(airborne, landed, settle), size, settle, hero, normal, air, leap, stop };
    }

    function beat(time, elapsed, flights) {
      const q = clamp((elapsed - 12) / 8);
      const extraBeat = Math.min(elapsed, 12) + 8 * (q - integral(q));
      return time * TAU / REST_BEAT + extraBeat * (TAU / FLIGHT_BEAT - TAU / REST_BEAT) + flights * HOP_BEATS * TAU +
        Math.sin(time * 0.63) * 0.14 + noise(28, time, 5.1) * 0.15;
    }
    function prepare(mobile) {
      const wanted = Math.max(mobile ? 3 : 3.6, scene.radius / 48);
      const next = Math.max(2, Math.round(wanted * ratio));
      const key = `${next}:${ratio}:${canvas.width}:${canvas.height}`;
      if (key === gridKey) return;
      gridKey = key; device = next; cell = device / ratio;
      columns = Math.ceil(canvas.width / device); rows = Math.ceil(canvas.height / device);
      const length = columns * rows;
      energy = new Float32Array(length); tones = new Float32Array(length); peak = new Float32Array(length);
      ground = new Float32Array(length); groundTones = new Float32Array(length); flags = new Uint8Array(length);
      kinds = new Uint8Array(length); active = new Uint32Array(length); activeCount = 0;
      // Every lit cell is a pixel-aligned rounded bar: a small dot when faint,
      // a tall dash when bright. Whole device pixels keep its edges crisp.
      stampCanvas.width = device; stampCanvas.height = device;
      masks = [];
      for (let level = 0; level < LEVELS; level += 1) {
        const f = level / (LEVELS - 1);
        const w = Math.max(1, Math.round(device * mix(0.3, 0.44, f))), h = Math.max(1, Math.round(device * mix(0.3, 0.8, f)));
        const x = Math.floor((device - w) / 2), y = Math.floor((device - h) / 2), r = Math.min(w, h) * 0.5;
        stampContext.clearRect(0, 0, device, device);
        stampContext.fillStyle = '#fff'; stampContext.beginPath();
        stampContext.moveTo(x + r, y); stampContext.arcTo(x + w, y, x + w, y + h, r);
        stampContext.arcTo(x + w, y + h, x, y + h, r); stampContext.arcTo(x, y + h, x, y, r);
        stampContext.arcTo(x, y, x + w, y, r); stampContext.closePath(); stampContext.fill();
        const source = stampContext.getImageData(0, 0, device, device).data;
        const mask = new Uint8Array(device * device);
        for (let i = 0; i < mask.length; i += 1) mask[i] = source[i * 4 + 3];
        masks.push(mask);
      }
      backgroundKey = '';
    }

    function deposit(column, row, value, tone, kind) {
      if (column < 0 || row < 0 || column >= columns || row >= rows || value <= 0.0001) return;
      const index = row * columns + column;
      if (!flags[index]) {
        flags[index] = 1; active[activeCount++] = index;
        if (column < minColumn) minColumn = column; if (column > maxColumn) maxColumn = column;
        if (row < minRow) minRow = row; if (row > maxRow) maxRow = row;
      }
      // The Earth is kept on its own layer; the butterfly always reads in front.
      if (kind === EARTH) { ground[index] += value; groundTones[index] += tone * value; return; }
      energy[index] += value; tones[index] += tone * value;
      if (value > peak[index]) { peak[index] = value; kinds[index] = kind; }
    }
    function stamp(px, py, light, tone, kind) {
      const column = px / cell - 0.5, row = py / cell - 0.5;
      const left = Math.floor(column), top = Math.floor(row), fx = column - left, fy = row - top;
      deposit(left, top, light * (1 - fx) * (1 - fy), tone, kind);
      deposit(left + 1, top, light * fx * (1 - fy), tone, kind);
      deposit(left, top + 1, light * (1 - fx) * fy, tone, kind);
      deposit(left + 1, top + 1, light * fx * fy, tone, kind);
    }
    // Body space to the screen. Anything behind the globe fades at its limb.
    function place(x, y, z) {
      const size = scene.size;
      const wx = originX + (m00 * x + m10 * y + m20 * z) * size;
      const wy = originY + (m01 * x + m11 * y + m21 * z) * size;
      const wz = originZ + (m02 * x + m12 * y + m22 * z) * size;
      PV = 1;
      if (scene.hero) {
        const inside = scene.radius * scene.radius - wx * wx - wy * wy;
        if (inside > 0) PV = smooth((wz - Math.sqrt(inside) + scene.radius * 0.012) / (scene.radius * 0.024));
      }
      PX = scene.center[0] + wx; PY = scene.center[1] - wy;
    }
    // The wings hinge along the body. Tips trail the stroke, the hindwing
    // follows the forewing, and the closing stroke is a little quicker.
    function wing(side, x, y, lobe) {
      const index = side < 0 ? 0 : 1, tip = x * x;
      const local = phase - tip * 0.72 - lobe * 0.14 + sidePhase[index];
      const fold = 0.5 - 0.5 * Math.cos(local + 0.18 * (1 - Math.cos(local)));
      const hinge = 0.06 + fold * depth + tip * x * sideBend[index];
      WX = side * x * Math.cos(hinge);
      WY = y + Math.sin(local - 0.65) * tip * x * 0.035 + bodyLift;
      WZ = x * Math.sin(hinge) * 0.58 + 0.02;
    }

    function drawEarth() {
      const { radius, center, angle } = scene;
      const c = Math.cos(angle), s = Math.sin(angle);
      const xx = cosRoll * c - sinRoll * sinPitch * s, xy = -sinRoll * cosPitch, xz = cosRoll * s + sinRoll * sinPitch * c;
      const yx = sinRoll * c + cosRoll * sinPitch * s, yy = cosRoll * cosPitch, yz = sinRoll * s - cosRoll * sinPitch * c;
      const zx = -cosPitch * s, zy = sinPitch, zz = cosPitch * c;
      for (let i = 0; i < earth.length; i += 1) {
        const p = earth[i], z = zx * p[0] + zy * p[1] + zz * p[2];
        if (z < -0.015) continue;
        const x = xx * p[0] + xy * p[1] + xz * p[2], y = yx * p[0] + yy * p[1] + yz * p[2];
        const sun = clamp(0.40 + (-x * 0.38 + y * 0.48 + z * 0.62) * 0.60);
        const edge = smooth((z + 0.015) / 0.12);
        const light = (p[3] === 2 ? 0.51 : p[3] === 1 ? 0.25 : 0.035) * (0.30 + sun * 0.70) * edge;
        stamp(center[0] + x * radius, center[1] - y * radius, light, p[3] === 2 ? 0.8 : 0.3, EARTH);
      }
      // Almost invisible parallels keep the turning readable over open ocean.
      for (let latitude = -60; latitude <= 60; latitude += 30) {
        const lat = latitude * RAD;
        for (let longitude = 0; longitude < 360; longitude += 2.8) {
          const lon = longitude * RAD;
          const p = turn([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)], angle);
          if (p[2] > 0) stamp(center[0] + p[0] * radius, center[1] - p[1] * radius, 0.035 * smooth(p[2] / 0.2), 0.2, EARTH);
        }
      }
    }
    function atmosphere() {
      const { radius, center } = scene;
      const halo = ctx.createRadialGradient(center[0], center[1], radius * 0.65, center[0], center[1], radius * 1.23);
      halo.addColorStop(0, '#14273a00'); halo.addColorStop(0.56, '#648cba07');
      halo.addColorStop(0.65, '#8ba6c112'); halo.addColorStop(0.73, '#648cba06'); halo.addColorStop(1, '#14273a00');
      ctx.fillStyle = halo; ctx.fillRect(center[0] - radius * 1.25, center[1] - radius * 1.25, radius * 2.5, radius * 2.5);
      ctx.beginPath(); ctx.arc(center[0], center[1], radius, 0, TAU);
      ctx.strokeStyle = '#8eabc221'; ctx.lineWidth = 0.65; ctx.stroke();
    }

    function drawButterfly(time) {
      // Each sample stands for the same patch of wing, so a covered cell
      // receives the same light at every size and on every screen.
      const share = STEP * ROW * scene.size * scene.size / (cell * cell);
      for (let side = -1; side <= 1; side += 2) {
        const kind = (side < 0) === scene.hero ? LEFT : RIGHT;
        for (let i = 0; i < sampleCount; i += 1) {
          const lobe = sampleLobe[i];
          wing(side, sampleX[i], sampleY[i], lobe);
          place(WX, WY, WZ);
          if (PV <= 0) continue;
          const travelling = 0.88 + 0.12 * Math.cos(sampleReach[i] * 5.2 - time * 1.45 - lobe * 1.3);
          stamp(PX, PY, sampleLight[i] * travelling * share * PV, sampleTone[i], kind);
        }
      }
      // A slender body: bright thorax, tapering abdomen, small head.
      const strand = 0.5 * scene.size / cell;
      for (let step = 0; step <= 64; step += 1) {
        const u = step / 64, y = -0.5 + u * 0.69;
        const girth = 0.008 + 0.022 * Math.exp(-(((y - 0.03) / 0.11) ** 2)) + 0.012 * Math.exp(-(((y - 0.165) / 0.03) ** 2));
        const tail = (1 - u) * (1 - u), sway = tail * bankSin * 0.025;
        for (let lane = -1; lane <= 1; lane += 1) {
          place(lane * girth + sway, y, 0.05 + tail * Math.sin(phase - 0.9) * 0.012);
          if (PV > 0) stamp(PX, PY, (lane ? 0.011 : 0.017) * strand * (0.55 + 0.45 * Math.sin(u * Math.PI)) * PV, 0.35 + 0.6 * smooth(u * 1.4 - 0.2), BODY);
        }
      }
      for (let side = -1, n = 0; side <= 1; side += 2) {
        for (let k = 0; k < WING_MARKS.length; k += 1, n += 1) {
          const mark = WING_MARKS[k];
          wing(side, mark[0], mark[1], mark[2]); place(WX, WY, WZ + 0.01);
          markX[n] = PX; markY[n] = PY; markSeen[n] = PV;
        }
      }
      for (let k = 0; k < BODY_MARKS.length; k += 1) {
        place(BODY_MARKS[k][0], BODY_MARKS[k][1], 0.06);
        markX[WING_TOTAL + k] = PX; markY[WING_TOTAL + k] = PY; markSeen[WING_TOTAL + k] = PV;
      }
    }

    // Curiosity wanders from one observed point to the next. A real pointer
    // takes over the moment it enters the stage and hands back when it leaves.
    function pick(k) {
      const raw = Math.floor(hash(9000 + k) * WING_TOTAL);
      return raw === Math.floor(hash(8999 + k) * WING_TOTAL) ? (raw + 9) % WING_TOTAL : raw;
    }
    function attend(time, elapsed, pointer, hero) {
      const beat = time / 3.8, k = Math.floor(beat), s = smooth((beat - k) / 0.42);
      const a = pick(k - 1), b = pick(k);
      let x = mix(markX[a], markX[b], s), y = mix(markY[a], markY[b], s);
      const present = markSeen[THORAX];
      if (hero) {
        // While Basel is on the far side, curiosity explores the visible Earth.
        const r0 = Math.sqrt(hash(7000 + k - 1)) * 0.62, a0 = hash(7100 + k - 1) * TAU;
        const r1 = Math.sqrt(hash(7000 + k)) * 0.62, a1 = hash(7100 + k) * TAU;
        const gx = scene.center[0] + scene.radius * mix(r0 * Math.cos(a0), r1 * Math.cos(a1), s);
        const gy = scene.center[1] + scene.radius * mix(r0 * Math.sin(a0), r1 * Math.sin(a1), s);
        const onWing = smooth(present * 1.6 - 0.3);
        x = mix(gx, x, onWing); y = mix(gy, y, onWing);
      }
      let strength = hero ? smooth((elapsed - 4.8) / 2.8) : 0.7;
      pointerShare = pointer && Number.isFinite(pointer.strength) ? clamp(pointer.strength) : 0;
      if (pointerShare > 0.001) {
        x = mix(x, (pointer.x + 1) * width / 2, pointerShare);
        y = mix(y, (pointer.y + 1) * height / 2, pointerShare);
        strength = mix(strength, 1, pointerShare);
      }
      focusX = x; focusY = y; focusStrength = strength; focusReach = scene.size * 0.2;
    }

    function composite(time) {
      const stride = canvas.width, limit = canvas.height, data = pixels.data, base = background.data;
      const now = activeCount ? [minColumn * device, minRow * device, Math.min(stride, (maxColumn + 1) * device), Math.min(limit, (maxRow + 1) * device)] : null;
      let area = now;
      if (!previous) area = [0, 0, stride, limit];
      else if (previous.length && now) area = [Math.min(now[0], previous[0]), Math.min(now[1], previous[1]), Math.max(now[2], previous[2]), Math.max(now[3], previous[3])];
      else if (previous.length) area = previous;
      if (!area) { previous = []; return; }
      for (let y = area[1]; y < area[3]; y += 1) {
        const from = (y * stride + area[0]) * 4, to = (y * stride + area[2]) * 4;
        data.set(base.subarray(from, to), from);
      }
      const reach = 1 / (2 * focusReach * focusReach), ring = TAU / (focusReach * 0.9);
      const burstX = burst ? (burst.x + 1) * width / 2 : 0, burstY = burst ? (burst.y + 1) * height / 2 : 0;
      const wake = burst && burst.age >= 0 && burst.age < 4;
      lit = 0;
      for (let item = 0; item < activeCount; item += 1) {
        const index = active[item], winged = energy[index] > 0.05;
        const kind = winged ? kinds[index] : EARTH;
        const column = index % columns, row = (index - column) / columns;
        let value = winged ? energy[index] : ground[index];
        if (value <= 0) continue;
        const tone = (winged ? tones[index] : groundTones[index]) / value, grain = hash(index + 2000);
        const cx = (column + 0.5) * cell, cy = (row + 0.5) * cell;
        const dx = cx - focusX, dy = cy - focusY, far = dx * dx + dy * dy;
        let heat = focusStrength * Math.exp(-far * reach), ripple = 0.5;
        if (heat > 0.004) ripple = 0.5 + 0.5 * Math.cos(Math.sqrt(far) * ring - time * 2.6);
        if (wake) {
          const front = Math.hypot(cx - burstX, cy - burstY) / scene.radius - burst.age * 0.7;
          heat = Math.max(heat, Math.exp(-front * front * 40 - burst.age * 0.8));
        }
        let alpha, level, red, green, blue;
        if (kind === EARTH) {
          const glow = value / (value + 0.44) * (1 + heat * 1.3);
          alpha = Math.min(0.5 + heat * 0.35, glow * 0.62); level = Math.min(1.2 + heat * 2.5, glow * 2.6);
          const shade = Math.min(255, Math.round(clamp(glow * 1.7 * (0.55 + 0.45 * tone)) * 255)) * 3, table = ramps[EARTH];
          red = table[shade]; green = table[shade + 1]; blue = table[shade + 2];
          heat *= 0.55;
        } else {
          // The left wing is still being worked out: a sparse sketch that
          // resolves into the full pattern wherever curiosity rests.
          if (kind === LEFT) value *= mix(grain < 0.4 ? 0.2 : grain < 0.74 ? 0.48 : 1, 1, clamp(heat * 1.8));
          else if (kind === RIGHT) value *= 0.92 + 0.16 * grain;
          const spark = grain > 0.93 ? Math.pow(Math.max(0, Math.sin(time * 1.3 + grain * 400)), 24) * 0.55 : 0;
          value = value * (1 + heat * 0.5) + spark * Math.min(1, value * 2);
          alpha = clamp(0.12 + value * 1.45); level = clamp((value - 0.1) * 1.35) * (LEVELS - 1);
          // Attention first brightens a wing in its own colours; only the
          // very centre of the glow turns warm.
          const lift = clamp(heat * 1.2);
          const shade = Math.round(clamp(tone + lift * 0.45) * 255) * 3, table = ramps[kind] || ramps[BODY];
          const pale = clamp((value - 0.82) * 1.3 + lift * 0.3);
          heat = smooth((heat - 0.4) / 0.45) * 0.75;
          red = table[shade] + (WHITE[0] - table[shade]) * pale;
          green = table[shade + 1] + (WHITE[1] - table[shade + 1]) * pale;
          blue = table[shade + 2] + (WHITE[2] - table[shade + 2]) * pale;
        }
        if (heat > 0.004) {
          const warm = clamp(heat * 0.8);
          const glow = 0.45 + 0.55 * ripple;
          red += (mix(GOLD[0], WARM[0], glow) - red) * warm;
          green += (mix(GOLD[1], WARM[1], glow) - green) * warm;
          blue += (mix(GOLD[2], WARM[2], glow) - blue) * warm;
        }
        if (alpha < 0.02) continue;
        const low = Math.floor(level), blend = level - low;
        const first = masks[low], second = masks[Math.min(LEVELS - 1, low + 1)];
        const left = column * device, top = row * device;
        const spanY = Math.min(device, limit - top), spanX = Math.min(device, stride - left);
        // Bright cells also lend a little light to their whole cell.
        const bloom = kind === EARTH ? 0 : clamp((alpha * Math.min(1.3, value) - 0.55) * 0.34);
        const strength = alpha / 255;
        for (let y = 0; y < spanY; y += 1) {
          let target = ((top + y) * stride + left) * 4, source = y * device;
          for (let x = 0; x < spanX; x += 1, target += 4, source += 1) {
            const cover = Math.min(1, (first[source] + (second[source] - first[source]) * blend) * strength + bloom);
            if (cover < 0.003) continue;
            data[target] += (red - data[target]) * cover;
            data[target + 1] += (green - data[target + 1]) * cover;
            data[target + 2] += (blue - data[target + 2]) * cover;
          }
        }
        lit += 1;
      }
      ctx.putImageData(pixels, 0, 0, area[0], area[1], area[2] - area[0], area[3] - area[1]);
      previous = now || [];
    }

    // The observation layer: vector hairlines and small labels over the dots.
    function touch(x, y, pad) {
      if (!overlay) overlay = [x - pad, y - pad, x + pad, y + pad];
      else {
        overlay[0] = Math.min(overlay[0], x - pad); overlay[1] = Math.min(overlay[1], y - pad);
        overlay[2] = Math.max(overlay[2], x + pad); overlay[3] = Math.max(overlay[3], y + pad);
      }
    }
    const crisp = value => (Math.round(value * ratio) + (ratio < 1.5 ? 0.5 : 0)) / ratio;
    function line(x1, y1, x2, y2, color, alpha, weight) {
      if (alpha < 0.01) return;
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = weight;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      touch(x1, y1, 2); touch(x2, y2, 2);
    }
    function frame(x, y, w, h, color, alpha, weight) {
      if (alpha < 0.01) return;
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = weight;
      ctx.strokeRect(crisp(x), crisp(y), Math.round(w), Math.round(h));
      touch(x, y, 3); touch(x + w, y + h, 3);
    }
    const TRACKING = 1.15, FONT = '500 9.5px Hanken, Arial, sans-serif';
    function measure(label) {
      let total = 0;
      for (const letter of label) {
        let w = widths.get(letter);
        if (w === undefined) { w = ctx.measureText(letter).width; widths.set(letter, w); }
        total += w + TRACKING;
      }
      return total - TRACKING;
    }
    function write(label, x, y) {
      for (const letter of label) { ctx.fillText(letter, x, y); x += widths.get(letter) + TRACKING; }
    }
    // A small bordered plate, as on a specimen drawing. Returns its width.
    function plate(lines, x, y, alpha, accent) {
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      let w = 0;
      for (const entry of lines) w = Math.max(w, measure(entry));
      w = Math.ceil(w + 12);
      const h = lines.length * 13 + 5;
      if (alpha < 0.01) return w;
      x = crisp(Math.max(6, Math.min(width - w - 6, x))); y = crisp(Math.max(6, Math.min(height - h - 6, y)));
      ctx.globalAlpha = alpha * 0.82; ctx.fillStyle = '#080e20'; ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = alpha * (accent ? 0.9 : 0.5); ctx.strokeStyle = accent || '#c8d5ea'; ctx.lineWidth = 1 / Math.min(ratio, 2) * (ratio < 1.5 ? 1 : 1.5);
      ctx.strokeRect(x, y, w, h);
      lines.forEach((entry, n) => {
        ctx.globalAlpha = alpha * (n ? 0.66 : 0.96); ctx.fillStyle = accent && !n ? accent : '#dfe7f5';
        write(entry, x + 6, y + 9.5 + n * 13);
      });
      touch(x, y, 3); touch(x + w, y + h, 3);
      return w;
    }
    const fixed = [];
    const clear = (x, y, w, h) => fixed.every(box => x > box[0] + box[2] + 8 || x + w < box[0] - 8 || y > box[1] + box[3] + 8 || y + h < box[1] - 8);
    function observe(elapsed, mobile, hero) {
      overlay = null; fixed.length = 0;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const size = scene.size, present = markSeen[THORAX];
      const company = (hero ? 0.55 + 0.45 * scene.settle : 0.8) * (mobile ? 0.8 : 1);
      const thoraxX = markX[THORAX], thoraxY = markY[THORAX];
      const hair = mobile ? 0.6 : 0.75;
      // Two antennae stay smooth curves, as a pencil would draw them.
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        let seen = 1, tipX = 0, tipY = 0;
        for (let step = 0; step <= 14; step += 1) {
          const u = step / 14, curl = Math.sin(u * Math.PI * 0.75);
          const flex = u * u * (Math.sin(metrics.time * 1.8 + side * 0.4) * 0.008 + bankSin * 0.02);
          place(side * (0.012 + u * 0.135 + curl * 0.036) + flex, 0.185 + u * 0.3, 0.05);
          if (step) ctx.lineTo(PX, PY); else ctx.moveTo(PX, PY);
          seen = Math.min(seen, PV); tipX = PX; tipY = PY; touch(PX, PY, 4);
        }
        if (seen < 0.02) continue;
        ctx.globalAlpha = 0.86 * seen; ctx.strokeStyle = '#dfe5ff'; ctx.lineWidth = Math.max(0.8, size * 0.008); ctx.stroke();
        ctx.fillStyle = '#eef1ff'; ctx.beginPath(); ctx.arc(tipX, tipY, Math.max(1.3, size * 0.016), 0, TAU); ctx.fill();
      }
      if (present < 0.02) { ctx.globalAlpha = 1; return 0; }
      // Hairlines gather the observed points: at the body, or wherever
      // curiosity currently rests.
      const near = size * 0.62, pull = hero ? focusStrength : focusStrength * 0.8;
      const every = mobile ? 2 : 1;
      let count = 0;
      for (let n = 0; n < MARKS; n += 1) {
        if (markSeen[n] > 0.5) count += 1;
        if (n === THORAX || n % every) continue;
        const seen = markSeen[n] * present;
        const close = pull * (1 - smooth(Math.hypot(markX[n] - focusX, markY[n] - focusY) / near));
        line(markX[n], markY[n], thoraxX, thoraxY, '#d6e0f0', 0.2 * seen * company * (1 - close), hair);
        line(markX[n], markY[n], focusX, focusY, '#f0c28a', 0.5 * seen * close, hair);
      }
      for (let n = 0; n < MARKS; n += 1) {
        if (n === THORAX || n % every) continue;
        const half = n % 5 === 0 ? 4 : 2.5;
        const close = pull * (1 - smooth(Math.hypot(markX[n] - focusX, markY[n] - focusY) / near));
        frame(markX[n] - half, markY[n] - half, half * 2, half * 2, close > 0.3 ? '#f0c28a' : '#d6e0f0',
          (0.62 + 0.3 * close) * markSeen[n] * present * company, hair);
      }
      const plates = text && hero && !mobile && width >= 960 ? smooth((elapsed - 5.6) / 2.2) * present : 0;
      const resting = plates * (1 - smooth(scene.air * 1.5));
      // Basel: the place where the butterfly rests.
      const bodyW = Math.max(14, size * 0.15), bodyH = Math.max(10, size * 0.11);
      if (hero) frame(thoraxX - bodyW / 2, thoraxY - bodyH / 2, bodyW, bodyH, '#e6edf8', 0.85 * present * company, 1);
      if (plates > 0.01) {
        // The plate names Basel on the first visit and always gives the true
        // coordinates of the place the butterfly currently rests on.
        const stop = scene.stop + (scene.leap > 0.5 ? 1 : 0);
        const lon = ((longitude(stop) / RAD + 540) % 360) - 180;
        const where = `${(LAT / RAD).toFixed(2)}\u00b0 N  ${Math.abs(lon).toFixed(2)}\u00b0 ${lon < 0 ? 'W' : 'E'}`;
        const placeLines = stop ? [where] : [text.place, where];
        const placeW = plate(placeLines, 0, 0, 0);
        let px = thoraxX + size * 0.66, py = thoraxY - (stop ? 9 : 15);
        if (px + placeW > width - 10) px = thoraxX - size * 0.66 - placeW;
        line(thoraxX + (px > thoraxX ? bodyW / 2 : -bodyW / 2), thoraxY, px > thoraxX ? px : px + placeW, thoraxY, '#e6edf8', 0.42 * resting, hair);
        plate(placeLines, px, py, resting); fixed.push([px, py, placeW, placeLines.length * 13 + 5]);
        // The left hindwing is framed and named, like a part on a study sheet.
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const corner of HIND) {
          wing(-1, corner[0], corner[1], 1); place(WX, WY, WZ);
          x0 = Math.min(x0, PX); y0 = Math.min(y0, PY); x1 = Math.max(x1, PX); y1 = Math.max(y1, PY);
        }
        frame(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6, '#c8d5ea', 0.34 * plates, hair);
        fixed.push([x0 - 3, y0 - 21, plate([text.hindwing], x0 - 3, y0 - 21, plates), 18]);
        const ax = markX[APEX], ay = markY[APEX];
        line(ax, ay, ax + 14, ay - 15, '#c8d5ea', 0.5 * plates, hair);
        fixed.push([ax + 14, ay - 33, plate([text.forewing], ax + 14, ay - 33, plates), 18]);
        const { center, radius } = scene;
        plate([`${count} ${text.count}`, `${text.beat} ${metrics.beats}`], center[0] - radius * 0.99, center[1] - radius - 44, plates);
      }
      // Curiosity itself: a warm frame that follows the pointer or wanders.
      const lively = (hero ? focusStrength : 0) * (pointerShare > 0.02 ? 1 : present);
      if (lively > 0.01) {
        const w = mobile ? 12 : 18, h = mobile ? 10 : 14;
        frame(focusX - w / 2, focusY - h / 2, w, h, '#f0c28a', 0.95 * lively, 1);
        line(focusX + w / 2, focusY, focusX + w / 2 + 5, focusY, '#f0c28a', 0.9 * lively, 1);
        if (text && !mobile && width >= 900) {
          // The plate takes whichever side keeps the fixed plates readable.
          const own = plate([text.focus], 0, 0, 0), fade = lively * smooth((elapsed - 5.6) / 2.2 + pointerShare);
          const spots = [[focusX + w / 2 + 6, focusY - 9], [focusX - w / 2 - 6 - own, focusY - 9], [focusX - own / 2, focusY + h / 2 + 8], [focusX - own / 2, focusY - h / 2 - 26], [focusX - w / 2 - 6 - own, focusY + h / 2 + 8], [focusX + w / 2 + 6, focusY + h / 2 + 8]];
          const spot = spots.find(candidate => clear(candidate[0], candidate[1], own, 18)) || spots[0];
          plate([text.focus], spot[0], spot[1], fade, '#f0c28a');
        }
      }
      ctx.globalAlpha = 1;
      return count;
    }

    function draw({ time = 0, width: nextWidth, height: nextHeight, pixelRatio = 1, mobile = false, hero = false, arrivalTime = null, pointer, burst: nextBurst } = {}) {
      if (disposed || !(nextWidth > 1 && nextHeight > 1)) return;
      width = nextWidth; height = nextHeight;
      ratio = Math.max(0.5, Math.min(2, pixelRatio));
      const sharedTime = Number.isFinite(time) ? Math.max(0, time) : 0;
      const elapsed = arrivalTime === null ? ARRIVAL : Math.max(0, arrivalTime);
      // The hero's unbounded local clock also drives its globe. A visible footer
      // cannot advance the landing target while the flight itself is offscreen.
      // A still first frame shows Basel on the meridian: centred and upright.
      const t = hero ? (arrivalTime === null ? sharedTime + STILL : elapsed) : sharedTime;
      scene = pose(t, elapsed, mobile, hero);
      prepare(mobile);
      surfaceWeight = hero ? scene.settle * (1 - scene.air) : 0;
      const b = scene.basis, p = scene.position;
      m00 = b[0][0]; m01 = b[0][1]; m02 = b[0][2]; m10 = b[1][0]; m11 = b[1][1]; m12 = b[1][2];
      m20 = b[2][0]; m21 = b[2][1]; m22 = b[2][2]; originX = p[0]; originY = p[1]; originZ = p[2];
      // The beat is shifted once per visit so that the wings are open as
      // Basel crosses the meridian, which is also the still frame.
      if (opening === null) opening = 0.36 - beat(STILL, ARRIVAL, 0);
      phase = beat(t, elapsed, scene.stop + scene.leap) + opening;
      bankSin = b[0][1];
      const effort = 1 - smooth((noise(26, t, 5.6) - 0.05) / 0.65) * 0.18;
      depth = mix(1.08, 0.52, surfaceWeight) + noise(16, t, 5.7) * 0.035;
      bodyLift = Math.sin(phase - 0.65) * 0.018 * effort * (1 - surfaceWeight);
      for (let side = 0; side < 2; side += 1) {
        const sign = side ? 1 : -1;
        sideBend[side] = noise(32 + side, t, 6.9) * 0.025 + sign * bankSin * 0.055;
        sidePhase[side] = noise(44 + side, t, 7.3) * 0.055 + sign * bankSin * 0.13;
      }
      burst = nextBurst;
      const key = `${canvas.width}:${canvas.height}:${ratio}:${hero}:${Math.round(scene.radius * 8)}:${Math.round(scene.center[0] * 4)}:${Math.round(scene.center[1] * 4)}`;
      if (backgroundKey !== key) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#080e20'; ctx.fillRect(0, 0, width, height);
        if (hero) atmosphere();
        background = ctx.getImageData(0, 0, canvas.width, canvas.height);
        pixels = ctx.createImageData(canvas.width, canvas.height);
        backgroundKey = key; previous = null;
      }
      for (let item = 0; item < activeCount; item += 1) {
        const index = active[item];
        energy[index] = 0; tones[index] = 0; peak[index] = 0; kinds[index] = 0;
        ground[index] = 0; groundTones[index] = 0; flags[index] = 0;
      }
      activeCount = 0; minColumn = columns; maxColumn = -1; minRow = rows; maxRow = -1;
      metrics = { time: t, elapsed, phase, beats: Math.max(1, Math.floor((phase - opening) / TAU) + 1) };
      if (hero) drawEarth();
      drawButterfly(t);
      attend(t, elapsed, pointer, hero);
      composite(t);
      const observed = observe(elapsed, mobile, hero);
      if (overlay) {
        // Whatever the observation layer touched is restored on the next frame.
        const box = [Math.max(0, Math.floor(overlay[0] * ratio)), Math.max(0, Math.floor(overlay[1] * ratio)),
          Math.min(canvas.width, Math.ceil(overlay[2] * ratio)), Math.min(canvas.height, Math.ceil(overlay[3] * ratio))];
        if (box[2] > box[0] && box[3] > box[1]) {
          previous = previous && previous.length ? [Math.min(previous[0], box[0]), Math.min(previous[1], box[1]),
            Math.max(previous[2], box[2]), Math.max(previous[3], box[3])] : box;
        }
      }
      metrics = { ...metrics, angle: scene.angle, center: scene.center, radius: scene.radius, size: scene.size,
        position: scene.position, basis: scene.basis, normal: scene.normal, settled: elapsed >= ARRIVAL,
        surfaceWeight, observed, cell, focus: [focusX, focusY, focusStrength], thorax: [markX[THORAX], markY[THORAX], markSeen[THORAX]] };
    }
    function dispose() {
      if (disposed) return;
      disposed = true; stampCanvas.width = stampCanvas.height = 1;
      if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', forget);
      background = pixels = previous = null; masks = []; backgroundKey = gridKey = '';
      energy = tones = peak = ground = groundTones = new Float32Array(0);
      kinds = flags = new Uint8Array(0); active = new Uint32Array(0);
    }
    return { draw, dispose, seed: visitSeed,
      get stats() { return { dots: lit, columns, rows, samples: sampleCount * 2, marks: MARKS, earthPoints: earth.length, ...metrics }; } };
  };
})();
