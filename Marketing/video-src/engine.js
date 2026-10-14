import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { story } from './story.js';
import { buildHow, drawHow } from './how.js';
import { buildMoney, drawMoney } from './money.js';

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeOutBack = k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const prog = (t, t0, dur) => clamp((t - t0) / dur);

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function shapeGeo(w, h, r, segs = 24) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), segs);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

// ---------- three setup ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(28, 1920 / 1080, 0.1, 100);
camera.position.set(0, 0, 9);

const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0x6DF5E1, 2.2); rim.position.set(-5, 2, -3); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0x8B8DF5, 1.4); rim2.position.set(5, -2, -4); scene.add(rim2);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// ---------- the phone ----------
const SW = 1.0, SH = SW * 2400 / 1080;          // screen matches the emulator's 1080x2400 panel
const BW = SW + 0.075, BH = SH + 0.1, BR = 0.135;  // body outline
const BEV = 0.028, DEPTH = 0.075, FRONT = DEPTH / 2 + BEV;

const phone = new THREE.Group(); scene.add(phone);

const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa6a8, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(BW - 2 * BEV, BH - 2 * BEV, BR - BEV), {
  depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 10, curveSegments: 32,
});
bodyGeo.translate(0, 0, -DEPTH / 2);
phone.add(new THREE.Mesh(bodyGeo, frameMat));

const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x05080c, metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03 });
const front = new THREE.Mesh(shapeGeo(BW - 0.012, BH - 0.012, BR - 0.006), glassMat);
front.position.z = FRONT + 0.0005; phone.add(front);

const screenCanvas = document.createElement('canvas');
screenCanvas.width = 1080; screenCanvas.height = 2400;
const sctx = screenCanvas.getContext('2d');
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
screenTex.anisotropy = 8;
const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
const screen = new THREE.Mesh(shapeGeo(SW, SH, 0.085, 32), screenMat);
screen.position.z = FRONT + 0.001; phone.add(screen);

// subtle glass reflection over the screen
const sheen = new THREE.Mesh(shapeGeo(BW - 0.012, BH - 0.012, BR - 0.006),
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.035, roughness: 0.02, metalness: 0, clearcoat: 1, depthWrite: false }));
sheen.position.z = FRONT + 0.002; phone.add(sheen);

// punch-hole camera
const hole = new THREE.Mesh(new THREE.CircleGeometry(0.022, 32), new THREE.MeshBasicMaterial({ color: 0x020304 }));
hole.position.set(0, SH / 2 - 0.045, FRONT + 0.0025); phone.add(hole);

// back glass in the app's teal
const backMat = new THREE.MeshPhysicalMaterial({ color: 0x00685F, metalness: 0.1, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0x6DF5E1) });
const back = new THREE.Mesh(shapeGeo(BW - 0.012, BH - 0.012, BR - 0.006), backMat);
back.position.z = -FRONT - 0.0005; back.rotation.y = Math.PI; phone.add(back);

// Pixel-style camera bar
const barGeo = new THREE.ExtrudeGeometry(roundedRect(BW - 0.02, 0.24, 0.12), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 6, curveSegments: 24 });
const bar = new THREE.Mesh(barGeo, new THREE.MeshPhysicalMaterial({ color: 0x0b0f12, metalness: 0.6, roughness: 0.18, clearcoat: 1 }));
bar.position.set(0, BH / 2 - 0.42, -FRONT - 0.05); phone.add(bar);
const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.2, roughness: 0.02, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.6 });
const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xc0c8ca, metalness: 1, roughness: 0.2 });
for (const x of [-0.27, -0.05]) {
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 48), lensMat);
  lens.rotation.x = Math.PI / 2; lens.position.set(x, BH / 2 - 0.42, -FRONT - 0.07); phone.add(lens);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.01, 12, 48), ringMat);
  ring.position.set(x, BH / 2 - 0.42, -FRONT - 0.075); phone.add(ring);
}
const flash = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: 0x332a10 }));
flash.position.set(0.28, BH / 2 - 0.42, -FRONT - 0.075); flash.rotation.y = Math.PI; phone.add(flash);

