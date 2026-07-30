# Design system

How this prototype is meant to look and hold together. Read this before adding UI;
if something here is wrong, change the system rather than working around it locally.

Everything visual comes from two places:

- **`src/app/globals.css`** — tokens (colour, radius, elevation, type scale) and the
  handful of animations.
- **`src/components/ui/kit.tsx`** — the shapes: buttons, tags, cards, headings,
  progress, stage nodes.

Screens compose those. **No raw hex in a component.** If you need a colour that
isn't a token, add the token.

---

## Colour

Warm editorial neutrals, one teal accent, three status tones. Nothing else.

### Surfaces

| Token | Use |
| --- | --- |
| `--shell-canvas` | The app's ground: what the chat rail and the gaps around panels sit on |
| `--surface` | Panels, cards, menus, inputs |
| `--surface-muted` | Recessed fills inside a panel (answer boxes, read-value hovers) |
| `--surface-hover` | Hover on a quiet control |
| `--surface-strong` | Filled neutral chips, disabled buttons, progress tracks |
| `--surface-bubble` | The user's chat bubble — the one surface that is neither panel nor field |

### Lines

`--border-hairline` (dividers inside a panel) → `--border-soft` (panel headers /
footers) → `--border-default` (cards, controls) → `--border-input` (hollow nodes,
field borders). Pick the lightest one that still reads.

### Text

`--text-primary` (headings, values) · `--text-body` (prose) · `--text-label`
(field labels, quiet controls) · `--text-muted` (meta, captions, placeholders).

### Accent

`--accent` #0e7090 is the only brand colour: primary buttons, current-stage nodes,
links, focus. Scale: `--accent-strong` (text on tint, hover), `--accent-soft`
(tints), `--accent-border`, `--accent-ring` (hover borders), `--accent-hover-bg`
(secondary-button hover).

### Status tones

Four triplets — ink / tint / hairline. **One green, one amber, one red, one blue.**

| Tone | Means |
| --- | --- |
| `success` | Passed, complete, done |
| `warning` | In review, locked, waiting on a decision |
| `danger` | Blocked, rejected, returned |
| `info` | Active / current / your turn (the accent family) |
| `neutral` | Counts and labels that aren't status at all |

Use them via `<Tag tone="success">`, never by hand.

---

## Type

Fraunces (`.font-display`) for headings 18px and up, and for hero values. Inter for
everything else. The scale is **11 · 12 · 13 · 14 · 15 · 18 · 20 · 40** — no other
sizes.

| Size | Role |
| --- | --- |
| 11 | Captions, tags, node numbers, uppercase group labels |
| 12 | Meta lines, hints, counts, starter chips |
| 13 | Default UI: buttons, table cells, chat body, list rows |
| 14 | Form values and field labels, stage description |
| 15 | Prose that is meant to be read (intake lead, long copy) |
| 18 | Panel titles, section headings (Fraunces) |
| 20 | Page title (Fraunces) |
| 40 | Intake hero only (Fraunces) |

Uppercase micro-labels are for group headers only — never a grid of them as a
metadata strip. Use `<Fact label="Risk tier">…</Fact>` (`label · value`) instead.

---

## Radius and elevation

`6px` chips and small toggles · `8px` buttons, inputs, menu items · `10px` cards,
notices, panels-within-panels · `14px` the composer and the content panel ·
`rounded-full` tags, avatars, nodes, the send button.

Elevation is nearly flat: `--shadow-sm` for a resting card, `--shadow-card` for the
content panel, `--shadow-menu` for popovers/portals, `--shadow-modal` for sheets.
Prefer a hairline over a shadow.

---

## Components

From `src/components/ui/kit.tsx`:

- **`Button` / `ButtonLink` / `buttonClass(tone, size)`** — `primary` (the one
  action a view is for), `secondary`, `quiet` (header chrome), `danger`. Sizes
  `sm` (h-8/13px, default) and `md` (h-9/14px). Every action button in the app is
  one of these, so Submit stage and New use case are the same object.
- **`IconButton`** — square icon-only control, 28–32px, for chrome and steppers.
- **`Tag`** — status chip; tone-driven, 11px, pill.
- **`cardClass({ selected, interactive })`** — the one card shape.
- **`SectionHeading`**, **`Fact`** — section title with hint; inline metadata.
- **`ProgressRing`**, **`ProgressBar`** — "n of m" as a glance, or a thin track.
- **`StageNode`** — the lifecycle node: tick when complete, filled when current,
  hollow with its number when ahead. Every stage rail uses it.

From `src/components/app-shell.tsx` (layout chrome): `AppTopBar`, `RailHeader`,
`PanelTabs`, `TabBarToggle`, `PanelBreadcrumb`, `ContentPanel`, `AppShell`,
`useRailMode`.

From `src/components/chat/chat-ui.tsx` (conversation): `ChatLine`, `ChatComposer`,
`ChatStarters`, `ChatStartScreen`, `ChatDock`, `ChatTimeDivider`.

---

## Layout

Three rows of chrome on every route:

1. **Top bar** (on the canvas) — product mark, title, centred search, avatar.
2. **Rail + tab bar** — the chat rail's header and its two controls on the left;
   the panel's view tabs (and any panel toggle) on the right.
3. **Content panel** — a rounded white panel, fully inside the window, with its
   own header (icon, title, count, breadcrumb) and, where the view has one, a
   footer holding that view's actions.

The chat rail is a fixed **364px** side rail, collapsible to a 36px strip and
expandable to full width (`useRailMode` — the states are mutually exclusive). The
panel clips its own content: **nothing bleeds past its rounded edge**, and content
that needs more room scrolls inside it.

**Panel vs. stage headers:** the panel header carries the *object* (record id,
phase, view). The stage header inside carries the *stage* (name, status, progress,
owner, gate, whose turn). A fact appears in one of them, never both.

---

## Chat

One kit for every conversation. Assistant messages are plain prose (no bubble);
the user gets a `--surface-bubble` bubble with its send time beneath. Work steps
render as activity lines (bold verb + muted detail). Nothing the agent says is
boxed — a completion is a message, not a callout.
Messages over ~460 characters clamp to six lines with *Show more*.

Before anything is asked, a chat shows `ChatStartScreen`: mark, headline, lead and
suggestions as one centred block, with the composer docked at the bottom. Starter
chips only sit next to the input inside a stage's chat, where they're follow-ups
rather than a greeting.

The composer is one shape everywhere: textarea, a mention control on the left, a
circular send on the right that stays visible and greys out when empty. The shell
provides its insets, so it lines up with the bottom of the content panel.

---

## Writing

- Sentence case everywhere. No title case, no exclamation marks.
- Say whose turn it is, not just what state a thing is in ("Waiting on Noah R.").
- Never state the same fact twice on one screen.
- A description must not open with the name of the thing it's under.
- Prefer names over counts in prose ("Left to capture · Pilot, CSV documentation")
  and counts in chips (`2/12`).
- Tags name whose move it is or the kind of action — never repeat the verb already
  in the title next to them.

---

## Rules of thumb

1. Reach for the kit before writing a class string. If the kit lacks it, add it
   there.
2. Tokens, not hexes. One green.
3. A control that renders must do something. No "coming soon" buttons — wire it,
   or leave it out.
4. Whitespace over dividers; hairlines over shadows; one accent.
5. Don't add a section to a screen that repeats what another section already says.
