/* Site navigation. One list of links per page, mirroring that page's
   sections. The list sits inline in the header when the whole row fits
   (the header gets .nav-inline); otherwise it lives behind the round menu
   button (native details/summary). Reading pages keep the header fixed in
   both layouts, with a quiet shadow once scrolled (.is-scrolled). The link
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
  var persistent = document.body.classList.contains('detail-page');

  function setHeaderHeight() {
    if (!persistent) return;
    document.documentElement.style.setProperty('--lernbus-header-height', Math.ceil(wrap.getBoundingClientRect().height) + 'px');
  }

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
    menu.open = true;
    inline = rowFits();
    if (!inline) {
      head.classList.remove('nav-inline');
      menu.open = wasOpen;
    }
    head.classList.toggle('nav-fixed', persistent || !inline);
    setHeaderHeight();
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
    if (e.key === 'Tab' && !inline && menu.open) {
      var items = Array.prototype.slice.call(head.querySelectorAll('a[href], summary'))
        .filter(function (el) { return el.getClientRects().length; });
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  nav.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== nav && t.tagName !== 'A') t = t.parentNode;
    if (t && t.tagName === 'A') {
      if (!inline) menu.open = false;
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

  /* Mark only a linked section actually at the reading line. Unlisted
     sections must not leave the preceding navigation item highlighted. */
  var targets = [];
  var current = null;
  function collectTargets() {
    targets = [];
    /* Historical preview-only CTAs are hidden; the visible booking action
       on the parent page participates in the current-section marker. */
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
    var line = Math.max(wrap.getBoundingClientRect().height + 24, Math.min(window.innerHeight * 0.4, 160));
    var cur = null;
    for (var i = 0; i < targets.length; i++) {
      var bounds = targets[i].el.getBoundingClientRect();
      if (bounds.top <= line && bounds.bottom > line) cur = targets[i];
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
  if (persistent && window.ResizeObserver) {
    var resize = new ResizeObserver(function () { layout(); });
    resize.observe(brand);
  }
  window.addEventListener('load', layout);
  document.addEventListener('DOMContentLoaded', function () {
    collectTargets();
    onScroll();
  });
})();
