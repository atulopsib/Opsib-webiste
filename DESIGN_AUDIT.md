# OPSIB — Design Audit
**Version:** 1.0 · **Date:** 2026-08-19

---

## 1. Executive Design Assessment

The OPSIB website has a solid conceptual foundation — dark enterprise hero, light editorial mid-section, structured contact system. Single geometric sans-serif (Jost), dark/light section rhythm, and clear CTA hierarchy are good bones.

However, four systemic problems prevent enterprise-grade quality:

1. **No unifying grid contract.** Each section uses a different container width and alignment baseline.
2. **Typography is not a system.** Font sizes and weights jump inconsistently between sections.
3. **Sections 2 and 3 are structurally underweight.** Important content with insufficient typographic mass.
4. **Video section (Section 3) has no framing context.** The product demo floats in gray with no editorial intent.

The hero is the strongest element. Footer is solid. Contact panel is functional. Weakest areas: Sections 2, 3, and Mission (Section 4).

---

## 2. Current Design Strengths

| Strength | Notes |
|---|---|
| Single typeface (Jost) | Applied consistently across all sections |
| Hero visual system | Dark navy, grid overlay, meta-tags, vignette — cohesive |
| Floating glass nav pill | Distinctive, premium, well-executed |
| Token-based color system | CSS custom properties provide a consistent starting point |
| Contact panel | Functional, minimal, legible underline inputs |
| Footer structure | Brand col + 4 link cols — appropriate for enterprise |
| Animation timing | cubic-bezier(0.16, 1, 0.3, 1) — spring-like, professional |
| Scroll reveal | IntersectionObserver + opacity/translateY — tasteful |

---

## 3. Critical Design Gaps

### P0 — Critical

| ID | Gap | Impact |
|---|---|---|
| C1 | No unified container — four different max-widths (1040px, 1240px, 1200px, full) | Content edges never align; page looks assembled |
| C2 | Section 2 headline clamp(24px, 3.1vw, 42px) weight 500 is undersized | Core value prop reads as body copy |
| C3 | Section 3 video has zero editorial framing | Enterprise buyers arrive at a floating video with no context |
| C4 | Inconsistent horizontal padding — how-bridge uses 0, others use --px | Content edges ragged across sections |
| C5 | Mission card text-align center on body copy | Consumer marketing pattern, not enterprise B2B |
| C6 | Nav logo 68px oversizes the ~42px pill nav | Pill border-radius becomes cosmetic; nav looks broken |

### P1 — High

| ID | Gap | Impact |
|---|---|---|
| H1 | No section transition strategy — hard border-top between every section | Sections read as separate pages |
| H2 | Inconsistent border-radius: 5px, 28px, 100px, 0, 4px, 3px | Three shape languages in one page |
| H3 | H2 weight inconsistency: Section 2 uses 500, Mission uses 600 | Same semantic level, different treatment |
| H4 | .headline-word--accent has no CSS distinction | Intended accent has no visual expression |
| H5 | Video container hover translateY(-4px) on a 92vw element | Destabilising visual instability |
| H6 | Dead CSS: .how-label-block, .how-arrow, .how-text, unused keyframes, .hero-statement | CSS polluted with remnants |

### P2 — Medium

| ID | Gap | Impact |
|---|---|---|
| M1 | Hardcoded colors #ebedf2, #555555, #06080f are not tokens | Breaks design system coherence |
| M2 | No mobile navigation beyond CTA button | Mobile users cannot navigate |
| M3 | Mission image fixed height: 300px on mobile | Unpredictable crop across devices |
| M4 | No shared --section-pad token | Cannot globally tune section rhythm |

### P3 — Low

| ID | Gap | Impact |
|---|---|---|
| L1 | CSS header comment says ONYX not OPSIB | Brand inconsistency |
| L2 | arrowFlow, arrowBob, pulse keyframes are dead code | CSS bloat |
| L3 | Dead .nav-links rule at 768px | Dead CSS |

---

## 4. Section-by-Section Analysis

### Section 1 — Hero (Grade: B+)

STRENGTHS: Dark navy + video, glass nav pill, staggered headline animation, meta-tag decorations, corner ticks.

ISSUES:
- Logo 68px breaks the nav pill shape; recommend 36-40px
- .cta-primary uses border-radius: 5px while nav uses 100px — two shape languages
- .headline-word--accent has no CSS distinction from other headline spans
- Hero content max-width 1040px vs nav 1200px — content feels pinched
- Hero headline max 61px at weight 300 uppercase is underwhelming; recommend 72-80px ceiling

### Section 2 — Built for Retail Industry (Grade: C+)

STRENGTHS: 12-column editorial grid concept; left eyebrow / right headline split.

