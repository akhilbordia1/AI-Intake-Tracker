"use client";

import { ArrowUpRight, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { Markdown } from "@/components/document-record/markdown";
import { ScoreRadial } from "@/components/portfolio/score-radial";

import { MenuItem, MenuLabel, MenuSurface, cardClass } from "@/components/ui/kit";
import { useClickOutside } from "@/lib/use-click-outside";
import { cn } from "@/lib/cn";

// ── The portfolio's drawing parts ──
// A leadership page is read, not explored: a titled summary, a band of four numbers,
// then at most four blocks, each with a noun for a title and no explanatory sentence —
// if a tile needs a caption to be understood, it's the wrong tile. All hand-drawn from
// the product's own hairlines and fills; bars only where something is a share of a
// whole, dots rather than pills for status in a dense list, and a chart runtime only
// where there is a real time axis (see `time-chart.tsx`).

// The assistant's read on the numbers above it — a headline sentence and three
// supporting lines, authored as Markdown so the copy can come from a model. The muted
// fill and the glyph are enough to mark it as something written rather than another
// tile of figures; an accent edge on top of that was one signal too many.
export function SummaryPanel({
  title,
  source,
  meta,
}: {
  title: string;
  source: string;
  // What the prose was written from, on the header's right. There is no footer bar: a
  // ruled-off strip carrying one muted line was more chrome than the line was worth.
  meta?: string;
}) {
  return (
    // Tinted in the accent, because "quiet" stopped working. This was `--surface-muted` (#fcfbfa)
    // on a `--shell-canvas` (#faf9f6) page — two points apart per channel, which is no difference at
    // all once the panel's own white card came off and the canvas showed through. A block that is
    // *written* rather than measured has to be a different surface, not a slightly different white.
    //
    // Still quiet in every other respect: no size override (a 15px prose block was the largest text
    // on the page), no serif (tried, and it made three lines of figures harder to read), and the
    // padding sits on the two halves so the header rule runs the full width the way a tile's does.
    // The tracked-caps label and the glyph take the accent's darkest step, which is legible on this
    // fill at 8.7:1 and reads as the same family as the numbers it comments on.
    <section className="rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-soft)]">
      {/* Ruled off like a tile's header. This deliberately had no rule — the reasoning was that
          a passage of prose doesn't need its title boxed off — but a summary sitting in a column
          of tiles that all rule their headers was the one card built differently, and that read
          as an oversight rather than as a distinction. The muted fill and the glyph are enough
          to mark it as something written. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--accent-border)] px-5 py-3">
        <h3 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--accent-strong)]">
          <Sparkles size={13} className="text-[var(--accent)]" />
          {title}
        </h3>
        {meta ? <span className="font-mono text-[11px] text-[var(--accent-strong)] opacity-70">{meta}</span> : null}
      </div>
      {/* No reading measure on top of the box. An 86ch cap inside a panel already capped
          at 1080px left every line stopping a few hundred pixels short of its own right
          edge, so each bullet wrapped early against a wide empty gutter. The box is the
          measure here — it's three lines, not an article.

          13px, down from Markdown's own 14px: this is the same direction as the earlier fix
          that took a 15px override off it. The tile rows around it are 13px, so at 14px the
          summary was still the largest text on the page, and three lines of it at that size
          made the panel the tallest block above the numbers it comments on. */}
      <div className="px-5 py-4">
        <Markdown source={source} className="text-[13px] leading-[1.6]" />
      </div>
    </section>
  );
}

// The committee's agenda: one row per queue, the count first.
//
// Two shapes were wrong before this. A four-column table (Queue, Count, Oldest, Money Held) for two
// rows, where the header was half the ink and the counts — the whole point — sat at 13px in a narrow
// column. Then a card grid, which fixed the emphasis and broke the width: two cards in a three-up
// grid left a third of the tile empty, and three queues would have been 2 + 1 with the same gap.
//
// Rows work at any count. The figure leads, the queue names itself, and the two facts that decide
// urgency sit at the right where they line up down the list.
export function QueueList({ queues }: { queues: { key: string; count: number; title: string; meta: string; urgent?: boolean; tip?: string }[] }) {
  if (!queues.length) return <TileEmpty>Nothing is waiting on a ruling from this committee.</TileEmpty>;
  return (
    <div className="flex flex-col">
      {queues.map((queue, index) => (
        <div
          key={queue.key}
          data-tip={queue.tip}
          className={cn(
            "grid min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-4 py-3",
            index > 0 && "border-t border-[var(--border-hairline)]",
          )}
        >
          <span
            className="text-[22px] font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
            // The warning tone where the queue holds something genuinely old, so the agenda sorts
            // itself by eye rather than by reading the ages.
            style={{ color: queue.urgent ? "var(--tone-warning-fg)" : "var(--text-primary)" }}
          >
            {queue.count}
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text-primary)]">{queue.title}</span>
          <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">{queue.meta}</span>
        </div>
      ))}
    </div>
  );
}

// `FindingsPanel` (a label column and a rule between each finding) lived here for one revision. It
// turned three sentences into a three-row table, and a table of one-sentence cells says "scan me"
// about writing that is meant to be read. The findings are composed into `SummaryPanel`'s Markdown
// instead — a lead paragraph and two bullets, the same shape the value summary uses.

// What a tile says when the scope filter has emptied it. One line in the tile's own
// box, because a heading over blank space reads as a loading state that never resolves.
export function TileEmpty({ children = "Nothing in this scope." }: { children?: ReactNode }) {
  return <p className="py-1 text-[13px] text-[var(--text-muted)]">{children}</p>;
}