// side buttons
const btnMat = new THREE.MeshPhysicalMaterial({ color: 0xa8b3b5, metalness: 1, roughness: 0.25 });
const btn = (y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, h, 0.045), btnMat); m.position.set(BW / 2 + 0.006, y, 0); phone.add(m); };
btn(0.55, 0.16); btn(0.18, 0.36);

// ---------- screen compositing ----------
const images = new Map();
function loadImage(src) {
  if (images.has(src)) return images.get(src).p;
  const img = new Image();
  const p = new Promise((res, rej) => { img.onload = () => res(img); img.onerror = () => rej(new Error('img ' + src)); });
  img.src = src; images.set(src, { img, p }); return p;
}
const img = src => images.get(src).img;

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function drawScreen(t, T) {
  const layers = story.screenLayers(t, T);
  sctx.globalAlpha = 1; sctx.fillStyle = '#FAF8FF'; sctx.fillRect(0, 0, 1080, 2400);
  for (const L of layers) {
    sctx.globalAlpha = L.alpha ?? 1;
    if (L.tall) {            // stitched long page scrolled inside the content area
      const [y0, y1] = story.contentRows;
      sctx.save(); sctx.beginPath(); sctx.rect(0, y0, 1080, y1 - y0); sctx.clip();
      sctx.drawImage(img(L.tall), 0, y0 - L.offset);
      sctx.restore();
    } else if (L.crop) {     // a region of another frame (e.g. a toast) with a slide offset
      const [x, y, w, h] = L.crop;
      sctx.drawImage(img(L.src), x, y, w, h, x, y + (L.dy || 0), w, h);
    } else if (L.reveal) {   // hide not-yet-spoken words of the transcript
      const { words, bg, k } = L.reveal;
      const n = Math.floor(k * words.length + 1e-6);
      sctx.fillStyle = `rgb(${bg.join(',')})`;
      words.forEach(([x, y, w, h], i) => { if (i >= n) sctx.fillRect(x - 4, y - 4, w + 8, h + 8); });
      if (n > 0 && n < words.length) {  // blinking-free caret after the last word
        const [x, y, w, h] = words[n - 1];
        sctx.fillStyle = '#4648D4'; sctx.fillRect(x + w + 6, y, 4, h);
      }
    } else if (L.type) {     // text typed into an input field over its placeholder
      const { x, y, w, h, tx, text, k } = L.type;
      if (k <= 0) continue;
      const n = Math.round(k * text.length);
      sctx.fillStyle = '#fff'; sctx.fillRect(x, y, w, h);
      sctx.fillStyle = '#131B2E'; sctx.font = '500 42px Inter'; sctx.textBaseline = 'middle';
      sctx.fillText(text.slice(0, n), tx, y + h / 2);
      if (k < 1) { sctx.fillStyle = '#00685F'; sctx.fillRect(tx + sctx.measureText(text.slice(0, n)).width + 4, y + h / 2 - 26, 4, 52); }
    } else if (L.pulse) {    // live mic level rings while listening
      const { x, y, t: lt } = L.pulse;
      for (let j = 0; j < 3; j++) {
        const ph = ((lt * 0.9 + j / 3) % 1);
        sctx.strokeStyle = `rgba(239,68,68,${0.45 * (1 - ph)})`; sctx.lineWidth = 10;
        sctx.beginPath(); sctx.arc(x, y, 150 + 120 * ph, 0, Math.PI * 2); sctx.stroke();
      }
    } else {
      sctx.drawImage(img(L.src), 0, L.dy || 0);
    }
  }
  sctx.globalAlpha = 1;
  for (const h of story.highlights) {
    const k = prog(t, h.t0, 0.45), out = 1 - prog(t, h.t1 - 0.3, 0.3);
    const a = Math.min(easeOut(k), out);
    if (a <= 0) continue;
    const pad = 14 + 30 * (1 - easeOutBack(k));
    // dim everything else (spotlight)
    sctx.save();
    sctx.fillStyle = `rgba(19,27,46,${0.3 * a})`;
    sctx.beginPath(); sctx.rect(0, 0, 1080, 2400);
    sctx.roundRect(h.x - pad, h.y - pad, h.w + 2 * pad, h.h + 2 * pad, 34);
    sctx.fill('evenodd');
    const c = h.color || '#00685F';
    sctx.globalAlpha = a; sctx.lineWidth = 9; sctx.strokeStyle = c;
    sctx.shadowColor = c; sctx.shadowBlur = 40;
    rr(sctx, h.x - pad, h.y - pad, h.w + 2 * pad, h.h + 2 * pad, 34); sctx.stroke();
    sctx.restore();
  }
  for (const tp of story.taps) {
    const k = (t - tp.t) / 0.7;
    if (k < 0 || k > 1) continue;
    sctx.save();
    sctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - k)})`; sctx.strokeStyle = `rgba(0,104,95,${0.8 * (1 - k)})`; sctx.lineWidth = 6;
    sctx.beginPath(); sctx.arc(tp.x, tp.y, 40 + 70 * easeOut(k), 0, Math.PI * 2); sctx.fill(); sctx.stroke();
    sctx.restore();
  }
  screenTex.needsUpdate = true;
}

// ---------- synchronized access: four more phones ring the database with the presenting one ----------
// Clones of the phone, each with a still app screen; they fly in from outside the ring, spinning, and shrink away
// when the slide ends. Slots are stage pixels on the z = 0 plane (story.how.access).
const PXU = 1080 / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));   // stage px per world unit at z = 0
const sats = [];
function buildSats() {
  for (const ph of story.how.access.phones) {
    const g = phone.clone();
    const tex = new THREE.Texture(img(ph.screen));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
    g.children.find(c => c.material === screenMat).material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    g.visible = false; scene.add(g); sats.push(g);
  }
}
function drawSats(t, A) {
  const ac = story.how.access, out = easeInOut(prog(t, story.how.flow.t1 - 0.45, 0.45));
  sats.forEach((g, i) => {
    const ph = ac.phones[i], k = prog(t, ph.t, 0.9);
    g.visible = k > 0 && out < 1;
    if (!g.visible) return;
    const fly = 900 * (1 - easeOut(k)), x = ph.at[0] + ph.dir[0] * fly, y = ph.at[1] + ph.dir[1] * fly;
    g.position.set((x - 960) / PXU, (540 - y) / PXU + 0.05 * Math.sin(A * 1.4 + i * 1.7), 0);
    g.rotation.set(THREE.MathUtils.degToRad(ph.r[0] + 1.5 * Math.sin(A * 0.9 + i)),
      THREE.MathUtils.degToRad(ph.r[1] - 220 * (1 - easeOut(k)) + 3 * Math.sin(A * 0.7 + i * 2.3)), THREE.MathUtils.degToRad(ph.r[2]));
    g.scale.setScalar(ac.scale * (0.6 + 0.4 * easeOutBack(k)) * (1 - out));
  });
}

// ---------- phone motion ----------
function phonePose(t) {
  const K = story.phoneKeys;
  let i = 0; while (i < K.length - 1 && t > K[i + 1].t) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const k = b.t > a.t ? (b.ease || easeInOut)(clamp((t - a.t) / (b.t - a.t))) : 0;
  const p = a.p.map((v, j) => lerp(v, b.p[j], k));
  const r = a.r.map((v, j) => lerp(v, b.r[j], k));
  const s = lerp(a.s ?? 1, b.s ?? 1, k);
  const f = lerp(a.float ?? 1, b.float ?? 1, k);
  return { p, r, s, f };
}

// ---------- DOM layers ----------
const $ = id => document.getElementById(id);
const textEls = [];
function buildTexts() {
  const host = $('texts');
  for (const tx of story.texts) {
    const el = document.createElement('div');
    el.className = `text ${tx.side} ${tx.dark ? 'dark' : ''} ${tx.cls || ''}`;
    el.innerHTML = tx.html;
    host.appendChild(el);
    textEls.push({ tx, el, lines: [...el.querySelectorAll('.ln > span')], marks: [...el.querySelectorAll('mark')],
      chips: [...el.querySelectorAll('.chip')], fades: [...el.querySelectorAll('.kicker, .sub, .brand, .foot')] });
  }
}
function drawTexts(t) {
  for (const { tx, el, lines, marks, chips, fades } of textEls) {
    const vis = t >= tx.t0 - 0.05 && t <= tx.t1 + 0.05;
    el.style.display = vis ? 'flex' : 'none';
    if (!vis) continue;
    const out = easeInOut(prog(t, tx.t1 - 0.45, 0.45));
    const dir = tx.side === 'right' ? 1 : -1;
    el.style.opacity = 1 - out;
    el.style.transform = `translateX(${dir * -60 * out}px)`;
    fades.forEach((f, i) => { const k = easeOut(prog(t, tx.t0 + i * 0.12, 0.5)); f.style.opacity = k; f.style.transform = `translateY(${24 * (1 - k)}px)`; });
    lines.forEach((l, i) => { const k = easeOut(prog(t, tx.t0 + 0.1 + i * 0.09, 0.6)); l.style.transform = `translateY(${110 * (1 - k)}%)`; });
    marks.forEach((m, i) => { const k = easeInOut(prog(t, tx.t0 + (tx.markDelay ?? 0.75) + i * 0.35, 0.5)); m.style.setProperty('--p', k); });
    const cs = tx.chipStart ?? 1.0, cg = tx.chipGap ?? 0.45;
    chips.forEach((c, i) => { const k = prog(t, tx.t0 + cs + i * cg, 0.5); c.style.opacity = easeOut(k);
      c.style.transform = `translateX(${dir * -40 * (1 - easeOutBack(k))}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  }
}

