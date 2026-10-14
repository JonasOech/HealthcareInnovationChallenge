# Presentation

`video-src/` is the pitch presentation: a Three.js page where a 3D phone flies between scenes of the Android
demo app, each with animated captions that highlight one feature. It runs as a clickable deck in the browser
and holds at the 25 stops in `story.js` (`stops`) — each click plays on to the next stop, and the phone,
background and mascot keep moving while a slide holds. The concept is in `PRESENTATION_CONCEPT.md`.

The "Follow along" QR card on slide 0 (`follow.js`) is deck-only too: it shows while the deck waits to start and
slides out as the intro begins. The QR matrix is hard-coded there (made with segno, error correction H so the hospital
logo in the middle doesn't break it); regenerate it with the one-liner in `follow.js` if the URL in `story.follow` changes.

The three "how it works" slides and the "Tech Demo" title are deck-only: they were added after the MP4 was rendered, so the video goes
straight from the intro to 01. Their phone, screen and captions live in `story.js` like every other scene; the
equipment cards, scan, pipeline, database, tracker sheet, dashboard and access links are DOM layers drawn by `how.js`, and the
four extra phones of "Synchronized access" are clones of the 3D phone in `engine.js`.

The "Data flow" slide after 07 is deck-only too: the phone dives out of the frame and `dataflow.js` draws the input data
flow as DOM layers (phone → TUH server, local or AWS → LLMs through OpenRouter or local inference → autofill → phone, with
"human in the loop" closing it). The two mini phones show `screens/listening.png` and `screens/autofill.png`, which is
`scroll_00.png` with `tall_log.png` at offset 2501 pasted into the content rows (the frame 02 ends on).

The "Here comes the money" title (dark teal, like "Tech Demo") and the three "business case" slides after it are deck-only too. The phone dives out of the frame for all four, and `money.js` draws
the title's pot of gold (the team's picture `screens/pot_of_gold.webp`, placed so its rainbow leaves the frame top right),
the cards and the payback chart as DOM layers. The numbers come from the team's "Savings & ROI" spreadsheet: `story.js`
(`roi`) holds the sheet's inputs and works out the outputs the same way the sheet does (329 h → 30 h a year, €10,950 saved a
year, payback in 8.3 months, +40% ROI). To change a figure, change the input there.

`QuickEquipmentLog_promo.mp4` is the finished 64-second promo video (1920×1080, 30 fps) rendered from this
same storyboard. The renderer itself is no longer in the repo — the deck is what we present from.

| Stop | Feature |
|---|---|
| deck only | Follow along: QR code to `https://tuh.oechsner.dev/` so the audience opens the deck on their phones (slide 0) |
| 0:00 | Intro: "Equipment Tracking just got trivial" |
| deck only | How it works: equipment with HC21 labels is scanned, the number lands in the booking form |
| deck only | How it works: capture → synchronize (database) → visualization (dashboard) |
| deck only | Same slide, next click: the tracker sheet pops up, "Excel support still provided" |
| deck only | Synchronized access: the phone and four more ring the central database, all linked to it |
| deck only | "Tech Demo" section title (dark teal, like the intro) |
| 0:05 | 01 Voice logging: hold to speak, live transcript |
| 0:12 | 02 Gemini AI: self-corrections resolved, side remarks ignored, form filled in |
| 0:21 | 03 One tap. Loaned. (confirm + toast) |
| 0:26 | 04 Patient didn't bring it back? We know. (overdue loans) |
| 0:31 | 05 Smart waitlist: queued, returned, next patient notified |
| 0:41 | 06 Every item. Every Location. (roster search and filters) |
| 0:47 | 07 Privacy by design: Ollama mascot pops up and waves |
| deck only | Data flow: speech recording → transcription, patient ID encryption, custom prompt → LLMs (OpenRouter or Ollama / OpenLLM) → autofill → review & submit, human in the loop |
| deck only | "Here comes the money" section title (dark teal, like "Tech Demo"): a pot of gold, its rainbow leaving the frame top right |
| deck only | Business case: staff time, 329 h a year today → 30 h with the app (circle areas to scale) |
| deck only | Same slide, next click: money saved, €2,400 fewer lost items + €8,550 staff time = €10,950 a year |
| deck only | Payback: setup, running cost and ROI tiles, and cumulative cost vs. savings crossing at 8.3 months |
| 0:52 | Outro and credits |
| 0:58 | Blog plug in the oechsner.dev style: "Read about this on oechsner.dev" |

Colours and fonts come from the app's design system (`App/stitch_nurse_equipment_voice_logger/DESIGN.md`):
teal primary `#00685F`, mint `#6DF5E1`, AI indigo `#4648D4`, Plus Jakarta Sans and Inter. The end card uses
the oechsner.dev design: Playfair Display, DM Sans, `#0e0f12` background and blue/amber glows.

