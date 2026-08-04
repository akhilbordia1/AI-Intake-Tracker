"use client";

import { Activity, Coins, Inbox, Layers, Sparkles, Target, Timer, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { AppShell, ContentPanel, PanelBreadcrumb, PanelTabs, RailHeader, useRailMode } from "@/components/app-shell";
import { ChatHistoryButton, useChatSessions, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { ChatCardList } from "@/components/chat/chat-use-case-card";
import { JumpToTop } from "@/components/chat/chat-ui";
import { MiniChatRail, type RailAnswer } from "@/components/chat/mini-chat-rail";
import { Markdown } from "@/components/document-record/markdown";
import { PhaseFlow, type PhaseFlowRow } from "@/components/portfolio/phase-flow";
import {
  ColumnChart,
  DataTable,
  GroupBars,
  MiniList,
  ScorePanel,
  ShareMosaic,
  StatBand,
  StatusDot,
  SummaryPanel,
  TileBox,
  TileEmpty,
} from "@/components/portfolio/tiles";
import { TimeChart } from "@/components/portfolio/time-chart";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { CHIP, FilterMenuButton, MenuDivider, MenuItem, MenuLabel, MenuSurface, Tag } from "@/components/ui/kit";
import { STAGE_GROUPS, firstName, phaseForStage, shortStageLabel } from "@/data/lifecycle";
import {
  ALL_RECORDS,
  AS_OF,
  CURRENT_USER,
  LIFECYCLE_TONE,
  PORTFOLIO_SNAPSHOTS,
  USE_CASES,
  filterUseCasesByScope,
  type ScopeFilter,
  type UseCaseCard,
} from "@/data/registry";
import {
  DECISION_TARGET_DAYS,
  aging,
  attainmentSummary,
  blockers,
  daysBetween,
  capabilityMix,
  capacityByOwner,
  compactNumber,
  conversion,
  decisionSpeedSeries,
  formatDay,
  formatMonthDay,
  funnel,
  gateMix,
  gateOutcomes,
  headline,
  healthSummary,
  impact,
  kpiAttainment,
  medianCycleDaysByPhase,
  phasesBySpeed,
  moneyByState,
  moneyTable,
  oldestOpenGate,
  pct,
  portfolioDigest,
  productionRows,
  pulse,
  riskMix,
  stoppedRows,
  summaryProvenance,
  throughput,
  usd,
  valueByFunction,
  valueSummary,
  type PhaseMap,
} from "@/lib/portfolio";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/use-click-outside";

// ── The leadership view ──
// The tracker answers "what is on my plate"; this answers "how is the system
// doing". Two reads of the same registry: Health (flow, blockers, risk, capacity)
// and Value (money, attainment, outcomes). Every number comes from
// `src/lib/portfolio.ts`, so the tiles and the chat can't disagree — and the panel
// footer says out loud whether the seeded history still reconciles.

// One grid for both views: a measured column (a dashboard that runs to a 1600px
// window puts a label and its number in different postcodes), two tiles abreast where
// they fit, and `items-start` so a short tile doesn't stretch to match a tall one.
const TAB_GRID = "mx-auto grid w-full max-w-[1080px] grid-cols-1 items-start gap-4 lg:grid-cols-2";
const SPAN = "lg:col-span-2";

// The one categorical ramp on the page: three kinds of AI, three hues that aren't the
// accent (which means "the measure") or a status tone.
const CAPABILITY_FILL = ["var(--avatar-5-fg)", "var(--avatar-1-fg)", "var(--avatar-2-fg)"];

// `MONEY_TONE` (a status colour per money state, for a dot on each table row) lived here
// while "Spend and Return" was a table. The rows are paired bars now, and the two series
// already own the only two colours in that tile — a third, per-row, was a second colour
// system in the same box.

// Phase membership stays in `lifecycle.ts`; the derivations take it as an argument.
const PHASES: PhaseMap = { order: Object.keys(STAGE_GROUPS), phaseOf: phaseForStage };

// ── Earlier conversations, in the same voice as the other rails ──
const LEADERSHIP_HISTORY: ChatSession[] = [
  {
    id: "seed-value",
    title: "What's the value so far?",
    when: "Fri",
    turns: [
      { role: "user", text: "What's the value so far?", time: "9:24 AM" },
      {
        role: "assistant",
        text: "$1.79M is committed against $1.55M of annualised benefit from the 5 live use cases — a payback of about 14 months across the portfolio.",
      },
      { role: "user", text: "Which one pays back fastest?", time: "9:26 AM" },
      {
        role: "assistant",
        text: "Meeting Notes Summariser: $95K spent for $150K a year, so about 8 months. It's also the cheapest thing we've shipped.",
      },
    ],
  },
  {
    id: "seed-clog",
    title: "Where is it clogging?",
    when: "Jul 2",
    turns: [
      { role: "user", text: "Where is it clogging?", time: "2:41 PM" },
      {
        role: "assistant",
        text: "Delivery is the longest phase at 67 days, but most of that is build. The one to watch is Governance & Risk at 33 days for a decision — that's queueing, not work.",
      },
      { role: "user", text: "What's sitting there?", time: "2:43 PM" },
      {
        role: "assistant",
        text: "Customer Churn Signal Model at R2 in review, and Invoice Exception Classifier, whose R2 is blocked — Elena Weber owns that one.",
      },
    ],
  },
];

// ── The rail's responder ──
// The tracker's rail answers about records; this one answers about the system. The
// one overlap is "what's not moving", which both can answer — the same assistant
// shouldn't refuse a question because you asked it on the wrong page.
//
// Every branch also names where it can go next. The starters only exist on the empty
// state, so an answer without follow-ups leaves the reader guessing what else this
// thing knows — and each `followUps` string is phrased to land on another branch here.
// ai-upgrade: swap the keyword matching for a real model call.
function answerForLeader(question: string, cards: UseCaseCard[], person: string): RailAnswer | undefined {
  const asked = question.toLowerCase();
  const h = headline(cards, PORTFOLIO_SNAPSHOTS, AS_OF);

  if (/digest|brief|state of|how are we|how's the portfolio|where do we stand|summar/.test(asked)) {
    return {
      text: `Here's where it stands as of ${formatDay(AS_OF)}.`,
      detail: <Markdown source={portfolioDigest(cards, PORTFOLIO_SNAPSHOTS, PHASES, AS_OF)} />,
      followUps: ["Where is it clogging?", "What's not moving?", "Which targets are we missing?"],
    };
  }

  if (/blocked|stuck|not moving|on hold|holding|waiting|aging|old/.test(asked)) {
    const stalled = blockers(cards);
    const aged = aging(cards, AS_OF).map((row) => row.card);
    const shown = [...new Set([...stalled, ...aged])].filter((card) => USE_CASES.includes(card));
    return shown.length
      ? {
          text: `${stalled.length} ${stalled.length === 1 ? "record isn't" : "records aren't"} moving, and ${aged.length} have been in the same stage for over a week:`,
          detail: <ChatCardList cards={shown.slice(0, 5)} />,
          followUps: ["Who has the most open?", "How are gate decisions going?", "Where is it clogging?"],
        }
      : "Everything on the board has moved in the last week.";
  }

  if (/slow|clog|cycle|how long|throughput|speed|bottleneck|intake/.test(asked)) {
    const cycle = medianCycleDaysByPhase(cards, PHASES);
    const ranked = phasesBySpeed(cycle, PHASES);
    const slow = ranked[0];
    const fast = ranked[ranked.length - 1];
    return {
      text: `${slow} is the slow phase — a median of ${cycle[slow]?.days} days across ${cycle[slow]?.sample} records, against ${cycle[fast]?.days} in ${fast}. A gate decision now takes ${h.decisionDays} days, down from ${h.decisionDays + h.decisionTrend} in ${h.since}.`,
      followUps: ["What's not moving?", "How many came in per month?", "Who has the most open?"],
    };
  }

  if (/value|money|invest|benefit|payback|roi|saving|cost|spend/.test(asked)) {
    return {
      text: `${usd(h.investment)} committed, ${usd(h.benefit)} of annualised benefit from the ${h.live} live — about ${h.paybackMonths} months to pay back.`,
      detail: <Markdown source={moneyTable(cards)} />,
      followUps: ["Which targets are we missing?", "Which business functions is it in?", "What's the risk mix?"],
    };
  }

  if (/gate|approv|pass rate|decision|reject/.test(asked)) {
    const gates = gateOutcomes(cards);
    const oldest = oldestOpenGate(cards, AS_OF);
    return {
      text: `${pct(gates.passRate)} of ${gates.decided} gate decisions have been approvals — ${gates.passed} passed, ${gates.negative} blocked or rejected. ${
        gates.open
      } are open${oldest ? `, the oldest ${oldest.card.gate?.id} on ${oldest.card.title}, ${oldest.days} days with ${oldest.card.actionOwner}` : ""}. Current mix: ${gateMix(
        cards,
      )
        .map((row) => `${row.count} ${row.status.toLowerCase()}`)
        .join(", ")}.`,
      followUps: ["What's not moving?", "What's the risk mix?", "Where is it clogging?"],
    };
  }

  if (/throughput|raised|intake volume|per month|how many came/.test(asked)) {
    const months = throughput(PORTFOLIO_SNAPSHOTS);
    return {
      text: `By month: ${months
        .map(
          (month) =>
            `${month.label} ${month.submitted} raised, ${month.approved} approved, ${month.closed} closed${month.partial ? " (so far)" : ""}`,
        )
        .join("; ")}.`,
      followUps: ["Where is it clogging?", "How are gate decisions going?"],
    };
  }

  if (/function|department|business unit|which team/.test(asked)) {
    return {
      text: `By function: ${valueByFunction(cards)
        .map((row) => `${row.fn} ${usd(row.investment)} across ${row.count}`)
        .join(", ")}.`,
      followUps: ["What's the value so far?", "What's the risk mix?"],
    };
  }

  if (/risk|tier|exposure|compliance/.test(asked)) {
    const mix = riskMix(cards);
    const full = cards.filter((card) => card.riskTier === "Full");
    return {
      text: `${mix.map((row) => `${row.count} ${row.tier.toLowerCase()}`).join(", ")}. The full-tier ones are ${full
        .map((card) => card.title)
        .join(", ")} — those carry the assessments that take the longest.`,
      followUps: ["Where is it clogging?", "How are gate decisions going?"],
    };
  }

  if (/kpi|target|attainment|hitting|met|missing|performing/.test(asked)) {
    const rows = kpiAttainment(cards);
    const summary = attainmentSummary(rows);
    const misses = rows.filter((row) => !row.met);
    return {
      text: `${summary.met} of ${summary.total} production targets are being met. ${
        misses.length
          ? `The misses: ${misses.map((row) => `${row.card.title} — ${row.name} at ${row.actual}${row.unit} against ${row.target}${row.unit}`).join("; ")}.`
          : "Nothing is behind."
      }`,
      followUps: ["What's the value so far?", "Which business functions is it in?"],
    };
  }

  if (/capacity|load|overload|who owns|who has|busiest|mine|my /.test(asked)) {
    const named = cards.filter((card) => card.actionOwner === person && card.lifecycle === "Active");
    if (/mine|my /.test(asked) && named.length) {
      return {
        text: `${named.length} ${named.length === 1 ? "record is" : "records are"} with ${person}:`,
        detail: <ChatCardList cards={named} />,
        followUps: ["What's not moving?", "Brief me on the portfolio"],
      };
    }
    const load = capacityByOwner(cards, AS_OF);
    return {
      text: `${load
        .slice(0, 3)
        .map((row) => `${row.owner} has ${row.open} open${row.attention ? `, ${row.attention} needing a decision` : ""}`)
        .join("; ")}. The oldest thing anyone is sitting on is ${load[0]?.oldestDays} days.`,
      followUps: ["What's not moving?", "Where is it clogging?"],
    };
  }

  return undefined;
}

// A work step before the answer, so a portfolio question reads as reasoning over the
// registry rather than a lookup.
function thinkingBeatFor(question: string) {
  const asked = question.toLowerCase();
  if (/digest|brief|state of|summar/.test(asked)) return { activity: "Assembling", text: `the digest from ${ALL_RECORDS.length} records` };
  if (/value|money|payback|roi/.test(asked)) return { activity: "Adding up", text: "investment and benefit by state" };
  if (/slow|clog|cycle|throughput|blocked|aging/.test(asked)) return { activity: "Counting", text: "days in stage across the board" };
  return { activity: "Reading", text: `${PORTFOLIO_SNAPSHOTS.length} months of the registry` };
}

// Scope and period in one menu, the way the tracker groups its own view controls.
// One name per scope, so the menu row and the button's tooltip can't disagree.
const SCOPE_LABEL: Record<ScopeFilter, string> = { all: "Whole portfolio", team: "Core team", my: "Mine" };

const PERIODS: Array<{ key: 3 | 6; label: string }> = [
  { key: 3, label: "Last 3 months" },
  { key: 6, label: "Last 6 months" },
];

function PortfolioFilterMenu({
  scope,
  onScopeChange,
  period,
  onPeriodChange,
}: {
  scope: ScopeFilter;
  onScopeChange: (scope: ScopeFilter) => void;
  period: 3 | 6;
  onPeriodChange: (period: 3 | 6) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  return (
    <div ref={menuRef} className="relative">
      {/* The same control the tracker's filter uses. This was a borderless quiet button
          labelled "View" — the two had drifted apart, and this one gave no sign that a
          scope or period had been narrowed. */}
      <FilterMenuButton
        open={open}
        activeCount={(scope === "all" ? 0 : 1) + (period === 6 ? 0 : 1)}
        tip={`${SCOPE_LABEL[scope]} · ${PERIODS.find((option) => option.key === period)?.label.toLowerCase()}`}
        label={`Filters — ${SCOPE_LABEL[scope].toLowerCase()}`}
        onClick={() => setOpen(!open)}
      />
      {open ? (
        <MenuSurface className="absolute right-0 top-11 z-30 w-[220px]">
          <MenuLabel>Scope</MenuLabel>
          {(["all", "team", "my"] as ScopeFilter[]).map((key) => (
            <MenuItem
              key={key}
              selected={scope === key}
              onClick={() => {
                onScopeChange(key);
                setOpen(false);
              }}
            >
              {SCOPE_LABEL[key]}
            </MenuItem>
          ))}
          <MenuDivider />
          <MenuLabel>Period</MenuLabel>
          {PERIODS.map((option) => (
            <MenuItem
              key={option.key}
              selected={period === option.key}
              onClick={() => {
                onPeriodChange(option.key);
                setOpen(false);
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </MenuSurface>
      ) : null}
    </div>
  );
}

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

function HealthTab({
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
  const h = headline(cards, months, AS_OF);
  const flow = funnel(board, PHASES);
  const cycle = medianCycleDaysByPhase(cards, PHASES);
  const stalled = blockers(board);
  const aged = aging(board, AS_OF);
  const beat = pulse(cards, months, AS_OF);
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
      {/* Numbers first, then the read on them: the summary is an interpretation, and
          an interpretation before its evidence asks to be taken on trust. */}
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

      {/* These two are read as a pair — what's stuck, and how healthy that leaves the
          system — so they share a row that stretches them to a common height. The tab grid
          is `items-start` on purpose (a short tile shouldn't grow to match a tall one), so
          the pairing is opted into here rather than turned on for everything. */}
      <div className={cn(SPAN, "grid items-stretch gap-4 lg:grid-cols-2")}>
        {/* "of 11 on the board" read as a fragment with its subject missing — the count it
            belonged to is the visible row count. A plain denominator says the same thing. */}
        <TileBox className="h-full" title="Blockers">
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

        {/* The header said the score, the dial said the score, and a caption explained the
            weighting — three sentences for one number. No footer naming the weakest measure
            either: the dial and the rows already mark it in the warning tone, and the row
            says which one and by how much. */}
        <TileBox className="h-full" title="Health Score">
          {/* No word under the figure: the title already says what the number is, and
              "83% · healthy" said the same thing twice in two registers. */}
          <ScorePanel score={beat.score} parts={beat.parts} />
        </TileBox>
      </div>
    </div>
  );
}

// ── Value ──

function ValueTab({ cards, months, scoped }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS; scoped: boolean }) {
  const h = headline(cards, months, AS_OF);
  const span = months.length > 1 ? `${months[0].label} → ${months[months.length - 1].label}` : undefined;
  const money = moneyByState(cards);
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
              label: "Annualised benefit",
              value: usd(h.benefit),
              delta: `from ${h.live} live`,
              deltaTone: "good",
              icon: <TrendingUp size={13} />,
              trend: months.map((month) => month.benefitUsd),
              trendLabel: span,
              tip: "Benefit counted only once something is in production",
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

export default function PortfolioPage() {
  const [tab, setTab] = useState<"health" | "value">("health");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [period, setPeriod] = useState<3 | 6>(6);
  const [activeProfile, setActiveProfile] = useState(CURRENT_USER);
  const [railScrolled, setRailScrolled] = useState(false);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const railMode = useRailMode();
  const history = useChatSessions(LEADERSHIP_HISTORY);
  const liveTurns = useRef<ChatTurn[]>([]);
  const pastSession = history.sessions.find((session) => session.id === history.activeId) ?? null;

  // Scope narrows the records; period narrows the history. Everything downstream is
  // derived, so both controls move every number on the page at once. "Mine" follows the
  // profile in the switcher — it used to be pinned to the default profile, so switching
  // to someone else changed the greeting and nothing else.
  const cards = useMemo(() => filterUseCasesByScope(ALL_RECORDS, scope, activeProfile), [scope, activeProfile]);
  const board = useMemo(() => filterUseCasesByScope(USE_CASES, scope, activeProfile), [scope, activeProfile]);
  const months = useMemo(() => PORTFOLIO_SNAPSHOTS.slice(-period), [period]);
  const h = useMemo(() => headline(cards, months, AS_OF), [cards, months]);

  return (
    <AppShell
      railExpanded={railMode.expanded}
      railCollapsed={railMode.collapsed}
      railHeader={
        <RailHeader
          scrolled={railScrolled}
          expanded={railMode.expanded}
          onToggleExpand={railMode.toggleExpand}
          collapsed={railMode.collapsed}
          onToggleCollapse={railMode.toggleCollapse}
          onNewChat={() => history.startNew(liveTurns.current, liveTurns.current[0]?.text ?? "Untitled chat")}
          history={<ChatHistoryButton sessions={history.sessions} activeId={history.activeId} onOpen={history.open} />}
        />
      }
      rail={
        <div className="relative flex min-h-0 flex-1 flex-col">
          <JumpToTop visible={railScrolled} onClick={() => railScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })} />
          <MiniChatRail
            key={history.liveKey}
            wide={railMode.expanded}
            scrollRef={railScrollRef}
            onScrolledChange={setRailScrolled}
            onTurnsChange={(turns) => {
              liveTurns.current = turns;
            }}
            past={pastSession ? { session: pastSession, onBack: () => history.open(null) } : undefined}
            emptyTitle={`How's the portfolio, ${firstName(activeProfile)}?`}
            // Five numbers and an instruction became two numbers and none: the three
            // starters directly below already say what to ask, so "ask me where it's
            // clogging, or I'll write you the digest" was the buttons written out as prose.
            intro={`${h.active} of ${h.tracked} use cases are in flight, and ${usd(h.investment)} is committed against ${usd(h.benefit)} of benefit.`}
            starters={[
              { label: "Brief me on the portfolio", icon: <Sparkles size={13} /> },
              { label: "Where is it clogging?", icon: <Activity size={13} /> },
              { label: "What's the value so far?", icon: <Coins size={13} /> },
            ]}
            answer={(question) => answerForLeader(question, cards, activeProfile)}
            thinking={thinkingBeatFor}
            placeholder="Ask about flow, risk, capacity or value"
            reply="I can answer on flow and cycle time, what's not moving, the risk mix, owner load, the money and KPI attainment — or ask me for the digest."
          />
        </div>
      }
    >
      <ContentPanel
        breadcrumb={<PanelBreadcrumb items={[{ label: "All use cases", href: "/" }, { label: "Portfolio" }]} />}
        titleMeta={
          <span
            data-tip={`${USE_CASES.length} on the board\n${ALL_RECORDS.length - USE_CASES.length} finished or stopped`}
            className={cn(CHIP, "font-mono bg-[var(--surface-strong)] text-[var(--text-label)]")}
          >
            {cards.length}
          </span>
        }
        centerTabs
        tabs={
          <PanelTabs
            segmented
            activeId={tab}
            onSelect={(id) => setTab(id as "health" | "value")}
            tabs={[
              { id: "health", label: "Health", icon: <Activity size={15} /> },
              { id: "value", label: "Value", icon: <Coins size={15} /> },
            ]}
          />
        }
        controls={
          <>
            <PortfolioFilterMenu scope={scope} onScopeChange={setScope} period={period} onPeriodChange={setPeriod} />
            <ProfileSwitcher currentUser={activeProfile} onUserChange={setActiveProfile} compact />
          </>
        }
      >
        <div className="px-6 pb-10 pt-5">
          {/* An empty scope gets one sentence, not a grid of zeros: a pulse of 100% over
              no records is the most confident wrong number this page could print. */}
          {cards.length === 0 ? (
            <div className={TAB_GRID}>
              <TileBox className={SPAN} title="Nothing in This Scope">
                <TileEmpty>
                  {scope === "my"
                    ? `${firstName(activeProfile)} doesn't own or owe a decision on any record. Switch the scope to the core team or the whole portfolio.`
                    : "No records match this scope."}
                </TileEmpty>
              </TileBox>
            </div>
          ) : tab === "health" ? (
            <HealthTab cards={cards} board={board} months={months} scoped={scope !== "all"} />
          ) : (
            <ValueTab cards={cards} months={months} scoped={scope !== "all"} />
          )}
        </div>
      </ContentPanel>
    </AppShell>
  );
}
