# v0.dev / Google Stitch Generation Prompt
# Vinyl Catalog — Premium Desktop-Grade Web Application

---

## COPY-PASTE PROMPT BELOW

---

Build a **premium dark-mode vinyl record catalog application** using **React**, **Tailwind CSS**, **shadcn/ui**, and **lucide-react** for all icons. No emojis anywhere. This must feel like a native macOS application — not a generic SaaS dashboard.

---

## CRITICAL AESTHETIC RULES

- **Do NOT use**: purple/violet gradients, white backgrounds, Inter font, Roboto font, generic "AI startup" looks, cookie-cutter card grids, flat color fills without depth.
- **DO use**: near-absolute black backgrounds, 1px translucent hairline borders, `backdrop-filter: blur()` on floating surfaces, warm amber-gold as the single dominant accent, generous negative space, sophisticated Geist Sans typography matching Linear.app.
- This is a **collector's tool** — it should feel as premium as the records it catalogs.

---

## TECH STACK

- **Framework**: React 19 + Next.js 15 App Router
- **Styling**: Tailwind CSS v3
- **Components**: shadcn/ui primitives (Command, Dialog, Sheet, Badge, Tooltip, Slider)
- **Icons**: `lucide-react` exclusively — no emoji, no other icon sets
- **Fonts**: Geist Sans (UI text) + Geist Mono (prices, years, catalog numbers, IDs)
- **Animation**: Framer Motion (dock indicator morph, card hover, value ticker, panel slides)

---

## DESIGN TOKENS

Apply these as Tailwind CSS variables and inline styles throughout:

```css
/* Background layers */
--bg-base:        #0A0A0A;   /* near-black canvas */
--bg-sidebar:     #0D0D0D;   /* dock + titlebar surface */
--bg-surface:     #141414;   /* main content area */
--bg-card:        #1A1A1A;   /* elevated card background */
--bg-card-hover:  #1F1F1F;   /* card hover state */

/* Borders */
--border-subtle:  rgba(255, 255, 255, 0.06);   /* default hairline */
--border-focus:   rgba(255, 255, 255, 0.14);   /* focused/active */

/* Text */
--text-primary:   #F0EFEB;   /* warm off-white — never pure #FFFFFF */
--text-secondary: #6B6B6B;   /* muted labels, secondary info */
--text-tertiary:  #3A3A3A;   /* placeholders, disabled */

/* Accent — warm amber-gold */
--accent:         #E8A030;
--accent-dim:     rgba(232, 160, 48, 0.12);
--accent-glow:    rgba(232, 160, 48, 0.06);

/* Liquid glass (dock, panels, search modal) */
--glass-bg:       rgba(12, 12, 12, 0.72);
--glass-blur:     blur(24px) saturate(180%);
--glass-border:   1px solid rgba(255, 255, 255, 0.08);
--glass-shadow:   0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);

/* Radii */
--radius-card:    6px;
--radius-input:   4px;
--radius-badge:   2px;
--radius-dock:    18px;
--radius-btn:     8px;

/* Easing */
--ease-expo-out:  cubic-bezier(0.16, 1, 0.3, 1);
```

---

## APPLICATION SHELL LAYOUT

The app has **three persistent shell regions** that never unmount, and one **swappable content area**:

```
┌──────────────────────────────────────────────────────────────┐
│  TITLEBAR  (h=40px, bg=#0D0D0D, Electron drag region)        │
│  [breadcrumb/title]          [⌘K search button]  [density]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  STATS STRIP  (collapsible, ~100px)                          │
│  [Total Value]  [Record Count]  [Top Genre]  [Top Format]    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MAIN CONTENT AREA  (flex-grow, scrollable)                  │
│  — swaps between: Collection / Analytics / Settings /        │
│    Account / Scan (desktop-gated)                            │
│                                           ┌──────────────────┤
│                                           │  DETAIL PANEL    │
│                                           │  (320px slide-in)│
│                                           └──────────────────┤
│                                                              │
│           ┌──────────────────────────┐                       │
│           │     BOTTOM DOCK          │  fixed, centered      │
│           └──────────────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

---

## ZONE 1: TITLEBAR

- `height: 40px`, `background: #0D0D0D`, `border-bottom: 1px solid rgba(255,255,255,0.05)`
- On Electron desktop: apply `style={{ WebkitAppRegion: 'drag' }}` to the bar; all interactive children must have `WebkitAppRegion: 'no-drag'`
- **Left**: Page title — Geist Sans, 13px, `#6B6B6B`, e.g. "Collection" or "Settings"
- **Right**:
  - Search trigger button — `⌘K` label + `Search` icon (16px) — liquid glass treatment (see button spec below), opens the search modal
  - Density slider icon (`LayoutGrid` icon) — opens a popover with a range input controlling `--card-size` CSS variable (`160px` to `280px`)
