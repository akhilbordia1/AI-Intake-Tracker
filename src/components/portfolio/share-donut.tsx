"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// ── A partition of one population, as a ring ──
// The page's standing rule is no donuts: angles and legends aren't this product's language, and a
// `StackedMeter` says the same thing in hairlines. This is the exception the rule was written
// against — three slices, a genuine partition (every record has exactly one tier), and a tile that
// has to hold its own height beside a chart. A three-band mosaic in that slot was a strip of colour
// across the top with two thirds of the card empty under it.
//
// Still no `<Legend>`: the counts are written beside the ring as rows, where the label can be read
// against its own figure instead of against a swatch three inches away.
export function ShareDonut({
  segments,
  centreLabel,
  height = 208,
}: {
  segments: { key: string; label: string; count: number; color: string; tip?: string }[];
  // What the ring adds up to, in the hole. A ring with nothing in the middle makes the reader sum
  // the slices to find out what the shares are shares of.
  centreLabel: { value: string; caption: string };
  height?: number;
}) {
  const config = Object.fromEntries(segments.map((entry) => [entry.key, { label: entry.label, color: entry.color }])) satisfies ChartConfig;
  const total = segments.reduce((sum, entry) => sum + entry.count, 0) || 1;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <ChartContainer config={config} className="mx-0 shrink-0" style={{ height, width: height }}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie
            data={segments}
            dataKey="count"
            nameKey="key"
            innerRadius="58%"
            outerRadius="92%"
            // No padding angle and no stroke: a gap between slices reads as a missing category, and
            // the tiles' hairline is too light to separate two fills of one hue anyway.
            paddingAngle={0}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {segments.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          {/* Recharts has no centre-label primitive, so it's an SVG text pair positioned on the
              chart's own midpoint. */}
          <text x="50%" y="50%" textAnchor="middle" dy={-2}>
            <tspan className="text-[26px] font-semibold [font-variant-numeric:tabular-nums]" fill="var(--text-primary)">
              {centreLabel.value}
            </tspan>
          </text>
          <text x="50%" y="50%" textAnchor="middle" dy={18} className="text-[11px]" fill="var(--text-muted)">
            {centreLabel.caption}
          </text>
        </PieChart>
      </ChartContainer>
      <div className="flex min-w-0 flex-1 flex-col">
        {segments.map((entry, index) => (
          <div
            key={entry.key}
            data-tip={entry.tip}
            className={`grid min-w-0 grid-cols-[10px_minmax(0,1fr)_28px_44px] items-center gap-2.5 py-2.5 ${
              index > 0 ? "border-t border-[var(--border-hairline)]" : ""
            }`}
          >
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: entry.color }} />
            <span className="min-w-0 truncate text-[13px] text-[var(--text-body)]">{entry.label}</span>
            <span className="font-mono text-right text-[13px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {entry.count}
            </span>
            <span className="font-mono text-right text-[11px] text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">
              {Math.round((entry.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
