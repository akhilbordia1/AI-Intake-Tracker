"use client";

import type { ReactNode } from "react";

import { ProgressBar, SectionHeading, cardClass } from "@/components/ui/kit";
import { cn } from "@/lib/cn";

// ── The portfolio's drawing parts ──
// Five shapes cover both views, and that ceiling is the point: a leadership page is
// read, not explored, so it says its answer in a sentence (`ReadLine`), backs it with
// at most four blocks, and names what it left out (`AskLine`). All hand-drawn from
// the product's own hairlines and fills — bars rather than pies, because a hole and a
// legend is a different visual language from the rest of the app, and lengths are
// easier to compare than angles. Only a real time axis gets a chart runtime (see
// `time-chart.tsx`).

// The answer, before the evidence. A leadership page that opens with tiles makes the
// reader derive the point; this states it in a sentence, in the prose serif, and lets
// the blocks below be the backing.
export function ReadLine({ children }: { children: ReactNode }) {
  return <p className="font-serif-body max-w-[80ch] text-[15px] leading-[1.65] text-[var(--text-body)]">{children}</p>;
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