- No user avatar in the titlebar — it lives in the dock

---

## ZONE 2: STATS STRIP

- `height: 96px` expanded / `0px` collapsed (CSS transition `height 240ms var(--ease-expo-out)`)
- Toggle collapse via a `ChevronUp` / `ChevronDown` button on the right edge
- State persisted to `localStorage`
- Contains **4 metric cards** in a horizontal row (`display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 12px 24px`)

**Metric Card spec:**
- `background: #1A1A1A`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`, `padding: 14px 18px`
- Label: Geist Sans 11px uppercase, `letter-spacing: 0.08em`, `#3A3A3A`
- Value: Geist Mono 24px, `#F0EFEB` (or `#E8A030` for Total Value specifically)
- **On mount**: values animate from `0` to their final number using a spring-eased counter (Framer Motion `useSpring` or `useMotionValue` with `animate`), duration ~600ms

Mock data for the stats strip:
```
Total Value:   $4,287.50  (color: #E8A030)
Records:       47
Top Genre:     Jazz
Top Format:    LP
```

---

## ZONE 3: BOTTOM DOCK

This is the **primary navigation**. It replaces the sidebar entirely.

**Container:**
```css
position: fixed;
bottom: 20px;
left: 50%;
transform: translateX(-50%);
border-radius: 18px;
padding: 8px 12px;
display: flex;
align-items: center;
gap: 4px;
background: rgba(12, 12, 12, 0.72);
backdrop-filter: blur(24px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
z-index: 100;
```

**Dock items (left to right):**
1. `Disc` — Collection (default active)
2. `Camera` — Scan *(conditionally rendered: only visible when `window.__ELECTRON__` or `window.__TAURI__` is defined — use a prop `isDesktop: boolean`)*
3. `BarChart3` — Analytics
4. `1px × 28px` vertical divider `rgba(255,255,255,0.08)` ← separator
5. `SlidersHorizontal` — Settings
6. `Avatar` — 28px circular user avatar image (src: mock `https://i.pravatar.cc/28?u=gsaraiva`), `border-radius: 50%`, `border: 1px solid rgba(255,255,255,0.12)`

**Each dock icon button:**
- `48px × 48px`, `border-radius: 12px`
- Icon: `lucide-react`, `20px`, color `#6B6B6B` default, `#F0EFEB` when active
- Resting state: transparent background
- **Hover — Liquid Glass:**
  ```css
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  transform: scale(1.08) translateY(-2px);
  transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
  ```
  The `inset 0 1px 0 rgba(255,255,255,0.15)` top highlight is the glass refraction effect.

**Active Indicator (the stretch animation):**
- A `2px × 20px` amber pill (`background: #E8A030`, `border-radius: 2px`) rendered as a single `<motion.div layoutId="dock-indicator">` positioned **above** the active item (at the top-inner edge of the dock pill)
- When the active item changes, Framer Motion's layout animation morphs the indicator — it **stretches** horizontally to span the distance between origin and destination, then contracts to the new target size
- Transition: `{ type: 'spring', stiffness: 500, damping: 42 }` — this approximates expo-out and produces the elastic stretch
- The indicator sits at `top: 4px` inside the dock container, positioned via `x` offset matching the active button's center

**Tooltip on each dock item:**
- shadcn `Tooltip` with `side="top"`, `sideOffset={8}`
- Label text: Geist Sans, 12px, `#F0EFEB`
- Tooltip bg: `#1A1A1A`, `border: 1px solid rgba(255,255,255,0.08)`

---

## ZONE 4: MAIN VINYL GRID (Collection View — Default)

