// ── The registry ──
// Every use case the organisation has raised, as the tracker's cards. Lifted out
// of the tracker page so the portfolio view reads the same records rather than
// keeping a second copy of them.
//
// Three files hold record data and they hold *different* records — know which one
// you're editing:
//  1. this file — the whole registry, one card each, shallow.
//  2. `lifecycle.ts` — the one deep record (12 stages of captured values), which
//     is UC-142 here.
//  3. `document-workflow-form-schema.ts` / `intake-form-schema.ts` — the rich
//     field *schema* plus a filled example of it. Nothing on the board or the
//     portfolio reads those values.
//
// Deliberately free of value imports: `src/lib/portfolio.ts` derives its KPIs from
// these shapes and stays runnable under plain `node`, which only works while the
// import graph is types-only.

import type { Tone } from "@/components/ui/kit";

export type Priority = "High" | "Medium" | "Low";
export type GateStatus = "Pending" | "In review" | "Passed" | "Blocked" | "Rejected";
export type Lifecycle = "Active" | "On hold" | "Rejected" | "Live";
export type ScopeFilter = "my" | "team" | "all";
export type RiskTier = "Lightweight" | "Standard" | "Full";
// What kind of AI it is — the split leadership asks about first, because the three
// carry different risk and different build effort.
export type Capability = "Analytical" | "Generative" | "Agentic";
export type RiskLevel = "Low" | "Medium" | "High";

// ── Governance vocabulary ──
// How much of a human stays in the loop, set at Qualification. The tier a record's risk
// level *requires* is a separate thing (see `oversightRequiredFor`) — the gap between what
// a record has and what its risk demands is the committee's single most useful number.
export type Oversight = "Always" | "On exceptions" | "None";
// What the use case touches. Declared at Ideation, confirmed at Assessment.
export type DataExposure = "GxP-impacting" | "21 CFR Part 11" | "PII in scope";
// Which functions had to review it, triggered at Triage.
export type ComplianceReview = "Responsible AI" | "Data privacy" | "Security" | "Quality & GxP" | "Legal";
// The five things that decide whether a live use case is actually adopted, recorded at
// Adoption. Three states, not a boolean: "not started" and "in progress" are the
// distinction an audit trail turns on.
export type ControlState = "In place" | "In progress" | "Not started";
export type AdoptionControls = {
  training: ControlState;
  responsibleAi: ControlState;
  supportModel: ControlState;
  biasMonitoring: ControlState;
  sopEmbedded: ControlState;
};

// What oversight each risk level *requires* is a derivation rule, not registry data, so it
// lives in `src/lib/portfolio.ts` beside `underSupervised()`. Keeping it out of here is what
// lets that file import this one type-only and stay runnable under plain node.

// The prototype's "today". Every derivation takes it as an argument rather than
// calling `new Date()`, so an aging number can't differ between the prerender and
// the client — and re-anchoring the whole demo is this one line.
export const AS_OF = "2026-07-08";

// ── What the portfolio is aiming at ──
// Annual targets and the position at the last quarter close. The *current* figure for each
// measure is always derived from the records (see `annualPerformance`) — only the target and the
// prior-quarter position are seeded, because neither is derivable: a target is a decision
// somebody made, and the prior quarter is history the record set no longer contains.
export const PORTFOLIO_TARGETS = {
  // The book of work the portfolio is trying to hold, for the maturity index and the size card.
  sizeTarget: 24,
  // Share of gate decisions that should be closed out rather than left open.
  governanceClosure: 0.9,
  // The composite at the last quarter close, so the headline score can carry a direction. Seeded
  // for the same reason the prior-quarter measures are: the record set holds today's position,
  // not the one it was in three months ago.
  priorQuarterHealth: 55,
  annual: [
    { key: "benefit", label: "Cost saved", unit: "usd" as const, priorQuarter: 640_000, target: 1_800_000 },
    { key: "hours", label: "Hours saved", unit: "hours" as const, priorQuarter: 18_400, target: 34_000 },
    { key: "users", label: "Active users", unit: "count" as const, priorQuarter: 1_640, target: 3_600 },
    { key: "roi", label: "Return on investment", unit: "ratio" as const, priorQuarter: 0.39, target: 0.75 },
  ],
};

