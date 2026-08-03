"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/document-record/markdown";

import { ProgressBar, cardClass } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The portfolio's drawing parts ──
// Five shapes cover both views, and that ceiling is the point: a leadership page is
// read, not explored, so it says its answer in a sentence (`ReadLine`), backs it with
// at most four blocks, and names what it left out (`AskLine`). All hand-drawn from
// the product's own hairlines and fills — bars rather than pies, because a hole and a
// legend is a different visual language from the rest of the app, and lengths are
// easier to compare than angles. Only a real time axis gets a chart runtime (see
// `time-chart.tsx`).

// The assistant's read on the numbers above it — a headline sentence and three
// supporting lines, authored as Markdown so the copy can come from a model. Titled,
// on the muted surface with an accent edge, so it reads as something written rather
// than as another tile of figures.
export function SummaryPanel({ title, source, meta }: { title: string; source: string; meta?: string }) {
  return (
    <section className="rounded-[10px] border border-[var(--border-default)] border-l-2 border-l-[var(--accent)] bg-[var(--surface-muted)]">
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

// What this page deliberately doesn't show. Everything cut from the tiles is one
// question away in the rail, so the page can stay short without the numbers being
// lost — and saying so is what makes the omission read as a choice.
export function AskLine({ topics }: { topics: string }) {
  return (
    <p className="text-[12px] text-[var(--text-muted)]">
      Ask the assistant for {topics} — it reads the same numbers as this page.
    </p>
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
    <section className={cn(cardClass(), "min-w-0", className)}>
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
                "border-b border-[var(--border-default)] pb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]",
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
        of {target}
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

// The headline row: four numbers, divided by rules rather than by gaps, because
// they're one statement about the portfolio and not four separate cards.
export function StatBand({ items }: { items: { label: string; value: string; delta?: string; tip?: string }[] }) {
  return (
    <section className={cn(cardClass(), "grid grid-cols-2 sm:grid-cols-4")}>
      {items.map((item, index) => (
        <div
          key={item.label}
          data-tip={item.tip}
          className={cn(
            "min-w-0 px-4 py-3.5",
            // Hairlines between cells, and none on the leading edge of a row.
            index % 2 === 1 && "border-l border-[var(--border-hairline)]",
            index >= 2 && "border-t border-[var(--border-hairline)] sm:border-t-0",
            index >= 1 && "sm:border-l sm:border-[var(--border-hairline)]",
          )}
        >
          <div className="text-[12px] text-[var(--text-label)]">{item.label}</div>
          <div className="font-display mt-1 text-[28px] leading-none text-[var(--text-primary)]">{item.value}</div>
          {item.delta ? <div className="font-mono mt-1.5 text-[11px] text-[var(--text-muted)]">{item.delta}</div> : null}
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
