"use client";

import { Activity, Building2, Coins, Gauge, Inbox, Layers, ShieldCheck, Target, Timer, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell, ContentPanel, PanelTabs } from "@/components/app-shell";
import { Markdown } from "@/components/document-record/markdown";
import { PhaseFlow, type PhaseFlowRow } from "@/components/portfolio/phase-flow";
import {
  ColumnChart,
  DataTable,
  GroupBars,
  MatrixTable,
  MiniList,
  ScorePanel,
  ShareMosaic,
  StripSelect,
  StatBand,
  StatusDot,
  SummaryPanel,
  TileBox,
  TileEmpty,
} from "@/components/portfolio/tiles";
import { TimeChart } from "@/components/portfolio/time-chart";
import { PersonAvatar } from "@/components/profile";
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
  type ScopeFilter,
  type UseCaseCard,
} from "@/data/registry";
import {
  DECISION_TARGET_DAYS,
  adoptionControls,
  aging,
  annualPerformance,
  attainmentSummary,
  benefitConcentration,
  blockers,
  daysBetween,
  capabilityMix,
  committeeQueue,
  committeeReading,
  complianceLoad,
  compactNumber,
  conversion,
  decisionSpeedSeries,
  formatDay,
  formatMonthDay,
  funnel,
  gateMix,
  exposureLoad,
  gateOutcomes,
  headline,
  healthSummary,
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
  underSupervised,
  usd,
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

const TAB_GRID = "mx-auto grid w-full max-w-[1080px] grid-cols-1 items-start gap-4 lg:grid-cols-2";
const SPAN = "lg:col-span-2";

// The one categorical ramp on the page: three kinds of AI, three hues that aren't the
// accent (which means "the measure") or a status tone.
const CAPABILITY_FILL = ["var(--avatar-5-fg)", "var(--avatar-1-fg)", "var(--avatar-2-fg)"];

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

// Five hues for the governance tallies — reviews, exposure, tiers, gate statuses. Categorical,
// so they come off the avatar ramp rather than the accent, which means "the measure".
const REVIEW_FILL = ["var(--avatar-1-fg)", "var(--avatar-2-fg)", "var(--avatar-3-fg)", "var(--avatar-4-fg)", "var(--avatar-5-fg)"];

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

function OverviewTab({
  cards,
  board,
  months,
}: {
  cards: UseCaseCard[];
  board: UseCaseCard[];
  months: typeof PORTFOLIO_SNAPSHOTS;
}) {
  const h = headline(cards, months, AS_OF);
  const real = realization(cards);
  const annual = annualPerformance(cards, PORTFOLIO_TARGETS.annual);
  const queue = committeeQueue(cards, AS_OF);
  const reading = committeeReading(cards, months, PHASES, AS_OF);
  const health = portfolioHealth(cards, months, AS_OF, PORTFOLIO_TARGETS.priorQuarterHealth);
  const highRisk = cards.filter((card) => card.riskLevel === "High").length;
  // The funnel and the cycle times moved to the Pipeline tab, so this stops deriving them.
  const stalled = blockers(board);
  const aged = aging(board, AS_OF);
  // `pulse()` (four equally weighted measures) is replaced here by `portfolioHealth()`, which
  // weights them and carries a verdict. Nothing else reads `pulse` now.
  const span = months.length > 1 ? `${months[0].label} → ${months[months.length - 1].label}` : undefined;

  // One row per record that isn't moving: the blocked ones first, then whatever has
  // simply been sitting. A record can be both; it appears once.
  const notMoving = [
    // Days measured straight from the record: `aging()` only counts active ones, and
    // a parked record is exactly the thing that has been sitting longest.
    ...stalled.map((card) => ({ card, days: daysBetween(card.stageEntered, AS_OF), why: card.gate?.status ?? card.lifecycle })),
    ...aged.filter((row) => !stalled.includes(row.card)).map((row) => ({ card: row.card, days: row.days, why: "Sitting" })),
  ];

  return (
    // A measured column, and two tiles abreast where they fit: full-bleed rows left a
    // label on the far left and its number a thousand pixels away on the right, which
    // is most of why this page was hard to read.
    <div className={TAB_GRID}>
      {/* The composite first, the way the reference reads: a committee wants the verdict, then the
          numbers behind it. The four measures are weighted — value realization is worth 35% and
          adoption depth 20% — and the weights are printed, because a composite whose model is
          hidden is a number nobody can argue with. */}
      <TileBox
        className={SPAN}
        title="Portfolio Health"
        hint={
          health.moved === null ? undefined : (
            <span className="font-mono">
              <span style={{ color: health.moved >= 0 ? "var(--status-success)" : "var(--tone-warning-fg)" }}>
                {health.moved >= 0 ? "+" : ""}
                {health.moved} points
              </span>{" "}
              since last quarter
            </span>
          )
        }
      >
        <ScorePanel score={health.score / 100} caption={health.verdict.toLowerCase()} parts={health.parts} />
      </TileBox>

      <div className={SPAN}>
        <StatBand
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
            {
              label: "Needs a decision",
              value: String(h.attention),
              delta: `${h.aged} over a week old`,
              deltaTone: h.aged ? "warn" : undefined,
              icon: <Inbox size={13} />,
              tip: "Records flagged for their action owner",
            },
            // A "Not moving" cell stood here. It was the only stat on the page whose detail
            // was a whole tile of its own further down — "Blockers" lists those records with
            // their stage, their age and their owner — and the summary sentence between the
            // two named them as well. Three statements of one count.
            {
              label: "Live and earning",
              value: String(h.live),
              delta: `${usd(real.confirmed)} confirmed`,
              deltaTone: "good",
              icon: <TrendingUp size={13} />,
              tip: "Records in production with a measured benefit",
            },
            {
              label: "Committed",
              value: usd(h.investment),
              delta: `${pct(real.ratio)} realised`,
              deltaTone: real.ratio >= 0.8 ? "good" : "warn",
              icon: <Coins size={13} />,
              tip: "Investment on live and funded work",
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

      <div className={SPAN}>
        <SummaryPanel title="Summary" source={healthSummary(cards, months, PHASES, AS_OF)} meta={summaryProvenance(cards, months, AS_OF)} />
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
            ? `, and ${annual.filter((row) => !row.onTrack).length} of ${annual.length} are behind target. Strongest is ${
                [...annual].sort((a, b) => b.against - a.against)[0].label.toLowerCase()
              } at ${pct([...annual].sort((a, b) => b.against - a.against)[0].against)}; weakest is ${
                [...annual].sort((a, b) => a.against - b.against)[0].label.toLowerCase()
              } at ${pct([...annual].sort((a, b) => a.against - b.against)[0].against)}.`
            : ", and every measure is on track."}
        </p>
      </TileBox>

      {/* The agenda. Everything here needs a ruling from this table and nowhere else — a queue of
          other people's work is why these meetings run long. */}
      <TileBox className={SPAN} title="Waiting on This Committee" hint={`${queue.reduce((sum, row) => sum + row.count, 0)} items`}>
        {queue.length ? (
          <DataTable
            columns={["Queue", "Count", "Oldest", "Money Held"]}
            rows={queue.map((row) => ({
              key: row.key,
              label: (
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate">{row.title}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{row.note}</span>
                </span>
              ),
              values: [
                row.count,
                row.oldestDays === null ? "—" : <span style={{ color: row.oldestDays >= 30 ? "var(--tone-warning-fg)" : undefined }}>{row.oldestDays}d</span>,
                usd(row.money),
              ],
              tip: `${row.title}\n${row.note}\n${row.records
                .slice(0, 5)
                .map((card) => card.title)
                .join("\n")}${row.records.length > 5 ? `\nand ${row.records.length - 5} more` : ""}`,
            }))}
          />
        ) : (
          <TileEmpty>Nothing is waiting on a ruling from this committee.</TileEmpty>
        )}
      </TileBox>

      {/* Three findings, in prose. Assembled from the same derivations as the tiles, so it cannot
          drift from them — and written as findings rather than metrics, because that is what a
          committee reads. */}
      <TileBox className={SPAN} title="Reading of the Quarter">
        <div className="flex flex-col gap-4">
          {[
            { key: "impact", label: "Impact", body: reading.impact },
            { key: "bottleneck", label: "Bottleneck", body: reading.bottleneck },
            { key: "next", label: "Next action", body: reading.nextAction },
          ].map((block) => (
            <div key={block.key} className="min-w-0">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-label)]">{block.label}</div>
              <Markdown source={block.body} className="text-[13px] leading-[1.6]" />
            </div>
          ))}
        </div>
      </TileBox>

      {/* These two are read as a pair — what's stuck, and how healthy that leaves the
          system — so they share a row that stretches them to a common height. The tab grid
          is `items-start` on purpose (a short tile shouldn't grow to match a tall one), so
          the pairing is opted into here rather than turned on for everything. */}
      <div className={SPAN}>
        {/* "of 11 on the board" read as a fragment with its subject missing — the count it
            belonged to is the visible row count. A plain denominator says the same thing. */}
        <TileBox title="Blockers">
          <MiniList
            rows={notMoving.map((row) => ({
              key: row.card.id,
              node: (
                // Fixed columns for the status, the days and the avatar. Left to size
                // themselves, "R2 blocked" and "Sitting" put their dots in different places
                // down the list, so four rows of the same shape read as four different ones.
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    href={row.card.href}
                    className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-strong)]"
                  >
                    {row.card.title}
                  </Link>
                  <span className="w-[92px] shrink-0">
                    <StatusDot
                      tone={row.why === "Sitting" ? "quiet" : "bad"}
                      label={row.why === "Sitting" ? "Sitting" : `${row.card.gate?.id ?? ""} blocked`.trim()}
                    />
                  </span>
                  <span
                    data-tip={`At ${shortStageLabel(row.card.substage)} since ${formatMonthDay(row.card.stageEntered)}`}
                    className="font-mono w-8 shrink-0 text-right text-[12px] text-[var(--text-muted)] [font-variant-numeric:tabular-nums]"
                  >
                    {row.days}d
                  </span>
                  <PersonAvatar name={row.card.actionOwner} size={20} />
                </div>
              ),
            }))}
            more={(hidden) => `and ${hidden} more — the oldest has been ${notMoving[notMoving.length - 1]?.days ?? 0} days at one stage`}
          />
        </TileBox>


      </div>
    </div>
  );
}


