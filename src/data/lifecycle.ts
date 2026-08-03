// ── The lifecycle, in one place ──
// The 12 stages the record moves through, the assessment gates that sit between
// them, and the record's own metadata. Lifted out of the /detail record so the
// overview page reads the same data instead of carrying a parallel copy.
// `rows` are [label, value] pairs — the value is what a completed stage recorded
// (and what the mocked AI suggests while a stage is still open).

import { USE_CASE } from "@/data/document-workflow-form-schema";

export type StageItem = {
  name: string;
  owner: string;
  rows: [string, string][];
};

export const STAGES = [
  {
    name: "Ideation",
    owner: "Priya N.",
    rows: [
      ["Proposed use case name", "Protocol Digest Assistant"],
      [
        "Problem statement",
        "Medical writers spend days reading 200+ page clinical trial protocols to extract endpoints, dosing, and inclusion/exclusion criteria - slow and inconsistent.",
      ],
      ["Business objective", "Reduce protocol review time and improve extraction consistency."],
      ["Accountable business owner", "Dr. Elena Martins"],
      ["Business function or area", "Research & Development"],
      ["Target users and teams", "~60 - Medical Writing, Clinical Ops, Regulatory Affairs"],
      ["Rollout geography", "Global (US, EU, APAC)"],
      ["Data sources and systems", "Veeva Vault RIM - finalized protocols & amendments"],
      ["Data sensitivity class", "Document-level, no patient data"],
      ["AI capability and approach", "LLM summarization + retrieval Q&A"],
      ["GxP / regulated use impact", "Yes - indirectly informs regulatory documentation"],
      ["Delivery timeline", "4-5 months"],
      ["Indicative budget envelope", "250K-400K USD"],
    ],
  },
  {
    name: "Qualification",
    owner: "Priya N.",
    rows: [
      ["Human oversight level", "Always"],
      ["Data sensitivity class", "Confidential"],
      ["Decision impact level", "Influences decisions"],
      ["Duplication check result", "Not a duplicate"],
    ],
  },
  {
    name: "Prioritisation",
    owner: "Marco B.",
    rows: [
      ["Business value score", "4/5"],
      ["Technical feasibility", "4/5"],
      ["Delivery complexity", "Medium"],
      ["Estimated build cost", "USD 325,000"],
      ["Strategic alignment", "5/5"],
      ["Overall priority score", "78/100 - High priority"],
    ],
  },
  {
    name: "Triage",
    owner: "Dana K.",
    rows: [
      ["Risk governance tier", "Full"],
      ["Compliance assessment required", "Yes"],
      ["Triage rationale and notes", "GxP relevance and regulatory-submission proximity confirmed; routed to the full assessment path rather than fast-track."],
    ],
  },
  {
    name: "Assessment",
    owner: "Lena Osei",
    rows: [
      ["Personal data (PII) in scope", "No"],
      ["Model risk level", "Medium"],
      ["Ethical risk level", "Low"],
      ["Data hosting risk level", "Low"],
      ["Overall risk level", "Medium"],
      ["Compliance checks", "HIPAA; GDPR; 21 CFR Part 11; Responsible AI; Information Security; Architecture"],
    ],
  },
  {
    name: "Business Case",
    owner: "Amara J.",
    rows: [
      ["Current annual volume", "~180 protocols/year"],
      ["Current cost per review", "USD 3,200"],
      ["Projected time savings", "30%"],
      ["Projected annual savings", "USD 518,000"],
      ["Total investment required", "USD 325,000"],
      ["Payback period (months)", "9-11 months"],
      ["3-year net value (NPV)", "1.15M USD"],
    ],
  },
  {
    name: "GTAC",
    owner: "Victor H.",
    rows: [
      ["Go / No-Go board call", "GO"],
      ["ROI payback period", "~10 months"],
      ["Overall risk level", "Medium"],
      ["Board recommendation", "GO - payback well under 5 years and Medium risk with a clear mitigation path."],
      ["Board conditions to proceed", "Proceed contingent on CSV and Responsible AI review before build."],
    ],
  },
  {
    name: "Plan & KPI",
    owner: "Dana K.",
    rows: [
      ["Delivery plan and sequencing", "CSV & Responsible AI review (3w) -> Build & configure (8w) -> Pilot 2 sites (4w) -> Global rollout (6w)"],
      ["KPIs and measurement targets", "Protocol review time -30%; Summary accuracy >=95%; Adoption >=75% of eligible users"],
      ["Targets locked for delivery", "Validation plan approved; pilot sign-off; full go-live in ~21 weeks"],
    ],
  },
  {
    name: "Solution blue print",
    owner: "Noah R.",
    rows: [
      ["Solution capability", "LLM summarization + retrieval-based Q&A over Veeva-sourced protocols"],
      ["Human review checkpoint", "Writer review & digital sign-off before a summary is used"],
      ["Access control and identity", "SSO via existing enterprise identity provider"],
      ["Audit trail & retention", "All summaries and edits logged for 21 CFR Part 11 compliance"],
      ["Retraining cadence", "Quarterly performance review; retrain only on detected drift"],
    ],
  },
  {
    name: "Solutionise and Production",
    owner: "Noah R.",
    rows: [
      ["Build & configure", "Complete"],
      ["Pilot (US & EU)", "Complete"],
      ["CSV documentation", "Approved by Quality"],
      ["Production deployment", "Deployed for global rollout"],
    ],
  },
  {
    name: "Monitoring and tracking",
    owner: "Marco B.",
    rows: [
      ["Review time reduction", "27% of 30% target"],
      ["Writer satisfaction (CSAT)", "84% of 80% target"],
      ["Summary accuracy vs baseline", "96.5% of 95% target"],
      ["Adoption rate (eligible users)", "68% of 75% target"],
    ],
  },
  {
    name: "Adoption",
    owner: "Marco B.",
    rows: [
      ["Training completed", "55 of 60 users"],
      ["Change management comms", "Sent to all 3 regions"],
      ["Ongoing support model", "Tier-1 helpdesk enabled"],
      ["User feedback loop", "Monthly office hours scheduled"],
    ],
  },
] satisfies StageItem[];