`SCRIPT.md` is the editable scene-by-scene script behind the captions.

## Credits that must stay

- **Music** (in the MP4 only): "Wallpaper" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0. The
  credit appears in the outro and must stay if the video is shared.
- **Ollama mascot:** the first ~4 s of Novra's animation "Ollama, mascot development in Rive" (LinkedIn),
  shown on a sticker card in scene 7 (`video-src/screens/ollama/`). This is third-party footage, so get
  permission from Novra (and check Ollama's brand guidelines) before publishing publicly.

## Running it

```bash
cd Marketing/video-src
npm ci
npm run deck          # builds dist/ and serves it on http://localhost:3000
```

| Key | Action |
|---|---|
| → / Space / PageDown / click / swipe left | next (skips to the end if a transition is still playing) |
| ← / PageUp / swipe right | back |
| number + Enter, Home, End | go to slide |
| F | fullscreen |
| B | black screen |
| P | presenter view in a new window (notes, next slide, timer; stays in sync with the main window) |

`#7` at the end of the URL opens slide 7.

## Live talks: the audience follows along on their phones

Share the normal link with the audience. While the presenter has the deck open with the presenter key, everyone
else can go back as far as they like but never past the presenter's slide. Viewers on the presenter's slide move
with it; viewers who went back get a "Back to live" button. With no presenter connected nothing is locked, so the
deck is freely browsable before and after the talk.

- Present from `https://<site>/?admin=<PRESENTER_KEY>` (never share this link). `P` opens the presenter view with
  the key too, so either window can drive.
- Moving the mouse shows a badge at the top: "Live · 12 watching · End". **End** unlocks everyone at once; closing
  the tab unlocks them after 45 s (so a reload or a Wi-Fi blip doesn't end the session).
- Set the key once: `npx wrangler secret put PRESENTER_KEY`. For `wrangler dev`, put `PRESENTER_KEY=...` in
  `video-src/.dev.vars` (gitignored).

`worker.js` serves `dist/` and runs `/live`: one Durable Object stores the presenter's slide and sends it to every
viewer over a WebSocket. The cap is enforced in the browser, so a technical viewer could still read the static
files ahead of time. Without the Worker (e.g. `npm run deck`, or Cloudflare Pages) `/live` doesn't exist and the
deck simply stays unlocked.

## Hosting on Cloudflare

`node build-deck.mjs` writes a static site to `video-src/dist/` (about 190 files, 18 MB). It copies only the
files the page loads and moves `node_modules` files to `vendor/`.

- **Worker (needed for live talks):** `node build-deck.mjs && npx wrangler deploy` uses `wrangler.jsonc`. With
  Workers Builds (Git integration), set the root directory to `Marketing/video-src`, the build command to
  `node build-deck.mjs` and the deploy command to `npx wrangler deploy`. Set `PRESENTER_KEY` once (see above).
  Non-production branches (e.g. `Slides`) run `npx wrangler preview`, which uses the `previews` block in
  `wrangler.jsonc` (its own `LIVE` binding, so each Preview gets a separate Durable Object). Previews don't get the
  production secret: set it once with `npx wrangler preview base-config secret put PRESENTER_KEY`.
- **Static only (Cloudflare Pages or any host, no live talks):** root directory `Marketing/video-src`, build
  command `node build-deck.mjs`, output directory `dist`; or `npx wrangler pages deploy dist --project-name
  quick-equipment-log`. `.node-version` selects Node 22.

## Where the screens come from

1. **Real app screens from an Android emulator.** The app ran on an Android 9 (API 28) x86_64 emulator,
   captured at the full 1080×2400 resolution with the emulator's host-side screenshot command. These captures
   were taken with a capture-only build of the app (`video-src/capture/capture-build.patch`, never committed
   to the app):
   - the mic plays a scripted, rambling dictation instead of using real speech recognition, because the
     emulator has no microphone or recogniser;
   - Gemini calls go to `capture/mock_gemini.py`, a local server that returns a fixed parse (correcting
     48291053 to 48291035 and ignoring the broken-cushion remark).

   Everything else on screen is the real app: the UI, the form auto-fill, bookings, waitlist, roster and toasts.
2. **Long pages** were captured over several scrolls and then joined (`capture/stitch.py`), so the deck can
   scroll them smoothly.
3. **3D scene.** The phone is built in Three.js (`engine.js`): an extruded aluminium frame, a teal glass back,
   a camera bar and a punch-hole display. Each frame of the screen is composited on a canvas texture, with
   spotlight highlights, tap ripples and the word-by-word transcript. `story.js` holds the timeline: phone
   keyframes, screen clips, highlights and captions, and `renderFrame(t)` draws any moment directly.
