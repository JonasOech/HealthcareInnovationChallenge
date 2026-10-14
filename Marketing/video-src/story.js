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
  [25.8, 2.20], [27.4, 1.55],                                  // 1 voice   7.50 -> 11.25
  [34.5, 4.25],                                                 // 2 gemini  8.50 -> 12.75
  [40.6, 2.25],                                                 // 3 confirm 4.50 -> 6.75
  [45.9, 2.75],                                                 // 4 overdue 5.50 -> 8.25
  [48.65, 1.60], [50.75, 1.60], [53.4, 1.55],                   // 5 waitlist 9.50 -> 14.25
  [59.8, 1.60], [61.9, 1.65],                                  // 6 roster  6.50 -> 9.75
  [64.8, 2.25],                                                 // 7 privacy 4.50 -> 6.75
  [72.3, 2.875],                                                // 8 outro   5.75 -> 8.625
  [77.5, 3.375],                                                // 9 blog    6.75 -> 10.125
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
  // HC21 labels: the scanned label number, then the patient, are typed into the booking form
  { t0: 5.6, fade: 0.25, layers: t => [{ src: P + 'confirm_base.png' },
      { type: { x: 196, y: 642, w: 752, h: 134, tx: 206, text: 'HC21-000001', k: clamp((t - 9.45) / 0.55) } },
      { type: { x: 245, y: 984, w: 703, h: 129, tx: 258, text: 'PT-90421 · Bed 4B-12', k: clamp((t - 10.25) / 0.6) } }] },
  // capture → synchronize → visualization: the phone is the capture end
  { t0: 11.9, fade: 0.25, layers: () => [{ src: P + 'bookings_0.png' }] },
  { t0: 18.2, fade: 0.25, layers: () => [{ src: P + 'log_idle.png' }] },   // tech demo: back to Log Equip, ready for the mic tap
  // 01 voice
  { t0: 22.05, fade: 0.12, layers: (t, T) => [{ src: P + 'listening.png' }, { reveal: { words: words.words, bg: words.bg, k: clamp((t - 22.25) / 3.4) } }, { pulse: { x: 540, y: 454, t: T } }] },
  { t0: 25.85, fade: 0.15, layers: (t, T) => [{ src: SPIN[Math.floor(T * 13) % SPIN.length] }] },   // keeps spinning through a hold
  // 02 AI parsed — scroll the stitched page
  { t0: 28.05, fade: 0.25, layers: t => {
      let off = ramp(t, 28.6, 29.6, 0, 1000);
      off = ramp(t, 32.1, 33.0, off, 2230);
      off = ramp(t, 36.5, 37.1, off, 2501);
      return [{ src: P + 'scroll_00.png' }, { tall: P + 'tall_log.png', offset: off }];
    } },
  // 03 confirm
  { t0: 37.85, fade: 0.1, layers: t => [{ src: P + 'confirm_base.png' }, toast('toast_logged.png', t, 37.95)] },
  // 04 late
  { t0: 41.25, fade: 0.25, layers: () => [{ src: P + 'bookings_0.png' }] },
  // 05 waitlist
  { t0: 46.6, fade: 0.25, layers: () => [{ src: P + 'wl_form4.png' }] },
  { t0: 49.25, fade: 0.1, layers: t => [{ src: P + 'wait_base.png' }, toast('toast_wait.png', t, 49.35)] },
  { t0: 51.25, fade: 0.25, layers: t => [{ src: P + 'bk2_0.png' }, { tall: P + 'tall_bk.png', offset: ramp(t, 51.5, 52.4, 0, 1034) - ramp(t, 53.85, 54.35, 0, 1034) }] },
  { t0: 54.55, fade: 0.1, layers: t => [{ src: P + 'return_base.png' }, toast('toast_return.png', t, 54.65)] },
  // 06 roster
  { t0: 56.25, fade: 0.25, layers: t => [{ src: P + 'roster_0.png' }, { tall: P + 'tall_roster.png', offset: ramp(t, 56.6, 58.1, 0, 1250) }] },
  { t0: 58.5, fade: 0.2, layers: () => [{ src: P + 'roster_wheel.png' }] },
  { t0: 60.25, fade: 0.2, layers: () => [{ src: P + 'roster_search.png' }] },
  // 07 privacy
  { t0: 62.75, fade: 0.25, layers: () => [{ src: P + 'log_idle.png' }] },
  // outro
  { t0: 67.1, fade: 0.3, layers: () => [{ src: P + 'after.png' }] },
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
  { t: 6.1, p: [1.52, -0.02, 3.3], r: [-3, -16, 2] },            // HC21 labels: the phone receives the scan
  { t: 11.0, p: [1.5, -0.02, 3.35], r: [-3, -15, 2] },
  { t: 12.4, p: [-1.62, -0.12, 2.9], r: [-3, 380, -2] },          // full spin to the capture end of the pipeline
  { t: 17.5, p: [-1.6, -0.12, 2.95], r: [-3, 381, -2] },
  { t: 18.9, p: [1.25, 0, 2.6], r: [-6, -22, 4] },                // tech demo: spins back over to the right, like the intro
  { t: 20.05, p: [1.15, 0.05, 2.8], r: [-4, -14, 2] },
  k(21.05, spin(LEFT, 360)),            // full spin while crossing to the left
  k(21.9, spin(LEFT, 360), { p: [-1.2, -0.02, 3.6] }),   // lean in for dictation
  k(25.9, spin(LEFT, 360), { p: [-1.22, -0.02, 3.6] }),
  k(27.5, spin(LEFT, 360)),
  k(28.5, RIGHT),
  k(32.0, RIGHT, { p: [1.18, 0.0, 3.55], r: [-2, -14, 1] }),
  k(36.1, RIGHT, { p: [1.2, 0.0, 3.5] }),
  k(37.0, spin(LEFT, 360)),
  k(40.8, spin(LEFT, 360), { p: [-1.2, 0.02, 3.45] }),
  k(41.7, spin(RIGHT, 0), { r: [-3, -20, 2] }),
  k(46.1, RIGHT, { p: [1.2, 0.03, 3.5] }),
  k(47.0, spin(LEFT, -360)),
  k(55.7, spin(LEFT, -360), { p: [-1.2, 0.0, 3.5] }),
  k(56.6, RIGHT),
  k(62.2, RIGHT, { p: [1.2, 0.02, 3.5] }),
  k(63.1, spin(LEFT, 360)),
  k(66.5, spin(LEFT, 360), { p: [-1.2, 0.0, 3.45] }),
  { t: 67.9, p: [1.25, -0.05, 2.7], r: [-5, 340, 3] },
  { t: 72.5, p: [1.25, -0.02, 2.95], r: [-3, 340 + 14, 1] },
  { t: 74.0, p: [1.6, -0.3, 1.0], r: [-3, 400, 1] },
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

  { t0: 18.4, t1: 20.45, side: 'left', dark: true, cls: 'demo', markDelay: 0.85, html: lines('Tech <mark>Demo</mark>') },

  // the rest of this scene (equipment, scan, steps) is the #hc21 layer in how.js
  { t0: 5.3, t1: 11.45, side: 'left', cls: 'top', html:
    `<div class="kicker">How it works</div>` + lines('Medical equipment tracking', '&amp; booking with <mark>HC21 labels.</mark>') +
    `<div class="sub">Track<b>·</b>Book<b>·</b>Manage<b>·</b>Monitor in real-time</div>` },

  { t0: 21.0, t1: 27.95, side: 'right', chipStart: 1.6, chipGap: 0.6, html:
    kicker('01', 'Voice logging') + lines('Just <mark>say it.</mark>') +
    `<div class="sub">Hold the mic and describe the booking, we understand and formalise it for you</div>` +
    `<div class="chips">${chip('mic', 'Hands-free, one-press dictation')}${chip('clock', 'Long, rambling requests welcome')}</div>` },

  { t0: 28.45, t1: 36.65, side: 'left', chipStart: 1.6, chipGap: 1.2, html:
    kicker('02', 'Gemini AI') + lines('AI <mark class="ai">untangles</mark>', 'the mess.') +
    `<div class="sub">Messy speech becomes a clean, structured record.</div>` +
    `<div class="chips">${chip('spark', 'Self-corrections resolved', 'ai')}${chip('check', 'Side remarks ignored', 'ai')}${chip('check', 'Form filled in for you', 'ai')}</div>` },

  { t0: 37.05, t1: 41.15, side: 'right', chipStart: 1.3, html:
    kicker('03', 'Confirm') + lines('One tap.', '<mark>Loaned.</mark>') +
    `<div class="sub">The record updates in real-time, no more retrospective logging</div>` +
    `<div class="chips">${chip('brain', 'Reduced mental load')}${chip('human', 'Human in the loop')}</div>` },

  { t0: 41.65, t1: 46.5, side: 'left', cls: 'tight', chipStart: 1.4, chipGap: 0.6, html:
    kicker('04', 'Overdue alerts') + lines('Patient didn’t bring it back?', '<mark class="red">We know.</mark>') +
    `<div class="sub">We calculate remaining booking time, so you know where to reach out</div>` +
    `<div class="chips">${chip('alert', 'Overdues are highlighted', 'red')}</div>` },

  { t0: 47.05, t1: 56.25, side: 'right', chipStart: 2.2, chipGap: 2.3, html:
    kicker('05', 'Smart waitlist') + lines('A waitlist that', '<mark>can’t be skipped.</mark>') +
    `<div class="sub">Book something that’s out and the patient is queued automatically.</div>` +
    `<div class="chips">${chip('queue', 'Patient added to the waitlist', 'warn')}${chip('undo', 'Item returned …')}${chip('bell', '… next patient notified')}</div>` },

  { t0: 56.55, t1: 62.5, side: 'left', chipStart: 1.6, chipGap: 0.7, html:
    kicker('06', 'Live roster') + lines('Every item.', '<mark>Every Location.</mark>') +
    `<div class="sub">Search and filter: available, on loan, in service, missing or late.</div>` +
    `<div class="chips">${chip('search', 'Search by ID, type or location')}${chip('check', 'Filter by status & category')}</div>` },

  { t0: 63.1, t1: 66.85, side: 'right', chipStart: 1.3, html:
    kicker('07', 'Privacy') + lines('Private', '<mark>by design.</mark>') +
    `<div class="sub">Our app is fully compatible with ollama - Privacy by design</div>` +
    `<div class="chips">${chip('lock', 'GDPR-minded from day one')}</div>` },

  { t0: 67.8, t1: 72.9, side: 'left', dark: true, markDelay: 1.1, html:
    `<div class="brand"><img src="hospital_logo.png"><div><div style="font:800 34px/1.1 Jakarta;color:#fff">Quick Equipment Log</div><div style="font:500 22px/1.4 Inter;color:var(--mint)">Speak it. Log it. Find it.</div></div></div>` +
    `<div style="height:44px"></div>` + lines('Smarter equipment', 'tracking for better', '<mark>patient care.</mark>') +
    `<div class="foot">Healthcare Innovation Challenge 2026 · Tallaght University Hospital<br>Grace, Marvin &amp; Jonas</div>` +
    `<div class="credit" style="text-align:left">Music: “Wallpaper” by Kevin MacLeod (incompetech.com) · CC BY 4.0</div>` },
];

