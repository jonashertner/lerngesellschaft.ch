/* A fine ASCII butterfly finds a resting place on a living, slowly turning Earth. */
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
    const palettes = ['#587995', '#9dbfd0', '#edf5f5', '#efd0a1'];
    const inks = palettes.map(color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)));
    let glyphMasks = [], background = null, pixels = null, backgroundKey = '';
    const atlas = document.createElement('canvas'), atlasContext = atlas.getContext('2d');
    if (!atlasContext) throw new Error('The ASCII glyph atlas is unavailable.');
    let disposed = false, gridWidth = 0, gridHeight = 0, cellWidth = 0, cellHeight = 0;
    let glyphWidth = 0, glyphHeight = 0, atlasRatio = 0, mobileProfile = false;
    let energy = new Float32Array(0), warmth = new Float32Array(0), facing = new Float32Array(0);
    let peak = new Float32Array(0), direction = new Uint8Array(0), active = new Uint32Array(0);
    let activeCount = 0, visibleCount = 0;
    let width = 1, height = 1, bankSin = 0;
    let pointerX = 0, pointerY = 0, pointerStrength = 0, burst = null;
    let scene = null, surfaceWeight = 0, metrics = {};
    const earth = [];
    // Quantized Natural Earth coordinates are decoded once; no runtime map request.
    const encoded = window.societyEarthPoints;
    if (typeof encoded === 'string') {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      for (let i = 0; i + 4 < bytes.length; i += 5) {
        const lon = (view.getUint16(i, true) / 65535 * 360 - 180) * Math.PI / 180;
        const lat = (view.getUint16(i + 2, true) / 65535 * 180 - 90) * Math.PI / 180;
        earth.push([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon), bytes[i + 4]]);
      }
    }
    const mix = (a, b, u) => a + (b - a) * u;
    const multiply = (v, k) => v.map(n => n * k);
    function rotate(v, angle) {
      const c = Math.cos(angle), s = Math.sin(angle), tilt = -0.18;
      const x = v[0] * c + v[2] * s, y = v[1], z = v[2] * c - v[0] * s;
      return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt), z];
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
      if (cos < 0) { for (let i = 0; i < 4; i++) qb[i] *= -1; cos = -cos; }
      const angle = Math.acos(Math.min(1, cos)), sin = Math.sin(angle);
      const wa = sin < 0.001 ? 1 - u : Math.sin((1 - u) * angle) / sin;
      const wb = sin < 0.001 ? u : Math.sin(u * angle) / sin;
      const q = qa.map((v, i) => v * wa + qb[i] * wb), l = Math.hypot(...q);
      const [x, y, z, w] = q.map(v => v / l);
      return [[1 - 2 * (y*y + z*z), 2 * (x*y + z*w), 2 * (x*z - y*w)],
        [2 * (x*y - z*w), 1 - 2 * (x*x + z*z), 2 * (y*z + x*w)],
        [2 * (x*z + y*w), 2 * (y*z - x*w), 1 - 2 * (x*x + y*y)]];
    }
    function pose(time, elapsed, mobile, hero) {
      const radius = hero ? Math.min(width * (mobile ? 0.28 : 0.184), height * (mobile ? 0.32 : 0.365)) : Math.min(width * 0.28, height * 0.36);
      const center = [width * (mobile ? 0.62 : 0.77), height * (mobile ? 0.46 : 0.51)];
      // The mobile canvas begins 48px above its clipped hero. Reserve room for
      // the upper wing through the complete rotation, including wide phones.
      if (hero && mobile && width <= 700) center[1] = Math.max(center[1], 56 + radius * 1.28);
      const angle = -0.62 + time * TAU / 210;
      const lat = 38 * Math.PI / 180, lon = -24 * Math.PI / 180;
      const localContact = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
      const normal = rotate(localContact, angle);
      const landed = [rotate([Math.cos(lon), 0, -Math.sin(lon)], angle),
        rotate([-Math.sin(lat) * Math.sin(lon), Math.cos(lat), -Math.sin(lat) * Math.cos(lon)], angle), normal];
      const u = clamp(elapsed / 20), settle = smooth((elapsed - 11) / 9);
      const progress = u < 0.65 ? u / 0.825 : (0.65 + 0.35 * ((u - 0.65) / 0.35 - integral((u - 0.65) / 0.35))) / 0.825;
      const size = radius * (mobile ? 0.64 : 0.54) * (1.12 - 0.12 * smooth(u));
      const target = multiply(normal, radius + size * 0.085);
      const startX = -center[0] - size * 0.35;
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
      const basis = blendFrame(airborne, landed, settle);
      if (!hero) {
        center[0] = width * 0.5; center[1] = height * 0.5;
        position[0] = Math.sin(time * 0.37) * radius * 0.04;
        position[1] = Math.sin(time * 0.29) * radius * 0.05;
        position[2] = 0;
        return { radius, center, angle, position, basis: airborne, size: radius * 0.92, settle: 0, hero, localContact, normal };
      }
      return { radius, center, angle, position, basis, size, settle, hero, localContact, normal };
    }
    // Integral of the quintic smoothstep; its complement eases cruise to rest.
    function integral(q) { return q ** 4 * (2.5 + q * (-3 + q)); }


    // A swept upper wing and a smaller rounded lower wing meet at a concave notch.
    const outline = [[0.10, 0.63], [0.44, 0.83], [0.88, 0.91], [1.02, 0.67],
      [0.86, 0.40], [0.49, 0.25], [0.70, 0.10], [0.73, -0.045], [0.48, -0.13], [0.15, -0.025]];
    const feathers = [];
    const interpolate = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    for (let feather = 0; feather < 55; feather += 1) {
      const f = feather / 54, p = f * (outline.length - 1), k = Math.min(outline.length - 2, Math.floor(p)), t = p - k;
      const a = outline[Math.max(0, k - 1)], b = outline[k], c = outline[k + 1], d = outline[Math.min(outline.length - 1, k + 2)];
      const x = interpolate(a[0], b[0], c[0], d[0], t), y = interpolate(a[1], b[1], c[1], d[1], t);
      const length = Math.hypot(x, y - 0.16);
      feathers.push({ f, x, y, nx: -(y - 0.16) / length, ny: x / length,
        vein: Math.pow(0.5 + 0.5 * Math.cos(f * TAU * 7.1), 12),
        upperVein: 1 - smooth((f - 0.42) / 0.14) });
    }
    // Fixed membrane geometry is shared by every frame and both wings.
    const samples = Array.from({ length: 49 }, (_, step) => {
      const u = step / 48, bell = Math.sin(u * Math.PI);
      return { u, bell, edge: u * u * u,
        spread: (0.006 + bell * 0.022) * (1 - u * 0.58),
        taper: (0.38 + bell * 0.62) * (1 - smooth((u - 0.80) / 0.20) * 0.55),
        edgeLight: smooth((u - 0.50) / 0.35) };
    });

    function prepare(nextWidth, nextHeight, ratio, mobile) {
      const desiredWidth = mobile ? 2.6 : 3.5, desiredHeight = mobile ? 3.4 : 4.5;
      const density = Math.max(1, Math.sqrt(nextWidth * nextHeight / (desiredWidth * desiredHeight * 72000)));
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
        // Only the full-opacity row is sampled; per-cell alpha stays continuous.
        for (let g = 0; g < glyphs.length; g += 1) {
          atlasContext.fillText(glyphs[g], (g + 0.5) * glyphWidth / ratio,
            (color * 16 + 15 + 0.51) * glyphHeight / ratio);
        }
      }
      atlasContext.globalAlpha = 1;
      const source = atlasContext.getImageData(0, 15 * glyphHeight, atlas.width, glyphHeight).data;
      glyphMasks = Array.from(glyphs, (_, glyph) => {
        const mask = new Uint8Array(glyphWidth * glyphHeight);
        for (let y = 0; y < glyphHeight; y++) {
          for (let x = 0; x < glyphWidth; x++) mask[y * glyphWidth + x] = source[(y * atlas.width + glyph * glyphWidth + x) * 4 + 3];
        }
        return mask;
      });
      backgroundKey = '';

    }

    function deposit(column, row, value, warm, depth, kind) {
      if (column < 0 || row < 0 || column >= gridWidth || row >= gridHeight || value <= 0.0001) return;
      const index = row * gridWidth + column;
      if (energy[index] === 0) active[activeCount++] = index;
      energy[index] += value; warmth[index] += warm * value; facing[index] += depth * value;
      if (value > peak[index]) { peak[index] = value; direction[index] = kind; }
    }
    function stamp(px, py, z, light, warm, kind) {
      const column = px / cellWidth - 0.5, row = py / cellHeight - 0.5;
      const left = Math.floor(column), top = Math.floor(row), fx = column - left, fy = row - top;
      const depth = clamp(0.48 + z * 0.45);
      deposit(left, top, light * (1 - fx) * (1 - fy), warm, depth, kind);
      deposit(left + 1, top, light * fx * (1 - fy), warm, depth, kind);
      deposit(left, top + 1, light * (1 - fx) * fy, warm, depth, kind);
      deposit(left + 1, top + 1, light * fx * fy, warm, depth, kind);
    }
    function point(x, y, z, light, warm = 0, kind = 0) {
      const { basis: b, position: p, size, radius, center, hero } = scene;
      const wx = p[0] + (b[0][0] * x + b[1][0] * y + b[2][0] * z) * size;
      const wy = p[1] + (b[0][1] * x + b[1][1] * y + b[2][1] * z) * size;
      const wz = p[2] + (b[0][2] * x + b[1][2] * y + b[2][2] * z) * size;
      let visibility = 1;
      if (hero) {
        const inside = radius * radius - wx * wx - wy * wy;
        if (inside > 0) visibility = smooth((wz - Math.sqrt(inside) + radius * 0.012) / (radius * 0.024));
      }
      // Interaction illuminates the membrane without pulling feet off the Earth.
      const px = center[0] + wx, py = center[1] - wy;
      if (pointerStrength > 0.001) {
        const dx = (px - pointerX) / radius, dy = (py - pointerY) / radius;
        light *= 1 + pointerStrength * Math.exp(-(dx * dx + dy * dy) * 5) * 0.35;
      }
      if (burst && burst.age >= 0 && burst.age < 4) {
        const bx = (burst.x + 1) * width / 2, by = (burst.y + 1) * height / 2;
        const wave = Math.hypot(px - bx, py - by) / radius - burst.age * 0.70;
        light *= 1 + Math.exp(-wave * wave * 20 - burst.age) * 0.4;
      }
      stamp(px, py, wz / radius, light * visibility, warm, kind || 7);
    }
    function drawEarth() {
      const { radius, center, angle } = scene;
      const c = Math.cos(angle), s = Math.sin(angle), ct = Math.cos(-0.18), st = Math.sin(-0.18);
      for (let i = 0; i < earth.length; i++) {
        const p = earth[i], rx = p[0] * c + p[2] * s, z = p[2] * c - p[0] * s;
        if (z < -0.015) continue;
        const x = rx * ct - p[1] * st, y = rx * st + p[1] * ct;
        const sun = clamp(0.40 + (-x * 0.38 + y * 0.48 + z * 0.62) * 0.60);
        const edge = smooth((z + 0.015) / 0.12);
        const light = (p[3] === 2 ? 0.51 : p[3] === 1 ? 0.25 : 0.035) * (0.30 + sun * 0.70) * edge;
        stamp(center[0] + x * radius, center[1] - y * radius, z * 0.5 - 0.4, light, 0, p[3] === 2 ? 6 : 0);
      }
      // Almost invisible longitude/latitude stitches make the rotation readable
      // over the open ocean without turning the Earth into a wireframe cage.
      for (let latitude = -60; latitude <= 60; latitude += 30) {
        const lat = latitude * Math.PI / 180;
        for (let longitude = 0; longitude < 360; longitude += 2.8) {
          const lon = longitude * Math.PI / 180;
          const p = rotate([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)], angle);
          if (p[2] > 0) stamp(center[0] + p[0] * radius, center[1] - p[1] * radius, -0.2, 0.035 * smooth(p[2] / 0.2), 0, 6);
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

    function drawWings(time, phase, ease) {
      const breadth = 0.96 + noise(12, time, 8.7) * 0.025;
      // A few shallower strokes gently ease the effort; the beat never resets or stops.
      const effort = 1 - ease * 0.18;
      const flapDepth = mix(1.08, 0.63, surfaceWeight) + noise(16, time, 5.7) * 0.035;
      const beatLift = Math.sin(phase - 0.65) * 0.018 * effort;
      const bodyLift = beatLift * (1 - surfaceWeight);
      for (let side = -1; side <= 1; side += 2) {
        const sideBend = noise(side < 0 ? 32 : 33, time, 6.9) * 0.025 + side * bankSin * 0.055;
        const sidePhase = noise(side < 0 ? 44 : 45, time, 7.3) * 0.055 + side * bankSin * 0.13;
        for (let feather = 0; feather < feathers.length; feather += 1) {
          const shape = feathers[feather], f = shape.f;
          const tx = shape.x * breadth, ty = shape.y;
          const ax = 0.024, ay = 0.16 - f * 0.025;
          const vein = shape.vein, upperVein = shape.upperVein;
          for (let step = 0; step < samples.length; step += 1) {
            const sample = samples[step], { u, bell, edge } = sample;
            const localPhase = phase - u * u * 0.72 - f * 0.19 + sidePhase;
            // A slightly quicker closing stroke and softer return, with delayed tips.
            const stroke = localPhase + 0.18 * (1 - Math.cos(localPhase));
            const fold = 0.5 - 0.5 * Math.cos(stroke);
            const hinge = 0.06 + fold * flapDepth + edge * sideBend;
            const hingeCos = Math.cos(hinge), hingeSin = Math.sin(hinge);
            const flex = Math.sin(localPhase - 0.65 + f * 3.1) * edge * 0.045;
            const radial = ax + (tx - ax) * u + bell * 0.025;
            const x = side * radial * hingeCos;
            const y = ay + (ty - ay) * u + bell * (0.035 - f * 0.055) - 0.35 + flex + bodyLift;
            const z = radial * hingeSin * 0.58 + bell * (0.045 + sideBend) + flex * 0.5;
            const spread = sample.spread;
            const travellingLight = 0.5 + 0.5 * Math.cos(u * 5.2 - time * 1.45 - f * 2.3);
            const lace = 0.5 + 0.5 * Math.sin(f * 73 + u * 11) * Math.sin(u * 56 - f * 9);
            const membrane = (0.11 + travellingLight * 0.095) * (0.25 + lace * 0.95);
            const taper = sample.taper;
            const light = membrane * taper * (0.82 + hingeCos * 0.18);
            for (let lane = -1; lane <= 1; lane += 1) {
              const offset = lane * spread * 0.60;
              point(x + side * offset * shape.nx * hingeCos, y + offset * shape.ny,
                z + offset * shape.nx * hingeSin * 0.58, light * (lane === 0 ? 1.4 : 0.8), 0.08, 0);
            }
            // Light travels through the veins, never flashes the whole membrane.
            const edgeLight = 1 + upperVein * sample.edgeLight * 0.28;
            point(x, y, z + 0.008, vein * (0.84 + travellingLight * 0.35) * taper * edgeLight, 0.12, 0);
            if (step === samples.length - 1) {
              point(x, y, z, 0.54 + shape.vein * 0.52, 0.45, 6);
              // A few faint letters drift just beyond the living wing edge.
              const mote = hash(feather + 700), float = 0.024 + mote * 0.045 + Math.sin(time * 0.61 + feather) * 0.012;
              point(x + side * float * hingeCos, y + float * (ty - 0.16), z + float * hingeSin,
                (0.055 + mote * 0.075) * (0.7 + Math.sin(time * 0.72 + feather * 1.6) * 0.3), 0.35, 6);
            }
          }
        }
      }
      if (surfaceWeight > 0.001) {
        for (let side = -1; side <= 1; side += 2) {
          for (let leg = 0; leg < 3; leg++) {
            const fx = side * (0.105 + leg * 0.018), fy = 0.08 - leg * 0.13;
            const footZ = (Math.sqrt(scene.radius ** 2 - scene.size ** 2 * (fx*fx + fy*fy)) - scene.radius) / scene.size - 0.085;
            for (let step = 0; step <= 8; step++) {
              const u = step / 8;
              point(fx * u, mix(0.06 - leg * 0.09, fy, u), mix(0.025, footZ, u) + Math.sin(u * Math.PI) * 0.035, 0.11 * surfaceWeight, 0.28, 6);
            }
          }
        }
      }
      // Fine abdomen and two curved antennae anchor the silhouette through each turn.
      for (let strand = 0; strand < 3; strand += 1) {
        for (let step = 0; step <= 36; step += 1) {
          const u = step / 36;
          const tail = (1 - u) * (1 - u);
          point((strand - 1) * 0.005 * Math.sin(u * Math.PI) + tail * bankSin * 0.025,
            -0.35 + u * 0.62, 0.035 + tail * Math.sin(phase - 0.9) * 0.012 * effort,
            0.37 * Math.sin(u * Math.PI), 0, 1);
        }
      }
      for (let side = -1; side <= 1; side += 2) {
        for (let step = 0; step <= 18; step += 1) {
          const u = step / 18, curl = Math.sin(u * Math.PI * 0.75);
          const flex = u * u * (Math.sin(time * 1.8 + side * 0.4) * 0.006 + bankSin * 0.02);
          point(side * (0.006 + u * 0.064 + curl * 0.014) + flex, 0.21 + u * 0.15,
            0.035, 0.24 * (1 - u * 0.62), 0, side < 0 ? 2 : 3);
        }
      }
    }

    function draw({ time = 0, width: nextWidth, height: nextHeight, pixelRatio = 1, mobile = false, hero = false, arrivalTime = null, pointer, burst: nextBurst } = {}) {
      if (disposed || !(nextWidth > 1 && nextHeight > 1)) return;
      width = nextWidth; height = nextHeight;
      const ratio = Math.max(0.5, Math.min(2, pixelRatio));
      prepare(width, height, ratio, mobile);
      const sharedTime = Number.isFinite(time) ? Math.max(0, time) : 0;
      const elapsed = arrivalTime === null ? 20 : Math.max(0, arrivalTime);
      // The hero's unbounded local clock also drives its globe. A visible footer
      // cannot advance the landing target while the flight itself is offscreen.
      const t = hero ? (arrivalTime === null ? sharedTime + 20 : elapsed) : sharedTime;
      scene = pose(t, elapsed, mobile, hero);
      surfaceWeight = hero ? scene.settle : 0;
      const q = clamp((elapsed - 12) / 8);
      const extraBeat = Math.min(elapsed, 12) + 8 * (q - integral(q));
      const phase = t * TAU / 3.6 + extraBeat * (TAU / 1.65 - TAU / 3.6) +
        Math.sin(t * 0.63) * 0.14 + noise(28, t, 5.1) * 0.15;
      const ease = smooth((noise(26, t, 5.6) - 0.05) / 0.65);
      bankSin = scene.basis[0][1];
      pointerStrength = pointer && Number.isFinite(pointer.strength) ? clamp(pointer.strength) : 0;
      pointerX = pointer ? (pointer.x + 1) * width / 2 : 0;
      pointerY = pointer ? (pointer.y + 1) * height / 2 : 0;
      burst = nextBurst;
      metrics = { angle: scene.angle, center: scene.center, radius: scene.radius, size: scene.size,
        position: scene.position, basis: scene.basis, localContact: scene.localContact,
        normal: scene.normal, settled: elapsed >= 20, elapsed, phase, surfaceWeight };
      energy.fill(0); warmth.fill(0); facing.fill(0); peak.fill(0); activeCount = 0; visibleCount = 0;
      if (hero) drawEarth();
      drawWings(t, phase, ease);
      const key = `${canvas.width}:${canvas.height}:${ratio}:${hero}`;
      if (backgroundKey !== key) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#080e20'; ctx.fillRect(0, 0, width, height);
        if (hero) atmosphere();
        background = ctx.getImageData(0, 0, canvas.width, canvas.height);
        pixels = ctx.createImageData(canvas.width, canvas.height);
        backgroundKey = key;
      }
      // One bitmap submission replaces thousands of tiny Canvas draw calls.
      // Glyph coverage and adjacent-character interpolation remain continuous.
      const output = pixels.data, base = background.data, stride = canvas.width;
      output.set(base);
      for (let item = 0; item < activeCount; item += 1) {
        const index = active[item], value = energy[index];
        const brightness = value / (value + 0.44);
        const kind = direction[index];
        const alpha = Math.min(1, brightness * (kind === 7 ? 1.50 : 17 / 15));
        if (alpha < 0.02) continue;
        const depth = facing[index] / value, warm = warmth[index] / value;
        const color = warm > 0.30 ? 3 : depth > 0.57 || brightness > 0.66 ? 2 : depth > 0.38 ? 1 : 0;
        const variation = Math.floor(hash(index + 2000) * 3);
        let glyph;
        if (kind === 1) glyph = 14;
        else if (kind === 2) glyph = 12;
        else if (kind === 3) glyph = 13;
        else if (kind === 4) glyph = 4;
        else if (kind === 5) glyph = 15;
        else if (kind === 6) glyph = 0;
        else if (kind === 7) glyph = Math.min(8, Math.max(0, brightness * 7.3 + variation * 0.35 - 0.3));
        else glyph = Math.min(5, Math.max(0, brightness * 4.4 + variation * 0.45 - 0.3));
        const column = index % gridWidth, row = Math.floor(index / gridWidth);
        const low = Math.floor(glyph), blend = smooth((glyph - low - 0.3) / 0.4);
        const first = glyphMasks[low], second = glyphMasks[Math.min(10, low + 1)];
        const [red, green, blue] = inks[color];
        const left = column * glyphWidth, top = row * glyphHeight;
        const rows = Math.min(glyphHeight, canvas.height - top), columns = Math.min(glyphWidth, stride - left);
        const strength = alpha / 255;
        for (let y = 0; y < rows; y++) {
          let target = ((top + y) * stride + left) * 4;
          let source = y * glyphWidth;
          for (let x = 0; x < columns; x++, target += 4, source++) {
            const coverage = (first[source] + (second[source] - first[source]) * blend) * strength;
            if (coverage < 0.003) continue;
            output[target] = base[target] + (red - base[target]) * coverage;
            output[target + 1] = base[target + 1] + (green - base[target + 1]) * coverage;
            output[target + 2] = base[target + 2] + (blue - base[target + 2]) * coverage;
          }
        }
        visibleCount += 1;
      }
      ctx.putImageData(pixels, 0, 0);
    }
    function dispose() {
      if (disposed) return;
      disposed = true; atlas.width = atlas.height = 1;
      background = pixels = null; glyphMasks = []; backgroundKey = '';
      energy = warmth = facing = peak = new Float32Array(0);
      direction = new Uint8Array(0); active = new Uint32Array(0);
    }
    return { draw, dispose, seed: visitSeed,
      get stats() { return { glyphs: visibleCount, columns: gridWidth, rows: gridHeight, butterflies: 1, earthPoints: earth.length, ...metrics }; } };
  };
})();