// The one container: a hairline box with a serif heading and an optional hint on
// the right. Everything on the page sits in one of these.
export function TileBox({
  title,
  hint,
  action,
  children,
  footer,
  className,
}: {
  title: string;
  hint?: ReactNode;
  // Somewhere this tile can take you. Only on tiles with a real destination — an affordance on a
  // card that has nowhere to go is worse than none, because it reads as a dead control.
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    // A flex column with a growing body, so a tile told to fill its row (`h-full`) passes that height
    // down to its content instead of stranding it under a short list.
    <section className={cn(cardClass(), "flex min-w-0 flex-col rounded-[12px]", className)}>
      {/* Sans and 13px, not the display serif: eight serif headings down a page of
          figures read as eight article titles and buried the data they introduce.
          The rule under the header stays on every tile, including the ones whose content is a
          drawn shape — it was briefly made optional for those and put back: a header that is
          ruled off on some tiles and not others reads as two kinds of card. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--border-hairline)] px-5 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h3>
        {hint || action ? (
          <span className="ml-auto flex items-center gap-3">
            {hint ? <span className="text-[12px] text-[var(--text-muted)]">{hint}</span> : null}
            {action}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 px-5 py-4">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-[var(--border-hairline)] px-5 py-2.5 text-[11px] text-[var(--text-muted)]">{footer}</div>
      ) : null}
    </section>
  );
}

// The header's affordance: a link, sized and coloured to sit beside a hint without competing with
// the tile's own title. An arrow rather than a chevron — this leaves the page.
export function TileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--text-body)] transition hover:text-[var(--accent-strong)]"
    >
      {children}
      <ArrowUpRight aria-hidden size={13} />
    </Link>
  );
}

// Four numbers that want comparing, not four bars. Money across states is a table:
// the bars were sized against the largest bucket, which made "stopped or parked" the
// longest thing on the tile and read as the headline.
export function DataTable({
  columns,
  rows,
}: {
  // First column is the label (left, sans); the rest are figures (right, mono). Name
  // the first one too — a blank corner cell leaves the reader working out what the
  // labels under it are a list of.
  columns: string[];
  // `tone` puts a coloured dot on the label, so a state that means "earning" and one
  // that means "stopped" aren't the same weight of black text.
  rows: { key: string; label: ReactNode; values: ReactNode[]; tip?: string; tone?: string }[];
}) {
  if (!rows.length) return <TileEmpty />;
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th
              key={column}
              className={cn(
                "border-b border-[var(--border-hairline)] pb-2 text-[11px] font-medium text-[var(--text-muted)]",
                index > 0 && "pl-4 text-right",
              )}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          // No rule under the last row: the box's own edge is already there, and the
          // two together read as an empty final row.
          <tr key={row.key} data-tip={row.tip} className="border-b border-[var(--border-hairline)] last:border-b-0">
            <td className="py-2.5 text-[13px] text-[var(--text-body)]">
              <span className="flex min-w-0 items-center gap-2">
                {row.tone ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.tone }} /> : null}
                <span className="min-w-0 truncate">{row.label}</span>
              </span>
            </td>
            {row.values.map((value, index) => (
              <td key={index} className="font-mono py-2.5 pl-4 text-right text-[13px] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Four cards, each a measure against the bar it has to clear.
//
// Not a `StatBand`: those cells compare like with like across one row, and these four are a count,
// a sum of money, a share and a duration. What they have in common is only "how close to target",
// so that is what the bar under each figure draws — and each keeps its own sentence, because the
// four bars mean four different things and a shared column heading would claim otherwise.
export function TargetCards({
  cards,
}: {
  // `icon` comes from the route, not the derivation: `portfolio.ts` has to stay loadable by plain
  // node for its self-check, so it holds no JSX.
  cards: { key: string; label: string; value: string; against?: string; ratio: number; onTrack: boolean; note: string; icon?: ReactNode }[];
}) {
  if (!cards.length) return <TileEmpty />;
  return (
    <section className={cn(cardClass(), "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
      {cards.map((card, index) => (
        <div
          key={card.key}
          className={cn(
            "flex min-w-0 flex-col gap-2 px-5 py-4",
            index > 0 && "border-t border-[var(--border-hairline)] sm:border-t-0",
            index % 2 === 1 && "sm:border-l sm:border-[var(--border-hairline)]",
            index >= 2 && "sm:border-t sm:border-[var(--border-hairline)] lg:border-t-0",
            index >= 1 && "lg:border-l lg:border-[var(--border-hairline)]",
          )}
        >
          {/* Built to `StatBand`'s cell exactly — glyph + 12px label, 26px figure with its qualifier
              beside it, then one mono line — because these sit two tabs away from that band and any
              difference reads as two kinds of stat rather than one. It was a 10px tracked-caps label
              over a bar over three lines of prose, then a label with no glyph over a line of prose;
              the only thing left that these have and the band doesn't is the bar, which is the whole
              reason they exist. */}
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--text-label)]">
            {card.icon ? <span className="shrink-0 text-[var(--text-faint)]">{card.icon}</span> : null}
            <span className="truncate">{card.label}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {card.value}
            </span>
            {card.against ? <span className="font-mono text-[11px] text-[var(--text-muted)]">{card.against}</span> : null}
          </div>
          {/* Share of target, the only scale these four share. Amber is kept for the ones genuinely
              behind — at the earlier threshold three of four bars were amber, which reads as an alarm
              rather than as a ranking. */}
          <span className="block h-[3px] w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max(2, Math.min(1, card.ratio) * 100)}%`,
                background: card.onTrack ? "var(--status-success)" : card.ratio >= 0.7 ? "var(--accent)" : "var(--tone-warning-fg)",
              }}
            />
          </span>
          {/* Mono 11px, the band's delta line. As sans 12px prose it wrapped to two lines and read as
              a caption under a figure rather than as the figure's own second fact — so it truncates
              rather than wraps, and the cards are written to about 26 characters to clear a quarter of
              the panel. `data-tip` keeps the whole line reachable. */}
          <div data-tip={card.note} className="font-mono min-w-0 truncate text-[11px] text-[var(--text-muted)]">
            {card.note}
          </div>
        </div>
      ))}
    </section>
  );
}