const highlights = [
  { t0: 9.4, t1: 10.35, x: 86, y: 512, w: 908, h: 310, color: '#00685F' },                        // HC21 field, scanned
  { t0: 10.3, t1: 11.4, x: 84, y: 854, w: 912, h: 304, color: '#00685F' },                         // patient field
  { t0: 22.8, t1: 26.15, x: 84, y: 1000, w: 912, h: 320, color: '#4648D4' },                       // transcript
  { t0: 29.7, t1: 32.05, x: 44, y: C0 + 1310 - 1000, w: 992, h: 705, color: '#4648D4' },          // AI parsed card
  { t0: 33.2, t1: 36.4, x: 86, y: C0 + 2380 - 2230, w: 910, h: 1465, color: '#4648D4' },          // AI-filled form
  { t0: 38.4, t1: 41.0, x: 44, y: 295, w: 991, h: 199, color: '#00685F' },                         // logged toast
  { t0: 42.2, t1: 46.3, x: 40, y: 360, w: 1000, h: 545, color: '#EF4444' },                        // late booking
  { t0: 47.4, t1: 49.05, x: 40, y: 1595, w: 1000, h: 200, color: '#D97706' },                      // on-loan warning
  { t0: 49.75, t1: 51.15, x: 43, y: 295, w: 993, h: 262, color: '#D97706' },                       // waitlist toast
  { t0: 52.5, t1: 53.8, x: 40, y: C0 + 2470 - 1034, w: 1000, h: 320, color: '#D97706' },          // waitlist entry
  { t0: 55.1, t1: 56.1, x: 43, y: 295, w: 993, h: 262, color: '#00685F' },                         // next notified
  { t0: 58.8, t1: 60.2, x: 245, y: 598, w: 300, h: 84, color: '#00685F' },                         // category chip
  { t0: 60.7, t1: 62.5, x: 40, y: 255, w: 1000, h: 815, color: '#EF4444' },                        // search + late
];

