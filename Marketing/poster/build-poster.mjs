// Renders poster.html to PDFs with headless Chromium (Playwright):
//   Poster_A2.pdf          one A2 page (420 x 594 mm), for a print shop
//   Poster_A2_4xA4.pdf     four A4 pages to glue together: top-left, top-right, bottom-left, bottom-right
//   poster_preview.png     a small preview of the whole poster
// Needs the deck's fonts: run `npm ci` in ../video-src first. Usage: node build-poster.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

// the "Follow along" QR card is the deck's own (follow.js), so the poster and the slides always show the same code
const { qrSvg, ICON } = await import('../video-src/follow.js');
const { story } = await import('../video-src/story.js');
const follow = {
  svg: qrSvg().replace('href="hospital_logo.png"', 'href="../video-src/hospital_logo.png"'),
  icon: ICON.scan,
  host: story.follow.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
};

const browser = await playwright.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
await page.addInitScript(f => { window.FOLLOW = f; }, follow);
const url = pathToFileURL(path.join(dir, 'poster.html')).href;
const open = async q => { await page.goto(url + q); await page.evaluate(() => document.fonts.ready); };

await open('?a2');
await page.pdf({ path: path.join(dir, 'Poster_A2.pdf'), width: '420mm', height: '594mm', printBackground: true });

await open('?tiles');
await page.pdf({ path: path.join(dir, 'Poster_A2_4xA4.pdf'), width: '210mm', height: '297mm', printBackground: true });

await open('');
await page.setViewportSize({ width: 1588, height: 2246 });
await page.addStyleTag({ content: 'body { padding: 0 !important }' });
await page.screenshot({ path: path.join(dir, 'poster_preview.png'), clip: { x: 0, y: 0, width: 1587, height: 2245 }, scale: 'css' });

await browser.close();
