// Deck-only "Follow along" card on slide 0, before the intro: a styled QR code for the audience to open the deck
// on their phones (live talks: worker.js). It is fully shown while the deck holds at t = 0 and slides out as
// the intro starts. The video page (no deck) never shows it.
import { story } from './story.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const prog = (t, t0, dur) => clamp((t - t0) / dur);

// QR code for story.follow.url: version 4, error correction H (30%), so the logo in the middle doesn't break it.
// Made with segno (pip install segno):
//   [''.join('1' if c & 1 else '0' for c in r) for r in segno.make(url, error='h', boost_error=False).matrix]
// Regenerate it if the URL changes.
const QR = [
  '111111100010010111000101101111111',
  '100000100101011111101101001000001',
  '101110100010011001010001001011101',
  '101110100100101101010011001011101',
  '101110101000010110111001001011101',
  '100000100110010101000100101000001',
  '111111101010101010101010101111111',
  '000000001000100000101001000000000',
  '001100111010010100011110111010000',
  '100101000000010111100001011001011',
  '110010100011100111100111110001111',
  '001010001001111111011110111111010',
  '000000111010011111100110110100010',
  '011000010111000010001100100110100',
  '100110111100110010011100101000100',
  '101000011011100101100110001011010',
  '110110111101111011001101111011000',
  '011000000101001110101111011010110',
  '110101101110101110000100000110100',
  '001011010101011111111000011000001',
  '101010110010100000111100010001110',
  '111110011011100101011010010101101',
  '000110110100010011111110001000011',
  '011111001111100101111001110001001',
  '100111111000101000010101111110000',
  '000000001101011110100001100010010',
  '111111101000110111010011101011000',
  '100000100011000111011111100011111',
  '101110100111100100011001111110110',
  '101110101100011011011100000100000',
  '101110101100101101010111111001100',
  '100000100101110101100001110001001',
  '111111100101010011011011001111000'
];

// the styled code as SVG, one unit per module: dots for data, rounded finder eyes, the hospital logo in the middle
// (also used by the poster, ../poster/build-poster.mjs)
export function qrSvg() {
  const n = QR.length, hole = [12, 20];   // 9x9 modules cleared for the logo (7.4% of the code; H recovers 30%)
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const inHole = (r, c) => r >= hole[0] && r <= hole[1] && c >= hole[0] && c <= hole[1];
  let dots = '';
  QR.forEach((row, r) => [...row].forEach((b, c) => {
    if (b === '1' && !finder(r, c) && !inHole(r, c)) dots += `<circle cx="${c + 0.5}" cy="${r + 0.5}" r="0.43"/>`;
  }));
  const eye = (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="url(#qr-ink)" stroke-width="1"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="url(#qr-ink)"/>`;
  const c0 = hole[0] + 0.6, w = hole[1] - hole[0] + 1 - 1.2;
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="geometricPrecision">
    <defs><linearGradient id="qr-ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00685F"/><stop offset=".55" stop-color="#00594F"/><stop offset="1" stop-color="#3A3CB8"/></linearGradient></defs>
    <g fill="url(#qr-ink)">${dots}</g>${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}
    <rect x="${c0}" y="${c0}" width="${w}" height="${w}" rx="1.6" fill="#fff" stroke="#E2E7FF" stroke-width="0.12"/>
    <image href="hospital_logo.png" x="${c0 + 0.7}" y="${c0 + 0.7}" width="${w - 1.4}" height="${w - 1.4}"/></svg>`;
}

export const ICON = {
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
};

let F;
export function buildFollow() {
  const { url } = story.follow, host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const el = document.createElement('div');
  el.id = 'follow';
  el.innerHTML = `
    <div class="copy">
      <div class="kicker">Live presentation</div>
      <div class="title"><span class="ln"><span>Follow along</span></span><span class="ln"><span>on your <mark>phone.</mark></span></span></div>
      <div class="sub">Scan the code to open these slides on your own screen.</div>
      <div class="points">
        <div><span class="ic">${ICON.phone}</span>They move with the talk, slide by slide</div>
        <div><span class="ic">${ICON.back}</span>Go back to anything you missed</div>
      </div>
    </div>
    <div class="code">
      <div class="aim"><i></i><i></i><i></i><i></i></div>
      <a class="card" href="${url}" target="_blank" rel="noopener">${qrSvg()}<div class="url"><span class="ic">${ICON.scan}</span>${host}</div></a>
    </div>`;
  document.getElementById('mascot').before(el);
  // the link opens the site instead of advancing the deck
  el.querySelector('a').addEventListener('click', e => e.stopPropagation());
  const q = s => el.querySelector(s);
  F = { el, copy: q('.copy'), code: q('.code'), aim: q('.aim'), mark: q('mark'), lines: [...el.querySelectorAll('.ln > span')],
    fades: [...el.querySelectorAll('.kicker, .sub, .points > div')] };
}

// t is story time (stands still while the deck holds on slide 0), A the ambient clock that keeps running
export function drawFollow(t, A, deck) {
  const { t1 } = story.follow;
  const vis = deck && t <= t1 + 0.05;
  F.el.style.display = vis ? 'block' : 'none';
  if (!vis) return;
  // exit: slides out to the side as the intro starts, like the captions
  const out = easeInOut(prog(t, 0, t1));
  F.copy.style.opacity = F.code.style.opacity = 1 - out;
  F.copy.style.transform = `translateX(${-60 * out}px)`;
  F.code.style.transform = `translateX(${60 * out}px)`;
  // entrance on the ambient clock, so it plays once when the deck opens and is simply there when you come back
  F.lines.forEach((l, i) => { const k = easeOut(prog(A, 0.15 + i * 0.09, 0.6)); l.style.transform = `translateY(${110 * (1 - k)}%)`; });
  F.fades.forEach((f, i) => { const k = easeOut(prog(A, 0.1 + i * 0.12, 0.5)); f.style.opacity = k; f.style.transform = `translateY(${24 * (1 - k)}px)`; });
  F.mark.style.setProperty('--p', easeInOut(prog(A, 0.9, 0.5)));
  const k = easeOut(prog(A, 0.25, 0.8));
  F.code.style.opacity = (1 - out) * k;
  F.code.style.transform += ` translateY(${40 * (1 - k)}px)`;
  // the viewfinder corners breathe while the slide holds
  F.aim.style.transform = `scale(${1 + 0.018 * Math.sin(A * 2.2)})`;
}
