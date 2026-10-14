// The two "how it works" scenes between the intro and 01 Voice logging, as DOM layers over the 3D phone:
// #hc21 — equipment with HC21 labels is scanned and the number lands in the phone's booking form,
// #flow — capture (the phone) → synchronize (the database) → visualization (the dashboard); on the next click
// the tracker sheet pops up out of the database: Excel support is still provided. The click after that clears the
// slide down to the database, which moves to the middle as the synchronized access hub: the phone and four more
// (engine.js) ring it and link up to it.
// Times come from story.how; everything below is an offset from a scene's t0.
import { story } from './story.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeOutBack = k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const prog = (t, t0, dur) => clamp((t - t0) / dur);
const rise = (el, k, dy = 24) => { el.style.opacity = k; el.style.transform = `translateY(${dy * (1 - k)}px)`; };
const pop = (el, k) => { el.style.opacity = clamp(k * 2); el.style.transform = `scale(${0.6 + 0.4 * easeOutBack(k)})`; };

// ---------- artwork ----------
const ICON = {
  wheelchair: `<svg viewBox="0 0 120 100"><g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M26 8h10l4 44h40l12 26h12"/><path d="M42 34h36"/><circle cx="52" cy="66" r="28"/><circle cx="52" cy="66" r="4"/>
    <path d="M52 40v52M26 66h52M34 48l36 36M70 48L34 84" stroke-width="1.6" opacity=".55"/><circle cx="100" cy="90" r="7"/></g>
    <path d="M40 52h40l-3-12H42z" fill="currentColor" opacity=".16"/></svg>`,
  bed: `<svg viewBox="0 0 140 100"><g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="18" width="12" height="62" rx="4"/><rect x="122" y="32" width="10" height="48" rx="4"/><rect x="20" y="44" width="102" height="18" rx="6"/>
    <path d="M44 34h54M44 34v10M98 34v10"/><path d="M30 62v18M112 62v18"/><circle cx="30" cy="88" r="6"/><circle cx="112" cy="88" r="6"/></g>
    <rect x="24" y="31" width="22" height="12" rx="6" fill="currentColor" opacity=".25"/><rect x="20" y="44" width="102" height="18" rx="6" fill="currentColor" opacity=".14"/></svg>`,
  monitor: `<svg viewBox="0 0 120 110"><g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="14" y="6" width="92" height="62" rx="10"/><path d="M60 68v16M32 84h56"/><rect x="28" y="84" width="64" height="12" rx="4"/>
    <circle cx="36" cy="102" r="5"/><circle cx="84" cy="102" r="5"/></g>
    <rect x="14" y="6" width="92" height="62" rx="10" fill="currentColor" opacity=".1"/>
    <polyline class="ecg" points="20,40 32,40 37,30 42,50 47,22 53,46 58,40 66,40" fill="none" stroke="#EF4444" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <g font-family="Inter" font-weight="600" font-size="11" fill="currentColor"><text x="78" y="26">80</text><text x="78" y="44">90</text><text x="78" y="62">20</text></g></svg>`,
  barcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M14 3h3M14 7h1M3 14h3M7 18v3M3 21h1"/><path d="M19.5 10.5l2 2L14 20h-2v-2z"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  db: `<svg viewBox="0 0 240 290"><defs><linearGradient id="db-side" x1="0" x2="1"><stop offset="0" stop-color="#008378"/><stop offset=".55" stop-color="#00685F"/>
    <stop offset="1" stop-color="#004F48"/></linearGradient></defs>
    <path d="M10 46v198a110 34 0 0 0 220 0V46" fill="url(#db-side)"/>
    <g class="band" fill="none" stroke="#6DF5E1" stroke-width="3" opacity=".55"><path d="M10 112a110 34 0 0 0 220 0"/><path d="M10 178a110 34 0 0 0 220 0"/></g>
    <ellipse cx="120" cy="46" rx="110" ry="34" fill="#4FDBC8"/><ellipse cx="120" cy="46" rx="80" ry="22" fill="#6DF5E1" opacity=".6"/>
    <g class="leds" fill="#B9FFF4"><circle cx="200" cy="96" r="6"/><circle cx="200" cy="162" r="6"/><circle cx="200" cy="228" r="6"/></g>
    </svg>`,
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>',
};

// a barcode that is always the same for the same text
function barcode(text, w = 210, h = 46) {
  let seed = [...text].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  let x = 0, bars = '';
  while (x < w - 4) {
    const bw = 1 + Math.floor(rnd() * 3.2);
    if (x + bw > w) break;
    bars += `<rect x="${x}" width="${bw}" height="${h}"/>`;
    x += bw + 1 + Math.floor(rnd() * 2.6);
  }
  return `<svg class="bars" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}</svg>`;
}

const EQUIPMENT = [['wheelchair', 'HC21-000001'], ['bed', 'HC21-000002'], ['monitor', 'HC21-000003']];

const HC21 = `
  <div class="eq-label"><span class="ic">${ICON.tag}</span>Equipment with HC21 labels</div>
  <div class="eq-row">${EQUIPMENT.map(([kind, id]) => `
    <div class="eq">
      <div class="art">${ICON[kind]}</div>
      <div class="lbl"><div class="cap">HC21 Label</div>${barcode(id)}<div class="id">${id}</div>
        <div class="finder"></div><div class="laser"></div></div>
      <div class="ok">${ICON.check}</div>
    </div>`).join('')}
  </div>
  <svg class="link" viewBox="0 0 260 40"><path d="M4 20H236" /><path class="head" d="M226 8l14 12-14 12"/></svg>
  <div class="packet"><span class="ic">${ICON.barcode}</span>HC21-000001</div>
  <div class="steps">
    <div class="step"><div class="n">1</div><div><div class="h"><span class="ic">${ICON.barcode}</span>Equipment identified</div>
      <p>All medical equipment has a unique HC21 barcode label with serial number.</p></div></div>
    <div class="chev">›</div>
    <div class="step"><div class="n">2</div><div><div class="h"><span class="ic">${ICON.edit}</span>Record or write details</div>
      <p>Nurse scans the HC21 label and enters the Patient ID to book the equipment.</p></div></div>
  </div>`;

// tracker rows: the first rows of the real Acute Equipment Tracker's wheelchair tab (Context/IMG_*.jpeg), with its
// colour coding: AT- asset cells orange, the row to issue yellow, the missing chair red, serviced dates green.
// [asset, asset no., type, size, HC21 no., status, comments, last service, row class]
const SVC = '29/09/2026';
const ROWS = [
  ['AT+', 'D02', 'Rea Azalea Assist', '17"', '1309325', 'OWWP', 'To issue to patient for d/c', '03.07.2025', 'issue'],
  ['AT+', 'D3', 'Rea Azalea Assist', '18"', '1394575', 'OWWP', '', SVC],
  ['AT-', 'D04', 'Rea Azalea Assist', '17"', '1397546', 'OT Dept', '', SVC],
  ['AT-', 'D05', 'Aveon TIS Care Chair', 'Adj: W16-22', '1377466', 'OT dept', '', SVC],
  ['AT+', 'D06', 'Sedeo Ibis X Series (xc-xa)', '20"', '1325130', 'OT Dept', '', SVC],
  ['AT-', 'D10', 'HD Balance', '20x17"', '1398230', 'OT Dept', '', SVC],
  ['AT-', 'D22', 'Rea Azalea Assist', '15"', '1398263', 'OT Dept', 'R footplate temporarely w', SVC, 'note'],
  ['AT+', 'D27', 'Rea Azalea Assist', '18"', '1391578', 'OWWP', '', SVC],
  ['AT-', 'D29', 'Rea Azalea Transit', '17"', '1397579', 'OWWP', '', SVC],
  ['AT-', 'D32', 'Rea Azalea MAX Bariatric', '24-25"', '1397566', 'OWWP', '', SVC],
  ['AT+', 'D38', 'Rea Azalea Assist', '17"', '1380054', 'OT Dept', '', SVC],
  ['AT-', 'D42', 'Rea Azalea Assist', '18"', '1397572', 'OWWP', '', SVC],
  ['AT+', 'D44', 'Rea Azalea Assist (Mixed parts)', '18"', '1269197', 'OWWP', '', SVC],
  ['AT+', 'D45', 'Rea Azalea', '15"', '1063363', 'OWWP', '', SVC],
  ['AT+', 'D46', 'Rea Azalea Transit', '15"', '1394600', '', 'Missing since 19/09/2025 and unable to be', '', 'missing'],
  ['AT-', 'D47', 'CareFlex HydroTilt', '17" adj', '1397592', 'OWWP', '', SVC],
  ['AT+', 'D49', 'Rea Azalea Assist (medium chassis)', '17"', '1377424', 'OWWP', '', SVC],
  ['AT+', 'D50', 'Rea Azalea Assist', '15"', '1377417', 'OT Dept', '', SVC],
  ['AT-', 'D51', 'Rea azalea', '18" x 18"', '1268993', 'OWWP', '', SVC],
  ['AT-', 'D52', 'Rea Azalea', '17"', '1397564', 'OT dept', '', SVC],
];
const COLS = ['Asset', 'Asset No.', 'Type', 'Size (WxD)', 'HC21 No.', 'Status', 'Comments', 'Last Service date:'];
const TABS = ['Wheelchairs', 'Cushions', 'Transfer boards', 'Waitlist'];
const sheetRow = (cells, n, cls = '') => `<div class="row ${cls}"><span class="n">${n}</span>${cells.map((c, i) =>
  `<span class="${i === 0 && c === 'AT-' ? 'at' : i === 7 && c === SVC ? 'svc' : ''}">${c}</span>`).join('')}</div>`;
const SLICES = [['Wheelchairs', 0.38, '#00685F'], ['Hospital beds', 0.27, '#4648D4'], ['Syringe pumps', 0.2, '#4FDBC8'], ['Other', 0.15, '#A5A6F6']];
const TREND = [32, 46, 40, 62, 50, 74];
const STATUS = [['In use', 0.82, '#00685F'], ['Available', 0.56, '#4FDBC8'], ['Repair', 0.24, '#EF4444'], ['Reserved', 0.4, '#4648D4']];
const R = 62, CIRC = 2 * Math.PI * R;
const linePts = TREND.map((v, i) => [12 + i * 50, 120 - v * 1.35]);

// synchronized access: a link from the database (ring centre) to the edge of each phone, the presenting one first
const AC = story.how.access;
const LINKS = [AC.main, ...AC.phones].map(({ at: [x, y] }) => {
  const dx = x - AC.cx, dy = y - AC.cy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const e = Math.min(AC.half[0] / Math.abs(ux || 1e-6), AC.half[1] / Math.abs(uy || 1e-6)) + 18;
  return `M${AC.cx} ${AC.cy} L${(x - ux * e).toFixed(1)} ${(y - uy * e).toFixed(1)}`;
});
// database: its box (left 850, top 236, 260 x 314, scaled about its bottom centre) and the cylinder's centre
const DB = { ox: 980, oy: 550, cy: 157, s: 0.55 };

const FLOW = `
  <svg class="pipes" viewBox="0 0 1920 1080">
    <path id="pipe1" d="M600 868 C 700 868, 760 846, 910 846"/>
    <path id="pipe2" d="M1050 846 C 1160 846, 1200 806, 1300 806"/>
  </svg>
  <div class="packets">${'<i></i>'.repeat(10)}</div>
  <div class="pill p1"><span class="num">1</span>Capture</div>
  <div class="pill p2"><span class="num">2</span>Synchronize</div>
  <div class="pill p3"><span class="num">3</span>Visualization</div>
  <div class="beam"></div>
  <div class="hub"><span class="ring"></span><span class="ring"></span>${ICON.sync}</div>
  <svg class="links" viewBox="0 0 1920 1080">${LINKS.map(d => `<path d="${d}"/>`).join('')}</svg>
  <div class="packets lp">${'<i></i>'.repeat(2 * LINKS.length)}</div>
  <div class="db">${ICON.db}<div class="cap"><span>Central database</span></div></div>
  <div class="sheet">
    <div class="bar"><span class="xl">X</span>Acute Equipment Tracker<em>.xlsx</em></div>
    <div class="rows">${sheetRow(COLS, 1, 'head')}${ROWS.map((r, i) => sheetRow(r.slice(0, 8), i + 2, r[8])).join('')}</div>
    <div class="tabs">${TABS.map((t, i) => `<span${i ? '' : ' class="on"'}>${t}</span>`).join('')}<span class="add">+</span></div>
  </div>
  <div class="xl-note"><span class="xl">X</span>Excel support still provided</div>
  <div class="dash-note">- opportunity -</div>
  <div class="dash">
    <div class="top">Medical Equipment Management Dashboard</div>
    <div class="tiles">
      <div class="tile"><span>Wheelchairs (total)</span><b data-n="215">0</b></div>
      <div class="tile"><span>Bookings (total)</span><b data-n="1350">0</b></div>
      <div class="tile"><span>Available equipment</span><b data-n="98">0</b></div>
    </div>
    <div class="mid">
      <div class="panel"><h4>Equipment distribution</h4><div class="pie">
        <svg viewBox="0 0 160 160">${SLICES.map(([, , c]) => `<circle cx="80" cy="80" r="${R}" stroke="${c}"/>`).join('')}</svg>
        <ul>${SLICES.map(([n, , c]) => `<li><i style="background:${c}"></i>${n}</li>`).join('')}</ul></div></div>
      <div class="panel"><h4>Booking trends</h4>
        <svg class="line" viewBox="0 0 272 140"><path class="area" d="M${linePts.map(p => p.join(' ')).join(' L')} L${linePts.at(-1)[0]} 128 L12 128Z"/>
          <path class="stroke" d="M${linePts.map(p => p.join(' ')).join(' L')}"/>${linePts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}
          ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => `<text x="${12 + i * 50}" y="139">${d}</text>`).join('')}</svg></div>
    </div>
    <div class="panel status"><h4>Equipment status</h4>
      <div class="bars">${STATUS.map(([n, , c]) => `<div class="b"><div class="col"><i style="background:${c}"></i></div><span>${n}</span></div>`).join('')}</div></div>
  </div>`;

// ---------- build ----------
let H, F;
export function buildHow() {
  const mk = (id, html) => { const el = document.createElement('div'); el.id = id; el.className = 'how'; el.innerHTML = html;
    document.getElementById('mascot').before(el); return el; };
  const h = mk('hc21', HC21), f = mk('flow', FLOW);
  const q = (el, s) => el.querySelector(s), qa = (el, s) => [...el.querySelectorAll(s)];
  H = { el: h, label: q(h, '.eq-label'), cards: qa(h, '.eq'), lasers: qa(h, '.laser'), finders: qa(h, '.finder'), lbls: qa(h, '.lbl'), oks: qa(h, '.ok'),
    link: q(h, '.link path'), head: q(h, '.link .head'), packet: q(h, '.packet'), steps: qa(h, '.step'), chev: q(h, '.chev'), ecg: q(h, '.ecg') };
  const pipes = [q(f, '#pipe1'), q(f, '#pipe2')];
  F = { el: f, pills: qa(f, '.pill'), pipes, lens: pipes.map(p => p.getTotalLength()), packets: qa(f, '.packets:not(.lp) i'), beam: q(f, '.beam'), hub: q(f, '.hub'),
    rings: qa(f, '.hub .ring'), db: q(f, '.db'), cap: q(f, '.db .cap'), leds: qa(f, '.db .leds circle'), sheet: q(f, '.sheet'), note: q(f, '.xl-note'), rows: qa(f, '.sheet .row:not(.head)'), dash: q(f, '.dash'), dashNote: q(f, '.dash-note'), tiles: qa(f, '.tile'),
    nums: qa(f, '.tile b'), slices: qa(f, '.pie circle'), legend: qa(f, '.pie li'), area: q(f, '.line .area'), line: q(f, '.line .stroke'),
    dots: qa(f, '.line circle'), cols: qa(f, '.bars i'), panels: qa(f, '.panel'), pipeSvg: q(f, '.pipes'),
    links: qa(f, '.links path'), lpk: qa(f, '.lp i') };
  F.linkLens = F.links.map(l => l.getTotalLength());
  F.links.forEach((l, i) => (l.style.strokeDasharray = F.linkLens[i]));
  F.lineLen = F.line.getTotalLength();
  F.line.style.strokeDasharray = F.lineLen;
  F.pipes.forEach((p, i) => (p.style.strokeDasharray = F.lens[i]));
  H.link.style.strokeDasharray = 240;
}

// scene visibility and exit: fades out with a slide to the side over its last 0.45 s, like the captions
function scene(el, t, { t0, t1 }) {
  const vis = t >= t0 - 0.05 && t <= t1 + 0.05;
  el.style.display = vis ? 'block' : 'none';
  if (!vis) return false;
  const out = easeInOut(prog(t, t1 - 0.45, 0.45));
  el.style.opacity = 1 - out;
  el.style.transform = `translateX(${-60 * out}px)`;
  return true;
}

// ---------- draw ----------
export function drawHow(t, A) {
  const { hc21, flow } = story.how;

  if (scene(H.el, t, hc21)) {
    const s = t - hc21.t0;
    rise(H.label, easeOut(prog(s, 0.7, 0.5)), 16);
    H.cards.forEach((c, i) => {
      const k = prog(s, 0.8 + i * 0.15, 0.6);
      c.style.opacity = easeOut(k); c.style.transform = `translateY(${50 * (1 - easeOutBack(k))}px)`;
    });
    // the scan: a laser sweeps each label in turn, then the label turns teal and gets a tick
    H.lasers.forEach((l, i) => {
      const k = prog(s, 1.8 + i * 0.5, 0.45), on = k > 0 && k < 1;
      l.style.opacity = on ? 1 : 0; l.style.top = `${8 + 84 * easeInOut(k)}px`;
      H.finders[i].style.opacity = on ? 1 : 0;
      H.lbls[i].classList.toggle('done', k >= 1);
      pop(H.oks[i], prog(s, 1.8 + i * 0.5 + 0.45, 0.4));
    });
    // the first label's number travels along the arrow into the phone's form
    const a = easeInOut(prog(s, 3.4, 0.5));
    H.link.style.strokeDashoffset = 240 * (1 - a);
    H.head.style.opacity = prog(s, 3.8, 0.15);
    const pk = prog(s, 3.6, 0.65);
    H.packet.style.opacity = pk > 0 ? Math.min(clamp(pk * 5), 1 - prog(s, 4.1, 0.15)) : 0;
    H.packet.style.transform = `translate(${170 * easeInOut(pk)}px, 0) scale(${1 - 0.25 * prog(s, 3.95, 0.3)})`;
    H.steps.forEach((st, i) => rise(st, easeOut(prog(s, 4.7 + i * 0.3, 0.55))));
    H.chev.style.opacity = easeOut(prog(s, 4.9, 0.4));
    H.ecg.style.strokeDashoffset = -A * 60;
  }

  if (scene(F.el, t, flow)) {
    const s = t - flow.t0;
    // synchronized access (from the Excel stop on): the captions, the sheet and the note go first, then the
    // dashboard, then the pipes and the sync hub; meanwhile the phone (engine.js) and the database shrink into the ring
    const o = AC.t0;
    const txt = 1 - easeInOut(prog(t, o, 0.35));
    const dashOut = easeInOut(prog(t, o + 0.1, 0.5));
    const path = 1 - easeInOut(prog(t, o + 0.2, 0.5));
    const m = easeInOut(prog(t, o + 0.5, 1.2));
    F.pills.forEach((p, i) => { pop(p, prog(s, 0.5 + i * 1.3, 0.5)); p.style.opacity *= txt; });
    const d = [easeInOut(prog(s, 0.9, 0.6)), easeInOut(prog(s, 2.4, 0.5))];
    F.pipes.forEach((p, i) => (p.style.strokeDashoffset = F.lens[i] * (1 - d[i] * path)));
    F.pipeSvg.style.opacity = path;
    const hk = prog(s, 1.35, 0.5);
    F.hub.style.opacity = clamp(hk * 2) * path;
    F.hub.style.transform = `scale(${(0.6 + 0.4 * easeOutBack(hk)) * (0.4 + 0.6 * path)})`;
    F.rings.forEach((r, i) => { const ph = (A * 0.6 + i / 2) % 1; r.style.transform = `scale(${1 + 0.9 * ph})`; r.style.opacity = 0.5 * (1 - ph) * prog(s, 1.6, 0.4); });
    const b = easeOut(prog(s, 1.5, 0.5));
    F.beam.style.opacity = b * (0.75 + 0.25 * Math.sin(A * 3)) * path;
    F.beam.style.transform = `scaleY(${b})`;
    // the beam fills the database; its lights blink while records come in. In the ring it moves to the middle,
    // smaller, and the caption keeps its size on a white pill
    const db = prog(s, 1.5, 0.6), sc = (0.7 + 0.3 * easeOutBack(db)) * (1 - (1 - DB.s) * m);
    F.db.style.opacity = clamp(db * 2);
    F.db.style.transform = `translate(${(AC.cx - DB.ox) * m}px, ${40 * (1 - easeOut(db)) + (AC.cy - 25 - DB.oy + DB.cy * DB.s) * m}px) scale(${sc})`;
    F.cap.style.transform = `scale(${1 + (1.05 / DB.s - 1) * m})`;
    F.cap.style.setProperty('--pill', m);
    F.leds.forEach((l, i) => (l.style.opacity = 0.35 + 0.65 * (Math.sin(A * 5 + i * 2.1) > 0.2 ? 1 : 0) * prog(s, 1.9, 0.3)));
    // links draw out from the database to each phone, then records travel both ways along them
    const lnk = F.links.map((l, i) => {
      const k = easeInOut(prog(t, o + 2.0 + i * 0.12, 0.5));
      l.style.strokeDashoffset = F.linkLens[i] * (1 - k);
      return k;
    });
    F.lpk.forEach((el, j) => {
      const i = j >> 1, u = (A * 0.4 + (j & 1) * 0.5 + i * 0.13) % 1, v = j & 1 ? 1 - u : u;
      const pt = F.links[i].getPointAtLength(v * F.linkLens[i]);
      el.style.transform = `translate(${pt.x - 7}px, ${pt.y - 7}px) rotate(45deg)`;
      el.style.opacity = (lnk[i] >= 1 ? 1 : 0) * Math.min(1, u * 6, (1 - u) * 6);
    });
    // next click: the tracker sheet pops up out of the database, then the Excel note
    const sh = prog(s, 4.6, 0.6);
    F.sheet.style.opacity = clamp(sh * 2) * txt;
    F.sheet.style.transform = `perspective(1600px) rotateY(-12deg) rotateX(6deg) translateY(${120 * (1 - easeOut(sh))}px) scale(${(0.5 + 0.5 * easeOutBack(sh)) * (0.85 + 0.15 * txt)})`;
    F.rows.forEach((r, i) => {
      const k = prog(s, 4.85 + i * 0.035, 0.3);
      r.style.opacity = k; r.style.transform = `translateX(${-16 * (1 - easeOut(k))}px)`;
      r.style.boxShadow = k > 0 && k < 1 ? 'inset 0 0 0 2px #4FDBC8' : '';
    });
    const nt = prog(s, 5.25, 0.5);
    F.note.style.opacity = clamp(nt * 2) * txt;
    F.note.style.transform = `rotate(-4deg) scale(${0.6 + 0.4 * easeOutBack(nt)})`;
    // packets ride the pipes once they are drawn; each pipe gets its own share
    F.packets.forEach((el, i) => {
      const pipe = i % 2, u = (A * 0.32 + Math.floor(i / 2) / 5) % 1;
      const pt = F.pipes[pipe].getPointAtLength(u * F.lens[pipe]);
      el.style.transform = `translate(${pt.x - 9}px, ${pt.y - 9}px) rotate(45deg)`;
      el.style.opacity = (d[pipe] >= 1 ? 1 : 0) * Math.min(1, u * 6, (1 - u) * 6) * path;
    });
    const ds = prog(s, 2.8, 0.6);
    F.dash.style.opacity = easeOut(ds) * (1 - dashOut);
    F.dash.style.transform = `translate(${120 * dashOut}px, ${40 * (1 - easeOut(ds))}px) scale(${(0.94 + 0.06 * easeOutBack(ds)) * (1 - 0.12 * dashOut)})`;
    F.dashNote.style.opacity = easeOut(prog(s, 3.3, 0.5)) * (1 - dashOut);
    F.dashNote.style.transform = `translateX(${120 * dashOut}px)`;
    F.tiles.forEach((tl, i) => rise(tl, easeOut(prog(s, 3.0 + i * 0.1, 0.4)), 14));
    F.nums.forEach(n => { n.textContent = Math.round(+n.dataset.n * easeOut(prog(s, 3.1, 1.0))).toLocaleString('en-US'); });
    F.panels.forEach((p, i) => rise(p, easeOut(prog(s, 3.2 + i * 0.12, 0.45)), 14));
    let acc = 0;
    const pk = easeInOut(prog(s, 3.4, 0.9));
    F.slices.forEach((c, i) => {
      const len = SLICES[i][1] * CIRC * pk;
      c.style.strokeDasharray = `${Math.max(0, len - 3)} ${CIRC}`;
      c.style.strokeDashoffset = -acc * pk; acc += SLICES[i][1] * CIRC;
    });
    F.legend.forEach((l, i) => (l.style.opacity = easeOut(prog(s, 3.6 + i * 0.1, 0.3))));
    const lk = easeInOut(prog(s, 3.5, 0.9));
    F.line.style.strokeDashoffset = F.lineLen * (1 - lk);
    F.area.style.opacity = 0.9 * prog(s, 4.1, 0.4);
    F.dots.forEach((c, i) => (c.style.opacity = prog(lk, i / TREND.length, 0.12)));
    F.cols.forEach((c, i) => (c.style.transform = `scaleY(${STATUS[i][1] * easeOutBack(prog(s, 3.6 + i * 0.12, 0.6))})`));
  }
}