export type UseCaseCard = {
  id: string;
  title: string;
  description: string;
  owner: string;
  // Shared-responsibility stages (e.g. adoption) carry a second owner.
  coOwner?: string;
  due: string;
  stage: string;
  // The specific detail-view stage inside the condensed board column.
  substage: string;
  // Functional priority (set by the functional lead). null until prioritized.
  priority: Priority | null;
  // Portfolio priority (set by the core team). Overrides functional once set.
  orgPriority?: Priority;
  dueGroup: "Submitted" | "This week" | "Next week" | "Funded" | "Rejected";
  actionOwner: string;
  needsAttention: boolean;
  attentionTask?: string;
  pendingFor?: string;
  // Assessment gate the use case currently sits at, with its own status.
  gate?: { id: string; status: GateStatus };
  lifecycle: Lifecycle;
  href: string;

  // ── The history layer ──
  // What the board never needed but a portfolio can't be read without: when things
  // happened, what they cost, what they returned, how risky they are. Dates are ISO
  // so arithmetic needs no parsing and no timezone.
  created: string;
  // Entry into the *current* substage — this is what "waiting N days" measures.
  stageEntered: string;
  // One date per phase reached, keyed by a STAGE_GROUPS key → time spent per phase.
  phaseEntered: Partial<Record<string, string>>;
  // The decision behind `gate`, if it has been taken.
  gateDecided?: string;
  // When investment was actually committed (a gate pass, or a sponsor's sign-off).
  fundedOn?: string;
  targetGoLive?: string;
  liveSince?: string;
  // Rejected or put on hold on this date.
  closedOn?: string;
  // One currency, whole dollars: a prototype that converts currencies is a prototype
  // arguing with itself.
  investmentUsd: number;
  // What the business case *claims* the thing will return in a year. Every record has one,
  // including the ones that will never be built — it's an assertion, not a measurement.
  annualBenefitUsd: number;
  // What Monitoring & Tracking has actually measured, once it's live. Only live records carry
  // it, and it is routinely lower than the claim: the gap between the two is the single most
  // important number a portfolio has, and one field holding both would hide it.
  confirmedBenefitUsd?: number;
  funded: boolean;
  riskTier: RiskTier;
  riskLevel: RiskLevel;
  businessFunction: string;
  capability: Capability;
  // Adoption, once it's in production: who uses it and what it gives back in time.
  activeUsers?: number;
  hoursSavedPerYear?: number;
  // Measured only once something is live.
  kpis?: { name: string; actual: number; target: number; unit: "%" | "days" | "pts" }[];
  // Decisions already taken, oldest first — `gate` is only the current one.
  gateHistory?: { id: string; status: GateStatus; decided: string; approver: string }[];

  // ── The governance layer ──
  // What a committee asks that the board never does: who is watching this thing, what it
  // touches, which functions had to review it, and whether the things that make adoption
  // stick actually happened. Every one is recorded at a specific stage, so a record that
  // hasn't reached that stage leaves the field off rather than carrying a default — an
  // unset oversight level and "None" are different facts.
  //
  // Set at Qualification, so anything still in Ideation or Prioritisation has none.
  oversight?: Oversight;
  // Declared at Ideation and confirmed at Assessment.
  dataExposure?: DataExposure[];
  // Triggered at Triage. A record before Triage leaves it off.
  reviews?: ComplianceReview[];
  // Recorded at Adoption, so only production records carry it.
  adoption?: AdoptionControls;
};

