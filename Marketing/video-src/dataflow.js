// The data flow slide after 07 Privacy (deck only), as a DOM layer over the stage while the phone is out of frame:
// mobile device (speech recording) → TUH server, local or AWS (transcription → patient ID encryption, custom prompt)
// → LLMs (any model through OpenRouter, or local inference with Ollama / OpenLLM) → autofill → mobile device
// (modification & submission), with the clinician closing the loop: human in the loop. The brand logos are from the
// MIT-licensed @lobehub/icons-static-svg set (screens/logos/).
// Positions are stage pixels (1920x1080), so the arrows and the boxes share one coordinate system.
// Times come from story.dataflow; everything below is an offset from its t0.
import { story } from './story.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeOutBack = k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const prog = (t, t0, dur) => clamp((t - t0) / dur);
const rise = (el, k, dy = 24) => { el.style.opacity = k; el.style.transform = `translateY(${dy * (1 - k)}px)`; };
const pop = (el, k) => { el.style.opacity = clamp(k * 2); el.style.transform = `scale(${0.6 + 0.4 * easeOutBack(k)})`; };

// ---------- artwork ----------
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  phone: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
  server: svg('<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01M12 7.5h5M12 16.5h5"/>'),
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8zM18 13l.9 2.6 2.6.9-2.6.9L18 20l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  wave: svg('<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  prompt: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13l2 2-2 2M13 17h3"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  human: svg('<circle cx="12" cy="10.2" r="2.7"/><path d="M7.4 17.6a4.8 4.8 0 0 1 9.2 0"/><path d="M3.6 15.4A9 9 0 1 1 17.2 19.8"/><path d="M13.4 19.4l3.8.4-.3 3.8"/>'),
};

// ---------- layout ----------
const Y0 = 292, GH = 600;                             // the groups' top and height
const G = [                                           // x, width, title, tint
  { x: 75, w: 270, h: 'Mobile device', ic: 'phone', c: 'teal' },
  { x: 415, w: 470, h: 'TUH server', sub: 'Local / AWS', ic: 'server', c: 'warm' },
  { x: 955, w: 500, h: 'LLMs', ic: 'spark', c: 'ai' },
  { x: 1525, w: 320, h: 'Mobile device', ic: 'phone', c: 'teal' },
];
const box = (x, y, w, h) => ({ x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: x + w, b: y + h });
const PH = { w: 160, h: 356 };                        // mini phones, the emulator's 1080x2400 aspect plus the frame
const N = {
  speech: box(99, 362, 222, 120),
  phoneIn: box(130, 496, PH.w, PH.h),
  trans: box(439, 362, 422, 120),
  merge: box(439, 542, 422, 310),             // patient ID encryption + custom prompt, sent on together
  router: box(979, 382, 200, 180),
  local: box(979, 642, 452, 210),
  submit: box(1549, 362, 272, 120),
  phoneOut: box(1605, 496, PH.w, PH.h),
};
const LOGO = n => `${story.dataflow.logos}${n}.svg`;
const MODELS = [['Gemini', 'gemini'], ['GPT', 'openai'], ['Claude', 'claude'], ['DeepSeek', 'deepseek']];
const CHIP = { x: 1261, w: 170, h: 46, y: i => 362 + i * 58 };

// arrows between the groups, each with a share of the records riding it
const hArrow = (x0, y, x1) => ({ d: `M${x0} ${y}H${x1}`, head: `M${x1 - 12} ${y - 12}l12 12-12 12` });
const vArrow = (x, y0, y1) => ({ d: `M${x} ${y0}V${y1}`, head: `M${x - 12} ${y1 - 12}l12 12 12-12` });
const ARROWS = [
  hArrow(N.speech.r + 8, N.speech.cy, N.trans.x - 10),
  vArrow(N.trans.cx, N.trans.b + 8, N.merge.y - 10),
  hArrow(N.merge.r + 8, N.merge.cy, G[2].x - 10),
  hArrow(G[2].x + G[2].w + 8, N.submit.cy, N.submit.x - 10),
];
const FAN = MODELS.map((_, i) => `M${N.router.r + 6} ${N.router.cy}C${N.router.r + 46} ${N.router.cy}, ${CHIP.x - 46} ${CHIP.y(i) + CHIP.h / 2}, ${CHIP.x - 6} ${CHIP.y(i) + CHIP.h / 2}`);
// human in the loop: from the submitting phone back round to the recording one
const LOOP_Y = 984;
const LOOP = `M${N.phoneOut.cx} ${Y0 + GH + 6}V${LOOP_Y - 30}Q${N.phoneOut.cx} ${LOOP_Y} ${N.phoneOut.cx - 30} ${LOOP_Y}H${N.phoneIn.cx + 30}Q${N.phoneIn.cx} ${LOOP_Y} ${N.phoneIn.cx} ${LOOP_Y - 30}V${Y0 + GH + 6}`;