// Short labels (index-aligned with STAGES), used wherever the full stage name
// would wrap: the board's stage line, the tables, and the "Proceed to …" action.
export const SHORT_STAGE_LABELS = [
  "Ideation",
  "Qualification",
  "Prioritisation",
  "Triage",
  "Risk assessment",
  "Business case",
  "GTAC",
  "Plan & KPI",
  "Blueprint",
  "Production",
  "Monitoring",
  "Adoption",
];

// The four high-level phases of the lifecycle; the tracker board condenses the
// stages inside each one, and the record's breadcrumb names the current phase.
export const STAGE_GROUPS: Record<string, string[]> = {
  "Intake & Prioritization": ["Ideation", "Qualification", "Prioritisation", "Triage"],
  "Governance & Risk": ["Assessment", "Business Case", "GTAC"],
  Delivery: ["Plan & KPI", "Solution blue print", "Solutionise and Production"],
  "Operate & Adopt": ["Monitoring and tracking", "Adoption"],
};

export const SUBSTAGE_TO_GROUP: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_GROUPS).flatMap(([group, stages]) => stages.map((stage) => [stage, group])),
);

export function phaseForStage(stageName: string) {
  return SUBSTAGE_TO_GROUP[stageName] ?? "Lifecycle";
}

// One-line explainer per stage — the form panel's stage description and the
// chat's opening line both read from this.
export const STAGE_INTROS: Record<string, string> = {
  Ideation: "The core idea — the problem, the outcome you want, and who it's for.",
  Qualification: "A quick scan for prohibited uses, ending in a provisional risk tier.",
  Prioritisation: "Value weighed against readiness, to decide whether this moves now.",
  Triage: "Any flags resolved, and the use case routed onto the right assessment path.",
  Assessment: "Data, privacy and model risks reviewed, with the conditions to proceed.",
  "Business Case": "Cost, benefit, and the recommendation going to the GTAC board.",
  GTAC: "The board's funding decision and any binding conditions.",
  "Plan & KPI": "The delivery squad, the milestones, and the success metrics to lock.",
  "Solution blue print": "The architecture, the guardrails, and the integrations.",
  "Solutionise and Production": "Build evidence and readiness for review.",
  "Monitoring and tracking": "Drift, value variance, and the post-deploy review.",
  Adoption: "The rollout waves, and how uptake is going.",
};

