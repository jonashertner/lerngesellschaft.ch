/* Shared living curves with analytically antialiased fibers; no canvas blur or MSAA. */
(() => {
  'use strict';

  window.createLearningUniverseRenderer = function createLearningUniverseRenderer(gl) {
    if (!gl) throw new Error('The living field requires a WebGL context.');
    const TAU = Math.PI * 2;
    const halfWidth = 0.38;
    const clamp = value => Math.max(0, Math.min(1, value));
    const smooth = (a, b, value) => {
      const t = clamp((value - a) / (b - a));
      return t * t * (3 - 2 * t);
    };
    const evolution = window.learningSocietyEvolution;
    if (!evolution) throw new Error('The shared living-field evolution engine is unavailable.');
    const mobileCos = Math.cos(0.10), mobileSin = Math.sin(0.10);
    let disposed = false;
    let active = 'desktop';
    let program = null;
    const resources = [];
    const uniforms = {};
    const vertexSource = `
      precision highp float;
      attribute vec4 aPosition;
      attribute vec4 aColor;
      uniform lowp float uKind;
      varying mediump vec4 vColor;
      varying mediump vec2 vEdge;
      void main() {
        gl_Position = vec4(aPosition.xy, 0.0, 1.0);
        gl_PointSize = uKind > 0.5 ? aPosition.z : 1.0;
        vColor = aColor;
        vEdge = aPosition.zw;
      }`;
    const fragmentSource = `
      precision mediump float;
      uniform lowp float uKind;
      uniform float uHalfWidth;
      varying mediump vec4 vColor;
      varying mediump vec2 vEdge;
      void main() {
        float coverage;
        if (uKind < 0.5) {
          // Pixel-area coverage of a narrow strip. Dense subpixel fibers retain
          // their light energy instead of switching whole pixels on and off.
          float footprint = max(vEdge.y, 0.0001);
          coverage = clamp((uHalfWidth + footprint - abs(vEdge.x)) / (2.0 * footprint),
            0.0, min(1.0, uHalfWidth / footprint));
        } else {
          float r = length(gl_PointCoord * 2.0 - 1.0);
          if (r > 1.0) discard;
          coverage = exp(-r * r * 22.0) * 0.80 + (1.0 - r) * (1.0 - r) * 0.24;
        }
        gl_FragColor = vec4(vColor.rgb, vColor.a * coverage);
      }`;

    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate the living-field shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'unknown compiler error';
        gl.deleteShader(shader);
        throw new Error(`Living-field shader: ${message}`);
      }
      return shader;
    }

    function profile(filaments, segments, particles) {
      const lanes = new Float32Array(filaments);
      const seeds = new Float32Array(filaments);
      for (let i = 0; i < filaments; i += 1) {
        lanes[i] = Math.floor(i / 6) / (filaments / 6 - 1) * 2 - 1;
        seeds[i] = ((i * 73 + 19) % 997) / 997;
      }
      const indices = new Uint16Array(filaments * segments * 6);
      let cursor = 0;
      for (let strand = 0; strand < filaments; strand += 1) {
        for (let j = 0; j < segments; j += 1) {
          const at = (strand * (segments + 1) + j) * 2;
          indices[cursor++] = at; indices[cursor++] = at + 2; indices[cursor++] = at + 3;
          indices[cursor++] = at; indices[cursor++] = at + 3; indices[cursor++] = at + 1;
        }
      }
      return { segments, lanes, seeds, indices,
        stats: Object.freeze({ filaments, particles, bundles: 6 }),
        curves: new Float32Array(6 * (segments + 1) * 9),
        pulses: new Float32Array(6 * (segments + 1)),
        path: new Float32Array((segments + 1) * 8),
        normals: new Float32Array((segments + 1) * 3),
        lines: new Float32Array(filaments * (segments + 1) * 2 * 8),
        points: new Float32Array(particles * 8) };
    }

    const meshes = { desktop: profile(96, 48, 1800), mobile: profile(96, 40, 1200) };
    let vertex = null, fragment = null;
    let lineBuffer, pointBuffer, indexBuffer, indexedMesh = null;
    try {
      vertex = compile(gl.VERTEX_SHADER, vertexSource);
      fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate the living-field program.');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.bindAttribLocation(program, 1, 'aColor');
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Living-field program: ${gl.getProgramInfoLog(program) || 'link error'}`);
      }
      uniforms.kind = gl.getUniformLocation(program, 'uKind');
      uniforms.halfWidth = gl.getUniformLocation(program, 'uHalfWidth');
      lineBuffer = gl.createBuffer();
      if (lineBuffer) resources.push(lineBuffer);
      pointBuffer = gl.createBuffer();
      if (pointBuffer) resources.push(pointBuffer);
      indexBuffer = gl.createBuffer();
      if (indexBuffer) resources.push(indexBuffer);
      if (!lineBuffer || !pointBuffer || !indexBuffer) throw new Error('Unable to allocate the living-field geometry.');
    } catch (error) {
      resources.forEach(handle => gl.deleteBuffer(handle));
      if (program) gl.deleteProgram(program);
      throw error;
    } finally {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }

    const curvedPoint = new Float64Array(3);
    function smoothPoint(mesh, state, bundle, lo, across, at, along) {
      const values = mesh.curves, start = bundle * (mesh.segments + 1) * 9 + lo;
      const a = start + at * 9, b = a + 9;
      const previous = start + (at > 0 ? at - 1 : mesh.segments - 1) * 9;
      const following = start + (at + 2 <= mesh.segments ? at + 2 : 1) * 9;
      for (let axis = 0; axis < 3; axis += 1) {
        const p1 = values[a + axis] + (values[a + axis + 3] - values[a + axis]) * across;
        const p2 = values[b + axis] + (values[b + axis + 3] - values[b + axis]) * across;
        let p0 = values[previous + axis] + (values[previous + axis + 3] - values[previous + axis]) * across;
        let p3 = values[following + axis] + (values[following + axis + 3] - values[following + axis]) * across;
        if (at === 0) p0 = 2 * p1 - p2 + (p0 - 2 * p1 + p2) * state.closure;
        if (at + 2 > mesh.segments) p3 = 2 * p2 - p1 + (p3 - 2 * p2 + p1) * state.closure;
        curvedPoint[axis] = p1 + 0.5 * along * (p2 - p0 + along *
          (2 * p0 - 5 * p1 + 4 * p2 - p3 + along * (3 * (p1 - p2) + p3 - p0)));
      }
    }

    function sample(mesh, state, bundle, lane, u, seed, point, target, offset) {
      const scaled = u * mesh.segments;
      const at = Math.min(mesh.segments - 1, Math.floor(scaled));
      const along = scaled - at;
      const base = (bundle * (mesh.segments + 1) + at) * 9;
      const lo = lane < 0 ? 0 : 3;
      const across = lane < 0 ? lane + 1 : lane;
      const values = mesh.curves;
      const a = base + lo, b = a + 3, c = a + 9, d = b + 9;
      let x = (values[a] + (values[b] - values[a]) * across) * (1 - along) +
        (values[c] + (values[d] - values[c]) * across) * along;
      let y = (values[a + 1] + (values[b + 1] - values[a + 1]) * across) * (1 - along) +
        (values[c + 1] + (values[d + 1] - values[c + 1]) * across) * along;
      let z = (values[a + 2] + (values[b + 2] - values[a + 2]) * across) * (1 - along) +
        (values[c + 2] + (values[d + 2] - values[c + 2]) * across) * along;
      if (point) {
        // Moving lights follow a smooth tangent through shared curve samples;
        // their direction no longer changes abruptly at polygon boundaries.
        smoothPoint(mesh, state, bundle, lo, across, at, along);
        x = curvedPoint[0]; y = curvedPoint[1]; z = curvedPoint[2];
      }
      let proximity = 0, ripple = 0;
      if (state.pointerStrength > 0.001) {
        const dx = x - state.pointerX, dy = y - state.pointerY;
        proximity = Math.exp(-(dx * dx + dy * dy) * 3.2) * state.pointerStrength;
        x += (dx * 0.10 - dy * 0.16) * proximity;
        y += (dy * 0.10 + dx * 0.16) * proximity;
        z += proximity * 0.14;
      }
      if (state.burstAge >= 0 && state.burstAge < 4) {
        const dx = x - state.burstX, dy = y - state.burstY;
        const distance = Math.hypot(dx, dy), wave = distance - state.burstAge * 1.35;
        ripple = Math.exp(-wave * wave * 20 - state.burstAge * 0.95);
        const strength = ripple * 0.11 / Math.max(distance, 0.1);
        x += dx * strength; y += dy * strength; z += ripple * 0.12;
      }
      const perspective = 4.7 / (4.7 - z);
      const pulseBase = bundle * (mesh.segments + 1) + at;
      const travelling = mesh.pulses[pulseBase] +
        (mesh.pulses[pulseBase + 1] - mesh.pulses[pulseBase]) * along;
      const near = clamp((z + 0.65) / 1.3), core = 1 - Math.abs(lane) * 0.65;
      const crest = core * (0.25 + travelling * 0.75);
      const ivory = clamp(0.34 + near * 0.37 + crest * 0.27);
      const group = bundle * 0.2;
      const deepR = 0.18 - 0.02 * group * 0.6;
      const deepG = 0.30 + 0.28 * group * 0.6;
      const deepB = 0.78 - 0.13 * group * 0.6;
      let r = deepR + (0.99 - deepR) * ivory;
      let g = deepG + (0.95 - deepG) * ivory;
      let bColor = deepB + (0.82 - deepB) * ivory;
      if (bundle === 2) {
        r += (1 - r) * 0.74; g += (0.64 - g) * 0.74; bColor += (0.29 - bColor) * 0.74;
      }
      const tip = 0.075 + group * 0.025;
      const endFade = smooth(0, tip, u) * (1 - smooth(1 - tip, 1, u));
      const envelope = endFade + (1 - endFade) * state.closure;
      const depth = 0.45 + near * 0.55;
      const alpha = point ? envelope * depth * (0.34 + travelling * 0.46 + ripple * 0.30)
        : envelope * depth * (0.11 + core * 0.12 + travelling * 0.27 + proximity * 0.08 + ripple * 0.18) * state.lineGain / (halfWidth * 2);
      target[offset] = state.width * 0.5 + x * state.scale * perspective;
      target[offset + 1] = state.height * 0.5 - y * state.scale * perspective;
      let rare = seed * seed; rare *= rare; rare *= rare;
      target[offset + 2] = point ? state.pixelRatio * perspective * (1.5 + rare * 4.8) : z;
      target[offset + 3] = 0;
      target[offset + 4] = r + travelling * 0.10 + ripple * 0.12;
      target[offset + 5] = g + travelling * 0.075 + ripple * 0.075;
      target[offset + 6] = bColor + travelling * 0.02 + ripple * 0.025;
      target[offset + 7] = Math.min(1, alpha);
    }

    const state = {};
    function populate(mesh, time, width, height, pixelRatio, mobile, pointer, burst) {
      evolution.stateAt(time, state);
      state.lineGain = mobile ? 1 : 1.2;
      state.width = width; state.height = height; state.pixelRatio = pixelRatio;
      state.scale = Math.min(width, height) * (mobile ? 0.31 : 0.33);
      state.pointerX = pointer ? pointer.x * width / (state.scale * 2) : 0;
      state.pointerY = pointer ? -pointer.y * height / (state.scale * 2) : 0;
      state.pointerStrength = pointer ? pointer.strength : 0;
      state.burstAge = burst ? Math.max(0, burst.age) : -1;
      state.burstX = burst ? burst.x * width / (state.scale * 2) : 0;
      state.burstY = burst ? -burst.y * height / (state.scale * 2) : 0;
      for (let bundle = 0; bundle < 6; bundle += 1) {
        for (let j = 0; j <= mesh.segments; j += 1) {
          const u = j / mesh.segments, index = bundle * (mesh.segments + 1) + j;
          for (let edge = 0; edge < 3; edge += 1) {
            const at = index * 9 + edge * 3;
            evolution.curve(u, edge - 1, bundle, state, mesh.curves, at);
            if (mobile) {
              const x = mesh.curves[at], y = mesh.curves[at + 1];
              mesh.curves[at] = x * mobileCos - y * mobileSin;
              mesh.curves[at + 1] = x * mobileSin + y * mobileCos;
            }
          }
          let pulse = 0.5 + 0.5 * Math.cos(u * TAU * 2 - state.pulsePhase[bundle]);
          pulse *= pulse; pulse *= pulse; pulse *= pulse;
          mesh.pulses[index] = pulse;
        }
      }
      let cursor = 0;
      const path = mesh.path, normals = mesh.normals;
      const ndcX = 2 / width, ndcY = 2 / height;
      for (let strand = 0; strand < mesh.stats.filaments; strand += 1) {
        for (let j = 0; j <= mesh.segments; j += 1) {
          sample(mesh, state, strand % 6, mesh.lanes[strand], j / mesh.segments,
            mesh.seeds[strand], false, path, j * 8);
        }
        for (let j = 0; j <= mesh.segments; j += 1) {
          const seam = state.aperture > 0.9999 && (j === 0 || j === mesh.segments);
          const before = (seam ? mesh.segments - 1 : Math.max(0, j - 1)) * 8;
          const after = (seam ? 1 : Math.min(mesh.segments, j + 1)) * 8;
          const dx = path[after] - path[before], dy = path[after + 1] - path[before + 1];
          const length = Math.hypot(dx, dy) || 1;
          normals[j * 3] = -dy / length;
          normals[j * 3 + 1] = dx / length;
          normals[j * 3 + 2] = 0.5 * (Math.abs(dy) + Math.abs(dx)) / length / pixelRatio;
        }
        // Every edge vertex is shared by its adjacent triangles. The immutable
        // index buffer removes two thirds of vertex uploads and shader work.
        for (let j = 0; j <= mesh.segments; j += 1) {
          const at = j * 8, normal = j * 3;
          const footprint = normals[normal + 2];
          for (let side = 0; side < 2; side += 1) {
            const edge = (side * 2 - 1) * (halfWidth + footprint);
            mesh.lines[cursor++] = (path[at] + normals[normal] * edge) * ndcX - 1;
            mesh.lines[cursor++] = 1 - (path[at + 1] + normals[normal + 1] * edge) * ndcY;
            mesh.lines[cursor++] = edge;
            mesh.lines[cursor++] = footprint;
            mesh.lines[cursor++] = path[at + 4];
            mesh.lines[cursor++] = path[at + 5];
            mesh.lines[cursor++] = path[at + 6];
            mesh.lines[cursor++] = path[at + 7];
          }
        }
      }
      for (let index = 0; index < mesh.stats.particles; index += 1) {
        const strand = index % mesh.stats.filaments, bundle = strand % 6;
        const u = (index * 0.61803398875 + state.flow[bundle]) % 1;
        const at = index * 8;
        sample(mesh, state, bundle, mesh.lanes[strand], u, mesh.seeds[strand], true, mesh.points, at);
        mesh.points[at] = mesh.points[at] * ndcX - 1;
        mesh.points[at + 1] = 1 - mesh.points[at + 1] * ndcY;
      }
    }

    function draw({ time = 0, width, height, pixelRatio = 1, mobile = false, pointer, burst } = {}) {
      if (disposed || gl.isContextLost() || !(width > 0 && height > 0)) return;
      active = mobile ? 'mobile' : 'desktop';
      const mesh = meshes[active];
      populate(mesh, time, width, height, Math.max(0.5, pixelRatio), mobile, pointer, burst);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.STENCIL_TEST);
      gl.colorMask(true, true, true, true);
      gl.clearColor(8 / 255, 14 / 255, 32 / 255, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
      gl.useProgram(program);
      gl.uniform1f(uniforms.halfWidth, halfWidth);
      gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.lines, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
      gl.uniform1f(uniforms.kind, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      if (indexedMesh !== mesh) {
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        indexedMesh = mesh;
      }
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.points, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
      gl.uniform1f(uniforms.kind, 1);
      gl.drawArrays(gl.POINTS, 0, mesh.stats.particles);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      resources.forEach(handle => gl.deleteBuffer(handle));
      gl.deleteProgram(program);
    }
    return { draw, dispose, get stats() { return meshes[active].stats; } };
  };
})();