**Grid container:**
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(var(--card-size, 200px), 1fr));
gap: 16px;
padding: 24px 24px 120px 24px; /* bottom padding clears the dock */
```

**VinylCard spec:**
- `background: #1A1A1A`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`, `overflow: hidden`
- **Cover image**: square, `width: 100%`, `aspect-ratio: 1`, `object-fit: cover`
- **Bottom info strip**: `padding: 10px 12px 12px`, flex column
  - Title: Geist Sans 13px semibold, `#F0EFEB`, single line, `text-overflow: ellipsis`
  - Artist: Geist Sans 12px, `#6B6B6B`
  - Bottom row: `ConditionBadge` (left) + price in Geist Mono 12px `#E8A030` (right)

**ConditionBadge spec:**
- `border-radius: 2px`, `padding: 2px 5px`, Geist Mono 10px, uppercase
- Color map:
  - M/NM: `background: rgba(34,197,94,0.12)`, `color: #4ade80`, `border: 1px solid rgba(34,197,94,0.2)`
  - VG+/VG: `background: rgba(234,179,8,0.12)`, `color: #facc15`, `border: 1px solid rgba(234,179,8,0.2)`
  - G+/G/F/P: `background: rgba(239,68,68,0.12)`, `color: #f87171`, `border: 1px solid rgba(239,68,68,0.2)`

**Card hover micro-interaction — Kinetic Shelf Effect:**
On hover:
```css
transform: translateY(-3px) rotate(1.5deg);
box-shadow: -6px 8px 24px rgba(0,0,0,0.5);
transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
```
Additionally, a dark `::after` pseudo-element shaped as a vinyl record disc peeks out from the right edge of the card (12px visible, `border-radius: 50%`, `background: #0A0A0A`, `border: 1px solid rgba(255,255,255,0.08)`, `transition: transform 200ms`). On hover it shifts `translateX(8px)` further right — the physical sensation of pulling a record off a shelf.

**Click behavior:**
Clicking a card opens the Detail Panel (right slide-in). The card does not navigate to a new page.

**Mock vinyl records data:**
```js
const mockVinyls = [
  {
    id: 1,
    title: "Kind of Blue",
    artist: "Miles Davis",
    year: 1959,
    label: "Columbia",
    genre: "Jazz",
    format: "LP",
    condition: "NM",
    currentValue: 48.00,
    coverImageUrl: "https://picsum.photos/seed/miles/400/400",
    addedBy: "Gustavo",
    addedByAvatar: "https://i.pravatar.cc/24?u=gsaraiva"
  },
  {
    id: 2,
    title: "Rumours",
    artist: "Fleetwood Mac",
    year: 1977,
    label: "Warner Bros.",
    genre: "Rock",
    format: "LP",
    condition: "VG+",
    currentValue: 32.50,
    coverImageUrl: "https://picsum.photos/seed/rumours/400/400",
    addedBy: "Dad",
    addedByAvatar: "https://i.pravatar.cc/24?u=dad"
  },
  {
    id: 3,
    title: "Purple Rain",
    artist: "Prince",
    year: 1984,
    label: "Warner Bros.",
    genre: "Funk/Soul",
    format: "LP",
    condition: "NM",
    currentValue: 65.00,
    coverImageUrl: "https://picsum.photos/seed/prince/400/400",
    addedBy: "Gustavo",
    addedByAvatar: "https://i.pravatar.cc/24?u=gsaraiva"
  },
  {
    id: 4,
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    year: 1973,
    label: "Harvest",
    genre: "Rock",
    format: "LP",
    condition: "VG",
    currentValue: 42.00,
    coverImageUrl: "https://picsum.photos/seed/pinkfloyd/400/400",
    addedBy: "Dad",
    addedByAvatar: "https://i.pravatar.cc/24?u=dad"
  },
  {
    id: 5,
    title: "Blue Train",
    artist: "John Coltrane",
    year: 1957,
    label: "Blue Note",
    genre: "Jazz",
    format: "LP",
    condition: "G+",
    currentValue: 28.50,
    coverImageUrl: "https://picsum.photos/seed/coltrane/400/400",
    addedBy: "Gustavo",
    addedByAvatar: "https://i.pravatar.cc/24?u=gsaraiva"
  },
  {
    id: 6,
    title: "Thriller",
    artist: "Michael Jackson",
    year: 1982,
    label: "Epic",
    genre: "Pop",
    format: "LP",
    condition: "NM",
    currentValue: 55.00,
    coverImageUrl: "https://picsum.photos/seed/thriller/400/400",
    addedBy: "Dad",
    addedByAvatar: "https://i.pravatar.cc/24?u=dad"
  },
  {
    id: 7,
    title: "Nevermind",
    artist: "Nirvana",
    year: 1991,
    label: "DGC",
    genre: "Rock",
    format: "LP",
    condition: "VG+",
    currentValue: 38.00,
    coverImageUrl: "https://picsum.photos/seed/nirvana/400/400",
    addedBy: "Gustavo",
    addedByAvatar: "https://i.pravatar.cc/24?u=gsaraiva"
  },
  {
    id: 8,
    title: "Head Hunters",
    artist: "Herbie Hancock",
    year: 1973,
    label: "Columbia",
    genre: "Jazz/Funk",
    format: "LP",
    condition: "VG+",
    currentValue: 44.50,
    coverImageUrl: "https://picsum.photos/seed/herbie/400/400",
    addedBy: "Dad",
    addedByAvatar: "https://i.pravatar.cc/24?u=dad"
  }
]
```

