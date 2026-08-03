// ── Portfolio arithmetic ──
// Every number the leadership view shows, derived here rather than in a component,
// so the tiles and the chat answer from one source and both can be checked without
// a browser. Framework-free and type-only in its imports, which is what lets
// `demo()` run under plain node:
//
//   RUN_DEMO=1 node src/lib/portfolio.ts
//
// Phase membership lives in `lifecycle.ts`; it is passed in as a `PhaseMap` so this
// file keeps no second copy of the lifecycle and stays importable by the checker.

import type { GateStatus, Lifecycle, PortfolioMonth, RiskLevel, RiskTier, UseCaseCard } from "@/data/registry";

export type PhaseMap = { order: readonly string[]; phaseOf: (substage: string) => string };

// ── Time and format ──

const MS_PER_DAY = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

// Money at a glance: leadership reads magnitude, not cents.
export function usd(amount: number): string {
  if (!amount) return "$0";
  // Rounded on the integer, not with toFixed: 1.785 is stored as 1.78499…, so
  // toFixed(2) would quietly report $1.78M for $1,785,000.
  if (Math.abs(amount) >= 1_000_000) return `$${String(Math.round(amount / 10_000) / 100).replace(/\.?0+$/, "")}M`;
  return `$${Math.round(amount / 1000)}K`;
}

export const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

// ── Flow ──

// What sits on the board, by phase. "On the board" — not "active": a rejected or
// parked record still occupies the portfolio's attention until someone closes it
// out, and the tracker still shows it.
export function wipByPhase(cards: UseCaseCard[], phases: PhaseMap): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const phase of phases.order) counts[phase] = 0;
  for (const card of cards) {
    const phase = phases.phaseOf(card.substage);
    counts[phase] = (counts[phase] ?? 0) + 1;
  }
  return counts;
}

export function funnel(cards: UseCaseCard[], phases: PhaseMap) {
  const counts = wipByPhase(cards, phases);
  const total = cards.length || 1;
  return phases.order.map((phase) => {
    const inPhase = cards.filter((card) => phases.phaseOf(card.substage) === phase);
    return {
      phase,
      count: inPhase.length,
      share: inPhase.length / total,
      attention: inPhase.filter((card) => card.needsAttention).length,
      // Which stages inside the phase are actually occupied — the phase name alone
      // doesn't say whether three records are queued at one stage or spread out.
      stages: [...new Set(inPhase.map((card) => card.substage))],
      counted: counts[phase],
    };
  });
}

export function throughput(months: PortfolioMonth[]) {
  return months.map((month) => ({
    label: month.label,
    submitted: month.submitted,
    approved: month.approved,
    closed: month.closed,
    partial: Boolean(month.partial),
  }));
}

// How long a phase takes, measured only on records that have *left* it — a record
// still sitting there has no duration yet, and counting it up to `asOf` would make
// the last phase (where live records simply stay) look like the bottleneck. What is
// still sitting is `open`, and `aging()` names them.
export function medianCycleDaysByPhase(cards: UseCaseCard[], phases: PhaseMap) {
  const result: Record<string, { days: number; sample: number; open: number }> = {};
  for (const [index, phase] of phases.order.entries()) {
    const spans: number[] = [];
    let open = 0;
    for (const card of cards) {
      const entered = card.phaseEntered[phase];
      if (!entered) continue;
      const nextPhase = phases.order.slice(index + 1).find((later) => card.phaseEntered[later]);
      const left = (nextPhase && card.phaseEntered[nextPhase]) || card.closedOn;
      if (!left) {
        open += 1;
        continue;
      }
      spans.push(Math.max(0, daysBetween(entered, left)));
    }
    result[phase] = { days: median(spans), sample: spans.length, open };
  }
  return result;
}

// The phases ranked slowest first, ignoring any with nothing to measure yet.
export function phasesBySpeed(cycle: ReturnType<typeof medianCycleDaysByPhase>, phases: PhaseMap) {
  return phases.order.filter((phase) => (cycle[phase]?.sample ?? 0) > 0).sort((a, b) => cycle[b].days - cycle[a].days);
}

export function decisionSpeedSeries(months: PortfolioMonth[]) {
  return months.map((month) => ({ label: month.label, days: month.medianDaysToDecision, partial: Boolean(month.partial) }));
}

// ── Blockers and aging ──

