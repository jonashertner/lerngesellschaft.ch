/* Original roots and wings, drawn entirely with a reusable atlas of ASCII type. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const randomSeed = new Uint32Array(1);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(randomSeed);
  else randomSeed[0] = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  const visitSeed = randomSeed[0];
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
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

  window.createRootsAndWingsRenderer = function createRootsAndWingsRenderer(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('An ASCII canvas is required.');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('The ASCII field requires Canvas2D.');
    const glyphs = '.,:+*xX#8B%@/\\|-~';
    const palettes = ['#7795b2', '#b2ccdc', '#e0ebee', '#d8b77d'];
    const atlas = document.createElement('canvas'), atlasContext = atlas.getContext('2d');
    if (!atlasContext) throw new Error('The ASCII glyph atlas is unavailable.');
    const rootAtlas = document.createElement('canvas'), rootAtlasContext = rootAtlas.getContext('2d');
    if (!rootAtlasContext) throw new Error('The fine root atlas is unavailable.');
    let rootTile = 1;
    const roots = [], rootlets = [];
    let disposed = false, gridWidth = 0, gridHeight = 0, cellWidth = 0, cellHeight = 0;
    let glyphWidth = 0, glyphHeight = 0, atlasRatio = 0, mobileProfile = false;
    let energy = new Float32Array(0), warmth = new Float32Array(0), facing = new Float32Array(0);
    let peak = new Float32Array(0), direction = new Uint8Array(0), active = new Uint32Array(0);
    let activeCount = 0, visibleCount = 0, rootExtent = 0;
    let rootPass = false, rootDrawCount = 0;
    let rootDraws;
    let width = 1, height = 1, scale = 1, yawCos = 1, yawSin = 0, roll = 0;
    let pointerX = 0, pointerY = 0, pointerStrength = 0, burst = null;

    // Cubic roots inherit the local tangent of their parent, not a radial fan.
    const curvePoint = new Float64Array(4);
    function rootPoint(root, u, out) {
      const v = 1 - u, vv = v * v, uu = u * u;
      out[0] = vv * v * root.ax + 3 * vv * u * root.cx + 3 * v * uu * root.dx + uu * u * root.bx;
      out[1] = vv * v * root.ay + 3 * vv * u * root.cy + 3 * v * uu * root.dy + uu * u * root.by;
      out[2] = 3 * vv * (root.cx - root.ax) + 6 * v * u * (root.dx - root.cx) + 3 * uu * (root.bx - root.dx);
      out[3] = 3 * vv * (root.cy - root.ay) + 6 * v * u * (root.dy - root.cy) + 3 * uu * (root.by - root.dy);
    }
    function branch(ax, ay, cx, cy, dx, dy, bx, by, depth, strength, phase, order,
      parent = -1, attachment = 0, birth = 0, duration = 9, initial = 0) {
      const steps = order === 1 ? 45 : order === 2 ? 12 : order === 3 ? 7 : 4;
      const root = { ax, ay, cx, cy, dx, dy, bx, by, depth, strength, phase, order, parent, attachment,
        birth, duration, initial, growth: 0, steps, samples: new Float32Array((steps + 1) * 4) };
      for (let step = 0; step <= steps; step += 1) {
        rootPoint(root, step / steps, curvePoint);
        root.samples.set(curvePoint, step * 4);
      }
      roots.push(root);
      return roots.length - 1;
    }
    function growChildren(parentIndex, order, lineage) {
      const parent = roots[parentIndex];
      const count = order === 2 ? 3 + Math.floor(hash(lineage + 120) * 3) :
        order === 3 ? 1 + Math.floor(hash(lineage + 130) * 3) : hash(lineage + 140) < 0.66 ? 1 : 0;
      for (let fork = 0; fork < count; fork += 1) {
        const id = lineage * 7 + fork * 43, attachment = 0.18 + ((fork + hash(id + 160) * 0.8) / count) * 0.66;
        rootPoint(parent, attachment, curvePoint);
        const ax = curvePoint[0], ay = curvePoint[1], norm = Math.hypot(curvePoint[2], curvePoint[3]);
        const tx = curvePoint[2] / norm, ty = curvePoint[3] / norm;
        const turn = (hash(id + 170) < 0.5 ? -1 : 1) * (0.45 + hash(id + 180) * 0.66);
        let vx = tx * Math.cos(turn) - ty * Math.sin(turn), vy = Math.min(-0.20, tx * Math.sin(turn) + ty * Math.cos(turn));
        const vn = Math.hypot(vx, vy); vx /= vn; vy /= vn;
        const reach = (order === 2 ? 0.13 : order === 3 ? 0.065 : 0.035) * (0.7 + hash(id + 190) * 1.25);
        const bx = Math.max(-0.72, Math.min(0.72, ax + vx * reach)), by = Math.max(-0.995, ay + vy * reach);
        const cx = ax + tx * reach * 0.40, cy = ay + ty * reach * 0.40;
        const curl = (hash(id + 200) - 0.5) * reach * 0.5;
        const dx = bx - vx * reach * 0.26 + curl * -vy, dy = Math.max(-0.995, by - vy * reach * 0.26 + curl * vx);
        const birth = order === 2 ? -2.5 + attachment * 6.2 + (lineage % 5) * 0.17 : parent.birth + 2.0 + attachment * 3.0;
        const index = branch(ax, ay, cx, cy, dx, dy, bx, by, parent.depth, order === 2 ? 0.51 : order === 3 ? 0.33 : 0.22,
          hash(id + 210) * TAU, order, parentIndex, attachment, birth, 4.3 + hash(id + 220) * 3.2);
        if (order < 4) growChildren(index, order + 1, id + 300);
        if (order === 2) rootlets.push({ parent: index, attachment: 0.55 + hash(id + 280) * 0.29,
          birth: 10 + rootlets.length * 0.93, period: 53 + hash(id + 290) * 29, id });
      }
    }
    const primaryCurves = [
      [-0.022, -0.055, 0.055, -0.29, -0.62, -0.45, -0.53, -0.73],
      [-0.012, -0.055, -0.25, -0.29, 0.045, -0.69, -0.24, -0.97],
      [0.002, -0.055, -0.095, -0.34, 0.20, -0.66, 0.065, -0.995],
      [0.014, -0.055, 0.22, -0.19, 0.05, -0.70, 0.36, -0.84],
      [0.028, -0.055, 0.22, -0.32, 0.62, -0.32, 0.60, -0.62]
    ];
    for (let r = 0; r < primaryCurves.length; r += 1) {
      const p = primaryCurves[r], depth = (hash(r + 40) - 0.5) * 0.12;
      const index = branch(...p, depth, 0.84, hash(r + 70) * TAU, 1, -1, 0, 0, 8.7 + r * 0.32, 0.53);
      growChildren(index, 2, r + 1);
    }
    // A bounded per-frame list lets fine root glyphs follow their actual curves.
    rootDraws = new Float32Array((roots.reduce((sum, root) => sum + root.steps + 1, 0) + rootlets.length * 23) * 6);
    // A swept upper wing and a smaller rounded lower wing meet at a concave notch.
    const outline = [[0.10, 0.63], [0.44, 0.83], [0.88, 0.91], [1.02, 0.67],
      [0.86, 0.40], [0.49, 0.25], [0.70, 0.10], [0.73, -0.045], [0.48, -0.13], [0.15, -0.025]];
    const feathers = [];
    const interpolate = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    for (let feather = 0; feather < 39; feather += 1) {
      const f = feather / 38, p = f * (outline.length - 1), k = Math.min(outline.length - 2, Math.floor(p)), t = p - k;
      const a = outline[Math.max(0, k - 1)], b = outline[k], c = outline[k + 1], d = outline[Math.min(outline.length - 1, k + 2)];
      const x = interpolate(a[0], b[0], c[0], d[0], t), y = interpolate(a[1], b[1], c[1], d[1], t);
      const length = Math.hypot(x, y - 0.16);
      feathers.push({ f, x, y, nx: -(y - 0.16) / length, ny: x / length });
    }

    function prepare(nextWidth, nextHeight, ratio, mobile) {
      const desiredWidth = mobile ? 5.4 : 7.0, desiredHeight = mobile ? 7.4 : 9.0;
      const density = Math.max(1, Math.sqrt(nextWidth * nextHeight / (desiredWidth * desiredHeight * 25500)));
      // Atlas cells and destination cells share exact device-pixel dimensions.
      // No fractional resampling softens the characters as the field moves.
      const cw = Math.max(1, Math.round(desiredWidth * density * ratio)) / ratio;
      const ch = Math.max(1, Math.round(desiredHeight * density * ratio)) / ratio;
      const columns = Math.max(1, Math.ceil(nextWidth / cw)), rows = Math.max(1, Math.ceil(nextHeight / ch));
      if (gridWidth === columns && gridHeight === rows && atlasRatio === ratio && mobileProfile === mobile && cellWidth === cw && cellHeight === ch) return;
      gridWidth = columns; gridHeight = rows; cellWidth = cw; cellHeight = ch;
      atlasRatio = ratio; mobileProfile = mobile;
      const length = columns * rows;
      energy = new Float32Array(length); warmth = new Float32Array(length);
      facing = new Float32Array(length); peak = new Float32Array(length);
      direction = new Uint8Array(length); active = new Uint32Array(length);
      glyphWidth = Math.round(cellWidth * ratio); glyphHeight = Math.round(cellHeight * ratio);
      atlas.width = glyphWidth * glyphs.length; atlas.height = glyphHeight * palettes.length * 16;
      atlasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      atlasContext.font = `${Math.min(cellHeight * 0.98, cellWidth * 1.15)}px ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
      atlasContext.textAlign = 'center'; atlasContext.textBaseline = 'middle';
      for (let color = 0; color < palettes.length; color += 1) {
        atlasContext.fillStyle = palettes[color];
        for (let light = 1; light < 16; light += 1) {
          atlasContext.globalAlpha = light / 15;
          for (let g = 0; g < glyphs.length; g += 1) {
            atlasContext.fillText(glyphs[g], (g + 0.5) * glyphWidth / ratio,
              (color * 16 + light + 0.51) * glyphHeight / ratio);
          }
        }
      }
      atlasContext.globalAlpha = 1;
      // Bake tangent angles once. Per-frame affine glyph transforms are costly on software renderers.
      rootTile = Math.ceil(ratio * 12);
      rootAtlas.width = rootTile * 32; rootAtlas.height = rootTile * 8;
      rootAtlasContext.font = `7.4px ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
      rootAtlasContext.textAlign = 'center'; rootAtlasContext.textBaseline = 'middle';
      rootAtlasContext.fillStyle = palettes[1];
      for (let kind = 0; kind < 2; kind += 1) {
        for (let level = 0; level < 4; level += 1) {
          const size = [1, 0.85, 0.72, 0.60][level];
          for (let angle = 0; angle < 32; angle += 1) {
            const theta = angle * TAU / 32, cosine = Math.cos(theta) * size, sine = Math.sin(theta) * size;
            rootAtlasContext.setTransform(ratio * cosine * (kind === 0 ? 1.5 : 1), ratio * sine * (kind === 0 ? 1.5 : 1), -ratio * sine, ratio * cosine,
              (angle + 0.5) * rootTile, (kind * 4 + level + 0.5) * rootTile);
            rootAtlasContext.fillText(kind === 0 ? '-' : '.', 0, 0);
          }
        }
      }
    }

    function deposit(column, row, value, warm, depth, kind) {
      if (column < 0 || row < 0 || column >= gridWidth || row >= gridHeight || value <= 0.0001) return;
      const index = row * gridWidth + column;
      if (energy[index] === 0) active[activeCount++] = index;
      energy[index] += value; warmth[index] += warm * value; facing[index] += depth * value;
      if (value > peak[index]) { peak[index] = value; direction[index] = kind; }
    }
    function point(x, y, z, light, warm = 0, kind = 0, angle = 0, size = 1) {
      // The two living forms rise diagonally, with room for the full wings on a phone.
      const objectScale = rootPass ? 0.94 : mobileProfile ? 0.81 : 0.88;
      x = x * objectScale + (rootPass ? (mobileProfile ? -0.30 : -0.40) : (mobileProfile ? 0.20 : 0.27));
      const centreY = rootPass ? -0.18 : 0.49;
      y = centreY + (y - centreY) * objectScale + (rootPass ? 0.10 : -0.025);
      z *= objectScale;
      if (pointerStrength > 0.001) {
        const dx = x - pointerX, dy = y - pointerY;
        const influence = pointerStrength * Math.exp(-(dx * dx + dy * dy) * 7);
        x += (-dy * 0.035 + dx * 0.018) * influence;
        y += dx * 0.035 * influence; z += influence * 0.035;
      }
      if (burst && burst.age >= 0 && burst.age < 4) {
        const dx = x - burst.x * width / (scale * 2), dy = y + burst.y * height / (scale * 2);
        const distance = Math.hypot(dx, dy), wave = distance - burst.age * 0.70;
        const impulse = Math.exp(-wave * wave * 26 - burst.age * 1.1);
        light += impulse * 0.20; y += impulse * 0.012;
      }
      const px = x * yawCos + z * yawSin, pz = z * yawCos - x * yawSin;
      const perspective = 3.8 / (3.8 - pz);
      const column = (width * 0.5 + (px - y * roll) * scale * perspective) / cellWidth - 0.5;
      const row = (height * 0.49 - (y + px * roll) * scale * perspective) / cellHeight - 0.5;
      if (rootPass) {
        const offset = rootDrawCount * 6;
        rootDraws[offset] = (column + 0.5) * cellWidth;
        rootDraws[offset + 1] = (row + 0.5) * cellHeight;
        rootDraws[offset + 2] = light;
        rootDraws[offset + 3] = angle;
        rootDraws[offset + 4] = size;
        rootDraws[offset + 5] = kind;
        rootDrawCount += 1;
        return;
      }
      const left = Math.floor(column), top = Math.floor(row), fx = column - left, fy = row - top;
      const depth = clamp(0.48 + pz * 1.2);
      deposit(left, top, light * (1 - fx) * (1 - fy), warm, depth, kind);
      deposit(left + 1, top, light * fx * (1 - fy), warm, depth, kind);
      deposit(left, top + 1, light * (1 - fx) * fy, warm, depth, kind);
      deposit(left + 1, top + 1, light * fx * fy, warm, depth, kind);
    }

    function drawWings(time) {
      // A continuous beat travels out through the membrane; the edge follows the hinge.
      const phase = time * TAU / 4.65 + 0.19 * Math.sin(time * 0.17) + 0.08 * Math.sin(time * 0.071);
      const breadth = 0.94 + noise(12, time, 11.7) * 0.035;
      const lift = noise(21, time, 13.3) * 0.016 + Math.sin(time * 0.69) * 0.008;
      for (let side = -1; side <= 1; side += 2) {
        const sideBend = noise(side < 0 ? 32 : 33, time, 8.9) * 0.035;
        const sidePhase = noise(side < 0 ? 44 : 45, time, 7.3) * 0.065;
        for (let feather = 0; feather < feathers.length; feather += 1) {
          const shape = feathers[feather], f = shape.f;
          const tx = shape.x * breadth, ty = shape.y;
          const ax = 0.024, ay = 0.16 - f * 0.025;
          const vein = Math.pow(0.5 + 0.5 * Math.cos(f * TAU * 7.1), 12);
          for (let step = 0; step <= 40; step += 1) {
            const u = step / 40, bell = Math.sin(u * Math.PI), edge = u * u * u;
            const localPhase = phase - u * u * 0.87 - f * 0.17 + sidePhase;
            const fold = 0.5 - 0.5 * Math.cos(localPhase);
            const hinge = 0.08 + fold * 1.08 + edge * sideBend;
            const hingeCos = Math.cos(hinge), hingeSin = Math.sin(hinge);
            const flex = Math.sin(localPhase - 0.45 + f * 1.3) * edge * 0.036;
            const radial = ax + (tx - ax) * u + bell * 0.025;
            const x = side * radial * hingeCos;
            const y = 0.30 + (ay + (ty - ay) * u + bell * (0.035 - f * 0.055)) * 0.61 + lift + flex;
            const z = radial * hingeSin * 0.58 + bell * (0.045 + sideBend) + flex * 0.45;
            const spread = (0.006 + bell * 0.022) * (1 - u * 0.58);
            const travellingLight = 0.5 + 0.5 * Math.cos(u * 5.2 - time * 0.71 - f * 2.3);
            const membrane = 0.072 + travellingLight * 0.038;
            const taper = (0.38 + bell * 0.62) * (1 - smooth((u - 0.80) / 0.20) * 0.60);
            const light = membrane * taper * (0.80 + hingeCos * 0.20);
            for (let lane = -1; lane <= 1; lane += 1) {
              const offset = lane * spread * 0.60;
              point(x + side * offset * shape.nx * hingeCos, y + offset * shape.ny * 0.61,
                z + offset * shape.nx * hingeSin * 0.58, light * (lane === 0 ? 1.4 : 0.8), 0, 0);
            }
            // Unequal veins keep a legible structure inside the translucent surface.
            point(x, y, z + 0.008, vein * (0.28 + travellingLight * 0.11) * taper, 0, 0);
          }
        }
      }
      // A fine body belongs to the wings alone; the interval below stays empty.
      for (let strand = 0; strand < 3; strand += 1) {
        for (let step = 0; step <= 32; step += 1) {
          const u = step / 32, y = 0.27 + u * 0.36 + lift;
          point((strand - 1) * 0.004 * Math.sin(u * Math.PI), y, 0.035,
            0.21 * Math.sin(u * Math.PI), 0, 1);
        }
      }
    }

    function paintRoot(root, growth, opacity, time, depth) {
      if (growth < 0.00001 || opacity < 0.0001) return;
      const steps = root.steps, count = Math.floor(growth * steps);
      for (let step = 0; step <= count; step += 1) {
        const u = step / steps;
        let rawX, rawY, tx, ty;
        if (root.samples) {
          const offset = step * 4;
          rawX = root.samples[offset]; rawY = root.samples[offset + 1];
          tx = root.samples[offset + 2]; ty = root.samples[offset + 3];
        } else {
          rootPoint(root, u, curvePoint);
          rawX = curvePoint[0]; rawY = curvePoint[1]; tx = curvePoint[2]; ty = curvePoint[3];
        }
        const y = -0.18 + (rawY + 0.055) * 0.81;
        const x = rawX + Math.sin(-y * 3 + time * 0.18) * 0.009 * y * y;
        const flow = 0.68 + 0.32 * Math.cos(y * 5.2 + time * 0.71 - root.phase * 0.25);
        const mature = smooth((growth - 0.90) / 0.10);
        const tip = smooth((growth - u) / 0.075) * (1 - smooth((u - 0.68) / 0.32) * 0.64);
        const light = root.strength * (0.47 + flow * 0.32) * tip * opacity;
        const warm = Math.exp(-Math.pow((growth - u - 0.055) * 27, 2)) * 0.35 * (1 - mature);
        // Short ASCII dashes sit on the curve itself, with dots at the finest tips.
        // Arc-length weighting keeps tightly sampled offshoots from forming bright blocks.
        const size = root.order === 1 ? 1.0 : root.order === 2 ? 0.85 : root.order === 3 ? 0.72 : 0.60;
        const spacing = Math.hypot(tx, ty * 0.81) * scale / steps;
        const density = Math.min(1.6, spacing / (5.4 * size * 0.70));
        const kind = u > 0.89 || root.order >= 4 ? 6 : 5;
        point(x, y, depth, light * density, warm, kind, Math.atan2(-ty * 0.81, tx), size);
      }
    }

    const liveRoot = { ax: 0, ay: 0, cx: 0, cy: 0, dx: 0, dy: 0, bx: 0, by: 0, strength: 0.25,
      phase: 0, order: 4, steps: 7, samples: null };

    function drawRoots(time) {
      rootExtent = 0;
      for (let index = 0; index < roots.length; index += 1) {
        const root = roots[index];
        let growth = root.initial + (1 - root.initial) * smooth((time - root.birth) / root.duration);
        if (root.parent >= 0) growth *= smooth((roots[root.parent].growth - root.attachment) / 0.065);
        root.growth = growth; rootExtent += growth;
        paintRoot(root, growth, 1, time, root.depth);
      }
      // Independent, softly retiring rootlets keep growing from established roots.
      // Their parent network is permanent, and each replacement begins invisibly.
      for (let index = 0; index < rootlets.length; index += 1) {
        const slot = rootlets[index], elapsed = time - slot.birth;
        if (elapsed < 0) continue;
        const generation = Math.floor(elapsed / slot.period), age = elapsed - generation * slot.period;
        const parent = roots[slot.parent], v = slot.attachment;
        const id = slot.id + generation * 131;
        const gate = smooth((parent.growth - v) / 0.065);
        const growth = smooth(age / (5.3 + hash(id + 460) * 3.1)) * gate;
        const opacity = 1 - smooth((age - slot.period + 9) / 9);
        rootPoint(parent, v, curvePoint);
        liveRoot.ax = curvePoint[0]; liveRoot.ay = curvePoint[1];
        const norm = Math.hypot(curvePoint[2], curvePoint[3]), tx = curvePoint[2] / norm, ty = curvePoint[3] / norm;
        const direction = hash(id + 470) < 0.5 ? -1 : 1;
        const reach = 0.045 + hash(id + 480) * 0.075;
        liveRoot.cx = liveRoot.ax + tx * reach * 0.38; liveRoot.cy = liveRoot.ay + ty * reach * 0.38;
        liveRoot.bx = Math.max(-0.75, Math.min(0.75, liveRoot.ax + tx * reach * 0.4 + direction * reach * 0.7));
        liveRoot.by = Math.max(-0.995, liveRoot.ay - reach * 0.85);
        liveRoot.dx = liveRoot.bx - direction * reach * 0.3; liveRoot.dy = liveRoot.by + reach * 0.28;
        liveRoot.phase = hash(id + 500) * TAU;
        paintRoot(liveRoot, growth, opacity, time, parent.depth);
      }
    }

    function draw({ time = 0, width: nextWidth, height: nextHeight, pixelRatio = 1, mobile = false, pointer, burst: nextBurst } = {}) {
      if (disposed || !(nextWidth > 1 && nextHeight > 1)) return;
      width = nextWidth; height = nextHeight;
      const ratio = Math.max(0.5, Math.min(2, pixelRatio));
      prepare(width, height, ratio, mobile);
      scale = Math.min(width * 0.42, height * 0.44);
      const t = Number.isFinite(time) ? Math.max(0, time) : 0;
      const yaw = noise(4, t, 21.1) * 0.10;
      yawCos = Math.cos(yaw); yawSin = Math.sin(yaw); roll = noise(8, t, 27.3) * 0.018;
      pointerStrength = pointer && Number.isFinite(pointer.strength) ? clamp(pointer.strength) : 0;
      pointerX = pointer ? pointer.x * width / (scale * 2) : 0;
      pointerY = pointer ? -pointer.y * height / (scale * 2) : 0;
      burst = nextBurst;
      energy.fill(0); warmth.fill(0); facing.fill(0); peak.fill(0); activeCount = 0; visibleCount = 0;
      rootDrawCount = 0; rootPass = false; drawWings(t); rootPass = true; drawRoots(t); rootPass = false;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#080e20'; ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      for (let item = 0; item < activeCount; item += 1) {
        const index = active[item], value = energy[index];
        const brightness = value / (value + 0.65);
        const alpha = Math.min(1, brightness * 17 / 15);
        if (alpha < 0.02) continue;
        const depth = facing[index] / value, warm = warmth[index] / value;
        const color = warm > 0.30 ? 3 : depth > 0.57 || brightness > 0.66 ? 2 : depth > 0.38 ? 1 : 0;
        const kind = direction[index], variation = Math.floor(hash(index + 2000) * 3);
        let glyph;
        if (kind === 1) glyph = 14;
        else if (kind === 2) glyph = 12;
        else if (kind === 3) glyph = 13;
        else if (kind === 4) glyph = 4;
        else if (kind === 5) glyph = 15;
        else if (kind === 6) glyph = 0;
        else glyph = Math.min(5, Math.max(0, brightness * 4.4 + variation * 0.45 - 0.3));
        const column = index % gridWidth, row = Math.floor(index / gridWidth);
        const low = Math.floor(glyph), blend = smooth((glyph - low - 0.3) / 0.4);
        ctx.globalAlpha = alpha * (1 - blend);
        if (ctx.globalAlpha > 0.001) ctx.drawImage(atlas, low * glyphWidth, (color * 16 + 15) * glyphHeight,
          glyphWidth, glyphHeight, column * cellWidth, row * cellHeight, cellWidth, cellHeight);
        if (blend > 0.001) {
          ctx.globalAlpha = alpha * blend;
          ctx.drawImage(atlas, Math.min(10, low + 1) * glyphWidth, (color * 16 + 15) * glyphHeight,
            glyphWidth, glyphHeight, column * cellWidth, row * cellHeight, cellWidth, cellHeight);
        }
        visibleCount += 1;
      }
      // The wing remains a fine ASCII field; root glyphs trace continuous curved paths.
      for (let item = 0; item < rootDrawCount; item += 1) {
        const offset = item * 6, light = rootDraws[offset + 2];
        if (light < 0.008) continue;
        const angle = (Math.round(rootDraws[offset + 3] * 32 / TAU) + 32) % 32;
        const size = rootTile / ratio, weight = rootDraws[offset + 4];
        const level = weight > 0.95 ? 0 : weight > 0.8 ? 1 : weight > 0.65 ? 2 : 3;
        const row = (rootDraws[offset + 5] === 6 ? 4 : 0) + level;
        ctx.globalAlpha = Math.min(0.88, light * 1.55);
        ctx.drawImage(rootAtlas, angle * rootTile, row * rootTile, rootTile, rootTile,
          Math.round((rootDraws[offset] - size * 0.5) * ratio) / ratio,
          Math.round((rootDraws[offset + 1] - size * 0.5) * ratio) / ratio, size, size);
        visibleCount += 1;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1;
    }
    function dispose() {
      if (disposed) return;
      disposed = true; atlas.width = atlas.height = rootAtlas.width = rootAtlas.height = 1;
      energy = warmth = facing = peak = new Float32Array(0);
      direction = new Uint8Array(0); active = new Uint32Array(0); rootDraws = new Float32Array(0);
    }
    return { draw, dispose, seed: visitSeed,
      get stats() { return { glyphs: visibleCount, columns: gridWidth, rows: gridHeight, branches: roots.length, rootExtent }; } };
  };
})();
