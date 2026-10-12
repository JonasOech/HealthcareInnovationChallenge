// Storyboard for the Quick Equipment Log promo. All screen images are real captures from the
// Android emulator (1080x2400); times are seconds.
import words from './words.json' with { type: 'json' };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const ramp = (t, t0, t1, a, b, f = ease) => a + (b - a) * f(clamp((t - t0) / (t1 - t0)));
const P = 'screens/';
const SPIN = Array.from({ length: 29 }, (_, i) => `${P}spin/${String(i).padStart(2, '0')}.png`);

// ---------- scene stretch ----------
// Every scene runs 50% longer than it is authored below, without slowing anything down: the extra
// seconds are inserted as holds at instants where no animation is in flight, so each scroll, toast,
// highlight and caption still plays at its original speed. [authored time, seconds of hold].
// The phone, the background blobs, the mic rings, the Gemini spinner and the mascot keep moving on
// real time through a hold, so a held frame never looks dead.
const PADS = [
  [4.30, 2.50],                                                  // 0 intro   5.00 -> 7.50
  [10.30, 2.20], [11.90, 1.55],                                  // 1 voice   7.50 -> 11.25
  [19.00, 4.25],                                                 // 2 gemini  8.50 -> 12.75
  [25.10, 2.25],                                                 // 3 confirm 4.50 -> 6.75
  [30.40, 2.75],                                                 // 4 overdue 5.50 -> 8.25
  [33.15, 1.60], [35.25, 1.60], [37.90, 1.55],                   // 5 waitlist 9.50 -> 14.25
  [44.30, 1.60], [46.40, 1.65],                                  // 6 roster  6.50 -> 9.75
  [49.30, 2.25],                                                 // 7 privacy 4.50 -> 6.75
  [56.80, 2.875],                                                // 8 outro   5.75 -> 8.625
  [62.00, 3.375],                                                // 9 blog    6.75 -> 10.125
];
const warp = a => a + PADS.reduce((s, [p, d]) => s + (a > p ? d : 0), 0);   // authored -> output
function unwarp(T) {                                                        // output -> authored
  let acc = 0;
  for (const [a, d] of PADS) {
    const start = a + acc;             // output time at which this hold begins
    if (T <= start) break;
    if (T < start + d) return a;       // inside a hold: authored time stands still
    acc += d;
  }
  return T - acc;
}

// toast overlay sliding in from above, like the app's slideInVertically
const toast = (src, t, t0) => ({ src: P + src, dy: -70 * (1 - easeOut(clamp((t - t0) / 0.35))), alpha: clamp((t - t0) / 0.25) });
// stitched page: screen y = 255 + tallY - offset
const C0 = 255;

// ---------- screen clips ----------
const clips = [
  { t0: 0, layers: () => [{ src: P + 'log_idle.png' }] },
  // 01 voice
  { t0: 6.55, fade: 0.12, layers: (t, T) => [{ src: P + 'listening.png' }, { reveal: { words: words.words, bg: words.bg, k: clamp((t - 6.75) / 3.4) } }, { pulse: { x: 540, y: 454, t: T } }] },
  { t0: 10.35, fade: 0.15, layers: (t, T) => [{ src: SPIN[Math.floor(T * 13) % SPIN.length] }] },   // keeps spinning through a hold
  // 02 AI parsed — scroll the stitched page
  { t0: 12.55, fade: 0.25, layers: t => {
      let off = ramp(t, 13.1, 14.1, 0, 1000);
      off = ramp(t, 16.6, 17.5, off, 2230);
      off = ramp(t, 21.0, 21.6, off, 2501);
      return [{ src: P + 'scroll_00.png' }, { tall: P + 'tall_log.png', offset: off }];
    } },
  // 03 confirm
  { t0: 22.35, fade: 0.1, layers: t => [{ src: P + 'confirm_base.png' }, toast('toast_logged.png', t, 22.45)] },
  // 04 late
  { t0: 25.75, fade: 0.25, layers: () => [{ src: P + 'bookings_0.png' }] },
  // 05 waitlist
  { t0: 31.1, fade: 0.25, layers: () => [{ src: P + 'wl_form4.png' }] },
  { t0: 33.75, fade: 0.1, layers: t => [{ src: P + 'wait_base.png' }, toast('toast_wait.png', t, 33.85)] },
  { t0: 35.75, fade: 0.25, layers: t => [{ src: P + 'bk2_0.png' }, { tall: P + 'tall_bk.png', offset: ramp(t, 36.0, 36.9, 0, 1034) - ramp(t, 38.35, 38.85, 0, 1034) }] },
  { t0: 39.05, fade: 0.1, layers: t => [{ src: P + 'return_base.png' }, toast('toast_return.png', t, 39.15)] },
  // 06 roster
  { t0: 40.75, fade: 0.25, layers: t => [{ src: P + 'roster_0.png' }, { tall: P + 'tall_roster.png', offset: ramp(t, 41.1, 42.6, 0, 1250) }] },
  { t0: 43.0, fade: 0.2, layers: () => [{ src: P + 'roster_wheel.png' }] },
  { t0: 44.75, fade: 0.2, layers: () => [{ src: P + 'roster_search.png' }] },
  // 07 privacy
  { t0: 47.25, fade: 0.25, layers: () => [{ src: P + 'log_idle.png' }] },
  // outro
  { t0: 51.6, fade: 0.3, layers: () => [{ src: P + 'after.png' }] },
];