// ── What each field means ──
// Shown in place of a value while a field is still empty: a label says what is
// being asked, this says what counts as an answer. Keyed by label, so fields that
// recur across stages ("Overall risk level") share one definition. Keep them to a
// line and specific to the field — a generic restatement of the label reads as
// filler, which is exactly what the blank row was.
export const FIELD_GISTS: Record<string, string> = {
  // Ideation
  "Proposed use case name": "A short working name people will recognise it by",
  "Problem statement": "The work being done today, and why it's slow or inconsistent",
  "Business objective": "The outcome that makes this worth funding",
  "Accountable business owner": "The person answerable for the outcome, not the build",
  "Business function or area": "The function that owns the process this touches",
  "Target users and teams": "Who uses it, and roughly how many",
  "Rollout geography": "Regions in scope — this drives data-residency review",
  "Data sources and systems": "Systems it reads from, named",
  "Data sensitivity class": "The most sensitive data it touches, at its class",
  "AI capability and approach": "The technique — summarisation, retrieval, classification, agentic",
  "GxP / regulated use impact": "Whether output reaches regulated or submitted documentation",
  "Delivery timeline": "When it's needed by, and what fixes that date",
  "Indicative budget envelope": "A range, before the business case sharpens it",

  // Qualification
  "Human oversight level": "How often a person checks output before it's used",
  "Decision impact level": "Whether output informs, influences or makes the decision",
  "Duplication check result": "Whether something in the registry already does this",

  // Prioritisation
  "Business value score": "Size of the benefit, scored against the portfolio",
  "Technical feasibility": "How ready the data, platform and skills are",
  "Delivery complexity": "Integrations, change effort and moving parts",
  "Estimated build cost": "Build and first-year run, before the full case",
  "Strategic alignment": "Fit with the stated strategic priorities",
  "Overall priority score": "The composite that sequences this against the rest",

  // Triage
  "Risk governance tier": "Light, standard or full — sets the assessment path",
  "Compliance assessment required": "Whether compliance must review before build",
  "Triage rationale and notes": "Why this tier, in the words of whoever set it",

  // Assessment
  "Personal data (PII) in scope": "Whether identifiable personal data reaches the model",
  "Model risk level": "Consequence of the model being wrong or drifting",
  "Ethical risk level": "Fairness, transparency and misuse exposure",
  "Data hosting risk level": "Where data sits and who can reach it",
  "Overall risk level": "The rating that decides which controls apply",
  "Compliance checks": "The reviews this use case has to clear",

  // Business case
  "Current annual volume": "How much of this work happens today, per year",
  "Current cost per review": "What one unit of the work costs now",
  "Projected time savings": "Time saved per unit, as a percentage",
  "Projected annual savings": "Benefit per year once it's live",
  "Total investment required": "Build, licences and run, together",
  "Payback period (months)": "How long until benefit covers investment",
  "3-year net value (NPV)": "Net value over three years, discounted",

  // GTAC
  "Go / No-Go board call": "The board's decision on funding this",
  "ROI payback period": "Payback the board is signing up to",
  "Board recommendation": "What the board concluded, and on what grounds",
  "Board conditions to proceed": "What must be true before build starts",

  // Plan & KPI
  "Delivery plan and sequencing": "The phases in order, with how long each takes",
  "KPIs and measurement targets": "The metrics judged at go-live, with target numbers",
  "Targets locked for delivery": "The approvals and sign-offs the plan commits to",

  // Solution blueprint
  "Solution capability": "What the solution does, in architecture terms",
  "Human review checkpoint": "Where a person sits in the flow, and what they sign",
  "Access control and identity": "How access is granted and proven",
  "Audit trail & retention": "What is logged, and for how long",
  "Retraining cadence": "When the model is reviewed and retrained",

  // Solutionise and production
  "Build & configure": "State of the build against the plan",
  "Pilot (US & EU)": "Pilot outcome in the regions it ran in",
  "CSV documentation": "Validation evidence and who approved it",
  "Production deployment": "What is live, and where",

  // Monitoring
  "Review time reduction": "Actual time saved, against target",
  "Writer satisfaction (CSAT)": "Measured satisfaction, against target",
  "Summary accuracy vs baseline": "Accuracy against the pre-AI baseline",
  "Adoption rate (eligible users)": "Share of eligible users actually using it",

  // Adoption
  "Training completed": "Users trained, out of those who need it",
  "Change management comms": "What has gone out, to whom",
  "Ongoing support model": "Who supports it once the project closes",
  "User feedback loop": "How feedback is collected and acted on",
};

