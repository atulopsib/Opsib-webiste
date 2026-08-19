# OPSIB — Design Approach
**Version:** 1.0 · **Date:** 2026-08-19

This document defines the complete design system to be implemented consistently across the entire OPSIB website, resolving every issue identified in DESIGN_AUDIT.md.

---

## 1. Global Design Principles

**P1 — Precision over decoration.**
Every spacing value, font size, and color is intentional and documented. Nothing is approximate.

**P2 — Grid discipline is non-negotiable.**
All content aligns to a single container width. Vertical reading lines are consistent across all sections.

**P3 — Typography is the design.**
The entire visual hierarchy is expressed through type size, weight, and spacing. No decorative elements compensate for weak type decisions.

**P4 — One visual language, not many.**
Border-radius, button style, and transition behavior follow a single defined vocabulary. No ad-hoc deviations.

**P5 — Context before content.**
Every section begins with an orientation element (eyebrow or section label) before the primary content.

**P6 — Enterprise restraint.**
Dark mode = navy, not black. Light mode = warm off-white, not pure white. Motion = subtle, one-directional, spring-eased. No gradients, no glows, no unnecessary decoration.

---

## 2. Grid System

### Container

All content sections use a single container system:

```
--container-max: 1200px
--px: clamp(24px, 5.5vw, 80px)

Implementation:
  .section-container {
    max-width: var(--container-max);
    width: 100%;
    margin: 0 auto;
    padding-left: var(--px);
    padding-right: var(--px);
  }
```

The hero nav wrapper already uses min(88%, 1200px). All other sections will align to 1200px.

### Column Grid

Internal layouts use a 12-column grid:

```
display: grid;
grid-template-columns: repeat(12, 1fr);
column-gap: 32px;
```

Standard column allocations:
- Eyebrow label: col 1-3 (span 3)
- Primary headline: col 4-12 (span 9)
- 50/50 split: col 1-6 / col 7-12
- Full width: col 1-12

### Breakpoints

```
--bp-xl: 1280px   /* Large desktop */
--bp-lg: 1024px   /* Desktop */
--bp-md: 860px    /* Tablet landscape */
--bp-sm: 640px    /* Tablet portrait */
--bp-xs: 480px    /* Mobile */
```

---

## 3. Section Spacing System

A unified vertical rhythm token governs all section padding:

```
--section-pad-lg: clamp(80px, 10vw, 140px);   /* Flagship sections */
--section-pad-md: clamp(64px, 8vw, 108px);    /* Standard sections */
--section-pad-sm: clamp(48px, 6vw, 80px);     /* Compact sections */
```

Section assignments:
- Hero: full viewport (unchanged)
- Section 2 (Retail Statement): --section-pad-md top and bottom
- Section 3 (Video): --section-pad-md top and bottom
- Section 4 (Mission): --section-pad-md (image panel is full height)
- Footer: --section-pad-md top, --section-pad-sm bottom

Inner-section vertical spacing:
- Eyebrow to headline gap: 20px (not the column gap)
- Headline to body: 28px
- Body to CTA: 36px

---

## 4. Typography System

### Typeface

**Jost** (Google Fonts, variable weight 100-900) — used exclusively across all elements.
No second font family. No fallback decorative fonts.

Import: `family=Jost:ital,wght@0,100..900;1,100..900`

### Type Scale (desktop reference at 1440px viewport)

| Role | Token | Size | Weight | Tracking | Transform | Line-height |
|---|---|---|---|---|---|---|
| Display H1 | `--t-h1` | clamp(38px, 5vw, 72px) | 300 | 0.005em | uppercase | 1.02 |
| Heading H2 | `--t-h2` | clamp(32px, 4.2vw, 56px) | 500 | -0.02em | none | 1.18 |
| Heading H3 | `--t-h3` | clamp(18px, 2vw, 26px) | 500 | -0.01em | none | 1.28 |
| Body Large | `--t-body-lg` | clamp(15px, 1.2vw, 17px) | 400 | 0.005em | none | 1.68 |
| Body | `--t-body` | clamp(13px, 1vw, 15px) | 400 | 0.01em | none | 1.65 |
| Eyebrow | `--t-eyebrow` | 11px | 600 | 0.22em | uppercase | 1.4 |
| Label | `--t-label` | 10px | 600 | 0.16em | uppercase | 1.4 |
| Button | `--t-btn` | 11px | 600 | 0.12em | uppercase | 1 |
| Footer title | `--t-footer-title` | 10px | 700 | 0.20em | uppercase | 1.4 |
| Footer link | `--t-footer-link` | 13px | 400 | 0.01em | none | 1.5 |
| Meta/Decorative | `--t-meta` | 9px | 500 | 0.18em | uppercase | 1 |
| Legal | `--t-legal` | 11px | 400 | 0.04em | none | 1.5 |