// Not moving = parked, or blocked at a gate while still open. A rejected record is
// *decided*, not stuck — the tracker lumps the two together because a board reader
// wants both out of the way, but a portfolio has to tell "waiting on us" from
// "answered no". The rejections show up under `moneyByState`'s stopped bucket and in
// the outcomes ledger.
export function blockers(cards: UseCaseCard[]) {
  return cards.filter((card) => card.lifecycle === "On hold" || (card.lifecycle === "Active" && card.gate?.status === "Blocked"));
}

export function aging(cards: UseCaseCard[], asOf: string, thresholdDays = 7) {
  return cards
    .filter((card) => card.lifecycle === "Active")
    .map((card) => ({ card, days: daysBetween(card.stageEntered, asOf) }))
    .filter((row) => row.days >= thresholdDays)
    .sort((a, b) => b.days - a.days);
}

export function attentionCards(cards: UseCaseCard[], person?: string) {
  return cards.filter((card) => card.needsAttention && (!person || card.actionOwner === person));
}

// ── Gates ──

type Decision = { id: string; status: GateStatus; decided: string; card: UseCaseCard };

// Every gate decision the registry has taken: the historical ones plus the current
// gate, if it has been decided. An "In review" or "Pending" gate is not a decision.
export function gateDecisions(cards: UseCaseCard[]): Decision[] {
  const decisions: Decision[] = [];
  for (const card of cards) {
    for (const past of card.gateHistory ?? []) decisions.push({ ...past, card });
    if (card.gate && card.gateDecided && card.gate.status !== "In review" && card.gate.status !== "Pending") {
      decisions.push({ id: card.gate.id, status: card.gate.status, decided: card.gateDecided, card });
    }
  }
  return decisions;
}

export function gateOutcomes(cards: UseCaseCard[]) {
  const decisions = gateDecisions(cards);
  const passed = decisions.filter((decision) => decision.status === "Passed").length;
  const negative = decisions.length - passed;
  const open = cards.filter((card) => card.gate?.status === "In review" || card.gate?.status === "Pending").length;
  return { passed, negative, decided: decisions.length, passRate: decisions.length ? passed / decisions.length : 0, open };
}

export function gateMix(cards: UseCaseCard[]) {
  const order: GateStatus[] = ["Passed", "In review", "Pending", "Blocked", "Rejected"];
  return order
    .map((status) => ({ status, count: cards.filter((card) => card.gate?.status === status).length }))
    .filter((row) => row.count > 0);
}

export function oldestOpenGate(cards: UseCaseCard[], asOf: string) {
  const open = cards
    .filter((card) => card.gate?.status === "In review" || card.gate?.status === "Pending")
    .map((card) => ({ card, days: daysBetween(card.stageEntered, asOf) }))
    .sort((a, b) => b.days - a.days);
  return open[0] ?? null;
}

// ── Risk ──

export function riskMix(cards: UseCaseCard[]) {
  const order: RiskTier[] = ["Lightweight", "Standard", "Full"];
  const total = cards.length || 1;
  return order.map((tier) => {
    const count = cards.filter((card) => card.riskTier === tier).length;
    return { tier, count, share: count / total };
  });
}

export function riskLevelMix(cards: UseCaseCard[]) {
  const order: RiskLevel[] = ["Low", "Medium", "High"];
  return order.map((level) => ({ level, count: cards.filter((card) => card.riskLevel === level).length }));
}

// ── Capacity ──

export function capacityByOwner(cards: UseCaseCard[], asOf: string, max = 6) {
  const owners = new Map<string, { owner: string; open: number; attention: number; oldestDays: number }>();
  for (const card of cards) {
    if (card.lifecycle !== "Active") continue;
    const row = owners.get(card.actionOwner) ?? { owner: card.actionOwner, open: 0, attention: 0, oldestDays: 0 };
    row.open += 1;
    if (card.needsAttention) row.attention += 1;
    row.oldestDays = Math.max(row.oldestDays, daysBetween(card.stageEntered, asOf));
    owners.set(card.actionOwner, row);
  }
  return [...owners.values()].sort((a, b) => b.open - a.open || b.oldestDays - a.oldestDays).slice(0, max);
}

// ── Money ──

export type MoneyState = { key: string; label: string; count: number; investment: number; benefit: number };

