import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// A local DOM surface with bubbling clicks. No browser or network is used.
function fixture(source, { failLayout = false } = {}) {
  let width = 200;
  let document;
  const classList = () => {
    const values = new Set();
    return {
      add: (...names) => names.forEach(name => values.add(name)),
      remove: (...names) => names.forEach(name => values.delete(name)),
      contains: name => values.has(name),
      toggle: (name, enabled) => enabled ? values.add(name) : values.delete(name)
    };
  };
  const element = (tagName = 'DIV', parentNode = null) => ({
    tagName, parentNode, classList: classList(), attributes: {}, listeners: {},
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
    emit(type, event = {}) { for (const listener of this.listeners[type] || []) listener.call(this, event); },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return name in this.attributes; },
    getAttribute(name) { return this.attributes[name]; },
    focus() { document.activeElement = this; },
    getClientRects() { return [{}]; },
    getBoundingClientRect() { return { width: 90, height: 60, top: 0, bottom: 80 }; }
  });
  const head = element('HEADER');
  const wrap = element('DIV', head);
  const brand = element('A', wrap);
  const logo = element('IMG', brand);
  const right = element('DIV', wrap);
  const menu = element('DETAILS', right);
  const summary = element('SUMMARY', menu);
  const nav = element('NAV', menu);
  const link = element('A', nav);
  const language = element('A', right);
  const main = element('MAIN');
  const footer = element('FOOTER');
  const top = element('SECTION', main);
  const destination = element('SECTION', main);
  brand.attributes.href = '#top';
  link.attributes.href = '#destination';
  language.attributes.href = '/en/';
  menu.open = false;
  wrap.getBoundingClientRect = () => ({ width, height: 60 });
  head.querySelector = selector => ({ '.wrap': wrap, '.brand': brand, '.head-right': right, 'details.menu': menu, '.nav': nav })[selector];
  head.querySelectorAll = () => [brand, summary, link, language];
  menu.querySelector = () => summary;
  nav.querySelector = () => link;
  nav.querySelectorAll = () => [];
  nav.contains = node => node === link;
  document = Object.assign(element(), {
    activeElement: summary,
    body: { classList: { contains: () => true } },
    querySelector: () => head,
    querySelectorAll: () => [main, footer],
    getElementById: id => ({ top, destination })[id],
    documentElement: { classList: classList(), style: { setProperty() {} } }
  });
  const window = Object.assign(element(), { innerHeight: 800, scrollY: 0 });
  vm.runInNewContext(source, {
    document, window,
    getComputedStyle: () => {
      if (failLayout) throw new Error('Injected layout failure');
      return { paddingLeft: '0', paddingRight: '0', columnGap: '10' };
    }
  });
  return {
    head, brand, logo, menu, summary, link, language, main, footer, top, destination, document,
    open() { menu.open = true; menu.emit('toggle'); },
    click(target) {
      for (let node = target; node; node = node.parentNode) node.emit('click', { target });
    },
    key(key, shiftKey = false) {
      const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
      document.emit('keydown', event);
      menu.emit('toggle');
      return event;
    },
    resize(nextWidth) { width = nextWidth; window.emit('resize'); }
  };
}

for (const filename of ['lernbus/nav.js', 'assets/nav.js']) {
  const source = readFileSync(new URL(`../src/${filename}`, import.meta.url), 'utf8');

  for (const target of ['logo', 'link']) {
    test(`${filename}: ${target} activation closes the overlay and focuses its destination`, () => {
      const ui = fixture(source);
      ui.open();
      assert.equal(ui.main.inert, true);
      assert.equal(ui.document.documentElement.classList.contains('menu-locked'), true);
      ui.click(ui[target]);
      assert.equal(ui.menu.open, false);
      assert.equal(ui.head.classList.contains('menu-open'), false);
      assert.equal(ui.document.documentElement.classList.contains('menu-locked'), false);
      for (const block of [ui.main, ui.footer]) {
        assert.equal(block.inert, false);
        assert.equal(block.hasAttribute('aria-hidden'), false);
      }
      const destination = target === 'logo' ? ui.top : ui.destination;
      assert.equal(ui.document.activeElement, destination);
      assert.equal(destination.getAttribute('tabindex'), '-1');
      destination.emit('blur');
      assert.equal(destination.hasAttribute('tabindex'), false);
    });
  }

  test(`${filename}: language navigation closes the overlay without forcing a local focus target`, () => {
    const ui = fixture(source);
    ui.open(); ui.language.focus(); ui.click(ui.language);
    assert.equal(ui.menu.open, false);
    assert.equal(ui.main.inert, false);
    assert.equal(ui.document.activeElement, ui.language);
  });

  test(`${filename}: keyboard cycling, Escape and responsive focus remain intact`, () => {
    const ui = fixture(source);
    ui.open(); ui.language.focus();
    assert.equal(ui.key('Tab').prevented, true);
    assert.equal(ui.document.activeElement, ui.brand);
    assert.equal(ui.key('Tab', true).prevented, true);
    assert.equal(ui.document.activeElement, ui.language);
    ui.key('Escape');
    assert.equal(ui.menu.open, false);
    assert.equal(ui.main.inert, false);
    assert.equal(ui.document.activeElement, ui.summary);
    ui.resize(1000);
    assert.equal(ui.document.activeElement, ui.link);
    ui.resize(200);
    assert.equal(ui.document.activeElement, ui.summary);
  });

  test(`${filename}: failed initialization leaves native reopening usable`, () => {
    const ui = fixture(source, { failLayout: true });
    assert.equal(ui.head.classList.contains('nav-enhanced'), false);
    assert.equal(ui.head.classList.contains('nav-inline'), false);
    ui.open();
    assert.equal(ui.main.inert, false);
    assert.equal(ui.document.documentElement.classList.contains('menu-locked'), false);
  });
}
