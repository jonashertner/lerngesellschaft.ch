/* Three behaviours, no title animation:

   1. SIDENOTES — absolute-positioned to align with marker line on wide
      screens, overlap-stacked, faded in 380ms after first scroll-in.
      Below 900px they collapse to inline expandable on marker tap.

   2. HAIRLINE BIND — on marker hover (wide screens), an SVG path is drawn
      in fountain-pen blue from the marker to its sidenote via stroke-
      dashoffset over 280ms. Reverses on hover-out.

   3. SECTION ARRIVAL PULSE — when a section heading enters the viewport,
      its Roman numeral briefly brightens (color shift) for 1.2s. */

const NS = "http://www.w3.org/2000/svg";
const WIDE = window.matchMedia("(min-width: 901px)");
const REVEAL_DELAY_MS = 380;

/* ---- body.is-loaded for cascade fade-ins -------------------------------- */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.body.classList.add("is-loaded"));
    });
  });
} else {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  });
}

/* ---- Sidenote line-alignment + overlap stacking ------------------------- */

const reveal = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target;
            setTimeout(() => target.classList.add("is-revealed"), REVEAL_DELAY_MS);
            obs.unobserve(target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    )
  : null;

let placeFrame = 0;
function place() {
  if (placeFrame) cancelAnimationFrame(placeFrame);
  placeFrame = requestAnimationFrame(() => {
    placeFrame = 0;

    const doc = document.querySelector(".document");
    if (!doc) return;

    const notes = Array.from(document.querySelectorAll(".sidenote"));

    if (!WIDE.matches) {
      notes.forEach((n) => { n.style.top = ""; });
      doc.style.minHeight = "";
      return;
    }

    const docRect = doc.getBoundingClientRect();
    const docTop = window.scrollY + docRect.top;

    const placements = notes
      .map((note) => {
        const fn = note.dataset.fn;
        const marker = document.querySelector(`.note-marker[data-fn="${fn}"]`);
        if (!marker) return null;
        const mRect = marker.getBoundingClientRect();
        return {
          note,
          desiredTop: window.scrollY + mRect.top - docTop,
        };
      })
      .filter(Boolean);

    placements.sort((a, b) => a.desiredTop - b.desiredTop);

    const GAP = 12;
    let prevBottom = -Infinity;
    let maxBottom = 0;
    placements.forEach((p) => {
      let top = p.desiredTop - 4;
      if (top < prevBottom + GAP) top = prevBottom + GAP;
      p.note.style.top = `${top}px`;
      const height = p.note.offsetHeight;
      prevBottom = top + height;
      if (prevBottom > maxBottom) maxBottom = prevBottom;
    });

    if (maxBottom > 0) {
      doc.style.minHeight = `${Math.ceil(maxBottom + 16)}px`;
    } else {
      doc.style.minHeight = "";
    }
  });
}

/* ---- Hairline bind ------------------------------------------------------ */

let overlay = null;
function ensureOverlay() {
  if (overlay) return overlay;
  const doc = document.querySelector(".document");
  if (!doc) return null;
  const svg = document.createElementNS(NS, "svg");
  svg.classList.add("sidenote-overlay");
  svg.setAttribute("aria-hidden", "true");
  doc.appendChild(svg);
  overlay = svg;
  return svg;
}

function drawHairline(marker, sidenote) {
  if (!WIDE.matches) return null;
  const svg = ensureOverlay();
  if (!svg) return null;
  const doc = document.querySelector(".document");
  const docRect = doc.getBoundingClientRect();
  const mRect = marker.getBoundingClientRect();
  const sRect = sidenote.getBoundingClientRect();

  const x1 = mRect.right - docRect.left + 2;
  const y1 = mRect.top - docRect.top + mRect.height * 0.55;
  const x2 = sRect.left - docRect.left;
  const y2 = sRect.top - docRect.top + 9;

  const path = document.createElementNS(NS, "path");
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - Math.min(8, Math.abs(x2 - x1) * 0.04);
  path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  path.setAttribute("class", "hairline");

  const chord = Math.hypot(x2 - x1, y2 - y1);
  const ctrlA = Math.hypot(cx - x1, cy - y1) + Math.hypot(x2 - cx, y2 - cy);
  const length = Math.ceil((chord + ctrlA) / 2) + 6;

  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);
  svg.appendChild(path);

  void path.getBoundingClientRect();
  path.style.transition = "stroke-dashoffset 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease";
  path.style.strokeDashoffset = "0";

  return { path, length };
}

