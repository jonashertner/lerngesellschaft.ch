import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Version shared public assets by their contents, as on the Lernbus pages.
export default () => Object.fromEntries(
  [
    ['styles', 'styles.css'],
    ['society', 'society.css'],
    ['landing', 'society-landing.css'],
    ['footer', 'society-footer.css'],
    ['header', 'society-header.css'],
    ['legal', 'legal.css'],
    ['nav', 'nav.js'],
    ['heroVideo', 'hero-video.js'],
    ['heroPoster', 'media/hero-poster.jpg']
  ].map(([key, filename]) => [
    key,
    createHash('sha256')
      .update(readFileSync(new URL(`../assets/${filename}`, import.meta.url)))
      .digest('hex').slice(0, 12)
  ])
);