const at = b => `style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"`;
const node = (b, ic, h, p, cls = '') => `<div class="node ${cls}" ${at(b)}><span class="ic">${ICON[ic]}</span><div><div class="h">${h}</div>${p ? `<p>${p}</p>` : ''}</div></div>`;
const row = (ic, h, p) => `<div class="row"><span class="ic">${ICON[ic]}</span><div><div class="h">${h}</div><p>${p}</p></div></div>`;
const mini = (b, src) => `<div class="mini" ${at(b)}><img src="${src}" alt=""></div>`;

const HTML = `
  ${G.map(g => `<div class="group ${g.c}" style="left:${g.x}px;top:${Y0}px;width:${g.w}px;height:${GH}px">
    <div class="gh"><span class="ic">${ICON[g.ic]}</span>${g.h}${g.sub ? `<span class="gs">${g.sub}</span>` : ''}</div></div>`).join('')}
  <svg class="lines" viewBox="0 0 1920 1080">
    <defs><mask id="df-loop" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path class="reveal" d="${LOOP}"/></mask></defs>
    <path class="loop" d="${LOOP}" mask="url(#df-loop)"/>
    ${FAN.map(d => `<path class="fan" d="${d}"/>`).join('')}
    ${ARROWS.map(a => `<g class="arrow"><path d="${a.d}"/><path class="head" d="${a.head}"/></g>`).join('')}
  </svg>
  <div class="packets">${'<i></i>'.repeat(2 * ARROWS.length)}</div>
  ${node(N.speech, 'mic', 'Speech<br>recording', '', 'tight')}
  ${mini(N.phoneIn, story.dataflow.screens[0])}
  ${node(N.trans, 'wave', 'Transcription', 'Speech becomes text')}
  <div class="node merge" ${at(N.merge)}>${row('lock', 'Patient ID encryption', 'Before anything leaves the server')}
    <div class="plus">+</div>${row('prompt', 'Custom prompt', 'Roster, patients &amp; form schema')}</div>
  <div class="node router" ${at(N.router)}><img class="logo" src="${LOGO('openrouter')}" alt=""><div class="h">OpenRouter</div><p>Any cloud model</p></div>
  ${MODELS.map(([n, f], i) => `<div class="model" ${at({ x: CHIP.x, y: CHIP.y(i), w: CHIP.w, h: CHIP.h })}><img src="${LOGO(f)}" alt="">${n}</div>`).join('')}
  <div class="or" style="left:${G[2].x}px;top:${N.local.y - 50}px;width:${G[2].w}px"><span>or</span></div>
  <div class="node local" ${at(N.local)}><span class="ollama"><img src="${LOGO('ollama')}" alt=""></span><div><div class="h">Local inference</div>
    <div class="tag">Ollama / OpenLLM</div><p>Patient data never leaves the hospital</p></div></div>
  <div class="autofill" style="left:${G[2].x + G[2].w}px;top:${N.submit.cy - 44}px;width:${N.submit.x - G[2].x - G[2].w}px">autofill</div>
  ${node(N.submit, 'edit', 'Modification<br>&amp; submission', '', 'tight')}
  ${mini(N.phoneOut, story.dataflow.screens[1])}
  <div class="hitl" style="left:960px;top:${LOOP_Y}px"><span class="ic">${ICON.human}</span>Human in the loop</div>`;

