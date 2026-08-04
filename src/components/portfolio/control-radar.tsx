"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const CONFIG = { ratio: { label: "In place", color: "var(--accent)" } } satisfies ChartConfig;

// ── Five controls, one shape ──
// A radar is the wrong chart most of the time — it invites comparison between axes that don't share
// a scale, and the area it draws is an artefact of the axis order. It's right here: all five adoption
// controls are the same measure ("what share of the live records have this in place"), the axis order
// is the order they happen in, and the question a committee asks is about the *shape* — is this
// portfolio evenly controlled, or is it strong on training and empty on monitoring?
//
// It also fixes a width problem honestly. Five full-width rows of bar at 1080px were five hundred
// pixels of bar for a five-record population; the radar says the same thing in a square that sits
// happily in half a row.
export function ControlRadar({
  points,
  height = 232,
}: {
  // `short` is the label on the axis, `label` the one in the tooltip: "Responsible AI sign-off" set
  // around a 232px chart overlaps its neighbours and gets clipped by the frame.
  points: { key: string; short: string; label: string; ratio: number }[];
  height?: number;
}) {
  const data = points.map((point) => ({ ...point, ratio: Math.round(point.ratio * 100) }));

  return (
    <ChartContainer config={CONFIG} className="w-full" style={{ height }}>
      <RadarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} outerRadius="72%">
        <ChartTooltip content={<ChartTooltipContent labelKey="label" formatter={(value) => `${value}% in place`} />} />
        {/* Polygon grid, not circles: with five axes the circles read as a target and the polygon
            reads as the same five-sided shape the series draws. */}
        <PolarGrid stroke="var(--border-default)" gridType="polygon" radialLines />
        <PolarAngleAxis dataKey="short" tick={{ fontSize: 11, fill: "var(--text-body)" }} />
        <Radar
          dataKey="ratio"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="var(--accent)"
          fillOpacity={0.22}
          dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </RadarChart>
    </ChartContainer>
  );
}
