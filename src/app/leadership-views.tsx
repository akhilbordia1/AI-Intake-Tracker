"use client";

import { Activity, ArrowDown, ArrowUp, Building2, Coins, Gauge, Layers, ShieldCheck, Target, Timer, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { PanelTabs, PanelViewRow } from "@/components/app-shell";
import { PhaseFlow, type PhaseFlowRow } from "@/components/portfolio/phase-flow";
import { ControlRadar } from "@/components/portfolio/control-radar";
import { HorizontalBars } from "@/components/portfolio/horizontal-bars";
import { ShareDonut } from "@/components/portfolio/share-donut";
import { StageValueChart } from "@/components/portfolio/stage-value-chart";
import {
  ColumnChart,
  DataTable,
  MatrixTable,
  MiniList,
  QueueList,
  ScorePanel,
  ShareMosaic,
  StackedMeter,
  StripSelect,
  StatBand,
  TallyRows,
  TargetCards,
  TileLink,
  StatusDot,
  SummaryPanel,
  TileBox,
  TileEmpty,
} from "@/components/portfolio/tiles";
import { TimeChart } from "@/components/portfolio/time-chart";
import { CHIP, PHASE_TONES, PhaseIcon, Tag } from "@/components/ui/kit";
import { STAGE_GROUPS, phaseForStage, shortStageLabel } from "@/data/lifecycle";
import {
  ALL_RECORDS,
  AS_OF,
  CURRENT_USER,
  LIFECYCLE_TONE,
  PORTFOLIO_SNAPSHOTS,
  PORTFOLIO_TARGETS,
  USE_CASES,
  filterUseCasesByScope,
  type Oversight,
  type RiskLevel,
  type RiskTier,
  type ScopeFilter,
  type UseCaseCard,
} from "@/data/registry";
import {
  DECISION_TARGET_DAYS,
  adoptionControls,
  annualPerformance,
  attainmentSummary,
  benefitConcentration,
  capabilityMix,
  committeeQueue,
  committeeReading,
  complianceLoad,
  compactNumber,
  conversion,
  decisionSpeedSeries,
  formatDay,
  functionLeaderboard,
  funnel,
  gateMix,
  exposureLoad,
  gateOutcomes,
  headline,
  impact,
  kpiAttainment,
  maturityIndex,
  medianCycleDaysByPhase,
  moneyByState,
  pct,
  productionRows,
  quarters,
  realization,
  stageRegister,
  portfolioHealth,
  riskMix,
  stoppedRows,
  summaryProvenance,
  targetCards,
  underSupervised,
  usd,
  valueAtStake,
  valueByFunction,
  valueSummary,
  type PhaseMap,
} from "@/lib/portfolio";
import { cn } from "@/lib/cn";

// ── The leadership view ──
// The tracker answers "what is on my plate"; this answers "how is the system
// doing". Two reads of the same registry: Health (flow, blockers, risk, capacity)
// and Value (money, attainment, outcomes). Every number comes from
// `src/lib/portfolio.ts`, so the tiles and the chat can't disagree — and the panel
// footer says out loud whether the seeded history still reconciles.

// One grid for both views: a measured column (a dashboard that runs to a 1600px
// window puts a label and its number in different postcodes), two tiles abreast where
// they fit, and `items-start` so a short tile doesn't stretch to match a tall one.
// The two "no filter" sentinels. Strings rather than `undefined` so a native select can hold
// them as a value.
const ALL_PERIODS = "all";
const ALL_FUNCTIONS = "all";

// A month key to the quarter it closes in. Kept next to the strip that uses it rather than in
// `portfolio.ts`, where `quarters()` already labels its own rows.
// Module scope, not a closure inside the component: as a local it was a new function every
// render, which the exhaustive-deps rule is right to object to.
const narrowToFunction = (rows: UseCaseCard[], fn: string) => (fn === ALL_FUNCTIONS ? rows : rows.filter((card) => card.businessFunction === fn));

// Four units in one table, formatted at the point of display rather than baked into the
// derivation, so the numbers stay numbers and remain sortable and summable.
const formatMeasure = (value: number, unit: "usd" | "hours" | "count" | "ratio") =>
  unit === "usd" ? usd(value) : unit === "ratio" ? pct(value) : unit === "hours" ? `${compactNumber(value)}h` : compactNumber(value);

const quarterLabel = (key: string) => {
  const [year, month] = key.split("-");
  return `Q${Math.floor((Number(month) - 1) / 3) + 1} ${year}`;
};

type PortfolioTab = "overview" | "pipeline" | "value" | "governance" | "functions";

// No max-width and no auto margins: these views sit inside the tracker's panel now, beside a 300px
// chat rail, so the panel is the measure. Capped at 1080 *and* inset in a panel, the tiles stopped a
// couple of hundred pixels short of their own card on a wide screen.
const TAB_GRID = "grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2";
const SPAN = "lg:col-span-2";

// `CAPABILITY_FILL` (three avatar hues for the capability split) went with `GroupBars`: the tally
// rows step one hue by rank, so a categorical ramp had nothing left to say.

// `MONEY_TONE` (a status colour per money state, for a dot on each table row) lived here
// while "Spend and Return" was a table. The rows are paired bars now, and the two series
// already own the only two colours in that tile — a third, per-row, was a second colour
// system in the same box.

// The matrix's two axes, and the rule its shading encodes. `oversightRequiredFor` in
// `portfolio.ts` is the authority — this mirrors it for the cell shading rather than importing a
// second copy of the rule, and `underSupervised()` is what the finding list below the matrix
// actually filters on, so the two can't drift apart unnoticed.
const OVERSIGHT_LEVELS: RiskLevel[] = ["High", "Medium", "Low"];
const OVERSIGHT_MODES: Oversight[] = ["Always", "On exceptions", "None"];
const OVERSIGHT_REQUIRED: Record<RiskLevel, Oversight[]> = {
  High: ["Always"],
  Medium: ["Always", "On exceptions"],
  Low: ["Always", "On exceptions", "None"],
};

// Gate statuses are the one categorical set on this page whose colour means something: passed is
// good, blocked and rejected are not, and the two in between are simply unfinished. So they take
// status tones rather than a ramp — the only tile where the hue is the message.
const GATE_TONE: Record<string, string> = {
  Passed: "var(--status-success)",
  "In review": "var(--accent)",
  Pending: "var(--text-faint)",
  Blocked: "var(--tone-warning-fg)",
  Rejected: "var(--tone-danger-fg)",
};

// `REVIEW_FILL` (five avatar hues for the governance tallies) went the same way. Five colours for
// one measure counted five ways implied the colours meant something; the rows are already labelled.

// Phase membership stays in `lifecycle.ts`; the derivations take it as an argument.
const PHASES: PhaseMap = { order: Object.keys(STAGE_GROUPS), phaseOf: phaseForStage };

// The four phase rows, assembled for `PhaseFlow`. Everything the old table's four columns
// carried, minus the columns: the ribbon takes "reached", the bars take "typical days", and
// the live count sits under the phase name.
function phaseFlowRows(
  cards: UseCaseCard[],
  board: UseCaseCard[],
  flow: ReturnType<typeof funnel>,
  cycle: ReturnType<typeof medianCycleDaysByPhase>,
): PhaseFlowRow[] {
  const reached = conversion(cards, PHASES);

  // "3 waiting" is a number you can't act on. The hover names them, with whose decision
  // each one is and how long it has been sitting.
  //
  // The record lines carry no colon on purpose. The tooltip layer reads `Label: value` and
  // sets the label in a `shrink-0` column, so a 26-character record title left its value a
  // ribbon three lines deep. Written as plain lines they run the full width of the tip and
  // wrap like sentences; only the short counts above them use the two-column form.
  const phaseTip = (row: (typeof flow)[number], share: number, ever: number) => {
    const waiting = board.filter((card) => phaseForStage(card.substage) === row.phase && card.needsAttention);
    const shown = waiting.slice(0, 4);
    return [
      row.phase,
      `Reached: ${ever} of ${cards.length} ever raised (${pct(share)})`,
      `On the board: ${row.count}`,
      `Stages: ${row.stages.map(shortStageLabel).join(", ") || "none occupied"}`,
      waiting.length ? `Waiting on a decision: ${waiting.length}` : null,
      ...shown.map((card) => `${card.title} — ${card.actionOwner}, ${card.pendingFor ?? "just flagged"}`),
      waiting.length > shown.length ? `and ${waiting.length - shown.length} more` : null,
      "Opens the board filtered to this phase",
    ]
      .filter(Boolean)
      .join("\n");
  };

  return flow.map((row, index) => {
    const conv = reached[index];
    const time = cycle[row.phase];
    return {
      phase: row.phase,
      share: conv.share,
      count: row.count,
      attention: row.attention,
      days: time?.sample ? time.days : null,
      tip: phaseTip(row, conv.share, conv.reached),
      daysTip: time?.sample
        ? `${row.phase}\nMedian of ${time.sample} ${time.sample === 1 ? "record" : "records"} that have left this phase${time.open ? `\nStill in it: ${time.open}` : ""}`
        : `${row.phase}\nNothing has left this phase yet`,
    };
  });
}

// ── Health ──
// Four blocks and a sentence. The earlier version put eight tiles on one page and
// left the reader to work out which mattered; a leadership view has to say the
// answer first and keep the evidence to what supports it. Gate outcomes, the risk
// mix and owner load moved into the rail — they're follow-up questions, not the
// headline, and the assistant answers them in one line each.

function OverviewTab({ cards, months }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS }) {
  const h = headline(cards, months, AS_OF);
  const real = realization(cards);
  const annual = annualPerformance(cards, PORTFOLIO_TARGETS.annual);
  const queue = committeeQueue(cards, AS_OF);
  const reading = committeeReading(cards, months, PHASES, AS_OF);
  const health = portfolioHealth(cards, months, AS_OF, PORTFOLIO_TARGETS.priorQuarterHealth);
  const highRisk = cards.filter((card) => card.riskLevel === "High").length;
  // The funnel and the cycle times moved to the Pipeline tab, so this stops deriving them.

  // `pulse()` (four equally weighted measures) is replaced here by `portfolioHealth()`, which
  // weights them and carries a verdict. Nothing else reads `pulse` now.
  const span = months.length > 1 ? `${months[0].label} → ${months[months.length - 1].label}` : undefined;

  return (
    // A measured column, and two tiles abreast where they fit: full-bleed rows left a
    // label on the far left and its number a thousand pixels away on the right, which
    // is most of why this page was hard to read.
    <div className={TAB_GRID}>
      {/* The composite first, the way the reference reads: a committee wants the verdict, then the
          numbers behind it. The four measures are weighted — value realization is worth 35% and
          adoption depth 20% — and the weights are printed, because a composite whose model is
          hidden is a number nobody can argue with. */}
      {/* Side by side: the verdict, and the four numbers it is a verdict on. The band ran full width
          under the dial, which put those figures a long way from the composite they feed and left
          the dial's own tile two thirds empty. */}
      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        <TileBox
          className="h-full"
          title="Portfolio Health"
          // No weights line. They were printed per row (cost the labels their width), then moved to a
          // footer, which restated all four labels to add four numbers nobody reads on the way past.
          // The rail answers "how is the health score weighted?" — that is the right home for a
          // question asked once.
          hint={
            health.moved === null ? undefined : (
              // The movement as a chip rather than coloured words in a sentence: this is the one
              // number on the tile that isn't a share, and mono green mid-sentence read as a typo.
              <span className="flex items-center gap-1.5">
                <span
                  className="font-mono inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none"
                  style={
                    health.moved >= 0
                      ? { color: "var(--tone-success-fg)", background: "var(--tone-success-bg)", borderColor: "var(--tone-success-border)" }
                      : { color: "var(--tone-warning-fg)", background: "var(--tone-warning-bg)", borderColor: "var(--tone-warning-border)" }
                  }
                >
                  {health.moved >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {Math.abs(health.moved)} pts
                </span>
                since last quarter
              </span>
            )
          }
        >
          <ScorePanel score={health.score / 100} scale="points" caption={health.verdict.toLowerCase()} parts={health.parts} />
        </TileBox>

        <StatBand
          layout="grid"
          items={[
            {
              label: "In flight",
              value: String(h.active),
              delta: `${h.tracked} ever raised`,
              icon: <Layers size={13} />,
              trend: months.map((month) => Object.values(month.wip).reduce((total, count) => total + count, 0)),
              trendLabel: span,
              tip: "Records with an active lifecycle",
            },
            // Four, and each one is the headline of a different tab rather than four readings of
            // flow. "Needs a decision" and "Live and earning" came off: the first is the subject
            // of "Waiting on This Committee" immediately below, and the second is restated by
            // this row's own Committed delta and by the whole Value tab.
            {
              label: "Committed",
              value: usd(h.investment),
              delta: `${pct(real.ratio)} realised · ${usd(real.confirmed)}`,
              deltaTone: real.ratio >= 0.8 ? "good" : "warn",
              icon: <Coins size={13} />,
              tip: "Investment on live and funded work, and how much of the promised benefit has been measured",
            },
            {
              label: "High risk",
              value: String(highRisk),
              delta: `${underSupervised(cards).length} below their tier`,
              deltaTone: underSupervised(cards).length ? "warn" : undefined,
              icon: <ShieldCheck size={13} />,
              tip: "Assessed high risk, whatever their lifecycle",
            },
            {
              label: "Days to a decision",
              value: String(h.decisionDays),
              // The only committed target on the page, so the only stat that gets to
              // print one — a number with no bar to clear reads as neither good nor bad.
              target: `target ${DECISION_TARGET_DAYS}d`,
              delta: h.decisionTrend > 0 ? `${h.decisionTrend} faster than ${h.since}` : `${Math.abs(h.decisionTrend)} slower than ${h.since}`,
              deltaTone: h.decisionTrend > 0 ? "good" : "warn",
              icon: <Timer size={13} />,
              // Down is the good direction here, so the line falling is the message.
              trend: months.map((month) => month.medianDaysToDecision),
              trendLabel: span,
              tip: "Median days from intake to a first gate decision",
            },
          ]}
        />
      </div>

      {/* Four measures a committee is held to, each against its target and the last quarter's
          close. Four different units, so the share-of-target column is what makes them
          comparable — "how far along" is the only scale they share. */}
      <TileBox className={SPAN} title="Annual Performance" hint="derived from the records; targets and prior quarter are set">
        <DataTable
          columns={["Measure", "Last Quarter", "Now", "Annual Target", "Against Target"]}
          rows={annual.map((row) => ({
            key: row.key,
            label: row.label,
            values: [
              formatMeasure(row.priorQuarter, row.unit),
              // The current figure carries the direction of travel, because a number between a
              // prior and a target is meaningless without knowing which way it moved.
              <span key="now" className="inline-flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                {formatMeasure(row.now, row.unit)}
                <span style={{ color: row.moved >= 0 ? "var(--status-success)" : "var(--tone-warning-fg)" }}>{row.moved >= 0 ? "▲" : "▼"}</span>
              </span>,
              formatMeasure(row.target, row.unit),
              <span key="against" style={{ color: row.onTrack ? "var(--status-success)" : "var(--tone-warning-fg)" }}>
                {pct(row.against)}
              </span>,
            ],
            tip: `${row.label}\nLast quarter: ${formatMeasure(row.priorQuarter, row.unit)}\nNow: ${formatMeasure(row.now, row.unit)}\nAnnual target: ${formatMeasure(row.target, row.unit)}\n${row.onTrack ? "On track" : `${pct(row.against)} of the way there`}`,
          }))}
        />
        {/* The reading of the table, not a restatement of it: every measure improved and none is
            on track, which is a different sentence from any single row. */}
        <p className="mt-4 border-t border-[var(--border-hairline)] pt-3 text-[12px] text-[var(--text-muted)]">
          {annual.every((row) => row.moved >= 0) ? "Every measure moved the right way" : "Not every measure moved the right way"}
          {annual.some((row) => !row.onTrack)
            ? `, and ${annual.filter((row) => !row.onTrack).length} of ${annual.length} are behind target. Strongest is ${[...annual]
                .sort((a, b) => b.against - a.against)[0]
                .label.toLowerCase()} at ${pct([...annual].sort((a, b) => b.against - a.against)[0].against)}; weakest is ${[...annual]
                .sort((a, b) => a.against - b.against)[0]
                .label.toLowerCase()} at ${pct([...annual].sort((a, b) => a.against - b.against)[0].against)}.`
            : ", and every measure is on track."}
        </p>
      </TileBox>

      {/* The agenda: one card per queue, count first. Everything here needs a ruling from this table
          and nowhere else — a queue of other people's work is why these meetings run long.

          The editorial subtitles are gone ("A decision, not a project plan"). They were telling the
          committee how to read a number rather than telling it anything, and the queue titles already
          say what kind of thing each is. */}
      <TileBox className={SPAN} title="Waiting on This Committee" hint={`${queue.reduce((sum, row) => sum + row.count, 0)} items`}>
        <QueueList
          queues={queue.map((row) => ({
            key: row.key,
            count: row.count,
            title: row.title,
            urgent: (row.oldestDays ?? 0) >= 30,
            meta: [row.oldestDays === null ? null : `oldest ${row.oldestDays}d`, row.money ? `${usd(row.money)} held` : null]
              .filter(Boolean)
              .join(" · "),
            tip: `${row.title}\n${row.note}\n${row.records
              .slice(0, 5)
              .map((card) => card.title)
              .join("\n")}${row.records.length > 5 ? `\nand ${row.records.length - 5} more` : ""}`,
          }))}
        />
      </TileBox>

      {/* One prose block on this tab, not two — the "Summary" panel that stood above this said the
          same things in different words, so its surface was kept and its content dropped.

          Prose with bullets, not a label column. The three findings were briefly a two-column grid
          with a rule between each row, which turned three sentences into a three-row table — and a
          table of one-sentence cells is the shape that says "scan me" about writing meant to be read.
          The lead carries the impact and the two bullets carry cause and action, which is the same
          shape the value summary uses. */}
      <div className={SPAN}>
        <SummaryPanel
          title="Reading of the Quarter"
          meta={summaryProvenance(cards, months, AS_OF)}
          source={[reading.impact, [`- **Bottleneck** — ${reading.bottleneck}`, `- **Next action** — ${reading.nextAction}`].join("\n")].join("\n\n")}
        />
      </div>

      {/* A "Blockers" tile stood here — records blocked at a gate or sitting more than a week. It
          went because "Waiting on This Committee" above covers the same ground with a sharper filter
          (only what needs a ruling from this table) and the summary sentence names the same records
          by name. Three statements of one list. */}
    </div>
  );
}

// ── Pipeline ──
// Where the work is and how fast it moves. The funnel and the decision line came off the
// Overview tab: they are the same subject as the gate register below them, and a committee
// asking "where does this clog" should not have to read two tabs to find out.

// The same glyph for the same measure wherever it appears: size takes the Overview band's
// "In flight" layers, value its "Committed" coins, velocity its "Days to a decision" timer.
// Governance takes the gauge rather than the band's shield, because this one is closure of a
// process, not exposure to a risk.
const TARGET_ICONS: Record<string, ReactNode> = {
  size: <Layers size={13} />,
  value: <Coins size={13} />,
  governance: <Gauge size={13} />,
  velocity: <Timer size={13} />,
};

function PipelineTab({
  cards,
  board,
  months,
  scoped,
}: {
  cards: UseCaseCard[];
  board: UseCaseCard[];
  months: typeof PORTFOLIO_SNAPSHOTS;
  scoped: boolean;
}) {
  const flow = funnel(board, PHASES);
  const cycle = medianCycleDaysByPhase(cards, PHASES);
  const register = stageRegister(board, STAGE_GROUPS, AS_OF);
  const periods = quarters(months);

  return (
    <div className={TAB_GRID}>
      {/* The four bars the committee is held to. On this tab rather than the Overview because each
          one is a statement about throughput — how big the book of work is, how much of it converts
          to money, how much governance is closed out, and how fast a decision comes. */}
      <div className={SPAN}>
        <TargetCards
          cards={targetCards(cards, months, AS_OF, PORTFOLIO_TARGETS.sizeTarget, PORTFOLIO_TARGETS.governanceClosure).map((card) => ({
            ...card,
            icon: TARGET_ICONS[card.key],
          }))}
        />
      </div>

      {/* Pipeline, conversion and cycle time were three tiles asking the reader to match
          four phase names across them and hold the rows in their head. They are four
          facts about the same four phases, so they are one table — where things are, how
          many ever got here, how long it takes, who is waiting. The monthly line sits
          under it because time is the one axis that isn't per-phase. */}
      <TileBox className={SPAN} title="Pipeline" hint={`${cards.length} ever raised`} action={<TileLink href="/">Open the board</TileLink>}>
        <PhaseFlow rows={phaseFlowRows(cards, board, flow, cycle)} />
      </TileBox>

      {/* All twelve stages, not the four phases. The funnel above answers "how far does work
          get"; this answers "which desk is it on", which is the actionable version — a phase is
          not a queue, a stage is. */}
      <TileBox
        className={SPAN}
        title="Gate Register"
        hint="population and dwell at each of the twelve stages"
        action={<TileLink href="/?view=table">Open the board</TileLink>}
      >
        <div className="flex flex-col gap-5">
          {register.map((phase) => (
            <div key={phase.phase} className="min-w-0">
              <div className="mb-2 flex items-baseline gap-2">
                <PhaseIcon phase={phase.phase} size={13} style={{ color: `var(--tone-${PHASE_TONES[phase.phase] ?? "neutral"}-fg)` }} />
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">{phase.phase}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {phase.stages.reduce((sum, stage) => sum + stage.count, 0)} here
                </span>
              </div>
              <DataTable
                columns={["Stage", "Here Now", "Median Dwell", "Oldest"]}
                rows={phase.stages.map((stage) => ({
                  key: stage.stage,
                  label: shortStageLabel(stage.stage),
                  values: [
                    stage.count || "—",
                    // Dwell is the age of what is sitting there, not how long the stage takes.
                    // An empty stage reports nothing rather than zero days.
                    stage.dwell === null ? "—" : `${stage.dwell}d`,
                    stage.oldest === null ? (
                      "—"
                    ) : (
                      <span style={{ color: stage.oldest >= 30 ? "var(--tone-warning-fg)" : undefined }}>{stage.oldest}d</span>
                    ),
                  ],
                  tip:
                    stage.count > 0
                      ? `${stage.stage}\nHere now: ${stage.count}\nMedian dwell: ${stage.dwell}d\nOldest: ${stage.oldest}d`
                      : `${stage.stage}\nNothing is at this stage`,
                }))}
              />
            </div>
          ))}
        </div>
      </TileBox>

      {/* The register counts records; this weights them. Four ideas at Ideation and one build at
          Solutionise are the same row count and very different exposure, and it's the money that
          decides which queue to clear first. */}
      {/* Two-up. Both are charts of about the same height and neither needs the page's full width —
          stacked full-bleed they made the tab a column of wide, shallow plots, which is the shape
          every dashboard worth copying avoids. */}
      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        <TileBox className="h-full" title="Value at Stake" hint="committed and asked-for money, by stage">
          <StageValueChart rows={valueAtStake(board, STAGE_GROUPS)} format={usd} shortLabel={shortStageLabel} />
        </TileBox>

        {/* Its own tile now. The pipeline above became a chart in its own right, and a phase
          axis and a time axis in one box read as one broken chart — a line starting under a
          funnel invites you to match its points to the four phases, which is not what it
          plots. */}
        <TileBox
          className="h-full"
          title="Decision Time"
          hint="median days from intake to a first gate decision"
          footer={scoped ? "Portfolio-wide: the scope filter narrows the pipeline above, not this line." : undefined}
        >
          <TimeChart
            data={decisionSpeedSeries(months)}
            series={[{ key: "days", name: "Days", colour: "var(--accent)" }]}
            reference={{ y: DECISION_TARGET_DAYS }}
            yFormat={(value) => `${value}d`}
          />
          {/* The target is a dashed swatch under the plot rather than a label on it, where
            `insideTopRight` put it exactly where a line coming down from 24 days to 14
            passes through. Below, because every legend on this page now sits below. */}
          <div className="mt-2 flex justify-end">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span aria-hidden className="h-0 w-4 border-t border-dashed border-[var(--border-input)]" />
              {DECISION_TARGET_DAYS}d target
            </span>
          </div>
        </TileBox>
      </div>

      {/* Whether the last round of interventions worked. Cumulative measures, so a quarter
          reports its closing position rather than a sum of its months. */}
      <TileBox className={SPAN} title="Quarter on Quarter" hint={`${periods.length} quarters in the window`}>
        <DataTable
          columns={["Quarter", "Months", "Committed", "Confirmed", "Days to a Decision"]}
          rows={periods.map((period) => ({
            key: period.label,
            label: period.label,
            values: [period.months, usd(period.close.committedUsd), usd(period.close.benefitUsd), `${period.close.medianDaysToDecision}d`],
            tip: `${period.label}\nClosing position at ${period.close.label}\n${period.months} month-end${period.months === 1 ? "" : "s"} in the window`,
          }))}
        />
      </TileBox>
    </div>
  );
}

// ── Value ──

function ValueTab({ cards, months, scoped }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS; scoped: boolean }) {
  const h = headline(cards, months, AS_OF);
  const span = months.length > 1 ? `${months[0].label} → ${months[months.length - 1].label}` : undefined;
  const money = moneyByState(cards);
  const real = realization(cards);
  const concentration = benefitConcentration(cards);
  const summary = attainmentSummary(kpiAttainment(cards));
  const prod = impact(cards);
  // The ledger, in two halves keyed by the record: what is live and what it returns,
  // and what was asked for and stopped.
  const live = productionRows(cards);
  const stopped = stoppedRows(cards);
  // `targets` / `behind` (every KPI, and the ones short of plan) went with the hidden
  // "Targets Against Plan" block. `summary` above still counts them for the stat band.
  // Every function, not the default top six: the band below states each one's share of the
  // total, so a truncated list would make those shares wrong.
  const byFunction = valueByFunction(cards, Number.MAX_SAFE_INTEGER);
  // The biggest unfunded ask — the one the money table's "still an ask" row is mostly made
  // of, and the one decision worth the most.

  return (
    <div className={TAB_GRID}>
      <div className={SPAN}>
        <StatBand
          items={[
            {
              label: "Committed",
              value: usd(h.investment),
              delta: `${money[0].count + money[1].count} funded records`,
              icon: <Coins size={13} />,
              trend: months.map((month) => month.committedUsd),
              trendLabel: span,
              tip: "Investment on live and funded work",
            },
            {
              label: "Confirmed benefit",
              value: usd(h.benefit),
              // The realization rate, not the count of live records — a benefit figure with no
              // rate beside it can't be told apart from a business case written optimistically.
              delta: `${pct(real.ratio)} of ${usd(real.projected)} projected`,
              deltaTone: real.ratio >= 0.8 ? "good" : "warn",
              icon: <TrendingUp size={13} />,
              trend: months.map((month) => month.benefitUsd),
              trendLabel: span,
              tip: "Measured at Monitoring and Tracking, not claimed in the business case",
            },
            // A "Payback" cell stood here — committed spend over the benefit of what is
            // live. Two reasons it went: the summary sentence right below already says the
            // live ones "repay in about 14 months", and "Spend and Return" now prints a
            // ratio per state, so the same relationship was on the tab twice on two
            // different populations (all committed against live-only benefit, versus each
            // state against itself). One of those had to go, and the stat was the vaguer.
            {
              label: "Targets met",
              value: `${summary.met}/${summary.total}`,
              delta: summary.met === summary.total ? "all on target" : `${summary.total - summary.met} behind`,
              deltaTone: summary.met === summary.total ? "good" : "warn",
              icon: <Target size={13} />,
              tip: "KPIs measured in production against their target",
            },
          ]}
        />
      </div>

      <div className={SPAN}>
        <SummaryPanel title="Summary" source={valueSummary(cards, months, AS_OF)} meta={summaryProvenance(cards, months, AS_OF)} />
      </div>

      {/* Where the money is, then how it got there. The table comes first: it's today's
          position, which is what gets read, and the chart is the six months behind it. */}
      {/* Four states, and for each one what it cost against what it returns. As a table
          this was four rows of two money figures, which is the comparison the tab exists to
          make and the one arrangement that hides it: "Live and earning" and "Still an ask"
          were the same shape of row, and nothing said that one of those benefits is banked
          and the other is a hope. Paired bars on one scale say it without a sentence. */}
      <TileBox
        className={SPAN}
        title="Spend and Return"
        // The caveat the deleted monthly chart used to carry, now pointed at the sparklines
        // that outlived it — those read the portfolio's own history and don't narrow.
        footer={scoped ? "The trend lines above are portfolio-wide; the scope filter narrows these bars." : undefined}
      >
        <ColumnChart
          height={180}
          series={[
            // Two weights of the same green, not green against clay: these are the same
            // money in two states, and clay is this product's warning family — it made
            // "benefit" read as the thing that had gone wrong. The paler bar is what went
            // in, the accent is what comes back, so the eye lands on the return.
            { name: "Committed", fill: "var(--accent-ring)" },
            { name: "Benefit a year", fill: "var(--accent)" },
          ]}
          columns={money
            .filter((state) => state.count > 0)
            .map((state) => {
              const ratio = state.investment ? state.benefit / state.investment : 0;
              return {
                key: state.key,
                values: [state.investment, state.benefit],
                displays: [
                  usd(state.investment),
                  // Only the live state's benefit is money the business has; everywhere
                  // else it's a projection, so it's set back rather than printed as fact.
                  state.benefit ? (
                    <span style={{ color: state.key === "live" ? "var(--status-success)" : "var(--text-muted)" }}>{usd(state.benefit)}</span>
                  ) : (
                    "—"
                  ),
                ],
                label: (
                  <>
                    <span className="max-w-full truncate text-[13px] text-[var(--text-body)]">{state.label}</span>
                    {/* Two lines, not three. The record count went to the hover: it was the
                        third mono figure under a column that already prints two money
                        figures above it, and it isn't what this tile is about.

                        The ratio stays, because two bar lengths still leave the reader
                        dividing one by the other — and it's the whole judgement: three
                        states run at about 1.5×, and the stopped one gave back less than
                        half of what it took. */}
                    <span
                      className="font-mono text-[11px] [font-variant-numeric:tabular-nums]"
                      style={{ color: ratio >= 1 ? "var(--status-success)" : "var(--tone-warning-fg)" }}
                    >
                      {ratio.toFixed(1)}× back
                    </span>
                    {/* What kind of number the return bar is. Only the live row is a
                        measurement; the rest are a projection, an ask, or money written off, and
                        four bars of the same colour read as four comparable facts otherwise. */}
                    <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-faint)]">{state.basis}</span>
                  </>
                ),
                tip:
                  state.key === "live"
                    ? `${state.label}\nRecords: ${state.count}\nSpent: ${usd(state.investment)}\nEarning: ${usd(state.benefit)} a year`
                    : `${state.label}\nRecords: ${state.count}\nCommitted: ${usd(state.investment)}\nProjected benefit: ${usd(state.benefit)} a year`,
              };
            })}
        />
      </TileBox>

      {/* A "Month by Month" tile stood here — two cumulative lines, committed against the
          benefit of what is live, over the same six months. It went because this tab was
          drawing that series three times: the first two stats in the band above each carry
          it as a sparkline, and a magnified third copy with an axis was the single largest
          block on the tab for a shape already stated twice. The exact monthly figures were
          only ever available on a hover, which is where they still are. */}

      {/* Where the money went, by the part of the business that asked for it. This only
          existed as a sentence the rail could say — the one question on this tab that had no
          picture, and the one a leader asks before "which records". Bars because the answer
          is a comparison of six lengths, not six figures to read.

          Directly under "Spend and Return" on purpose: both are the same money cut a
          different way — by what state it's in, then by who asked for it. The ledger of
          individual records used to sit between them, so the tab said "money, records,
          money, records" instead of finishing one thought before starting the next.

          A mosaic, not a ranking. This was a second `ColumnChart`, then a bar list, then a dot
          plot, and the shape kept being wrong because the question was: eight functions each
          hold between 8% and 17% of the money, so there is almost no spread to rank, and any
          side-by-side chart of them is eight near-identical lengths. Split by area, the answer
          is the proportion — which is what "by function" is actually asking — and two rows of
          cells give the tile some form, where one strip of eight gave every cell the same
          height and so reproduced the flatness it was meant to escape.

          Every function, not the top six. Areas that don't add up to the whole state shares
          that aren't true, so the `max` is lifted and the hint carries the total. */}
      <TileBox
        className={SPAN}
        title="Investment by Function"
        hint={`${usd(byFunction.reduce((sum, row) => sum + row.investment, 0))} across ${byFunction.length} functions`}
      >
        <ShareMosaic
          segments={byFunction.map((row) => ({
            key: row.fn,
            label: row.fn,
            value: row.investment,
            display: usd(row.investment),
            meta: `${row.count} ${row.count === 1 ? "record" : "records"}`,
            // Only what the segment doesn't already say. It used to repeat the record count and
            // the committed figure, both of which are printed inside the segment now, so two of
            // the hover's three lines were the thing you were hovering.
            tip: `${row.fn}\nBenefit a year: ${usd(row.benefit)}\nReturn: ${(row.benefit / (row.investment || 1)).toFixed(1)}× committed`,
          }))}
        />
      </TileBox>

      {/* One row per live record, in columns. As five free-form groups this was unreadable:
          every group repeated its own labels, comparing two records meant reading across a
          gap, and "79% of 70%" is not a sentence anyone parses. A table puts the same facts
          in columns, so "which cost the most" and "who is behind" are one glance down. Ten
          target figures don't belong in it — eight of them are fine, so only the misses get
          named, underneath. */}
      <TileBox
        className={SPAN}
        title="Live Use Cases"
        hint={live.length ? `${compactNumber(prod.activeUsers)} users · ${compactNumber(prod.hoursSaved)} hours saved a year` : undefined}
      >
        {live.length ? (
          <>
            {/* No "Live Since" column. The rows are sorted newest-live first, so the date was
                stating the order they were already in, and a go-live date isn't a number anyone
                acts on at portfolio level — it's on the hover, with the payback and the hours. */}
            <DataTable
              columns={["Record", "Cost", "Benefit a Year", "Users", "Targets"]}
              rows={live.map((row) => ({
                key: row.card.id,
                label: (
                  <Link href={row.card.href} className="truncate hover:text-[var(--accent-strong)]">
                    {row.card.title}
                  </Link>
                ),
                values: [
                  usd(row.card.investmentUsd),
                  usd(row.card.annualBenefitUsd),
                  row.card.activeUsers ? compactNumber(row.card.activeUsers) : "—",
                  row.total ? (
                    <span style={{ color: row.met === row.total ? "var(--status-success)" : "var(--tone-warning-fg)" }}>
                      {row.met}/{row.total}
                    </span>
                  ) : (
                    "—"
                  ),
                ],
                tip: `${row.card.id} ${row.card.title}\nLive since: ${formatDay(row.card.liveSince ?? AS_OF)}\nFunction: ${row.card.businessFunction}\nPayback: ${row.payback ? `${row.payback} months` : "not measurable"}\nHours saved: ${compactNumber(row.card.hoursSavedPerYear ?? 0)} a year`,
              }))}
            />
            {/* A "Targets Against Plan" block sat here: all ten production KPIs as bars either
                side of a zero line, over for met and under for behind. Hidden for now, not
                deleted — `DeviationBars` is still in `tiles.tsx` and `attainmentSummary` still
                feeds the "Targets met" stat in the band above, so restoring it is this block
                and one import. */}
          </>
        ) : (
          <TileEmpty>Nothing in this scope has reached production yet.</TileEmpty>
        )}
      </TileBox>

      {/* Where the confirmed benefit actually comes from. An average return per record hides
          whether the portfolio is carried by two use cases or by all of them. */}

      {/* Paired. Both are readings of the same ledger — what the money returned, and what it was
          spent on and stopped — and each was a full-width band with a five-row list in it, which left
          "Where the Benefit Is Concentrated" sitting alone under a table it isn't about. */}
      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        <TileBox className="h-full" title="Where the Benefit Is Concentrated" hint={`${usd(concentration.total)} confirmed a year`}>
          <ShareMosaic
            rows={1}
            height={92}
            segments={[
              {
                key: "top",
                label: `Top ${concentration.top.count}`,
                display: pct(concentration.top.share),
                meta: usd(concentration.top.confirmed),
                value: concentration.top.confirmed,
                tip: `Top ${concentration.top.count} by confirmed benefit\n${concentration.top.records.map((row) => row.card.title).join("\n")}`,
              },
              {
                key: "rest",
                label: `Remaining ${concentration.rest.count}`,
                display: pct(concentration.rest.share),
                meta: usd(concentration.rest.confirmed),
                value: concentration.rest.confirmed,
                tip: `The other ${concentration.rest.count} live records\nConfirmed: ${usd(concentration.rest.confirmed)}`,
              },
            ]}
          />
          {/* The band says three records carry it; these say which three. Without them the tile
              was two figures and a lot of white space, and the obvious follow-up question had to
              go to the assistant. Each row carries its own share of the confirmed total, so the
              lengths add up to the band's left half. */}
          <div className="mt-4 flex flex-col border-t border-[var(--border-hairline)] pt-1">
            {concentration.top.records.map((row, index) => (
              <div
                key={row.card.id}
                data-tip={`${row.card.id} ${row.card.title}\n${row.card.businessFunction} · live since ${formatDay(row.card.liveSince ?? AS_OF)}\nConfirmed: ${usd(row.confirmed)} a year`}
                className={cn(
                  "grid min-w-0 grid-cols-[14px_minmax(0,1fr)_minmax(48px,84px)_46px] items-center gap-3 py-2",
                  index > 0 && "border-t border-[var(--border-hairline)]",
                )}
              >
                <span className="font-mono text-[11px] text-[var(--text-faint)]">{index + 1}</span>
                <Link href={row.card.href} className="min-w-0 truncate text-[13px] text-[var(--text-body)] hover:text-[var(--accent-strong)]">
                  {row.card.title}
                </Link>
                <span className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(row.share * 100)}%` }} />
                </span>
                <span className="font-mono text-right text-[12px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                  {usd(row.confirmed)}
                </span>
              </div>
            ))}
          </div>
        </TileBox>

        {/* The other half of the ledger. None of the production columns apply — a stopped
          record has an ask, a date and a reason, and the money was never spent. */}
        <TileBox className="h-full" title="Stopped and Parked">
          <MiniList
            max={6}
            rows={stopped.map((card) => ({
              key: card.id,
              node: (
                // Three things per row: what it was, whether it was refused or paused, and what
                // was being asked for. The stop date came off for the same reason the go-live
                // date did — these are sorted newest-stopped first, so "12 Jun 2026" restated the
                // row's position, and every one of them carried a redundant "2026".
                <div
                  data-tip={`${card.title}\nStopped: ${formatDay(card.closedOn ?? AS_OF)}\nAsk: ${usd(card.investmentUsd)}`}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <Link href={card.href} className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)] hover:text-[var(--accent-strong)]">
                    {card.title}
                  </Link>
                  <Tag tone={LIFECYCLE_TONE[card.lifecycle]} className={cn(CHIP, "shrink-0")}>
                    {card.lifecycle}
                  </Tag>
                  <span className="font-mono w-12 shrink-0 text-right text-[12px] text-[var(--text-primary)]">{usd(card.investmentUsd)}</span>
                </div>
              ),
            }))}
          />
        </TileBox>
      </div>

      {/* "Capability Mix" was here as well as on the Functions tab — the same three counts drawn
          twice on one page. It keeps the Functions one, where it sits beside the conversion rate it
          should be read against. */}
    </div>
  );
}

// The three tiers as one ramp of the accent, lightest to darkest, because they *are* ordered — a
// Full assessment is more of the same thing than a Lightweight one, not a different category. This
// is the mosaic's own ramp, kept so the tile reads the same after changing shape.
const RISK_TIER_FILL: Record<RiskTier, string> = {
  Lightweight: "var(--accent-ring)",
  Standard: "var(--accent)",
  Full: "var(--accent-strong)",
};

// The axis labels. Five control names set around a 232px radar overlap each other and clip on the
// frame, so the axis takes a word and the tooltip keeps the full name.
const CONTROL_SHORT: Record<string, string> = {
  "Training completed": "Training",
  "Responsible AI sign-off": "Responsible AI",
  "Support model in place": "Support model",
  "Bias monitoring live": "Bias monitoring",
  "Embedded in SOP": "In SOP",
};

// ── Governance & risk ──
// The tab that only exists on a leadership page. Everything here is a rule and its exceptions:
// what supervision a record has against what its risk demands, what it touches, who had to
// review it, and whether the controls that make adoption stick were ever finished. None of it
// is a project status — a delivery lead cannot change a risk tier or waive an oversight rule.

function GovernanceTab({ cards }: { cards: UseCaseCard[] }) {
  const matrix = OVERSIGHT_LEVELS.map((level) => ({
    key: level,
    label: level,
    cells: OVERSIGHT_MODES.map((mode) => {
      const here = cards.filter((card) => card.riskLevel === level && card.oversight === mode);
      return {
        key: mode,
        count: here.length,
        // Flagged where this combination is below what the risk level requires.
        flagged: !OVERSIGHT_REQUIRED[level].includes(mode),
        tip: here.length
          ? `${level} risk · oversight ${mode.toLowerCase()}\n${here.map((card) => `${card.title} — ${card.lifecycle.toLowerCase()}`).join("\n")}`
          : `${level} risk · oversight ${mode.toLowerCase()}\nNothing here`,
      };
    }),
  }));
  const under = underSupervised(cards);
  const underLive = under.filter((card) => card.lifecycle === "Live");
  const recorded = cards.filter((card) => card.oversight).length;
  const gates = gateOutcomes(cards);
  const controls = adoptionControls(cards);
  // The mean of the five — what "adoption depth" means in the health score. It was the dial in the
  // middle of the old panel; with a radar there is no middle, so it goes in the header where the
  // other tiles put their one summarising figure.
  const controlDepth = controls.length ? controls.reduce((sum, row) => sum + row.ratio, 0) / controls.length : 0;

  return (
    <div className={TAB_GRID}>
      {/* The cross-tab, not two separate breakdowns. Risk levels in one tile and oversight
          levels in another cannot answer whether the two line up, which is the only question
          worth asking of either. */}
      <TileBox
        className={SPAN}
        title="Oversight Against Risk"
        hint={`${recorded} of ${cards.length} have oversight recorded`}
        footer="Oversight is set at Qualification, so records still in Ideation or Prioritisation are absent rather than counted as unsupervised."
      >
        <MatrixTable corner="Risk level" columns={[...OVERSIGHT_MODES]} rows={matrix} />
        <div className="mt-4 border-t border-[var(--border-hairline)] pt-4">
          {under.length ? (
            <MiniList
              rows={under.map((card) => ({
                key: card.id,
                node: (
                  // A grid with named tracks, not a flex row of `shrink-0` spans. "On exceptions" is
                  // the longest oversight label and it didn't fit the 92px column it was given, so it
                  // wrapped to two lines and shoved its own dot up out of the row — which then made
                  // every neighbouring row a different height. Fixed tracks, and the oversight cell
                  // gets the width its longest value actually needs.
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_84px_124px_72px] items-center gap-3">
                    <Link
                      href={card.href}
                      className="min-w-0 truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-strong)]"
                    >
                      {card.title}
                    </Link>
                    <span className="font-mono truncate text-right text-[11px] text-[var(--text-muted)]">{card.riskLevel} risk</span>
                    {/* `whitespace-nowrap` as well as the wider track: the dot and its word are one
                        object, and a break between them reads as a stray bullet. */}
                    <span className="min-w-0 whitespace-nowrap">
                      <StatusDot tone={card.lifecycle === "Live" ? "bad" : "warn"} label={card.oversight ?? "—"} />
                    </span>
                    <span className="flex justify-end">
                      <Tag tone={LIFECYCLE_TONE[card.lifecycle]} className={cn(CHIP, "shrink-0")}>
                        {card.lifecycle}
                      </Tag>
                    </span>
                  </div>
                ),
              }))}
              max={6}
            />
          ) : (
            <TileEmpty>Every record carries the oversight its risk level requires.</TileEmpty>
          )}
          {underLive.length ? (
            <p className="mt-3 text-[12px] text-[var(--tone-warning-fg)]">
              {underLive.length} of these {underLive.length === 1 ? "is" : "are"} already in production. That is an oversight ruling, not a project
              plan.
            </p>
          ) : null}
        </div>
      </TileBox>

      {/* Paired by height, not by subject. These four are a five-row ranking, a five-row legend, a
          three-figure card and a share band — laid out in subject order they put a tall tile beside a
          short one twice, and `items-start` left the gaps showing. Grouped tall-with-tall and
          short-with-short, each row stretches to one height and the column closes up. */}
      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        {/* Counted per record, so these sum past the record count — one use case can trigger four
            reviews. Bars because it's a ranking of load, not a partition. */}
        <TileBox className="h-full" title="Compliance Load" hint="reviews triggered at Triage">
          <TallyRows
            total={cards.length}
            rows={complianceLoad(cards).map((row) => ({
              key: row.review,
              label: row.review,
              count: row.count,
              tip: `${row.review}\nTriggered on ${row.count} of ${cards.length} records`,
            }))}
          />
        </TileBox>

        {/* Three counts of 18, floating in a row, was a filing note. Split by where the record sits,
            the same three numbers become a ruling: exposure on something live is a control that either
            exists today or doesn't, exposure on something in build is still a design decision, and
            exposure on something stopped is closed. Stacked, so the flag's total is still the bar. */}
        <TileBox className="h-full" title="Data Exposure" hint={`declared at Ideation · ${cards.length} records`}>
          <HorizontalBars
            height={196}
            labelWidth={106}
            stacked
            format={(value) => String(value)}
            series={[
              { key: "live", label: "In production", color: "var(--accent)" },
              { key: "inFlight", label: "In flight", color: "var(--accent-ring)" },
              { key: "stopped", label: "Stopped", color: "var(--surface-strong)" },
            ]}
            data={exposureLoad(cards).map((row) => ({
              label: row.kind,
              live: row.live,
              inFlight: row.inFlight,
              stopped: row.stopped,
            }))}
          />
        </TileBox>
      </div>

      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        {/* The five things that decide whether a live use case is actually used. Measured only on
            production records: a control recorded at Adoption can't be assessed on something still
            in build.

            A radar, and half the width it had. Five bars running the full 1080px was five hundred
            pixels of bar for a five-record population, and the question here is not "rank these five"
            — it is whether the portfolio is evenly controlled or strong in one place and empty in
            another, which is a shape. */}
        <TileBox
          className="h-full"
          title="Adoption Controls"
          hint={controls.length ? `${pct(controlDepth)} across ${controls[0].total} live records` : undefined}
          footer="A record can be Active at Adoption with these unfinished. The lifecycle permits it; the audit trail records it."
        >
          {controls.length ? (
            <ControlRadar
              points={controls.map((row) => ({ key: row.key, short: CONTROL_SHORT[row.label] ?? row.label, label: row.label, ratio: row.ratio }))}
            />
          ) : (
            <TileEmpty>Nothing is live yet, so no adoption control can be assessed.</TileEmpty>
          )}
        </TileBox>

        {/* A ring, against this page's own no-donuts rule — and the exception the rule was written
            for: every record has exactly one tier, so this is a real partition, and the three-band
            mosaic that was here was a strip of colour across the top of a card that then sat two
            thirds empty beside the exposure chart. */}
        <TileBox className="h-full" title="Governance Tier" hint="assigned at Triage">
          <ShareDonut
            centreLabel={{ value: String(cards.length), caption: "records" }}
            segments={riskMix(cards).map((row) => ({
              key: row.tier,
              label: `${row.tier} assessment`,
              count: row.count,
              color: RISK_TIER_FILL[row.tier],
              tip: `${row.tier} tier\n${row.count} of ${cards.length} records`,
            }))}
          />
        </TileBox>
      </div>

      {/* Last, and full width, because it is one band rather than a list: every gate ever raised,
          split by how it ended. It was paired with Compliance Load, where a single 8px meter sat in a
          card as tall as a five-row list. */}
      <TileBox className={SPAN} title="Gate Outcomes" hint={`${gates.decided} decided · ${gates.open} awaiting`}>
        <StackedMeter
          segments={gateMix(cards).map((row) => ({
            key: row.status,
            label: row.status,
            count: row.count,
            tone: GATE_TONE[row.status],
          }))}
        />
      </TileBox>
    </div>
  );
}

// ── The leaderboard ──
// Four rankings of the same eight functions, one control to switch between them. They disagree —
// Finance confirms the most money, Support realises the highest share of what it promised — and
// that disagreement is the point: a single ranking would pick a winner and hide the trade.
const LEADERBOARD_METRICS = [
  { key: "confirmed", label: "Confirmed benefit" },
  { key: "conversion", label: "Conversion" },
  { key: "realised", label: "Realised" },
  { key: "volume", label: "Volume" },
] as const;

type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number]["key"];

function Leaderboard({ rows }: { rows: ReturnType<typeof functionLeaderboard> }) {
  const [metric, setMetric] = useState<LeaderboardMetric>("confirmed");
  // Nulls sort last whatever the direction: a function with nothing live has not realised 0% of
  // its promises, it has made none yet, and ranking it below the worst performer would say the
  // wrong thing.
  const ranked = [...rows].sort((a, b) => (b[metric] ?? -1) - (a[metric] ?? -1));
  const most = Math.max(1, ...ranked.map((row) => row[metric] ?? 0));

  return (
    <TileBox
      className={SPAN}
      title="Leaderboard"
      // A boxed segmented control, the same shape as the Health/Value toggle this page used to carry:
      // four loose text buttons with one tinted read as a sentence with a highlighted word, not as a
      // control, and gave no edge to aim at.
      action={
        <span className="inline-flex items-center gap-0.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-strong)] p-0.5">
          {LEADERBOARD_METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetric(option.key)}
              aria-pressed={option.key === metric}
              className={cn(
                "rounded-[8px] px-2.5 py-1 text-[11px] transition",
                option.key === metric
                  ? "bg-[var(--surface)] font-semibold text-[var(--text-primary)]"
                  : "text-[var(--text-body)] hover:text-[var(--text-primary)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </span>
      }
    >
      {/* Two columns of four, not eight rows. Full width, one bar per row ran a thousand pixels to
          say "$300K" and left the ranks and the figures at opposite ends of the card; split, the bars
          are half as long, the eye travels half as far, and the top of the ranking sits beside the
          bottom of it where the two can be compared. */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {[ranked.slice(0, Math.ceil(ranked.length / 2)), ranked.slice(Math.ceil(ranked.length / 2))].map((column, columnIndex) => (
          <div
            key={columnIndex}
            // Ruled, not just gapped. At `gap-x-8` the fourth figure of the left column and the fifth
            // rank of the right one were close enough to read as one row of six cells; the rule plus
            // 40px either side of it makes them two lists.
            className={cn("flex min-w-0 flex-col", columnIndex === 0 ? "lg:pr-10" : "lg:border-l lg:border-[var(--border-hairline)] lg:pl-10")}
          >
            {column.map((row, index) => {
              const value = row[metric];
              const display =
                metric === "confirmed" ? usd(row.confirmed) : metric === "volume" ? String(row.volume) : value === null ? "—" : pct(value as number);
              return (
                <div
                  key={row.fn}
                  data-tip={`${row.fn}\nRecords: ${row.volume} (${row.live} live)\nCommitted: ${usd(row.committed)}\nConfirmed: ${usd(row.confirmed)}\nConversion: ${pct(row.conversion)}\nRealised: ${row.realised === null ? "nothing live yet" : pct(row.realised)}`}
                  className={cn(
                    // A fixed label column, not `auto`. Grid tracks are sized per grid, and the two
                    // columns here are two grids — so "Supply Chain" sized the left one and "Support"
                    // the right one, and the bars started and ended at different x on each side. Four
                    // bars of one length and four of another is unreadable as a ranking.
                    "grid min-w-0 grid-cols-[18px_100px_minmax(48px,1fr)_58px] items-center gap-3 py-2.5",
                    index > 0 && "border-t border-[var(--border-hairline)]",
                  )}
                >
                  {/* The rank, because a sorted list still leaves people counting rows. It counts
                      through the columns, so the second one starts at five. */}
                  <span className="font-mono text-[11px] text-[var(--text-faint)] [font-variant-numeric:tabular-nums]">
                    {columnIndex * Math.ceil(ranked.length / 2) + index + 1}
                  </span>
                  <span className="min-w-0 truncate text-[13px] text-[var(--text-body)]">{row.fn}</span>
                  <span aria-hidden className="block h-2 min-w-0 overflow-hidden rounded-[3px] bg-[var(--surface-strong)]">
                    <span
                      className="block h-full rounded-[3px]"
                      style={{
                        width: `${Math.max(value ? 1.5 : 0, ((value ?? 0) / most) * 100)}%`,
                        background: value === null ? "var(--surface-strong)" : "var(--accent)",
                      }}
                    />
                  </span>
                  <span className="font-mono text-right text-[13px] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{display}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </TileBox>
  );
}

// ── Functions ──

function FunctionsTab({ cards, months }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS }) {
  const byFunction = valueByFunction(cards, Number.MAX_SAFE_INTEGER);
  const maturity = maturityIndex(cards, months, PHASES, AS_OF);
  const leaderboard = functionLeaderboard(cards, PHASES);
  const leaderboardByFunction = new Map(leaderboard.map((row) => [row.fn, row]));

  return (
    <div className={TAB_GRID}>
      {/* Confirmed against claimed, per function. The committed column is what went in; the two
          benefit columns are what was promised and what has been measured, and the gap between
          them is the only reason to break this out by function at all. */}
      {/* Eight functions by five columns was forty cells and one question: is this function ahead of
          what it spent? Two bars a function answer it by length. Projected came off — the middle of
          three money series is the one nobody reads, and the gap that matters is spent against
          measured. Records and conversion moved to the hover, where they belong: they are counts, and
          they were being read against money in the same row. */}
      <TileBox
        className={SPAN}
        title="By Business Function"
        hint={`${byFunction.length} functions · committed against confirmed`}
        footer="A function with no confirmed bar has nothing live yet — the committed bar is money out with nothing measured back."
      >
        <HorizontalBars
          // Columns. As rows, eight bars each running most of 1080px read as a ranking with a lot of
          // ink, and the pair per function sat a long way from the next pair down. Side by side the
          // committed/confirmed pair is one object, and the eight are one comparison.
          direction="column"
          height={260}
          format={usd}
          series={[
            { key: "committed", label: "Committed", color: "var(--accent-ring)" },
            { key: "confirmed", label: "Confirmed", color: "var(--accent)" },
          ]}
          data={byFunction.map((row) => ({ label: row.fn, committed: row.investment, confirmed: row.confirmed }))}
          describe={(fn) => {
            const row = byFunction.find((entry) => entry.fn === fn);
            if (!row) return "";
            return `${row.count} records · ${pct(leaderboardByFunction.get(fn)?.conversion ?? 0)} reached the last phase`;
          }}
        />
      </TileBox>

      <Leaderboard rows={leaderboard} />

      {/* Paired explicitly rather than left to the tab's own `items-start` grid: three tally rows
          beside a radial and five sub-scores is a card half the height of its neighbour, and the gap
          showed. Stretched, the tally spends the difference on its own row spacing. */}
      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        <TileBox className="h-full" title="Capability Mix" hint="recorded at Ideation">
          <TallyRows
            total={cards.length}
            rows={capabilityMix(cards).map((row) => ({
              key: row.capability,
              label: row.capability,
              count: row.count,
              note: `${row.live} live · ${usd(row.committed)} committed · ${row.confirmed ? `${usd(row.confirmed)} confirmed` : "nothing measured"}`,
              tip: `${row.capability}\n${row.count} of ${cards.length} records · ${row.live} live\nCommitted: ${usd(row.committed)}\nConfirmed: ${usd(row.confirmed)}`,
            }))}
          />
        </TileBox>

        {/* A composite, with its five sub-scores beside it — the same argument as the health
            score: one number that hides its own reasoning invites the question "made of what". */}
        <TileBox className="h-full" title="AI Maturity Index" hint={`${maturity.outOf5} of 5`}>
          <ScorePanel score={maturity.score} parts={maturity.parts.map((part) => ({ label: part.label, ratio: part.score }))} />
        </TileBox>
      </div>
    </div>
  );
}

// ── The leadership views, as a tab of the tracker ──
// This was its own route with its own shell (`/portfolio`, a full-width panel and a docked
// assistant). It is one surface now: the same rail, the same panel, and a `Leadership` tab beside
// Board and Table. What lives here is everything *below* the panel header — an inner tab row for the
// five views, the two scope selects on that row's right, and the tiles.
//
// Nested rather than flattened into the panel's own tab row: seven tabs in one row would put "Board"
// and "Governance" at the same level, and they are not — the first two are ways of reading records,
// these five are readings of the whole portfolio.
export function LeadershipViews() {
  const [tab, setTab] = useState<PortfolioTab>("overview");
  // The whole portfolio over the whole window. `filterUseCasesByScope` still runs so the tracker's
  // scope helper stays the one definition of "team" and "mine" — it just isn't offered here, because
  // scope-by-person is a tracker concern and this is the committee's read.
  const scope: ScopeFilter = "all";
  const activeProfile = CURRENT_USER;
  // Two scopes, narrowing different things: `quarter` narrows the *history* (which month-ends the
  // trends read), `businessFn` narrows the *records*.
  const [quarter, setQuarter] = useState<string>(ALL_PERIODS);
  const [businessFn, setBusinessFn] = useState<string>(ALL_FUNCTIONS);

  const cards = useMemo(
    () => narrowToFunction(filterUseCasesByScope(ALL_RECORDS, scope, activeProfile), businessFn),
    [scope, activeProfile, businessFn],
  );
  const board = useMemo(
    () => narrowToFunction(filterUseCasesByScope(USE_CASES, scope, activeProfile), businessFn),
    [scope, activeProfile, businessFn],
  );
  // A quarter narrows to its own month-ends; the default keeps the whole window the snapshots cover,
  // because a single-month quarter has no trend in it to draw.
  const months = useMemo(() => {
    if (quarter === ALL_PERIODS) return PORTFOLIO_SNAPSHOTS;
    const match = quarters(PORTFOLIO_SNAPSHOTS).find((row) => row.label === quarter);
    return match ? PORTFOLIO_SNAPSHOTS.filter((month) => quarterLabel(month.key) === quarter) : PORTFOLIO_SNAPSHOTS;
  }, [quarter]);

  return (
    <div className="flex min-w-0 flex-col">
      {/* The reporting mode's view row: which reading on the left, what it is scoped to on the right.
          The same `PanelViewRow` the registry mode uses for Board / Table and its filters, so the two
          modes present themselves identically. */}
      <PanelViewRow
        views={
          // Named, not icon-only. `compact` is right for Board / Table, where two familiar glyphs
          // carry it — but a gauge, a pulse, a coin, a shield and a building are five icons nobody can
          // rank by eye, and "which of these is Governance" is not a guess a committee should make.
          <PanelTabs
            activeId={tab}
            onSelect={(id) => setTab(id as PortfolioTab)}
            tabs={[
              { id: "overview", label: "Overview", icon: <Gauge size={15} /> },
              { id: "pipeline", label: "Pipeline", icon: <Activity size={15} /> },
              { id: "value", label: "Value", icon: <Coins size={15} /> },
              { id: "governance", label: "Governance", icon: <ShieldCheck size={15} /> },
              { id: "functions", label: "Functions", icon: <Building2 size={15} /> },
            ]}
          />
        }
        controls={
          <>
            <StripSelect
              label="Period"
              value={quarter}
              onChange={setQuarter}
              // Short on the button, full in the menu: a value has room to qualify itself in a menu and
              // none at the end of a control row.
              options={[
                { value: ALL_PERIODS, label: "6 months", menuLabel: "All 6 months" },
                ...quarters(PORTFOLIO_SNAPSHOTS)
                  .slice()
                  .reverse()
                  .map((row) => ({ value: row.label, label: row.label, menuLabel: `${row.label} · ${row.months}mo` })),
              ]}
            />
            <StripSelect
              label="Business function"
              value={businessFn}
              onChange={setBusinessFn}
              options={[
                { value: ALL_FUNCTIONS, label: "All", menuLabel: "All functions" },
                ...[...new Set(ALL_RECORDS.map((card) => card.businessFunction))].sort().map((fn) => ({ value: fn, label: fn })),
              ]}
            />
          </>
        }
      />

      <div className="px-5 pb-8 pt-4">
        {/* An empty scope gets one sentence, not a grid of zeros: a pulse of 100% over no records is
            the most confident wrong number this page could print. */}
        {cards.length === 0 ? (
          <div className={TAB_GRID}>
            <TileBox className={SPAN} title="Nothing in This Function">
              <TileEmpty>No records sit under {businessFn}. Switch the function filter back to all functions.</TileEmpty>
            </TileBox>
          </div>
        ) : tab === "overview" ? (
          <OverviewTab cards={cards} months={months} />
        ) : tab === "pipeline" ? (
          <PipelineTab cards={cards} board={board} months={months} scoped={scope !== "all"} />
        ) : tab === "value" ? (
          <ValueTab cards={cards} months={months} scoped={scope !== "all"} />
        ) : tab === "governance" ? (
          <GovernanceTab cards={cards} />
        ) : (
          <FunctionsTab cards={cards} months={months} />
        )}
      </div>
    </div>
  );
}

// What the rail says when this tab is showing. Exported so the shell can wire one rail to whichever
// subject is on screen without importing the whole view.
export function leadershipRail(cards: UseCaseCard[], months: typeof PORTFOLIO_SNAPSHOTS) {
  const h = headline(cards, months, AS_OF);
  return {
    intro: `${h.active} of ${h.tracked} use cases are in flight, and ${usd(h.investment)} is committed against ${usd(h.benefit)} of confirmed benefit.`,
  };
}
