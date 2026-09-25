#!/usr/bin/env node
// Renders video.html frame by frame in headless Chromium and pipes the PNG
// frames into ffmpeg (H.264, BT.709, silent AAC track, faststart).
//
//   node social/pisa-2025/render.mjs                        full video
//   node social/pisa-2025/render.mjs --stills=3,15.5,40     PNG stills only
//
// Environment: FFMPEG (default "ffmpeg"), CHROMIUM (optional executable path).
// Playwright is resolved locally first, then from the global npm root.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  })
);
const fps = Number(args.fps || 30);
const output = path.resolve(args.out || path.join(here, 'pisa-2025-lesen-9x16.mp4'));

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return createRequire(path.join(root, 'noop.js'))('playwright');
  }
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'video.html')).href);
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.VIDEO.duration);
const frameAt = async t => {
  await page.evaluate(time => window.render(time), t);
  return page.screenshot({ type: 'png' });
};

if (args.stills) {
  const dir = path.resolve(args.dir || path.join(here, 'stills'));
  mkdirSync(dir, { recursive: true });
  for (const t of args.stills.split(',').map(Number)) {
    await page.evaluate(time => window.render(time), t);
    // --nobar hides the progress bar, e.g. for the LinkedIn cover image.
    if (args.nobar) await page.evaluate(() => { document.getElementById('bar').style.display = 'none'; });
    await page.screenshot({ path: path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`) });
  }
  await browser.close();
  console.log(`Wrote stills to ${dir}`);
  process.exit(0);
}

const frames = Math.round(duration * fps);
const ffmpeg = spawn(process.env.FFMPEG || 'ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-map', '0:v', '-map', '1:a', '-shortest',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level:v', '4.1',
  '-g', String(fps * 2), '-bf', '2',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  output,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const finished = new Promise((resolve, reject) => {
  ffmpeg.on('error', reject);
  ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

for (let i = 0; i < frames; i++) {
  const png = await frameAt(i / fps);
  if (!ffmpeg.stdin.write(png)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
  if (i % (fps * 5) === 0) console.log(`frame ${i}/${frames} (${(i / fps).toFixed(0)} s)`);
}
ffmpeg.stdin.end();
await finished;
await browser.close();
console.log(`Wrote ${output}`);
