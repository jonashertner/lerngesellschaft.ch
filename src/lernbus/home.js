(() => {
  'use strict';
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) menu.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    matchMedia('(min-width: 901px)').addEventListener('change', event => {
      if (event.matches) menu.open = false;
    });
  }
  const story = document.querySelector('[data-story]');
  if (story) {
    const tabs = [...story.querySelectorAll('[role=tab]')];
    function select(tab, focus = false) {
      for (const item of tabs) {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
      }
      if (focus) tab.focus();
    }
    select(tabs[0]);
    story.querySelector('[role=tablist]').hidden = false;
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        const keys = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
        if (event.key in keys) {
          event.preventDefault();
          select(tabs[keys[event.key]], true);
        }
      });
    });
  }
})();
