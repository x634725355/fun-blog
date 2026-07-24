# Design — fun-blog / csc3fun

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
playful · **Hum × `#E5CB90`** (cream paper, multi-accent, rounded shell)

## Audience / use / tone
- Audience: personal (owner-only)
- Use: tool collection — enter tools from an index; usable on mobile and PC
- Tone: playful / soft-alive (Hum), sand-gold as pear stand-in

## Macrostructure family
- Marketing pages: n/a
- App hub: **Index-First** — short label intro + vertical tool links (the links are the UI)
- Tool pages: same shell; internal panels stay Workbench-like (stacked forms / galleries)
- Content pages: Index-First language for any list surfaces

## Theme (Hum · anchor `#E5CB90`)
- `--swatch-gold` / `--color-accent`  oklch(85.0% 0.081 86.8) /* #E5CB90 · pear role */
- `--color-accent-deep` oklch(72% 0.1 86)
- `--color-accent-2`    oklch(66% 0.14 235) /* sky · links / hover tint */
- `--color-accent-3`    oklch(68% 0.2 18)   /* coral · one pop / active mark */
- `--color-paper`       oklch(97% 0.014 95)
- `--color-paper-2`     oklch(94% 0.02 92)
- `--color-ink`         oklch(22% 0.015 250)
- `--color-focus`       sky family

Axes: light / rounded-sans / multi  
Vibe: "hum index, sand gold"

## Typography
- Display / body: Plus Jakarta Sans, 400–700, style normal (no italic headers)
- Mono: JetBrains Mono (index labels, paths)
- Display tracking: -0.025em on titles

## Spacing
4-point named scale in `assets/css/tokens.css`.

## Motion
- Hum press on primary buttons (edge shadow + translateY)
- Index rows: color-shift + soft lift on hover
- One character mark on hub (CSS-only)
- Reduced-motion: opacity-only, ≤ 150ms

## Microinteractions stance
- Silent success (toast)
- Primary CTA = Hum push button
- No confetti; coral pop reserved for active index mark

## CTA voice
- Primary: `--color-accent` (#E5CB90) + dark `--color-accent-ink`, pill/bubble radius, push edge
- Secondary: soft / outline
- Links / hover tint: accent-2

## Nav / shell
- Hub: Index-First vertical list (no 2-col tile grid on home)
- Tool pages: top menu bar → slideover reuses same index list
- Shell: cream paper + gold / cyan wash

## Per-page allowances
- App pages MUST NOT use marketing enrichment
- Multi-accent: gold = primary · cyan = link tint · coral = one active moment
- No serif anywhere

## Mobile structure (hard rules)
- Page chrome: `padding: var(--space-sm)` + safe-area; stage max-width `--shell-max`
- Forms single column &lt;680px; primary CTA full-width
- Image grids: 2-col &lt;680px, 3-col ≥680px; `minmax(0, 1fr)`
- Dropzones large and tappable
- Index rows: one-line labels (no wrap on clickable text)

## Upload voice
- Dropzone + stacked path fields + mono filename chip (unchanged intent)

## What pages MUST share
- Hum tokens + `#E5CB90` + Index-First nav language
- Plus Jakarta Sans + JetBrains Mono
- LayoutMobile shell

## What pages MAY differ on
- Tool-page internal stacking
- Density of controls

## Exports
See `assets/css/tokens.css`