---

## ZONE 5: DETAIL PANEL (Right Slide-in)

Slides in from the right over the grid when a vinyl card is clicked.

**Container:**
```css
position: fixed;
top: 40px; /* below titlebar */
right: 0;
bottom: 0;
width: 320px;
background: rgba(14, 14, 14, 0.88);
backdrop-filter: blur(20px) saturate(160%);
border-left: 1px solid rgba(255, 255, 255, 0.06);
transform: translateX(100%); /* closed */
transform: translateX(0);    /* open */
transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
z-index: 50;
padding-bottom: 96px; /* dock clearance */
overflow-y: auto;
```

**Panel content (top to bottom):**
1. `X` close button — top-right, `16px`, `#6B6B6B`, hover `#F0EFEB`
2. Cover image — full width, `aspect-ratio: 1`, `object-fit: cover`
3. Info section — `padding: 16px`:
   - Title: Geist Sans 16px semibold, `#F0EFEB`
   - Artist: Geist Sans 13px, `#6B6B6B`
   - Row: Year (Geist Mono 12px `#3A3A3A`) + Label badge (`background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.08)`, 11px, `#6B6B6B`) + Format badge (same style)
4. Divider `1px rgba(255,255,255,0.05)`
5. Condition + Price row:
   - `ConditionBadge` (left)
   - Price: Geist Mono 18px `#E8A030` (right), with sub-label "Updated 2h ago" in 10px `#3A3A3A`
6. Divider
7. "Added by" row: avatar (20px circle) + name (12px `#6B6B6B`)
8. Notes textarea: `background: transparent`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 4px`, Geist Sans 12px, `#6B6B6B`, placeholder "No notes..."
9. Action buttons row (bottom):
   - `Edit` button — liquid glass primary
   - `ExternalLink` (Discogs) — liquid glass secondary
   - `Trash2` — `rgba(239,68,68,0.08)` bg, `color: #f87171`, hover `rgba(239,68,68,0.14)`

---

## ZONE 6: SEARCH MODAL (Finder/Spotlight Style)

Triggered by `⌘K` or the titlebar search button.

**Overlay:** `position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 200`

**Modal panel:**
```css
position: fixed;
top: 15vh;
left: 50%;
transform: translateX(-50%);
width: 680px;
max-height: 480px;
background: #161616;
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.04);
overflow: hidden;
display: flex;
flex-direction: column;
```

**Internal layout — two columns:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Search icon 16px]  Search your collection...              │  ← input row, h=52px
│─────────────────────────────────────────────────────────────│  ← 1px divider
│  LEFT RESULTS (flex-grow)      │  RIGHT PREVIEW (280px)     │
│                                │                            │
│  Records                       │  [Cover art 120×120px]     │
│  › Kind of Blue                │  Kind of Blue              │
│  › Rumours            ←active  │  Miles Davis · 1959        │
│  › Purple Rain                 │  ─────────────             │
│                                │  NM · $48.00               │
│  Actions                       │  Jazz · LP                 │
│  › Add new record              │  Columbia                  │
│  › Refresh prices              │                            │
│  › Open Settings               │                            │
│─────────────────────────────────────────────────────────────│
│  ↑↓ navigate   ↵ open   esc close          ⌘K               │  ← footer hint bar
└─────────────────────────────────────────────────────────────┘
```

**Search input row:**
- `height: 52px`, `padding: 0 16px`, `display: flex; align-items: center; gap: 10px`
- `Search` icon: 16px, `#3A3A3A`
- Input: `flex-grow`, `background: transparent`, `border: none`, `outline: none`, Geist Sans 15px, `#F0EFEB`, placeholder color `#3A3A3A`

