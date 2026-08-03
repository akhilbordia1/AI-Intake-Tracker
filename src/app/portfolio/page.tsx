"use client";

import { Activity, CircleSlash, Coins, Inbox, Layers, SlidersHorizontal, Sparkles, Target, Timer, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { AppShell, ContentPanel, PanelBreadcrumb, PanelTabs, RailHeader, useRailMode } from "@/components/app-shell";
import { ChatHistoryButton, useChatSessions, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { ChatCardList } from "@/components/chat/chat-use-case-card";
import { JumpToTop } from "@/components/chat/chat-ui";
import { MiniChatRail, type RailAnswer } from "@/components/chat/mini-chat-rail";
import { Markdown } from "@/components/document-record/markdown";
import {
  BarList,
  DataTable,
  MiniList,
  ScorePanel,
  StackedMeter,
  StatBand,
  StatusDot,
  SummaryPanel,
  TargetRow,
  TileBox,
} from "@/components/portfolio/tiles";
import { TimeChart } from "@/components/portfolio/time-chart";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import { Button, CHIP, MenuDivider, MenuItem, MenuLabel, MenuSurface, PHASE_TONES, PhaseIcon, Tag } from "@/components/ui/kit";
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
  pulse,
  riskMix,
  throughput,
  usd,
  valueByFunction,
  valueSummary,
  valueSeries,
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
// ai-upgrade: swap the keyword matching for a real model call.
function answerForLeader(question: string, cards: UseCaseCard[], person: string): RailAnswer | undefined {
  const asked = question.toLowerCase();
  const h = headline(cards, PORTFOLIO_SNAPSHOTS, AS_OF);

  if (/digest|brief|state of|how are we|how's the portfolio|where do we stand|summar/.test(asked)) {
    return {
      text: `Here's where it stands as of ${formatDay(AS_OF)}.`,
      detail: <Markdown source={portfolioDigest(cards, PORTFOLIO_SNAPSHOTS, PHASES, AS_OF)} />,
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
        }
      : "Everything on the board has moved in the last week.";
  }

  if (/slow|clog|cycle|how long|throughput|speed|bottleneck|intake/.test(asked)) {
    const cycle = medianCycleDaysByPhase(cards, PHASES);
    const ranked = phasesBySpeed(cycle, PHASES);
    const slow = ranked[0];
    const fast = ranked[ranked.length - 1];
    return `${slow} is the slow phase — a median of ${cycle[slow]?.days} days across ${cycle[slow]?.sample} records, against ${cycle[fast]?.days} in ${fast}. A gate decision now takes ${h.decisionDays} days, down from ${h.decisionDays + h.decisionTrend} in ${h.since}.`;
  }

  if (/value|money|invest|benefit|payback|roi|saving|cost|spend/.test(asked)) {
    return {
      text: `${usd(h.investment)} committed, ${usd(h.benefit)} of annualised benefit from the ${h.live} live — about ${h.paybackMonths} months to pay back.`,
      detail: <Markdown source={moneyTable(cards)} />,
    };
  }

  if (/gate|approv|pass rate|decision|reject/.test(asked)) {
    const gates = gateOutcomes(cards);
    const oldest = oldestOpenGate(cards, AS_OF);
    return `${pct(gates.passRate)} of ${gates.decided} gate decisions have been approvals — ${gates.passed} passed, ${gates.negative} blocked or rejected. ${
      gates.open
    } are open${oldest ? `, the oldest ${oldest.card.gate?.id} on ${oldest.card.title}, ${oldest.days} days with ${oldest.card.actionOwner}` : ""}. Current mix: ${gateMix(
      cards,
    )
      .map((row) => `${row.count} ${row.status.toLowerCase()}`)
      .join(", ")}.`;
  }

  if (/throughput|raised|intake volume|per month|how many came/.test(asked)) {
    const months = throughput(PORTFOLIO_SNAPSHOTS);
    return `By month: ${months
      .map(
        (month) => `${month.label} ${month.submitted} raised, ${month.approved} approved, ${month.closed} closed${month.partial ? " (so far)" : ""}`,
      )
      .join("; ")}.`;
  }

  if (/function|department|business unit|which team/.test(asked)) {
    return `By function: ${valueByFunction(cards)
      .map((row) => `${row.fn} ${usd(row.investment)} across ${row.count}`)
      .join(", ")}.`;
  }

  if (/risk|tier|exposure|compliance/.test(asked)) {
    const mix = riskMix(cards);
    const full = cards.filter((card) => card.riskTier === "Full");
    return `${mix.map((row) => `${row.count} ${row.tier.toLowerCase()}`).join(", ")}. The full-tier ones are ${full
      .map((card) => card.title)
      .join(", ")} — those carry the assessments that take the longest.`;
  }

  if (/kpi|target|attainment|hitting|met|missing|performing/.test(asked)) {
    const rows = kpiAttainment(cards);
    const summary = attainmentSummary(rows);
    const misses = rows.filter((row) => !row.met);
    return `${summary.met} of ${summary.total} production targets are being met. ${
      misses.length
        ? `The misses: ${misses.map((row) => `${row.card.title} — ${row.name} at ${row.actual}${row.unit} against ${row.target}${row.unit}`).join("; ")}.`
        : "Nothing is behind."
    }`;
  }

  if (/capacity|load|overload|who owns|who has|busiest|mine|my /.test(asked)) {
    const named = cards.filter((card) => card.actionOwner === person && card.lifecycle === "Active");
    if (/mine|my /.test(asked) && named.length) {
      return { text: `${named.length} ${named.length === 1 ? "record is" : "records are"} with ${person}:`, detail: <ChatCardList cards={named} /> };
    }
    const load = capacityByOwner(cards, AS_OF);
    return `${load
      .slice(0, 3)
      .map((row) => `${row.owner} has ${row.open} open${row.attention ? `, ${row.attention} needing a decision` : ""}`)
      .join("; ")}. The oldest thing anyone is sitting on is ${load[0]?.oldestDays} days.`;
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
      <Button tone="quiet" onClick={() => setOpen(!open)} aria-expanded={open} data-tip="Scope and period">
        <SlidersHorizontal size={14} />
        View
      </Button>
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
              {key === "all" ? "Whole portfolio" : key === "team" ? "Core team" : "Mine"}
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

// ── Health ──
// Four blocks and a sentence. The earlier version put eight tiles on one page and
// left the reader to work out which mattered; a leadership view has to say the
// answer first and keep the evidence to what supports it. Gate outcomes, the risk
// mix and owner load moved into the rail — they're follow-up questions, not the
// headline, and the assistant answers them in one line each.

function HealthTab({ cards, board, months }: { cards: UseCaseCard[]; board: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS }) {
  const h = headline(cards, months, AS_OF);
  const flow = funnel(board, PHASES);
  const cycle = medianCycleDaysByPhase(cards, PHASES);
  const stalled = blockers(board);
  const aged = aging(board, AS_OF);
  const beat = pulse(cards, months, AS_OF);

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
            {
              label: "Not moving",
              value: String(h.blocked),
              delta: `${h.openGates} gates open`,
              deltaTone: h.blocked ? "warn" : undefined,
              icon: <CircleSlash size={13} />,
              tip: "Parked, or blocked at a gate",
            },
            {
              label: "Days to a decision",
              value: String(h.decisionDays),
              delta: h.decisionTrend > 0 ? `${h.decisionTrend} faster than ${h.since}` : `${Math.abs(h.decisionTrend)} slower than ${h.since}`,
              deltaTone: h.decisionTrend > 0 ? "good" : "warn",
              icon: <Timer size={13} />,
              // Down is the good direction here, so the line falling is the message.
              trend: months.map((month) => month.medianDaysToDecision),
              tip: "Median days from intake to a first gate decision",
            },
          ]}
        />
      </div>

      <div className={SPAN}>
        <SummaryPanel
          title="Summary"
          source={healthSummary(cards, months, PHASES, AS_OF)}
          meta={`As of ${formatDay(AS_OF)} · ${cards.length} records`}
        />
      </div>

      <TileBox title="Pipeline" hint={`${board.length} on the board`}>
        <BarList
          rows={flow.map((row) => ({
            key: row.phase,
            // Phase name, then one meta string, then the count. Three separate numbers
            // in a row ("3 waiting · 25d typical · 4") read as a puzzle.
            label: (
              <>
                <PhaseIcon phase={row.phase} size={13} style={{ color: `var(--tone-${PHASE_TONES[row.phase] ?? "neutral"}-fg)` }} />
                <span className="truncate">{row.phase}</span>
              </>
            ),
            value: String(row.count),
            ratio: row.share,
            meta: [row.attention ? `${row.attention} waiting` : null, cycle[row.phase]?.sample ? `${cycle[row.phase].days}d` : null]
              .filter(Boolean)
              .join(" · "),
            tip: `${row.phase}\nStages: ${row.stages.map(shortStageLabel).join(", ") || "none occupied"}\n${
              cycle[row.phase]?.sample
                ? `Median time in phase: ${cycle[row.phase].days} days, measured on ${cycle[row.phase].sample} records that have left it`
                : "Nothing has left this phase yet, so there is no duration to report"
            }`,
          }))}
        />
      </TileBox>

      <TileBox title="Needs unblocking" hint={`${notMoving.length} of ${board.length}`}>
        <MiniList
          rows={notMoving.map((row) => ({
            key: row.card.id,
            node: (
              <div className="flex min-w-0 items-center gap-2.5">
                <Link
                  href={row.card.href}
                  className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-strong)]"
                >
                  {row.card.title}
                </Link>
                <StatusDot
                  tone={row.why === "Sitting" ? "quiet" : "bad"}
                  label={row.why === "Sitting" ? "Sitting" : `${row.card.gate?.id ?? ""} blocked`.trim()}
                />
                <span className="font-mono w-8 shrink-0 text-right text-[11px] text-[var(--text-muted)]">{row.days}d</span>
                <PersonAvatar name={row.card.actionOwner} size={20} />
              </div>
            ),
          }))}
          more={(hidden) => `and ${hidden} more — the oldest has been ${notMoving[notMoving.length - 1]?.days ?? 0} days at one stage`}
        />
      </TileBox>

      <TileBox title="Conversion" hint={`of ${cards.length} ever raised`}>
        <BarList
          rows={conversion(cards, PHASES).map((row) => ({
            key: row.phase,
            label: <span className="truncate">{row.phase}</span>,
            value: pct(row.share),
            ratio: row.share,
            meta: `${row.reached} reached`,
            tip: `${row.reached} of ${cards.length} records have reached ${row.phase}`,
          }))}
        />
      </TileBox>

      <TileBox title="Pulse" hint={`${pct(beat.score)} healthy`}>
        <ScorePanel score={beat.score} parts={beat.parts} label="Four measures, evenly weighted" />
      </TileBox>

      <TileBox className={SPAN} title="Time to a decision" hint="median days, intake to first gate">
        <TimeChart
          data={decisionSpeedSeries(months)}
          series={[{ key: "days", name: "Days", colour: "var(--accent)" }]}
          reference={{ y: 15, label: "15d target" }}
          yFormat={(value) => `${value}d`}
        />
      </TileBox>
    </div>
  );
}

