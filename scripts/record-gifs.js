#!/usr/bin/env node
/**
 * Record an animated preview GIF for each benchmark entry.
 *
 * Requirements:
 *   npm install               (installs playwright)
 *   npm run install-browser   (installs Chromium via Playwright)
 *   ImageMagick `convert` and `gifsicle` must be on PATH
 *
 * Usage:
 *   node record-gifs.js              # record all slugs
 *   node record-gifs.js <slug>       # record one slug
 *
 * Per-slug key-press timing can be provided in scripts/solutions/<slug>.json:
 *   { "presses": [1500, 3500, 6000], "durationMs": 12000 }
 *   { "framePresses": [60, 260, 300], "durationMs": 8000 }
 *   { "startClick": "text=Auto-Play Solution", "durationMs": 8000 }
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { createServer } from 'http';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, rmSync,
} from 'fs';
import { extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const SCREENSHOTS = join(DOCS, 'screenshots');
const SOLUTIONS = join(ROOT, 'scripts', 'solutions');
const PORT = 3737;

const FPS = 6;
const DEFAULT_DURATION_MS = 12_000;
const VIEWPORT = { width: 1000, height: 700 };
const GIF_WIDTH = 600; // px — resize output to cap file size

// Default Space-key press times (ms from page load) used when no per-slug timing file exists.
// Presses are spaced out to demonstrate the gravity-flip mechanic.
const DEFAULT_PRESSES = [1500, 3500, 6000, 8500, 11000];

// ── static file server ────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.json': 'application/json',
};

function startServer(root, port) {
  const server = createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p.endsWith('/')) p += 'index.html';
    const filePath = join(root, decodeURIComponent(p));
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

// ── per-slug recorder ─────────────────────────────────────────────────────────

async function recordSlug(slug, browser) {
  const gameDir = join(DOCS, slug);
  if (!existsSync(join(gameDir, 'index.html'))) {
    console.log(`skip  ${slug}  (no index.html)`);
    return;
  }

  // Optional per-slug timing hints
  const solutionFile = join(SOLUTIONS, `${slug}.json`);
  let presses = DEFAULT_PRESSES;
  let framePresses = null;
  let durationMs = DEFAULT_DURATION_MS;
  let startClick = null;
  if (existsSync(solutionFile)) {
    try {
      const sol = JSON.parse(readFileSync(solutionFile, 'utf8'));
      if (Array.isArray(sol.presses) && sol.presses.length > 0) presses = sol.presses;
      if (Array.isArray(sol.framePresses) && sol.framePresses.length > 0) framePresses = sol.framePresses;
      if (Number.isFinite(sol.durationMs) && sol.durationMs > 0) durationMs = sol.durationMs;
      if (typeof sol.startClick === 'string' && sol.startClick.length > 0) startClick = sol.startClick;
    } catch { /* use default */ }
  }

  const framesDir = join(SCREENSHOTS, `_frames-${slug}`);
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
  mkdirSync(framesDir);

  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  try {
    await page.goto(`http://127.0.0.1:${PORT}/${slug}/`, {
      waitUntil: 'load',
      timeout: 15_000,
    });

    await page.focus('body').catch(() => {});
    if (startClick) {
      await page.locator(startClick).click();
    }
    if (framePresses) {
      await page.evaluate((frames) => {
        const pending = new Set(frames);
        function tick() {
          try {
            if (pending.has(frame)) {
              flipGravity();
              pending.delete(frame);
            }
          } catch {
            // Some entries do not expose frame/flipGravity globals.
          }
          if (pending.size > 0) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }, framePresses);
    }
    const startTime = Date.now();

    // Fire Space-key presses concurrently with frame capture
    const pressTask = (async () => {
      if (startClick || framePresses) return;
      for (const t of [...presses].sort((a, b) => a - b)) {
        const wait = t - (Date.now() - startTime);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        await page.keyboard.press('Space').catch(() => {});
      }
    })();

    // Capture frames at FPS rate
    const frameInterval = 1000 / FPS;
    const totalFrames = Math.ceil((durationMs / 1000) * FPS);
    for (let i = 0; i < totalFrames; i++) {
      const framePath = join(framesDir, `f${String(i).padStart(4, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png', fullPage: true });
      const elapsed = Date.now() - startTime;
      const sleep = (i + 1) * frameInterval - elapsed;
      if (sleep > 0) await new Promise(r => setTimeout(r, sleep));
    }

    await pressTask;

    // Pre-resize all frames in-place so that convert works on small images,
    // reducing pixel-cache pressure on large-canvas games.
    execSync(`mogrify -resize '${GIF_WIDTH}x>' "${framesDir}/"*.png`);

    // Assemble raw GIF, then let gifsicle handle palette + optimization.
    const rawGif = join(SCREENSHOTS, `${slug}.raw.gif`);
    const outGif = join(SCREENSHOTS, `${slug}.gif`);
    const delay = Math.round(100 / FPS); // centiseconds per frame
    execSync(
      `convert -delay ${delay} -loop 0 "${framesDir}/f*.png" "${rawGif}"`,
      { maxBuffer: 256 * 1024 * 1024 },
    );
    execSync(`gifsicle -O3 --colors 128 "${rawGif}" -o "${outGif}"`);
    rmSync(rawGif, { force: true });

    console.log(`✓  ${slug}  →  screenshots/${slug}.gif`);
  } catch (err) {
    console.error(`✗  ${slug}: ${err.message}`);
  } finally {
    await page.close().catch(() => {});
    rmSync(framesDir, { recursive: true, force: true });
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

const targetSlugs = process.argv[2]
  ? [process.argv[2]]
  : readdirSync(DOCS, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .filter(d => d.name !== 'screenshots')
      .map(d => d.name)
      .sort();

mkdirSync(SCREENSHOTS, { recursive: true });
const server = await startServer(DOCS, PORT);
console.log(`Server  http://127.0.0.1:${PORT}`);

const browser = await chromium.launch({ headless: true });

for (const slug of targetSlugs) {
  await recordSlug(slug, browser);
}

await browser.close();
server.close();
console.log('Done.');