const blobDefs = [
  { c: 'rgba(109,245,225,.55)', s: 620, x: 0.18, y: 0.25, ax: 120, ay: 80, w: 0.31 },
  { c: 'rgba(96,99,238,.28)', s: 560, x: 0.82, y: 0.75, ax: 140, ay: 90, w: 0.23 },
  { c: 'rgba(0,131,120,.30)', s: 480, x: 0.62, y: 0.15, ax: 90, ay: 120, w: 0.37 },
];
const blobs = blobDefs.map(d => { const e = document.createElement('div'); e.className = 'blob'; e.style.width = e.style.height = d.s + 'px'; e.style.background = d.c; $('blobs').appendChild(e); return e; });

function drawBackground(t, phoneScreenPos, T) {
  const dark = story.darkness(t);
  $('bg-dark').style.opacity = dark;
  $('grid').style.opacity = 1 - dark;
  blobs.forEach((e, i) => { const d = blobDefs[i];
    e.style.transform = `translate(${d.x * 1920 - d.s / 2 + d.ax * Math.sin(T * d.w + i)}px, ${d.y * 1080 - d.s / 2 + d.ay * Math.cos(T * d.w * 1.3 + i)}px)`;
    e.style.opacity = 1 - 0.55 * dark; });
  const g = $('glow');
  g.style.background = `radial-gradient(circle, rgba(109,245,225,${0.55 - 0.15 * dark}) 0%, rgba(109,245,225,0) 62%)`;
  g.style.transform = `translate(${phoneScreenPos.x - 450}px, ${phoneScreenPos.y - 450}px)`;
  const w = story.wipeAt(t); // -1..1 across, null when idle
  $('wipe').style.transform = `translateX(${w === null ? -200 : w * 140}%) skewX(-12deg)`;
  $('progress').style.width = `${100 * T / story.duration}%`;
}

