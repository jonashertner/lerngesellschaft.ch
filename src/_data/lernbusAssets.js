import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Change stylesheet URLs whenever their contents change, including for returning visitors.
export default () => Object.fromEntries(
  ['styles', 'detail', 'source-home'].map(name => [
    name,
    createHash('sha256')
      .update(readFileSync(new URL(`../lernbus/${name}.css`, import.meta.url)))
      .digest('hex').slice(0, 12)
  ])
);