### Rules

- H1 is used ONLY in the hero section
- H2 is used in Section 2 and Mission — both use weight 500 at the same scale
- Eyebrow (11px, weight 600, 0.22em tracking, uppercase) appears at the top of every section that has a label
- No inline font-size or font-weight overrides — always use a token class or element
- Italic is allowed ONLY in the contact panel headline (cp-headline em)

---

## 5. Color System

### Complete Token Set

```css
:root {
  /* === DARK SURFACE === */
  --color-dark-bg:       #04060f;    /* Hero, video backgrounds */
  --color-dark-surface:  #080b17;    /* Dark cards, panels */
  --color-dark-footer:   #06080f;    /* Footer background */
  --color-dark-border:   rgba(255,255,255,0.10);
  --color-dark-border-dim: rgba(255,255,255,0.05);
  --color-dark-grid:     rgba(255,255,255,0.035);
  --color-dark-grid-strong: rgba(255,255,255,0.07);

  /* === DARK TEXT === */
  --color-white:         #ffffff;
  --color-dark-text:     rgba(255,255,255,0.90);
  --color-dark-mid:      rgba(255,255,255,0.55);
  --color-dark-dim:      rgba(255,255,255,0.30);
  --color-dark-meta:     rgba(255,255,255,0.20);

  /* === LIGHT SURFACE === */
  --color-light-bg:      #f6f6f3;    /* Section 2 background */
  --color-light-mid-bg:  #ebedf2;    /* Section 3 background (was hardcoded) */
  --color-light-surface: #ffffff;    /* Mission, Contact panel */

  /* === LIGHT TEXT === */
  --color-light-text:    #0a0a0a;    /* Primary text on light */
  --color-light-mid:     #3a3a3a;    /* Secondary text on light */
  --color-light-dim:     #888888;    /* Tertiary / eyebrow on light */
  --color-light-body:    #555555;    /* Body copy on light (was hardcoded) */
  --color-light-border:  rgba(0,0,0,0.08);

  /* === SEMANTIC ALIASES (backward compat) === */
  --bg:           var(--color-dark-bg);
  --light-bg:     var(--color-light-bg);
  --light-text:   var(--color-light-text);
  --light-dim:    var(--color-light-dim);
  --light-border: var(--color-light-border);
}
```

### Usage Rules

- Dark hero section, footer, video background: `--color-dark-bg`
- Section 2 (warm off-white): `--color-light-bg`
- Section 3 (cool gray): `--color-light-mid-bg`
- Mission, contact panel: `--color-light-surface`
- Footer: `--color-dark-footer`
- Never use raw hex values in component CSS — always reference a token

---

## 6. Border Radius System

Three values only:

```css
--radius-pill: 100px;   /* Navigation pill, nav CTA button */
--radius-card: 16px;    /* Video container, cards, panels */
--radius-sm:   4px;     /* Buttons (non-pill), inputs, status boxes */
```

Application map:
- `.hero-nav` / `.nav-cta`: `--radius-pill`
- `.how-video-wrap`: `--radius-card`
- `.cta-primary` / `.mission-cta` / `.cp-submit` / `.cp-close`: `--radius-sm`
- `.cp-textarea` / `.cp-status`: `--radius-sm`

---

## 7. Button System

Three button types only. All share these base properties:
- Font: Jost, 11px, weight 600, letter-spacing 0.12em, uppercase
- Cursor: pointer
- Transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1)

### Type A — Nav Glass (dark section, pill)
```
background: rgba(255,255,255,0.06)
border: 1px solid rgba(255,255,255,0.20)
color: #ffffff
border-radius: --radius-pill
padding: 10px 22px

Hover: background #ffffff, color #04060f, border-color #ffffff
```

### Type B — Outlined (dark or light section)
```
background: transparent
border: 1px solid currentColor (opacity 0.28 on dark / 0.22 on light)
color: inherits from context
border-radius: --radius-sm
padding: 11px 24px

Dark hover: border-opacity 0.60, background rgba(255,255,255,0.08)
Light hover: border-color --color-light-text, background --color-light-text, color white
```

### Type C — Solid Filled (form submit)
```
background: --color-light-text (#0a0a0a)
border: 1px solid --color-light-text
color: #ffffff
border-radius: --radius-sm
padding: 13px 28px

Hover: background #2a2a2a
```

