import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Keep the public share URL and declared dimensions tied to the shipped image.
export default () => {
  const image = readFileSync(new URL('../lernbus/og.png', import.meta.url));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!image.subarray(0, 8).equals(pngSignature)) {
    throw new Error('The Lernbus sharing image must be a PNG.');
  }
  const version = createHash('sha256').update(image).digest('hex').slice(0, 12);
  return {
    url: `https://lerngesellschaft.ch/lernbus/og.png?v=${version}`,
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20)
  };
};