export type Gate = {
  id: string;
  name: string;
  afterStage: string; // the gate sits at the end of this stage
  status: "Not started" | "In review" | "Passed" | "Blocked" | "Rejected" | "Waived";
  approver: string; // distinct from the stage owner (the preparer)
  decided: string | null;
  artifacts: string[];
  conditions: string[];
};

// Assessment gates are first-class checkpoints, tracked separately from stage
// progress — each carries its own status, approver, decision, and evidence.
export const GATES: Gate[] = [
  {
    id: "R1",
    name: "Screening gate",
    afterStage: "Triage",
    status: "Passed",
    approver: "Priya N.",
    decided: "Jun 22, 2026",
    artifacts: ["Screening record", "Prohibited-use scan"],
    conditions: [],
  },
  {
    id: "R2",
    name: "Governance & investment",
    afterStage: "GTAC",
    // Waived with the stage it sits after: no board review, no board decision.
    status: "Waived",
    approver: "Victor H.",
    decided: "Jun 28, 2026",
    artifacts: ["Business case", "GTAC minutes", "Risk register"],
    conditions: ["PII redaction verified before deploy", "Multi-currency re-tested at R4"],
  },
  {
    id: "R3",
    name: "Build review",
    afterStage: "Solutionise and Production",
    status: "In review",
    approver: "Noah R.",
    decided: null,
    artifacts: ["Eval report v3", "Red-team log"],
    conditions: [],
  },
  {
    id: "R5",
    name: "Post-deploy review",
    afterStage: "Monitoring and tracking",
    status: "Not started",
    approver: "Marco B.",
    decided: null,
    artifacts: [],
    conditions: [],
  },
];

export function gateForStage(stageName: string) {
  return GATES.find((gate) => gate.afterStage === stageName);
}

