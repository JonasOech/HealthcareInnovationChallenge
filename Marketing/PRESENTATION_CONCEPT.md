# Concept: turning the promo video into a presentation

Goal: a clickable slide deck that looks and moves exactly like `QuickEquipmentLog_promo.mp4`: the 3D phone, the teal wipes, the line-by-line headline reveals, the highlighter marks, the screen spotlights, the Ollama sticker and the oechsner.dev end card. The difference is that the presenter decides when it moves on.

## Core idea: "the video, with pause points"

The video engine renders a frame as a pure function of time. `renderFrame(t)` in `video-src/engine.js` reads everything (phone pose, screen layers, captions, highlights, wipes) from `story.js` for that `t`, and keeps no state between frames. So any moment can be drawn directly, and the engine does not need to play from the start to get there.

That means the deck needs no new slide design. It is the same page and the same engine, plus a small controller:

```
           click              click              click
 [stop 1] ───play──▶ [stop 2] ───play──▶ [stop 3] ───play──▶ …
   hold                hold                hold
 (ambient motion     (ambient motion     (ambient motion
  keeps running)      keeps running)      keeps running)
```

- **Stop**: a story time `t` where everything on screen has finished animating in. The deck holds the frame there while the presenter talks.
- **Beat**: a click plays the timeline from the current stop to the next one at 1× speed. Every transition, scroll, tap ripple and text reveal from the video plays exactly as it does in the video.
- **Back**: jumps straight to the previous stop. This is a free seek, because frames are a pure function of `t`.

### Two clocks, so holds don't freeze

If `t` stops during a hold, the slide becomes a still image, and the floating phone, drifting colour blobs, pulsing mic rings and waving mascot would all freeze. So the engine gets a second clock:

| Clock | Drives | During a hold |
|---|---|---|
| `storyT` | scene state: phone keyframes, screen clips, captions, highlights, wipes | frozen at the stop |
| `ambientT` | phone float/bob, background blobs, mic pulse rings, Gemini spinner frames, Ollama mascot frames (looped), blog glow drift | keeps running (wall clock) |

`renderFrame(t, amb = t)` stays backwards compatible: `render.mjs` passes only `t`, so the MP4 renders exactly as before.

## Slide list (15 stops)

Times are story times in the current `story.js`. "Nudge" marks a stop where a highlight or text exit currently starts fading a little before the best hold point. Those need a ±0.3 s change in `story.js`, which doesn't visibly change the video.

| # | Slide | Click plays | Holds at | On screen during hold | Nudge |
|---|---|---|---|---|---|
| 1 | Title: "Equipment Tracking just got *trivial*" | 0 → 4.4 | 4.4 | phone landed right, dark teal background | – |
| 2 | 01 Voice logging | 4.4 → 10.2 | 10.2 | full transcript highlighted, Gemini spinner loops | transcript reveal ends ~0.3 s earlier; highlight `t1` to 10.4 |
| 3 | 02 Gemini: AI parsed card | → 15.9 | 15.9 | "AI parsed" card spotlit, 2 chips | – |
| 4 | 02 Gemini: form filled | → 20.5 | 20.5 | auto-filled form spotlit, 3 chips | – |
| 5 | 03 One tap. *Loaned.* | → 25.0 | 25.0 | "Logged Successfully" toast spotlit | – |
| 6 | 04 Overdue: *We know.* | → 30.3 | 30.3 | late cushion card in red | – |
| 7 | 05 Waitlist: item is out | → 33.3 | 33.3 | amber "on loan → waitlist" warning | – |
| 8 | 05 Waitlist: queued | → 35.4 | 35.4 | "Added to waitlist" toast, chip 1 | – |
| 9 | 05 Waitlist: the queue | → 38.1 | 38.1 | Waitlist (1) entry spotlit, chip 2 | – |
| 10 | 05 Waitlist: return → notify | → 40.0 | 40.0 | "Next on waitlist … notified" toast, chip 3 | text `t1` +0.3 s |
| 11 | 06 Roster: filter | → 44.4 | 44.4 | Wheelchairs chip spotlit | – |
| 12 | 06 Roster: search | → 46.4 | 46.4 | "cushion" + Late, red spotlight | – |
| 13 | 07 Private *by design* | → 50.6 | 50.6 | Ollama sticker waving (looped) | – |
| 14 | Outro: "…better *patient care.*" | → 56.8 | 56.8 | phone slowly turning, credits | – |
| 15 | End card: oechsner.dev (or "Questions?") | → 61.0 | 61.0 | glows drifting | – |

