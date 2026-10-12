---
name: Clinical Flow
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4947'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#4648d4'
  on-tertiary: '#ffffff'
  tertiary-container: '#6063ee'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
  body-xl:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system delivers an ultra-reliable, high-efficiency interface designed for point-of-care mobile nursing workflows. Designed for rapid triage, voice-to-text bedside documentation, and high-stakes clinical decision-making, the aesthetic blends **Modern Clinical Precision** with **Ambient Tactile Safety**.

### Brand Personality & Emotional Impact
- **Decisive & Uncompromising:** Visual hierarchy prioritizes life-critical patient information, vitals, and actionable alerts without visual clutter.
- **Calm & Grounded:** Clean cool grays and deep slates reduce cognitive strain under harsh fluorescent hospital lighting and across extended 12-hour shifts.
- **Empathetic & Responsive:** Ambient glows and distinct pulsating states provide immediate reassurance that AI transcription and clinical inputs are accurately logged.

### Design Style
The system employs a refined modern clinical structure combining:
- **Tonal Layering & Soft Enclosures:** Distinct surface separations ensure patient data cards remain immediately scannable on mobile viewports.
- **Micro-Sensory Signals:** Live recording indicators, voice parsing visualizers, and state badges use high-chroma signals over neutral backgrounds for instant peripheral-vision recognition.
- **High Ergonomic Accessibility:** Every primary action conforms to large, thumb-friendly hit targets (minimum 48×48px) with tactile border definition.

## Colors

The color palette centers on clinical trust, optical safety, and rapid cognitive status-matching:

- **Primary (`#0D9488`) & Primary Light (`#14B8A6`):** Grounded medical teal communicating authority, focus, and hygiene. Used for core navigation bars, primary interactive buttons, and primary active states.
- **Secondary / Ambient Intelligence (`#6366F1`):** Indigo aura reserved exclusively for AI parsing, voice-to-chart transcription active fields, and predictive summary highlights.
- **Urgent Recording (`#EF4444`):** Pure crimson utilized exclusively for active audio streaming and critical patient alerts (e.g., Code Blue or Sepsis warnings).
- **Clinical Semantics:**
  - *Success / Stable:* `#10B981` (Vitals within normal limits, medication verified).
  - *Caution / Warning:* `#F59E0B` (Pending lab results, fall risk flag).
  - *Critical Alert:* `#EF4444` (Contraindication, vital threshold exceeded).
- **Neutrals & Surfaces:**
  - *Base Surface:* `#F8FAFC` (Canvas ground minimizing glare).
  - *Elevated Container / Card:* `#FFFFFF` (Pure white containers for strict visual grouping).
  - *Dividers & Subdued Borders:* `#E2E8F0`.
  - *High-Contrast Text Neutral:* `#0F172A` (98% contrast compliance against white for bright and low-light hospital rooms).
  - *Muted Slate Text:* `#475569` (Secondary descriptors and unit metrics).

## Typography

Typography uses **Plus Jakarta Sans** for prominent headers, room identifiers, and vital metric numbers, paired with **Inter** for dense clinical charting, medication instructions, and field labels.

- **Tabular Numerics:** All numeric values (heart rate, blood pressure, dosage, timestamps) must use tabular figure formatting (`font-feature-settings: "tnum"`) to guarantee alignment in rapid-scanning tables and monitors.
- **High-Density Scaling:** Headings maintain compact line heights to preserve vertical real estate on handheld clinical terminals (such as zebra scanners and mobile phones).
- **Field Contrast:** Labels employ uppercase styling for micro-tags (`label-sm`) with deliberate tracking to distinguish medical acronyms (e.g., NPO, PRN, STAT) from body copy.

## Layout & Spacing

This design system uses a thumb-first, single-column fluid mobile layout optimized for fast handoffs and one-handed use during physical rounds.

### Mobile Grid & Breakpoints
- **Compact Mobile (360px – 430px):** 4-column fluid layout with `margin: 1rem` and `gutter: 0.75rem`. Bottom navigation and emergency trigger zones are anchored within the lower 35% of the screen.
- **Tablet / Clinical Cart Mount (600px – 1024px):** 8-column layout with `margin: 1.5rem` and `gutter: 1rem`. Reflows into a master-detail split (patient list left 40%, active patient flow right 60%).