function screenLayers(t, T) {
  let i = 0; while (i < clips.length - 1 && t >= clips[i + 1].t0) i++;
  const c = clips[i], k = c.fade ? clamp((t - c.t0) / c.fade) : 1;
  const cur = c.layers(t, T);
  if (k >= 1 || i === 0) return cur;
  return [...clips[i - 1].layers(t, T), ...cur.map(L => ({ ...L, alpha: (L.alpha ?? 1) * k }))];
}

// ---------- phone path ----------
const Z = 3.3;
const RIGHT = { p: [1.22, -0.02, Z], r: [-3, -20, 2] };   // phone on the right, text left
const LEFT = { p: [-1.22, -0.02, Z], r: [-3, 20, -2] };   // phone on the left, text right
const k = (t, pose, extra = {}) => ({ t, p: [...pose.p], r: [...pose.r], ...extra });
const spin = (pose, dy) => ({ p: pose.p, r: [pose.r[0], pose.r[1] + dy, pose.r[2]] });

const phoneKeys = [
  { t: 0, p: [3.2, -3.6, -1.5], r: [35, -250, 30], float: 0 },
  { t: 2.3, p: [1.25, 0, 2.6], r: [-6, -22, 4], ease: easeOut, float: 1 },
  { t: 4.55, p: [1.15, 0.05, 2.8], r: [-4, -14, 2] },
  k(5.55, spin(LEFT, 360)),            // full spin while crossing to the left
  k(6.4, spin(LEFT, 360), { p: [-1.2, -0.02, 3.6] }),   // lean in for dictation
  k(10.4, spin(LEFT, 360), { p: [-1.22, -0.02, 3.6] }),
  k(12.0, spin(LEFT, 360)),
  k(13.0, RIGHT),
  k(16.5, RIGHT, { p: [1.18, 0.0, 3.55], r: [-2, -14, 1] }),
  k(20.6, RIGHT, { p: [1.2, 0.0, 3.5] }),
  k(21.5, spin(LEFT, 360)),
  k(25.3, spin(LEFT, 360), { p: [-1.2, 0.02, 3.45] }),
  k(26.2, spin(RIGHT, 0), { r: [-3, -20, 2] }),
  k(30.6, RIGHT, { p: [1.2, 0.03, 3.5] }),
  k(31.5, spin(LEFT, -360)),
  k(40.2, spin(LEFT, -360), { p: [-1.2, 0.0, 3.5] }),
  k(41.1, RIGHT),
  k(46.7, RIGHT, { p: [1.2, 0.02, 3.5] }),
  k(47.6, spin(LEFT, 360)),
  k(51.0, spin(LEFT, 360), { p: [-1.2, 0.0, 3.45] }),
  { t: 52.4, p: [1.25, -0.05, 2.7], r: [-5, 340, 3] },
  { t: 57.0, p: [1.25, -0.02, 2.95], r: [-3, 340 + 14, 1] },
  { t: 58.5, p: [1.6, -0.3, 1.0], r: [-3, 400, 1] },
];