export const USE_CASES: UseCaseCard[] = [
  {
    id: "UC-138",
    title: "Finance Policy Summarizer",
    description: "Summarizes finance policy updates for regional ops teams.",
    owner: "Aarav Mehta",
    due: "Submitted",
    stage: "Intake",
    substage: "Ideation",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "Nisha Patel",
    needsAttention: true,
    attentionTask: "Review intake submission",
    pendingFor: "3 days",
    lifecycle: "Active",
    created: "2026-07-05",
    stageEntered: "2026-07-05",
    phaseEntered: { "Intake & Prioritization": "2026-07-05" },
    targetGoLive: "2027-01-31",
    investmentUsd: 120_000,
    annualBenefitUsd: 180_000,
    funded: false,
    riskTier: "Lightweight",
    riskLevel: "Low",
    businessFunction: "Finance",
    capability: "Generative",
    href: "/overview",
  },
  {
    id: "UC-141",
    title: "Sales Call Insight Assistant",
    description: "Turns sales call notes into follow-up actions and CRM fields.",
    owner: "Mira Kapoor",
    due: "Submitted",
    stage: "Intake",
    substage: "Ideation",
    priority: null,
    dueGroup: "Submitted",
    actionOwner: "Mira Kapoor",
    needsAttention: false,
    lifecycle: "Active",
    created: "2026-07-03",
    stageEntered: "2026-07-03",
    phaseEntered: { "Intake & Prioritization": "2026-07-03" },
    targetGoLive: "2027-02-28",
    investmentUsd: 160_000,
    annualBenefitUsd: 240_000,
    funded: false,
    riskTier: "Standard",
    riskLevel: "Low",
    businessFunction: "Sales",
    capability: "Generative",
    // The one card that opens an untouched record: `?blank=1` renders the twelve stages
    // with nothing captured, so the empty state can be walked from the board. UC-141 is
    // the right card for it — raised on 3 Jul, still at Ideation, nobody waiting on it,
    // which is exactly a use case whose stages haven't been filled in yet. Everything
    // else about the card is unchanged, so the portfolio's `reconcile()` still balances.
    href: "/detail?blank=1",
  },
  {
    // The one record with a full workflow behind it — `lifecycle.ts` is this card's
    // 12 stages, so the board and the record agree on what it is, who owns it and
    // where it has got to. Every other card is a card only.
    id: "UC-142",
    title: "Protocol Digest Assistant",
    description: "Summarises clinical trial protocols so medical writers can extract endpoints and criteria faster.",
    owner: "Noah R.",
    due: "10 Jul 2026",
    stage: "Planning",
    substage: "Solutionise and Production",
    priority: "High",
    orgPriority: "High",
    dueGroup: "Next week",
    actionOwner: "Noah R.",
    needsAttention: true,
    attentionTask: "Close out the build review evidence",
    pendingFor: "2 days",
    gate: { id: "R3", status: "In review" },
    lifecycle: "Active",
    // These four come straight from the deep record — created on, the prioritised
    // build cost, the triage tier and the assessed level — so a portfolio tile and
    // the record can't disagree.
    created: "2026-06-18",
    stageEntered: "2026-07-06",
    phaseEntered: { "Intake & Prioritization": "2026-06-18", "Governance & Risk": "2026-06-22", "Delivery": "2026-06-29" },
    fundedOn: "2026-06-28",
    targetGoLive: "2026-11-30",
    investmentUsd: 325_000,
    annualBenefitUsd: 518_000,
    funded: true,
    riskTier: "Full",
    riskLevel: "Medium",
    oversight: "Always",
    dataExposure: ["GxP-impacting", "21 CFR Part 11"],
    reviews: ["Responsible AI", "Quality & GxP", "Security"],
    businessFunction: "R&D",
    capability: "Generative",
    gateHistory: [{ id: "R1", status: "Passed", decided: "2026-06-22", approver: "Priya Rao" }],
    href: "/overview",
  },
  {
    id: "UC-146",
    title: "Procurement Clause Checker",
    description: "Flags missing clauses in supplier contracts before approval.",
    owner: "Nisha Patel",
    due: "7 Jul 2026",
    stage: "Screening",
    substage: "Qualification",
    priority: "Medium",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: true,
    attentionTask: "Confirm the qualification call",
    pendingFor: "4 days",
    gate: { id: "R1", status: "Pending" },
    lifecycle: "Active",
    created: "2026-06-23",
    stageEntered: "2026-07-01",
    phaseEntered: { "Intake & Prioritization": "2026-06-23" },
    targetGoLive: "2027-01-15",
    investmentUsd: 145_000,
    annualBenefitUsd: 210_000,
    funded: false,
    riskTier: "Standard",
    riskLevel: "Medium",
    oversight: "On exceptions",
    dataExposure: ["PII in scope"],
    reviews: ["Legal", "Data privacy"],
    businessFunction: "Legal",
    capability: "Analytical",
    href: "/overview",
  },
  {
    id: "UC-147",
    title: "HR Benefits Advisor",
    description: "Answers employee benefits questions from approved policy content.",
    owner: "Nisha Patel",
    due: "8 Jul 2026",
    stage: "Screening",
    substage: "Prioritisation",
    priority: "Medium",
    dueGroup: "This week",
    actionOwner: "Nisha Patel",
    needsAttention: true,
    attentionTask: "Set the functional priority",
    pendingFor: "2 days",
    lifecycle: "Active",
    created: "2026-06-26",
    stageEntered: "2026-07-02",
    phaseEntered: { "Intake & Prioritization": "2026-06-26" },
    targetGoLive: "2027-01-31",
    investmentUsd: 90_000,
    annualBenefitUsd: 130_000,
    funded: false,
    riskTier: "Lightweight",
    riskLevel: "Low",
    dataExposure: ["PII in scope"],
    reviews: ["Data privacy"],
    businessFunction: "HR",
    capability: "Generative",
    href: "/overview",
  },
  {
    id: "UC-128",
    title: "Customer Churn Signal Model",
    description: "Scores customer churn risk for account planning discussions.",
    owner: "Rohan Desai",
    due: "10 Jul 2026",
    stage: "Governance review",
    substage: "Assessment",
    priority: "High",
    orgPriority: "High",
    dueGroup: "This week",
    actionOwner: "Rohan Desai",
    needsAttention: false,
    gate: { id: "R2", status: "In review" },
    lifecycle: "Active",
    created: "2026-05-26",
    stageEntered: "2026-06-26",
    phaseEntered: { "Intake & Prioritization": "2026-05-26", "Governance & Risk": "2026-06-26" },
    targetGoLive: "2026-12-15",
    investmentUsd: 240_000,
    annualBenefitUsd: 400_000,
    funded: false,
    riskTier: "Full",
    riskLevel: "High",
    oversight: "On exceptions",
    dataExposure: ["PII in scope"],
    reviews: ["Responsible AI", "Data privacy", "Security"],
    businessFunction: "Sales",
    capability: "Analytical",
    gateHistory: [{ id: "R1", status: "Passed", decided: "2026-06-24", approver: "Priya Rao" }],
    href: "/overview",
  },
  {
    id: "UC-132",
    title: "Invoice Exception Classifier",
    description: "Classifies invoice exceptions for accounts payable routing.",
    owner: "Elena Weber",
    due: "12 Jul 2026",
    stage: "Governance review",
    substage: "Business Case",
    priority: "Medium",
    orgPriority: "Medium",
    dueGroup: "Next week",
    actionOwner: "Elena Weber",
    needsAttention: false,
    gate: { id: "R2", status: "Blocked" },
    lifecycle: "On hold",
    created: "2026-06-03",
    stageEntered: "2026-06-19",
    phaseEntered: { "Intake & Prioritization": "2026-06-03", "Governance & Risk": "2026-06-19" },
    gateDecided: "2026-07-02",
    closedOn: "2026-07-02",
    targetGoLive: "2026-12-31",
    investmentUsd: 185_000,
    annualBenefitUsd: 275_000,
    funded: false,
    riskTier: "Standard",
    riskLevel: "Medium",
    oversight: "On exceptions",
    reviews: ["Security"],
    businessFunction: "Finance",
    capability: "Analytical",
    gateHistory: [{ id: "R1", status: "Passed", decided: "2026-06-15", approver: "Priya Rao" }],
    href: "/overview",
  },
  {
    id: "UC-119",
    title: "Service Desk Knowledge Retrieval",
    description: "Retrieves approved knowledge articles for service desk agents.",
    owner: "Priya Rao",
    due: "16 Jul 2026",
    stage: "Planning",
    substage: "Solution blue print",
    priority: "Medium",
    orgPriority: "Low",
    dueGroup: "Next week",
    actionOwner: "Priya Rao",
    needsAttention: false,
    gate: { id: "R2", status: "Passed" },
    lifecycle: "Active",
    created: "2026-05-06",
    stageEntered: "2026-06-29",
    phaseEntered: { "Intake & Prioritization": "2026-05-06", "Governance & Risk": "2026-05-28", "Delivery": "2026-06-29" },
    gateDecided: "2026-06-26",
    fundedOn: "2026-06-26",
    targetGoLive: "2026-10-30",
    investmentUsd: 210_000,
    annualBenefitUsd: 330_000,
    funded: true,
    riskTier: "Standard",
    riskLevel: "Medium",
    oversight: "On exceptions",
    dataExposure: ["PII in scope"],
    reviews: ["Data privacy", "Security"],
    businessFunction: "Support",
    capability: "Generative",
    gateHistory: [{ id: "R1", status: "Passed", decided: "2026-05-26", approver: "Priya Rao" }],
    href: "/overview",
  },
  {
    id: "UC-125",
    title: "Demand Forecast Explainer",
    description: "Explains forecast movements for weekly supply planning.",
    owner: "Priya Rao",
    due: "18 Jul 2026",
    stage: "Planning",
    substage: "Plan & KPI",
    priority: "Medium",
    orgPriority: "Medium",
    dueGroup: "Next week",
    actionOwner: "Priya Rao",
    needsAttention: false,
    gate: { id: "R2", status: "Passed" },
    lifecycle: "Active",
    created: "2026-05-18",
    stageEntered: "2026-07-02",
    phaseEntered: { "Intake & Prioritization": "2026-05-18", "Governance & Risk": "2026-06-10", "Delivery": "2026-07-02" },
    gateDecided: "2026-07-02",
    fundedOn: "2026-07-02",
    targetGoLive: "2026-11-15",
    investmentUsd: 265_000,
    annualBenefitUsd: 395_000,
    funded: true,
    riskTier: "Full",
    riskLevel: "Medium",
    oversight: "Always",
    dataExposure: ["GxP-impacting"],
    reviews: ["Responsible AI", "Security"],
    businessFunction: "Supply Chain",
    capability: "Analytical",
    gateHistory: [{ id: "R1", status: "Passed", decided: "2026-06-08", approver: "Priya Rao" }],
    href: "/overview",
  },
  {
    id: "UC-103",
    title: "Marketing Asset Tagger",
    description: "Suggests campaign metadata for approved marketing assets.",
    owner: "Daniel Cho",
    coOwner: "Priya Rao",
    due: "Funded",
    stage: "Approved",
    substage: "Monitoring and tracking",
    priority: "Low",
    orgPriority: "Low",
    dueGroup: "Funded",
    actionOwner: "Daniel Cho",
    needsAttention: false,
    // R3 (build review) is the gate a live record has cleared — the old "R4" wasn't
    // a gate the lifecycle defines.
    gate: { id: "R3", status: "Passed" },
    lifecycle: "Live",
    created: "2026-04-21",
    stageEntered: "2026-05-30",
    phaseEntered: { "Intake & Prioritization": "2026-04-21", "Governance & Risk": "2026-05-02", "Delivery": "2026-05-12", "Operate & Adopt": "2026-05-30" },
    gateDecided: "2026-05-12",
    fundedOn: "2026-05-12",
    targetGoLive: "2026-05-30",
    liveSince: "2026-05-30",
    investmentUsd: 140_000,
    annualBenefitUsd: 205_000,
    confirmedBenefitUsd: 150_000,
    funded: true,
    riskTier: "Lightweight",
    riskLevel: "Low",
    oversight: "On exceptions",
    reviews: ["Responsible AI"],
    adoption: { training: "In place", responsibleAi: "In place", supportModel: "In place", biasMonitoring: "Not started", sopEmbedded: "In progress" },
    businessFunction: "Marketing",
    capability: "Analytical",
    activeUsers: 240,
    hoursSavedPerYear: 3_100,
    kpis: [
      { name: "Tagging accuracy", actual: 92, target: 90, unit: "%" },
      { name: "Time to publish saved", actual: 41, target: 35, unit: "%" },
    ],
    gateHistory: [
      { id: "R1", status: "Passed", decided: "2026-04-28", approver: "Priya Rao" },
      { id: "R2", status: "Passed", decided: "2026-05-08", approver: "Nisha Patel" },
    ],
    href: "/overview",
  },
  {
    id: "UC-097",
    title: "Refund Auto-Approval Agent",
    description: "Auto-approves low-value refund requests without human review.",
    owner: "Rohan Desai",
    due: "Rejected 12 Jun 2026",
    stage: "Governance review",
    substage: "GTAC",
    priority: "High",
    orgPriority: "High",
    dueGroup: "Rejected",
    actionOwner: "Rohan Desai",
    needsAttention: false,
    gate: { id: "R2", status: "Rejected" },
    lifecycle: "Rejected",
    created: "2026-04-14",
    stageEntered: "2026-05-20",
    phaseEntered: { "Intake & Prioritization": "2026-04-14", "Governance & Risk": "2026-05-08" },
    gateDecided: "2026-06-12",
    closedOn: "2026-06-12",
    investmentUsd: 300_000,
    annualBenefitUsd: 0,
    funded: false,
    riskTier: "Full",
    riskLevel: "High",
    oversight: "None",
    dataExposure: ["PII in scope"],
    reviews: ["Responsible AI", "Security", "Legal"],
    businessFunction: "Support",
    capability: "Agentic",
    gateHistory: [{ id: "R1", status: "Passed", decided: "2026-04-24", approver: "Priya Rao" }],
    href: "/overview",
  },
];

