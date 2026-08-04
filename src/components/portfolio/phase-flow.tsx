"use client";

import Link from "next/link";

import { PHASE_TONES, PhaseIcon } from "@/components/ui/kit";

// ── The pipeline, as one shape ──
// The thickness is the share of everything ever raised that reached each phase, so the
// taper *is* the conversion. Inside each segment: that share, and under it the median days
// the phase takes.
//
// The days were a column chart below the ribbon for two revisions. Two charts over one set
// of four phases meant two plots, two captions and one axis serving both, for four numbers
// — and the columns encoded a comparison (67 against 25) that the figures state outright.
// Written into the band, the whole phase story is one object: how many get here, and how
// long they sit. The names and the live counts stay on the axis underneath.

export type PhaseFlowRow = {
  phase: string;
  // Share of every record ever raised that reached this phase — the ribbon's thickness.
  share: number;
  // How many are sitting in it right now, and how many of those want a decision.
  count: number;
  attention: number;
  // Median days to get through it. `null` where nothing has left the phase yet.
  days: number | null;
  tip: string;
  daysTip: string;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// The ribbon is drawn in its own units and stretched to the box with
// `preserveAspectRatio="none"`, so the geometry doesn't have to know the pixel width. Fill
// only, no stroke, and no SVG gridlines: a non-uniform stretch scales a stroke by the
// horizontal factor, so a "1px" vertical rule would come out ten pixels wide. The gridlines
// are HTML, behind the shape.
const RIBBON_W = 100;
const RIBBON_H = 72;

// A floor on the drawn thickness. It has to clear two lines of text now — a 14px share over
// an 11px day figure — so it's 0.26 rather than the 0.16 that only had to fit one. The
// number printed is always the true share; this only stops a thin segment collapsing under
// its own labels.
const MIN_DRAWN = 0.26;

// The widest segment fills 84% of the band's height, not all of it. At 100% the ribbon ran
// the full height of its own box, so it touched the caption above and sat directly on the
// axis rule below — the shape had no air around it, and the soft outer edge behind it had
// nowhere to show at the wide end either.
const FILL_MAX = 0.84;

// One closed path: the top edge left to right, down the right-hand end, the bottom edge
// mirrored back, closed up the left. Each step is a cubic with both handles on the midpoint,
// which is what gives the smooth S between two thicknesses rather than a straight taper.
function ribbonPath(shares: number[], swell = 1): string {
  const step = RIBBON_W / shares.length;
  const edge = shares.map((share) => ((1 - clamp01(Math.max(MIN_DRAWN, clamp01(share)) * FILL_MAX * swell)) / 2) * RIBBON_H);
  // A flat lead-in and lead-out, so the first and last segments read as bands rather than as
  // the pointed ends of a lens.
  const top: Array<[number, number]> = [
    [0, edge[0]],
    ...shares.map((_, index): [number, number] => [index * step + step / 2, edge[index]]),
    [RIBBON_W, edge[edge.length - 1]],
  ];
  const curve = (points: Array<[number, number]>) =>
    points
      .slice(1)
      .map(([x, y], index) => {
        const [px, py] = points[index];
        const mid = (px + x) / 2;
        return `C ${mid} ${py} ${mid} ${y} ${x} ${y}`;
      })
      .join(" ");
  const bottom = [...top].reverse().map(([x, y]): [number, number] => [x, RIBBON_H - y]);

  return `M ${top[0][0]} ${top[0][1]} ${curve(top)} L ${bottom[0][0]} ${bottom[0][1]} ${curve(bottom)} Z`;
}

// No `total` prop any more — it only ever existed to say "of 18" in the caption that's gone,
// and the tile's hint carries that.
export function PhaseFlow({ rows }: { rows: PhaseFlowRow[] }) {
  if (!rows.length) return null;
  const shares = rows.map((row) => row.share);
  // The fill under a segment runs from near-white to the accent, so one text colour can't
  // sit on all of it. Past 70% along the gradient the band is dark enough to need white;
  // before that, white would be unreadable and the dark green isn't.
  const onDark = (index: number) => (index + 0.5) / rows.length > 0.7;

  return (
    <div className="min-w-0">
      {/* No caption over the ribbon. It read "Share of 18 ever raised that got this far, and
          the median days spent in the phase" — a sentence explaining two figures that label
          themselves with a `%` and a `d`, above a shape whose whole job is to be obvious. The
          tile's own hint says "18 ever raised", which is the only part that wasn't inferable,
          and each segment's hover still spells the derivation out. */}
      <div className="relative">
        {/* Boundaries, behind the shape — so they show in the empty space above and below the
            ribbon and are covered where it runs, which is what makes the taper read against
            something rather than floating. HTML, not SVG: see the note on stroke scaling. */}
        <div aria-hidden className="absolute inset-0 flex">
          {rows.map((row) => (
            // `--border-input`, not `--border-hairline`. Hairline is the divider colour, and a
            // dashed rule in it behind a pale-green fill was invisible — the step to
            // `--border-default` would have been imperceptible too, so this takes the darkest
            // of the three neutrals, which is still a quiet grey.
            <span key={row.phase} className="flex-1 border-l border-dashed border-[var(--border-input)] first:border-l-0" />
          ))}
        </div>

        {/* 184px so that 84% of it is still a substantial band — the headroom is taken out of
            the shape, not added to the tile. */}
        <svg viewBox={`0 0 ${RIBBON_W} ${RIBBON_H}`} preserveAspectRatio="none" aria-hidden className="relative block h-[184px] w-full">
          <defs>
            {/* Pale where everything still is, the full accent where only a quarter arrive. An
                earlier version ran from `--accent-soft` to `--accent-ring` — two pale greens,
                so the band had no contrast to taper *through*. */}
            <linearGradient id="phase-flow-ribbon" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent-soft)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          {/* A slightly fuller ribbon behind the real one, so the shape has a soft outer edge
              instead of a hard boundary against the tile. */}
          <path d={ribbonPath(shares, 1.14)} fill="var(--accent-soft)" />
          <path d={ribbonPath(shares)} fill="url(#phase-flow-ribbon)" />
        </svg>

        {/* Only the share sits inside the band, and only because it's 15px semibold — large
            text clears 3:1 against every point of the gradient, which small text does not.
            The day figure used to sit under it at 11px and that was the unreadable one: on the
            third segment the fill is about 62% accent, where `--accent-strong` measures 3.9:1
            — fine for the big figure, short of the 4.5:1 that 11px needs, and it was set at
            0.7 opacity on top of that. It moved out to the axis, where it's on white.

            HTML rather than SVG text: the ribbon is stretched non-uniformly, and text inside
            it would stretch with it. */}
        <div className="absolute inset-0 flex items-center">
          {rows.map((row, index) => (
            <span
              key={row.phase}
              className="flex min-w-0 flex-1 justify-center text-[15px] font-semibold [font-variant-numeric:tabular-nums]"
              style={{ color: onDark(index) ? "var(--surface)" : "var(--accent-strong)" }}
            >
              {Math.round(row.share * 100)}%
            </span>
          ))}
        </div>
      </div>

      {/* The axis: the phase names once, and what is sitting in each right now. The ribbon is
          history — everything that ever reached here — so the live count is a different
          question and stays written rather than drawn. */}
      {/* No rule between the ribbon and its axis. The shape's own lower edge is the baseline,
          and a second horizontal line under it drew a box the shape was already closing. */}
      <div className="mt-4 flex">
        {rows.map((row) => (
          <div key={row.phase} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-2 text-center">
            {/* The name opens the board filtered to the phase — the one drill-down this tile
                owes, and the reason each column is worth clicking. */}
            <Link
              href={`/?phase=${encodeURIComponent(row.phase)}`}
              data-tip={`${row.tip}\n${row.daysTip.split("\n").slice(1).join("\n")}`}
              className="flex min-w-0 max-w-full items-center gap-1.5 text-[13px] text-[var(--text-body)] transition hover:text-[var(--accent-strong)]"
            >
              <PhaseIcon phase={row.phase} size={13} style={{ color: `var(--tone-${PHASE_TONES[row.phase] ?? "neutral"}-fg)` }} />
              <span className="truncate">{row.phase}</span>
            </Link>
            {/* The days, out of the band and onto the white surface — `--text-body` on white is
                11:1, against the 3.9:1 it had inside the shape. */}
            <span className="font-mono text-[11px] text-[var(--text-body)] [font-variant-numeric:tabular-nums]">
              {row.days === null ? "no median yet" : `${row.days}d in phase`}
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">
              {row.count} on the board
              {row.attention ? <span style={{ color: "var(--tone-warning-fg)" }}> · {row.attention} waiting</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
