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
    const glyphs = '.:+=*xX#8B%@/\\|-~';
    const palettes = ['#7795b2', '#b2ccdc', '#e0ebee', '#d8b77d'];
    const atlas = document.createElement('canvas'), atlasContext = atlas.getContext('2d');
    if (!atlasContext) throw new Error('The ASCII glyph atlas is unavailable.');
    const roots = [], rootlets = [];
    let disposed = false, gridWidth = 0, gridHeight = 0, cellWidth = 0, cellHeight = 0;
    let glyphWidth = 0, glyphHeight = 0, atlasRatio = 0, mobileProfile = false;
    let energy = new Float32Array(0), warmth = new Float32Array(0), facing = new Float32Array(0);
    let peak = new Float32Array(0), direction = new Uint8Array(0), active = new Uint32Array(0);
    let activeCount = 0, visibleCount = 0, rootExtent = 0;
    let width = 1, height = 1, scale = 1, yawCos = 1, yawSin = 0, roll = 0;
    let pointerX = 0, pointerY = 0, pointerStrength = 0, burst = null;

    // Permanent branches grow in parent order; late fine rootlets have independent lives.
    function branch(ax, ay, cx, cy, bx, by, depth, strength, phase, parent = -1, attachment = 0, birth = 0, duration = 9, initial = 0) {
      roots.push({ ax, ay, cx, cy, bx, by, depth, strength, phase, parent, attachment, birth, duration, initial, growth: 0 });
      return roots.length - 1;
    }
    const rootTips = [[-0.49, -0.68], [-0.27, -0.91], [0.035, -0.99], [0.34, -0.83], [0.57, -0.57]];
    for (let r = 0; r < rootTips.length; r += 1) {
      const bx = rootTips[r][0], by = rootTips[r][1], side = bx < 0 ? -1 : 1;
      const ax = (r - 2) * 0.008, ay = -0.055;
      const cx = bx * (0.18 + hash(r + 20) * 0.22), cy = -0.29 - hash(r + 30) * 0.14;
      const depth = (hash(r + 40) - 0.5) * 0.15, phase = hash(r + 70) * TAU;
      const primary = branch(ax, ay, cx, cy, bx, by, depth, 0.84, phase, -1, 0, 0, 8.6 + r * 0.35, 0.50);
      for (let fork = 0; fork < 4; fork += 1) {
        const id = r * 13 + fork, t = 0.25 + fork * 0.17 + hash(id + 160) * 0.045, inv = 1 - t;
        const fx = inv * inv * ax + 2 * inv * t * cx + t * t * bx;
        const fy = inv * inv * ay + 2 * inv * t * cy + t * t * by;
        const direction = fork % 2 ? -side : side;
        const tx = fx + direction * (0.07 + hash(id + 200) * 0.10);
        const ty = Math.max(-0.98, fy - 0.095 - hash(id + 240) * 0.105);
        const qx = fx + direction * 0.025, qy = fy - (fy - ty) * 0.57;
        const secondary = branch(fx, fy, qx, qy, tx, ty, depth - 0.025, 0.40, phase + fork * 0.9,
          primary, t, -1.7 + fork * 1.15 + r * 0.18, 5.2 + hash(id + 270) * 1.6);
        rootlets.push({ parent: secondary, attachment: 0.56 + hash(id + 280) * 0.26,
          birth: 9 + rootlets.length * 0.83, period: 51 + hash(id + 290) * 27, id });
        for (let twig = 0; twig < 2; twig += 1) {
          const v = 0.43 + twig * 0.26, rest = 1 - v;
          const mx = rest * rest * fx + 2 * rest * v * qx + v * v * tx;
          const my = rest * rest * fy + 2 * rest * v * qy + v * v * ty;
          const reach = (twig ? -1 : 1) * direction * (0.035 + hash(id * 3 + twig + 300) * 0.05);
          branch(mx, my, mx + reach * 0.22, my - 0.045, mx + reach,
            Math.max(-0.99, my - 0.075 - hash(id + twig + 360) * 0.035),
            depth - 0.045, 0.22, phase + fork + twig + 2, secondary, v,
            3.4 + fork * 1.55 + twig * 1.1 + r * 0.26, 4.5 + hash(id + twig + 400));
        }
      }
    }
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
      const desiredWidth = mobile ? 5.7 : 7.2, desiredHeight = mobile ? 8.0 : 10.0;
      const density = Math.max(1, Math.sqrt(nextWidth * nextHeight / (desiredWidth * desiredHeight * 19000)));
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
      atlasContext.font = `${mobile ? 7.9 * density : 10.0 * density}px ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
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
      const left = Math.floor(column), top = Math.floor(row), fx = column - left, fy = row - top;
      const depth = clamp(0.48 + pz * 1.2);
      deposit(left, top, light * (1 - fx) * (1 - fy), warm, depth, kind);
      deposit(left + 1, top, light * fx * (1 - fy), warm, depth, kind);
      deposit(left, top + 1, light * (1 - fx) * fy, warm, depth, kind);
      deposit(left + 1, top + 1, light * fx * fy, warm, depth, kind);
    }

    function drawWings(time) {
      // The phase never resets. Its derivative keeps the beat near 4.5 seconds.
      const phase = time * TAU / 4.55 + 0.12 * Math.sin(time * 0.17) + 0.055 * Math.sin(time * 0.071);
      const breadth = 0.94 + noise(12, time, 11.7) * 0.025;
      const lift = noise(21, time, 13.3) * 0.012;
      for (let side = -1; side <= 1; side += 2) {
        const sideBend = noise(side < 0 ? 32 : 33, time, 8.9) * 0.018;
        for (let feather = 0; feather < feathers.length; feather += 1) {
          const shape = feathers[feather], f = shape.f;
          const tx = shape.x * breadth, ty = shape.y;
          const ax = 0.024, ay = 0.16 - f * 0.025;
          const pulsePhase = time * (0.84 + f * 0.09) - f * 2.3;
          for (let step = 0; step <= 36; step += 1) {
            const u = step / 36, bell = Math.sin(u * Math.PI);
            const localPhase = phase - u * u * 0.48 - f * 0.11 + side * 0.025;
            const fold = 0.5 - 0.5 * Math.cos(localPhase);
            const hinge = 0.10 + fold * 1.10;
            const hingeCos = Math.cos(hinge), hingeSin = Math.sin(hinge);
            const radial = ax + (tx - ax) * u + bell * 0.025;
            const x = side * radial * hingeCos;
            const y = 0.30 + (ay + (ty - ay) * u + bell * (0.035 - f * 0.055)) * 0.61 + lift;
            const z = radial * hingeSin * 0.58 + bell * (0.045 + sideBend);
            const spread = (0.008 + bell * 0.030) * (1 - u * 0.48);
            const pulse = 0.5 + 0.5 * Math.cos(u * TAU - pulsePhase);
            const light = (0.17 + pulse * pulse * 0.11) * (0.4 + bell * 0.6) * (0.82 + hingeCos * 0.18);
            for (let lane = -2; lane <= 2; lane += 1) {
              const offset = lane * spread * 0.45;
              point(x + side * offset * shape.nx * hingeCos, y + offset * shape.ny * 0.61,
                z + offset * shape.nx * hingeSin * 0.58, light * (lane === 0 ? 1.55 : 0.85), 0, 0);
            }
            if (step % 2 === 0) point(x, y, z + 0.012, 0.22 * (0.35 + bell * 0.65), 0, side < 0 ? 2 : 3);
          }
        }
      }
      // A short body belongs only to the wings; nothing crosses the empty interval.
      for (let strand = 0; strand < 5; strand += 1) {
        for (let step = 0; step <= 26; step += 1) {
          const u = step / 26, y = 0.27 + u * 0.36 + lift;
          const x = (strand - 2) * 0.006 * Math.sin(u * Math.PI);
          point(x, y, 0.035, 0.24 * Math.sin(u * Math.PI), 0, 1);
        }
      }
    }

    function paintRoot(root, growth, opacity, time, depth) {
      if (growth < 0.00001 || opacity < 0.0001) return;
      const kind = Math.abs(root.bx - root.ax) < 0.09 ? 1 : root.bx < root.ax ? 3 : 2;
      const steps = root.strength > 0.6 ? 40 : 22;
      const count = Math.floor(growth * steps);
      for (let step = 0; step <= count; step += 1) {
        const u = step / steps, inv = 1 - u;
        const rawY = inv * inv * root.ay + 2 * inv * u * root.cy + u * u * root.by;
        const y = -0.18 + (rawY + 0.055) * 0.81;
        const x = inv * inv * root.ax + 2 * inv * u * root.cx + u * u * root.bx +
          Math.sin(-y * 3 + time * 0.22) * 0.009 * y * y;
        const flow = 0.65 + 0.35 * Math.cos(y * 7 + time * 0.9 - root.phase * 0.35);
        const mature = smooth((growth - 0.90) / 0.10);
        // Fixed samples enter at zero light with zero first/second derivatives.
        const tip = smooth((growth - u) / 0.075) * (1 - smooth((u - 0.84) / 0.16) * 0.45);
        const light = root.strength * (0.40 + flow * 0.27) * tip * opacity;
        const warm = Math.exp(-Math.pow((growth - u - 0.055) * 27, 2)) * 0.48 * (1 - mature);
        point(x, y, depth, light, warm, kind);
        if (root.strength > 0.6) point(x + 0.010, y, depth - 0.01, light * 0.5, warm, kind);
      }
    }

    const liveRoot = { ax: 0, ay: 0, cx: 0, cy: 0, bx: 0, by: 0, strength: 0.28, phase: 0 };
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
        const parent = roots[slot.parent], v = slot.attachment, inv = 1 - v;
        const id = slot.id + generation * 131;
        const gate = smooth((parent.growth - v) / 0.065);
        const growth = smooth(age / (5.3 + hash(id + 460) * 3.1)) * gate;
        const opacity = 1 - smooth((age - slot.period + 9) / 9);
        liveRoot.ax = inv * inv * parent.ax + 2 * inv * v * parent.cx + v * v * parent.bx;
        liveRoot.ay = inv * inv * parent.ay + 2 * inv * v * parent.cy + v * v * parent.by;
        const direction = hash(id + 470) < 0.5 ? -1 : 1;
        const reach = direction * (0.035 + hash(id + 480) * 0.07);
        liveRoot.cx = liveRoot.ax + reach * 0.15; liveRoot.cy = liveRoot.ay - 0.055;
        liveRoot.bx = liveRoot.ax + reach;
        liveRoot.by = Math.max(-0.995, liveRoot.ay - 0.10 - hash(id + 490) * 0.055);
        liveRoot.phase = hash(id + 500) * TAU;
        paintRoot(liveRoot, growth, opacity, time, parent.depth - 0.035);
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
      drawWings(t); drawRoots(t);
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
        else glyph = Math.min(10, Math.max(1, brightness * 10 + variation - 1));
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
      ctx.globalAlpha = 1;
    }
    function dispose() {
      if (disposed) return;
      disposed = true; atlas.width = atlas.height = 1;
      energy = warmth = facing = peak = new Float32Array(0);
      direction = new Uint8Array(0); active = new Uint32Array(0);
    }
    return { draw, dispose, seed: visitSeed,
      get stats() { return { glyphs: visibleCount, columns: gridWidth, rows: gridHeight, branches: roots.length, rootExtent }; } };
  };
})();