**Left results pane:**
- `min-width: 0; flex: 1; overflow-y: auto; padding: 8px 0`
- Section label: `padding: 6px 16px`, Geist Sans 11px uppercase `letter-spacing: 0.08em`, `#3A3A3A`
- Result row: `height: 40px; padding: 0 12px 0 16px; display: flex; align-items: center; gap: 10px; cursor: pointer`
  - `ChevronRight` icon 16px `#3A3A3A` left edge
  - Label: Geist Sans 13px `#F0EFEB`
  - Secondary label (artist for records): Geist Sans 12px `#6B6B6B`, pushed right
- **Active row**: `background: rgba(232,160,48,0.10)`, left border 2px `#E8A030`, `ChevronRight` color `#E8A030`

**Right preview pane:**
- `width: 280px; border-left: 1px solid rgba(255,255,255,0.05); padding: 20px; display: flex; flex-direction: column; gap: 12px`
- Cover: `width: 120px; height: 120px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.06)`
- Title: Geist Sans 14px semibold `#F0EFEB`
- Artist · Year: Geist Sans 12px `#6B6B6B`
- Divider 1px
- Condition badge + Price (Geist Mono 16px `#E8A030`)
- Genre · Format · Label: Geist Sans 11px `#3A3A3A`
- When no result highlighted: centered `Search` icon 32px `#1F1F1F` with "Select a record to preview" label `#3A3A3A`

**Footer hint bar:**
- `height: 32px; border-top: 1px solid rgba(255,255,255,0.05); padding: 0 16px; display: flex; align-items: center; gap: 16px`
- Keyboard hint chips: `background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 6px; font-family: Geist Mono; font-size: 11px; color: #3A3A3A`
- Built on shadcn `Command` primitive for keyboard navigation

---

## LIQUID GLASS BUTTON SYSTEM

Apply this treatment to all primary action buttons and the titlebar search trigger:

```css
/* Base liquid glass button */
.btn-glass {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12),  /* top glass highlight */
              0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  color: #F0EFEB;
  font-family: 'Geist Sans', sans-serif;
  font-size: 13px;
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18),
              0 4px 16px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}

/* Accent variant (primary CTA) */
.btn-glass-accent {
  background: rgba(232, 160, 48, 0.14);
  border-color: rgba(232, 160, 48, 0.25);
  color: #E8A030;
  box-shadow: inset 0 1px 0 rgba(232, 160, 48, 0.2),
              0 2px 12px rgba(232, 160, 48, 0.1);
}

.btn-glass-accent:hover {
  background: rgba(232, 160, 48, 0.20);
  box-shadow: inset 0 1px 0 rgba(232, 160, 48, 0.28),
              0 4px 20px rgba(232, 160, 48, 0.15);
}
```

---

## PAGES / VIEWS (Content Area States)

### Collection View (default)
Stats strip + full vinyl grid. Density slider in titlebar controls card size.

### Analytics View
Replace the grid with a stats dashboard:
- Top row: 4 expanded metric cards (same as stats strip but taller, with sparkline charts)
- Genre breakdown: horizontal bar chart (custom CSS bars, amber fill, dark bg)
- Format breakdown: donut-style segments using SVG
- Recent additions: small list of last 5 records with avatar of who added them
- All numbers: Geist Mono, amber accent for monetary values

