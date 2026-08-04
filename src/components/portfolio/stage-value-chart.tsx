"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// ── Money at stake, across the twelve stages ──
// Built on shadcn's `ChartContainer`, which is the reason to have it: it publishes each series'
// colour as a `--color-<key>` custom property on the wrapper, so the fills, the strokes and the
// tooltip swatches all read one declaration. Everything visible is still one of our tokens — the
// component supplies the plumbing, not the palette.
//
// Stacked areas rather than two lines: committed money and asked-for money are parts of one
// exposure, and the total silhouette is the thing worth seeing. Two lines would invite you to
// compare them, which is not the question — the question is how much is sitting where.

const CHART_CONFIG = {
  committed: { label: "Committed", color: "var(--accent)" },
  asked: { label: "Still an ask", color: "var(--accent-ring)" },
} satisfies ChartConfig;

export function StageValueChart({
  rows,
  format,
  shortLabel,
}: {
  rows: { stage: string; count: number; committed: number; asked: number }[];
  format: (value: number) => string;
  // The register's own abbreviation, passed in so this file keeps no second copy of the
  // lifecycle's naming.
  shortLabel: (stage: string) => string;
}) {
  const data = rows.map((row) => ({ ...row, label: shortLabel(row.stage) }));

  return (
    <ChartContainer config={CHART_CONFIG} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {/* A soft vertical fade under each area. The only gradient left on the page, and it is
              doing a job a flat fill can't: two stacked bands of one hue need their boundary to
              read, and fading the lower edge of each is what separates them without a stroke. */}
          {Object.keys(CHART_CONFIG).map((key) => (
            <linearGradient key={key} id={`stage-value-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.75} />
              <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.12} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--mono)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border-default)" }}
          interval={0}
          tickMargin={8}
          // Twelve stage names on one axis: angled, because horizontal they overlap and dropping
          // every other one hides exactly the stage somebody is looking for.
          angle={-35}
          textAnchor="end"
          height={64}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--mono)" }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickCount={4}
          tickFormatter={format}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border-input)", strokeDasharray: "3 3" }}
          content={<ChartTooltipContent labelKey="label" formatter={(value) => format(Number(value))} />}
        />
        {Object.keys(CHART_CONFIG).map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="exposure"
            stroke={`var(--color-${key})`}
            strokeWidth={1.5}
            fill={`url(#stage-value-${key})`}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
