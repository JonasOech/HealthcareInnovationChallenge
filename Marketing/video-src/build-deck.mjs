// Builds the presentation as a static site in dist/ (for Cloudflare Pages or any static host).
// usage: npm ci --omit=dev && node build-deck.mjs
// It copies only what the page loads, and moves node_modules files to vendor/ (most hosts skip node_modules).
import fs from 'node:fs'; import path from 'node:path';
import { story } from './story.js';

const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });

const copy = (from, to = from) => {
  fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(out, to));
};
const vendor = p => p.replace(/^node_modules\//, 'vendor/');

// index.html: every node_modules/ reference (fonts, import map) points to vendor/
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const deps = new Set([...html.matchAll(/(?:url\(|")(node_modules\/[^)"]+)/g)].map(m => m[1]));
for (const d of deps) if (d.endsWith('/')) deps.delete(d);   // import-map prefix, its files are listed below
deps.add('node_modules/three/build/three.module.js');
deps.add('node_modules/three/examples/jsm/environments/RoomEnvironment.js');
html = html.replaceAll('node_modules/', 'vendor/');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);

for (const d of deps) copy(d, vendor(d));
for (const f of ['engine.js', 'story.js', 'how.js', 'deck.js', 'deck.css', 'words.json', 'hospital_logo.png']) copy(f);
const images = story.allImages();
for (const f of images) copy(f);

// Cloudflare Pages: long cache for images and vendored files, revalidate the page and scripts
fs.writeFileSync(path.join(out, '_headers'), [
  '/screens/*', '  Cache-Control: public, max-age=604800', '',
  '/vendor/*', '  Cache-Control: public, max-age=31536000, immutable', '',
].join('\n'));

const files = fs.readdirSync(out, { recursive: true }).filter(f => fs.statSync(path.join(out, f)).isFile());
const bytes = files.reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0);
console.log(`dist/: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB (${images.length} screen images)`);