// ── What the board no longer shows ──
// Records that have finished: live and running, killed at a gate, or parked. The
// tracker is a working surface, so it only carries what is in flight; leadership
// counts these too — a portfolio with no rejections and no production isn't a
// portfolio, it's a queue.
const CLOSED_BOARD_FIELDS = {
  stage: "Approved",
  dueGroup: "Funded",
  needsAttention: false,
  href: "/overview",
} as const;

export const PORTFOLIO_ARCHIVE: UseCaseCard[] = [
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-064",
    title: "Contract Metadata Extractor",
    description: "Extracts key terms and dates from executed contracts for the legal repository.",
    owner: "Elena Weber",
    due: "Funded",
    substage: "Adoption",
    priority: "Medium",
    orgPriority: "Medium",
    actionOwner: "Elena Weber",
    gate: { id: "R3", status: "Passed" },
    lifecycle: "Live",
    created: "2025-11-10",
    stageEntered: "2026-03-12",
    phaseEntered: {
      "Intake & Prioritization": "2025-11-10",
      "Governance & Risk": "2025-12-04",
      Delivery: "2026-01-08",
      "Operate & Adopt": "2026-03-12",
    },
    gateDecided: "2026-02-18",
    fundedOn: "2026-02-18",
    targetGoLive: "2026-03-15",
    liveSince: "2026-03-12",
    investmentUsd: 180_000,
    annualBenefitUsd: 240_000,
    confirmedBenefitUsd: 190_000,
    funded: true,
    riskTier: "Standard",
    riskLevel: "Low",
    oversight: "Always",
    dataExposure: ["PII in scope"],
    reviews: ["Legal", "Data privacy"],
    adoption: { training: "In place", responsibleAi: "In place", supportModel: "In place", biasMonitoring: "In progress", sopEmbedded: "In progress" },
    businessFunction: "Legal",
    capability: "Analytical",
    activeUsers: 180,
    hoursSavedPerYear: 4_200,
    kpis: [
      { name: "Clause extraction accuracy", actual: 94, target: 90, unit: "%" },
      { name: "Review time saved", actual: 38, target: 30, unit: "%" },
    ],
  },
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-071",
    title: "Warehouse Slotting Optimiser",
    description: "Recommends slotting changes to cut pick travel across the regional network.",
    owner: "Priya Rao",
    due: "Funded",
    substage: "Monitoring and tracking",
    priority: "High",
    orgPriority: "High",
    actionOwner: "Priya Rao",
    gate: { id: "R3", status: "Passed" },
    lifecycle: "Live",
    created: "2025-12-02",
    stageEntered: "2026-04-24",
    phaseEntered: {
      "Intake & Prioritization": "2025-12-02",
      "Governance & Risk": "2026-01-06",
      Delivery: "2026-02-10",
      "Operate & Adopt": "2026-04-24",
    },
    gateDecided: "2026-03-30",
    fundedOn: "2026-03-30",
    targetGoLive: "2026-04-30",
    liveSince: "2026-04-24",
    investmentUsd: 310_000,
    annualBenefitUsd: 520_000,
    confirmedBenefitUsd: 300_000,
    funded: true,
    riskTier: "Full",
    riskLevel: "Medium",
    oversight: "Always",
    dataExposure: ["GxP-impacting"],
    reviews: ["Responsible AI", "Quality & GxP"],
    adoption: { training: "In place", responsibleAi: "In place", supportModel: "In progress", biasMonitoring: "Not started", sopEmbedded: "Not started" },
    businessFunction: "Supply Chain",
    capability: "Analytical",
    activeUsers: 320,
    hoursSavedPerYear: 6_500,
    kpis: [
      { name: "Pick travel reduction", actual: 17, target: 20, unit: "%" },
      { name: "Slotting throughput", actual: 108, target: 100, unit: "pts" },
    ],
  },
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-078",
    title: "Claims Triage Assistant",
    description: "Routes incoming claims by complexity so assessors see the right work first.",
    owner: "Aarav Mehta",
    due: "Funded",
    substage: "Monitoring and tracking",
    priority: "High",
    orgPriority: "High",
    actionOwner: "Aarav Mehta",
    gate: { id: "R3", status: "Passed" },
    lifecycle: "Live",
    created: "2026-01-15",
    stageEntered: "2026-06-05",
    phaseEntered: {
      "Intake & Prioritization": "2026-01-15",
      "Governance & Risk": "2026-02-16",
      Delivery: "2026-03-24",
      "Operate & Adopt": "2026-06-05",
    },
    gateDecided: "2026-05-11",
    fundedOn: "2026-05-11",
    targetGoLive: "2026-06-01",
    liveSince: "2026-06-05",
    investmentUsd: 260_000,
    annualBenefitUsd: 430_000,
    confirmedBenefitUsd: 300_000,
    funded: true,
    riskTier: "Full",
    riskLevel: "Medium",
    oversight: "None",
    dataExposure: ["PII in scope", "21 CFR Part 11"],
    reviews: ["Responsible AI", "Security", "Data privacy"],
    adoption: { training: "In place", responsibleAi: "Not started", supportModel: "In place", biasMonitoring: "Not started", sopEmbedded: "Not started" },
    businessFunction: "Finance",
    capability: "Analytical",
    activeUsers: 460,
    hoursSavedPerYear: 9_800,
    kpis: [
      { name: "Triage accuracy", actual: 91, target: 90, unit: "%" },
      { name: "Manual touches removed", actual: 62, target: 70, unit: "%" },
    ],
  },
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-094",
    title: "Meeting Notes Summariser",
    description: "Turns support call recordings into summaries and follow-ups in the ticket.",
    owner: "Nisha Patel",
    due: "Funded",
    substage: "Adoption",
    priority: "Low",
    orgPriority: "Low",
    actionOwner: "Nisha Patel",
    gate: { id: "R3", status: "Passed" },
    lifecycle: "Live",
    created: "2026-02-20",
    stageEntered: "2026-06-26",
    phaseEntered: {
      "Intake & Prioritization": "2026-02-20",
      "Governance & Risk": "2026-03-18",
      Delivery: "2026-04-20",
      "Operate & Adopt": "2026-06-26",
    },
    gateDecided: "2026-06-02",
    fundedOn: "2026-06-02",
    targetGoLive: "2026-06-30",
    liveSince: "2026-06-26",
    investmentUsd: 95_000,
    annualBenefitUsd: 150_000,
    confirmedBenefitUsd: 140_000,
    funded: true,
    riskTier: "Lightweight",
    riskLevel: "Low",
    oversight: "None",
    adoption: { training: "In place", responsibleAi: "In place", supportModel: "In place", biasMonitoring: "In progress", sopEmbedded: "In place" },
    businessFunction: "Support",
    capability: "Generative",
    activeUsers: 1_250,
    hoursSavedPerYear: 5_400,
    kpis: [
      { name: "Summary adoption", actual: 79, target: 70, unit: "%" },
      { name: "Editing time saved", actual: 44, target: 40, unit: "%" },
    ],
  },
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-082",
    title: "Recruiting Screener",
    description: "Ranked applicants against role criteria — rejected on fairness grounds.",
    owner: "Mira Kapoor",
    due: "Rejected 20 Mar 2026",
    dueGroup: "Rejected",
    substage: "Assessment",
    priority: "Medium",
    orgPriority: "Medium",
    actionOwner: "Mira Kapoor",
    gate: { id: "R2", status: "Rejected" },
    lifecycle: "Rejected",
    created: "2025-12-18",
    stageEntered: "2026-02-24",
    phaseEntered: { "Intake & Prioritization": "2025-12-18", "Governance & Risk": "2026-02-24" },
    gateDecided: "2026-03-20",
    closedOn: "2026-03-20",
    investmentUsd: 210_000,
    annualBenefitUsd: 0,
    funded: false,
    riskTier: "Full",
    riskLevel: "High",
    oversight: "On exceptions",
    dataExposure: ["PII in scope"],
    reviews: ["Responsible AI", "Legal", "Data privacy"],
    businessFunction: "HR",
    capability: "Analytical",
  },
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-088",
    title: "Dynamic Pricing Agent",
    description: "Set prices autonomously by demand signal — declined at the board on risk appetite.",
    owner: "Daniel Cho",
    due: "Rejected 14 May 2026",
    dueGroup: "Rejected",
    substage: "GTAC",
    priority: "High",
    orgPriority: "High",
    actionOwner: "Daniel Cho",
    gate: { id: "R2", status: "Rejected" },
    lifecycle: "Rejected",
    created: "2026-01-28",
    stageEntered: "2026-04-08",
    phaseEntered: { "Intake & Prioritization": "2026-01-28", "Governance & Risk": "2026-03-02" },
    gateDecided: "2026-05-14",
    closedOn: "2026-05-14",
    investmentUsd: 275_000,
    annualBenefitUsd: 0,
    funded: false,
    riskTier: "Full",
    riskLevel: "High",
    oversight: "None",
    reviews: ["Responsible AI", "Legal"],
    businessFunction: "Marketing",
    capability: "Agentic",
  },
  {
    ...CLOSED_BOARD_FIELDS,
    id: "UC-091",
    title: "Field Service Copilot",
    description: "Guides field engineers through repairs — parked until the asset data is fit to use.",
    owner: "Rohan Desai",
    due: "12 Jul 2026",
    dueGroup: "Next week",
    substage: "Business Case",
    priority: "Medium",
    orgPriority: "Low",
    actionOwner: "Rohan Desai",
    gate: { id: "R2", status: "Blocked" },
    lifecycle: "On hold",
    created: "2026-02-06",
    stageEntered: "2026-05-11",
    phaseEntered: { "Intake & Prioritization": "2026-02-06", "Governance & Risk": "2026-04-13" },
    gateDecided: "2026-06-09",
    closedOn: "2026-06-09",
    targetGoLive: "2026-12-01",
    investmentUsd: 165_000,
    annualBenefitUsd: 250_000,
    funded: false,
    riskTier: "Standard",
    riskLevel: "Medium",
    oversight: "None",
    dataExposure: ["PII in scope"],
    reviews: ["Data privacy"],
    businessFunction: "Sales",
    capability: "Agentic",
  },
];

