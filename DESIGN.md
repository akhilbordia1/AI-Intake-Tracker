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

Warm editorial neutrals, one forest-green accent, three status tones. Nothing else.

### Surfaces

| Token | Use |
| --- | --- |
| `--shell-canvas` | The app's ground: what the chat rail and the gaps around panels sit on |
| `--surface` | Panels, cards, menus, inputs |
| `--surface-muted` | Recessed fills inside a panel (answer boxes, read-value hovers) |
| `--surface-hover` | Hover on a quiet control |
| `--surface-strong` | Filled neutral chips, disabled buttons, progress tracks |
| `--surface-header` | The table header band — a shade lighter than `strong`, so column names read as chrome, not as a filled row |
| `--surface-bubble` | The user's chat bubble — the one surface that is neither panel nor field |

### Lines

`--border-hairline` (dividers inside a panel) → `--border-soft` (panel headers /
footers) → `--border-default` (cards, controls) → `--border-input` (hollow nodes,
field borders). Pick the lightest one that still reads.

### Text

`--text-primary` (headings, values) · `--text-body` (prose) · `--text-label`
(field labels, quiet controls) · `--text-muted` (meta, captions, placeholders).

### Accent

`--accent` #42623b (deep forest) is the only brand colour, and it marks what something **is** —
a link, the current stage, the primary action, a focus ring. It is never an
interaction state: hover is `--surface-hover`, selected/open is
`--surface-strong`, so a row you're pointing at and a row that's chosen read as
two shades of the same neutral rather than a wash of blue.

Scale: `--accent-strong` (accent text), `--accent-soft` (tints, focus rings),
`--accent-border`, `--accent-ring`.

### Status tones

Four triplets — ink / tint / hairline. **One green, one amber, one red, one clay.**
Info is its own clay hue rather than the accent's: the accent is green, and
"your turn" must not read as "passed".

| Tone | Means |
| --- | --- |
| `success` | Passed, complete, done |
| `warning` | In review, locked, waiting on a decision |
| `danger` | Blocked, rejected, returned |
| `info` | Active / current / your turn (warm clay, its own hue) |
| `neutral` | Counts and labels that aren't status at all |

Use them via `<Tag tone="success">`, never by hand.

---

## Type

Three families. Fraunces (`.font-display`) for headings 18px and up. Inter for
everything else. Geist Mono (`.font-mono`) for **data**: record ids, dates,
counts and ratios (`UC-138`, `6 Jul 2026`, `4/4`, `10/12`) — anything that lines up
in a column or reads as a value rather than a word. Never for prose or labels.

The scale is **11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 28 · 40** — no other sizes. Mono
runs a shade larger than Inter at the same size, so drop it one step (12px mono
next to 13px sans).

| Size | Role |
| --- | --- |
| 11 | Captions, tags, node numbers, uppercase group labels |
| 12 | Meta lines, hints, counts, starter chips |
| 13 | Default UI: buttons, table cells, chat body, list rows |
| 14 | Mono values (dates, scores), stage description |
| 15 | Prose that is meant to be read (intake lead, long copy); mono values |
| 16 | A record's answers — what the form captured |
| 18 | Panel titles, section headings (Fraunces) |
| 20 | Section titles (Fraunces) |
| 28 | Record name (Fraunces) |
| 40 | Intake hero only (Fraunces) |

**Record values read at the size of the control that edits them** — 16px prose,
15px mono, 14px in a pill: the answers are the content of a record, so they sit a
step above the UI around them. A field's label sits a step below its value and in the
muted ramp (12px `--text-muted`); at the same size and weight the question and the
answer read as one run of text. Toggling Edit is a change of chrome, never of type
size or of where the text starts.

