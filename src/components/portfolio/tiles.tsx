"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/document-record/markdown";

import { cardClass } from "@/components/ui/kit";
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
    // Told apart from a tile by quiet things rather than one loud one: a softer hairline
    // instead of the tiles' full border, no rule under the header (a passage doesn't need
    // its title boxed off), a tracked-caps label rather than a tile's noun, and the muted
    // fill. Not by size — a 15px override made it the only thing on the page above the
    // 13px tile rows, and 2px of extra height reads as a different app rather than a
    // different kind of block. The prose keeps `Markdown`'s own 14px, which is what the
    // record's problem statement and the risk summary are set in. Not the serif reading
    // face either: it was tried, and it made three lines of figures harder to read.
    // Padding moved off the box and onto the two halves, so the rule between them runs the full
    // width of the card the way a tile's header rule does. Inset by the box's own padding it
    // stopped 20px short at each end, which reads as a rule someone forgot to finish rather
    // than as a header being ruled off.
    <section className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--surface-muted)]">
      {/* Ruled off like a tile's header. This deliberately had no rule — the reasoning was that
          a passage of prose doesn't need its title boxed off — but a summary sitting in a column
          of tiles that all rule their headers was the one card built differently, and that read
          as an oversight rather than as a distinction. The muted fill and the glyph are enough
          to mark it as something written. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--border-hairline)] px-5 py-3">
        <h3 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">
          <Sparkles size={13} className="text-[var(--accent)]" />
          {title}
        </h3>
        {meta ? <span className="font-mono text-[11px] text-[var(--text-muted)]">{meta}</span> : null}
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
  children,
  footer,
  className,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(cardClass(), "min-w-0 rounded-[12px]", className)}>
      {/* Sans and 13px, not the display serif: eight serif headings down a page of
          figures read as eight article titles and buried the data they introduce.
          The rule under the header stays on every tile, including the ones whose content is a
          drawn shape — it was briefly made optional for those and put back: a header that is
          ruled off on some tiles and not others reads as two kinds of card. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--border-hairline)] px-5 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h3>
        {hint ? <span className="text-[12px] text-[var(--text-muted)]">{hint}</span> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer ? <div className="border-t border-[var(--border-hairline)] px-5 py-2.5 text-[11px] text-[var(--text-muted)]">{footer}</div> : null}
    </section>
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
export function StatBand({ items }: { items: Stat[] }) {
  return (
    // Three or four cells, from the length. Both tabs ran four until every one of the eight
    // turned out to be restated in the summary sentence directly below the band — so each
    // dropped the one whose detail was also *drawn* below it, and the band has to divide
    // evenly either way.
    <section className={cn(cardClass(), "grid grid-cols-2", items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
      {items.map((item, index) => (
        <div
          key={item.label}
          data-tip={item.tip}
          className={cn(
            "flex min-w-0 flex-col gap-2 px-5 py-4",
            // Hairlines between cells, and none on the leading edge of a row.
            index % 2 === 1 && "border-l border-[var(--border-hairline)]",
            index >= 2 && "border-t border-[var(--border-hairline)] sm:border-t-0",
            index >= 1 && "sm:border-l sm:border-[var(--border-hairline)]",
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
                className={cn("flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5", column.values.length > 1 ? "max-w-[56px]" : "max-w-[72px]")}
              >
                <span className="font-mono text-[11px] text-[var(--text-body)] [font-variant-numeric:tabular-nums]">{column.displays[position]}</span>
                <span aria-hidden className="w-full rounded-t-[4px]" style={{ height: `${barHeight(value)}px`, background: series?.[position]?.fill ?? fill }} />
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
                className={cn(
                  "flex min-w-0 flex-col justify-center gap-1.5 px-3",
                  index < band.length - 1 && "border-r border-[var(--surface)]",
                )}
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

// A composite score as one arc, with the four measures it averages beside it.
//
// Two earlier attempts and what was wrong with each: a ring cut into four segments, where
// a quarter-arc at 75% is barely distinguishable from a full one and the gaps read as a
// broken ring; and a flat bar, which is legible but says "another row" on a page already
// made of rows. One continuous arc is the right shape for one number — the gap at the end
// *is* the shortfall, and 17% of a circle is a thing you can see without reading.
function ScoreDial({ score, caption, colour }: { score: number; caption?: string; colour: string }) {
  const size = 132;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.max(0, Math.min(1, score));

  return (
    <span className="relative inline-flex shrink-0">
      {/* Rotated so it starts at twelve o'clock, and round-capped: at 83% the cap reads as
          the end of a measure rather than a cut. */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-strong)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="text-[30px] font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
          style={{ color: "var(--text-primary)" }}
        >
          {Math.round(score * 100)}%
        </span>
        {caption ? <span className="text-[11px] leading-none text-[var(--text-muted)]">{caption}</span> : null}
      </span>
    </span>
  );
}

// A composite score, with the things it is made of underneath: one number on its own
// hides its own reasoning, and a leader's first question is "made of what?".
export function ScorePanel({ score, parts, caption }: { score: number; parts: { label: string; ratio: number }[]; caption?: string }) {
  const weakest = Math.min(...parts.map((part) => part.ratio));
  const scoreColour = score >= 0.95 ? "var(--status-success)" : score >= 0.7 ? "var(--accent)" : "var(--tone-warning-fg)";

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
      <ScoreDial score={score} caption={caption} colour={scoreColour} />
      <div className="min-w-0 flex-1 self-stretch">
        {parts.map((part) => (
          <div key={part.label} className="flex min-w-0 items-center gap-3 border-t border-[var(--border-hairline)] py-2.5 first:border-t-0">
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)]">{part.label}</span>
            {/* h-2, matching `RankedBars` and `GroupBars`. Three bar heights across one page
                (1.5, 2, 2) is the kind of drift nobody names but everybody sees. */}
            <span className="relative h-2 w-[38%] max-w-[150px] shrink-0 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, part.ratio)) * 100)}%`, background: bandColour(part.ratio, weakest) }}
              />
            </span>
            <span
              className="font-mono w-9 shrink-0 text-right text-[12px] font-medium [font-variant-numeric:tabular-nums]"
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