// ---------- frame ----------
const v = new THREE.Vector3();
function drawMascot(t, T) {
  const m = story.mascot, el = $('mascot');
  const vis = t >= m.t0 && t <= m.t1;
  el.style.display = vis ? 'block' : 'none';
  if (!vis) return;
  const up = easeOutBack(prog(t, m.t0, 0.7)), down = easeInOut(prog(t, m.t1 - 0.45, 0.45));
  const y = m.y + (1 - up) * 620 + down * 700;
  const rot = -6 * (1 - up) + 3 * Math.sin((T - m.T0) * 2.2);
  el.style.transform = `translate(${m.x}px, ${y}px) rotate(${rot}deg)`;
  // frames run on real time and ping-pong inside the usable range, so a hold keeps it waving
  const period = 2 * (m.usable - 1);
  const ph = ((Math.floor((T - m.T0) * 30) % period) + period) % period;
  const i = ph < m.usable ? ph : period - ph;
  el.firstElementChild.getContext('2d').drawImage(img(m.frames[i]), 0, 0, 420, 420);
}

function drawBlog(t, A) {
  const b = story.blog, el = $('blog');
  const vis = t >= b.t0;
  el.style.display = vis ? 'block' : 'none';
  $('progress').style.opacity = vis ? 0 : 1;
  if (!vis) return;
  const q = el.querySelector.bind(el);
  // glows slide in from the corners first, then everything else fades to dark
  const g = easeOut(prog(t, b.t0, 1.4)), drift = A - b.t0;
  const cool = q('.cool'), warm = q('.warm');
  cool.style.opacity = warm.style.opacity = g;
  cool.style.transform = `translate(${-1000 + 300 * g + 30 * Math.sin(drift * 0.6)}px, ${-760 + 280 * g + 20 * Math.cos(drift * 0.5)}px)`;
  warm.style.transform = `translate(${1420 - 300 * g + 30 * Math.cos(drift * 0.55)}px, ${-760 + 280 * g + 20 * Math.sin(drift * 0.45)}px)`;
  q('.shade').style.opacity = easeInOut(prog(t, b.t0 + 0.3, 0.9));
  q('.dots').style.opacity = 0.9 * easeInOut(prog(t, b.t0 + 0.6, 0.9));
  const T = b.t0 + 1.25;
  const ey = q('.eyebrow'), k0 = easeOut(prog(t, T, 0.6)); ey.style.opacity = k0; ey.style.transform = `translateY(${16 * (1 - k0)}px)`;
  el.querySelectorAll('.t .ln > span').forEach((l, i) => { const k = easeOut(prog(t, T + 0.2 + i * 0.16, 0.8)); l.style.transform = `translateY(${110 * (1 - k)}%)`; });
  q('.rule').style.width = `${260 * easeInOut(prog(t, T + 1.0, 0.7))}px`;
  [q('.by'), q('.cta')].forEach((n, i) => { const k = easeOut(prog(t, T + 1.25 + i * 0.25, 0.6)); n.style.opacity = k; n.style.transform = `translateY(${16 * (1 - k)}px)`; });
}

