/* Lernbus · small, dependency-free enhancements. Everything works without this file. */
(function () {
  'use strict';
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* sticky header shadow */
  var head = d.querySelector('.site-head');
  function onHead() { if (head) head.classList.toggle('is-stuck', w.scrollY > 6); }
  w.addEventListener('scroll', onHead, { passive: true }); onHead();

  /* mobile menu: close on link, outside click, Escape */
  var menu = d.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.removeAttribute('open'); });
    d.addEventListener('click', function (e) { if (!menu.contains(e.target)) menu.removeAttribute('open'); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.hasAttribute('open')) { menu.removeAttribute('open'); menu.querySelector('summary').focus(); } });
  }

  /* mobile action dock: shown once the hero call to action has scrolled away, hidden at the form */
  var dock = d.querySelector('.dock'), heroCta = d.querySelector('.hero-cta'), contact = d.getElementById('kontakt') || d.getElementById('anmelden');
  if (dock && heroCta && 'IntersectionObserver' in w) {
    var passed = false, contactIn = false;
    var update = function () {
      var show = passed && !contactIn;
      dock.classList.toggle('is-visible', show);
      if ('inert' in dock) dock.inert = !show; else dock.setAttribute('aria-hidden', show ? 'false' : 'true');
      d.documentElement.style.scrollPaddingBottom = show ? '6rem' : '';
    };
    if ('inert' in dock) dock.inert = true;
    /* shown only once the reader has scrolled past the hero buttons, never on the first screen */
    d.body.classList.add('has-dock');
    new IntersectionObserver(function (es) { var e = es[es.length - 1]; passed = e.boundingClientRect.bottom < 0; update(); }, { threshold: [0, 1] }).observe(heroCta);
    if (contact) new IntersectionObserver(function (es) { var e = es[es.length - 1]; contactIn = e.isIntersecting; update(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contact);
    w.addEventListener('scroll', function () { var r = heroCta.getBoundingClientRect(); var p = r.bottom < 0; if (p !== passed) { passed = p; update(); } }, { passive: true });
  }

  /* the route: line fills and the bus drives as you scroll */
  var stops = d.querySelector('.stops'), bus = d.querySelector('.route-bus');
  if (stops) {
    var items = stops.querySelectorAll('.stop');
    var tick = function () {
      var r = stops.getBoundingClientRect();
      var last = items[items.length - 1].querySelector('.sign');
      var lineTop = parseFloat(getComputedStyle(stops).fontSize) * 1.6;
      var lr = last ? last.getBoundingClientRect() : null;
      var end = lr ? (lr.top - r.top + lr.height / 2) : r.height;   /* the line ends at the centre of the last sign */
      var anchor = w.innerHeight * 0.58;
      var p = (anchor - r.top) / end; p = Math.max(0, Math.min(1, p));
      stops.style.setProperty('--line-end', Math.max(0, end - lineTop) + 'px');
      stops.style.setProperty('--progress', p.toFixed(3));
      if (bus) {
        var br = bus.getBoundingClientRect();
        var busTop = br.top - r.top - (parseFloat(bus.style.getPropertyValue('--progress') || 0) * parseFloat(bus.style.getPropertyValue('--track') || 0));
        bus.style.setProperty('--track', Math.max(0, end - busTop - br.height / 2) + 'px');
        bus.style.setProperty('--progress', p.toFixed(3));
      }
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('is-reached', items[i].getBoundingClientRect().top < anchor);
      }
    };
    var raf = null;
    var schedule = function () { if (raf) return; raf = w.requestAnimationFrame(function () { raf = null; tick(); }); };
    w.addEventListener('scroll', schedule, { passive: true });
    w.addEventListener('resize', schedule);
    tick();
  }

  /* printing: open every answer, then restore */
  var wereClosed = [];
  w.addEventListener('beforeprint', function () { wereClosed = []; var ds = d.querySelectorAll('.faq details:not([open])'); for (var i = 0; i < ds.length; i++) { ds[i].setAttribute('open', ''); wereClosed.push(ds[i]); } });
  w.addEventListener('afterprint', function () { for (var i = 0; i < wereClosed.length; i++) wereClosed[i].removeAttribute('open'); wereClosed = []; });

  /* enquiry form: compose an e-mail, open the mail app, and keep the text on screen as a fallback */
  var f = d.getElementById('anfrage');
  if (!f) return;
  var to = f.getAttribute('data-to') || '';
  var subject = f.getAttribute('data-subject') || '';
  var greeting = f.getAttribute('data-greeting') || subject;
  var sent = d.getElementById('sent'), out = d.getElementById('sent-text'), open = d.getElementById('open-mail'), copy = d.getElementById('copy-text'), copied = d.getElementById('copied');
  var errBox = d.getElementById('form-error'), sentLead = d.getElementById('sent-lead');
  function markValidity() {
    var bad = f.querySelectorAll(':invalid');
    var all = f.querySelectorAll('input, select, textarea');
    for (var i = 0; i < all.length; i++) all[i].removeAttribute('aria-invalid');
    for (var j = 0; j < bad.length; j++) bad[j].setAttribute('aria-invalid', 'true');
    return bad;
  }
  f.addEventListener('input', function (e) { if (e.target.checkValidity && e.target.checkValidity()) e.target.removeAttribute('aria-invalid'); });
  function compose() {
    var lines = [greeting, ''];
    var els = f.querySelectorAll('[data-label]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], label = el.getAttribute('data-label');
      if (el.type === 'checkbox') { if (el.checked) lines.push(label); continue; }
      var v = (el.value || '').trim();
      if (!v) continue;
      if (el.tagName === 'TEXTAREA') { lines.push(''); lines.push(label + ':'); lines.push(v); }
      else lines.push(label + ': ' + v);
    }
    return lines.join('\n');
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!f.checkValidity()) {
      var bad = markValidity();
      if (errBox) { errBox.textContent = f.getAttribute('data-error') || ''; errBox.hidden = false; }
      if (bad[0]) bad[0].focus();
      return;
    }
    if (errBox) errBox.hidden = true;
    var body = compose();
    var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    if (out) out.textContent = body;
    if (open) open.setAttribute('href', href);
    if (sent) { sent.hidden = false; }
    w.location.href = href;
    if (sentLead) { setTimeout(function () { sentLead.focus({ preventScroll: reduce }); }, 50); }
    if (sent && !reduce) sent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  if (copy) copy.addEventListener('click', function () {
    var text = out ? out.textContent : compose();
    var done = function () { if (copied) { copied.hidden = false; setTimeout(function () { copied.hidden = true; }, 2500); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    else fallbackCopy(text, done);
  });
  function fallbackCopy(text, done) {
    var ta = d.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.contentEditable = 'true'; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    d.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false; try { ok = d.execCommand('copy'); } catch (err) {}
    d.body.removeChild(ta);
    if (ok) { done(); return; }
    /* last resort: select the text on screen so the reader can copy it by hand */
    if (out && w.getSelection) { var sel = w.getSelection(), rg = d.createRange(); rg.selectNodeContents(out); sel.removeAllRanges(); sel.addRange(rg); }
  }
})();
