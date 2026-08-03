"use client";

import { useSyncExternalStore } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// ── The only chart runtime in the product ──
// Bars, funnels and meters are hand-drawn from the app's own hairlines (see
// `tiles.tsx`) — a chart library earns its place only where there's a real time axis
// with a scale to label, which is the two trend lines on the portfolio. Everything
// visible here is themed from tokens so a recharts hover looks like every other
// hover in the app.

// Nothing ever changes, so the store never notifies.
const subscribeNever = () => () => {};

type Row = { label: string; partial?: boolean } & Record<string, string | number | boolean | undefined>;

function TokenTooltip({
  active,
  payload,
  label,
  yFormat,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; payload?: Row }[];
  label?: string;
  yFormat?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const partial = payload[0]?.payload?.partial;
  return (
    <div className="rounded-[12px] border border-[var(--border-default)] bg-white px-3 py-2">
      <div className="ui-chart-tooltip-title">
        {label}
        {partial ? " (so far)" : ""}
      </div>
      {payload.map((entry) => (
        <div key={entry.name} className="ui-chart-tooltip-sub flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
          {entry.name}: {typeof entry.value === "number" && yFormat ? yFormat(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
}

export function TimeChart({
  data,
  series,
  height = 168,
  yFormat,
  reference,
}: {
  data: Row[];
  series: { key: string; name: string; colour: string }[];
  height?: number;
  yFormat?: (value: number) => string;
  // A target line, where the metric has one worth drawing.
  reference?: { y: number; label: string };
}) {
  // ResponsiveContainer measures the DOM, so it has nothing to measure during the
  // static prerender. Reserve the space on the server, draw on the client —
  // otherwise the first client paint disagrees with the server's HTML. Told through
  // the store hook rather than an effect, which is the hydration-safe way to ask
  // "am I on the client?" without setting state in a render pass.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return <div style={{ height }} aria-hidden />;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* No negative left margin: pulling the plot left clipped the widest y label
            ($1.8M) against the tile edge. The axis reserves its own width instead. */}
        <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-default)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--mono)" }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickMargin={6}
            tickFormatter={(value: number) => (yFormat ? yFormat(value) : String(value))}
          />
          {reference ? (
            <ReferenceLine
              y={reference.y}
              stroke="var(--border-input)"
              strokeDasharray="4 4"
              label={{ value: reference.label, position: "insideTopRight", fontSize: 10, fill: "var(--text-faint)" }}
            />
          ) : null}
          <Tooltip content={<TokenTooltip yFormat={yFormat} />} cursor={{ stroke: "var(--border-input)", strokeDasharray: "3 3" }} />
          {series.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.name}
              stroke={entry.colour}
              strokeWidth={2}
              dot={{ r: 2, strokeWidth: 0, fill: entry.colour }}
              activeDot={{ r: 3.5 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
