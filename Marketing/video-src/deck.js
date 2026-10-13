// The presentation: the promo storyboard as a clickable deck. It drives the same engine and holds at
// story.stops. A click plays the timeline on to the next stop.
import { story } from './story.js';

const params = new URLSearchParams(location.search);
startDeck();

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
    <button id="deck-live" hidden></button>
    <div id="deck-hint"><span class="for-keys">Click or press <kbd>→</kbd> to start · <kbd>F</kbd> fullscreen · <kbd>P</kbd> presenter view</span><span class="for-touch">Tap or swipe to start · tap the expand button to fill the screen</span></div>
    <div id="deck-hud"><button data-act="prev" aria-label="Previous slide">‹</button><span id="deck-count"></span><button data-act="next" aria-label="Next slide">›</button><button data-act="full" id="deck-full" aria-label="Fullscreen"></button></div>
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
  // Maximized on a phone (.max): fullscreen where the browser allows it (iPhone Safari doesn't for pages), and in
  // portrait the whole page is turned sideways (.rotated) so the 16:9 slide fills the screen.
  let rotated = false;
  function fit() {
    rotated = root.classList.contains('max') && innerHeight > innerWidth;
    root.classList.toggle('rotated', rotated);
    const W = rotated ? innerHeight : innerWidth, H = rotated ? innerWidth : innerHeight;
    document.body.style.cssText = rotated ? `width: ${W}px; height: ${H}px; transform: translateX(${H}px) rotate(90deg)` : '';
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
  // live session (worker.js): while the presenter is connected, viewers can't go past the presenter's slide
  const adminKey = params.get('admin');
  let isAdmin = false, locked = false, liveIdx = last, ws = null, ended = false, rejected = false, watching = 0, nudgeUntil = 0;
  const cap = () => (locked ? liveIdx : last);
  let idx = clampIdx(parseInt(location.hash.slice(1), 10) || 0);
  let t = stops[idx].t, target = -1;
  let hold = 0, held = 0;   // seconds in the current hold, and in all holds (see renderFrame's deck clocks)

  function clampIdx(i) { return Math.min(cap(), Math.max(0, i | 0)); }
  const shown = () => (target >= 0 ? target : idx);
  function jump(i) { idx = clampIdx(i); t = stops[idx].t; target = -1; hold = 0; changed(); }
  function play(from, to) { idx = from; t = stops[from].t; target = to; hold = 0; changed(); }

  // local actions are mirrored to the other window (audience <-> presenter view)
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('quick-equipment-log-deck') : null;
  const send = m => {
    if (chan) chan.postMessage(m);
    if (isAdmin && ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));   // and to the audience
  };
  function next() {
    if (target >= 0) { jump(target); send({ type: 'jump', idx }); }               // skip the running animation
    else if (idx < cap()) { play(idx, idx + 1); send({ type: 'play', from: idx, to: idx + 1 }); }
    else if (locked) { nudgeUntil = performance.now() + 1800; liveUI(); setTimeout(liveUI, 1900); }
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

  // ---------- live session ----------
  const badge = $('deck-live');
  let retry = 1, unlockTimer = 0;
  function connect() {
    if (!/^https?:$/.test(location.protocol)) return;
    const q = adminKey ? `?key=${encodeURIComponent(adminKey)}&idx=${shown()}` : '';
    const sock = ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/live${q}`);
    sock.onmessage = ({ data }) => onLive(JSON.parse(data));
    sock.onclose = () => {
      if (ws === sock) ws = null;
      liveUI();
      if (ended) return;
      // fail open: a viewer who can't reach the server for a while is unlocked rather than stuck
      clearTimeout(unlockTimer); unlockTimer = setTimeout(() => setLock(false), 30000);
      setTimeout(connect, 1000 * retry); retry = Math.min(15, retry * 2);
    };
  }
  function onLive(m) {
    if (m.type === 'hello') { retry = 1; clearTimeout(unlockTimer); isAdmin = m.admin; rejected = !!adminKey && !m.admin; setLock(m.live, m.idx); }
    else if (m.type === 'live') setLock(m.on, m.idx);
    else if (m.type === 'count') watching = m.n;
    else if (m.type === 'ended') ended = true;
    else if (!locked) return;
    // viewers on the presenter's slide move with it; viewers who went back stay where they are
    else if (m.type === 'jump') { const follow = shown() >= liveIdx || shown() > m.idx; liveIdx = m.idx; if (follow) jump(m.idx); }
    else if (m.type === 'play') { const follow = shown() >= liveIdx; liveIdx = m.to; if (follow) play(m.from, m.to); }
    liveUI();
  }
  function setLock(on, i = liveIdx) {
    const was = locked;
    liveIdx = i; locked = on && !isAdmin;
    if (locked && (!was || shown() > liveIdx)) jump(liveIdx);   // joining a live talk starts on the presenter's slide
    liveUI();
  }
  function liveUI() {
    let state = '', html = '';
    if (adminKey) {
      state = 'admin';
      if (rejected) html = 'Presenter key not accepted';
      else if (ended) html = 'Live session ended · <b>Go live</b>';
      else if (isAdmin && ws) html = `<i></i>Live · ${watching} watching · <b>End</b>`;
      else html = 'Connecting…';
    } else if (locked) {
      state = shown() < liveIdx ? 'behind' : 'live';
      html = state === 'behind' ? '<i></i>Back to live ›'
        : performance.now() < nudgeUntil ? "<i></i>Live · you're on the presenter's slide" : '<i></i>Live';
    }
    root.classList.toggle('locked', locked);
    badge.hidden = !state;
    badge.dataset.state = state;
    badge.innerHTML = html;
  }
  badge.addEventListener('click', e => {
    e.stopPropagation();
    if (badge.dataset.state === 'behind') jump(liveIdx);
    else if (badge.dataset.state !== 'admin') return;
    else if (ended) { ended = false; connect(); }
    else if (isAdmin && ws) ws.send(JSON.stringify({ type: 'end' }));
    liveUI();
  });

  // ---------- render loop ----------
  let lastNow = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    if (target >= 0) {
      t = Math.min(t + dt, stops[target].t);
      if (t >= stops[target].t) { idx = target; target = -1; changed(); }
    } else { hold += dt; held += dt; }
    window.renderFrame(0, { t, amb: t + held, loop: story.warp(t) + hold });
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
    liveUI();
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
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const touchUI = matchMedia('(hover: none)').matches;
  const icons = {
    expand: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    shrink: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
  };
  function fullUI() {
    const on = !!fsElement() || root.classList.contains('max');
    $('deck-full').innerHTML = on ? icons.shrink : icons.expand;
    $('deck-full').setAttribute('aria-label', on ? 'Exit fullscreen' : 'Fullscreen');
  }
  function setMax(on) { root.classList.toggle('max', on); fit(); fullUI(); }
  function full() {
    if (fsElement() || root.classList.contains('max')) {
      setMax(false);
      if (fsElement()) Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});
      return;
    }
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    // phones: also try to turn to landscape (Android Chrome allows it in fullscreen)
    if (request) Promise.resolve(request.call(root)).then(() => touchUI && screen.orientation?.lock?.('landscape')).catch(() => {});
    if (touchUI || !request) setMax(true);
  }
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange'])
    document.addEventListener(ev, () => (fsElement() ? fullUI() : setMax(false)));
  fullUI();

  const actions = { next, prev, full };
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
    else if ((k === 'p' || k === 'P') && !presenter && !locked) {   // viewers don't get the notes during a live talk
      const key = adminKey ? `&admin=${encodeURIComponent(adminKey)}` : '';
      window.open(`${location.pathname}?presenter${key}#${idx}`, 'quick-equipment-log-presenter', 'width=1280,height=760');
    }
    else return;
    e.preventDefault();
  });
  stage.addEventListener('click', next);
  // links on the end card open in a new tab instead of advancing the deck
  document.querySelectorAll('#blog a').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
  addEventListener('hashchange', () => { const i = parseInt(location.hash.slice(1), 10); if (i >= 0 && i !== idx) go(i); });

  let touch = null;
  stage.addEventListener('touchstart', e => { touch = e.touches[0]; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!touch) return;
    const end = e.changedTouches[0];   // turned sideways, the slide's x axis runs down the screen
    const dx = rotated ? end.clientY - touch.clientY : end.clientX - touch.clientX; touch = null;
    if (Math.abs(dx) > 50) { e.preventDefault(); (dx < 0 ? next : prev)(); }
  });

  connect();

  // the small slide counter shows while the mouse moves, then gets out of the way
  let hudTimer = 0;
  addEventListener('mousemove', () => {
    root.classList.add('hud'); clearTimeout(hudTimer);
    hudTimer = setTimeout(() => root.classList.remove('hud'), 2500);
  });
}
