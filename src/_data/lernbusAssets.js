import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Change asset URLs whenever their contents change, including for returning visitors.
export default () => Object.fromEntries(
  [
    ['styles', 'styles.css'],
    ['detail', 'detail.css'],
    ['concept', 'concept.css'],
    ['source-home', 'source-home.css'],
    ['tariffGuide', 'tariff-guide.css'],
    ['homeRefinement', 'home-refinement.css'],
    ['testimonials', 'testimonials.css'],
    ['contact', 'contact.js'],
    ['nav', 'nav.js'],
    ['faq', 'faq.js'],
    ['booking', 'booking.js'],
    ['contactCss', 'contact.css'],
    ['portrait', 'img/conny-brandes-portrait.webp'],
    ['portraitSmall', 'img/conny-brandes-portrait-small.webp'],
    ['roomPlay', 'img/lernraum-spielecke.webp'],
    ['roomPlaySmall', 'img/lernraum-spielecke-small.webp'],
    ['roomWindows', 'img/lernraum-fenster.webp'],
    ['roomWindowsSmall', 'img/lernraum-fenster-small.webp']
  ].map(([key, filename]) => [
    key,
    createHash('sha256')
      .update(readFileSync(new URL(`../lernbus/${filename}`, import.meta.url)))
      .digest('hex').slice(0, 12)
  ])
);