// Four buckets, and every record lands in exactly one: what is earning, what is
// paid for but not earning yet, what is still an ask, and what stopped.
export function moneyByState(cards: UseCaseCard[]): MoneyState[] {
  const bucket = (card: UseCaseCard) => {
    if (card.lifecycle === "Live") return "live";
    if (card.lifecycle === "Rejected" || card.lifecycle === "On hold") return "stopped";
    return card.funded ? "committed" : "pipeline";
  };
  const labels: Record<string, string> = {
    live: "Live and earning",
    committed: "Funded, not yet live",
    pipeline: "Still an ask",
    stopped: "Stopped or parked",
  };
  return ["live", "committed", "pipeline", "stopped"].map((key) => {
    const inBucket = cards.filter((card) => bucket(card) === key);
    return {
      key,
      label: labels[key],
      count: inBucket.length,
      investment: inBucket.reduce((total, card) => total + card.investmentUsd, 0),
      benefit: inBucket.reduce((total, card) => total + card.annualBenefitUsd, 0),
    };
  });
}

export function paybackMonths(investment: number, annualBenefit: number): number | null {
  if (annualBenefit <= 0) return null;
  return Math.round((investment / annualBenefit) * 12);
}

export function valueSeries(months: PortfolioMonth[]) {
  return months.map((month) => ({
    label: month.label,
    investment: month.committedUsd,
    benefit: month.benefitUsd,
    partial: Boolean(month.partial),
  }));
}

export function valueByFunction(cards: UseCaseCard[], max = 6) {
  const rows = new Map<string, { fn: string; investment: number; benefit: number; count: number }>();
  for (const card of cards) {
    const row = rows.get(card.businessFunction) ?? { fn: card.businessFunction, investment: 0, benefit: 0, count: 0 };
    row.investment += card.investmentUsd;
    row.benefit += card.annualBenefitUsd;
    row.count += 1;
    rows.set(card.businessFunction, row);
  }
  return [...rows.values()].sort((a, b) => b.investment - a.investment).slice(0, max);
}

// ── KPI attainment ──

// The record's own KPI rows are written as prose ("27% of 30% target"), so the same
// parser serves both the seeded numbers and the deep record's strings.
export function parseTargetPair(value: string): { actual: number; target: number; unit: string } | null {
  const match = /([\d.]+)\s*(%|pts|days)?\s+of\s+([\d.]+)\s*(%|pts|days)?/i.exec(value);
  if (!match) return null;
  return { actual: Number(match[1]), target: Number(match[3]), unit: match[2] ?? match[4] ?? "" };
}

export function kpiAttainment(cards: UseCaseCard[]) {
  return cards.flatMap((card) =>
    (card.kpis ?? []).map((kpi) => ({
      card,
      name: kpi.name,
      actual: kpi.actual,
      target: kpi.target,
      unit: kpi.unit,
      ratio: kpi.target ? kpi.actual / kpi.target : 0,
      met: kpi.actual >= kpi.target,
    })),
  );
}

export function attainmentSummary(rows: ReturnType<typeof kpiAttainment>) {
  const met = rows.filter((row) => row.met).length;
  return { met, total: rows.length, ratio: rows.length ? met / rows.length : 0 };
}

// ── The headline ──

export function headline(cards: UseCaseCard[], months: PortfolioMonth[], asOf: string) {
  const board = cards.filter((card) => card.lifecycle === "Active");
  const money = moneyByState(cards);
  const investment = money.filter((state) => state.key === "live" || state.key === "committed").reduce((total, state) => total + state.investment, 0);
  const benefit = money.find((state) => state.key === "live")?.benefit ?? 0;
  const gates = gateOutcomes(cards);
  const latest = months[months.length - 1];
  const first = months[0];

  return {
    tracked: cards.length,
    active: board.length,
    live: cards.filter((card) => card.lifecycle === "Live").length,
    blocked: blockers(cards).length,
    attention: attentionCards(cards).length,
    aged: aging(cards, asOf).length,
    investment,
    benefit,
    paybackMonths: paybackMonths(investment, benefit),
    passRate: gates.passRate,
    openGates: gates.open,
    decisionDays: latest?.medianDaysToDecision ?? 0,
    // Down is good here, so the delta is stated as an improvement.
    decisionTrend: (first?.medianDaysToDecision ?? 0) - (latest?.medianDaysToDecision ?? 0),
    since: first?.label ?? "",
  };
}

