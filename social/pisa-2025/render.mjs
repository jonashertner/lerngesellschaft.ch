#!/usr/bin/env node
// Renders video.html frame by frame in headless Chromium and pipes the PNG
// frames into ffmpeg (H.264, BT.709, silent AAC track, faststart).
//
//   node social/pisa-2025/render.mjs                        full video
//   node social/pisa-2025/render.mjs --stills=3,15.5,40     PNG stills only
//   node social/pisa-2025/render.mjs --page=video-economist.html   magazine-style cut
//
// Environment: FFMPEG (default "ffmpeg"), CHROMIUM (optional executable path).
// Playwright is resolved locally first, then from the global npm root.
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
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
const pageFile = args.page || 'video.html';
// Grainy frames compress badly as PNG (about 1 s per capture); JPEG at
// quality 95 is ten times faster and indistinguishable after H.264.
const format = args.format || (pageFile === 'video-economist.html' ? 'jpeg' : 'png');
// Film grain changes every frame; CRF 25 keeps the magazine cut near 16 MB
// with no visible loss, while the flat brand cut stays at CRF 17.
const crf = args.crf || (pageFile === 'video-economist.html' ? '25' : '17');
const output = path.resolve(args.out || path.join(here, pageFile === 'video.html' ? 'pisa-2025-lesen-9x16.mp4' : `pisa-2025-lesen-${path.basename(pageFile, '.html').replace(/^video-/, '')}-9x16.mp4`));

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
// The magazine-style cut uses frames from the homepage film, graded like
// archive film (sepia, lower saturation, more contrast); extract them once.
const heroCache = path.join(here, '.cache', 'hero');
if (pageFile === 'video-economist.html' && !existsSync(path.join(heroCache, '0001.jpg'))) {
  mkdirSync(heroCache, { recursive: true });
  execSync(`"${process.env.FFMPEG || 'ffmpeg'}" -hide_banner -loglevel error -y -i "${path.join(here, '../../src/assets/media/hero.webm')}" -t 8.25 -vf "fps=24,colorchannelmixer=.8058:.2461:.0605:0:.1117:.8995:.0538:0:.0870:.1709:.7219,eq=saturation=0.6:contrast=1.12:brightness=-0.04" -q:v 2 "${path.join(heroCache, '%04d.jpg')}"`);
}
await page.goto(pathToFileURL(path.join(here, pageFile)).href);
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.VIDEO.duration);
const frameAt = async t => {
  await page.evaluate(time => window.render(time), t);
  return format === 'jpeg' ? page.screenshot({ type: 'jpeg', quality: 95 }) : page.screenshot({ type: 'png' });
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
  '-f', 'image2pipe', '-c:v', format === 'jpeg' ? 'mjpeg' : 'png', '-framerate', String(fps), '-i', '-',
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-map', '0:v', '-map', '1:a', '-shortest',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-level:v', '4.1',
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