// ── Pipeline ──
// Where the work is and how fast it moves. The funnel and the decision line came off the
// Overview tab: they are the same subject as the gate register below them, and a committee
// asking "where does this clog" should not have to read two tabs to find out.

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
      {/* Pipeline, conversion and cycle time were three tiles asking the reader to match
          four phase names across them and hold the rows in their head. They are four
          facts about the same four phases, so they are one table — where things are, how
          many ever got here, how long it takes, who is waiting. The monthly line sits
          under it because time is the one axis that isn't per-phase. */}
      <TileBox className={SPAN} title="Pipeline" hint={`${cards.length} ever raised`}>
        <PhaseFlow rows={phaseFlowRows(cards, board, flow, cycle)} />
      </TileBox>

      {/* Its own tile now. The pipeline above became a chart in its own right, and a phase
          axis and a time axis in one box read as one broken chart — a line starting under a
          funnel invites you to match its points to the four phases, which is not what it
          plots. */}
      <TileBox
        className={SPAN}
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
      {/* All twelve stages, not the four phases. The funnel above answers "how far does work
          get"; this answers "which desk is it on", which is the actionable version — a phase is
          not a queue, a stage is. */}
      <TileBox className={SPAN} title="Gate Register" hint="population and dwell at each of the twelve stages">
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

      {/* Whether the last round of interventions worked. Cumulative measures, so a quarter
          reports its closing position rather than a sum of its months. */}
      <TileBox className={SPAN} title="Quarter on Quarter" hint={`${periods.length} quarters in the window`}>
        <DataTable
          columns={["Quarter", "Months", "Committed", "Confirmed", "Days to a Decision"]}
          rows={periods.map((period) => ({
            key: period.label,
            label: period.label,
            values: [
              period.months,
              usd(period.close.committedUsd),
              usd(period.close.benefitUsd),
              `${period.close.medianDaysToDecision}d`,
            ],
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
                  state.benefit ? <span style={{ color: state.key === "live" ? "var(--status-success)" : "var(--text-muted)" }}>{usd(state.benefit)}</span> : "—",
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

      {/* The other half of the ledger. None of the production columns apply — a stopped
          record has an ask, a date and a reason, and the money was never spent. */}
      <TileBox title="Stopped and Parked">
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

      {/* Sits here rather than inside "In production", where it was filed under a heading
          that lied about its population: this counts every record, not the live ones. */}
      <TileBox title="Capability Mix">
        <GroupBars
          groups={capabilityMix(cards).map((row, index) => ({
            key: row.capability,
            label: row.capability,
            colour: CAPABILITY_FILL[index],
            count: row.count,
            tip: `${row.capability}\n${row.count} of ${cards.length} records\n${cards
              .filter((card) => card.capability === row.capability)
              .map((card) => card.title)
              .join(", ")}`,
          }))}
        />
      </TileBox>
    </div>
  );
}


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
                  <div className="flex min-w-0 items-center gap-3">
                    <Link href={card.href} className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-strong)]">
                      {card.title}
                    </Link>
                    <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">{card.riskLevel} risk</span>
                    <span className="w-[92px] shrink-0">
                      <StatusDot tone={card.lifecycle === "Live" ? "bad" : "warn"} label={card.oversight ?? "—"} />
                    </span>
                    <Tag tone={LIFECYCLE_TONE[card.lifecycle]} className={cn(CHIP, "shrink-0")}>
                      {card.lifecycle}
                    </Tag>
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
              {underLive.length} of these {underLive.length === 1 ? "is" : "are"} already in production. That is an oversight ruling, not a project plan.
            </p>
          ) : null}
        </div>
      </TileBox>

      {/* Two tallies of the same 18 records, side by side: which functions had to review them,
          and what they touch. Both are counted per record, so they sum past the record count —
          one use case can trigger four reviews. */}
      <TileBox title="Compliance Load" hint="reviews triggered at Triage">
        <GroupBars
          groups={complianceLoad(cards).map((row, index) => ({
            key: row.review,
            label: row.review,
            colour: REVIEW_FILL[index % REVIEW_FILL.length],
            count: row.count,
            tip: `${row.review}\nTriggered on ${row.count} of ${cards.length} records`,
          }))}
        />
      </TileBox>

      <TileBox title="Data Exposure" hint="declared at Ideation, confirmed at Assessment">
        <GroupBars
          groups={exposureLoad(cards).map((row, index) => ({
            key: row.kind,
            label: row.kind,
            colour: REVIEW_FILL[(index + 2) % REVIEW_FILL.length],
            count: row.count,
            tip: `${row.kind}\nDeclared on ${row.count} of ${cards.length} records`,
          }))}
        />
      </TileBox>

      <TileBox title="Governance Tier" hint="assigned at Triage">
        <GroupBars
          groups={riskMix(cards).map((row, index) => ({
            key: row.tier,
            label: row.tier,
            colour: REVIEW_FILL[index % REVIEW_FILL.length],
            count: row.count,
            tip: `${row.tier} tier\n${row.count} of ${cards.length} records`,
          }))}
        />
      </TileBox>

      <TileBox title="Gate Outcomes" hint={`${gates.decided} decided · ${gates.open} awaiting`}>
        <GroupBars
          groups={gateMix(cards).map((row, index) => ({
            key: row.status,
            label: row.status,
            colour: REVIEW_FILL[index % REVIEW_FILL.length],
            count: row.count,
            tip: `${row.status}\n${row.count} of ${cards.length} records at this gate status`,
          }))}
        />
      </TileBox>

      {/* The five things that decide whether a live use case is actually used. Measured only on
          production records: a control recorded at Adoption can't be assessed on something still
          in build. */}
      <TileBox
        className={SPAN}
        title="Adoption Controls"
        hint={controls.length ? `across ${controls[0].total} live records` : undefined}
        footer="A record can be Active at Adoption with these unfinished. The lifecycle permits it; the audit trail records it."
      >
        {/* The same dial-and-parts shape as the health score and the maturity index — three
            composites on this page, so they read as one kind of object rather than three
            inventions. The dial is the mean of the five, which is what "adoption depth" means. */}
        <ScorePanel
          score={controls.length ? controls.reduce((sum, row) => sum + row.ratio, 0) / controls.length : 0}
          parts={controls.map((row) => ({ label: row.label, ratio: row.ratio }))}
        />
      </TileBox>
    </div>
  );
}