// ── The integrity check ──

// The snapshots are authored (a month-end is a fact about the past, and the records
// only know the present), so something has to prove the two still agree. Returns one
// message per disagreement, and `[]` when the seed is consistent. Rendered in the
// panel footer, asserted by `demo()`.
export function reconcile(cards: UseCaseCard[], months: PortfolioMonth[], phases: PhaseMap, board: UseCaseCard[]): string[] {
  const problems: string[] = [];
  const inMonth = (iso: string | undefined, key: string) => Boolean(iso && monthKey(iso) === key);
  const monthEnd = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)).toISOString().slice(0, 10);
  };
  const decisions = gateDecisions(cards);

  for (const month of months) {
    const submitted = cards.filter((card) => inMonth(card.created, month.key)).length;
    if (submitted !== month.submitted) problems.push(`${month.label}: ${month.submitted} submitted, records say ${submitted}`);

    const live = cards.filter((card) => inMonth(card.liveSince, month.key)).length;
    if (live !== month.live) problems.push(`${month.label}: ${month.live} went live, records say ${live}`);

    const closed = cards.filter((card) => inMonth(card.closedOn, month.key)).length;
    if (closed !== month.closed) problems.push(`${month.label}: ${month.closed} closed, records say ${closed}`);

    const approved = decisions.filter((decision) => decision.status === "Passed" && inMonth(decision.decided, month.key)).length;
    if (approved !== month.approved) problems.push(`${month.label}: ${month.approved} gate approvals, records say ${approved}`);

    const end = monthEnd(month.key);
    const committed = cards.filter((card) => card.fundedOn && card.fundedOn < end).reduce((total, card) => total + card.investmentUsd, 0);
    if (committed !== month.committedUsd) problems.push(`${month.label}: ${usd(month.committedUsd)} committed, records say ${usd(committed)}`);

    const benefit = cards.filter((card) => card.liveSince && card.liveSince < end).reduce((total, card) => total + card.annualBenefitUsd, 0);
    if (benefit !== month.benefitUsd) problems.push(`${month.label}: ${usd(month.benefitUsd)} of benefit, records say ${usd(benefit)}`);
  }

  // The last row is today, so it has to be the board.
  const last = months[months.length - 1];
  if (last) {
    const wip = wipByPhase(board, phases);
    for (const phase of phases.order) {
      if ((last.wip[phase] ?? 0) !== wip[phase]) problems.push(`${last.label}: ${phase} at ${last.wip[phase]}, board says ${wip[phase]}`);
    }
  }

  return problems;
}

// ── The digest ──

// ai-upgrade: assembled from the derivations above. Swap it for a model call over
// the registry — keep the Markdown shape, the renderer is what styles it.
export function portfolioDigest(
  cards: UseCaseCard[],
  months: PortfolioMonth[],
  phases: PhaseMap,
  asOf: string,
  { full = true }: { full?: boolean } = {},
): string {
  const h = headline(cards, months, asOf);
  const cycle = medianCycleDaysByPhase(cards, phases);
  const ranked = phasesBySpeed(cycle, phases);
  const slowest = ranked[0] ?? phases.order[0];
  const fastest = ranked[ranked.length - 1] ?? phases.order[0];
  const stuck = aging(cards, asOf).slice(0, 3);
  const money = moneyByState(cards);
  const attainment = attainmentSummary(kpiAttainment(cards));
  const misses = kpiAttainment(cards).filter((row) => !row.met);
  const asOfLabel = formatDay(asOf);

  const head = `# Portfolio digest

${h.tracked} use cases have come through the lifecycle, ${h.active} of them still in flight. ${usd(h.investment)} is committed against ${usd(
    h.benefit,
  )} of annualised benefit from the ${h.live} that are live — a payback of about ${h.paybackMonths} months.

> ${slowest === "Governance & Risk" ? "The constraint is governance, not ideas" : `The constraint is ${slowest.toLowerCase()}`}: ${
    fastest.toLowerCase()
  } clears in ${cycle[fastest]?.days ?? 0} days and ${slowest.toLowerCase()} takes ${cycle[slowest]?.days ?? 0}.`;

  const flow = `## Flow

- A decision now takes ${h.decisionDays} days, ${h.decisionTrend > 0 ? `down ${h.decisionTrend} since ${h.since}` : `up since ${h.since}`}.
- ${pct(h.passRate)} of gate decisions have been approvals; ${h.openGates} gates are open.
- ${h.attention} records need someone today, and ${h.aged} have sat in the same stage for over a week.`;

  const notMoving = `## Not moving

${
  stuck.length
    ? stuck.map((row) => `- **${row.card.title}** (\`${row.card.id}\`) — ${row.days} days at ${row.card.substage}, with ${row.card.actionOwner}.`).join("\n")
    : "- Nothing has been sitting for more than a week."
}`;

  const value = `## Value

