"use client";

import { Activity, Coins, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { AppShell, ContentPanel, PanelBreadcrumb, PanelTabs, RailHeader, useRailMode } from "@/components/app-shell";
import { ChatHistoryButton, useChatSessions, type ChatSession, type ChatTurn } from "@/components/chat/chat-history";
import { ChatCardList } from "@/components/chat/chat-use-case-card";
import { JumpToTop } from "@/components/chat/chat-ui";
import { MiniChatRail, type RailAnswer } from "@/components/chat/mini-chat-rail";
import { Markdown } from "@/components/document-record/markdown";
import { AskLine, BarList, MiniList, ReadLine, StatBand, TileBox } from "@/components/portfolio/tiles";
import { TimeChart } from "@/components/portfolio/time-chart";
import { PersonAvatar, ProfileSwitcher } from "@/components/profile";
import {
  Button,
  CHIP,
  MenuDivider,
  MenuItem,
  MenuLabel,
  MenuSurface,
  PHASE_TONES,
  PhaseIcon,
  Tag,
} from "@/components/ui/kit";
import { MarkdownModal } from "@/components/document-record/markdown-modal";
import { STAGE_GROUPS, firstName, phaseForStage, shortStageLabel } from "@/data/lifecycle";
import {
  ALL_RECORDS,
  AS_OF,
  CURRENT_USER,
  GATE_STATUS_TONE,
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
  capacityByOwner,
  decisionSpeedSeries,
  formatDay,
  funnel,
  gateMix,
  gateOutcomes,
  headline,
  kpiAttainment,
  medianCycleDaysByPhase,
  phasesBySpeed,
  moneyByState,
  moneyTable,
  oldestOpenGate,
  pct,
  portfolioDigest,
  reconcile,
  riskMix,
  throughput,
  usd,
  valueByFunction,
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
      { role: "assistant", text: "Meeting Notes Summariser: $95K spent for $150K a year, so about 8 months. It's also the cheapest thing we've shipped." },
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
      { role: "assistant", text: "Customer Churn Signal Model at R2 in review, and Invoice Exception Classifier, whose R2 is blocked — Elena Weber owns that one." },
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
      detail: <Markdown source={portfolioDigest(cards, PORTFOLIO_SNAPSHOTS, PHASES, AS_OF, { full: false })} />,
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
      .map((month) => `${month.label} ${month.submitted} raised, ${month.approved} approved, ${month.closed} closed${month.partial ? " (so far)" : ""}`)
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
  const ranked = phasesBySpeed(cycle, PHASES);
  const slow = ranked[0];
  const stalled = blockers(board);
  const aged = aging(board, AS_OF);

  // One row per record that isn't moving: the blocked ones first, then whatever has
  // simply been sitting. A record can be both; it appears once.
  const notMoving = [
    // Days measured straight from the record: `aging()` only counts active ones, and
    // a parked record is exactly the thing that has been sitting longest.
    ...stalled.map((card) => ({ card, days: daysBetween(card.stageEntered, AS_OF), why: card.gate?.status ?? card.lifecycle })),
    ...aged.filter((row) => !stalled.includes(row.card)).map((row) => ({ card: row.card, days: row.days, why: "Sitting" })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Built as one string, not as JSX fragments: interpolating clauses between
          elements left spaces sitting in front of the commas. */}
      <ReadLine>
        <strong className="font-semibold text-[var(--text-primary)]">{h.active} use cases are in flight.</strong>{" "}
        {`${h.attention} need a decision today and ${h.blocked} ${h.blocked === 1 ? "isn't" : "aren't"} moving at all. A gate decision takes ${
          h.decisionDays
        } days, ${h.decisionTrend > 0 ? `${h.decisionTrend} fewer than in ${h.since}` : `${Math.abs(h.decisionTrend)} more than in ${h.since}`}${
          slow ? `. ${slow} is the longest phase at ${cycle[slow].days} days` : ""
        }.`}
      </ReadLine>

      <StatBand
        items={[
          { label: "In flight", value: String(h.active), delta: `${h.tracked} ever raised`, tip: "Records with an active lifecycle" },
          { label: "Needs a decision", value: String(h.attention), delta: `${h.aged} over a week old`, tip: "Records flagged for their action owner" },
          { label: "Not moving", value: String(h.blocked), delta: `${h.openGates} gates open`, tip: "Parked, or blocked at a gate" },
          {
            label: "Days to a decision",
            value: String(h.decisionDays),
            delta: h.decisionTrend > 0 ? `${h.decisionTrend} faster than ${h.since}` : `${Math.abs(h.decisionTrend)} slower than ${h.since}`,
            tip: "Median days from intake to a first gate decision",
          },
        ]}
      />

      <TileBox title="Where the work is sitting" hint={`${board.length} on the board, by phase`}>
        <BarList
          rows={flow.map((row) => ({
            key: row.phase,
            label: (
              <>
                <PhaseIcon phase={row.phase} size={13} style={{ color: `var(--tone-${PHASE_TONES[row.phase] ?? "neutral"}-fg)` }} />
                <span className="truncate">{row.phase}</span>
                {row.attention ? <span className="shrink-0 text-[11px] text-[var(--tone-warning-fg)]">{row.attention} waiting</span> : null}
              </>
            ),
            value: String(row.count),
            ratio: row.share,
            meta: cycle[row.phase]?.sample ? `${cycle[row.phase].days}d typical` : `${cycle[row.phase]?.open ?? 0} still here`,
            tip: `${row.phase}\nStages: ${row.stages.map(shortStageLabel).join(", ") || "none occupied"}\n${
              cycle[row.phase]?.sample
                ? `Median time in phase: ${cycle[row.phase].days} days, measured on ${cycle[row.phase].sample} records that have left it`
                : "Nothing has left this phase yet, so there is no duration to report"
            }`,
          }))}
        />
      </TileBox>

      <TileBox title="What needs unblocking" hint="parked, blocked, or a week in the same stage">
        <MiniList
          rows={notMoving.map((row) => ({
            key: row.card.id,
            node: (
              <div className="flex min-w-0 items-center gap-2.5">
                <Link href={row.card.href} className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-strong)]">
                  {row.card.title}
                </Link>
                <Tag
                  tone={row.card.gate?.status ? GATE_STATUS_TONE[row.card.gate.status] : LIFECYCLE_TONE[row.card.lifecycle]}
                  className={cn(CHIP, "shrink-0")}
                >
                  {row.why === "Sitting" ? "Sitting" : `${row.card.gate?.id ?? ""} ${String(row.why).toLowerCase()}`.trim()}
                </Tag>
                <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">{row.days}d</span>
                <PersonAvatar name={row.card.actionOwner} size={20} />
              </div>
            ),
          }))}
          more={(hidden) => `and ${hidden} more — the oldest has been ${notMoving[notMoving.length - 1]?.days ?? 0} days at one stage`}
        />
      </TileBox>

      <TileBox title="Are decisions getting faster?" hint="median days from intake to a first gate decision">
        <TimeChart
          data={decisionSpeedSeries(months)}
          series={[{ key: "days", name: "Days", colour: "var(--accent)" }]}
          reference={{ y: 15, label: "15d target" }}
          yFormat={(value) => `${value}d`}
        />
      </TileBox>

      <AskLine topics="gate outcomes, the risk mix, owner load or throughput by month" />
    </div>
  );
}