### Settings View
Vertical sections with `SectionHeader` (Geist Sans 11px uppercase `#3A3A3A`, `letter-spacing: 0.08em`) and cards:
- **Recognition**: toggle for OCR enabled, confidence threshold slider (`accent: #E8A030`)
- **LLM Provider**: segmented control (Local / OpenAI / Gemini / Hybrid)
- **API Keys**: masked inputs with `Eye`/`EyeOff` toggle, liquid glass button to save
- **Discogs**: token input, "Refresh Prices Now" button (accent glass variant), last refresh timestamp
- All inputs: `background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: #F0EFEB; font-family: Geist Sans; font-size: 13px`

### Account View
- Centered content, max-width 400px
- User avatar: 72px circle, `border: 2px solid rgba(232,160,48,0.3)`
- Display name: Geist Sans 18px semibold
- Email: 13px `#6B6B6B`
- Session info: Geist Mono 11px `#3A3A3A` ("Authenticated via Authentik · Session expires in 23h")
- "Sign Out" button: danger glass variant

### Scan View (Desktop-Gated — `isDesktop === true` only)
Full-screen bottom sheet that slides up from the bottom:
- 3-step progress rail at top: `Capture` → `Recognizing` → `Confirm Match`
- Active step: amber dot + label; completed: `CheckCircle2` amber; pending: muted
- **Step 1 (Capture)**: Live camera feed fills the area, `border-radius: 6px`. Large circular capture button at bottom center — liquid glass with amber glow on hover.
- **Step 2 (Recognizing)**: Camera frame freezes, amber pulsing ring animation overlaid, "Analyzing cover..." label in Geist Mono
- **Step 3 (Confirm)**: Side-by-side: raw capture (left, desaturated) → Discogs metadata card (right, full color). Framer Motion 3D card flip on the right card (rotateY 0→180→0) to reveal the result. Confirm button (accent glass) + "Try Again" (neutral glass) + search input to refine manually.

---

## RESPONSIVE BEHAVIOR (Web vs Desktop)

The same component tree handles both. Use a prop `isDesktop: boolean` (set via `typeof window !== 'undefined' && !!window.__ELECTRON__`):

| Element | Web (browser) | Desktop (Electron) |
|---|---|---|
| Titlebar | `position: sticky; top: 0` | `WebkitAppRegion: drag` applied |
| Scan dock item | `display: none` | Visible |
| Window border-radius | 0 (browser clips) | `12px` on `<html>` (frameless window) |
| Dock `bottom` offset | `20px` | `20px` (same — Electron frameless) |
| Keyboard shortcuts | Standard `keydown` | Electron passes `⌘K` through to renderer |

No separate layouts. The dock does not scroll. Content area only scrolls.

---

## COMPONENT LIST TO GENERATE

Generate all of the following as separate named components:

1. `AppShell` — Shell wrapper with titlebar, stats strip, content area, dock
2. `Titlebar` — With drag region awareness, search button, density control
3. `StatsStrip` — 4 animated metric cards, collapsible
4. `MetricCard` — Individual stat card with spring-animated counter
5. `BottomDock` — Floating pill nav with liquid glass, animated indicator
6. `DockItem` — Individual icon button with liquid glass hover
7. `VinylGrid` — CSS grid with density variable
8. `VinylCard` — Card with kinetic shelf hover and vinyl disc peek effect
9. `ConditionBadge` — Color-coded condition indicator
10. `DetailPanel` — Right-side slide-in with full record detail
11. `SearchModal` — Spotlight/Finder two-column modal with preview pane
12. `SearchResultRow` — Individual row in the search results list
13. `LiquidGlassButton` — Base glass button with accent variant
14. `AnalyticsView` — Stats dashboard with charts
15. `SettingsView` — Settings page with all sections
16. `AccountView` — User profile panel
17. `ScanView` — Desktop-gated 3-step scan sheet (render as `isDesktop: true` for preview)

---

## FINAL AESTHETIC REMINDER TO THE UI GENERATOR

- The background is `#0A0A0A`. Never use white or light grays as a base.
- The accent `#E8A030` should appear sparingly: active states, prices, the collection value, the dock indicator. Not everywhere.
- Typography hierarchy: 16px+ for display, 13px for body, 11px for labels — nothing below 10px.
- Every floating surface (dock, detail panel, search modal) uses `backdrop-filter`. This is non-negotiable.
- Spacing is generous. Cards have breathing room. The grid is not cramped.
- This is not a fintech dashboard. It is a vinyl collector's personal archive. The mood is: a beautifully lit record room at midnight.
