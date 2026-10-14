// The business case after 07 Privacy (deck only), as a DOM layer over the stage while the phone is out of frame:
// stop 1 — the staff-time card: today's hours (a circle ringed by where they go) → the hours with the app,
// stop 2 — the money-saved card: fewer lost items + staff time recovered = total a year,
// stop 3 — the cards make way for the payback chart: cumulative cost vs. savings over year one, with the tiles.
// The numbers come from story.money.roi (the team's spreadsheet); times are offsets from story.money.t0.
// Before it, the "Here comes the money" title gets a pot of gold on the right, its rainbow leaving the frame top right
// (story.money.pot).
import { story } from './story.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeOutBack = k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const prog = (t, t0, dur) => clamp((t - t0) / dur);
const rise = (el, k, dy = 24) => { el.style.opacity = k; el.style.transform = `translateY(${dy * (1 - k)}px)`; };
const pop = (el, k) => { el.style.opacity = clamp(k * 2); el.style.transform = `scale(${0.6 + 0.4 * easeOutBack(k)})`; };

const { roi, eur } = story.money;
const HOUR_COLORS = ['#4648D4', '#00897D', '#C2410C', '#9B9DF0'];   // validated as a categorical set on white

// ---------- staff time: the circles' areas are to scale ----------
const C = { cy: 225, bx: 235, br: 172, ring: 190, sx: 628 };
C.sr = C.br * Math.sqrt(roi.withApp / roi.today);
const RING = 2 * Math.PI * C.ring;
const STAFF = `
  <h3>Staff time</h3>
  <svg class="circles" viewBox="0 0 780 480">
    <g class="ring" transform="rotate(-90 ${C.bx} ${C.cy})">${roi.hours.map((_, i) =>
      `<circle cx="${C.bx}" cy="${C.cy}" r="${C.ring}" stroke="${HOUR_COLORS[i]}"/>`).join('')}</g>
    <g class="big"><circle cx="${C.bx}" cy="${C.cy}" r="${C.br}"/><text x="${C.bx}" y="${C.cy}" class="n">0 h</text></g>
    <text x="${C.bx}" y="${C.cy + C.ring + 42}" class="cap">Today (manual)</text>
    <g class="arrow"><path d="M${C.bx + C.ring + 26} ${C.cy}H${C.sx - C.sr - 34}"/><path class="head" d="M${C.sx - C.sr - 50} ${C.cy - 18}l18 18-18 18"/></g>
    <g class="small"><circle cx="${C.sx}" cy="${C.cy}" r="${C.sr}"/><text x="${C.sx}" y="${C.cy}" class="n">${roi.withApp} h</text></g>
    <text x="${C.sx}" y="${C.cy + C.sr + 42}" class="cap app">With our app</text>
  </svg>
  <ul class="legend">${roi.hours.map(([n, h], i) => `<li><i style="background:${HOUR_COLORS[i]}"></i>${n} <b>${h} h</b></li>`).join('')}</ul>
  <div class="foot"><b>${roi.saved} hours</b> saved per year <span>≈ ${Math.round(roi.days)} working days</span></div>`;

// ---------- money saved: bar heights are to scale ----------
const BARS = [['Fewer lost items', roi.losses, ''], ['Staff time recovered', roi.staff, ''], ['Total per year', roi.total, 'total']];
const BAR_H = 300;
const MONEY = `
  <h3>Money saved</h3>
  <div class="bars">${BARS.map(([n, v, c]) => `
    <div class="b ${c}"><div class="col"><b class="v">€0</b><i style="height:${BAR_H * v / roi.total}px"></i></div><span>${n}</span></div>`).join('')}
  </div>
  <div class="foot"><b>${eur(roi.total)}</b> a year</div>
  <div class="note">${roi.assistant} h × €${roi.assistantRate} + ${roi.saved - roi.assistant} h overtime × €${roi.overtimeRate} = ${eur(roi.staff)}
    · ${Math.round(roi.lossCut * 100)}% of ${eur(roi.loss)} lost a year = ${eur(roi.losses)}</div>`;