// ── Value ──

function ValueTab({ cards, months }: { cards: UseCaseCard[]; months: typeof PORTFOLIO_SNAPSHOTS }) {
  const h = headline(cards, months, AS_OF);
  const money = moneyByState(cards);
  const attainment = kpiAttainment(cards);
  const summary = attainmentSummary(attainment);
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
    <div className="flex flex-col gap-4">
      <ReadLine>
        <strong className="font-semibold text-[var(--text-primary)]">{`${usd(h.investment)} committed, ${usd(h.benefit)} coming back a year.`}</strong>{" "}
        {`That's the ${h.live} live use cases paying for the whole committed book in about ${h.paybackMonths} months, with ${summary.met} of ${
          summary.total
        } production targets currently met.`}
      </ReadLine>

      <StatBand
        items={[
          { label: "Committed", value: usd(h.investment), delta: `${money[0].count + money[1].count} funded records`, tip: "Investment on live and funded work" },
          { label: "Annualised benefit", value: usd(h.benefit), delta: `from ${h.live} live`, tip: "Benefit counted only once something is in production" },
          {
            label: "Payback",
            value: h.paybackMonths ? `${h.paybackMonths} mo` : "—",
            delta: "committed against live benefit",
            tip: "Committed investment divided by the annualised benefit of what is live",
          },
          { label: "Targets met", value: `${summary.met}/${summary.total}`, delta: `across ${h.live} live`, tip: "KPIs measured in production against their target" },
        ]}
      />

      <TileBox title="Is the benefit catching up with the spend?" hint="cumulative at each month end">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span aria-hidden className="h-[2px] w-4" style={{ background: "var(--accent)" }} />
            Committed
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span aria-hidden className="h-[2px] w-4" style={{ background: "var(--status-success)" }} />
            Annualised benefit of live
          </span>
        </div>
        <TimeChart
          data={valueSeries(months)}
          series={[
            { key: "investment", name: "Committed", colour: "var(--accent)" },
            { key: "benefit", name: "Benefit", colour: "var(--status-success)" },
          ]}
          yFormat={usd}
        />
      </TileBox>

      <TileBox title="Where the money sits" hint="every record is in exactly one of these">
        <BarList
          rows={money.map((state) => ({
            key: state.key,
            label: (
              <>
                <span className="truncate">{state.label}</span>
                <span className={cn(CHIP, "font-mono shrink-0 bg-[var(--surface-strong)] text-[var(--text-label)]")}>{state.count}</span>
              </>
            ),
            value: usd(state.investment),
            ratio: state.investment / Math.max(1, ...money.map((row) => row.investment)),
            meta: state.benefit ? `${usd(state.benefit)} benefit` : undefined,
            tip: `${state.label}\nRecords: ${state.count}\nInvestment: ${usd(state.investment)}\nAnnual benefit: ${usd(state.benefit)}`,
          }))}
        />
      </TileBox>

      <TileBox title="Is production hitting its targets?" hint={`${summary.met} of ${summary.total} met, by record`}>
        <div className="flex flex-col gap-4">
          {Object.values(byRecord).map((rows) => (
            <div key={rows[0].card.id} className="min-w-0">
              <div className="flex min-w-0 items-baseline gap-2">
                <Link href={rows[0].card.href} className="min-w-0 truncate text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent-strong)]">
                  {rows[0].card.title}
                </Link>
                <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">{rows[0].card.id}</span>
              </div>
              <BarList
                className="mt-2"
                rows={rows.map((row) => ({
                  key: `${row.card.id}-${row.name}`,
                  label: (
                    <>
                      <span className="truncate">{row.name}</span>
                      {row.met ? null : (
                        <Tag tone="warning" className={cn(CHIP, "shrink-0")}>
                          Behind
                        </Tag>
                      )}
                    </>
                  ),
                  value: `${row.actual}${row.unit} / ${row.target}${row.unit}`,
                  ratio: row.ratio,
                }))}
              />
            </div>
          ))}
        </div>
      </TileBox>

      <TileBox title="What shipped, and what was stopped" hint="newest first">
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
                <span className="font-mono shrink-0 text-[11px] text-[var(--text-muted)]">{formatDay(card.liveSince ?? card.closedOn ?? AS_OF)}</span>
              </div>
            ),
          }))}
        />
      </TileBox>

      <AskLine topics="value by function, payback per record, or what a single use case cost" />
    </div>
  );
}