| State | Count | Investment | Annual benefit |
| --- | --- | --- | --- |
${money.map((state) => `| ${state.label} | ${state.count} | ${usd(state.investment)} | ${usd(state.benefit)} |`).join("\n")}

${attainment.met} of ${attainment.total} production targets are being met${
    misses.length ? `; the misses are ${misses.map((row) => `${row.card.title} (${row.name}, ${row.actual}${row.unit} of ${row.target}${row.unit})`).join(", ")}` : ""
  }.`;

  const next = `## What I'd do next

1. Clear the ${h.openGates} open gates — the oldest has been waiting ${oldestOpenGate(cards, asOf)?.days ?? 0} days.
2. Unblock or park the ${h.blocked} ${h.blocked === 1 ? "record" : "records"} that aren't moving — a blocked gate is a decision nobody has taken.
3. Watch intake: ${months[months.length - 1]?.submitted ?? 0} raised so far this month, against ${(
    months.reduce((total, month) => total + month.submitted, 0) / months.length
  ).toFixed(1)} a month over the period.`;

  const footer = `---

*As of ${asOfLabel} · derived from ${cards.length} records and ${months.length} monthly snapshots.*`;

  return full ? [head, flow, notMoving, value, next, footer].join("\n\n") : [head, flow, notMoving, footer].join("\n\n");
}

// A short money table for the chat, where the digest would be too much.
// ai-upgrade: same note as the digest — the shape is Markdown, the numbers are real.
export function moneyTable(cards: UseCaseCard[]): string {
  const money = moneyByState(cards);
  return `| State | Count | Investment | Annual benefit |
