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
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.removeAttribute('open'); });
  }

  /* mobile action dock: shown once the hero call to action has scrolled away, hidden at the form */
  var dock = d.querySelector('.dock'), heroCta = d.querySelector('.hero-cta'), contact = d.getElementById('kontakt');
  if (dock && heroCta && 'IntersectionObserver' in w) {
    d.body.classList.add('has-dock');
    var heroIn = true, contactIn = false;
    var update = function () { dock.classList.toggle('is-visible', !heroIn && !contactIn); };
    new IntersectionObserver(function (es) { heroIn = es[0].isIntersecting; update(); }, { rootMargin: '-56px 0px 0px 0px' }).observe(heroCta);
    if (contact) new IntersectionObserver(function (es) { contactIn = es[0].isIntersecting; update(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contact);
  }

  /* the route: line fills and the bus drives as you scroll */
  var stops = d.querySelector('.stops'), bus = d.querySelector('.route-bus');
  if (stops) {
    var items = stops.querySelectorAll('.stop');
    var tick = function () {
      var r = stops.getBoundingClientRect();
      var anchor = w.innerHeight * 0.58;
      var p = (anchor - r.top) / r.height; p = Math.max(0, Math.min(1, p));
      stops.style.setProperty('--progress', p.toFixed(3));
      if (bus) {
        bus.style.setProperty('--track', Math.max(0, r.height - bus.offsetHeight) + 'px');
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

  /* enquiry form: compose an e-mail, open the mail app, and keep the text on screen as a fallback */
  var f = d.getElementById('anfrage');
  if (!f) return;
  var to = f.getAttribute('data-to') || '';
  var subject = f.getAttribute('data-subject') || '';
  var sent = d.getElementById('sent'), out = d.getElementById('sent-text'), open = d.getElementById('open-mail'), copy = d.getElementById('copy-text'), copied = d.getElementById('copied');
  function compose() {
    var lines = [subject, ''];
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
    if (!f.checkValidity()) { f.reportValidity(); return; }
    var body = compose();
    var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    if (out) out.textContent = body;
    if (open) open.setAttribute('href', href);
    if (sent) { sent.hidden = false; }
    w.location.href = href;
    if (sent && !reduce) sent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  if (copy) copy.addEventListener('click', function () {
    var text = out ? out.textContent : compose();
    var done = function () { if (copied) { copied.hidden = false; setTimeout(function () { copied.hidden = true; }, 2500); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    else fallbackCopy(text, done);
  });
  function fallbackCopy(text, done) {
    var ta = d.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
    d.body.appendChild(ta); ta.select(); try { d.execCommand('copy'); done(); } catch (err) {} d.body.removeChild(ta);
  }
})();
