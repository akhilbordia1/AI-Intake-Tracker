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
      ["Idea name", "Protocol Digest Assistant"],
      [
        "Problem statement",
        "Medical writers spend days reading 200+ page clinical trial protocols to extract endpoints, dosing, and inclusion/exclusion criteria - slow and inconsistent.",
      ],
      ["Objective", "Reduce protocol review time and improve extraction consistency."],
      ["Business owner", "Dr. Elena Martins"],
      ["Business function", "Research & Development"],
      ["Target users", "~60 - Medical Writing, Clinical Ops, Regulatory Affairs"],
      ["Geography", "Global (US, EU, APAC)"],
      ["Data sources", "Veeva Vault RIM - finalized protocols & amendments"],
      ["Data sensitivity", "Document-level, no patient data"],
      ["AI capability", "LLM summarization + retrieval Q&A"],
      ["GxP impact", "Yes - indirectly informs regulatory documentation"],
      ["Timeline", "4-5 months"],
      ["Budget", "250K-400K USD"],
    ],
  },
  {
    name: "Qualification",
    owner: "Priya N.",
    rows: [
      ["Human oversight", "Always"],
      ["Data sensitivity", "Confidential"],
      ["Decision impact", "Influences decisions"],
      ["Duplication check", "Not a duplicate"],
    ],
  },
  {
    name: "Prioritisation",
    owner: "Marco B.",
    rows: [
      ["Business value", "4/5"],
      ["Technical feasibility", "4/5"],
      ["Complexity", "Medium"],
      ["Cost", "USD 325,000"],
      ["Strategic alignment", "5/5"],
      ["Priority score", "78/100 - High priority"],
    ],
  },
  {
    name: "Triage",
    owner: "Dana K.",
    rows: [
      ["Risk governance tier", "Full"],
      ["Compliance assessment required", "Yes"],
      ["Triage notes", "GxP relevance and regulatory-submission proximity confirmed; routed to the full assessment path rather than fast-track."],
    ],
  },
  {
    name: "Assessment - Risk & Compliance",
    owner: "Lena Osei",
    rows: [
      ["PII", "No"],
      ["Model risk", "Medium"],
      ["Ethical risk", "Low"],
      ["Data hosted risk", "Low"],
      ["Overall risk", "Medium"],
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
      ["Investment", "USD 325,000"],
      ["Payback period", "9-11 months"],
      ["3-year net value", "1.15M USD"],
    ],
  },
  {
    name: "GTAC",
    owner: "Victor H.",
    rows: [
      ["Go / No-Go", "GO"],
      ["ROI payback", "~10 months"],
      ["Overall risk", "Medium"],
      ["Recommendation", "GO - payback well under 5 years and Medium risk with a clear mitigation path."],
      ["Board notes", "Proceed contingent on CSV and Responsible AI review before build."],
    ],
  },
  {
    name: "Plan & KPI",
    owner: "Dana K.",
    rows: [
      ["Project plan", "CSV & Responsible AI review (3w) -> Build & configure (8w) -> Pilot 2 sites (4w) -> Global rollout (6w)"],
      ["KPIs", "Protocol review time -30%; Summary accuracy >=95%; Adoption >=75% of eligible users"],
      ["Targets locked", "Validation plan approved; pilot sign-off; full go-live in ~21 weeks"],
    ],
  },
  {
    name: "Solution blue print",
    owner: "Noah R.",
    rows: [
      ["Capability", "LLM summarization + retrieval-based Q&A over Veeva-sourced protocols"],
      ["Human checkpoint", "Writer review & digital sign-off before a summary is used"],
      ["Access control", "SSO via existing enterprise identity provider"],
      ["Audit trail", "All summaries and edits logged for 21 CFR Part 11 compliance"],
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
      ["Summary accuracy", "96.5% of 95% target"],
      ["Adoption rate", "68% of 75% target"],
    ],
  },
  {
    name: "Adoption",
    owner: "Marco B.",
    rows: [
      ["Training completed", "55 of 60 users"],
      ["Change management comms", "Sent to all 3 regions"],
      ["Support model", "Tier-1 helpdesk enabled"],
      ["Feedback loop", "Monthly office hours scheduled"],
    ],
  },
] satisfies StageItem[];

// Short chevron labels for the stage path (index-aligned with STAGES).
export const SHORT_STAGE_LABELS = [
  "Ideation",
  "Qualify",
  "Prioritize",
  "Triage",
  "Assess",
  "Business case",
  "GTAC",
  "Plan",
  "Design",
  "Build",
  "Monitor",
  "Adopt",
];

// The four high-level phases of the lifecycle; the tracker board condenses the
// stages inside each one, and the record's breadcrumb names the current phase.
export const STAGE_GROUPS: Record<string, string[]> = {
  "Intake & Prioritization": ["Ideation", "Qualification", "Prioritisation", "Triage"],
  "Governance & Risk": ["Assessment - Risk & Compliance", "Business Case", "GTAC"],
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
  "Assessment - Risk & Compliance": "Data, privacy and model risks reviewed, with the conditions to proceed.",
  "Business Case": "Cost, benefit, and the recommendation going to the GTAC board.",
  GTAC: "The board's funding decision and any binding conditions.",
  "Plan & KPI": "The delivery squad, the milestones, and the success metrics to lock.",
  "Solution blue print": "The architecture, the guardrails, and the integrations.",
  "Solutionise and Production": "Build evidence and readiness for review.",
  "Monitoring and tracking": "Drift, value variance, and the post-deploy review.",
  Adoption: "The rollout waves, and how uptake is going.",
};

export type Gate = {
  id: string;
  name: string;
  afterStage: string; // the gate sits at the end of this stage
  status: "Not started" | "In review" | "Passed" | "Blocked" | "Rejected";
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
    status: "Passed",
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
export const COMPLETED_STAGE_INDEXES = Array.from({ length: ACTIVE_STAGE_INDEX }, (_, index) => index);

// The row a stage reads as being *about* — its outcome, else its first answer.
export const OUTCOME_ROW = /decision|outcome|recommend|status|tier|verdict|score|priority|approv|result/i;

// Pull a single captured value out of the lifecycle data (no parallel dataset).
export function stageValue(stageName: string, label: string): string | undefined {
  return STAGES.find((stage) => stage.name === stageName)?.rows.find(([rowLabel]) => rowLabel === label)?.[1];
}

export const firstName = (name: string) => name.split(" ")[0];
