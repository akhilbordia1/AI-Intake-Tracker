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

Five triplets — ink / tint / hairline. **One green, one amber, one red, one clay,
one violet.**
Info is its own clay hue rather than the accent's: the accent is green, and
"your turn" must not read as "passed".

| Tone | Means |
| --- | --- |
| `success` | Passed, complete, done |
| `warning` | In review, locked, waiting on a decision |
| `danger` | Blocked, rejected, returned |
| `info` | Active / current / your turn (warm clay, its own hue) |
| `waived` | Skipped — out of this record's path, neither done nor waiting |
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

**There is no elevation.** Every `--shadow-*` token resolves to `none`: depth is a
hairline, a fill one step off the surface, and — for a floating layer — a dimmed
backdrop. The tokens still exist, and every call site still references them, so
turning elevation back on is one edit in `globals.css` rather than a sweep. Focus
rings are not elevation; they keep their own `box-shadow`.

---

## Components

From `src/components/ui/kit.tsx`:

- **`Button` / `ButtonLink` / `buttonClass(tone, size)`** — `primary` (the one
  action a view is for), `secondary`, `quiet` (header chrome), `danger`. Sizes
  `sm` (h-9/13px, default) and `md` (h-10/14px — sized against the 40px fields
  they sit beside). Every action button in the app is
  one of these, so Submit stage and New use case are the same object. Press and
  focus are shared across tones — `:active` nudges the face down a pixel (the
  shadow tokens it also sets are `none`), and focus is an offset accent ring, never
  a recoloured edge.
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

1. **Panel header + rail header** — the panel's own header on the left: breadcrumb
   (or title + count), the view tabs, and that view's real controls pushed to its
   right edge; then, at the window's right edge, the chat rail's label and its
   controls.
2. **Content panel** — a rounded white panel, fully inside the window, with a
   footer where the view has actions of its own.

A record's identity block (name, problem, owner · go-live · status) stays put
while its content scrolls under it, on both the overview and the stage form. It
takes a hairline only once something has scrolled behind it — and the border is
always there, transparent when idle, so the block can't grow as you scroll.

The chat rail is a fixed **364px** side rail on the **right**, collapsible to a 36px
strip and expandable to full width (`useRailMode` — the states are mutually
exclusive). It led the row until it didn't: on the left, the assistant sat between
the window edge and the thing being discussed, so a board, a record or a portfolio
started 380px in and the eye crossed the chat to reach it. The
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
(`.read-field`); a choice field drops the options you didn't pick and shows the one
you did as a quiet pill (`.read-choice`, keyed off `data-choice="pill"` so a radio's
dot doesn't grow a box it never had). Dropped means `display: none` — holding their
space left the answer floating wherever the earlier options had been. A single-line
pill row keeps its height; a wrapping multi-select can lose a line, the one place
this trades movement for a legible answer.

**An empty field says what it means.** A stripped read control with no value is an
invisible box, so a blank row shows the field's definition (`FIELD_GISTS` in
`lifecycle.ts`) in a third type register — the lighter serif, italic, 14px, at
`--text-faint` — so it can't be read as either the sans label above it or the sans
value it replaces. A definition differs on every row; a status phrase ("Not captured yet")
repeats twelve times down a stage and stops being read. The line sits inside the
control's own height, so entering edit moves nothing below it.

**Data display.** Bars, not pies. Counts and shares are drawn from the same parts
the rest of the app is made of — a hairline box (`TileBox`), a hairline table
(`DataTable`), a capped list with an honest overflow line (`MiniList`), and a
four-cell headline band (`StatBand`), all in
`src/components/portfolio/tiles.tsx`. A donut's angles and legend are a different
visual language from a product built of hairlines, and lengths are easier to compare.
One chart runtime exists — recharts, in `time-chart.tsx` — used only where there is a
real time axis to label (two lines on `/portfolio`), themed entirely from tokens, and
guarded so it draws nothing during the prerender. Colour stays meaningful: the accent carries the measure, and a
category only gets its own hue when the category *is* the point.

**A reading page states its answer.** A screen of tiles makes the reader derive the
point, so each view opens with a `SummaryPanel` — a headline sentence and three
supporting lines, authored as Markdown, on the muted surface with an accent edge so it
reads as the assistant rather than as another tile — and every tile's hint is a plain
sentence rather than a count. Four blocks per view is the ceiling; anything cut goes to
the rail, and an `AskLine` at the foot says so, so the omission reads as a choice
instead of a gap.

**Figures are sans, even the big ones.** Fraunces sets numerals old-style, so `$1.79M`
and `8/10` came out uneven at 28px — the one place the display serif loses to Inter. A
headline number is 26px semibold sans with `tabular-nums` so a row of cells lines up;
the serif keeps prose, record names and section titles. Two lines on one chart never
share a hue family: the second series takes the clay `--tone-info-fg`, because
accent-green against success-green read as one line crossing itself.