// ---------- copy ----------
const ic = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8zM18 13l.9 2.6 2.6.9-2.6.9L18 20l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2 2 0 0 0 4 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3A2.5 2.5 0 0 0 7 5.5v.2A3 3 0 0 0 4.5 9a3 3 0 0 0 .6 1.8A3 3 0 0 0 4 13.5a3 3 0 0 0 2.5 3A3 3 0 0 0 9.5 20h.5V3z"/><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.2A3 3 0 0 1 19.5 9a3 3 0 0 1-.6 1.8 3 3 0 0 1 1.1 2.7 3 3 0 0 1-2.5 3A3 3 0 0 1 14.5 20H14V3z"/><path d="M10 8H8.5M10 13H7.5M14 8h1.5M14 13h2.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3l10 18H2z" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5"/></svg>',
  human: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10.2" r="2.7"/><path d="M7.4 17.6a4.8 4.8 0 0 1 9.2 0"/><path d="M3.6 15.4A9 9 0 1 1 17.2 19.8"/><path d="M13.4 19.4l3.8.4-.3 3.8"/></svg>',
};
const chip = (icon, text, tone = 'teal') => {
  const tones = { teal: ['#D5FBF5', '#00685F'], ai: ['#E4E5FF', '#4648D4'], red: ['#FEE2E2', '#DC2626'], warn: ['#FEF3C7', '#B45309'] };
  const [bg, fg] = tones[tone];
  return `<div class="chip"><span class="ic" style="background:${bg};color:${fg}">${ic[icon]}</span><span>${text}</span></div>`;
};
const lines = (...ls) => `<div class="title">${ls.map(l => `<span class="ln"><span>${l}</span></span>`).join('')}</div>`;
const kicker = (n, s) => `<div class="kicker"><span class="num">${n}</span>${s}</div>`;

const texts = [
  { t0: 0.6, t1: 4.9, side: 'left', dark: true, markDelay: 1.3, html:
    `<div class="brand"><img src="hospital_logo.png"><div><div style="font:800 34px/1.1 Jakarta;color:#fff">Quick Equipment Log</div><div style="font:500 22px/1.4 Inter;color:var(--mint)">Tallaght University Hospital · OT</div></div></div>` +
    `<div style="height:44px"></div>` + lines('Equipment Tracking', 'just got <mark>trivial</mark>') +
    `<div class="sub">Book, return and track specialist equipment by voice, in seconds</div>` },

  { t0: 5.5, t1: 12.45, side: 'right', chipStart: 1.6, chipGap: 0.6, html:
    kicker('01', 'Voice logging') + lines('Just <mark>say it.</mark>') +
    `<div class="sub">Hold the mic and describe the booking, we understand and formalise it for you</div>` +
    `<div class="chips">${chip('mic', 'Hands-free, one-press dictation')}${chip('clock', 'Long, rambling requests welcome')}</div>` },

  { t0: 12.95, t1: 21.15, side: 'left', chipStart: 1.6, chipGap: 1.2, html:
    kicker('02', 'Gemini AI') + lines('AI <mark class="ai">untangles</mark>', 'the mess.') +
    `<div class="sub">Messy speech becomes a clean, structured record.</div>` +
    `<div class="chips">${chip('spark', 'Self-corrections resolved', 'ai')}${chip('check', 'Side remarks ignored', 'ai')}${chip('check', 'Form filled in for you', 'ai')}</div>` },

  { t0: 21.55, t1: 25.65, side: 'right', chipStart: 1.3, html:
    kicker('03', 'Confirm') + lines('One tap.', '<mark>Loaned.</mark>') +
    `<div class="sub">The record updates in real-time, no more retrospective logging</div>` +
    `<div class="chips">${chip('brain', 'Reduced mental load')}${chip('human', 'Human in the loop')}</div>` },

  { t0: 26.15, t1: 31.0, side: 'left', cls: 'tight', chipStart: 1.4, chipGap: 0.6, html:
    kicker('04', 'Overdue alerts') + lines('Patient didn’t bring it back?', '<mark class="red">We know.</mark>') +
    `<div class="sub">We calculate remaining booking time, so you know where to reach out</div>` +
    `<div class="chips">${chip('alert', 'Overdues are highlighted', 'red')}</div>` },

  { t0: 31.55, t1: 40.75, side: 'right', chipStart: 2.2, chipGap: 2.3, html:
    kicker('05', 'Smart waitlist') + lines('A waitlist that', '<mark>can’t be skipped.</mark>') +
    `<div class="sub">Book something that’s out and the patient is queued automatically.</div>` +
    `<div class="chips">${chip('queue', 'Patient added to the waitlist', 'warn')}${chip('undo', 'Item returned …')}${chip('bell', '… next patient notified')}</div>` },

  { t0: 41.05, t1: 47.0, side: 'left', chipStart: 1.6, chipGap: 0.7, html:
    kicker('06', 'Live roster') + lines('Every item.', '<mark>Every Location.</mark>') +
    `<div class="sub">Search and filter: available, on loan, in service, missing or late.</div>` +
    `<div class="chips">${chip('search', 'Search by ID, type or location')}${chip('check', 'Filter by status & category')}</div>` },

  { t0: 47.6, t1: 51.35, side: 'right', chipStart: 1.3, html:
    kicker('07', 'Privacy') + lines('Private', '<mark>by design.</mark>') +
    `<div class="sub">Our app is fully compatible with ollama - Privacy by design</div>` +
    `<div class="chips">${chip('lock', 'GDPR-minded from day one')}</div>` },

  { t0: 52.3, t1: 57.4, side: 'left', dark: true, markDelay: 1.1, html:
    `<div class="brand"><img src="hospital_logo.png"><div><div style="font:800 34px/1.1 Jakarta;color:#fff">Quick Equipment Log</div><div style="font:500 22px/1.4 Inter;color:var(--mint)">Speak it. Log it. Find it.</div></div></div>` +
    `<div style="height:44px"></div>` + lines('Smarter equipment', 'tracking for better', '<mark>patient care.</mark>') +
    `<div class="foot">Healthcare Innovation Challenge 2026 · Tallaght University Hospital<br>Grace, Marvin &amp; Jonas</div>` +
    `<div class="credit" style="text-align:left">Music: “Wallpaper” by Kevin MacLeod (incompetech.com) · CC BY 4.0</div>` },
];