function eraseHairline(rec) {
  if (!rec) return;
  const { path, length } = rec;
  path.style.transition = "stroke-dashoffset 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease";
  path.style.strokeDashoffset = String(length);
  path.style.opacity = "0";
  setTimeout(() => path.remove(), 240);
}

/* ---- Bind --------------------------------------------------------------- */

function bindSidenotes() {
  document.querySelectorAll(".note-marker").forEach((marker) => {
    const fn = marker.dataset.fn;
    const note = document.querySelector(`.sidenote[data-fn="${fn}"]`);
    if (!note) return;

    if (reveal) reveal.observe(note);
    else note.classList.add("is-revealed");

    let activeLine = null;
    let hovered = false;
    let focused = false;

    const activate = () => {
      if (note.classList.contains("is-active")) return;
      note.classList.add("is-active");
      marker.setAttribute("aria-expanded", "true");
      activeLine = drawHairline(marker, note);
    };
    const deactivate = () => {
      note.classList.remove("is-active");
      marker.setAttribute("aria-expanded", "false");
      eraseHairline(activeLine);
      activeLine = null;
    };
    const syncWideState = () => {
      if (!WIDE.matches) return;
      if (hovered || focused) activate();
      else deactivate();
    };

    marker.addEventListener("mouseenter", () => { hovered = true; syncWideState(); });
    marker.addEventListener("mouseleave", () => { hovered = false; syncWideState(); });
    marker.addEventListener("focus", () => { focused = true; syncWideState(); });
    marker.addEventListener("blur", () => { focused = false; syncWideState(); });

    const toggleInline = () => {
      const expanded = note.classList.toggle("is-expanded");
      marker.setAttribute("aria-expanded", expanded ? "true" : "false");
      requestAnimationFrame(place);
    };
    marker.addEventListener("click", (e) => {
      e.preventDefault();
      if (!WIDE.matches) toggleInline();
    });
    marker.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (WIDE.matches) activate();
        else toggleInline();
      } else if (e.key === "Escape") {
        if (WIDE.matches) {
          hovered = false;
          focused = false;
          deactivate();
        } else if (note.classList.contains("is-expanded")) {
          note.classList.remove("is-expanded");
          marker.setAttribute("aria-expanded", "false");
          requestAnimationFrame(place);
        }
      }
    });
  });

  place();

  let resizeT = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(place, 80);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(place);
  }
  const resetResponsiveState = () => {
    document.querySelectorAll(".sidenote.is-expanded").forEach((note) => {
      note.classList.remove("is-expanded");
    });
    document.querySelectorAll(".sidenote.is-active").forEach((note) => {
      note.classList.remove("is-active");
    });
    document.querySelectorAll(".note-marker[aria-expanded='true']").forEach((marker) => {
      marker.setAttribute("aria-expanded", "false");
    });
    if (overlay) overlay.replaceChildren();
    requestAnimationFrame(place);
  };
  if (WIDE.addEventListener) WIDE.addEventListener("change", resetResponsiveState);
  else if (WIDE.addListener) WIDE.addListener(resetResponsiveState);
  window.addEventListener("load", place);
  setTimeout(place, 120);
  setTimeout(place, 600);
}

/* ---- Section arrival pulse --------------------------------------------- */

function bindSectionPulse() {
  const headings = document.querySelectorAll(".document h2");
  if (!headings.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const h = entry.target;
          h.classList.remove("is-arrived");
          void h.offsetWidth;
          h.classList.add("is-arrived");
          setTimeout(() => h.classList.remove("is-arrived"), 1300);
        }
      }
    },
    { rootMargin: "0px 0px -55% 0px", threshold: 0 }
  );

  headings.forEach((h) => observer.observe(h));
}

/* ---- Boot --------------------------------------------------------------- */

function boot() {
  bindSidenotes();
  bindSectionPulse();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
