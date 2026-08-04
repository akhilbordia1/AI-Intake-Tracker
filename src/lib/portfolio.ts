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

import type {
  AdoptionControls,
  Capability,
  ComplianceReview,
  DataExposure,
  GateStatus,
  Lifecycle,
  Oversight,
  PortfolioMonth,
  RiskLevel,
  RiskTier,
  UseCaseCard,
} from "@/data/registry";

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

// Counts at a glance, the way the refs write them: 2,450 → 2.5k, 29,000 → 29k.
export function compactNumber(value: number): string {
  if (Math.abs(value) < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`;
}

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
  return order.map((status) => ({ status, count: cards.filter((card) => card.gate?.status === status).length })).filter((row) => row.count > 0);
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

// ── Conversion, mix, impact, pulse ──

// How far the funnel narrows: the share of everything ever raised that reached each
// phase. This is the "L0 → L5 conversion" question, answered off `phaseEntered`
// rather than a hand-kept percentage.
export function conversion(cards: UseCaseCard[], phases: PhaseMap) {
  const total = cards.length || 1;
  return phases.order.map((phase) => {
    const reached = cards.filter((card) => card.phaseEntered[phase]).length;
    return { phase, reached, share: reached / total };
  });
}

// Analytical / Generative / Agentic — the split that decides how much governance a
// record needs, so it belongs next to the risk numbers.
export function capabilityMix(cards: UseCaseCard[]) {
  const order: Capability[] = ["Analytical", "Generative", "Agentic"];
  const total = cards.length || 1;
  return order.map((capability) => {
    const count = cards.filter((card) => card.capability === capability).length;
    return { capability, count, share: count / total };
  });
}

// What production actually gives back, in people and hours rather than money — the
// two numbers a sponsor repeats in a town hall.
export function impact(cards: UseCaseCard[]) {
  const live = cards.filter((card) => card.lifecycle === "Live");
  return {
    live: live.length,
    activeUsers: live.reduce((total, card) => total + (card.activeUsers ?? 0), 0),
    hoursSaved: live.reduce((total, card) => total + (card.hoursSavedPerYear ?? 0), 0),
  };
}

// The one target the portfolio actually commits to. Lives here because three places
// need the same number: the stat that reports the measure, the chart's reference line,
// and the pulse part that scores against it.
export const DECISION_TARGET_DAYS = 15;

// One number for "is the system healthy", and the four things it is made of. A single
// score hides its own reasoning, so the parts are returned with it and shown.
export function pulse(cards: UseCaseCard[], months: PortfolioMonth[], asOf: string, decisionTargetDays = DECISION_TARGET_DAYS) {
  const h = headline(cards, months, asOf);
  const targets = attainmentSummary(kpiAttainment(cards));
  const parts = [
    { label: "Gate approvals", ratio: h.passRate },
    { label: "Targets met", ratio: targets.total ? targets.ratio : 1 },
    // Faster than the target is a full mark, not a bonus.
    { label: "Decision speed", ratio: Math.min(1, decisionTargetDays / Math.max(1, h.decisionDays)) },
    { label: "Flow", ratio: h.active ? 1 - h.blocked / h.active : 1 },
  ];
  return { score: parts.reduce((total, part) => total + part.ratio, 0) / parts.length, parts };
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

// What a record has actually been measured to return. Only live records have one; everything
// else has a claim, which is a different kind of number and is read off `annualBenefitUsd`.
export const confirmedBenefit = (card: UseCaseCard) => (card.lifecycle === "Live" ? (card.confirmedBenefitUsd ?? 0) : 0);

// Confirmed against claimed on the live cohort — the realization rate. The portfolio's most
// load-bearing ratio: a benefit figure with no realization rate beside it can't be told apart
// from a business case that was simply written optimistically.
export function realization(cards: UseCaseCard[]) {
  const live = cards.filter((card) => card.lifecycle === "Live");
  const projected = live.reduce((total, card) => total + card.annualBenefitUsd, 0);
  const confirmed = live.reduce((total, card) => total + confirmedBenefit(card), 0);
  return { live: live.length, projected, confirmed, ratio: projected ? confirmed / projected : 0, shortfall: projected - confirmed };
}

// `basis` says what kind of number the benefit column holds for that state — measured, merely
// projected, or written off. Without it the table reads as five comparable figures when only
// the first row is a measurement.
export type MoneyState = {
  key: string;
  label: string;
  count: number;
  investment: number;
  benefit: number;
  basis: "Confirmed" | "Projected" | "At risk" | "Written off";
};

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
  const basis: Record<string, MoneyState["basis"]> = {
    live: "Confirmed",
    committed: "Projected",
    pipeline: "At risk",
    stopped: "Written off",
  };
  return ["live", "committed", "pipeline", "stopped"].map((key) => {
    const inBucket = cards.filter((card) => bucket(card) === key);
    return {
      key,
      label: labels[key],
      count: inBucket.length,
      investment: inBucket.reduce((total, card) => total + card.investmentUsd, 0),
      // The live row reports what was measured; every other row can only report the claim.
      // Summing `annualBenefitUsd` across all four would add one measurement to three
      // assertions and call the result a portfolio benefit.
      benefit: inBucket.reduce((total, card) => total + (key === "live" ? confirmedBenefit(card) : card.annualBenefitUsd), 0),
      basis: basis[key],
    };
  });
}

export function paybackMonths(investment: number, annualBenefit: number): number | null {
  if (annualBenefit <= 0) return null;
  return Math.round((investment / annualBenefit) * 12);
}

export function valueSeries(months: PortfolioMonth[]) {
  return months.map((month) => ({ label: month.label, investment: month.committedUsd, benefit: month.benefitUsd, partial: Boolean(month.partial) }));
}

export function valueByFunction(cards: UseCaseCard[], max = 6) {
  const rows = new Map<string, { fn: string; investment: number; benefit: number; confirmed: number; count: number }>();
  for (const card of cards) {
    const row = rows.get(card.businessFunction) ?? { fn: card.businessFunction, investment: 0, benefit: 0, confirmed: 0, count: 0 };
    row.investment += card.investmentUsd;
    row.benefit += card.annualBenefitUsd;
    row.confirmed += confirmedBenefit(card);
    row.count += 1;
    rows.set(card.businessFunction, row);
  }
  return [...rows.values()].sort((a, b) => b.investment - a.investment).slice(0, max);
}

// ── KPI attainment ──

// The record writes its KPIs as prose, so these read them back. Two shapes, one per
// stage: Plan & KPI declares "71% now → 80% target", Monitoring reports "84% of 80%
// target". Numbers may carry thousands separators and a unit.
const UNIT = "%|pts|days|months|users|h";
const figure = (raw: string) => Number(raw.replace(/,/g, ""));

export function parseTargetPair(value: string): { actual: number; target: number; unit: string } | null {
  const match = new RegExp(`([\\d,.]+)\\s*(${UNIT})?\\s+of\\s+([\\d,.]+)\\s*(${UNIT})?`, "i").exec(value);
  if (!match) return null;
  return { actual: figure(match[1]), target: figure(match[3]), unit: match[2] ?? match[4] ?? "" };
}

// The Plan stage's half: what it was before this shipped, and what it has to reach. A
// baseline is the number a target is worth anything against — "45 active users" says
// nothing until you know it started at nought.
export function parseBaselineTarget(value: string): { baseline: number; target: number; unit: string } | null {
  const match = new RegExp(`([\\d,.]+)\\s*(${UNIT})?\\s*(?:now|today)?\\s*(?:→|->)\\s*([\\d,.]+)\\s*(${UNIT})?`, "i").exec(value);
  if (!match) return null;
  return { baseline: figure(match[1]), target: figure(match[3]), unit: match[2] ?? match[4] ?? "" };
}

export type RecordKpi = {
  name: string;
  baseline: number;
  target: number;
  actual: number | null;
  unit: string;
  met: boolean;
  // How far from baseline to target it has travelled — the fraction that actually
  // answers "is this working", which `actual / target` doesn't when the baseline isn't nought.
  progress: number;
};

// The deep record's KPIs, paired across the two stages that own them: Plan & KPI declares
// the baseline and the target, Monitoring reports the current value, and they are matched
// by label — which is why the labels are deliberately identical in both.
export function recordKpis(stages: { name: string; rows: [string, string][] }[]): RecordKpi[] {
  const rowsOf = (name: string) => stages.find((stage) => stage.name === name)?.rows ?? [];
  const monitoring = new Map(rowsOf("Monitoring and tracking"));

  return rowsOf("Plan & KPI").flatMap((row) => {
    const planned = parseBaselineTarget(row[1]);
    if (!planned) return [];
    const reported = parseTargetPair(monitoring.get(row[0]) ?? "");
    const span = planned.target - planned.baseline;
    return [
      {
        name: row[0],
        baseline: planned.baseline,
        target: planned.target,
        actual: reported ? reported.actual : null,
        unit: planned.unit,
        met: reported ? reported.actual >= planned.target : false,
        progress: reported && span !== 0 ? Math.max(0, (reported.actual - planned.baseline) / span) : 0,
      },
    ];
  });
}

// The two stages have to agree. A target declared at planning and a different one reported
// at monitoring is the failure this catches: the record would be marking its own homework
// against a number nobody signed off.
export function reconcileRecordKpis(stages: { name: string; rows: [string, string][] }[]): string[] {
  const problems: string[] = [];
  const planned = recordKpis(stages);
  if (!planned.length) problems.push("Plan & KPI declares no baseline → target rows");

  const monitoring = new Map(stages.find((stage) => stage.name === "Monitoring and tracking")?.rows ?? []);
  for (const kpi of planned) {
    const reported = parseTargetPair(monitoring.get(kpi.name) ?? "");
    if (!reported) {
      problems.push(`${kpi.name}: planned at ${kpi.target}${kpi.unit}, but Monitoring reports no current value`);
      continue;
    }
    if (reported.target !== kpi.target) {
      problems.push(`${kpi.name}: planned target ${kpi.target}${kpi.unit}, Monitoring says ${reported.target}${reported.unit}`);
    }
    if (reported.unit !== kpi.unit) problems.push(`${kpi.name}: planned in ${kpi.unit || "no unit"}, reported in ${reported.unit || "no unit"}`);
  }

  // Anything Monitoring reports that planning never asked for.
  for (const [label, value] of monitoring) {
    if (!parseTargetPair(value)) continue;
    if (!planned.some((kpi) => kpi.name === label)) problems.push(`${label}: reported at Monitoring but never planned`);
  }
  return problems;
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

// ── What's live, per record ──

// Adoption, money, payback, go-live date and KPI targets were four tiles keyed by the
// same thing: a record in production. One row per live record joins them, so "cost
// $95K, returns $150K, 1.2k people use it, pays back in 8 months, both targets met" is
// one line about one thing instead of four lookups across a page. Newest first — a
// ledger reads from the most recent event.
export function productionRows(cards: UseCaseCard[]) {
  return cards
    .filter((card) => card.lifecycle === "Live")
    .sort((a, b) => (b.liveSince ?? "").localeCompare(a.liveSince ?? ""))
    .map((card) => {
      const kpis = kpiAttainment([card]);
      return {
        card,
        payback: paybackMonths(card.investmentUsd, card.annualBenefitUsd),
        kpis,
        met: kpis.filter((row) => row.met).length,
        total: kpis.length,
      };
    });
}

// The other half of the ledger: what was asked for and didn't happen. Kept apart from
// the live rows because none of the production columns apply — a stopped record has an
// ask, a date and a reason, and its money was never spent.
export function stoppedRows(cards: UseCaseCard[]) {
  return cards
    .filter((card) => card.lifecycle === "Rejected" || card.lifecycle === "On hold")
    .sort((a, b) => (b.closedOn ?? "").localeCompare(a.closedOn ?? ""));
}

// ── Governance findings ──

// The oversight each risk level requires. A rule, not data — which is why it sits here and not
// in the registry: `portfolio.ts` imports the registry type-only so it stays runnable under
// plain node, and one value import from an aliased path breaks that.
const oversightRequiredFor: Record<RiskLevel, Oversight[]> = {
  High: ["Always"],
  Medium: ["Always", "On exceptions"],
  Low: ["Always", "On exceptions", "None"],
};

// Records carrying less human oversight than their risk level requires. This is the committee's
// finding rather than a project's problem: nobody below this table can change a risk tier or
// authorise less supervision, so it belongs on a leadership page and nowhere else.
//
// A record with no oversight recorded at all is not counted. Oversight is set at Qualification,
// so an idea still in Ideation has no gap to be in — treating unset as "None" would make every
// new submission a governance breach.
export function underSupervised(cards: UseCaseCard[]) {
  return cards.filter((card) => card.oversight && !oversightRequiredFor[card.riskLevel].includes(card.oversight));
}

// One tally per compliance review, commonest first — the load each function is carrying.
export function complianceLoad(cards: UseCaseCard[]) {
  const counts = new Map<ComplianceReview, number>();
  for (const card of cards) for (const review of card.reviews ?? []) counts.set(review, (counts.get(review) ?? 0) + 1);
  return [...counts.entries()].map(([review, count]) => ({ review, count })).sort((a, b) => b.count - a.count);
}

// Same shape for what the use cases touch.
export function exposureLoad(cards: UseCaseCard[]) {
  const counts = new Map<DataExposure, number>();
  for (const card of cards) for (const kind of card.dataExposure ?? []) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return [...counts.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);
}

// The five adoption controls, each as "how many of the live records have this in place". Live
// records only: a control recorded at Adoption can't be assessed on something still in build.
const ADOPTION_CONTROLS: { key: keyof AdoptionControls; label: string }[] = [
  { key: "training", label: "Training completed" },
  { key: "responsibleAi", label: "Responsible AI sign-off" },
  { key: "supportModel", label: "Support model in place" },
  { key: "biasMonitoring", label: "Bias monitoring live" },
  { key: "sopEmbedded", label: "Embedded in SOP" },
];

export function adoptionControls(cards: UseCaseCard[]) {
  const measured = cards.filter((card) => card.adoption);
  return ADOPTION_CONTROLS.map(({ key, label }) => {
    const inPlace = measured.filter((card) => card.adoption?.[key] === "In place").length;
    const started = measured.filter((card) => card.adoption?.[key] === "In progress").length;
    return { key, label, inPlace, started, total: measured.length, ratio: measured.length ? inPlace / measured.length : 0 };
  });
}

// ── The gate register: all twelve stages, not the four phases ──

// Where every record currently sits, and how long the ones sitting there have been sitting.
//
// This is a *dwell* measure, not a duration: it's the age of the records at that stage right
// now, which is a different question from how long the stage takes to get through
// (`medianCycleDaysByPhase` answers that one, and can only answer it for records that have
// left). A stage nobody is at reports no dwell rather than zero days.
export function stageRegister(cards: UseCaseCard[], stagesByPhase: Record<string, string[]>, asOf: string) {
  return Object.entries(stagesByPhase).map(([phase, stages]) => ({
    phase,
    stages: stages.map((stage) => {
      const here = cards.filter((card) => card.substage === stage && card.lifecycle !== "Rejected");
      const ages = here.map((card) => daysBetween(card.stageEntered, asOf));
      return { stage, count: here.length, dwell: ages.length ? median(ages) : null, oldest: ages.length ? Math.max(...ages) : null };
    }),
  }));
}

// ── Concentration ──

// How much of the confirmed benefit sits in how few records. A portfolio returning most of its
// value from two use cases is a different thing from one returning it evenly, and the average
// hides which you have.
export function benefitConcentration(cards: UseCaseCard[], topN = 3) {
  const live = cards
    .filter((card) => card.lifecycle === "Live")
    .map((card) => ({ card, confirmed: confirmedBenefit(card) }))
    .sort((a, b) => b.confirmed - a.confirmed);
  const total = live.reduce((sum, row) => sum + row.confirmed, 0) || 1;
  const band = (rows: typeof live) => ({ count: rows.length, confirmed: rows.reduce((sum, row) => sum + row.confirmed, 0) });
  const top = band(live.slice(0, topN));
  const rest = band(live.slice(topN));
  return {
    total,
    top: { ...top, share: top.confirmed / total, records: live.slice(0, topN).map((row) => row.card) },
    rest: { ...rest, share: rest.confirmed / total },
  };
}

// ── Quarter on quarter ──

// The monthly snapshots grouped into quarters, so "did the last round of interventions work"
// has an answer. A quarter with no month-ends in the window is left out rather than reported
// as zero.
export function quarters(months: PortfolioMonth[]) {
  const byQuarter = new Map<string, PortfolioMonth[]>();
  for (const month of months) {
    const [year, mm] = month.key.split("-");
    const label = `Q${Math.floor((Number(mm) - 1) / 3) + 1} ${year}`;
    byQuarter.set(label, [...(byQuarter.get(label) ?? []), month]);
  }
  // A quarter reports its last month-end: these are cumulative measures, so the closing
  // position is the quarter's position.
  return [...byQuarter.entries()].map(([label, rows]) => ({ label, close: rows[rows.length - 1], months: rows.length }));
}

// ── The maturity index ──

// One composite out of five equally weighted sub-scores, each already derived elsewhere. Not a
// new measurement — a way of asking "is this operation getting better" that survives one bad
// quarter in any single dimension.
export function maturityIndex(cards: UseCaseCard[], months: PortfolioMonth[], phases: PhaseMap, asOf: string) {
  const h = headline(cards, months, asOf);
  const real = realization(cards);
  const controls = adoptionControls(cards);
  const reached = conversion(cards, phases);
  const production = reached[reached.length - 1]?.share ?? 0;
  const adoptionDepth = controls.length ? controls.reduce((sum, row) => sum + row.ratio, 0) / controls.length : 0;
  // Pipeline depth is scored against a target book of work rather than against itself: a
  // portfolio's raw count says nothing without the size it is trying to be.
  const parts = [
    { label: "Pipeline depth", score: Math.min(1, cards.length / 24) },
    { label: "Production conversion", score: production },
    { label: "Value realization", score: real.ratio },
    { label: "Governance closure", score: h.passRate },
    { label: "Adoption depth", score: adoptionDepth },
  ];
  const score = parts.reduce((sum, part) => sum + part.score, 0) / parts.length;
  return { score, outOf5: Math.round(score * 5 * 10) / 10, parts };
}

// ── What only this committee can unblock ──

// Four queues, each one a thing no project manager can fix: a gate with no decision recorded,
// a live record supervised below its risk tier, money committed to something that stopped, and
// a record that has not moved in two months. Anything a delivery lead could clear on their own
// is deliberately absent — a committee agenda made of other people's work is why these meetings
// run long.
export function committeeQueue(cards: UseCaseCard[], asOf: string, stalledDays = 60) {
  const openGates = cards.filter((card) => card.gate?.status === "In review" || card.gate?.status === "Pending");
  const under = underSupervised(cards);
  const underLive = under.filter((card) => card.lifecycle === "Live");
  const stalled = cards.filter((card) => card.lifecycle === "Active" && daysBetween(card.stageEntered, asOf) >= stalledDays);
  const oldest = (rows: UseCaseCard[]) => (rows.length ? Math.max(...rows.map((card) => daysBetween(card.stageEntered, asOf))) : null);
  const sum = (rows: UseCaseCard[]) => rows.reduce((total, card) => total + card.investmentUsd, 0);
  return [
    {
      key: "gates",
      count: openGates.length,
      title: "Gate decisions with nothing recorded",
      note: "A decision, not a project plan",
      oldestDays: oldest(openGates),
      money: sum(openGates),
      records: openGates,
    },
    {
      key: "oversight",
      count: underLive.length,
      title: "Live and supervised below their risk tier",
      note: "Needs an oversight ruling",
      oldestDays: oldest(underLive),
      money: sum(underLive),
      records: underLive,
    },
    {
      key: "stalled",
      count: stalled.length,
      title: `Not moved in ${stalledDays} days or more`,
      note: "Escalate or close",
      oldestDays: oldest(stalled),
      money: sum(stalled),
      records: stalled,
    },
  ].filter((row) => row.count > 0);
}

// ── The portfolio's health, weighted ──

// One score out of 100 from four measures that are not equally important. `pulse()` weighted them
// equally, which said that adoption depth and value realization matter the same amount — they do
// not, and a committee's own scoring model is the thing a leadership page should be reporting
// rather than a convenient average.
//
// The weights are the model, so they are printed next to each measure. A composite whose weights
// are hidden is a number nobody can argue with, which is the opposite of useful here.
const HEALTH_WEIGHTS = [
  { key: "value", label: "Value realization", weight: 0.35 },
  { key: "governance", label: "Governance closure", weight: 0.25 },
  { key: "adoption", label: "Adoption depth", weight: 0.2 },
  { key: "flow", label: "Flow health", weight: 0.2 },
];

export function portfolioHealth(cards: UseCaseCard[], months: PortfolioMonth[], asOf: string, priorScore?: number) {
  const h = headline(cards, months, asOf);
  const real = realization(cards);
  const controls = adoptionControls(cards);
  const adoptionDepth = controls.length ? controls.reduce((sum, row) => sum + row.ratio, 0) / controls.length : 0;
  // Flow is decision speed against the one target the portfolio commits to, capped — beating the
  // target is a full mark, not a bonus that can mask a weak measure elsewhere.
  const flow = Math.min(1, DECISION_TARGET_DAYS / Math.max(1, h.decisionDays));
  const scores: Record<string, number> = { value: real.ratio, governance: h.passRate, adoption: adoptionDepth, flow };
  const parts = HEALTH_WEIGHTS.map((part) => ({ ...part, ratio: scores[part.key] ?? 0 }));
  const score = Math.round(parts.reduce((sum, part) => sum + part.ratio * part.weight, 0) * 100);
  return {
    score,
    parts,
    // Three bands, and the wording is the committee's own: a score is only useful if it comes
    // with what to do about it.
    verdict: score >= 80 ? "Healthy" : score >= 60 ? "Needs attention" : "At risk",
    moved: priorScore === undefined ? null : score - priorScore,
    since: priorScore,
  };
}

// ── Annual performance against target ──

// Four measures a committee is held to, each one derived from the records and set against the
// target and the last quarter close. Every "now" figure comes from the registry; only the target
// and the prior quarter are seeded, because a target is a decision and the prior quarter is
// history the record set no longer holds.
//
// `against` is share of target, which is the column that makes the table readable: four measures
// in four different units cannot be compared until they are all expressed as "how far along".
export function annualPerformance(
  cards: UseCaseCard[],
  targets: { key: string; label: string; unit: "usd" | "hours" | "count" | "ratio"; priorQuarter: number; target: number }[],
) {
  const live = cards.filter((card) => card.lifecycle === "Live");
  const confirmed = live.reduce((total, card) => total + confirmedBenefit(card), 0);
  const committed = cards.filter((card) => card.funded).reduce((total, card) => total + card.investmentUsd, 0);
  const now: Record<string, number> = {
    benefit: confirmed,
    hours: live.reduce((total, card) => total + (card.hoursSavedPerYear ?? 0), 0),
    users: live.reduce((total, card) => total + (card.activeUsers ?? 0), 0),
    // Confirmed return over what has been committed to get it — the portfolio's own ROI rather
    // than any single business case's.
    roi: committed ? confirmed / committed : 0,
  };
  return targets.map((target) => {
    const current = now[target.key] ?? 0;
    return {
      ...target,
      now: current,
      moved: current - target.priorQuarter,
      against: target.target ? current / target.target : 0,
      onTrack: target.target ? current >= target.target : false,
    };
  });
}

// ── The reading of the quarter ──

// Three sentences: what the portfolio returned, where it is stuck, and the one thing to do about
// it. Assembled from derivations rather than authored, so it cannot drift from the tiles — and
// phrased as findings rather than as metrics, because a committee reads prose.
// ai-upgrade: swap for a model call over the same derivations.
export function committeeReading(cards: UseCaseCard[], months: PortfolioMonth[], phases: PhaseMap, asOf: string) {
  const real = realization(cards);
  const cycle = medianCycleDaysByPhase(cards, phases);
  const ranked = phasesBySpeed(cycle, phases);
  const slow = ranked[0];
  const register = cards.filter((card) => card.lifecycle === "Active");
  const queue = committeeQueue(cards, asOf);
  const under = underSupervised(cards).filter((card) => card.lifecycle === "Live");
  const oldest = oldestOpenGate(cards, asOf);
  const controls = adoptionControls(cards);
  const worstControl = [...controls].sort((a, b) => a.ratio - b.ratio)[0];

  return {
    impact: `The portfolio returned **${usd(real.confirmed)}** annualised against **${usd(real.projected)}** projected — a ${pct(
      real.ratio,
    )} realization rate across ${real.live} live use cases, leaving ${usd(real.shortfall)} unrealised.`,
    bottleneck: slow
      ? `**${slow}** is the longest phase at a median **${cycle[slow]?.days} days** across ${cycle[slow]?.sample} records that have left it${
          register.length ? `, with ${cycle[slow]?.open ?? 0} still in it` : ""
        }.`
      : `Nothing has left a phase yet, so there is no cycle time to report.`,
    nextAction: [
      oldest ? `Clear the ${oldest.card.gate?.id} decision on **${oldest.card.title}** — ${oldest.days} days with ${oldest.card.actionOwner}.` : null,
      under.length
        ? `Reconcile oversight on ${under.length === 1 ? "**" + under[0].title + "**" : under.length + " live records"}: ${under.length === 1 ? "live" : "all live"}, ${under[0].riskLevel.toLowerCase()} risk, supervised below tier.`
        : null,
      worstControl && worstControl.inPlace < worstControl.total
        ? `${worstControl.label} is in place on ${worstControl.inPlace} of ${worstControl.total} live records.`
        : null,
    ]
      .filter(Boolean)
      .join(" ") || `Nothing needs this committee: ${queue.length} open queues.`,
  };
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

    // Confirmed, not claimed: the snapshot line is money back, so it can only be made of
    // measurements.
    const benefit = cards.filter((card) => card.liveSince && card.liveSince < end).reduce((total, card) => total + confirmedBenefit(card), 0);
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

// ── The summaries ──
// Two halves, each written where it is read: the Health view opens with the flow
// summary, the Value view with the money one. There is no separate digest document —
// a leader shouldn't have to open a modal to be told what the page in front of them
// says. The rail joins both halves when someone asks to be briefed.
// ai-upgrade: assembled from the derivations above. Swap either for a model call over
// the registry — keep the Markdown shape, the renderer is what styles it.

// What a written summary was written from. Prose that cites nothing reads as fact; the
// same prose with its sources beside it reads as a derivation you could check. It sits
// in the panel's header, not a footer bar under it — a whole ruled-off strip for one
// muted line was more chrome than the line was worth.
export function summaryProvenance(cards: UseCaseCard[], months: PortfolioMonth[], asOf: string): string {
  return `${cards.length} records · ${months.length} month-ends · ${formatDay(asOf)}`;
}

export function healthSummary(cards: UseCaseCard[], months: PortfolioMonth[], phases: PhaseMap, asOf: string): string {
  const h = headline(cards, months, asOf);
  const cycle = medianCycleDaysByPhase(cards, phases);
  const ranked = phasesBySpeed(cycle, phases);
  const slowest = ranked[0];
  const fastest = ranked[ranked.length - 1];
  const stuck = aging(cards, asOf).slice(0, 2);
  const oldest = oldestOpenGate(cards, asOf);

  // The things it names are the things you'd want to open, so they're links in the
  // sentence rather than buttons under it: a row of "Open X" / "Unblock Y" buttons said
  // the same words the paragraph had just said, one line lower. A link can't be bold —
  // the inline forms don't nest — but it doesn't need to be, since it renders in the
  // accent and underlined while the figures around it carry the bold.
  const phaseLink = (phase: string) => `[${phase}](/?phase=${encodeURIComponent(phase)})`;
  const recordLink = (card: UseCaseCard) => `[${card.title}](${card.href})`;

  return [
    `**${h.active} of ${h.tracked}** use cases are in flight, and the system is getting faster: a gate decision takes **${h.decisionDays} days**, ${
      h.decisionTrend > 0 ? `**${h.decisionTrend} fewer** than in ${h.since}` : `**${Math.abs(h.decisionTrend)} more** than in ${h.since}`
    }.`,
    [
      slowest && fastest
        ? `- ${phaseLink(slowest)} is the long pole at **${cycle[slowest].days} days** a record, against ${cycle[fastest].days} in ${fastest}.`
        : "- Not enough has moved through yet to compare phases.",
      `- **${h.attention}** ${h.attention === 1 ? "record needs" : "records need"} a decision today${
        oldest
          ? `; the oldest open gate is ${oldest.card.gate?.id} on ${recordLink(oldest.card)}, **${oldest.days} days** with ${oldest.card.actionOwner}`
          : ""
      }.`,
      stuck.length
        ? `- ${stuck.map((row) => `${recordLink(row.card)} (**${row.days}d** at ${row.card.substage})`).join(" and ")} ${
            stuck.length === 1 ? "has" : "have"
          } not moved in over a week.`
        : "- Nothing has been sitting for more than a week.",
    ].join("\n"),
  ].join("\n\n");
}

export function valueSummary(cards: UseCaseCard[], months: PortfolioMonth[], asOf: string): string {
  const h = headline(cards, months, asOf);
  const money = moneyByState(cards);
  const live = money.find((state) => state.key === "live");
  const pipeline = money.find((state) => state.key === "pipeline");
  const stopped = money.find((state) => state.key === "stopped");
  const rows = kpiAttainment(cards);
  const attainment = attainmentSummary(rows);
  const misses = rows.filter((row) => !row.met);
  // The largest ask still waiting on a decision — the one number in the pipeline bucket
  // worth opening, and the sentence names it rather than a button below repeating it.
  const biggestAsk = [...cards].filter((card) => !card.funded && card.lifecycle === "Active").sort((a, b) => b.investmentUsd - a.investmentUsd)[0];

  // The figures carry the bold, the connecting words don't. A whole bolded lead sentence
  // emphasises nothing in particular; bolding only the money, the counts and the record
  // names lets someone read the numbers straight down and the prose only if they want it.
  const real = realization(cards);
  return [
    `**${usd(h.investment)}** committed against **${usd(h.benefit)}** of *confirmed* benefit, which the **${h.live} live** use cases repay in about **${
      h.paybackMonths
    } months**.`,
    [
      // Confirmed against claimed, in the first bullet, because it reframes every figure above
      // it: the benefit number is not a small version of the business cases, it's what is left
      // of them once someone measured.
      `- The ${live?.count} live ones cost **${usd(live?.investment ?? 0)}** and return **${usd(live?.benefit ?? 0)}** a year — **${pct(real.ratio)}** of the ${usd(real.projected)} their business cases projected.`,
      `- **${attainment.met} of ${attainment.total}** production targets are met${
        misses.length ? `; behind on ${misses.map((row) => `${row.name.toLowerCase()} at [${row.card.title}](${row.card.href})`).join(" and ")}` : ""
      }.`,
      `- **${usd(pipeline?.investment ?? 0)}** is still an ask across ${pipeline?.count} records${
        biggestAsk ? `, the largest being [${biggestAsk.title}](${biggestAsk.href}) at **${usd(biggestAsk.investmentUsd)}**` : ""
      }, and **${usd(stopped?.investment ?? 0)}** of asks were stopped or parked.`,
    ].join("\n"),
  ].join("\n\n");
}

// Both halves, for the rail's "brief me on the portfolio".
export function portfolioDigest(cards: UseCaseCard[], months: PortfolioMonth[], phases: PhaseMap, asOf: string): string {
  return [
    healthSummary(cards, months, phases, asOf),
    valueSummary(cards, months, asOf),
    `*As of ${formatDay(asOf)} · derived from ${cards.length} records and ${months.length} monthly snapshots.*`,
  ].join("\n\n");
}

// A short money table for the chat, where the digest would be too much.
// ai-upgrade: same note as the digest — the shape is Markdown, the numbers are real.
export function moneyTable(cards: UseCaseCard[]): string {
  const money = moneyByState(cards);
  return `| State | Count | Investment | Annual benefit | Basis |
| --- | --- | --- | --- | --- |
${money.map((state) => `| ${state.label} | ${state.count} | ${usd(state.investment)} | ${usd(state.benefit)} | ${state.basis} |`).join("\n")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// Day and month only, for a column of dates that all fall in the same year — five
// repetitions of "2026" down a list is five things to read and nothing to learn.
export function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
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
  const thousands = parseTargetPair("1,950 of 2,160 h target");
  assert(thousands?.actual === 1950 && thousands?.target === 2160 && thousands.unit === "h", "parseTargetPair: separators and units");
  const planned = parseBaselineTarget("71% now → 80% target");
  assert(planned?.baseline === 71 && planned?.target === 80 && planned.unit === "%", "parseBaselineTarget: hit");
  assert(parseBaselineTarget("0 now -> 2,160 h target")?.target === 2160, "parseBaselineTarget: ascii arrow and separators");
  assert(parseBaselineTarget("84% of 80% target") === null, "parseBaselineTarget: a reported value is not a plan");

  // Paired across the two stages, with progress measured from the baseline rather than
  // from nought — the whole reason a baseline is recorded.
  const kpiStages = [
    { name: "Plan & KPI", rows: [["CSAT", "71% now → 80% target"] as [string, string]] },
    { name: "Monitoring and tracking", rows: [["CSAT", "84% of 80% target"] as [string, string]] },
  ];
  const [csat] = recordKpis(kpiStages);
  assert(csat.baseline === 71 && csat.target === 80 && csat.actual === 84 && csat.met, "recordKpis: pairs the two stages");
  assert(csat.progress > 1.4 && csat.progress < 1.5, `recordKpis: progress runs from the baseline (${csat.progress})`);
  assert(reconcileRecordKpis(kpiStages).length === 0, "reconcileRecordKpis: agreeing stages");
  const drifted = [kpiStages[0], { name: "Monitoring and tracking", rows: [["CSAT", "84% of 90% target"] as [string, string]] }];
  assert(reconcileRecordKpis(drifted).length === 1, "reconcileRecordKpis: a moved target is one message");
  const orphan = [
    kpiStages[0],
    { name: "Monitoring and tracking", rows: [...kpiStages[1].rows, ["ROI", "143% of 159% target"] as [string, string]] },
  ];
  assert(reconcileRecordKpis(orphan).length === 1, "reconcileRecordKpis: reported but never planned");

  const phases: PhaseMap = { order: ["Early", "Late"], phaseOf: (substage) => (substage === "Idea" ? "Early" : "Late") };
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
    capability: "Analytical" as Capability,
    ...over,
  });

  const fixture = [
    card({ id: "UC-1", created: "2026-01-04", stageEntered: "2026-01-20" }),
    card({ id: "UC-2", substage: "Build", phaseEntered: { Early: "2026-01-02", Late: "2026-01-12" }, stageEntered: "2026-02-01" }),
    card({
      id: "UC-3",
      lifecycle: "Rejected",
      closedOn: "2026-02-10",
      gate: { id: "R2", status: "Rejected" as GateStatus },
      gateDecided: "2026-02-10",
    }),
    card({
      id: "UC-4",
      lifecycle: "On hold",
      closedOn: "2026-02-06",
      gate: { id: "R2", status: "Blocked" as GateStatus },
      gateDecided: "2026-02-06",
    }),
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

  // The two halves of the ledger split cleanly and neither claims the other's records:
  // the fixture has no live record, one parked and one rejected.
  const ledger = [...fixture, card({ id: "UC-5", lifecycle: "Live", liveSince: "2026-02-01", investmentUsd: 100, annualBenefitUsd: 300 })];
  const live = productionRows(ledger);
  assert(live.length === 1 && live[0].card.id === "UC-5" && live[0].payback === 4, "productionRows: live only, payback per record");
  assert(
    stoppedRows(ledger)
      .map((row) => row.id)
      .join() === "UC-3,UC-4",
    "stoppedRows: rejected and parked, newest first",
  );

  const digest = portfolioDigest(fixture, months, phases, "2026-02-08");
  assert(digest.startsWith("**") && digest.includes("\n- "), "digest: a headline sentence and supporting lines");
  assert(digest.includes("committed against"), "digest: carries the money half");
  assert(healthSummary(fixture, months, phases, "2026-02-08").split("\n- ").length === 4, "healthSummary: three supporting lines");

  console.log("portfolio demo passed");
}

// The check that earns its keep: the seeded snapshots against the seeded records.
// Edit a date, a funding line or a month-end row so the two disagree, and this says
// which row broke before anyone opens the dashboard. Relative imports (and a data
// layer with no aliased value imports) are what let node load it.
async function checkSeed() {
  const { ALL_RECORDS, USE_CASES, PORTFOLIO_SNAPSHOTS, AS_OF } = await import("../data/registry.ts");
  const { STAGE_GROUPS, STAGES, FIELD_GISTS, phaseForStage } = await import("../data/lifecycle.ts");
  const phases: PhaseMap = { order: Object.keys(STAGE_GROUPS), phaseOf: phaseForStage };
  const problems = reconcile(ALL_RECORDS, PORTFOLIO_SNAPSHOTS, phases, USE_CASES);
  if (problems.length) throw new Error(`seed does not reconcile:\n  ${problems.join("\n  ")}`);
  const h = headline(ALL_RECORDS, PORTFOLIO_SNAPSHOTS, AS_OF);
  console.log(`seed reconciles — ${h.tracked} records, ${h.active} in flight, ${usd(h.investment)} committed, ${usd(h.benefit)} of benefit`);

  // The record plans its KPIs in one stage and reports them in the next. Edit a target in
  // either place and this says which one stopped agreeing.
  const kpiProblems = reconcileRecordKpis(STAGES);
  if (kpiProblems.length) throw new Error(`record KPIs do not reconcile:\n  ${kpiProblems.join("\n  ")}`);
  // Every field still needs its definition, or a blank record shows dead air where the
  // gist should be. Cheap to check here, and it's the one place that knows both.
  const missing = STAGES.flatMap((stage) => stage.rows.filter(([label]) => !FIELD_GISTS[label]).map(([label]) => `${stage.name} :: ${label}`));
  if (missing.length) throw new Error(`fields with no FIELD_GISTS entry:\n  ${missing.join("\n  ")}`);
  const kpis = recordKpis(STAGES);
  console.log(
    `record KPIs reconcile — ${kpis.length} planned and reported, ${kpis.filter((kpi) => kpi.met).length} met (${kpis
      .map((kpi) => `${kpi.name} ${kpi.actual}${kpi.unit}/${kpi.target}${kpi.unit}`)
      .join(", ")})`,
  );
}

if (process.env.RUN_DEMO) {
  demo();
  await checkSeed();
}