// ---------- payback: cumulative cost vs. cumulative savings over the evaluation period ----------
const MONTHS = 12 * roi.years, TOP = 12000;
const X = m => 96 + m * 840 / MONTHS, Y = v => 500 - v * 420 / TOP;
const save = m => roi.total / 12 * m, cost = m => roi.setup + roi.running / 12 * m;
const pb = roi.payback, pt = (m, f) => `${X(m).toFixed(1)} ${Y(f(m)).toFixed(1)}`;
const CHART = `
  <div class="head"><h3>Year one: cost vs. savings</h3>
    <ul class="key"><li><i class="save"></i>Cumulative savings</li><li><i class="cost"></i>Cumulative cost</li></ul></div>
  <svg viewBox="0 0 1090 560">
    <defs><clipPath id="money-reveal"><rect x="0" y="0" width="0" height="560"/></clipPath></defs>
    <g class="grid">${[0, 3000, 6000, 9000, 12000].map(v => `<path d="M${X(0)} ${Y(v)}H${X(MONTHS)}"/><text x="${X(0) - 14}" y="${Y(v)}">${v ? `€${v / 1000}k` : '€0'}</text>`).join('')}
      ${[0, 3, 6, 9, 12].map(m => `<text class="m" x="${X(m)}" y="${Y(0) + 34}">${m === 12 ? '12 months' : m}</text>`).join('')}</g>
    <g clip-path="url(#money-reveal)">
      <path class="gap" d="M${pt(0, save)} L${pt(pb, save)} L${pt(0, cost)}Z"/>
      <path class="profit" d="M${pt(pb, save)} L${pt(MONTHS, save)} L${pt(MONTHS, cost)}Z"/>
      <path class="cost" d="M${pt(0, cost)} L${pt(MONTHS, cost)}"/>
      <path class="save" d="M${pt(0, save)} L${pt(MONTHS, save)}"/>
    </g>
    <g class="pb"><path d="M${X(pb)} ${Y(cost(pb)) + 14}V${Y(0)}"/><circle cx="${X(pb)}" cy="${Y(cost(pb))}" r="10"/>
      <text x="${X(pb) - 22}" y="${Y(cost(pb)) - 30}">Break-even · ${pb.toFixed(1)} months</text></g>
    <g class="ends">
      <text class="save" x="${X(MONTHS) + 18}" y="${Y(save(MONTHS))}">${eur(save(MONTHS))}</text>
      <text class="cost" x="${X(MONTHS) + 18}" y="${Y(cost(MONTHS))}">${eur(cost(MONTHS))}</text>
      <text class="gain" x="${X(MONTHS) - 14}" y="${(Y(save(MONTHS - 0.9)) + Y(cost(MONTHS - 0.9))) / 2}">+${eur(save(MONTHS) - cost(MONTHS))}</text>
    </g>
  </svg>`;
const TILES = [
  ['Setup, one-off', eur(roi.setup)],
  ['Running cost', `${eur(roi.running)}<small> / year</small>`],
  ['Return in year one', `+${Math.round(roi.roi * 100)}%`],
];

// ---------- pot of gold (the "Here comes the money" title), in stage pixels ----------
// The picture (story.money.pot.img) is placed so its rainbow, cut off at the top, leaves the frame top right; a golden
// glow sits behind it.
const POT = `
  <svg class="glow" viewBox="0 0 1920 1080">
    <defs><radialGradient id="pot-glow"><stop offset="0" stop-color="#FFD54F" stop-opacity=".5"/><stop offset="1" stop-color="#FFD54F" stop-opacity="0"/></radialGradient></defs>
    <circle cx="1490" cy="700" r="430" fill="url(#pot-glow)"/>
  </svg>
  <img src="${story.money.pot.img}" alt="">`;

const HTML = `
  <div class="card staff">${STAFF}</div>
  <div class="card money">${MONEY}</div>
  <div class="tiles">${TILES.map(([h, v], i) => `<div class="tile${i === 2 ? ' good' : ''}"><span>${h}</span><b>${v}</b></div>`).join('')}</div>
  <div class="card chart">${CHART}</div>`;

// ---------- build ----------
let M, G;
export function buildMoney() {
  const pot = document.createElement('div');
  pot.id = 'pot'; pot.className = 'how'; pot.innerHTML = POT;
  document.getElementById('mascot').before(pot);
  G = { el: pot };

  const el = document.createElement('div');
  el.id = 'money'; el.className = 'how'; el.innerHTML = HTML;
  document.getElementById('mascot').before(el);
  const q = s => el.querySelector(s), qa = s => [...el.querySelectorAll(s)];
  M = { el, staff: q('.staff'), money: q('.money'), ring: qa('.ring circle'), big: q('.big'), bigN: q('.big .n'), arrow: q('.arrow'),
    arrowLine: q('.arrow path'), small: q('.small'), caps: qa('.circles .cap'), legend: qa('.legend li'), feet: qa('.foot'), note: q('.note'),
    bars: qa('.bars i'), vals: qa('.bars .v'), labels: qa('.bars span'), tiles: qa('.tile'), chart: q('.chart'),
    reveal: q('#money-reveal rect'), pb: q('.pb'), ends: qa('.ends text') };
  M.arrowLen = M.arrowLine.getTotalLength();
  M.arrowLine.style.strokeDasharray = M.arrowLen;
}