**Pick the shape the comparison needs.** A bar is for shares of a whole (a
`ProgressBar` in a row, sized against the fullest row rather than the total, so a queue
where nothing holds more than a third is still legible). Figures that want reading
against each other go in a hairline table with the numbers right-aligned in mono
(`DataTable`) — bars sized against the largest bucket made the *stopped* money the
longest thing on the tile — and every column is named, including the first: a blank
corner cell leaves the reader working out what the labels under it are a list of. A
measured value against a target is written out rather than drawn: production KPIs all sit
within a few points of target, so a proportional bar was full for every one of them and
said nothing, and "62% of 70%" reads as a fraction of a fraction — it is "62% against
70%", with the measured figure coloured by met-or-behind. A small population split into a
few groups is a row per group with its count and a bar (`GroupBars`) — never a donut, not
a stacked bar with a legend under it (which stated the split twice, once as lengths and
once as percentages), and not a dot per record either: laid out in rows, that is the same
bar chart drawn less legibly. A composite score shows what
it's made of underneath it (`ScorePanel`) — one number alone hides its own reasoning —
and its dial is drawn *as* those parts: one arc per measure, an equal slice each because
they're evenly weighted, each filled to its own level. One sweeping ring restated the
number in its middle and said nothing the rows didn't. Status in a dense list is a
coloured dot and a word (`StatusDot`), not a filled pill: four pills down a column read
as four buttons. Tile headings are 13px sans, **Title Case**, and a **plain noun** — a
count for a hint, and if a tile needs a caption sentence to be understood it's the wrong
tile. One noun each, in one register: *Pipeline · Blockers · Health Score · Spend and
Return · Live Use Cases · Stopped and Parked · Capability Mix*. A hint only earns its
place if the tile doesn't already contain it: "5 records" over five countable rows, or
"all 18" over three rows that sum to eighteen, is the tile reading itself back. A
denominator the rows *don't* show ("of 11 on the board", "18 ever raised") or a total they
can't be added up to ("2.5k users · 29k hours saved a year") is worth the space. A page that mixes a
question ("What kind of AI"), a preposition ("In production"), a verb ("Needs unblocking")
and a metaphor ("Pulse") makes the reader change gear at every box, and the metaphor is
the worst of them — it names a feeling rather than a measure. Sub-section labels and table
column heads follow the same casing (*Decision Time*, *Missed Targets*, *On the Board*,
*Benefit a Year*); small words inside a title stay lowercase (*Spend **and** Return*,
*Month **by** Month*). Where the title already names the number, the figure gets no caption
under it: "83%" under a tile called *Health Score* does not also need the word "healthy".
Both
views sit in one measured grid (max 1080px, two tiles abreast where they fit):
full-bleed rows put a label and its number in different postcodes.

**Facts about the same rows belong in one block.** Find the key the tiles share, then
merge on it. Where things sit, how many ever got there, how long it takes and who's
waiting were four tiles about the same four *phases* — so the reader matched phase names
across them and held the rows in their head. They are one table now, one row per phase,
and only the monthly line stays separate because time is the axis that isn't per-phase.
On the value side the shared key is the *record*: adoption, the go-live ledger and the
KPI targets were three tiles joined by title, and are now one group per live record.

**Then cut what the merge duplicates.** A merge that keeps every column is just the same
confusion in one box — the production groups carried twelve figures each, sixty on the
block. Gone: a per-record payback (the division of the two figures beside it), per-record
hours saved (the same benefit the money already states, and totalled in the footer
anyway), the year on a column of dates that all fall in one year, and a summary panel's
footer bar (its provenance moved into the header, where a ruled-off strip for one muted
line was more chrome than the line was worth). What's left per record is what it cost,
what it returns, who uses it, and whether it's hitting target. Where a number came from is a line under the block
(`TileBox footer`), not a hover: a median that ignores everything still sitting in a
phase is the one caveat that has to be readable without a mouse. Where a figure has a
committed target, the target prints beside it — and only there; an invented benchmark is
worse than none. Where a sparkline runs, the span it covers is named next to it.

**Colour bands say which one is dragging.** Four bars in one fill made 75% and 100%
read as the same news, which is the one thing a composite has to tell you. A measure at
or near full takes `--status-success`, comfortable takes the accent, behind takes
`--tone-warning-fg` — and the figure takes the same colour as its bar. Where two
measures can land in the same band, a mono index ties each row to its arc, because
colour alone no longer identifies it.

**A count on a dashboard opens.** Every phase row links to the tracker filtered to that
phase (`/?phase=…`); a leader who can't open a number goes and counts it again by hand.
The filter arrives as a removable chip beside the panel's count — a filter you can't see
or clear reads as a board that lost most of its cards.

**Tooltips.** One line is a phrase. More than that is written as lines, first line
the heading and the rest `Label: value` — the layer sets the labels back and rules
them off the heading, so a hover that carries a record's detail reads as a small
table instead of a paragraph in a black box. A multi-line tip therefore needs a
real heading as its first line.

A field's width is set on its row wrapper, never inside a control: the "Capturing…"
overlay covers that wrapper, so a cap set deeper leaves the overlay spanning the
whole column. **An empty field being captured needs a wrapper of its own** — one with a
height *and* a cap. A read-mode choice control draws only its selected option, so with
nothing selected it collapses to no height at all, and the overlay lands across the label
(a "Capturing…" bar striking through its own field, full width). Choice kinds have no cap
from `fieldBoxWidth` — a row of segments needs the room — so the empty-and-loading wrapper
borrows a field-sized one. Nothing may change size or move
between read and edit — no reserved heights on one side only, no negative inset on
one kind of control. Everything left-aligns on the label's left edge: a box, a pill
row, a radio's dot, a slider's track. No field takes the panel's full width: prose
caps at 600px and wraps, and short answers, selects and money get a shorter box —
a sentence running the width of a wide panel is hard to scan, and it makes every
short answer look like a field that failed to fill.

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