const highlights = [
  { t0: 7.3, t1: 10.65, x: 84, y: 1000, w: 912, h: 320, color: '#4648D4' },                       // transcript
  { t0: 14.2, t1: 16.55, x: 44, y: C0 + 1310 - 1000, w: 992, h: 705, color: '#4648D4' },          // AI parsed card
  { t0: 17.7, t1: 20.9, x: 86, y: C0 + 2380 - 2230, w: 910, h: 1465, color: '#4648D4' },          // AI-filled form
  { t0: 22.9, t1: 25.5, x: 44, y: 295, w: 991, h: 199, color: '#00685F' },                         // logged toast
  { t0: 26.7, t1: 30.8, x: 40, y: 360, w: 1000, h: 545, color: '#EF4444' },                        // late booking
  { t0: 31.9, t1: 33.55, x: 40, y: 1595, w: 1000, h: 200, color: '#D97706' },                      // on-loan warning
  { t0: 34.25, t1: 35.65, x: 43, y: 295, w: 993, h: 262, color: '#D97706' },                       // waitlist toast
  { t0: 37.0, t1: 38.3, x: 40, y: C0 + 2470 - 1034, w: 1000, h: 320, color: '#D97706' },          // waitlist entry
  { t0: 39.6, t1: 40.6, x: 43, y: 295, w: 993, h: 262, color: '#00685F' },                         // next notified
  { t0: 43.3, t1: 44.7, x: 245, y: 598, w: 300, h: 84, color: '#00685F' },                         // category chip
  { t0: 45.2, t1: 47.0, x: 40, y: 255, w: 1000, h: 815, color: '#EF4444' },                        // search + late
];

const taps = [
  { t: 6.25, x: 540, y: 454 },
  { t: 22.15, x: 540, y: 1916 },
  { t: 33.55, x: 540, y: 1915 },
  { t: 38.9, x: 300, y: 1400 },
  { t: 42.8, x: 395, y: 640 },
];

