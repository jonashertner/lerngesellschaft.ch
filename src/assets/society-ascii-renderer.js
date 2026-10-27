/* A living butterfly, drawn entirely with a reusable atlas of ASCII type. */
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
  function flightPath(channel, time, spacing, order = 0) {
    const p = time / spacing + hash(channel + 1200) * 19, k = Math.floor(p), u = p - k;
    const a = hash(channel * 4099 + k) * 2 - 1;
    const change = hash(channel * 4099 + k + 1) * 2 - 1 - a, v = 1 - u;
    // C4 drift keeps acceleration-led posture C2 through every change of direction.
    if (order === 2) return change * 2520 * u ** 3 * v ** 3 * (1 - 2 * u) / (spacing * spacing);
    if (order === 1) return change * 630 * u ** 4 * v ** 4 / spacing;
    return a + change * u ** 5 * (126 + u * (-420 + u * (540 + u * (-315 + u * 70))));
  }

  window.createRootsAndWingsRenderer = function createRootsAndWingsRenderer(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('An ASCII canvas is required.');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('The ASCII field requires Canvas2D.');
    const glyphs = '.,:+*xX#8B%@/\\|-~';
    const palettes = ['#7795b2', '#b2ccdc', '#e0ebee', '#d8b77d'];
    const atlas = document.createElement('canvas'), atlasContext = atlas.getContext('2d');
    if (!atlasContext) throw new Error('The ASCII glyph atlas is unavailable.');
    let disposed = false, gridWidth = 0, gridHeight = 0, cellWidth = 0, cellHeight = 0;
    let glyphWidth = 0, glyphHeight = 0, atlasRatio = 0, mobileProfile = false;
    let energy = new Float32Array(0), warmth = new Float32Array(0), facing = new Float32Array(0);
    let peak = new Float32Array(0), direction = new Uint8Array(0), active = new Uint32Array(0);
    let activeCount = 0, visibleCount = 0;
    let width = 1, height = 1, scale = 1, yawCos = 1, yawSin = 0;
    let bankCos = 1, bankSin = 0, pitchCos = 1, pitchSin = 0;
    let flightX = 0, flightY = 0, flightScale = 1;
    let pointerX = 0, pointerY = 0, pointerStrength = 0, burst = null;

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

    }

    function deposit(column, row, value, warm, depth, kind) {
      if (column < 0 || row < 0 || column >= gridWidth || row >= gridHeight || value <= 0.0001) return;
      const index = row * gridWidth + column;
      if (energy[index] === 0) active[activeCount++] = index;
      energy[index] += value; warmth[index] += warm * value; facing[index] += depth * value;
      if (value > peak[index]) { peak[index] = value; direction[index] = kind; }
    }
    function point(x, y, z, light, warm = 0, kind = 0) {
      // Hinge, turn and hover belong to one body; no independent orbiting parts.
      const turnedX = x * yawCos + z * yawSin;
      const turnedZ = z * yawCos - x * yawSin;
      const pitchedY = y * pitchCos - turnedZ * pitchSin;
      z = (y * pitchSin + turnedZ * pitchCos) * flightScale;
      x = (turnedX * bankCos - pitchedY * bankSin) * flightScale + flightX;
      y = (pitchedY * bankCos + turnedX * bankSin) * flightScale + flightY;
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
      const perspective = 4.5 / (4.5 - z);
      const column = (width * 0.5 + x * scale * perspective) / cellWidth - 0.5;
      const row = (height * 0.49 - y * scale * perspective) / cellHeight - 0.5;
      const left = Math.floor(column), top = Math.floor(row), fx = column - left, fy = row - top;
      const depth = clamp(0.48 + z * 0.8);
      deposit(left, top, light * (1 - fx) * (1 - fy), warm, depth, kind);
      deposit(left + 1, top, light * fx * (1 - fy), warm, depth, kind);
      deposit(left, top + 1, light * (1 - fx) * fy, warm, depth, kind);
      deposit(left + 1, top + 1, light * fx * fy, warm, depth, kind);
    }

    function drawWings(time, phase, ease) {
      const breadth = 0.96 + noise(12, time, 8.7) * 0.025;
      // A few shallower strokes gently ease the effort; the beat never resets or stops.
      const effort = 1 - ease * 0.25;
      const flapDepth = (1.10 + noise(16, time, 5.7) * 0.05) * effort;
      const beatLift = Math.sin(phase - 0.65) * 0.018 * effort;
      flightY += beatLift;
      for (let side = -1; side <= 1; side += 2) {
        const sideBend = noise(side < 0 ? 32 : 33, time, 6.9) * 0.025 + side * bankSin * 0.055;
        const sidePhase = noise(side < 0 ? 44 : 45, time, 7.3) * 0.055 + side * bankSin * 0.13;
        for (let feather = 0; feather < feathers.length; feather += 1) {
          const shape = feathers[feather], f = shape.f;
          const tx = shape.x * breadth, ty = shape.y;
          const ax = 0.024, ay = 0.16 - f * 0.025;
          const vein = Math.pow(0.5 + 0.5 * Math.cos(f * TAU * 7.1), 12);
          const upperVein = 1 - smooth((f - 0.42) / 0.14);
          for (let step = 0; step <= 40; step += 1) {
            const u = step / 40, bell = Math.sin(u * Math.PI), edge = u * u * u;
            const localPhase = phase - u * u * 0.72 - f * 0.19 + sidePhase;
            // A slightly quicker closing stroke and softer return, with delayed tips.
            const stroke = localPhase + 0.18 * (1 - Math.cos(localPhase));
            const fold = 0.5 - 0.5 * Math.cos(stroke);
            const hinge = 0.06 + fold * flapDepth + edge * sideBend;
            const hingeCos = Math.cos(hinge), hingeSin = Math.sin(hinge);
            const flex = Math.sin(localPhase - 0.65 + f * 3.1) * edge * 0.045;
            const radial = ax + (tx - ax) * u + bell * 0.025;
            const x = side * radial * hingeCos;
            const y = ay + (ty - ay) * u + bell * (0.035 - f * 0.055) - 0.35 + flex;
            const z = radial * hingeSin * 0.58 + bell * (0.045 + sideBend) + flex * 0.5;
            const spread = (0.006 + bell * 0.022) * (1 - u * 0.58);
            const travellingLight = 0.5 + 0.5 * Math.cos(u * 5.2 - time * 1.45 - f * 2.3);
            const membrane = 0.090 + travellingLight * 0.053;
            const taper = (0.38 + bell * 0.62) * (1 - smooth((u - 0.80) / 0.20) * 0.55);
            const light = membrane * taper * (0.82 + hingeCos * 0.18);
            for (let lane = -1; lane <= 1; lane += 1) {
              const offset = lane * spread * 0.60;
              point(x + side * offset * shape.nx * hingeCos, y + offset * shape.ny,
                z + offset * shape.nx * hingeSin * 0.58, light * (lane === 0 ? 1.4 : 0.8), 0, 0);
            }
            // Light travels through the veins, never flashes the whole membrane.
            const edgeLight = 1 + upperVein * smooth((u - 0.50) / 0.35) * 0.28;
            point(x, y, z + 0.008, vein * (0.34 + travellingLight * 0.14) * taper * edgeLight, 0, 0);
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
            0.27 * Math.sin(u * Math.PI), 0, 1);
        }
      }
      for (let side = -1; side <= 1; side += 2) {
        for (let step = 0; step <= 18; step += 1) {
          const u = step / 18, curl = Math.sin(u * Math.PI * 0.75);
          const flex = u * u * (Math.sin(time * 1.8 + side * 0.4) * 0.006 + bankSin * 0.02);
          point(side * (0.006 + u * 0.064 + curl * 0.014) + flex, 0.21 + u * 0.15,
            0.035, 0.15 * (1 - u * 0.62), 0, side < 0 ? 2 : 3);
        }
      }
    }

    function draw({ time = 0, width: nextWidth, height: nextHeight, pixelRatio = 1, mobile = false, pointer, burst: nextBurst } = {}) {
      if (disposed || !(nextWidth > 1 && nextHeight > 1)) return;
      width = nextWidth; height = nextHeight;
      const ratio = Math.max(0.5, Math.min(2, pixelRatio));
      prepare(width, height, ratio, mobile);
      scale = Math.min(width * 0.42, height * 0.44);
      const t = Number.isFinite(time) ? Math.max(0, time) : 0;
      const phase = t * TAU / 1.65 + 0.45 * Math.sin(t * 0.74) + 0.16 * Math.sin(t * 1.31) + noise(28, t, 5.1) * 0.20;
      const ease = smooth((noise(26, t, 5.6) - 0.05) / 0.65);
      const vx = Math.cos(t * 0.52) * 0.052 * 0.52 + flightPath(20, t, 8.7, 1) * 0.105;
      const vy = Math.cos(t * 0.39 + 0.3) * 0.055 * 0.39 + flightPath(21, t, 10.3, 1) * 0.08;
      const ax = -Math.sin(t * 0.52) * 0.052 * 0.52 * 0.52 + flightPath(20, t, 8.7, 2) * 0.105;
      // Posture follows the whole flight path, including its changing drift.
      // Soft limits keep every turn continuous while the body settles as it slows.
      const yaw = 0.22 * Math.tanh(vx * 8.5 + noise(4, t, 9.1) * 0.10);
      const bank = -0.16 * Math.tanh(vx * 8 + ax * 20);
      const pitch = 0.10 * Math.tanh(-vy * 13 + Math.sin(phase - 0.8) * 0.10 * (1 - ease * 0.25));
      yawCos = Math.cos(yaw); yawSin = Math.sin(yaw);
      bankCos = Math.cos(bank); bankSin = Math.sin(bank);
      pitchCos = Math.cos(pitch); pitchSin = Math.sin(pitch);
      // Mobile canvas extends beyond the viewport; reserve space inside its visible centre.
      flightScale = mobile ? Math.min(0.80, width / height * 0.64) : 1.02;
      flightX = (Math.sin(t * 0.52) * 0.052 + flightPath(20, t, 8.7) * 0.105) * (mobile ? 0.65 : 1);
      flightY = Math.sin(t * 0.39 + 0.3) * 0.055 + flightPath(21, t, 10.3) * 0.08;
      pointerStrength = pointer && Number.isFinite(pointer.strength) ? clamp(pointer.strength) : 0;
      pointerX = pointer ? pointer.x * width / (scale * 2) : 0;
      pointerY = pointer ? -pointer.y * height / (scale * 2) : 0;
      burst = nextBurst;
      energy.fill(0); warmth.fill(0); facing.fill(0); peak.fill(0); activeCount = 0; visibleCount = 0;
      drawWings(t, phase, ease);
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
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1;
    }
    function dispose() {
      if (disposed) return;
      disposed = true; atlas.width = atlas.height = 1;
      energy = warmth = facing = peak = new Float32Array(0);
      direction = new Uint8Array(0); active = new Uint32Array(0);
    }
    return { draw, dispose, seed: visitSeed,
      get stats() { return { glyphs: visibleCount, columns: gridWidth, rows: gridHeight, butterflies: 1 }; } };
  };
})();
