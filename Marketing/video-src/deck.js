// Presentation mode: the promo video as a clickable deck. It uses the same engine and storyboard, and holds at
// story.stops. A click plays the timeline on to the next stop. index.html?video turns this off for render.mjs.
import { story } from './story.js';

const params = new URLSearchParams(location.search);
if (!params.has('video')) startDeck();

async function startDeck() {
  const presenter = params.has('presenter');
  const root = document.documentElement;
  root.classList.add('deck');
  if (presenter) root.classList.add('presenter');
  const stage = document.getElementById('stage');

  // ---------- overlay UI ----------
  const ui = document.createElement('div');
  ui.innerHTML = `
    <div id="deck-loading"><div class="ring"></div><div>Loading presentation…</div></div>
    <div id="deck-black"></div>
    <div id="deck-hint">Click or press <kbd>→</kbd> to start · <kbd>F</kbd> fullscreen · <kbd>P</kbd> presenter view</div>
    <div id="deck-hud"><button data-act="prev" aria-label="Previous slide">‹</button><span id="deck-count"></span><button data-act="next" aria-label="Next slide">›</button><button data-act="full" aria-label="Fullscreen">⛶</button></div>
    <aside id="deck-panel">
      <div class="row"><span id="p-count"></span><span id="p-timer" title="Click to reset">00:00</span></div>
      <h1 id="p-title"></h1>
      <p id="p-notes"></p>
      <div class="next"><span>Next</span><div id="p-next"></div></div>
      <div class="btns"><button data-act="prev">‹ Back</button><button data-act="next">Next ›</button></div>
      <div class="keys"><kbd>→</kbd>/<kbd>Space</kbd> next · <kbd>←</kbd> back · <kbd>3</kbd><kbd>Enter</kbd> go to slide 3 · <kbd>B</kbd> black screen</div>
    </aside>`;
  document.body.append(...ui.children);
  const $ = id => document.getElementById(id);

  // ---------- fit the 1920x1080 stage into the window ----------
  function fit() {
    const W = innerWidth, H = innerHeight;
    const box = presenter ? { x: 24, y: 24, w: Math.max(320, W - 460), h: H - 48 } : { x: 0, y: 0, w: W, h: H };
    const s = Math.min(box.w / 1920, box.h / 1080);
    stage.style.transform = `translate(${box.x + (box.w - 1920 * s) / 2}px, ${box.y + (box.h - 1080 * s) / 2}px) scale(${s})`;
    window.setPixelRatio(Math.min(2, Math.max(1, s * devicePixelRatio)));
  }
  addEventListener('resize', fit);

  await window.setupDone;
  fit();
  $('deck-loading').remove();

  // ---------- timeline state ----------
  const stops = story.stops, last = stops.length - 1;
  let idx = clampIdx(parseInt(location.hash.slice(1), 10) || 0);
  let t = stops[idx].t, target = -1;
  let hold = 0, held = 0;   // seconds in the current hold, and in all holds (see renderFrame's amb/local clocks)

  function clampIdx(i) { return Math.min(last, Math.max(0, i | 0)); }
  function jump(i) { idx = clampIdx(i); t = stops[idx].t; target = -1; hold = 0; changed(); }
  function play(from, to) { idx = from; t = stops[from].t; target = to; hold = 0; changed(); }

  // local actions are mirrored to the other window (audience <-> presenter view)
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('quick-equipment-log-deck') : null;
  const send = m => chan && chan.postMessage(m);
  function next() {
    if (target >= 0) { jump(target); send({ type: 'jump', idx }); }               // skip the running animation
    else if (idx < last) { play(idx, idx + 1); send({ type: 'play', from: idx, to: idx + 1 }); }
  }
  function prev() { jump(target >= 0 ? idx : idx - 1); send({ type: 'jump', idx }); }
  function go(i) { jump(i); send({ type: 'jump', idx }); }
  function setBlack(on) { root.classList.toggle('black', on); }
  if (chan) chan.onmessage = ({ data: m }) => {
    if (m.type === 'jump') jump(m.idx);
    else if (m.type === 'play') play(m.from, m.to);
    else if (m.type === 'black') setBlack(m.on);
    else if (m.type === 'hello') send({ type: target >= 0 ? 'play' : 'jump', idx, from: idx, to: target });
  };
  if (presenter) send({ type: 'hello' });

  // ---------- render loop ----------
  let lastNow = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    if (target >= 0) {
      t = Math.min(t + dt, stops[target].t);
      if (t >= stops[target].t) { idx = target; target = -1; changed(); }
    } else { hold += dt; held += dt; }
    window.renderFrame(t, t + held, t + hold);
    const span = target >= 0 ? (t - stops[idx].t) / (stops[target].t - stops[idx].t) : 0;
    $('progress').style.width = `${100 * (idx + span) / last}%`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- UI state ----------
  const startedAt = { v: null };
  function changed() {
    history.replaceState(null, '', `${location.pathname}${location.search}#${idx}`);
    const shown = target >= 0 ? target : idx;
    $('deck-count').textContent = `${shown} / ${last}`;
    root.classList.toggle('at-start', idx === 0 && target < 0);
    if (presenter) {
      $('p-count').textContent = `Slide ${shown} / ${last}`;
      $('p-title').textContent = stops[shown].title;
      $('p-notes').textContent = stops[shown].notes;
      $('p-next').textContent = shown < last ? stops[shown + 1].title : 'End of presentation';
    }
    if (shown > 0 && startedAt.v === null) startedAt.v = Date.now();
  }
  changed();
  if (presenter) {
    const timer = $('p-timer');
    timer.onclick = () => { startedAt.v = Date.now(); };
    setInterval(() => {
      const s = startedAt.v === null ? 0 : Math.floor((Date.now() - startedAt.v) / 1000);
      timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }, 500);
  }

  // ---------- input ----------
  const actions = {
    next, prev,
    full: () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen()).catch(() => {}),
  };
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); actions[b.dataset.act](); }));

  let digits = '', digitsTimer = 0;
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { digits += k; clearTimeout(digitsTimer); digitsTimer = setTimeout(() => (digits = ''), 1500); return; }
    if (k === 'Enter' && digits) { go(+digits); digits = ''; }
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) next();   // clickers send PageDown/PageUp
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) prev();
    else if (k === 'Home') go(0);
    else if (k === 'End') go(last);
    else if (k === 'f' || k === 'F') actions.full();
    else if (k === 'b' || k === 'B' || k === '.') { const on = !root.classList.contains('black'); setBlack(on); send({ type: 'black', on }); }
    else if ((k === 'p' || k === 'P') && !presenter) window.open(`${location.pathname}?presenter#${idx}`, 'quick-equipment-log-presenter', 'width=1280,height=760');
    else return;
    e.preventDefault();
  });
  stage.addEventListener('click', next);
  addEventListener('hashchange', () => { const i = parseInt(location.hash.slice(1), 10); if (i >= 0 && i !== idx) go(i); });

  let touch = null;
  stage.addEventListener('touchstart', e => { touch = e.touches[0]; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.clientX; touch = null;
    if (Math.abs(dx) > 50) { e.preventDefault(); (dx < 0 ? next : prev)(); }
  });

  // the small slide counter shows while the mouse moves, then gets out of the way
  let hudTimer = 0;
  addEventListener('mousemove', () => {
    root.classList.add('hud'); clearTimeout(hudTimer);
    hudTimer = setTimeout(() => root.classList.remove('hud'), 2500);
  });
}
