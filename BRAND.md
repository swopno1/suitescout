# SuiteScout brand

Locked 2026-11-06. This file is the brand source of truth — the mark,
the palette, the rules. Slides, video cover, and docs site reuse these
assets; nothing here changes without a dated entry below.

## The mark: "The Scout Lens"

A spyglass looking at resort peaks — research (the lens) aimed at
hospitality (twin peaks under a signal sun). Flat geometry, no
gradients, no glow: it survives favicon scale, print, and embroidery.

- Badge: deep pine `#1d3a2f`, rounded square (sibling echo of the
  RoomReady mark language).
- Lens: cream `#f5efe3` — the page the facts are read from.
- Back peak: resort green `#226355`; front peak + sun + handle:
  terracotta `#a94e24` — the accent of action (run, approve, contact).

## Palette (house hospitality tokens)

| Token | Hex | Job |
|---|---|---|
| `brand-dark` / pine | `#1d3a2f` | Badge, header wordmark, footer |
| `brand` / resort green | `#226355` | Primary buttons, links, active states |
| `brand-light` | `#e6f0ec` | Tinted fills |
| `accent` / terracotta | `#a94e24` | Scout glyph, hot band, DEMO flag, CTAs-that-move-pipeline |
| `accent-light` | `#f6e8df` | Tinted accent fills |
| `cream` | `#f5efe3` | Page background |
| `ink` | `#1c2420` | Body text |
| stone scale | Tailwind `stone-*` | Borders, muted text, cold band |

Deliberately NOT the neon-glow Concierge "V": that register says
AI-startup, not trusted resort partner, and glow filters die below
48px. SuiteScout, RoomReady, and Suite share the green/terracotta/
cream hospitality family.

## Files (`public/brand/`)

| File | Use |
|---|---|
| `suitescout-mark.svg` | App header, avatar, anywhere the icon stands alone |
| `suitescout-mark-mono.svg` | Single-colour reproduction (print, fax, engraving) |
| `suitescout-mark-reversed.svg` | Dark backgrounds (video lower-thirds, dark slides) |
| `suitescout-logo-horizontal.svg` | Slides, video cover, docs headers (mark + wordmark) |
| `favicon.svg`, `favicon-16/32/48.png` | Browser tabs (SVG first, PNG fallback) |
| `apple-touch-icon.png` | iOS home screen (180px, opaque badge) |

Wordmark: system sans, weight 800, tracking tight — "Suite" in ink,
"Scout" in terracotta. Never set the wordmark in another face without
updating the lockup file to match.

## Rules

- Clear space: half the badge width on all sides. Minimum digital
  size: 24px (mark), 120px wide (lockup).
- Don't rotate, stretch, recolour, add shadows/glows, or place the
  colour mark on photographic backgrounds without the badge.
- The DEMO flag (`accent` on `accent-light`) is product chrome, not
  brand — it never appears in external assets.

## Log

- 2026-11-06: Brand locked (v1) — Scout Lens mark, palette, favicon
  set, horizontal lockup. Designed for the Vultr Agent Rush demo;
  built to outlive it.