// ── Functions ──

function FunctionsTab({ cards, months }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS }) {
  const byFunction = valueByFunction(cards, Number.MAX_SAFE_INTEGER);
  const maturity = maturityIndex(cards, months, PHASES, AS_OF);
  const concentration = benefitConcentration(cards);

  return (
    <div className={TAB_GRID}>
      {/* Confirmed against claimed, per function. The committed column is what went in; the two
          benefit columns are what was promised and what has been measured, and the gap between
          them is the only reason to break this out by function at all. */}
      <TileBox className={SPAN} title="By Business Function" hint={`${byFunction.length} functions`}>
        <DataTable
          columns={["Function", "Records", "Committed", "Projected", "Confirmed"]}
          rows={byFunction.map((row) => ({
            key: row.fn,
            label: row.fn,
            values: [
              row.count,
              usd(row.investment),
              <span key="projected" style={{ color: "var(--text-muted)" }}>
                {usd(row.benefit)}
              </span>,
              row.confirmed ? (
                <span key="confirmed" style={{ color: "var(--status-success)" }}>
                  {usd(row.confirmed)}
                </span>
              ) : (
                "—"
              ),
            ],
            tip: `${row.fn}\nRecords: ${row.count}\nCommitted: ${usd(row.investment)}\nProjected: ${usd(row.benefit)}\nConfirmed: ${usd(row.confirmed)}${
              row.confirmed ? "" : "\nNothing from this function is live yet"
            }`,
          }))}
        />
      </TileBox>

      <TileBox title="Capability Mix" hint="recorded at Ideation">
        <GroupBars
          groups={capabilityMix(cards).map((row, index) => ({
            key: row.capability,
            label: row.capability,
            colour: CAPABILITY_FILL[index],
            count: row.count,
            tip: `${row.capability}\n${row.count} of ${cards.length} records`,
          }))}
        />
      </TileBox>

      {/* A composite, with its five sub-scores beside it — the same argument as the health
          score: one number that hides its own reasoning invites the question "made of what". */}
      <TileBox title="AI Maturity Index" hint={`${maturity.outOf5} of 5`}>
        <ScorePanel score={maturity.score} parts={maturity.parts.map((part) => ({ label: part.label, ratio: part.score }))} />
      </TileBox>

      {/* Where the confirmed benefit actually comes from. An average return per record hides
          whether the portfolio is carried by two use cases or by all of them. */}
      <TileBox className={SPAN} title="Where the Benefit Is Concentrated" hint={`${usd(concentration.total)} confirmed a year`}>
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
              tip: `Top ${concentration.top.count} by confirmed benefit\n${concentration.top.records.map((card) => card.title).join("\n")}`,
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
      </TileBox>
    </div>
  );
}

