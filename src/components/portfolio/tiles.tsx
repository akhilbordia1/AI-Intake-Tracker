"use client";

import type { ReactNode } from "react";

import { ProgressBar, SectionHeading, cardClass } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The portfolio's drawing parts ──
// Six shapes cover both tabs. All hand-drawn from the product's own hairlines and
// fills — bars rather than pies, because a hole and a legend is a different visual
// language from the rest of the app, and angles are harder to compare than lengths.
// Only a real time axis gets a chart runtime (see `time-chart.tsx`).

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
      <div className="border-b border-[var(--border-hairline)] px-4 py-3">
        <SectionHeading title={title} hint={hint} />
      </div>
      <div className="px-4 py-3.5">{children}</div>
      {footer ? <div className="border-t border-[var(--border-hairline)] px-4 py-2.5 text-[11px] text-[var(--text-muted)]">{footer}</div> : null}
    </section>
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

// Grouped monthly bars, drawn as divs. A month is a column of three bars; the
// current month is hatched, because half a month isn't a data point. The hover card
// is the app's own chart tooltip, revealed by the group.
export function MonthBars({
  months,
  series,
}: {
  months: { label: string; partial?: boolean; values: Record<string, number> }[];
  series: { key: string; name: string; colour: string }[];
}) {
  const peak = Math.max(1, ...months.flatMap((month) => series.map((entry) => month.values[entry.key] ?? 0)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((entry) => (
          <span key={entry.key} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: entry.colour }} />
            {entry.name}
          </span>
        ))}
      </div>
      <div className="flex h-[132px] items-end gap-2">
        {months.map((month) => (
          <div key={month.label} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="ui-chart-tooltip group-hover:opacity-100">
              <div className="ui-chart-tooltip-title">
                {month.label}
                {month.partial ? " (so far)" : ""}
              </div>
              {series.map((entry) => (
                <div key={entry.key} className="ui-chart-tooltip-sub">
                  {entry.name}: {month.values[entry.key] ?? 0}
                </div>
              ))}
            </div>
            <div className="flex h-full items-end justify-center gap-[3px]">
              {series.map((entry) => {
                const value = month.values[entry.key] ?? 0;
                return (
                  <span
                    key={entry.key}
                    className="w-2.5 rounded-t-[2px] transition-[height]"
                    style={{
                      height: `${Math.max(value ? 4 : 1, (value / peak) * 100)}%`,
                      background: entry.colour,
                      // A month still running reads as provisional.
                      opacity: month.partial ? 0.55 : 1,
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-center text-[11px] text-[var(--text-muted)]">{month.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// One bar split into segments, plus a legend. This is the app's answer to a donut:
// same information, same hairline language, and lengths you can actually compare.
export function StackedMeter({ segments }: { segments: { key: string; label: string; count: number; colour: string; fg?: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0) || 1;
  return (
    <div>
      <span className="flex h-2.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
        {segments.map((segment) => (
          <span key={segment.key} style={{ width: `${(segment.count / total) * 100}%`, background: segment.colour }} />
        ))}
      </span>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-body)]">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: segment.colour }} />
            {segment.label}
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{segment.count}</span>
          </span>
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