---

## 8. Image Treatment

### Mission Image
- `object-fit: cover; object-position: center`
- Hover: `transform: scale(1.03)` on the image (parent hover triggers)
- Mobile: `min-height: 280px` (not fixed height)
- No filter effects beyond subtle `brightness(0.96) contrast(1.04)`

### Logo (nav)
- Height: 38px (reduced from 68px to fit pill nav)
- Footer logo: 42px (slightly larger for the wider column)
- Both: `object-fit: contain; width: auto`

---

## 9. Video Treatment

### Section 3 Video Container
- Background: `--color-light-mid-bg` (#ebedf2)
- Container: `.section-container` max-width 1200px
- Video wrapper: `border-radius: --radius-card (16px)`, NOT 28px
- Video: `width: 100%; height: auto; object-fit: contain`
- Shadow: `0 24px 48px -12px rgba(4,6,15,0.20)`
- NO hover translateY lift
- Editorial framing: eyebrow label above the video wrapper

---

## 10. Header and Navigation Rules

### Structure
- `.hero-nav-wrapper`: `position: absolute; top: 24px; left: 50%; transform: translateX(-50%); width: min(88%, 1200px); z-index: 20`
- `.hero-nav`: pill glassmorphism, `border-radius: --radius-pill`
- Contents: Logo (left) | CTA button (right)

### Logo in Nav
- Height: `38px` — fits within the pill without stretching
- Hover: `transform: scale(1.03)` with 0.3s spring ease

### Nav CTA
- Type A button (Nav Glass)
- Text: "Get Started ↗" — unchanged

### Scroll Behavior
- Background darkens to `rgba(4, 6, 15, 0.90)` at 60px scroll — keep

---

## 11. Section Transition Rules

Replace mechanical `border-top: 1px solid` between sections with:

1. **Dark to Light (Hero → Section 2):**
   No visible border. Use `padding-top` of Section 2 as the only transition. The background color change is the transition signal.

2. **Light to Light-Mid (Section 2 → Section 3):**
   1px border at `rgba(0,0,0,0.06)` — very subtle. Or use a 1px gradient fade.

3. **Light-Mid to White (Section 3 → Mission):**
   1px border at `rgba(0,0,0,0.06)`.

4. **White to Dark (Mission → Footer):**
   1px border at `rgba(255,255,255,0.06)`.

General rule: borders between same-family sections (light → light) are 0.06 opacity. Borders between dark → light sections are removed — the background change is sufficient.

---

## 12. Footer Rules

### Layout
- Grid: `1.8fr 1fr 1fr 1fr 1fr` (unchanged)
- Max-width governed by `--px` padding (not a container wrapper)
- Background: `--color-dark-footer` (#06080f)

### Logo
- Height: 42px (consistent with brand column width)

### Typography
- Column title: 10px, weight 700, letter-spacing 0.20em, uppercase — tokenised as `--t-footer-title`
- Link: 13px, weight 400 — tokenised as `--t-footer-link`
- Address/tagline: 11px (raised from 9.5px for legibility)

### Footer link hover
- Remove `translateX(3px)` — replace with opacity change: `opacity: 1` (from 0.48)
- No horizontal movement to avoid layout shift

---

## 13. Responsive Behavior

### Breakpoint Strategy

All sections are designed desktop-first with mobile overrides.

**At 860px (tablet):**
- Section 2 grid collapses to single column (already implemented)
- Eyebrow appears above headline (stacked)
- Nav: logo left, CTA right — pill shrinks but remains functional

**At 640px (tablet portrait):**
- Mission section stacks: image above, text below
- Mission image: min-height 260px
- Footer: 2-column grid

**At 480px (mobile):**
- Hero headline: `clamp(28px, 9vw, 52px)` — raise the floor from 17px to 28px
- Hero CTA row: stacks vertically
- Footer: single column
- Contact panel: full width

---

## 14. Mobile Design Principles

1. The nav CTA button ("Get Started") must remain accessible at all viewport sizes
2. The logo must be visible and not overflow the pill container
3. All body text must be minimum 13px on mobile
4. Section padding at mobile: `--section-pad-sm` (48px minimum)
5. No horizontal scroll at any viewport width

---

## 15. Animation Principles

### Motion Vocabulary
- Entry animation: `opacity 0→1 + translateY 28px→0` over 0.75s with `cubic-bezier(0.16, 1, 0.3, 1)`
- Exit/hover lift: `translateY(-2px)` maximum — no element lifts more than 2px
- Scale: `scale(1.03)` maximum — for image hover only
- Color transitions: 0.2–0.25s ease

### What NOT to animate
- Section containers (no hover lift on large-area elements)
- Footer column links (no horizontal translate)
- Form inputs (only border-color transition)

### Dead Animations to Remove
- `arrowFlow` keyframe
- `arrowBob` keyframe
- `pulse` keyframe (eyebrow dot no longer exists)

### Scroll Reveal
- Apply `.reveal` class to: eyebrows, headlines, body paragraphs, CTAs (grouped per section — not individually when elements are adjacent)
- Use `--threshold: 0.15` for IntersectionObserver
- Section 2: reveal the `.retail-container` as one unit, not eyebrow and headline separately

---

## 16. Section 2 — Redesign Approach

### Grid Structure
- Container: `.section-container` max-width 1200px
- Grid: 12-column
- Eyebrow: col 1-3 (span 3) — 25% — with a right-aligned rule line
- Headline: col 4-12 (span 9) — 75%

### Typography
- Eyebrow: 11px, weight 600, 0.22em tracking, uppercase, `--color-light-dim`
- Headline: `clamp(32px, 4.2vw, 56px)`, weight 500, -0.02em tracking, `--color-light-text`

### Eyebrow Treatment
The eyebrow column (span 3) uses:
- Text at top-left
- A subtle horizontal rule under the text spanning the column width
- Color: `--color-light-dim` (#888888)

This creates a structural visual separator between the eyebrow column and headline column.

---

## 17. Section 3 — Video Redesign Approach

### Structure
```html
<section class="how-bridge">
  <div class="section-container">
    <p class="section-eyebrow">Product Overview</p>
    <div class="how-video-wrap">
      <video ...>
    </div>
  </div>
</section>
```

### Eyebrow
- Text: "Product Overview" — existing text, no content change
- Style: identical to Section 2 eyebrow (11px, weight 600, 0.22em, uppercase)
- Position: centered above the video wrapper

### Video Container
- `border-radius: var(--radius-card)` (16px, not 28px)
- NO hover translateY lift
- Shadow: `0 24px 48px -12px rgba(4,6,15,0.20)`
- Background: `--color-dark-bg` (#04060f)

---

## 18. Mission Section — Redesign Approach

### Text Alignment
- Remove `text-align: center`
- Remove `align-items: center`
- Apply `text-align: left; align-items: flex-start`

### Padding
- Keep: `padding: clamp(56px, 8vw, 96px) clamp(40px, 8%, 80px)`
- Add top-anchoring via `justify-content: flex-start` with generous top padding

### CTA
- Apply `border-radius: var(--radius-sm)` (4px)
- Maintain existing outlined style

### H2 Weight
- Change from 600 to 500 (align with Section 2 H2)

---

## 19. Component Reuse Strategy

### Reusable Patterns

**`.section-eyebrow`** — used at the top of every section with a label:
```css
font-size: 11px;
font-weight: 600;
letter-spacing: 0.22em;
text-transform: uppercase;
color: var(--light-dim);
```

**`.section-container`** — used as the inner content wrapper of every section:
```css
max-width: var(--container-max); /* 1200px */
width: 100%;
margin: 0 auto;
padding-left: var(--px);
padding-right: var(--px);
```

**`.section-grid`** — 12-column grid for content sections:
```css
display: grid;
grid-template-columns: repeat(12, 1fr);
column-gap: 32px;
```

### Element Conventions
- Every button uses `.btn` base class + modifier: `.btn--glass`, `.btn--outlined`, `.btn--filled`
- Every section container uses `.section-container`
- Every section eyebrow uses `.section-eyebrow`
- No inline styles

---

## 20. Implementation Order

Execute in this sequence to avoid regressions:

1. **Global tokens** — Add new tokens to `:root`, alias existing tokens. No visual change yet.
2. **Dead CSS cleanup** — Remove all dead rules and keyframes.
3. **Header** — Fix logo size (38px), apply --radius-pill token.
4. **Section 2** — Update eyebrow column span, raise headline size, fix eyebrow positioning.
5. **Section 3** — Update border-radius, remove hover lift, add eyebrow label to HTML.
6. **Section 4 (Mission)** — Left-align card, fix H2 weight, fix CTA border-radius.
7. **Footer** — Fix logo size, update address font size, remove link translateX hover.
8. **Contact Panel** — Add border-radius to submit button.
9. **Responsive** — Fix mobile hero headline floor, remove dead responsive rules.
10. **Motion** — Remove dead keyframes, update scroll-reveal to trigger on containers.

---

*End of Design Approach — v1.0*