const taps = [
  { t: 21.75, x: 540, y: 454 },
  { t: 37.65, x: 540, y: 1916 },
  { t: 49.05, x: 540, y: 1915 },
  { t: 54.4, x: 300, y: 1400 },
  { t: 58.3, x: 395, y: 640 },
];

// ---------- presentation deck ----------
// Each stop is a story time where everything on screen has finished animating in. The deck holds there, and a
// click plays the timeline on to the next stop. Notes show in the presenter view (?presenter).
const stops = [
  { t: 0, title: 'Start', notes: 'Blank dark screen. Click to start the intro.' },
  { t: 4.4, title: 'Equipment tracking just got trivial', notes: 'OT tracks ~155 specialist items in an Excel sheet that is updated after the fact. About €4,600 of equipment goes missing every year. Our app makes logging take seconds, by voice.' },
  { t: 11.0, title: 'How it works: HC21 labels', notes: 'Every item already carries a unique HC21 barcode label with its serial number. The nurse scans the label and enters the patient ID to book it, so the record is updated at the handover itself.' },
  { t: 16.0, title: 'How it works: capture → sync → dashboard', notes: 'Bookings captured on the ward are synchronised into a central equipment database and visualised on a live dashboard: totals, distribution, booking trends and status.' },
  { t: 17.5, title: 'How it works: Excel still supported', notes: 'The database can still be opened as the familiar Acute Equipment Tracker spreadsheet, so Excel support is still provided and nobody has to give up their sheet.' },
  { t: 19.85, title: 'Tech Demo', notes: 'Section break: from here on it is the real app, captured from the Android emulator.' },
  { t: 25.65, title: '01 · Voice logging', notes: 'The nurse holds the mic and just talks, including the self-correction and the side remark about the broken cushion. Long, messy dictation is fine.' },
  { t: 31.75, title: '02 · Gemini: AI parsed', notes: 'Gemini returns a structured result: it resolves "no wait, ending 35" and ignores the cushion remark.' },
  { t: 36.0, title: '02 · Gemini: form filled', notes: 'The booking form is filled in for them: item, patient MRN, bed, duration. They only check it.' },
  { t: 40.5, title: '03 · One tap. Loaned.', notes: 'One tap confirms. The record updates in real time, at the handover, not hours later.' },
  { t: 45.8, title: '04 · Overdue alerts', notes: 'Due dates come from the booking duration. Late loans jump to the top in red.' },
  { t: 48.7, title: '05 · Waitlist: item is out', notes: 'Someone books the tilt-in-space wheelchair, but it is already on loan. The app warns them.' },
  { t: 50.8, title: '05 · Waitlist: queued', notes: 'Confirming puts the patient on the waitlist automatically. Nobody can skip the queue.' },
  { t: 53.45, title: '05 · Waitlist: the queue', notes: 'The waitlist sits under bookings, so everyone can see who is next.' },
  { t: 55.6, title: '05 · Waitlist: return → notify', notes: 'When the chair is returned, the next patient on the waitlist is notified straight away.' },
  { t: 59.85, title: '06 · Roster: filter', notes: 'The roster shows every item and where it is. Filter by category…' },
  { t: 61.95, title: '06 · Roster: search', notes: '…or search by ID, type or location, and filter by status: available, on loan, repair, missing, late.' },
  { t: 66.1, title: '07 · Private by design', notes: 'Patient data stays minimal: MRN only, no names. The parsing step can be swapped for a locally hosted model (e.g. Ollama), so no data has to leave the hospital.' },
  { t: 72.3, title: 'Smarter equipment tracking for better patient care', notes: 'Wrap-up. Healthcare Innovation Challenge 2026, Tallaght University Hospital. Grace, Marvin & Jonas. Thank you!' },
  { t: 77.0, title: 'oechsner.dev', notes: 'Read more on the blog. Questions?' },
];

