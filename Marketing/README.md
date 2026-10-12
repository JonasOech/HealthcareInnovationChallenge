# Marketing video

`QuickEquipmentLog_promo.mp4` is a 64-second promo for the Android demo app (1920×1080, 30 fps, H.264 + AAC). A 3D phone flies between scenes, and each scene has animated captions that highlight one feature:

| Time | Feature |
|---|---|
| 0:00 | Intro: "Equipment Tracking just got trivial" |
| 0:05 | 01 Voice logging: hold to speak, live transcript |
| 0:12 | 02 Gemini AI: self-corrections resolved, side remarks ignored, form filled in |
| 0:21 | 03 One tap. Loaned. (confirm + toast) |
| 0:26 | 04 Patient didn't bring it back? We know. (overdue loans) |
| 0:31 | 05 Smart waitlist: queued, returned, next patient notified |
| 0:41 | 06 Every item. Every Location. (roster search and filters) |
| 0:47 | 07 Privacy by design: Ollama mascot pops up and waves |
| 0:52 | Outro and credits |
| 0:58 | Blog plug in the oechsner.dev style: "Read about this on oechsner.dev" |

Colours and fonts come from the app's design system (`App/stitch_nurse_equipment_voice_logger/DESIGN.md`): teal primary `#00685F`, mint `#6DF5E1`, AI indigo `#4648D4`, Plus Jakarta Sans and Inter.

Music: "Wallpaper" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0. The credit appears in the outro and must stay if the video is shared.

Ollama mascot: the first ~4 s of Novra's animation "Ollama, mascot development in Rive" (LinkedIn), shown on a sticker card in scene 7 (`video-src/screens/ollama/`). This is third-party footage, so get permission from Novra (and check Ollama's brand guidelines) before publishing the video publicly.

The end card uses the oechsner.dev design: Playfair Display, DM Sans, `#0e0f12` background and blue/amber glows.

`SCRIPT.md` is the editable scene-by-scene script.

## Presentation (web app)

The video also works as a clickable slide deck in the browser, with the same design and animations. `video-src/index.html` runs as the deck by default (`deck.js`, `deck.css`), and `render.mjs` loads it with `?video` to render the MP4. The deck holds at the 15 stops in `story.js` (`stops`). Each click plays the video on to the next stop, and the phone, background and mascot keep moving while a slide holds. The concept is in `PRESENTATION_CONCEPT.md`.

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

**Hosting on Cloudflare Pages.** `node build-deck.mjs` writes a static site to `video-src/dist/` (about 190 files, 18 MB). It copies only the files the page loads and moves `node_modules` files to `vendor/`. Two ways to deploy:
- **Git integration:** set the root directory to `Marketing/video-src`, the build command to `node build-deck.mjs` and the output directory to `dist`. Cloudflare installs the npm dependencies itself, and `.node-version` selects Node 22.
- **Manual:** `npx wrangler pages deploy dist --project-name quick-equipment-log`.

## How it was made

1. **Real app screens from an Android emulator.** The app ran on an Android 9 (API 28) x86_64 emulator, captured at the full 1080×2400 resolution with the emulator's host-side screenshot command. These captures were taken with a capture-only build of the app (`video-src/capture/capture-build.patch`, never committed to the app):
   - the mic plays a scripted, rambling dictation instead of using real speech recognition, because the emulator has no microphone or recogniser;
   - Gemini calls go to `capture/mock_gemini.py`, a local server that returns a fixed parse (correcting 48291053 to 48291035 and ignoring the broken-cushion remark).

   Everything else on screen is the real app: the UI, the form auto-fill, bookings, waitlist, roster and toasts.
2. **Long pages** were captured over several scrolls and then joined (`capture/stitch.py`), so the video can scroll them smoothly.
3. **3D render.** The phone is built in Three.js (`engine.js`): an extruded aluminium frame, a teal glass back, a camera bar and a punch-hole display. Each frame of the screen is composited on a canvas texture, with spotlight highlights, tap ripples and the word-by-word transcript. `story.js` holds the timeline: phone keyframes, screen clips, highlights and captions. `render.mjs` renders each frame in headless Chromium and pipes the frames to ffmpeg.

## Re-rendering

```bash
cd Marketing/video-src
npm install
node render.mjs promo_silent.mp4 30            # optional: node render.mjs out.mp4 30 <tStart> <tEnd>
node render.mjs --still 15 frame.png           # preview a single frame
curl -o Wallpaper.mp3 https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3
ffmpeg -i Wallpaper.mp3 -t 64 -af "afade=t=in:d=0.2,afade=t=out:st=60:d=4,loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 256k music.m4a
ffmpeg -i promo_silent.mp4 -i music.m4a -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -tune animation -c:a copy -movflags +faststart -shortest ../QuickEquipmentLog_promo.mp4
```

Software rendering takes about 1–3 s per frame. You can run several time ranges in parallel and join them with `ffmpeg -f concat`.
