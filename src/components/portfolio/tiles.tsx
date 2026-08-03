"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/document-record/markdown";

import { ProgressBar, ProgressRing, cardClass } from "@/components/ui/kit";
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
export function SummaryPanel({ title, source, meta }: { title: string; source: string; meta?: string }) {
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
  // First column is the label (left, sans); the rest are figures (right, mono).
  columns: string[];
  rows: { key: string; label: ReactNode; values: ReactNode[]; tip?: string }[];
}) {
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
          <tr key={row.key} data-tip={row.tip}>
            <td className="border-b border-[var(--border-hairline)] py-2.5 text-[13px] text-[var(--text-body)]">{row.label}</td>
            {row.values.map((value, index) => (
              <td key={index} className="font-mono border-b border-[var(--border-hairline)] py-2.5 pl-4 text-right text-[13px] text-[var(--text-primary)]">
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

// A measured value against its target. No bar: every production KPI sits within a few
// points of its target, so a proportional bar was full for all of them and said
// nothing. The gap is the fact, so the gap is what's drawn.
export function TargetRow({
  name,
  actual,
  target,
  unit,
  met,
}: {
  name: string;
  actual: number;
  target: number;
  unit: string;
  met: boolean;
}) {
  const delta = Math.round((actual - target) * 10) / 10;
  return (
    <div className="flex min-w-0 items-baseline gap-3 border-t border-[var(--border-hairline)] py-2 first:border-t-0">
      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)]">{name}</span>
      <span className="font-mono shrink-0 text-[13px] font-medium text-[var(--text-primary)]">
        {actual}
        {unit}
      </span>
      <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">
        {target}
        {unit}
      </span>
      <span
        className="font-mono w-[52px] shrink-0 text-right text-[11px] font-medium"
        style={{ color: met ? "var(--status-success)" : "var(--tone-warning-fg)" }}
      >
        {delta > 0 ? "+" : ""}
        {delta}
        {unit}
      </span>
    </div>
  );
}

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
  // The one-line "compared to what" under the number.
  delta?: string;
  // Colours that line: good, needs-attention, or plain.
  deltaTone?: "good" | "warn";
  icon?: ReactNode;
  // Six-month shape of the same measure, drawn beside the number.
  trend?: number[];
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
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {item.value}
            </span>
            {item.trend ? <Sparkline values={item.trend} /> : null}
          </div>
          {item.delta ? (
            <div
              className="font-mono truncate text-[11px]"
              style={{
                color:
                  item.deltaTone === "good" ? "var(--status-success)" : item.deltaTone === "warn" ? "var(--tone-warning-fg)" : "var(--text-muted)",
              }}
            >
              {item.delta}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export type BarRow = {
  key: string;
  label: ReactNode;
  // Right-hand number, in mono — the thing being compared.
  value: string;
  // 0–1; the bar is the comparison, the number is the fact.
  ratio: number;
  // A second fact on the right of the label row (median days, share, oldest).
  meta?: ReactNode;
  tip?: string;
  href?: string;
  // Overrides the accent fill — used only where a category keeps its own colour.
  colour?: string;
};

// The workhorse: label, mono value, bar beneath. Used for phases, gates, owners,
// money states and functions, so five tiles read as one family.
export function BarList({ rows, className }: { rows: BarRow[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {rows.map((row) => (
        <div key={row.key} data-tip={row.tip} className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2 text-[13px]">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[var(--text-body)]">{row.label}</span>
            {row.meta ? <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{row.meta}</span> : null}
            <span className="font-mono shrink-0 text-[12px] font-medium text-[var(--text-primary)]">{row.value}</span>
          </div>
          {/* h-2 over the kit's 3px: at a glance-distance a 3px bar disappears, and
              tailwind-merge lets the later class win. */}
          {row.colour ? (
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <span className="block h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, row.ratio)) * 100)}%`, background: row.colour }} />
            </span>
          ) : (
            <ProgressBar ratio={row.ratio} className="mt-1.5 h-2" />
          )}
        </div>
      ))}
    </div>
  );
}

// One bar split into segments plus a legend — the app's answer to a donut: same
// information, same hairline language, and lengths you can compare.
export function StackedMeter({ segments }: { segments: { key: string; label: string; count: number; colour: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0) || 1;
  return (
    <div>
      <span className="flex h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
        {segments.map((segment) => (
          <span key={segment.key} style={{ width: `${(segment.count / total) * 100}%`, background: segment.colour }} />
        ))}
      </span>
      <div className="mt-3 flex flex-col gap-1.5">
        {segments.map((segment) => (
          <span key={segment.key} className="flex items-center gap-2 text-[12px] text-[var(--text-body)]">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: segment.colour }} />
            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{Math.round((segment.count / total) * 100)}%</span>
            <span className="font-mono w-5 text-right text-[12px] text-[var(--text-primary)]">{segment.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// A composite score, with the things it is made of underneath: one number on its own
// hides its own reasoning, and a leader's first question is "made of what?".
export function ScorePanel({ score, parts, label }: { score: number; parts: { label: string; ratio: number }[]; label: string }) {
  return (
    <div className="flex items-center gap-5">
      <span className="relative shrink-0">
        <ProgressRing ratio={score} size={72} stroke={6} complete={score >= 0.9} />
        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
          {Math.round(score * 100)}%
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-2 text-[12px] text-[var(--text-label)]">{label}</div>
        <div className="flex flex-col gap-1.5">
          {parts.map((part) => (
            <span key={part.label} className="flex items-center gap-2 text-[12px] text-[var(--text-body)]">
              <span className="min-w-0 flex-1 truncate">{part.label}</span>
              <ProgressBar ratio={part.ratio} className="h-1.5 w-16 shrink-0" />
              <span className="font-mono w-8 shrink-0 text-right text-[11px] text-[var(--text-muted)]">{Math.round(part.ratio * 100)}%</span>
            </span>
          ))}
        </div>
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
