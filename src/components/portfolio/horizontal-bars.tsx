"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// ── Rows of bars, on shadcn's chart container ──
// One part, two uses: a stacked split (a flag counted across the lifecycle) and a grouped pair
// (what a function committed against what it has confirmed). Both are "eight labels down the left,
// money or counts running right", which is a horizontal bar chart and not a table — a table of eight
// rows by five columns asks the reader to rank forty cells by eye.
//
// Horizontal rather than vertical because the categories are words: eight business function names on
// an x-axis have to be angled or dropped, and both of those hide the one somebody is looking for.
//
// The container is the reason to use shadcn here rather than drawing it: it publishes each series'
// colour as `--color-<key>`, so the bar fill, the legend swatch and the tooltip dot are one
// declaration. Every value in that declaration is still one of our tokens.
export function HorizontalBars({
  data,
  series,
  format,
  height,
  stacked = false,
  labelWidth = 92,
  describe,
  direction = "row",
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color: string }[];
  format: (value: number) => string;
  height: number;
  stacked?: boolean;
  labelWidth?: number;
  // A second line under the tooltip's own heading, for the facts that were columns in the table this
  // replaced. A count and a percentage read against money in the same row is what made that table
  // forty cells wide; on hover they're context rather than another thing to rank.
  describe?: (label: string) => string;
  // Columns instead of rows. Worth it where the bars are the subject and the labels are short
  // enough to sit under them: eight function names fit at 11px, and columns read as a comparison
  // rather than as a ranked list, which is what a full-width row chart turns into once the bars run
  // most of a thousand pixels.
  direction?: "row" | "column";
}) {
  const config = Object.fromEntries(series.map((entry) => [entry.key, { label: entry.label, color: entry.color }])) satisfies ChartConfig;
  const columns = direction === "column";

  const category = (
    <XAxis
      type="category"
      dataKey="label"
      tick={{ fontSize: 11, fill: "var(--text-body)" }}
      tickLine={false}
      axisLine={{ stroke: "var(--border-default)" }}
      interval={0}
      tickMargin={8}
    />
  );
  const measure = (
    <YAxis
      type="number"
      tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--mono)" }}
      tickLine={false}
      axisLine={false}
      width={52}
      tickFormatter={format}
    />
  );

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart
        data={data}
        layout={columns ? "horizontal" : "vertical"}
        margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
        barCategoryGap={stacked ? "28%" : "22%"}
      >
        {/* Rules across the measure axis only — the ones along the category axis would draw a line
            through every bar. */}
        <CartesianGrid horizontal={columns} vertical={!columns} stroke="var(--border-hairline)" />
        {columns ? category : null}
        {columns ? measure : null}
        {columns ? null : (
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--mono)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={format}
          />
        )}
        {columns ? null : (
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--text-body)" }}
            tickLine={false}
            axisLine={false}
            width={labelWidth}
            interval={0}
          />
        )}
        <ChartTooltip
          cursor={{ fill: "var(--surface-muted)" }}
          content={
            <ChartTooltipContent
              formatter={(value) => format(Number(value))}
              labelFormatter={
                describe
                  ? (value) => (
                      <span className="flex flex-col gap-0.5">
                        <span>{String(value)}</span>
                        <span className="font-mono text-[11px] font-normal text-[var(--text-muted)]">{describe(String(value))}</span>
                      </span>
                    )
                  : undefined
              }
            />
          }
        />
        {/* A legend only where the series need naming — one series names itself in the title. */}
        {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" /> : null}
        {series.map((entry, index) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            stackId={stacked ? "all" : undefined}
            fill={`var(--color-${entry.key})`}
            // Rounded on the outer end only, and only for the last band of a stack — every band
            // rounded turns a stacked bar into a row of separate pills.
            radius={stacked ? (index === series.length - 1 ? [3, 3, 3, 3] : [0, 0, 0, 0]) : columns ? [3, 3, 0, 0] : [0, 3, 3, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
