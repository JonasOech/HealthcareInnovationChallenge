# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a hackathon repo for the **Healthcare Innovation Challenge 2026** (team: Grace, Martin & Jonas), working on **Challenge 2: "Smarter equipment tracking for better patient care"** at Tallaght University Hospital (Dublin, Ireland). There is one demo app so far: an Android mock of the voice equipment logger in `App/android/` (Kotlin + Jetpack Compose; in-memory data only, Gemini API for parsing speech). There are no tests.

## Android demo app (`App/android/`)

- UI mockup it is based on: `App/stitch_nurse_equipment_voice_logger/` (`code.html`, `DESIGN.md`, `screen.png`).
- Toolchain lives outside the repo in `~/.cache/hic-android` (JDK 21, Android SDK 35, Gradle cache). Build:
  `cd App/android && T=~/.cache/hic-android JAVA_HOME=$T/jdk GRADLE_USER_HOME=$T/gradle-home ./gradlew assembleRelease`
  (`local.properties` must point `sdk.dir` at `~/.cache/hic-android/sdk`). The release APK is debug-signed; copy it to `App/android/dist/`.
- `GeminiParser.kt` holds the prompt + JSON schema (raw REST call to Gemini `generateContent` with `responseJsonSchema`; model defaults to `gemini-3.8-flash`, changeable in the Profile tab); `MockData.kt` is the in-memory roster/patients/bookings; `SpeechController.kt` restarts Android's SpeechRecognizer so long, rambling dictation is captured in one transcript, and also holds the "scripted transcript" demo mode (Profile tab: toggle, script text, tempo in words/min) that types a fixed script out instead of listening, for pitching in rooms too loud to dictate in — Gemini parsing is unchanged either way.
- API key is entered in the app's Profile tab (or baked in with `-PgeminiApiKey=...` for a private demo build — never commit/share that APK).

## Presentation website (`Marketing/`)

`Marketing/video-src/` is a Three.js page that is the pitch presentation: `engine.js` draws any storyboard moment (`renderFrame`), `story.js` holds the timeline, `how.js` draws the three deck-only "how it works" slides (HC21 scan, capture → sync → dashboard, synchronized access), `dataflow.js` the deck-only "Data flow" slide right after 07 (phone → TUH server → LLMs → autofill → phone, human in the loop), `money.js` the deck-only business case after it (the "Here comes the money" pot of gold and rainbow, then staff time, money saved, payback; numbers derived in `story.js` from the team's Savings & ROI spreadsheet), and `deck.js` makes it a clickable deck that holds at `story.stops`. `node build-deck.mjs` builds the static site in `dist/`; `worker.js` (deployed with `npx wrangler deploy`) serves it and runs live talks: while the presenter is connected with `?admin=<PRESENTER_KEY>`, viewers can't go past the presenter's slide, and nothing is locked otherwise. See `Marketing/README.md`. `QuickEquipmentLog_promo.mp4` is the finished promo rendered from the same storyboard; the MP4 renderer itself was removed from the repo (recover `video-src/render.mjs` from git history if it is ever needed again).

## Key files

- `Context/Challenge-2.pdf` — the original challenge submission from the hospital's Occupational Therapy (OT) department. This is the source of truth for requirements; its numbered problems (1–9) and goals (1–9) are referenced elsewhere by number. `Context/IMG_*.jpeg` are photos of a printout of the real "Acute Equipment Tracker" spreadsheet (asset no., type, size, serial/HC21/DML numbers, max weight, therapist, patient name, MRN, ward, status, comments, last service, purchased in — with the repair/missing colour coding).

## Problem context (from the challenge brief)

- OT manages ~155 items of specialist seating and manual handling equipment (wheelchairs, pressure cushions, leg rests, headrests, residual limb boards, sliding boards) across 9 categories.
- Tracking today is an Excel "Acute Equipment Tracker" in a shared folder: one tab per category (asset number, barcode, serial number, service info), colour coding for repair/service, short-term loan, or missing, and a separate "waitlist" tab. A separate Winter Initiative equipment pool is tracked in another spreadsheet.
- Core pain points: manual, retrospective updates; slow monthly stock checks by therapy assistants; the waitlist gets bypassed; status is hard to see; about €4,600/year of equipment is lost.
- Scope: the OT department and all inpatient wards, with potential reuse by other departments that share equipment.

## Planned direction (team's working notes)

- Core insight: most items already have barcodes, so the solution should make the record update part of the physical handover (scan to update), not a separate admin task.
- **MVP:** mobile-friendly barcode/QR web app for issue/return/repair/loan plus a status dashboard; a smart waitlist that notifies the next clinician (by clinical priority, then waiting time) when an item becomes available; a public "found it" scan page for non-OT staff; and an import of the existing Excel tracker for realistic demo data.
- **Proposed stack:** React web app, `html5-qrcode` for scanning, Postgres/Supabase or SQLite. Microsoft Power Apps + SharePoint is the "realistic HSE deployment" story for the pitch.
- **Privacy (GDPR):** store only the medical records number (MRN), never patient names, and keep an audit log of who changed what.