// ---------- presentation deck ----------
// Each stop is a story time where everything on screen has finished animating in. The deck holds there, and a
// click plays the timeline on to the next stop. Notes show in the presenter view (?presenter).
const stops = [
  { t: 0, title: 'Start', notes: 'Blank dark screen. Click to start the intro.' },
  { t: 4.4, title: 'Equipment tracking just got trivial', notes: 'OT tracks ~155 specialist items in an Excel sheet that is updated after the fact. About €4,600 of equipment goes missing every year. Our app makes logging take seconds, by voice.' },
  { t: 10.15, title: '01 · Voice logging', notes: 'The nurse holds the mic and just talks, including the self-correction and the side remark about the broken cushion. Long, messy dictation is fine.' },
  { t: 16.25, title: '02 · Gemini: AI parsed', notes: 'Gemini returns a structured result: it resolves "no wait, ending 35" and ignores the cushion remark.' },
  { t: 20.5, title: '02 · Gemini: form filled', notes: 'The booking form is filled in for them: item, patient MRN, bed, duration. They only check it.' },
  { t: 25.0, title: '03 · One tap. Loaned.', notes: 'One tap confirms. The record updates in real time, at the handover, not hours later.' },
  { t: 30.3, title: '04 · Overdue alerts', notes: 'Due dates come from the booking duration. Late loans jump to the top in red.' },
  { t: 33.2, title: '05 · Waitlist: item is out', notes: 'Someone books the tilt-in-space wheelchair, but it is already on loan. The app warns them.' },
  { t: 35.3, title: '05 · Waitlist: queued', notes: 'Confirming puts the patient on the waitlist automatically. Nobody can skip the queue.' },
  { t: 37.95, title: '05 · Waitlist: the queue', notes: 'The waitlist sits under bookings, so everyone can see who is next.' },
  { t: 40.1, title: '05 · Waitlist: return → notify', notes: 'When the chair is returned, the next patient on the waitlist is notified straight away.' },
  { t: 44.35, title: '06 · Roster: filter', notes: 'The roster shows every item and where it is. Filter by category…' },
  { t: 46.45, title: '06 · Roster: search', notes: '…or search by ID, type or location, and filter by status: available, on loan, repair, missing, late.' },
  { t: 50.6, title: '07 · Private by design', notes: 'Patient data stays minimal: MRN only, no names. The parsing step can be swapped for a locally hosted model (e.g. Ollama), so no data has to leave the hospital.' },
  { t: 56.8, title: 'Smarter equipment tracking for better patient care', notes: 'Wrap-up. Healthcare Innovation Challenge 2026, Tallaght University Hospital. Grace, Marvin & Jonas. Thank you!' },
  { t: 61.5, title: 'oechsner.dev', notes: 'Read more on the blog. Questions?' },
];

const MASCOT = Array.from({ length: 123 }, (_, i) => `${P}ollama/${String(i).padStart(3, '0')}.jpg`);

export const story = {
  unwarp, warp,
  // scene 7: Ollama mascot sticker pops up from the bottom next to the phone and waves.
  // Only frames 0-110 are the mascot itself (the clip then cuts to a sheet of sketch variants),
  // and the frames run on real time, ping-ponging, so the sticker keeps waving through a hold.
  mascot: { t0: 47.9, t1: 51.5, T0: warp(47.9), x: 560, y: 560, frames: MASCOT, usable: 111 },
  // scene 9: oechsner.dev end card
  blog: { t0: 57.25 },
  duration: warp(64),
  contentRows: [C0, 2062],
  allImages: () => [...new Set([...clips.flatMap(c => c.layers(c.t0 + 0.5).filter(l => l.src || l.tall).map(l => l.src || l.tall)), ...SPIN,
    ...MASCOT, P + 'toast_logged.png', P + 'toast_wait.png', P + 'toast_return.png', P + 'tall_log.png', P + 'tall_bk.png', P + 'tall_roster.png'])],
  screenLayers, highlights, taps, texts, stops,
  // phone keyframes live in output time and are evaluated against real time, so the phone keeps
  // drifting through a hold instead of freezing with the rest of the frame
  phoneKeys: phoneKeys.map(K => ({ ...K, t: warp(K.t) })),
  darkness: t => Math.max(1 - clamp((t - 4.95) / 0.3), clamp((t - 51.7) / 0.4)),
  // wipe passes at scene changes into/out of the dark intro/outro
  wipeAt: t => { for (const c of [5.0, 51.75]) { const k = (t - c) / 0.9 + 0.5; if (k > 0 && k < 1) return -1.5 + 3 * ease(k); } return null; },
};