export default function PortfolioPage() {
  const [tab, setTab] = useState<PortfolioTab>("overview");
  // Fixed, now that the menu and the switcher are gone: this page is the whole portfolio over the
  // whole snapshot window. `filterUseCasesByScope` still runs so the tracker's scope helper stays
  // the one definition of "team" and "mine" — it just isn't offered as a control here.
  const scope: ScopeFilter = "all";
  const activeProfile = CURRENT_USER;
  // Two scopes now, and they narrow different things: `quarter` narrows the *history* (which
  // month-ends the trends read), `businessFn` narrows the *records*. Both are in the strip
  // rather than the menu because every figure on the page is scoped to them.
  const [quarter, setQuarter] = useState<string>(ALL_PERIODS);
  const [businessFn, setBusinessFn] = useState<string>(ALL_FUNCTIONS);
  // The rail's state — scroll position, expand/collapse, chat sessions, live turns — went with
  // the rail. `src/app/portfolio/assistant.tsx` still holds the responder and the seeded
  // conversations for the docked dialog.

  // Scope narrows the records; period narrows the history. Everything downstream is
  // derived, so both controls move every number on the page at once. "Mine" follows the
  // profile in the switcher — it used to be pinned to the default profile, so switching
  // to someone else changed the greeting and nothing else.
  const cards = useMemo(
    () => narrowToFunction(filterUseCasesByScope(ALL_RECORDS, scope, activeProfile), businessFn),
    [scope, activeProfile, businessFn],
  );
  const board = useMemo(() => narrowToFunction(filterUseCasesByScope(USE_CASES, scope, activeProfile), businessFn), [scope, activeProfile, businessFn]);
  // A quarter narrows to its own month-ends; the default keeps the whole window the snapshots
  // cover, because a single-month quarter has no trend in it to draw.
  const months = useMemo(() => {
    if (quarter === ALL_PERIODS) return PORTFOLIO_SNAPSHOTS;
    const match = quarters(PORTFOLIO_SNAPSHOTS).find((row) => row.label === quarter);
    return match ? PORTFOLIO_SNAPSHOTS.filter((month) => quarterLabel(month.key) === quarter) : PORTFOLIO_SNAPSHOTS;
  }, [quarter]);

  return (
    // No rail. The assistant had a permanent 364px track here; a committee page is read across
    // its whole width, and the tabs each hold a table or a matrix that wants the room. `AppShell`
    // takes no rail props now, so it lays out one full-width column.
    <AppShell>
      <ContentPanel
        bare
        // Not a breadcrumb any more. "All use cases › Portfolio" said this was a child of the
        // board, which it isn't — it's the other way of reading the same registry, and a committee
        // arriving here has not come down a path from the kanban.
        title="AI Factory"
        titleMeta={
          <span className="text-[13px] text-[var(--text-muted)]">
            <span aria-hidden className="mr-2 text-[var(--border-input)]">
              |
            </span>
            Leadership View
          </span>
        }
        tabs={
          // Five reads, so a left-aligned strip rather than the centred two-position toggle this
          // replaced: five labels don't fit a segmented control, and a toggle implies a pair.
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
        // The two scopes live here rather than in a strip of their own below: they were the only
        // things on that row once the registry census came off it, and a whole row of chrome for
        // two selects is vertical space a committee page can spend on data. The filter menu and
        // the profile switcher are gone with it — scope-by-person and a 3-month window are
        // tracker concerns, and this page is read as the whole portfolio.
        controls={
          <>
            <StripSelect
              label="Period"
              value={quarter}
              onChange={setQuarter}
              options={[
                { value: ALL_PERIODS, label: "Last 6 months" },
                ...quarters(PORTFOLIO_SNAPSHOTS)
                  .slice()
                  .reverse()
                  .map((row) => ({ value: row.label, label: `${row.label} · ${row.months}mo` })),
              ]}
            />
            <StripSelect
              label="Business function"
              value={businessFn}
              onChange={setBusinessFn}
              options={[
                { value: ALL_FUNCTIONS, label: "All functions" },
                ...[...new Set(ALL_RECORDS.map((card) => card.businessFunction))].sort().map((fn) => ({ value: fn, label: fn })),
              ]}
            />
          </>
        }
      >
        <div className="px-6 pb-10 pt-5">
          {/* An empty scope gets one sentence, not a grid of zeros: a pulse of 100% over
              no records is the most confident wrong number this page could print. */}
          {cards.length === 0 ? (
            <div className={TAB_GRID}>
              {/* The only filter that can empty this page now is the function select. */}
              <TileBox className={SPAN} title="Nothing in This Function">
                <TileEmpty>No records sit under {businessFn}. Switch the function filter back to all functions.</TileEmpty>
              </TileBox>
            </div>
          ) : tab === "overview" ? (
            <OverviewTab cards={cards} board={board} months={months} />
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
      </ContentPanel>
    </AppShell>
  );
}
