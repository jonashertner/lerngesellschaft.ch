/* Background neural-network animation.

   Hebbian-like dynamics: a population of nodes fire on individual timers;
   activity propagates along strong edges; co-firing strengthens an edge
   (Hebb's rule), unused edges decay. The visible network is therefore
   sparse-but-alive — only edges above a strength threshold render — so
   the page's margins are populated by a continuously evolving filigree
   of connections that grow, settle, and fade.

   Respects prefers-reduced-motion. Hidden on narrow viewports. */

(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "network-bg";
  canvas.setAttribute("aria-hidden", "true");

  function attach() {
    document.body.insertBefore(canvas, document.body.firstChild);
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }

  const ctx = canvas.getContext("2d");

  let dpr = 1;
  let W = 0;
  let H = 0;
  let nodes = [];
  let edges = [];
  let lastTime = 0;
  let rafId = 0;

  const NODE_COUNT_DESKTOP = 120;
  const NODE_COUNT_TABLET = 70;
  const NODE_COUNT_MOBILE = 0; // hidden on mobile via CSS, but also no nodes
  const EDGE_DISTANCE = 130;
  const MAX_NEIGHBORS = 5;

  // Tuning constants
  const FIRE_DECAY = 0.94; // per frame
  const STRENGTH_DECAY = 0.9988;
  const STRENGTH_GROWTH = 0.06;
  const PROPAGATE_PROB = 0.012; // per-frame chance a strong edge propagates a fire
  const VISIBLE_EDGE_THRESHOLD = 0.02;
  const VISIBLE_EDGE_OPACITY_SCALE = 1.0;
  const NODE_BASE_OPACITY = 0.55;
  const NODE_FIRE_OPACITY_GAIN = 0.45;

  // Colour: fountain-pen blue (#1a3a5e) — CSS var read once
  const ACCENT_RGB = "26, 58, 94";

  function nodeCountFor(w) {
    if (w < 700) return NODE_COUNT_MOBILE;
    if (w < 1100) return NODE_COUNT_TABLET;
    return NODE_COUNT_DESKTOP;
  }

  function init() {
    resize();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
    window.addEventListener("resize", debounce(resize, 200));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !rafId) {
        rafId = requestAnimationFrame(tick);
      } else if (document.visibilityState !== "visible" && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    });
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
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

    const count = nodeCountFor(W);
    seedNodesAndEdges(count);
  }

  function seedNodesAndEdges(count) {
    nodes = new Array(count);
    for (let i = 0; i < count; i++) {
      nodes[i] = {
        x: Math.random() * W,
        y: Math.random() * H,
        fire: Math.random() * 0.5,
        baseSize: 1.5 + Math.random() * 1.8,
        nextFire: 600 + Math.random() * 5500,
      };
    }

    const built = new Set();
    edges = [];
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const candidates = [];
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < EDGE_DISTANCE * EDGE_DISTANCE) {
          candidates.push({ j, d2 });
        }
      }
      candidates.sort((p, q) => p.d2 - q.d2);
      const k = Math.min(candidates.length, MAX_NEIGHBORS);
      for (let n = 0; n < k; n++) {
        const j = candidates[n].j;
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        const key = lo * 100000 + hi;
        if (built.has(key)) continue;
        built.add(key);
        edges.push({
          a: lo,
          b: hi,
          strength: 0.10 + Math.random() * 0.20,
        });
      }
    }
  }

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 80) : 16;
    lastTime = time;

    // 1. Update node fire decay + spontaneous firing
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.fire *= FIRE_DECAY;
      n.nextFire -= dt;
      if (n.nextFire <= 0) {
        n.fire = 1.0;
        n.nextFire = 1500 + Math.random() * 7000;
      }
    }

    // 2. Update edges (strength decay + Hebbian growth + propagation)
    const propagated = new Float32Array(nodes.length);
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      const a = nodes[edge.a];
      const b = nodes[edge.b];

      // Hebbian co-firing growth
      if (a.fire > 0.4 && b.fire > 0.4) {
        edge.strength = Math.min(1, edge.strength + STRENGTH_GROWTH);
      }
      // Slow decay
      edge.strength *= STRENGTH_DECAY;

      // Propagate signal along strong edges (probabilistic)
      if (edge.strength > 0.25) {
        const p = edge.strength * PROPAGATE_PROB * (dt / 16);
        if (a.fire > 0.6 && Math.random() < p) {
          if (a.fire * 0.7 > propagated[edge.b]) propagated[edge.b] = a.fire * 0.7;
        }
        if (b.fire > 0.6 && Math.random() < p) {
          if (b.fire * 0.7 > propagated[edge.a]) propagated[edge.a] = b.fire * 0.7;
        }
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      if (propagated[i] > nodes[i].fire) nodes[i].fire = propagated[i];
    }

    // 3. Render
    ctx.clearRect(0, 0, W, H);

    // Edges (only above visible threshold)
    ctx.lineWidth = 1.0;
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      if (edge.strength < VISIBLE_EDGE_THRESHOLD) continue;
      const opacity = (edge.strength - VISIBLE_EDGE_THRESHOLD) * VISIBLE_EDGE_OPACITY_SCALE;
      if (opacity < 0.005) continue;
      const a = nodes[edge.a];
      const b = nodes[edge.b];
      ctx.strokeStyle = `rgba(${ACCENT_RGB}, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const size = n.baseSize + n.fire * 1.6;
      const opacity = NODE_BASE_OPACITY + n.fire * NODE_FIRE_OPACITY_GAIN;
      ctx.fillStyle = `rgba(${ACCENT_RGB}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(tick);
  }
})();