// ---------- draw ----------
function drawPot(t) {
  // no animation: the picture switches on and off while the wipes into and out of the title cover the stage
  const { t0, t1 } = story.money.pot;
  G.el.style.display = t >= t0 - 0.3 && t <= t1 + 0.05 ? 'block' : 'none';
}

export function drawMoney(t) {
  drawPot(t);
  const { t0, t1 } = story.money;
  const vis = t >= t0 - 0.05 && t <= t1 + 0.05;
  M.el.style.display = vis ? 'block' : 'none';
  if (!vis) return;
  const s = t - t0;
  const out = easeInOut(prog(t, t1 - 0.45, 0.45));
  M.el.style.opacity = 1 - out;
  M.el.style.transform = `translateX(${-60 * out}px)`;

  // the cards make way for the payback chart after the second stop
  const swap = easeInOut(prog(s, 5.75, 0.5));
  const card = (el, k) => { el.style.opacity = easeOut(k) * (1 - swap); el.style.transform = `translate(${-80 * swap}px, ${40 * (1 - easeOut(k))}px)`; };

  // staff time: the big circle counts up while its ring fills with where the hours go, then the arrow, then the small one
  card(M.staff, prog(s, 0.6, 0.6));
  pop(M.big, prog(s, 0.9, 0.6));
  const hk = easeOut(prog(s, 0.95, 1.0));
  M.bigN.textContent = `${Math.round(roi.today * hk)} h`;
  let acc = 0;
  const rk = easeInOut(prog(s, 1.1, 0.9));
  M.ring.forEach((c, i) => {
    const len = roi.hours[i][1] / roi.today * RING;
    c.style.strokeDasharray = `${Math.max(0, len * rk - 4)} ${RING}`;   // 4px gap between segments
    c.style.strokeDashoffset = -acc * rk; acc += len;
  });
  M.caps[0].style.opacity = easeOut(prog(s, 1.2, 0.5));
  M.arrowLine.style.strokeDashoffset = M.arrowLen * (1 - easeInOut(prog(s, 1.8, 0.4)));
  M.arrow.lastElementChild.style.opacity = prog(s, 2.1, 0.15);
  pop(M.small, prog(s, 2.15, 0.6));
  M.caps[1].style.opacity = easeOut(prog(s, 2.35, 0.5));
  M.legend.forEach((l, i) => rise(l, easeOut(prog(s, 2.0 + i * 0.1, 0.45)), 12));
  rise(M.feet[0], easeOut(prog(s, 2.6, 0.55)), 16);

  // money saved: bars grow from the baseline one after the other, their values counting along on top of them
  card(M.money, prog(s, 3.45, 0.6));
  M.bars.forEach((b, i) => {
    const k = prog(s, 3.8 + i * 0.35, 0.7), g = easeOutBack(k);
    b.style.transform = `scaleY(${g})`;
    M.vals[i].style.transform = `translateY(${b.offsetHeight * (1 - g)}px)`;
    M.vals[i].textContent = eur(BARS[i][1] * easeOut(k));
    M.vals[i].style.opacity = clamp(k * 3);
    M.labels[i].style.opacity = easeOut(prog(s, 3.7 + i * 0.35, 0.4));
  });
  rise(M.feet[1], easeOut(prog(s, 4.9, 0.55)), 16);
  rise(M.note, easeOut(prog(s, 5.1, 0.5)), 10);

  // payback: tiles and the chart card rise, then both lines draw out at an even pace per month; break-even shows
  // as they cross
  M.tiles.forEach((tl, i) => rise(tl, easeOut(prog(s, 6.45 + i * 0.15, 0.55)), 30));
  rise(M.chart, easeOut(prog(s, 6.35, 0.6)), 40);
  const m = MONTHS * prog(s, 7.0, 1.7);
  M.reveal.setAttribute('width', X(m) + 6);
  M.pb.style.opacity = easeOut(prog(s, 7.0 + 1.7 * pb / MONTHS, 0.4));
  M.ends.forEach((e, i) => (e.style.opacity = easeOut(prog(s, 8.6 + i * 0.12, 0.45))));
}