// What leadership counts: everything ever raised, in flight or not.
export const ALL_RECORDS: UseCaseCard[] = [...USE_CASES, ...PORTFOLIO_ARCHIVE];

// ── Six months of month-ends ──
// Authored rather than derived, because a snapshot is a record of what was true then
// and the board only knows what is true now. `reconcile()` in `src/lib/portfolio.ts`
// proves every row against the records above, so the two can't drift apart quietly.
export type PortfolioMonth = {
  key: string;
  label: string;
  // The current month, still running — drawn hatched, never compared as a full month.
  partial?: boolean;
  submitted: number;
  approved: number;
  live: number;
  closed: number;
  // Phase → records in flight at month end, keyed by a STAGE_GROUPS key.
  wip: Record<string, number>;
  // Intake to the first gate decision, in days.
  medianDaysToDecision: number;
  // Both cumulative at month end: investment committed, and the annualised benefit
  // of whatever is live by then.
  committedUsd: number;
  // Confirmed benefit of everything live at that month end — measured, not claimed. The
  // committed line above it is money out; this is money back, and they are not the same kind
  // of number even though they share an axis.
  benefitUsd: number;
};

export const PORTFOLIO_SNAPSHOTS: PortfolioMonth[] = [
  {
    key: "2026-02",
    label: "Feb",
    submitted: 2,
    approved: 1,
    live: 0,
    closed: 0,
    wip: { "Intake & Prioritization": 3, "Governance & Risk": 2, Delivery: 1, "Operate & Adopt": 1 },
    medianDaysToDecision: 24,
    committedUsd: 180_000,
    benefitUsd: 0,
  },
  {
    key: "2026-03",
    label: "Mar",
    // A month with no new ideas — the intake gap that shows up as a flat bar.
    submitted: 0,
    approved: 1,
    live: 1,
    closed: 1,
    wip: { "Intake & Prioritization": 3, "Governance & Risk": 2, Delivery: 2, "Operate & Adopt": 2 },
    medianDaysToDecision: 27,
    committedUsd: 490_000,
    benefitUsd: 190_000,
  },
  {
    key: "2026-04",
    label: "Apr",
    submitted: 2,
    approved: 2,
    live: 1,
    closed: 0,
    wip: { "Intake & Prioritization": 4, "Governance & Risk": 3, Delivery: 2, "Operate & Adopt": 2 },
    medianDaysToDecision: 22,
    committedUsd: 490_000,
    benefitUsd: 490_000,
  },
  {
    key: "2026-05",
    label: "May",
    submitted: 3,
    approved: 4,
    live: 1,
    closed: 1,
    wip: { "Intake & Prioritization": 4, "Governance & Risk": 3, Delivery: 3, "Operate & Adopt": 3 },
    medianDaysToDecision: 19,
    committedUsd: 890_000,
    benefitUsd: 640_000,
  },
  {
    key: "2026-06",
    label: "Jun",
    submitted: 4,
    approved: 6,
    live: 2,
    closed: 2,
    wip: { "Intake & Prioritization": 5, "Governance & Risk": 4, Delivery: 3, "Operate & Adopt": 2 },
    medianDaysToDecision: 16,
    committedUsd: 1_520_000,
    benefitUsd: 1_080_000,
  },
  {
    key: "2026-07",
    label: "Jul",
    partial: true,
    submitted: 2,
    approved: 1,
    live: 0,
    closed: 1,
    // This row is today's board — `reconcile()` asserts it.
    wip: { "Intake & Prioritization": 4, "Governance & Risk": 3, Delivery: 3, "Operate & Adopt": 1 },
    medianDaysToDecision: 14,
    committedUsd: 1_785_000,
    benefitUsd: 1_080_000,
  },
];

