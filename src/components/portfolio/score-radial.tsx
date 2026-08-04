"use client";

import { RadialBar, RadialBarChart } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const CONFIG = { score: { label: "Score" } } satisfies ChartConfig;

// ── One composite, as a radial shape ──
// shadcn's "Radial Chart - Shape": a single rounded bar swept round a polar axis, with the figure in
// the middle. It replaces the hand-drawn `ScoreDial` — same reading, but the bar has a real end cap
// and a real track, and the grid ring gives the gap something to be a gap *in*, which the dial's flat
// grey circle never quite did.
//
// `endAngle` is where the arithmetic happens: 90 + 360 × score, starting at twelve o'clock and
// sweeping clockwise, so the drawn length is the score and not a proportion of some other total.
export function ScoreRadial({
  score,
  figure,
  caption,
  colour,
  size = 168,
}: {
  score: number;
  // The number as it should read — "74" for a score out of 100 points, "62%" for a mean of ratios.
  // The two composites on this page are counted differently and the chart shouldn't decide which.
  figure: string;
  caption?: string;
  colour: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, score));
  const data = [{ name: "score", score: clamped * 100, fill: colour }];

  return (
    // The figure is HTML over the chart, not a `<Label>` inside it. Recharts only draws once it can
    // measure its container, so anything inside the SVG is missing from the static prerender — and
    // this is the headline number of the default tab, which shouldn't arrive a frame late in an empty
    // ring. `pointer-events-none` so it can't eat the chart's own hover.
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ChartContainer config={CONFIG} className="mx-0 h-full w-full">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={90 + 360 * clamped}
          innerRadius="66%"
          outerRadius="98%"
          barSize={14}
          // The *angle* is the encoding, not the bar's value: one datum fills whatever arc it is
          // given, so the score has to be in `endAngle` or every score draws a full circle.
          cx="50%"
          cy="50%"
        >
          {/* No track ring. A `PolarGrid` with a fill was tried and it draws filled *discs* at each
              radius, not an annulus — so the tile got a grey circle behind the whole chart. Recharts'
              own `background` can't do it either: it spans the chart's angular range, which is the
              value arc itself here, so it would draw exactly under the bar. The arc alone on the card
              is enough — the gap is the shortfall whether or not it's tinted. */}
          <RadialBar dataKey="score" cornerRadius={7} background={false} isAnimationActive={false} />
        </RadialBarChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="text-[32px] font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
          style={{ color: "var(--text-primary)" }}
        >
          {figure}
        </span>
        {caption ? <span className="text-[11px] capitalize leading-none text-[var(--text-muted)]">{caption}</span> : null}
      </span>
    </div>
  );
}
