import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Version shared public assets by their contents so preloads and references never drift.
export default () => Object.fromEntries(
  [
    ['styles', 'styles.css'],
    ['legal', 'legal.css'],
    ['nav', 'nav.js'],
    ['heroVideo', 'hero-video.js'],
    ['heroPoster', 'media/hero-poster.jpg'],
    ['societySite', 'society-site.css'],
    ['societyDiscovery', 'society-discovery.js'],
    ['societyEarthData', 'society-earth-data.js'],
    ['societyDotRenderer', 'society-dot-renderer.js'],
    ['societyDotWorld', 'society-dot-world.js'],
    ['societySocialCard', 'media/society-social-card.png']
  ].map(([key, filename]) => [
    key,
    createHash('sha256')
      .update(readFileSync(new URL(`../assets/${filename}`, import.meta.url)))
      .digest('hex').slice(0, 12)
  ])
);