// ── Value ──

function ValueTab({ cards, months }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS }) {
  const h = headline(cards, months, AS_OF);
  const money = moneyByState(cards);
  const attainment = kpiAttainment(cards);
  const summary = attainmentSummary(attainment);
  const prod = impact(cards);
  const outcomes = [...cards]
    .filter((card) => card.liveSince || card.closedOn)
    .sort((a, b) => (b.liveSince ?? b.closedOn ?? "").localeCompare(a.liveSince ?? a.closedOn ?? ""));

  // Group the KPI rows by the record they belong to — a target only means something
  // next to the thing being measured.
  const byRecord = attainment.reduce<Record<string, typeof attainment>>((groups, row) => {
    groups[row.card.id] = [...(groups[row.card.id] ?? []), row];
    return groups;
  }, {});

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
              tip: "Investment on live and funded work",
            },
            {
              label: "Annualised benefit",
              value: usd(h.benefit),
              delta: `from ${h.live} live`,
              deltaTone: "good",
              icon: <TrendingUp size={13} />,
              trend: months.map((month) => month.benefitUsd),
              tip: "Benefit counted only once something is in production",
            },
            {
              label: "Payback",
              value: h.paybackMonths ? `${h.paybackMonths} mo` : "—",
              delta: "on committed spend",
              icon: <Timer size={13} />,
              tip: "Committed investment divided by the annualised benefit of what is live",
            },
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
        <SummaryPanel title="Summary" source={valueSummary(cards, months, AS_OF)} meta={`As of ${formatDay(AS_OF)} · ${cards.length} records`} />
      </div>

      <TileBox className={SPAN} title="Spend against benefit" hint="cumulative">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span aria-hidden className="h-[2px] w-4" style={{ background: "var(--accent)" }} />
            Committed
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span aria-hidden className="h-[2px] w-4" style={{ background: "var(--tone-info-fg)" }} />
            Benefit of live
          </span>
        </div>
        <TimeChart
          data={valueSeries(months)}
          series={[
            { key: "investment", name: "Committed", colour: "var(--accent)" },
            // Clay, not a second green: accent-green against success-green read as one
            // line crossing itself.
            { key: "benefit", name: "Benefit", colour: "var(--tone-info-fg)" },
          ]}
          yFormat={usd}
        />
      </TileBox>

      {/* Two columns, each stacking its own tiles: letting the grid place them left
          to right put the four-row money table beside the twelve-row KPI list and
          left a column of empty page under it. */}
      <div className={cn(SPAN, "grid items-start gap-4 lg:grid-cols-2")}>
        <div className="flex min-w-0 flex-col gap-4">
          <TileBox title="Money by state">
            <DataTable
              columns={["", "Records", "Committed", "Benefit"]}
              rows={money.map((state) => ({
                key: state.key,
                label: state.label,
                values: [state.count, usd(state.investment), state.benefit ? usd(state.benefit) : "—"],
                tip: `${state.label}\nRecords: ${state.count}\nInvestment: ${usd(state.investment)}\nAnnual benefit: ${usd(state.benefit)}`,
              }))}
            />
          </TileBox>

          <TileBox title="In production" hint={`${prod.live} live`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[12px] text-[var(--text-label)]">Active users</div>
                <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                  {compactNumber(prod.activeUsers)}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-label)]">Hours saved a year</div>
                <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                  {compactNumber(prod.hoursSaved)}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-[var(--border-hairline)] pt-3.5">
              <div className="mb-2.5 text-[12px] text-[var(--text-label)]">What kind of AI</div>
              <StackedMeter
                segments={capabilityMix(cards).map((row, index) => ({
                  key: row.capability,
                  label: row.capability,
                  count: row.count,
                  colour: CAPABILITY_FILL[index],
                }))}
              />
            </div>
          </TileBox>

          <TileBox title="Outcomes" hint="newest first">
            <MiniList
              max={6}
              rows={outcomes.map((card) => ({
                key: card.id,
                node: (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Link href={card.href} className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)] hover:text-[var(--accent-strong)]">
                      {card.title}
                    </Link>
                    <Tag tone={LIFECYCLE_TONE[card.lifecycle]} className={cn(CHIP, "shrink-0")}>
                      {card.lifecycle}
                    </Tag>
                    <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">
                      {formatDay(card.liveSince ?? card.closedOn ?? AS_OF)}
                    </span>
                  </div>
                ),
              }))}
            />
          </TileBox>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <TileBox title="Production targets" hint={`${summary.met} of ${summary.total} met`}>
            <div className="flex flex-col gap-5">
              {Object.values(byRecord).map((rows) => (
                <div key={rows[0].card.id} className="min-w-0">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <Link
                      href={rows[0].card.href}
                      className="min-w-0 truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-strong)]"
                    >
                      {rows[0].card.title}
                    </Link>
                    <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">{rows[0].card.id}</span>
                    {rows.every((row) => row.met) ? null : (
                      <Tag tone="warning" className={cn(CHIP, "shrink-0")}>
                        Behind
                      </Tag>
                    )}
                  </div>
                  <div className="mt-1.5">
                    {rows.map((row) => (
                      <TargetRow
                        key={`${row.card.id}-${row.name}`}
                        name={row.name}
                        actual={row.actual}
                        target={row.target}
                        unit={row.unit}
                        met={row.met}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TileBox>
        </div>
      </div>
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
  // derived, so both controls move every number on the page at once.
  const cards = useMemo(() => filterUseCasesByScope(ALL_RECORDS, scope), [scope]);
  const board = useMemo(() => filterUseCasesByScope(USE_CASES, scope), [scope]);
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
            intro={`${h.tracked} use cases have come through since ${h.since}. ${h.active} are in flight, ${h.blocked} aren't moving, and ${h.live} are live — ${usd(
              h.investment,
            )} committed against ${usd(h.benefit)} of annualised benefit. Ask me where it's clogging, or I'll write you the digest.`}
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
        tabs={
          <PanelTabs
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
          {tab === "health" ? <HealthTab cards={cards} board={board} months={months} /> : <ValueTab cards={cards} months={months} />}
        </div>
      </ContentPanel>
    </AppShell>
  );
}