ISSUES:
- Headline ceiling 42px is too low for a full-section value proposition
- Left column spans 4/12 (33%) for 3 words — excessive dead space
- Total padding ~256px for only two text elements — empty, not intentionally spacious

### Section 3 — Video (Grade: D+)

STRENGTHS: Container with border-radius 28px and shadow; #ebedf2 background provides contrast.

ISSUES:
- Zero editorial framing — no eyebrow, heading, or caption
- Dead CSS remnants pollute the stylesheet
- border-radius 28px inconsistent with 5px on CTA buttons
- Hover translateY(-4px) on 92vw container creates visual instability

### Section 4 — Mission (Grade: C)

STRENGTHS: 50/50 image/text split is strong; mission copy is clear; hover zoom is appropriate.

ISSUES:
- text-align: center on body copy is consumer marketing, not enterprise
- align-items: center floats text with no anchoring
- Mission headline weight 600 inconsistent with Section 2 headline weight 500
- mission-cta implicitly border-radius 0 — inconsistent
- mission-body color #555555 is not a token

### Footer (Grade: B)

STRENGTHS: 5-column grid, brand col weighting, column header dividers, legal bottom bar.

ISSUES:
- Footer logo 72px vs nav 68px — optically inconsistent; recommend 40-44px
- footer-address at 9.5px is at the edge of comfortable legibility
- Footer link translateX(3px) hover can cause layout shift

### Contact Panel (Grade: B+)

STRENGTHS: Underline-only inputs, AJAX form with status feedback, slide animation — clean.

ISSUES:
- .cp-submit has no explicit border-radius
- em italic on .cp-headline relies on Jost italic variant loading

---

## 5. Typography Audit

| Element | Size | Weight | Tracking | Assessment |
|---|---|---|---|---|
| Nav CTA | 11px | 600 | 0.12em | Good |
| Hero H1 | clamp(28px, 3.75vw, 61px) | 300 | 0.01em | Ceiling too low |
| Section 2 eyebrow | 11px | 600 | 0.22em | Good — consistent |
| Section 2 H2 | clamp(24px, 3.1vw, 42px) | 500 | -0.015em | Ceiling too low |
| Mission H2 | clamp(22px, 2.8vw, 40px) | 600 | -0.025em | Weight inconsistent with S2 |
| Mission body | clamp(13px, 1.05vw, 15px) | 400 | 0.01em | Color not tokenised |
| Meta tags | 8px | 500 | 0.18em | Below legibility floor |
| Footer link | 13px | 400 | 0.01em | Good |
| CP headline | clamp(20px, 2.5vw, 28px) | 500 | -0.02em | Good |

PROBLEMS:
- No modular type scale — sizes are ad-hoc
- H1 and H2 too close: 61px vs 42px — only 19px gap with weight 300 vs 500
- No body copy tier in Hero or Section 2
- Eyebrow consistency (10.5-11px) is a strength — preserve it
- Button label consistency (10-11.5px) is a strength — preserve it

---

## 6. Spacing and Layout Audit

| Section | Total Vertical | Content Elements | Assessment |
|---|---|---|---|
| Hero | 100vh | Headline + 2 CTAs | Correct |
| Section 2 | ~256px total | Eyebrow + Headline | Excessive for 2 text lines |
| Section 3 | ~216px + video | Video only | Padding OK; content missing |
| Mission | ~192px + image | H + body + CTA | Appropriate |
| Footer | ~160px + grid | Full link grid | Appropriate |

PROBLEMS:
- Section 2 total padding creates ~256px of space for only 2 text elements
- No --section-pad token means rhythm cannot be globally adjusted
- Section 2 uses horizontal column gap as vertical spacing between rows — incorrect

---

## 7. Grid and Alignment Audit

| Section | Container | Max-Width |
|---|---|---|
| Hero nav | .hero-nav-wrapper | min(88%, 1200px) |
| Hero content | .hero-content | 1040px |
| Section 2 | .retail-container | 1240px |
| Section 3 | .how-video-wrap | min(92%, 1200px) |
| Mission | .mission-section | Full viewport |
| Footer | .footer-top | Full viewport + --px |

CRITICAL: Four different content max-widths. Content edges never align while scrolling.
RECOMMENDATION: Unified --container-max: 1200px across all sections.

---

## 8. Color and Contrast Audit

| Value | Token | Usage | Status |
|---|---|---|---|
| #04060f | --bg | Hero, video bg | Tokenised |
| #f6f6f3 | --light-bg | Section 2 | Tokenised |
| #ebedf2 | None | Section 3 bg | NOT tokenised |
| #555555 | None | Mission body | NOT tokenised |
| #06080f | None | Footer bg | NOT tokenised |