// ── The control strip ──
// Two visible selects and a one-line census of the registry, on a rule under the panel header.
//
// Out in the open rather than inside the filter menu beside them: a period and a function are
// what every figure below is *scoped to*, and a scope you have to open a menu to read is a scope
// people forget is applied. The menu keeps the things that are genuinely optional.

// A dropdown in the product's own idiom — the same `MenuSurface` / `MenuItem` the tracker's view
// menu uses, rather than a native `<select>`.
//
// The native one was here first and looked close enough at rest, but a platform select opens an OS
// menu: system font, system row height, system check mark, none of it themeable. On a page whose
// whole argument is that every surface is drawn from the same tokens, the one control that opens
// somebody else's UI is the one people notice.
export function StripSelect({
  label,
  value,
  options,
  onChange,
}: {
  // Read by screen readers and used as the menu's own heading — the button shows the current
  // value, so the label has to say what kind of thing that value is.
  label: string;
  value: string;
  // `label` is what the button shows; `menuLabel` is the longer form for the open menu, where there
  // is room to qualify it. Falls back to `label`, so a control whose values are already short says
  // it once.
  options: { value: string; label: string; menuLabel?: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);
  const current = options.find((option) => option.value === value);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${label} — ${current?.label ?? value}`}
        // Bordered, filled, and 13px sans — a button. It was borderless mono on the argument that two
        // pills at the end of the header would out-weigh the title; borderless, the pair read as two
        // pieces of running text with chevrons after them, which is worse than heavy. A control that
        // opens a menu has to have an edge to aim at.
        className={cn(
          "inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-[8px] border px-2.5 text-[13px] transition",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
          open
            ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            : "border-[var(--border-input)] bg-[var(--surface)] text-[var(--text-body)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
        )}
      >
        <span className="min-w-0 truncate font-medium">{current?.label ?? value}</span>
        <ChevronDown
          aria-hidden
          size={14}
          className={cn("shrink-0 transition", open ? "rotate-180 text-[var(--accent)]" : "text-[var(--text-muted)]")}
        />
      </button>
      {open ? (
        <MenuSurface className="absolute right-0 top-10 z-30 w-[220px]">
          <MenuLabel>{label}</MenuLabel>
          {options.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.menuLabel ?? option.label}
            </MenuItem>
          ))}
        </MenuSurface>
      ) : null}
    </div>
  );
}

export function ControlStrip({ children, census }: { children: ReactNode; census: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-[var(--border-hairline)] px-6 py-2.5">
      {children}
      {/* The census sits opposite the controls: what the registry holds, against what you have
          narrowed it to. Those two facts belong on one line — a filtered count with no total
          beside it can't be told apart from a small portfolio. */}
      <span className="ml-auto text-[12px] text-[var(--text-muted)]">{census}</span>
    </div>
  );
}

// A count across a few named categories: label, bar, figure, on one line each.
//
// This replaces `GroupBars` on the governance tiles, which gave every row its own hue off the avatar
// ramp and stacked the bar under the label. Two problems with that. Five categorical colours for
// what is one measure counted five ways said the colours meant something — they didn't, the rows
// were already labelled. And a label-over-bar row is two lines tall, so four such tiles in a 2x2
// came out at four different heights with ragged gaps between them.
//
// One hue, stepped by rank so the ordering is visible without the colour claiming a meaning, and one
// line per row so tiles of 3 and 5 rows differ by 3 rows rather than by 6.
export function TallyRows({ rows, total }: { rows: { key: string; label: string; count: number; note?: string; tip?: string }[]; total?: number }) {
  if (!rows.length) return <TileEmpty />;
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    // Rows at their natural height, top-aligned. `justify-between` on a stretched card was tried for
    // exactly one revision: three rows spread over a five-row height put 90px of white between each
    // label and left the hairlines floating in the middle of nothing.
    <div className="flex flex-col">
      {rows.map((row, index) => (
        <div
          key={row.key}
          data-tip={row.tip}
          className={cn(
            "grid min-w-0 grid-cols-[minmax(96px,148px)_minmax(0,1fr)_36px] items-center gap-x-3 gap-y-1 py-2.5",
            row.note && "grid-rows-[auto_auto]",
            index > 0 && "border-t border-[var(--border-hairline)]",
          )}
        >
          <span className="min-w-0 truncate text-[13px] text-[var(--text-body)]">{row.label}</span>
          <span aria-hidden className="block h-2 min-w-0">
            <span
              className="block h-full rounded-[3px]"
              style={{
                width: `${Math.max(2, (row.count / most) * 100)}%`,
                // Darkest for the largest, in one hue. Same device as the mosaic, and for the same
                // reason: the ordering is worth drawing, the categories are not.
                background: `color-mix(in srgb, var(--accent) ${Math.round(100 - (index / Math.max(1, rows.length - 1)) * 55)}%, var(--accent-soft))`,
              }}
            />
          </span>
          <span className="font-mono text-right text-[13px] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {row.count}
            {total ? <span className="text-[var(--text-faint)]">/{total}</span> : null}
          </span>
          {/* A second line under the label, spanning the row: what this category has cost and
              returned. A count alone says the portfolio leans one way; it takes the money to say
              whether the lean has paid for itself. Optional — the compliance tally has nothing to put
              here, and an empty second line is worse than none. */}
          {row.note ? <span className="font-mono col-span-3 text-[11px] text-[var(--text-muted)]">{row.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

// A partition of one population, as a single stacked bar with its parts named underneath.
//
// For counts that genuinely sum to a whole *and* carry meaning in their colour — gate outcomes are
// passed, blocked, rejected, and those are not interchangeable categories, they are good and bad. A
// row of equal-hue bars would rank them by size and say nothing about which you want.
export function StackedMeter({ segments }: { segments: { key: string; label: string; count: number; tone: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  if (!total) return <TileEmpty />;

  return (
    <div className="min-w-0">
      <span className="flex h-3 w-full overflow-hidden rounded-[4px]">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span
              key={segment.key}
              // Hairline gaps in the surface colour, so adjacent segments of similar tone stay two
              // segments rather than one long one.
              className="border-r border-[var(--surface)] last:border-r-0"
              style={{ width: `${(segment.count / total) * 100}%`, background: segment.tone }}
            />
          ))}
      </span>
      {/* The legend is the readout: a stacked bar can't label its own parts, and a hover-only
          breakdown is a breakdown nobody reads. */}
      <div className="mt-3 flex flex-col">
        {segments.map((segment, index) => (
          <div key={segment.key} className={cn("flex min-w-0 items-center gap-2.5 py-1.5", index > 0 && "border-t border-[var(--border-hairline)]")}>
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: segment.tone }} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)]">{segment.label}</span>
            <span className="font-mono shrink-0 text-[12px] text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">
              {Math.round((segment.count / total) * 100)}%
            </span>
            <span className="font-mono w-6 shrink-0 text-right text-[13px] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {segment.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// `FlagFigures` (three big counts, each "n of 18", in a row) drew Data Exposure until the flags
// gained their lifecycle split. Three counts with no second dimension left two thirds of the tile
// empty and answered nothing a committee could act on; the flags are `HorizontalBars` now, stacked by
// where each record sits. Deleted rather than kept warm — nothing else was drawing it.

// A cross-tabulation: one measure counted across two dimensions at once, with the cells that
// break a rule marked.
//
// A pair of separate breakdowns — risk levels in one tile, oversight levels in another — cannot
// answer the only question worth asking of them, which is whether the two line up. That answer
// lives in the cells, so the cells have to exist.
export function MatrixTable({
  columns,
  rows,
  corner,
}: {
  columns: string[];
  rows: { key: string; label: string; cells: { key: string; count: number; flagged?: boolean; tip?: string }[] }[];
  // Names what the row labels are, so the top-left cell isn't blank.
  corner: string;
}) {
  if (!rows.length) return <TileEmpty />;
  return (
    // Fixed layout: with `auto`, the three oversight columns sized themselves to their headers
    // ("On exceptions" is twice the width of "None") so the figures under them landed at three
    // different distances from the row label and the grid stopped reading as a grid.
    <table className="w-full table-fixed border-collapse text-left">
      <colgroup>
        <col />
        {columns.map((column) => (
          <col key={column} className="w-[96px]" />
        ))}
        <col className="w-[76px]" />
      </colgroup>
      <thead>
        <tr>
          <th className="border-b border-[var(--border-hairline)] pb-2 text-[11px] font-medium text-[var(--text-muted)]">{corner}</th>
          {columns.map((column) => (
            <th
              key={column}
              className="border-b border-[var(--border-hairline)] pb-2 pl-4 text-right text-[11px] font-medium text-[var(--text-muted)]"
            >
              {column}
            </th>
          ))}
          <th className="border-b border-[var(--border-hairline)] pb-2 pl-4 text-right text-[11px] font-medium text-[var(--text-muted)]">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-[var(--border-hairline)] last:border-b-0">
            <td className="py-2.5 text-[13px] text-[var(--text-body)]">{row.label}</td>
            {row.cells.map((cell) => (
              <td
                key={cell.key}
                data-tip={cell.tip}
                // A flagged cell carries the warning tone and a tinted fill. A zero in a flagged
                // position is still drawn plainly — the rule isn't broken if nothing is in it.
                className="font-mono py-2.5 pl-4 text-right text-[13px] [font-variant-numeric:tabular-nums]"
                style={
                  cell.flagged && cell.count > 0
                    ? { color: "var(--tone-warning-fg)", background: "var(--tone-warning-bg)", fontWeight: 600 }
                    : { color: cell.count > 0 ? "var(--text-primary)" : "var(--text-faint)" }
                }
              >
                {cell.count || "—"}
              </td>
            ))}
            <td className="font-mono py-2.5 pl-4 text-right text-[13px] font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {row.cells.reduce((sum, cell) => sum + cell.count, 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Status as a dot and a word, the way a dense list wants it: four filled pills down a
// column read as four buttons, and the colour is doing the work anyway.
export function StatusDot({ label, tone }: { label: string; tone: "good" | "warn" | "bad" | "quiet" }) {
  const colour =
    tone === "good"
      ? "var(--status-success)"
      : tone === "warn"
        ? "var(--tone-warning-fg)"
        : tone === "bad"
          ? "var(--tone-danger-fg)"
          : "var(--text-faint)";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px]" style={{ color: colour }}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: colour }} />
      {label}
    </span>
  );
}

// `TargetRow` (a KPI's measured value against its target) lived here while every one of
// the ten production targets was printed. Only the misses are named now — the two that
// are behind, written out in `portfolio/page.tsx` as "62% against 70%", because "62% of
// 70%" reads as a fraction of a fraction and nobody parses it as a target.

// Six months of a measure, at the size of a word. Inline SVG rather than a chart
// runtime: there is no axis to label, and the shape *is* the whole point.
export function Sparkline({
  values,
  colour = "var(--accent)",
  width = 64,
  height = 20,
}: {
  values: number[];
  colour?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const step = (width - 2) / (values.length - 1);
  const points = values.map((value, index) => `${1 + index * step},${height - 2 - ((value - low) / span) * (height - 4)}`);
  const last = points[points.length - 1].split(",");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      {/* 0.7, up from 0.55: at 1.5px in the accent green, a 55% line beside a 26px figure
          read as a smudge rather than as the same measure drawn small. */}
      <polyline points={points.join(" ")} fill="none" stroke={colour} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <circle cx={last[0]} cy={last[1]} r={2} fill={colour} />
    </svg>
  );
}

export type Stat = {
  label: string;
  value: string;
  // The bar this number has to clear, printed beside it. Only where a target is
  // really committed to — an invented one is worse than none.
  target?: string;
  // The one-line "compared to what" under the number.
  delta?: string;
  // Colours that line: good, needs-attention, or plain.
  deltaTone?: "good" | "warn";
  icon?: ReactNode;
  // Six-month shape of the same measure, drawn beside the number.
  trend?: number[];
  // What the sparkline spans ("Feb → Jul"). A trend line with no stated baseline
  // invites the reader to assume one.
  trendLabel?: string;
  tip?: string;
};

// The headline row: four numbers, divided by rules rather than by gaps, because
// they're one statement about the portfolio and not four separate cards. Each cell is
// a glyph and a label, the number, then what it's measured against — read top to
// bottom, in the same three sizes every time.
export function StatBand({ items, layout = "row" }: { items: Stat[]; layout?: "row" | "grid" }) {
  return (
    // Three or four cells, from the length. Both tabs ran four until every one of the eight
    // turned out to be restated in the summary sentence directly below the band — so each
    // dropped the one whose detail was also *drawn* below it, and the band has to divide
    // evenly either way.
    <section
      className={cn(
        cardClass(),
        "grid grid-cols-2",
        // `grid` keeps two columns at every width, so four cells stay a 2x2 block — which is what
        // lets the band sit beside a tall tile instead of running the full page width under it.
        layout === "grid"
          ? null
          : // Six cells wrap to three-and-three on a narrow window rather than shrinking to a strip
            // of unreadable columns.
            items.length === 6
            ? "sm:grid-cols-3 lg:grid-cols-6"
            : items.length === 3
              ? "sm:grid-cols-3"
              : "sm:grid-cols-4",
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          data-tip={item.tip}
          className={cn(
            "flex min-w-0 flex-col gap-2 px-5 py-4",
            // In the 2x2 block the band stretches to match the tile beside it, and the three lines
            // sat at the top of each cell with the slack pooled underneath — four cells each with an
            // empty bottom third. Centring only moved the pool; the height is real, so the cell
            // spends it: deeper padding first, then `justify-between` opens the label → figure →
            // delta gaps evenly. A stretched cell reads as a roomy one rather than a half-filled one.
            layout === "grid" && "justify-between gap-3 py-6",
            // Hairlines between cells, and none on the leading edge of a row.
            index % 2 === 1 && "border-l border-[var(--border-hairline)]",
            index >= 2 && (layout === "grid" ? "border-t border-[var(--border-hairline)]" : "border-t border-[var(--border-hairline)] sm:border-t-0"),
            layout !== "grid" && index >= 1 && "sm:border-l sm:border-[var(--border-hairline)]",
            // In the six-cell layout the second row starts a new run, so its leading cell drops
            // the left rule and the row gains a top one.
            items.length === 6 && index === 3 && "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0",
            items.length === 6 && index >= 3 && "sm:border-t sm:border-[var(--border-hairline)] lg:border-t-0",
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--text-label)]">
            {item.icon ? <span className="shrink-0 text-[var(--text-faint)]">{item.icon}</span> : null}
            <span className="truncate">{item.label}</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            {/* Sans, not the display serif: Fraunces sets figures with old-style
                numerals, so "$1.79M" and "8/10" came out uneven and slightly wrong at
                a glance. Tabular so a row of cells lines up. */}
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {item.value}
              </span>
              {item.target ? <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">{item.target}</span> : null}
            </span>
            {item.trend ? <Sparkline values={item.trend} /> : null}
          </div>
          {item.delta || item.trendLabel ? (
            <div className="font-mono flex items-baseline justify-between gap-2 text-[11px]">
              <span
                className="min-w-0 truncate"
                style={{
                  color:
                    item.deltaTone === "good" ? "var(--status-success)" : item.deltaTone === "warn" ? "var(--tone-warning-fg)" : "var(--text-muted)",
                }}
              >
                {item.delta}
              </span>
              {item.trendLabel ? <span className="shrink-0 text-[var(--text-faint)]">{item.trendLabel}</span> : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

// `BarList` (label · mono value · bar beneath) lived here until the three phase tiles
// became one table. Nothing draws a list of bars any more, so it's gone rather than
// kept warm — the phase bar is a `ProgressBar` in a grid cell in `portfolio/page.tsx`,
// and shares of a whole are a `StackedMeter`.

// A small population split into a few groups: one row each, the count, and a bar to
// compare lengths against. Two things were tried and dropped here — a stacked bar with a
// legend under it (which stated the split twice, once as lengths and once as
// percentages), and a dot per record (which, laid out in rows, is a bar chart drawn less
// legibly). A row per group with its own bar is the plain answer, and the share is left
// off because the bar already is the share.
export function GroupBars({ groups }: { groups: { key: string; label: string; colour: string; count: number; tip?: string }[] }) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  if (!total) return <TileEmpty />;
  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <div key={group.key} data-tip={group.tip} className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: group.colour }} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)]">{group.label}</span>
            <span className="font-mono shrink-0 text-[12px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {group.count}
            </span>
          </div>
          <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <span className="block h-full rounded-full" style={{ width: `${(group.count / total) * 100}%`, background: group.colour }} />
          </span>
        </div>
      ))}
    </div>
  );
}

// A measure across a handful of named columns, drawn as bars with the figure above each
// one. Two things earn this over a table row: height is comparable at a glance in a way
// a column of mono figures isn't, and it gives a shared x-axis that another band can be
// stacked on (see `phase-flow.tsx`, where a funnel sits over these columns and both use
// this label row).
//
// No gridlines: every bar prints its own value, so a scale to read against would be
// scaffolding for a number already written down.
export function ColumnChart({
  columns,
  // 160, not 92: at a tile's full width, six columns 92px tall are wider than they are
  // high, and a bar that reads as a wide slab stops carrying its own height.
  height = 160,
  // Flat, not a vertical gradient. The gradient was pale at the top and accent at the
  // bottom, which put a soft edge exactly where the bar's value is read and made a row of
  // bars look lit from below — this product has no elevation anywhere else (every
  // `--shadow-*` is `none`), so a gradient was the one glossy thing on the page.
  fill = "var(--accent)",
  series,
}: {
  // `label` is a node, not a string, so the caller can hang a link and a second line
  // under each column without this component knowing what they are. `values` is a list
  // because a column can hold a pair — see "Spend and Return", where the two bars are
  // what a state cost and what it returns.
  columns: { key: string; label: ReactNode; values: number[]; displays: ReactNode[]; tip?: string }[];
  height?: number;
  fill?: string;
  // One entry per bar within a column. Given, it colours the bars and draws the legend;
  // omitted, every bar takes `fill` and there is nothing to name.
  series?: { name: string; fill: string }[];
}) {
  if (!columns.length) return <TileEmpty />;
  const most = Math.max(1, ...columns.flatMap((column) => column.values));
  // The figure above the tallest bar has to sit somewhere, so the plot keeps 18px back
  // for it — otherwise the top label is clipped by the box's own padding.
  const plot = height - 18;
  const barHeight = (value: number) =>
    // A measured zero still gets a hairline of a bar, so the column reads as "nearly
    // none" rather than "no data" — that distinction is the `displays` string's job
    // ("—" where there's nothing to measure).
    value > 0 ? Math.max(2, (value / most) * plot) : 0;

  return (
    <div className="min-w-0">
      {/* No gap between the columns themselves, only inside a pair. A single bar caps at
          72px and a paired one at 56px, so four groups of two don't merge into eight
          neighbours — the tight gap inside a pair against the wide space between pairs is
          what makes a group read as a group. */}
      <div className="flex items-end" style={{ height }}>
        {columns.map((column) => (
          <div key={column.key} data-tip={column.tip} className="flex min-w-0 flex-1 items-end justify-center gap-1">
            {column.values.map((value, position) => (
              <div
                key={series?.[position]?.name ?? position}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5",
                  column.values.length > 1 ? "max-w-[56px]" : "max-w-[72px]",
                )}
              >
                <span className="font-mono text-[11px] text-[var(--text-body)] [font-variant-numeric:tabular-nums]">{column.displays[position]}</span>
                <span
                  aria-hidden
                  className="w-full rounded-t-[4px]"
                  style={{ height: `${barHeight(value)}px`, background: series?.[position]?.fill ?? fill }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* The baseline is a shade stronger than a hairline: it's an axis the bars stand on,
          and at `--border-hairline` it read as one more divider in a page full of them. */}
      <div className="flex border-t border-[var(--border-default)] pt-2.5">
        {columns.map((column) => (
          <div key={column.key} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 text-center">
            {column.label}
          </div>
        ))}
      </div>
      {/* Under the plot, not over it: a legend is what you consult once you've looked, so
          above the bars it was the first thing read and the last thing needed. */}
      {series ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
          {series.map((entry) => (
            <span key={entry.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: entry.fill }} />
              {entry.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// A ranking: one measure across named categories, longest first. Rows rather than columns,
// because two column charts in sequence read as one chart drawn twice — and because six
// category names of real length ("Supply Chain") get a whole line here instead of being
// centred and truncated under a 88px column.
//
// The bar is capped well short of the row, so the track is a scale rather than the slab of
// grey that sank the earlier full-width version of this shape. Label left, bar, figure
// right — the same row as `ScorePanel`'s parts, which is the pattern this page already uses
// for "a few named things, one number each".
// One band, split by share, each segment carrying its own name and figure.
//
// Three shapes were tried here before this one and each was rejected for the same underlying
// reason: a list of rows, one measure each, is a list — a pill on a grey rail read as six
// things loading, a flat filled bar as six green slabs, and a hairline-and-dot plot as too
// little to look at. The measure itself is the problem: eight values between 8% and 17% of a
// total have almost no spread to draw, so anything that ranks them side by side is six or
// eight near-identical lengths.
//
// A band answers a different question, and the one actually being asked — not "which is
// biggest" (the figures say that, and the top four are within a point of each other) but "how
// is the money split". It is also the language the funnel above it already speaks: a solid
// filled shape, a single-hue ramp, labels inside. `ShareBand` requires that the segments *are*
// the whole; pass a truncated list and the shares are a lie.
// A shade per cell, darkest for the largest.
//
// The range is not a taste choice — it's the widest one the ink allows. `--accent-strong` on
// `--accent-ring` measures 4.5:1, exactly the floor for text this size, and on `--accent-soft`
// 8.7:1. So those two are the ends, and anything darker than `--accent-ring` would need white
// ink, which is what broke the first three attempts at this: a ramp wide enough to see, with one
// ink colour, has a middle where neither white nor dark is readable.
//
// Ordered by the cell's place in the whole list rather than within its row, so the shade keeps
// falling left-to-right, top-to-bottom instead of restarting on the second row.
const cellFill = (position: number) => `color-mix(in srgb, var(--accent-ring) ${Math.round((1 - position) * 100)}%, var(--accent-soft))`;

// Split the sorted segments into `rows` bands, each taking about an equal share of the total.
// A band closes once it's nearer its share with the current segment than it would be with the
// next one, so the greedy pass doesn't always overshoot — and never before every remaining band
// has a segment left to fill it.
function splitIntoBands<T extends { value: number }>(segments: T[], rows: number): T[][] {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const target = total / rows;
  const bands: T[][] = [];
  let current: T[] = [];
  let running = 0;

  segments.forEach((segment, index) => {
    current.push(segment);
    running += Math.max(0, segment.value);
    const left = segments.length - index - 1;
    const next = segments[index + 1];
    const bandsLeft = rows - bands.length - 1;
    if (bandsLeft > 0 && left > bandsLeft && running >= target - (next ? Math.max(0, next.value) / 2 : 0)) {
      bands.push(current);
      current = [];
      running = 0;
    }
  });
  if (current.length) bands.push(current);
  return bands;
}

export function ShareMosaic({
  segments,
  height = 196,
  rows = 2,
}: {
  // Sorted largest-first by the caller. `value` must be the whole of what's being split — the
  // areas are shares, so a truncated list states shares that aren't true.
  segments: { key: string; label: string; display: string; meta?: string; value: number; tip?: string }[];
  height?: number;
  rows?: number;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (!total) return <TileEmpty />;
  const bands = splitIntoBands(segments, Math.max(1, Math.min(rows, segments.length)));
  // Each cell's place in the full list, so its shade doesn't restart at the second row.
  const rank = new Map(segments.map((segment, index) => [segment.key, segments.length > 1 ? index / (segments.length - 1) : 0]));

  return (
    // Two rows of cells rather than one strip of eight. A single row gave every cell the same
    // height, so eight near-equal values became eight near-identical uprights and the tile had
    // no form; on two rows the cells differ in both dimensions and the biggest reads top-left.
    //
    // Area stays exactly proportional: a row is as tall as its own share of the total, and a
    // cell as wide as its share within that row, so (value / rowSum) × (rowSum / total) is
    // value / total.
    <div className="flex w-full flex-col overflow-hidden rounded-[8px]" style={{ height }}>
      {bands.map((band, bandIndex) => {
        const bandTotal = band.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
        return (
          <div
            key={band[0].key}
            className={cn("flex min-h-0 min-w-0", bandIndex < bands.length - 1 && "border-b border-[var(--surface)]")}
            style={{ height: `${(bandTotal / total) * 100}%` }}
          >
            {band.map((segment, index) => (
              <div
                key={segment.key}
                data-tip={segment.tip}
                // Gaps in the surface colour, so the cells read as separate areas of one whole
                // rather than as a grid of cards.
                className={cn("flex min-w-0 flex-col justify-center gap-1.5 px-3", index < band.length - 1 && "border-r border-[var(--surface)]")}
                style={{ width: `${(Math.max(0, segment.value) / bandTotal) * 100}%`, background: cellFill(rank.get(segment.key) ?? 0) }}
              >
                {/* Told apart by size and case, not opacity: 12px semibold over 13px mono over
                    11px mono was three near-identical lines, and dimming one of them cost
                    contrast for a hierarchy that size and case give for free. The sum is the
                    figure anyone reads, so it gets to be one. */}
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--accent-strong)]">{segment.label}</span>
                <span className="font-mono truncate text-[19px] font-semibold leading-none text-[var(--accent-strong)] [font-variant-numeric:tabular-nums]">
                  {segment.display}
                </span>
                {segment.meta ? (
                  <span className="font-mono truncate text-[11px] leading-none text-[var(--accent-strong)] [font-variant-numeric:tabular-nums]">
                    {segment.meta}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// `SplitBars` (two full-width horizontal bars per row, one measure each) lived here for
// exactly one revision of "Spend and Return". Four states became eight tracks stacked down
// the tile, each one 1700px of grey encoding a 64% fill — the empty part of the track was
// the largest thing in the tile. The same pairs are `ColumnChart` columns now: two bars in
// one group, at the width the number deserves.

// A row of small bars either side of a zero line: each one a measure's distance from the
// thing it was supposed to hit, up for over and down for under.
//
// This replaced a list that named only the misses. The list was honest but partial — two rows
// saying "behind", with the eight that are fine invisible, so the block never showed that most
// targets are met or by how much. A baseline puts all of them in one object: the shortfalls
// are the bars below the line, and you count them without reading.
//
// Deliberately unlabelled. Ten KPI names, each belonging to a record ("manual touches
// removed — Claims Triage Assistant"), cannot be written under a 40px bar; the shape answers
// "how many, and how far", and the hover answers "which".
export function DeviationBars({
  items,
  height = 104,
}: {
  // `offset` is signed and relative — +0.12 is 12% over target. The bars scale to the largest
  // magnitude in either direction, so a set that's all near target still shows its spread.
  items: { key: string; offset: number; tip?: string }[];
  height?: number;
}) {
  if (!items.length) return <TileEmpty />;
  const furthest = Math.max(0.01, ...items.map((item) => Math.abs(item.offset)));
  // Half the box each way, less a little, so the longest bar doesn't run into the edge.
  const arm = height / 2 - 8;

  return (
    <div className="relative min-w-0" style={{ height }}>
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border-default)]" />
      <div className="relative flex h-full items-center gap-1.5">
        {items.map((item) => {
          const over = item.offset >= 0;
          return (
            <span key={item.key} data-tip={item.tip} className="relative flex h-full min-w-0 flex-1 items-center">
              <span
                aria-hidden
                className={cn("absolute left-0 w-full", over ? "bottom-1/2 rounded-t-[3px]" : "top-1/2 rounded-b-[3px]")}
                style={{
                  height: `${Math.max(2, (Math.abs(item.offset) / furthest) * arm)}px`,
                  background: over ? "var(--accent)" : "var(--tone-warning-fg)",
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

// One weak link, marked. Banding by threshold put 75% in warning ochre and 80% in the
// accent — a hue change for five points, which reads as "one of these is broken" rather
// than "this one is lowest". And because the accent and the success green are the same
// family, 80% and 100% looked identical anyway, so the three bands were really two.
// The measure that is actually lowest carries the warning tone; the rest are the accent.
const bandColour = (ratio: number, weakest: number) => (ratio === weakest ? "var(--tone-warning-fg)" : "var(--accent)");

// `ScoreDial` — a hand-drawn SVG ring — lived here through three revisions (four segments, then a
// flat bar, then one continuous stroked arc). It is `ScoreRadial` now, shadcn's radial-shape chart:
// the same reading, but with a real end cap, a real track ring and the figure placed by the chart
// rather than by an absolutely-positioned span fighting the ring for the centre.

// The tone of a composite, shared by the arc and its verdict pill so they can't disagree.
const scoreTone = (score: number) =>
  score >= 0.95
    ? { fg: "var(--tone-success-fg)", bg: "var(--tone-success-bg)", border: "var(--tone-success-border)" }
    : score >= 0.7
      ? { fg: "var(--accent-strong)", bg: "var(--accent-soft)", border: "var(--accent-border)" }
      : { fg: "var(--tone-warning-fg)", bg: "var(--tone-warning-bg)", border: "var(--tone-warning-border)" };

// A composite score, with the things it is made of underneath: one number on its own
// hides its own reasoning, and a leader's first question is "made of what?".
export function ScorePanel({
  score,
  parts,
  caption,
  scale = "percent",
}: {
  score: number;
  // No weight column. A composite's weights still have to be public — a number nobody can argue
  // with is the opposite of useful here — but this tile is half of a two-up grid, so the measures
  // get ~290px of it, and label + weight + bar + figure does not fit on one line in that. Printed
  // in the row, the weight either truncated the label or wrapped and made every row three lines
  // tall. The caller states them once in the tile's footer instead, where they read as one sentence.
  parts: { label: string; ratio: number }[];
  caption?: string;
  // A composite out of 100 points prints its denominator; a mean of ratios prints a per cent.
  scale?: "percent" | "points";
}) {
  const weakest = Math.min(...parts.map((part) => part.ratio));
  const tone = scoreTone(score);

  return (
    // The dial keeps its own column, ruled off from the measures. Side by side with nothing between
    // them, the arc and the first bar read as one row that happened to start with a circle.
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch sm:gap-5">
      <div className="flex shrink-0 flex-col items-center justify-center gap-3 sm:w-[158px] sm:border-r sm:border-[var(--border-hairline)] sm:pr-5">
        <ScoreRadial score={score} figure={`${Math.round(score * 100)}${scale === "percent" ? "%" : ""}`} colour={tone.fg} />
        {caption ? (
          <span
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize leading-none"
            style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
          >
            {caption}
          </span>
        ) : null}
      </div>
      {/* One line a measure, ruled off from each other. A grid, not a flex row, and the width goes to
          the *bar*: the label column is `auto`, so it sizes to the longest of the four and every bar
          starts at the same x. The reverse — a `1fr` label and a fixed bar — is what the first pass
          did, and it left a chasm between "Flow health" and a stub of a bar pinned to the right edge.
          `minmax(0,auto)` rather than plain `auto` so the label can still truncate if a longer measure
          is ever added; `data-tip` carries the full name, the contract the dense lists here use. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {parts.map((part, index) => (
          <div
            key={part.label}
            data-tip={part.label}
            className={cn(
              "grid min-w-0 grid-cols-[minmax(0,auto)_minmax(56px,1fr)_34px] items-center gap-3 py-2.5",
              index > 0 && "border-t border-[var(--border-hairline)]",
            )}
          >
            <span className="min-w-0 truncate text-[13px] text-[var(--text-body)]">{part.label}</span>
            {/* h-2, matching `RankedBars` and `GroupBars`. Three bar heights across one page
                (1.5, 2, 2) is the kind of drift nobody names but everybody sees. */}
            <span className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, part.ratio)) * 100)}%`, background: bandColour(part.ratio, weakest) }}
              />
            </span>
            <span
              className="font-mono text-right text-[12px] font-medium [font-variant-numeric:tabular-nums]"
              style={{ color: part.ratio === weakest ? "var(--tone-warning-fg)" : "var(--text-primary)" }}
            >
              {Math.round(part.ratio * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// A capped list with an honest overflow line: the page scrolls as one column, so no
// tile owns a scrollbar, and a truncated list has to say it was truncated.
export function MiniList({ rows, max = 5, more }: { rows: { key: string; node: ReactNode }[]; max?: number; more?: (hidden: number) => string }) {
  const shown = rows.slice(0, max);
  const hidden = rows.length - shown.length;
  return (
    <div className="flex flex-col">
      {shown.map((row, index) => (
        <div key={row.key} className={cn("min-w-0 py-2.5", index > 0 && "border-t border-[var(--border-hairline)]")}>
          {row.node}
        </div>
      ))}
      {hidden > 0 ? (
        <div className="border-t border-[var(--border-hairline)] pt-2.5 text-[12px] text-[var(--text-muted)]">
          {more ? more(hidden) : `and ${hidden} more`}
        </div>
      ) : null}
      {!rows.length ? <div className="py-1 text-[13px] text-[var(--text-muted)]">Nothing here right now.</div> : null}
    </div>
  );
}