### Ergonomics & Spacing Principles
- Vertical rhythm enforces an 8pt base grid for element positions, with a 4pt sub-grid for internal component padding.
- Touch zones strictly enforce a minimum clearance of 48×48px. Compact indicators (such as vital tag dots) must expand their tap area via invisible padding to prevent missed interactions while wearing clinical gloves.

## Elevation & Depth

Visual hierarchy uses clean ambient light and subtle borders rather than heavy drop shadows, maintaining readability in bright surgical and clinical lighting.

### Elevation Levels
- **Level 0 (Base Canvas):** `#F8FAFC`, flat.
- **Level 1 (Card & Section Containers):** `#FFFFFF` surface with a crisp 1px stroke (`#E2E8F0`) and an ambient micro-shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Active Sheets / Bedside Drawers):** `#FFFFFF` with `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Alerts & Voice Overlays):** Deep ambient float `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

### Chromatic Lighting & Ambient Glows
- **AI Listening State:** Enclosed inputs feature an active inner aura: `0 0 0 3px rgba(99, 102, 241, 0.20)` alongside a pulsing border `#6366F1`.
- **Active Record Pulse:** The floating voice capture button radiates an outward warning wave: `0 0 0 4px rgba(239, 68, 68, 0.25)` to signal active room audio recording.

## Shapes

The system uses `roundedness: 2` (base radius of 8px / `0.5rem`), striking a balanced balance between clinical rigidity and approachable touch interactions:

- **Patient Cards & Data Panels:** `rounded-lg` (16px / `1rem`) creates soft visual groupings that keep dense clinical charts easy to digest.
- **Form Inputs & Action Buttons:** `rounded` (8px / `0.5rem`) balances maximum internal tap area with distinct touch outlines.
- **Status Tags & Audio Badges:** Fully circular or pill-shaped (`rounded-full`) to immediately differentiate metadata flags from actionable data entry fields.

## Components

### Buttons
- **Primary Clinical Action:** Background `#0D9488`, foreground white, font `label-lg`, min-height 52px. Active feedback shifts background to `#0F766E`.
- **Secondary Action:** White background with 1.5px border `#CBD5E1`, text `#0F172A`.
- **STAT / Emergency Action:** Background `#EF4444`, text white, bold uppercase with tactile inset click state.
- **Floating Dictate Button (FAB):** 60×60px circle anchored bottom-right. When active, shifts to `#EF4444` with a synchronized radial pulse animation.

### Status Badges & Pill Chips
- **Structure:** 6px vertical, 10px horizontal padding, pill radius. Contains an optional 6px circular indicator dot.
- **Stable / Normal:** Background `#ECFDF5`, text `#065F46`, dot `#10B981`.
- **Caution / Warning:** Background `#FEF3C7`, text `#92400E`, dot `#F59E0B`.
- **Critical / STAT:** Background `#FEF2F2`, text `#991B1B`, dot `#EF4444`.
- **AI Auto-Parsed:** Background `#EEF2FF`, text `#3730A3`, dot `#6366F1`.

### Input Fields & Structured Containers
- **Height & Touch Surface:** 50px minimum height with 12px horizontal padding.
- **Border States:** Default 1px `#CBD5E1`. On focus, transitions to 2px `#0D9488` with a 2px teal tint ring.
- **Dictation Input Variant:** Includes a right-aligned microphone icon button (minimum 40×40px tap target). When voice recognition is active, field background shifts to soft `#FAFAFE` with a glowing `#6366F1` stroke.

### Clinical Lists & Patient Vitals Cards
- **Patient Card:** White surface, 16px padding, subtle border `#E2E8F0`. Features a two-line header (Bed number + Patient initials/age), followed by a modular 3-column vitals cluster (HR, BP, SpO2) displaying large `metric-display` values.
- **List Separators:** Light `#F1F5F9` full-width dividers with 12px vertical spacing between active patient units.

### Checkboxes & Segmented Controls
- **Checkboxes:** 24×24px square with 6px border radius, high-contrast checkmark, minimum 48px transparent touch container.
- **Segmented Unit Selectors (e.g., mg vs. mL, Oral vs. IV):** Full-width segmented pill bar with `#F1F5F9` background; active segment elevates with white fill and a crisp `#0F172A` label.