export const GATE_TONE: Record<Gate["status"], { fg: string; bg: string; border: string }> = {
  "Not started": { fg: "var(--text-muted)", bg: "var(--surface-muted)", border: "var(--border-default)" },
  Waived: { fg: "var(--text-muted)", bg: "var(--surface-muted)", border: "var(--border-default)" },
  "In review": { fg: "#a15c11", bg: "#f6f0e6", border: "#e6d4b8" },
  Passed: { fg: "#15803d", bg: "#eef4ee", border: "#bfdcc7" },
  Blocked: { fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" },
  Rejected: { fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" },
};

// Record-level metadata — shown in the Details sheet on /detail and as the key
// dates on the overview.
// The record's history — newest first. Read by the record's Activity tab, the
// stage header's "updated" stamp, and the overview.
export const RECORD_ACTIVITY: { icon: "moved" | "approved" | "updated" | "recorded"; title: string; when: string }[] = [
  { icon: "moved", title: "Noah R. moved stage to Solutionise & Production", when: "Jul 6, 2026, 09:18" },
  { icon: "approved", title: "Lena Osei approved risk & compliance sign-off", when: "Jul 5, 2026, 16:24" },
  { icon: "updated", title: "Amara J. updated the business case", when: "Jul 3, 2026, 11:05" },
  { icon: "recorded", title: "Victor H. recorded GTAC approval", when: "Jun 28, 2026, 14:30" },
];

export const RECORD_DETAILS: [string, string][] = [
  ["Use case ID", USE_CASE.id],
  ["Created by", "Mira Kapoor"],
  ["Created on", "Jun 18, 2026"],
  ["Department", "Support"],
  ["Function", "Customer Experience"],
  ["Team", "Tier-1 Operations"],
  ["Country", "Global / multi-country"],
  ["Business sponsor", "Nora Singh"],
  ["Target go-live", "Jun 15, 2026"],
  ["Model archetype", "Agent"],
];

// Where the record sits today. Consistent with the gate decisions above (R1 and
// R2 passed, R3 in review) and the newest entry in the activity log — so the
// overview and the deep links into /detail agree on what's done.
export const ACTIVE_STAGE_INDEX = STAGES.findIndex((stage) => stage.name === "Solutionise and Production");

// ── Skipped stages ──
// Not every use case walks all twelve. A GTAC board review is waived when the
// investment sits under the board's threshold, so the stage is neither done nor
// waiting — it is out of this record's path, with a reason and whose call it was.
// A skipped stage keeps its place in the numbering (stage 7 is still stage 7) but
// leaves the denominator: progress is measured against the path a record walks.
export type StageSkip = { reason: string; by: string; when: string };

// Which stages may be skipped at all. Everything else is mandatory, so the
// control never appears on a stage that can't be waived.
export const SKIPPABLE_STAGES = new Set(["GTAC"]);

// What this record actually did: the board review was waived, so GTAC is skipped
// rather than complete. This is the record's history — the live flow in /detail
// doesn't pre-apply it, because walking to GTAC is where the decision gets made.
export const SKIPPED_STAGES: Record<string, StageSkip> = {
  GTAC: {
    reason: "Investment under the 500K board threshold — sponsor approved it instead of the board.",
    by: "Victor H.",
    when: "Jun 28, 2026",
  },
};

export const SKIPPED_STAGE_INDEXES = STAGES.flatMap((stage, index) => (SKIPPED_STAGES[stage.name] ? [index] : []));

export const COMPLETED_STAGE_INDEXES = Array.from({ length: ACTIVE_STAGE_INDEX }, (_, index) => index).filter(
  (index) => !SKIPPED_STAGE_INDEXES.includes(index),
);

// How many stages this record actually has to walk, and where a stage sits in
// that walk — both exclude the skipped ones, so "8 of 11" never counts a stage
// nobody will ever open.
export const PATH_STAGE_COUNT = STAGES.length - SKIPPED_STAGE_INDEXES.length;

export function pathPosition(index: number, skipped: number[] = SKIPPED_STAGE_INDEXES) {
  return index + 1 - skipped.filter((skippedIndex) => skippedIndex < index).length;
}

export type StageState = "complete" | "active" | "skipped" | "upcoming";

export function stageStateAt(
  index: number,
  {
    active = ACTIVE_STAGE_INDEX,
    completed = COMPLETED_STAGE_INDEXES,
    skipped = SKIPPED_STAGE_INDEXES,
  }: { active?: number; completed?: number[]; skipped?: number[] } = {},
): StageState {
  if (skipped.includes(index)) return "skipped";
  if (completed.includes(index)) return "complete";
  return index === active ? "active" : "upcoming";
}

// The next stage a record moves to — over any skipped one, so submitting Business
// case lands on Plan & KPI rather than on a stage that was waived.
export function nextStageIndex(from: number, skipped: number[] = SKIPPED_STAGE_INDEXES) {
  let next = from + 1;
  while (next < STAGES.length && skipped.includes(next)) next += 1;
  return next < STAGES.length ? next : null;
}

// The row a stage reads as being *about* — its outcome, else its first answer.
export const OUTCOME_ROW = /decision|outcome|recommend|status|tier|verdict|score|priority|approv|result/i;

// Pull a single captured value out of the lifecycle data (no parallel dataset).
export function stageValue(stageName: string, label: string): string | undefined {
  return STAGES.find((stage) => stage.name === stageName)?.rows.find(([rowLabel]) => rowLabel === label)?.[1];
}

export const firstName = (name: string) => name.split(" ")[0];