One caveat, because it bit us twice: element rules written **outside a layer**
beat Tailwind's layered utilities whatever their specificity. `button, input,
textarea, select { font: inherit }` therefore has to live in `@layer base`, or
every control silently inherits the panel's type size instead of its own.

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
  `sm` (h-9/13px, default) and `md` (h-10/14px — sized against the 40px fields
  they sit beside). Every action button in the app is
  one of these, so Submit stage and New use case are the same object. Press and
  focus are shared across tones — the resting lift (`--shadow-btn-raised` /
  `--shadow-btn-primary`) becomes `--shadow-btn-pressed` on `:active`, and focus
  is an offset accent ring, never a recoloured edge.
- **`IconButton`** — square icon-only control, 28–32px, for chrome and steppers.
- **`Tag`** — status chip; tone-driven, 11px, pill.
- **`cardClass({ selected, interactive })`** — the one card shape.
- **`SectionHeading`**, **`Fact`** — section title with hint; inline metadata.
- **`ProgressRing`**, **`ProgressBar`** — "n of m" as a glance, or a thin track.
- **Form controls** (`src/components/forms/fields.tsx`) — one kind of field is not
  one control. A two-way choice is a `SegmentedToggle`; a value the record shows
  as a tag is picked with `ChipSelect`; a short enum is a `Segmented` row; a wordy
  one a `RadioGroup`; more than five options a `SearchableSelect`; ordinals a
  `LevelSlider`; `n/m` a `RatingStepper`; money a `CurrencyField` (code selector
  in the field, never full width). Only prose takes the column's full width.

  Every control is a **soft-filled shape**, not a hairline box: `--field-fill`
  carries "editable", so a ten-answer form isn't ten outlines. Boxes are 40px tall
  at radius 10; pill rows and segmented tracks fill the same neutral; focus is a
  ring, never a recoloured edge. The border stays in the class list but
  transparent, so an error can colour it and `.read-field` can clear it without
  moving a pixel.
- **`StageNode`** — the lifecycle node: tick when complete, filled when current,
  hollow with its number when ahead. Every stage rail uses it.

From `src/components/app-shell.tsx` (layout chrome): `RailHeader`, `PanelTabs`,
`TabBarToggle`, `PanelBreadcrumb`, `ContentPanel`, `AppShell`, `useRailMode`.

From `src/components/chat/chat-ui.tsx` (conversation): `ChatLine`, `ChatComposer`,
`ChatStarters`, `ChatStartScreen`, `ChatDock`, `ChatTimeDivider`, `JumpToTop`; and
from `chat-history.tsx`: `useChatSessions`, `ChatHistoryButton`,
`PastChatTranscript`.

---

## Layout

One row of chrome, then the panel:

1. **Rail header + panel header** — the chat rail's label and its controls on the
   left; on the right, the panel's own header: breadcrumb (or title + count), the
   view tabs, and that view's real controls pushed to the right edge.
2. **Content panel** — a rounded white panel, fully inside the window, with a
   footer where the view has actions of its own.

A record's identity block (name, problem, owner · go-live · status) stays put
while its content scrolls under it, on both the overview and the stage form. It
takes a hairline only once something has scrolled behind it — and the border is
always there, transparent when idle, so the block can't grow as you scroll.

The chat rail is a fixed **364px** side rail, collapsible to a 36px strip and
expandable to full width (`useRailMode` — the states are mutually exclusive). The
panel clips its own content: **nothing bleeds past its rounded edge**, and content
that needs more room scrolls inside it.

**Collections sit in a box.** A table is a hairline box on white with a
`--surface-header` header band; a kanban column is a `--surface-muted` tray with
no border, holding white cards. Both keep the panel's `px-5` gutter, and the box —
not the panel — is the scroll container, so a sticky header has something to stick
to. Inside a boxed list, rows carry the side padding so hairlines run edge to
edge.

**Forms.** A field reads as the control that edits it: read mode renders the same
control, inert (`fieldset disabled`). Typed fields lose the box's lines and fill
(`.read-field`); a choice field hides the options you didn't pick and shows the one
you did as a quiet pill (`.read-choice`, keyed off `data-choice="pill"` so a radio's
dot doesn't grow a box it never had). Neither rule touches a metric — hidden means
`visibility`, so the space stays and nothing moves when Edit comes on. Nothing may change size or move
between read and edit — no reserved heights on one side only, no negative inset on
one kind of control. Everything left-aligns on the label's left edge: a box, a pill
row, a radio's dot, a slider's track. Only prose takes the column's full width;
short answers, selects and money get a shorter box.

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

Light rises off the bottom of the window behind it — `.chat-glow` on the shell,
not on the rail, so it reaches every edge and is there before a conversation
starts. `ChatDock`'s fade and band continue the same ramp (`--glow-mid` →
`--glow-near`); change one stop without the others and the dock reappears as a
rectangle sitting on the glow.

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