const MASCOT = Array.from({ length: 123 }, (_, i) => `${P}ollama/${String(i).padStart(3, '0')}.jpg`);

export const story = {
  unwarp, warp,
  // scene 7: Ollama mascot sticker pops up from the bottom next to the phone and waves.
  // Only frames 0-110 are the mascot itself (the clip then cuts to a sheet of sketch variants),
  // and the frames run on real time, ping-ponging, so the sticker keeps waving through a hold.
  mascot: { t0: 63.4, t1: 67.0, T0: warp(63.4), x: 560, y: 560, frames: MASCOT, usable: 111 },
  // how it works: the HC21 scan scene and the capture → synchronize → visualization scene (how.js)
  how: { hc21: { t0: 5.3, t1: 11.45 }, flow: { t0: 11.5, t1: 18.0 } },
  // scene 9: oechsner.dev end card
  blog: { t0: 72.75 },
  duration: warp(79.5),
  contentRows: [C0, 2062],
  allImages: () => [...new Set([...clips.flatMap(c => c.layers(c.t0 + 0.5).filter(l => l.src || l.tall).map(l => l.src || l.tall)), ...SPIN,
    ...MASCOT, P + 'toast_logged.png', P + 'toast_wait.png', P + 'toast_return.png', P + 'tall_log.png', P + 'tall_bk.png', P + 'tall_roster.png'])],
  screenLayers, highlights, taps, texts, stops,
  // phone keyframes live in output time and are evaluated against real time, so the phone keeps
  // drifting through a hold instead of freezing with the rest of the frame
  phoneKeys: phoneKeys.map(K => ({ ...K, t: warp(K.t) })),
  darkness: t => Math.max(1 - clamp((t - 4.95) / 0.3), clamp((t - 18.05) / 0.4) * (1 - clamp((t - 20.45) / 0.3)), clamp((t - 67.2) / 0.4)),
  // wipe passes at scene changes into/out of the dark intro/outro
  wipeAt: t => { for (const c of [5.0, 18.1, 20.5, 67.25]) { const k = (t - c) / 0.9 + 0.5; if (k > 0 && k < 1) return -1.5 + 3 * ease(k); } return null; },
};