// ---------- build ----------
let D;
export function buildDataflow() {
  const el = document.createElement('div');
  el.id = 'dataflow'; el.className = 'how'; el.innerHTML = HTML;
  document.getElementById('mascot').before(el);
  const q = s => el.querySelector(s), qa = s => [...el.querySelectorAll(s)];
  D = { el, groups: qa('.group'), nodes: qa('.node'), minis: qa('.mini'), models: qa('.model'), or: q('.or'), autofill: q('.autofill'),
    hitl: q('.hitl'), rows: qa('.merge .row'), plus: q('.plus'), arrows: qa('.arrow path:not(.head)'), heads: qa('.arrow .head'), fans: qa('.fan'), loop: q('.loop'), reveal: q('.reveal'), packets: qa('.packets i') };
  D.lens = D.arrows.map(p => p.getTotalLength());
  D.arrows.forEach((p, i) => (p.style.strokeDasharray = D.lens[i]));
  D.fanLens = D.fans.map(p => p.getTotalLength());
  D.fans.forEach((p, i) => (p.style.strokeDasharray = D.fanLens[i]));
  D.loopLen = D.reveal.getTotalLength();
  D.reveal.style.strokeDasharray = D.loopLen;
}

// ---------- draw ----------
export function drawDataflow(t, A) {
  const { t0, t1 } = story.dataflow;
  const vis = t >= t0 - 0.05 && t <= t1 + 0.05;
  D.el.style.display = vis ? 'block' : 'none';
  if (!vis) return;
  const s = t - t0;
  const out = easeInOut(prog(t, t1 - 0.45, 0.45));
  D.el.style.opacity = 1 - out;
  D.el.style.transform = `translateX(${-60 * out}px)`;

  // left to right: each group rises, then its contents, then the arrow out of it draws
  const groupAt = [0.3, 1.0, 1.8, 2.8];
  D.groups.forEach((g, i) => rise(g, easeOut(prog(s, groupAt[i], 0.55)), 40));
  // nodes in HTML order: speech, transcription, encryption + prompt, router, local, submission
  const nodeAt = [0.55, 1.2, 1.4, 2.0, 2.45, 3.0];
  D.nodes.forEach((n, i) => rise(n, easeOut(prog(s, nodeAt[i], 0.5)), 20));
  D.rows.forEach((r, i) => rise(r, easeOut(prog(s, 1.5 + i * 0.2, 0.45)), 12));
  pop(D.plus, prog(s, 1.62, 0.45));
  [0.7, 3.15].forEach((a, i) => { const k = prog(s, a, 0.6); D.minis[i].style.opacity = easeOut(k);
    D.minis[i].style.transform = `translateY(${50 * (1 - easeOutBack(k))}px) rotate(${(i ? 3 : -3) * (1 - easeOut(k))}deg)`; });
  D.models.forEach((m, i) => pop(m, prog(s, 2.25 + i * 0.08, 0.45)));
  D.fans.forEach((f, i) => (f.style.strokeDashoffset = D.fanLens[i] * (1 - easeInOut(prog(s, 2.2 + i * 0.08, 0.4)))));
  rise(D.or, easeOut(prog(s, 2.35, 0.4)), 10);

  const arrowAt = [0.9, 1.4, 1.85, 2.75];
  const drawn = D.arrows.map((p, i) => {
    const k = easeInOut(prog(s, arrowAt[i], 0.4));
    p.style.strokeDashoffset = D.lens[i] * (1 - k);
    D.heads[i].style.opacity = prog(s, arrowAt[i] + 0.3, 0.12);
    return k;
  });
  pop(D.autofill, prog(s, 2.95, 0.45));
  // records ride each arrow once it is drawn
  D.packets.forEach((el, j) => {
    const i = j >> 1, u = (A * 0.55 + (j & 1) * 0.5 + i * 0.17) % 1;
    const pt = D.arrows[i].getPointAtLength(u * D.lens[i]);
    el.style.transform = `translate(${pt.x - 8}px, ${pt.y - 8}px) rotate(45deg)`;
    el.style.opacity = (drawn[i] >= 1 ? 1 : 0) * Math.min(1, u * 6, (1 - u) * 6);
  });

  // human in the loop: the dashed path draws back round to the recording phone, then its label pops onto it
  D.reveal.style.strokeDashoffset = D.loopLen * (1 - easeInOut(prog(s, 3.4, 0.7)));
  D.loop.style.strokeDashoffset = -A * 18;      // the dashes keep flowing back towards the recording phone
  const hk = prog(s, 3.85, 0.5);
  D.hitl.style.opacity = clamp(hk * 2);
  D.hitl.style.transform = `translate(-50%, -50%) scale(${0.6 + 0.4 * easeOutBack(hk)})`;
}
