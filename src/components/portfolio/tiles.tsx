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
    <section className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-muted)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--border-hairline)] px-5 py-3">
        <h3 className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
          <Sparkles size={13} className="text-[var(--accent)]" />
          {title}
        </h3>
        {meta ? <span className="text-[12px] text-[var(--text-muted)]">{meta}</span> : null}
      </div>
      <div className="px-5 py-4">
        <Markdown source={source} className="max-w-[86ch]" />
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
          figures read as eight article titles and buried the data they introduce. */}
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
    tone === "good" ? "var(--status-success)" : tone === "warn" ? "var(--tone-warning-fg)" : tone === "bad" ? "var(--tone-danger-fg)" : "var(--text-faint)";
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
export function Sparkline({ values, colour = "var(--accent)", width = 64, height = 20 }: { values: number[]; colour?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const step = (width - 2) / (values.length - 1);
  const points = values.map((value, index) => `${1 + index * step},${height - 2 - ((value - low) / span) * (height - 4)}`);
  const last = points[points.length - 1].split(",");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      <polyline points={points.join(" ")} fill="none" stroke={colour} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
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
    <section className={cn(cardClass(), "grid grid-cols-2 sm:grid-cols-4")}>
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
            <span className="font-mono shrink-0 text-[12px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{group.count}</span>
          </div>
          <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <span className="block h-full rounded-full" style={{ width: `${(group.count / total) * 100}%`, background: group.colour }} />
          </span>
        </div>
      ))}
    </div>
  );
}

// Where a measure sits: full marks, comfortable, or dragging. Four bars in one colour
// made 100% and 75% look like the same news, which is the one thing a composite has to
// tell you — so the fill carries the band and the eye finds the weak row first.
function bandColour(ratio: number) {
  if (ratio >= 0.95) return "var(--status-success)";
  if (ratio >= 0.8) return "var(--accent)";
  return "var(--tone-warning-fg)";
}

// The dial, drawn as the thing it's a score of: one arc per measure, a quarter of the
// circle each because they're evenly weighted, filled to its own level in its own band
// colour. A single sweeping donut was decoration — it restated the number in its middle
// and said nothing the rows didn't, and at a stroke heavy enough to read it dominated
// the tile. Four arcs make the weighting visible and the weak quarter obvious.
function PulseDial({ score, parts, caption }: { score: number; parts: { label: string; ratio: number }[]; caption?: string }) {
  const size = 108;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // A slot per measure, minus a gap so the arcs read as four things and not one ring.
  const gap = 7;
  const slot = circumference / parts.length;
  const arc = slot - gap;

  return (
    <span className="flex shrink-0 flex-col items-center justify-center">
      <span className="relative inline-flex">
        {/* Rotated so the first measure starts at twelve o'clock and they run clockwise
            in the same order as the rows beside them. Butt caps, not round: at this
            stroke a rounded cap on a nearly-empty arc renders as a stray pill. */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {parts.map((part, index) => {
            const filled = arc * Math.max(0, Math.min(1, part.ratio));
            const offset = -index * slot;
            return (
              <g key={part.label} data-tip={`${part.label} · ${Math.round(part.ratio * 100)}%`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--surface-strong)"
                  strokeWidth={stroke}
                  strokeDasharray={`${arc} ${circumference - arc}`}
                  strokeDashoffset={offset}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={bandColour(part.ratio)}
                  strokeWidth={stroke}
                  strokeDasharray={`${filled} ${circumference - filled}`}
                  strokeDashoffset={offset}
                />
              </g>
            );
          })}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {Math.round(score * 100)}%
          </span>
          {caption ? <span className="text-[11px] leading-none text-[var(--text-muted)]">{caption}</span> : null}
        </span>
      </span>
    </span>
  );
}

// A composite score, with the things it is made of underneath: one number on its own
// hides its own reasoning, and a leader's first question is "made of what?".
export function ScorePanel({ score, parts, caption }: { score: number; parts: { label: string; ratio: number }[]; caption?: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
      <PulseDial score={score} parts={parts} caption={caption} />
      {/* Hairline rows, and the bar takes whatever width is left: a fixed 64px bar
          stranded the percentages a long way from their labels. */}
      <div className="min-w-0 flex-1">
        {parts.map((part, index) => (
          <div key={part.label} className="flex min-w-0 items-center gap-3 border-t border-[var(--border-hairline)] py-2 first:border-t-0 sm:py-2.5">
            {/* The index is what ties a row to its arc: two measures can land in the same
                colour band, so colour alone doesn't identify which quarter is which. */}
            <span className="font-mono shrink-0 text-[11px] text-[var(--text-faint)]">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)]">{part.label}</span>
            <span className="relative h-1.5 w-[38%] max-w-[160px] shrink-0 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, part.ratio)) * 100)}%`, background: bandColour(part.ratio) }}
              />
            </span>
            <span
              className="font-mono w-9 shrink-0 text-right text-[12px] font-medium [font-variant-numeric:tabular-nums]"
              style={{ color: bandColour(part.ratio) }}
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