| --- | --- | --- | --- |
${money.map((state) => `| ${state.label} | ${state.count} | ${usd(state.investment)} | ${usd(state.benefit)} |`).join("\n")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// ── Self-check ──
// The alarm for the seeded layer: if a card's date or a snapshot row is edited so
// the two stop agreeing, `reconcile` reports it here before anyone sees a tile.

function demo() {
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  assert(median([3, 1, 2]) === 2, "median: odd");
  assert(median([1, 2, 3, 4]) === 3, "median: even rounds up");
  assert(median([]) === 0, "median: empty");
  assert(daysBetween("2026-06-28", "2026-07-08") === 10, "daysBetween: across a month");
  assert(usd(1_785_000) === "$1.79M" && usd(518_000) === "$518K" && usd(0) === "$0", "usd");
  assert(paybackMonths(1_000_000, 0) === null, "payback: no benefit is not a payback");
  assert(paybackMonths(1_000_000, 500_000) === 24, "payback: two years");
  const pair = parseTargetPair("27% of 30% target");
  assert(pair?.actual === 27 && pair?.target === 30 && pair.unit === "%", "parseTargetPair: hit");
  assert(parseTargetPair("Not recorded yet") === null, "parseTargetPair: miss");

  const phases: PhaseMap = {
    order: ["Early", "Late"],
    phaseOf: (substage) => (substage === "Idea" ? "Early" : "Late"),
  };
  const card = (over: Partial<UseCaseCard>): UseCaseCard => ({
    id: "UC-1",
    title: "Fixture",
    description: "",
    owner: "A",
    due: "",
    stage: "",
    substage: "Idea",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "A",
    needsAttention: false,
    lifecycle: "Active" as Lifecycle,
    href: "/",
    created: "2026-01-01",
    stageEntered: "2026-01-01",
    phaseEntered: { Early: "2026-01-01" },
    investmentUsd: 0,
    annualBenefitUsd: 0,
    funded: false,
    riskTier: "Standard" as RiskTier,
    riskLevel: "Low" as RiskLevel,
    businessFunction: "Ops",
    ...over,
  });

  const fixture = [
    card({ id: "UC-1", created: "2026-01-04", stageEntered: "2026-01-20" }),
    card({ id: "UC-2", substage: "Build", phaseEntered: { Early: "2026-01-02", Late: "2026-01-12" }, stageEntered: "2026-02-01" }),
    card({ id: "UC-3", lifecycle: "Rejected", closedOn: "2026-02-10", gate: { id: "R2", status: "Rejected" as GateStatus }, gateDecided: "2026-02-10" }),
    card({ id: "UC-4", lifecycle: "On hold", closedOn: "2026-02-06", gate: { id: "R2", status: "Blocked" as GateStatus }, gateDecided: "2026-02-06" }),
  ];

  const wip = wipByPhase(fixture, phases);
  assert(wip.Early === 3 && wip.Late === 1, "wipByPhase");
  assert(funnel(fixture, phases)[0].share === 3 / 4, "funnel: share");
  const aged = aging(fixture, "2026-02-08");
  assert(aged.length === 2 && aged[0].card.id === "UC-1", "aging: longest first, closed excluded");
  const gates = gateOutcomes(fixture);
  assert(gates.decided === 2 && gates.passed === 0 && gates.passRate === 0, "gateOutcomes");
  const stuck = blockers(fixture);
  assert(stuck.length === 1 && stuck[0].id === "UC-4", "blockers: parked counts, a rejection is a decision");
  const cycle = medianCycleDaysByPhase(fixture, phases);
  assert(cycle.Late.sample === 0 && cycle.Late.open === 1, "cycle: a record still in a phase has no duration yet");
  assert(phasesBySpeed(cycle, phases).length === 1, "phasesBySpeed: skips phases with nothing measured");

  const months: PortfolioMonth[] = [
    {
      key: "2026-01",
      label: "Jan",
      submitted: 4,
      approved: 0,
      live: 0,
      closed: 0,
      wip: { Early: 3, Late: 1 },
      medianDaysToDecision: 20,
      committedUsd: 0,
      benefitUsd: 0,
    },
    {
      key: "2026-02",
      label: "Feb",
      submitted: 0,
      approved: 0,
      live: 0,
      closed: 2,
      wip: { Early: 3, Late: 1 },
      medianDaysToDecision: 18,
      committedUsd: 0,
      benefitUsd: 0,
    },
  ];
  assert(reconcile(fixture, months, phases, fixture).length === 0, `reconcile: consistent fixture (${reconcile(fixture, months, phases, fixture)})`);

  const nudged = months.map((month, index) => (index === 1 ? { ...month, wip: { Early: 9, Late: 1 } } : month));
  assert(reconcile(fixture, nudged, phases, fixture).length === 1, "reconcile: one nudged WIP number, one message");

  const digest = portfolioDigest(fixture, months, phases, "2026-02-08");
  assert(digest.includes("# Portfolio digest") && digest.includes("| State |"), "digest: markdown shape");
  assert(portfolioDigest(fixture, months, phases, "2026-02-08", { full: false }).split("## ").length === 3, "digest: short form drops two sections");

  console.log("portfolio demo passed");
}

// The check that earns its keep: the seeded snapshots against the seeded records.
// Edit a date, a funding line or a month-end row so the two disagree, and this says
// which row broke before anyone opens the dashboard. Relative imports (and a data
// layer with no aliased value imports) are what let node load it.
async function checkSeed() {
  const { ALL_RECORDS, USE_CASES, PORTFOLIO_SNAPSHOTS, AS_OF } = await import("../data/registry.ts");
  const { STAGE_GROUPS, phaseForStage } = await import("../data/lifecycle.ts");
  const phases: PhaseMap = { order: Object.keys(STAGE_GROUPS), phaseOf: phaseForStage };
  const problems = reconcile(ALL_RECORDS, PORTFOLIO_SNAPSHOTS, phases, USE_CASES);
  if (problems.length) throw new Error(`seed does not reconcile:\n  ${problems.join("\n  ")}`);
  const h = headline(ALL_RECORDS, PORTFOLIO_SNAPSHOTS, AS_OF);
  console.log(`seed reconciles — ${h.tracked} records, ${h.active} in flight, ${usd(h.investment)} committed, ${usd(h.benefit)} of benefit`);
}

if (process.env.RUN_DEMO) {
  demo();
  await checkSeed();
}