// #noamb freezes the ambient motion, so two frames across a hold must come out identical —
// that is the check that a hold is not stretching some animation.
const AMBIENT = !location.hash.includes('noamb');

// T is storyboard time run straight through, with no holds; t is storyboard time, which stands still during a hold.
// The presentation deck (deck.js) runs its own holds and passes the clocks itself:
// deck.t is storyboard time, deck.amb a continuous clock for float, blobs and glows, and deck.loop a clock
// in output time that restarts with each slide, for the mic rings, spinner and mascot frames.
window.renderFrame = (T, deck) => {
  const t = deck ? deck.t : story.unwarp(T);
  const A = deck ? deck.amb : AMBIENT ? T : t;
  const L = deck ? deck.loop : A;
  const { p, r, s, f } = phonePose(deck || !AMBIENT ? story.warp(t) : T);
  phone.position.set(p[0], p[1] + f * 0.05 * Math.sin(A * 1.4), p[2]);
  phone.rotation.set(THREE.MathUtils.degToRad(r[0] + f * 1.5 * Math.sin(A * 0.9)), THREE.MathUtils.degToRad(r[1] + f * 3 * Math.sin(A * 0.7)), THREE.MathUtils.degToRad(r[2]));
  phone.scale.setScalar(s);
  drawScreen(t, L);
  v.set(phone.position.x, phone.position.y, phone.position.z).project(camera);
  drawBackground(t, { x: (v.x + 1) / 2 * 1920, y: (1 - v.y) / 2 * 1080 }, A);
  drawTexts(t);
  drawMascot(t, L);
  drawHow(t, A);
  drawSats(t, A);
  drawMoney(t);
  drawBlog(t, deck ? A : t);
  renderer.render(scene, camera);
};

// the deck renders sharper on HiDPI screens and projectors; the video keeps 1
window.setPixelRatio = r => renderer.setPixelRatio(r);

window.setupDone = (async () => {
  await document.fonts.load('800 40px Jakarta'); await document.fonts.load('400 20px Inter'); await document.fonts.load('400 40px Playfair'); await document.fonts.load('400 20px DMSans'); await document.fonts.load('500 20px DMSans'); await document.fonts.load('600 20px Inter');
  await document.fonts.ready;
  await Promise.all(story.allImages().map(loadImage));
  buildTexts();
  buildHow();
  buildMoney();
  buildSats();
  window.renderFrame(0);
  return story.duration;
})();