// Who is looking, and which records count as "the team's" for the scope filter.
export const CURRENT_USER = "Nisha Patel";
export const PORTFOLIO_TEAM_OWNERS = new Set(["Mira Kapoor", "Aarav Mehta", "Nisha Patel", "Rohan Desai"]);

export const scopeOptions: Array<{ key: ScopeFilter; label: string }> = [
  { key: "my", label: "My Use Cases" },
  { key: "team", label: "Team Use Cases" },
  { key: "all", label: "All Use Cases" },
];

// "Mine" means whoever is signed in, which on every surface is the profile in the
// switcher — not the default profile. Passing the person in was the fix for a filter
// that quietly kept answering as Nisha after you had switched to someone else.
export function filterUseCasesByScope(cards: UseCaseCard[], scope: ScopeFilter, person: string = CURRENT_USER) {
  if (scope === "my") return cards.filter((card) => card.owner === person || card.actionOwner === person);
  if (scope === "team") {
    return cards.filter((card) => PORTFOLIO_TEAM_OWNERS.has(card.owner) || PORTFOLIO_TEAM_OWNERS.has(card.actionOwner));
  }
  return cards;
}

// The `due` field mixes dates with lifecycle words ("Submitted", "Funded",
// "Rejected 12 Jun 2026"). The Due column shows only the date; the words belong
// to the status column, which already carries the gate and the lifecycle tag.
export const DATE_IN_DUE = /(\d{1,2} \w{3} \d{4})/;
export const dueDate = (due: string) => DATE_IN_DUE.exec(due)?.[1] ?? null;

export function getAttentionMessage(card: UseCaseCard) {
  return card.attentionTask ?? "Needs attention";
}

// Status vocabulary → the product's tones. Data, not styling: two views read these
// so a gate that is blocked is the same colour of "bad" in both. (The tracker's
// board chips keep their own class strings — they're pixel-locked to that view.)
export const GATE_STATUS_TONE: Record<GateStatus, Tone> = {
  Pending: "neutral",
  "In review": "warning",
  Passed: "success",
  Blocked: "danger",
  Rejected: "danger",
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  High: "danger",
  Medium: "warning",
  Low: "success",
};

export const RISK_TIER_TONE: Record<RiskTier, Tone> = {
  Lightweight: "success",
  Standard: "warning",
  Full: "danger",
};

export const RISK_LEVEL_TONE: Record<RiskLevel, Tone> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
};

export const LIFECYCLE_TONE: Record<Lifecycle, Tone> = {
  Active: "neutral",
  "On hold": "warning",
  Rejected: "danger",
  Live: "success",
};
