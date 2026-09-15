/* Site navigation. One list of links per page, mirroring that page's
   sections. The list sits inline in the header when the whole row fits
   (the header gets .nav-inline); otherwise it lives behind the round menu
   button (native details/summary), the header stays fixed while scrolling
   (.nav-fixed) and turns compact once scrolled (.is-scrolled). The link
   for the section currently in view carries aria-current. No dependencies;
   without JavaScript the menu button still works everywhere. */
(function () {
  'use strict';
  var head = document.querySelector('.site-head');
  if (!head) return;
  var wrap = head.querySelector('.wrap');
  var brand = head.querySelector('.brand');
  var right = head.querySelector('.head-right');
  var menu = head.querySelector('details.menu');
  var nav = head.querySelector('.nav');
  if (!wrap || !brand || !right || !menu || !nav) return;
  var summary = menu.querySelector('summary');
  var inline = false;
  var scrolled = false;

  function px(v) { return parseFloat(v) || 0; }

  /* Measured in inline layout: brand + gap + links/lang/cta on one line? */
  function rowFits() {
    var cs = getComputedStyle(wrap);
    var inner = wrap.getBoundingClientRect().width - px(cs.paddingLeft) - px(cs.paddingRight);
    var need = brand.getBoundingClientRect().width + px(cs.columnGap) + right.getBoundingClientRect().width;
    return need + 12 <= inner;
  }

  function layout() {
    var wasOpen = !inline && menu.open;
    var focused = document.activeElement;
    head.classList.add('nav-inline');
    head.classList.remove('nav-fixed');
    menu.open = true;
    inline = rowFits();
    if (!inline) {
      head.classList.remove('nav-inline');
      head.classList.add('nav-fixed');
      menu.open = wasOpen;
    }
    applyOpenState();
    if (inline && focused === summary) nav.querySelector('a').focus();
    else if (!inline && !menu.open && nav.contains(focused) && summary) summary.focus();
  }

  function applyOpenState() {
    var open = menu.open && !inline;
    head.classList.toggle('menu-open', open);
    /* The panel and the scroll lock key off these classes, so they do not
       depend on :has() support. The :has() rules stay as the no-JS path. */
    document.documentElement.classList.toggle('menu-locked', open);
    var blocks = document.querySelectorAll('main, footer');
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].inert = open;
      if (open) blocks[i].setAttribute('aria-hidden', 'true');
      else blocks[i].removeAttribute('aria-hidden');
    }
  }

  menu.addEventListener('toggle', applyOpenState);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !inline && menu.open) {
      menu.open = false;
      if (summary) summary.focus();
    }
  });

  nav.addEventListener('click', function (e) {
    if (inline) return;
    var t = e.target;
    while (t && t !== nav && t.tagName !== 'A') t = t.parentNode;
    if (t && t.tagName === 'A') {
      menu.open = false;
      applyOpenState();
      var href = t.getAttribute('href');
      var destination = href && href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
      if (destination) {
        if (!destination.hasAttribute('tabindex')) {
          destination.setAttribute('tabindex', '-1');
          destination.addEventListener('blur', function () { this.removeAttribute('tabindex'); }, { once: true });
        }
        destination.focus({ preventScroll: true });
      }
    }
  });

  /* Current section: the last one whose top has passed the marker line
     (40% of the viewport, at most 160px, so short sections register too). */
  var targets = [];
  var current = null;
  function collectTargets() {
    targets = [];
    /* the call-to-action is hidden in both modes, so it must not be able to
       become the "current" section and blank out the visible markers */
    var links = nav.querySelectorAll('a[href^="#"]:not(.navlink-cta)');
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('href').slice(1);
      var el = id && id !== 'top' ? document.getElementById(id) : null;
      if (el) targets.push({ a: links[i], el: el });
    }
    targets.sort(function (x, y) {
      return x.el.compareDocumentPosition(y.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }
  function spy() {
    if (!targets.length) return;
    var line = Math.min(window.innerHeight * 0.4, 160);
    var cur = null;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.getBoundingClientRect().top <= line) cur = targets[i];
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      cur = targets[targets.length - 1];
    }
    if (cur === current) return;
    if (current) current.a.removeAttribute('aria-current');
    if (cur) cur.a.setAttribute('aria-current', 'location');
    current = cur;
  }

  function onScroll() {
    var s = window.scrollY > 6;
    if (s !== scrolled) {
      scrolled = s;
      head.classList.toggle('is-scrolled', s);
    }
    spy();
  }

  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  window.addEventListener('load', layout);
  document.addEventListener('DOMContentLoaded', function () {
    collectTargets();
    onScroll();
  });
})();