export default function PortfolioPage() {
  const [tab, setTab] = useState<"health" | "value">("health");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [period, setPeriod] = useState<3 | 6>(6);
  const [activeProfile, setActiveProfile] = useState(CURRENT_USER);
  const [railScrolled, setRailScrolled] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
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
  // The seeded month-ends against the records they claim to describe. Silent when
  // they agree; specific when they don't.
  const problems = useMemo(() => reconcile(ALL_RECORDS, PORTFOLIO_SNAPSHOTS, PHASES, USE_CASES), []);

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
            <Button tone="primary" onClick={() => setDigestOpen(true)}>
              <Sparkles size={14} />
              Portfolio digest
            </Button>
            <span aria-hidden className="mx-0.5 h-4 w-px bg-[var(--border-default)]" />
            <ProfileSwitcher currentUser={activeProfile} onUserChange={setActiveProfile} compact />
          </>
        }
        footer={
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span className="font-mono">As of {formatDay(AS_OF)}</span>
            <span aria-hidden className="h-2.5 w-px bg-[var(--border-default)]" />
            <span>
              {USE_CASES.length} tracked, {ALL_RECORDS.length - USE_CASES.length} closed
            </span>
            <span aria-hidden className="h-2.5 w-px bg-[var(--border-default)]" />
            {/* The seeded history has to keep agreeing with the records; when it
                stops, the footer is where it says so. */}
            {problems.length ? (
              <Tag tone="warning" data-tip={problems.join("\n")} className={CHIP}>
                <ShieldCheck size={11} />
                {problems.length} {problems.length === 1 ? "figure disagrees" : "figures disagree"}
              </Tag>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={11} className="text-[var(--status-success)]" />
                Snapshots reconcile with the records
              </span>
            )}
          </span>
        }
      >
        <div className="px-6 pb-10 pt-5">
          {tab === "health" ? <HealthTab cards={cards} board={board} months={months} /> : <ValueTab cards={cards} months={months} />}
        </div>
      </ContentPanel>

      <MarkdownModal
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
        title="Portfolio digest"
        subtitle={`${cards.length} use cases · as of ${formatDay(AS_OF)}`}
        source={portfolioDigest(cards, months, PHASES, AS_OF)}
      />
    </AppShell>
  );
}