The longest beat (slide 2, the live dictation) runs for about 6 s. All the others are 2–5 s, which is short enough that the presenter can talk over them.

## Presenter experience

- **Controls:** → / Space / PageDown go to the next stop (PageDown is what most presentation clickers send). ← / PageUp go back. `1`–`9` jump to a slide. `F` toggles fullscreen and `B` blacks out the screen. A click during a beat skips to the end of that beat, like PowerPoint does.
- **URL hash** (`deck.html#7`) deep-links to a slide, for rehearsal or for resuming after a crash.
- **Presenter view** (`deck.html?presenter`, opened in a second window and synced with `BroadcastChannel`): speaker notes, a still of the next slide (rendered at the next stop's `t`), slide number and a timer. The notes come from `SCRIPT.md` and the feature table in `README.md`.
- **Scaling:** the stage stays a fixed 1920×1080 and is scaled with letterboxing to fit any screen. On 4K projectors the WebGL canvas uses `devicePixelRatio` so the phone stays sharp.
- **Progress bar:** the teal bar at the bottom now shows slide progress (stop index / 15) instead of video time.
- **Audio:** music is off by default for a live talk, and `M` turns on the "Wallpaper" track if wanted. The CC BY credit stays on the outro slide either way.

## Implementation sketch

| File | Change |
|---|---|
| `video-src/engine.js` | `renderFrame(t, amb = t)`. Use `amb` for float, blobs, pulse, spinner/mascot frame index (modulo the clip length), blog drift. Skip the 1080×2400 texture upload (`screenTex.needsUpdate`) when no screen layer changed, so holds stay cheap on laptop GPUs. |
| `video-src/story.js` | The few nudges from the table. Export `stops` (`{ t, title, notes }`), so the timeline and the slide breaks live in one file. |
| `video-src/deck.html` | The same markup as `index.html`, plus a scaler wrapper and `deck.js`. |
| `video-src/deck.js` | A two-state machine (`HOLD` ↔ `PLAYING`) driven by `requestAnimationFrame`: while playing, `storyT += dt` until it reaches the next stop; `ambientT += dt` always. Also key handling, the hash, `BroadcastChannel` sync. |
| `render.mjs` | No change. |

Running it: ES modules, the import map and the JSON import need HTTP rather than `file://`, so the command is `npx serve video-src` (or `python3 -m http.server`) and then open `/deck.html`. For the pitch laptop, a `deck/` folder with only the needed files (three.js, four fonts, `screens/` ≈ 17 MB) works fully offline. The same folder can go on GitHub Pages as a backup link.

Estimated effort: about half a day for the deck and controller, plus 1–2 h for the presenter view.

## Fallback: real `.pptx` for whoever insists on PowerPoint

This uses the same stops and reuses `render.mjs <out> 30 <tStart> <tEnd>`:

1. Render one MP4 per beat (stop *n−1* → stop *n*).
2. Generate the deck with `python-pptx`. Each slide is one full-bleed video set to *Start: Automatically* with *Rewind after playing* off, so it ends on and holds the stop frame. The speaker notes come from `stops`.
3. Optional: thanks to the two clocks, also render a 4 s **idle loop** per stop (story time frozen, ambient time running) and play it looped after the beat. Then the PowerPoint version doesn't freeze during holds either.

Trade-offs: the design and animations are pixel-identical (they are the same frames), but the text is baked into the video and can't be edited in PowerPoint, and the file is roughly 100–200 MB. For text edits, change `story.js` and re-render. A **PDF handout** comes for free: `render.mjs --still <t>` at each stop, then join the images into a PDF.

## Optional: pitch-only slides in the same style

A pitch usually needs slides the promo doesn't have: the problem (≈155 items, €4,600/year lost, the Excel tracker), the impact, the HSE deployment story (Power Apps + SharePoint), and the team or the ask. These can be added as extra stops without new design work:

- They use the existing building blocks: kicker pill, line-reveal headline with `<mark>` highlighter, sub, chips. Big numbers count up with the same `easeOut`.
- The phone gets a "parked" keyframe (scaled down and moved to a corner, or flown out) for those stops. Because phone motion is just more `phoneKeys`, it flies back in for the demo part exactly as in the video.
- The natural place is between slide 1 (title) and slide 2 (voice logging): problem → solution → demo.

## Recommendation

Build the **live HTML deck** as the main presentation. It is the only option that keeps the design and the animations *and* stays alive during holds, and it costs little because the engine is already stateless. Generate the `.pptx` and PDF from the same `stops` as backups for the organisers' laptop.