Decorative elements below WCAG threshold (acceptable as aria-hidden):
- rgba(255,255,255,0.18) on #04060f = ~1.8:1 — bar tags, footer copy
- rgba(255,255,255,0.20) on #04060f = ~1.9:1 — meta tags, footer address

---

## 9. Component Consistency Audit

BORDER RADIUS INVENTORY:
- Nav pill: 100px
- Nav CTA: 100px
- CTA Primary: 5px
- Video container: 28px
- Mission CTA: 0 (implicit)
- CP submit: 0 (implicit)
- CP close: 4px
- CP status: 4px
- CP textarea: 3px

PROBLEM: 6+ different values — three incompatible shape languages.
SOLUTION: --radius-pill: 100px | --radius-card: 12px | --radius-sm: 4px

BUTTON INVENTORY:
- Nav CTA: Pill glass (dark section)
- Hero CTA Primary: Outlined sharp (dark section)
- Hero CTA Ghost: Text-only (dark section)
- Mission CTA: Outlined square (light section)
- CP Submit: Solid filled (white panel)

PROBLEM: Five different button expressions with no shared base component.

---

## 10. Responsive Design Audit

| Breakpoint | Issue | Severity |
|---|---|---|
| < 1100px | Footer 3-col — fine | OK |
| < 860px | Section 2 single col — correct | OK |
| < 768px | .nav-links display:none — element does not exist | Dead rule |
| < 520px | Hero headline floor 17px is too small for uppercase display | P1 |
| Mobile | Mission image height: 300px fixed | P2 |
| Mobile | No mobile navigation beyond CTA button | P2 |

---

## 11. Interaction and Motion Audit

| Element | Animation | Assessment |
|---|---|---|
| Hero grid | Mouse parallax +-9px | Good — professional subtlety |
| Meta tags | Opacity flicker | Good |
| Hero headline | Staggered fadeUp | Good |
| Scroll reveal | opacity + translateY | Good |
| Mission image | Scale 1.03 on parent hover | Correct pattern |
| Video wrap | translateY(-4px) hover | Remove — destabilising |
| Nav scroll | BG darkens at 60px | Good |
| Contact panel | Slide from right | Clean |

DEAD ANIMATIONS: arrowFlow, arrowBob, pulse — unused, remove.

---

## 12. Enterprise-Level Design Gaps

| Gap Area | Enterprise Standard | Current State |
|---|---|---|
| Grid discipline | All content edges align vertically | Four different container widths |
| Component vocabulary | 2-3 button types, 1-2 radius values | 5 button types, 6+ radius values |
| Video presentation | Product demo has context label | No label, no heading — floating in gray |
| Section narrative | Sections lead into each other | Isolated blocks with mechanical dividers |
| Mission card | Left-aligned, anchored body text | Center-aligned, floating body text |
| Type scale | Modular ratio with clear H1/H2/body | Ad-hoc sizes, H1/H2 too close |
| Color token coverage | All colors tokenised | 4 hardcoded values in use |

---

## 13. Priority Matrix

### P0 — Critical

| ID | Fix | Scope |
|---|---|---|
| C1 | Unify all containers to max-width: 1200px | Global |
| C2 | Raise Section 2 headline to clamp(32px, 4.2vw, 56px) | Section 2 |
| C3 | Add eyebrow + label framing to Section 3 video | Section 3 |
| C4 | Apply --px consistently to all section horizontal padding | Global |
| C5 | Left-align Mission card body text | Section 4 |
| C6 | Reduce nav logo to 36-40px height | Header |

### P1 — High

| ID | Fix | Scope |
|---|---|---|
| H1 | Define --radius-pill, --radius-card, --radius-sm tokens | Global |
| H2 | Consolidate to 3 button types: nav-glass, outlined, filled | Global |
| H3 | Remove all dead CSS rules and unused keyframes | Global |
| H4 | Unify H2 weight to 500 across Section 2 and Mission | Global |
| H5 | Remove translateY(-4px) hover from .how-video-wrap | Section 3 |
| H6 | Apply visual treatment to .headline-word--accent | Section 1 |

### P2 — Medium

| ID | Fix | Scope |
|---|---|---|
| M1 | Tokenise #ebedf2, #555555, #06080f | Global |
| M2 | Ensure nav CTA button is reachable on mobile | Header |
| M3 | Replace fixed height: 300px with min-height on mobile mission image | Section 4 |
| M4 | Add --section-pad token | Global |

### P3 — Low

| ID | Fix | Scope |
|---|---|---|
| L1 | Update CSS header comments from ONYX to OPSIB | Global |
| L2 | Remove dead .nav-links and stale .retail-eyebrow responsive rules | Responsive |
| L3 | Evaluate removing footer link translateX(3px) hover | Footer |

---

*End of Design Audit — v1.0*
