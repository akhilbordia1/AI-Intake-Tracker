"use client";

import { INITIAL_WORKFLOW_VALUES, USE_CASE, type FieldValue } from "@/data/document-workflow-form-schema";
import { cn } from "@/lib/cn";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, Lock, MoreHorizontal, RefreshCcw, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactElement } from "react";

import { PersonAvatar, ProfileSwitcher, initials } from "@/components/profile";

import {
  ChipMultiSelect,
  CompletionMeter,
  SaveStatus,
  Segmented,
  SmartText,
  SmartTextarea,
  useSaveStatus,
} from "@/components/forms/fields";

const RECORD_THEME = {
  "--accent": "#0e7090",
  "--accent-strong": "#0c5f7a",
  "--accent-soft": "#e8f4f8",
  "--accent-border": "#c5e2ea",
  "--accent-ring": "#8fc0cf",
  "--accent-hover-bg": "#f4fafb",
  "--stage-past": "#249a57",
  "--stage-past-hover": "#1f7a46",
  "--stage-past-active": "#166f3f",
  "--stage-past-active-hover": "#125b34",
  "--stage-active": "#1f2937",
  "--stage-active-hover": "#111827",
  "--stage-future": "#ecebea",
  "--stage-future-hover": "#e3e1df",
  "--stage-future-text": "#3f3f46",
  "--stage-action": "#249a57",
  "--stage-action-hover": "#1f7a46",
} as CSSProperties;

const values = INITIAL_WORKFLOW_VALUES;

type StageItem = {
  name: string;
  owner: string;
  rows: [string, string][];
};

const STAGES = [
  {
    name: "Intake",
    owner: "Priya N.",
    rows: [
      ["Business problem", "Finance spends ~30 hrs/week manually reading and routing supplier invoices, creating backlog and late-payment penalties."],
      ["Desired outcome", "Cut invoice triage time by 60% while holding error rate flat."],
      ["Expected value", "GBP 420k/yr - cost saving"],
      ["Sponsor", "R. Shah"],
      ["Function", "Finance"],
      ["Countries", "United Kingdom, Germany"],
      ["Affected users", "Internal 100+"],
      ["Model archetype", "RAG"],
      ["Data sources", "ERP invoice tables, Supplier master"],
      ["PII", "Unsure"],
      ["Autonomy", "Suggests to human"],
    ],
  },
  {
    name: "Screening",
    owner: "Priya N.",
    rows: [
      ["Prohibited scan", "Emotion recognition - flagged for CoE review"],
      ["Decision impact", "Influences decisions"],
      ["Regulatory exposure", "GDPR/PII"],
      ["Data sensitivity", "Confidential"],
      ["Reversibility", "Reversible with effort"],
      ["Human oversight", "Always"],
      ["Viability", "Proven pattern"],
      ["Provisional tier", "Standard"],
    ],
  },
  {
    name: "Prioritize",
    owner: "Marco B.",
    rows: [
      ["Decision", "Prioritize now"],
      ["Value to function", "4/5"],
      ["Readiness", "3/5"],
      ["Strategic alignment", "Core priority"],
      ["Rationale", "Strong fit against Finance's automation priorities this cycle - clear cost saving on a proven RAG pattern, low delivery risk, sponsor engaged, and a slot open."],
    ],
  },
  {
    name: "Triage",
    owner: "Dana K.",
    rows: [
      ["Flag resolution", "Cleared - sentiment reading was on invoice comment fields, not staff; not emotion recognition of workers."],
      ["Governance tier", "Standard"],
      ["Assessment scope", "Data privacy, Model risk"],
      ["Assessor", "Lena Osei"],
      ["Triage notes", "Flag cleared and routed into a standard governed assessment path."],
    ],
  },
  {
    name: "Assess",
    owner: "Lena Osei",
    rows: [
      ["PII", "Present - contact data"],
      ["Lawful basis", "Legitimate interest"],
      ["DPIA required", "Yes"],
      ["Hallucination risk", "Medium"],
      ["Grounding controls", "Citations required, Retrieval-only answers, Human escalation path"],
      ["Risk register", "3 rows confirmed"],
      ["Outcome", "Proceed with conditions"],
      ["Conditions", "PII redaction at ingest verified before deployment; Multi-currency accuracy re-tested at R4"],
    ],
  },
  {
    name: "Business case",
    owner: "Amara J.",
    rows: [
      ["Build cost", "GBP 180k"],
      ["Run cost", "GBP 45k/yr"],
      ["Benefit", "GBP 420k/yr - locked"],
      ["Delivery model", "In-house squad"],
      ["GTAC recommendation", "Recommend with conditions"],
      ["Exec summary", "Falcon automates supplier-invoice triage for Finance using a retrieval-grounded assistant. Locked benefit of GBP 420k/yr against GBP 180k build; payback 7 months. R2 recommends proceeding with two binding conditions."],
    ],
  },
  {
    name: "GTAC",
    owner: "Victor H.",
    rows: [
      ["Board decision", "Approve with conditions"],
      ["Funding", "GBP 180k released"],
      ["Conditions", "Both acknowledged - bind delivery"],
      ["Board notes", "Proceed with the R2 conditions attached to delivery controls."],
    ],
  },
  {
    name: "Plan",
    owner: "Dana K.",
    rows: [
      ["Squad", "Noah R., Sofia M., Ada L."],
      ["Milestones", "Design complete 15 Jul; Build & eval 30 Aug; Pre-deploy review (R4) 12 Sep; Go-live 30 Sep"],
      ["Locked metrics", "Invoice triage time -60%; Auto-routing accuracy >=95%; AP-team adoption >=80% by go-live +60d"],
    ],
  },
  {
    name: "Design",
    owner: "Noah R.",
    rows: [
      ["Architecture", "RAG with managed vector store"],
      ["Pipeline", "Ingest -> Chunk -> Embed -> Retrieve -> Generate -> Cite"],
      ["Guardrails", "Citations required, Retrieval-only answers, Human escalation path, PII redaction at ingest, Prompt-injection filter"],
      ["Integrations", "ERP webhook, Email ingest"],
      ["Design sign-off", "Committed - satisfies all R2 conditions"],
    ],
  },
  {
    name: "Build",
    owner: "Noah R.",
    rows: [
      ["R3 review", "Multi-currency accepted as known limitation"],
      ["Evidence", "Eval report v3, Red-team log"],
      ["Ready for R4", "Committed"],
    ],
  },
  {
    name: "Deploy",
    owner: "Lena Osei",
    rows: [
      ["Guardrails verified", "5 / 5"],
      ["Rollout", "Canary - 10% of AP team, 2 weeks"],
      ["Rollback", "Feature-flag kill switch; routing reverts to manual queue within 15 minutes; retained for 90 days."],
      ["Decision", "GO"],
      ["Deploy date", "30 Sep 2026"],
    ],
  },
  {
    name: "Adopt",
    owner: "Marco B.",
    rows: [
      ["Wave 2", "EMEA AP - 15 Oct"],
      ["Interventions", "Weekly office hours, In-tool tips"],
      ["Adoption risk", "Needs push"],
    ],
  },
  {
    name: "Monitor",
    owner: "Marco B.",
    rows: [
      ["R5 review", "3 rows resolved"],
      ["Drift", "Re-index scheduled"],
      ["Variance", "Value tracking at 74% of locked target, driven by the slower EMEA wave; the multi-currency limitation accounts for ~GBP 38k of the gap."],
      ["Verdict", "Watch"],
    ],
  },
  {
    name: "Improve",
    owner: "Priya N.",
    rows: [
      ["Outcome", "Opportunity delivered below the full locked target but remains positive with a clear improvement path."],
      ["Improvements", "Spawn Falcon-2 for procurement invoice triage; re-index retrieval corpus; tighten multi-currency eval coverage"],
      ["Falcon-2", "Spawned"],
    ],
  },
] satisfies StageItem[];

// Hybrid: most stages use the generic editable form; a few high-value stages
// get bespoke widgets ported from the reference (squad picker, milestone rail,
// lockable success metrics). Keyed by stage name.
const BESPOKE_STAGE_FORMS: Record<string, () => ReactElement> = {
  Plan: () => <PlanStageForm />,
};

const DETAIL_ITEMS = [
  ["Use case ID", USE_CASE.id],
  ["Created by", "Mira Kapoor"],
  ["Created on", "Jun 18, 2026"],
  ["Department", text(values.department)],
  ["Function", text(values.functionArea)],
  ["Team", text(values.team)],
  ["Country", text(values.country)],
  ["Business sponsor", text(values.businessSponsor)],
  ["Target go-live", text(values.goLiveDate)],
  ["Model archetype", text(values.modelArchetype)],
];

const COMMENT_ITEMS = [
  {
    author: "Rohan Desai",
    date: "Today, 10:42",
    body: "Keep the pilot cohort limited to EU support until the monitoring export is reviewed.",
  },
  {
    author: "Nora Singh",
    date: "Yesterday",
    body: "GTAC conditions are satisfied once the rollback evidence is attached.",
  },
  {
    author: "Dr. Anja Bauer",
    date: "Jul 3",
    body: "No new risk flags from the latest validation sample.",
  },
];

const ACTIVITY_ITEMS = [
  {
    icon: CheckCircle2,
    title: "Tomas Ortiz moved stage to Delivery",
    time: "Jul 6, 2026, 09:18",
  },
  {
    icon: ShieldCheck,
    title: "Security Review approved sign-off",
    time: "Jul 5, 2026, 16:24",
  },
  {
    icon: RefreshCcw,
    title: "Rohan Desai updated rollback plan",
    time: "Jul 3, 2026, 11:05",
  },
  {
    icon: FileCheck2,
    title: "Nora Singh recorded GTAC approval",
    time: "Jun 28, 2026, 14:30",
  },
];

const defaultStageIndex = STAGES.findIndex((stage) => stage.name === "Assess");

export function DetailRecordPage() {
  const [stageIndex, setStageIndex] = useState(defaultStageIndex);
  const [completedStageIndexes, setCompletedStageIndexes] = useState<number[]>([0, 1, 2, 3]);
  const [currentUser, setCurrentUser] = useState("Lena Osei");
  const currentStage = STAGES[stageIndex] ?? STAGES[0];
  const isCurrentComplete = completedStageIndexes.includes(stageIndex);

  function selectStage(index: number) {
    setStageIndex(index);
  }

  // Toggle: completes the stage (and advances), or marks it incomplete again
  // when you go back to a done stage.
  function toggleCurrentStageComplete() {
    const wasComplete = completedStageIndexes.includes(stageIndex);
    setCompletedStageIndexes((indexes) =>
      wasComplete ? indexes.filter((index) => index !== stageIndex) : [...indexes, stageIndex],
    );
    if (!wasComplete && stageIndex < STAGES.length - 1) selectStage(stageIndex + 1);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-white text-[var(--text-primary)]" style={RECORD_THEME}>
      <RecordHeader currentUser={currentUser} onUserChange={setCurrentUser} />
      <StagePath
        activeIndex={stageIndex}
        completedIndexes={completedStageIndexes}
        isCurrentComplete={isCurrentComplete}
        onMarkComplete={toggleCurrentStageComplete}
        onStageChange={selectStage}
      />
      <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-4 bg-[var(--surface-muted)] px-5 pb-5 pt-4" aria-label="Use case content">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#ecebea] bg-white shadow-[0_1px_3px_rgba(12,10,9,0.04)]">
          <StageWorkspace stage={currentStage} currentUser={currentUser} isComplete={isCurrentComplete} />
        </div>
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#ecebea] bg-white shadow-[0_1px_3px_rgba(12,10,9,0.04)]" aria-label="Supporting details">
          <SupportingTabs />
        </aside>
      </section>
    </main>
  );
}

function StageColumnHeader({ stage, currentUser }: { stage: StageItem; currentUser: string }) {
  const ownedByMe = stage.owner === currentUser;

  return (
    <div className="flex h-12 min-w-0 shrink-0 items-center justify-between gap-4 border-b border-[#ecebea] px-7" aria-label={`${stage.name} stage header`}>
      <h2 className="min-w-0 truncate text-[17px] font-medium leading-6 text-[var(--text-primary)]">{stage.name}</h2>
      <div className="flex shrink-0 items-center gap-2 text-[13px] leading-5">
        <span className="text-[var(--text-label)]">Stage Owner</span>
        <PersonAvatar name={stage.owner} size={22} highlight={ownedByMe} />
        <span className="text-[var(--text-primary)]">{stage.owner}</span>
        {ownedByMe ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">You</span>
        ) : null}
      </div>
    </div>
  );
}

const SUPPORTING_TABS = [
  { key: "Details", meta: undefined, render: () => <DetailPanel /> },
  { key: "Comments", meta: String(COMMENT_ITEMS.length), render: () => <CommentsPanel /> },
  { key: "Activity", meta: String(ACTIVITY_ITEMS.length), render: () => <ActivityPanel /> },
] as const;

function SupportingTabs() {
  const [active, setActive] = useState<(typeof SUPPORTING_TABS)[number]["key"]>("Details");
  const current = SUPPORTING_TABS.find((tab) => tab.key === active) ?? SUPPORTING_TABS[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#ecebea] px-5">
        <div className="flex items-center gap-5" role="tablist" aria-label="Supporting details">
          {SUPPORTING_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={tab.key === active}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex h-12 items-center gap-1.5 border-b-2 px-0.5 text-[14px] font-medium transition focus-visible:outline-none",
                tab.key === active
                  ? "border-[var(--accent)] text-[var(--accent-strong)]"
                  : "border-transparent text-[var(--text-label)] hover:text-[var(--text-primary)]",
              )}
            >
              {tab.key}
              {tab.meta ? <span className="text-[12px] font-normal text-[var(--text-muted)]">{tab.meta}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{current.render()}</div>
    </div>
  );
}

function StageContent({ isComplete, stage }: { isComplete: boolean; stage: StageItem }) {
  const bespoke = !isComplete ? BESPOKE_STAGE_FORMS[stage.name] : undefined;

  return (
    <section className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto pb-6 pt-4" aria-label={`${stage.name} stage content`}>
      {isComplete ? <StageReadOnlyRows rows={stage.rows} /> : bespoke ? bespoke() : null}
    </section>
  );
}

// Editable stages own their identity + toolbar; complete / bespoke stages use
// the plain header + content pair.
function StageWorkspace({
  stage,
  currentUser,
  isComplete,
}: {
  stage: StageItem;
  currentUser: string;
  isComplete: boolean;
}) {
  const useEditable = !isComplete && !BESPOKE_STAGE_FORMS[stage.name];

  if (useEditable) {
    return <EditableStage key={stage.name} stage={stage} currentUser={currentUser} />;
  }

  return (
    <>
      <StageColumnHeader stage={stage} currentUser={currentUser} />
      <StageContent isComplete={isComplete} stage={stage} />
    </>
  );
}

function StageReadOnlyRows({ rows }: { rows: StageItem["rows"] }) {
  return (
    <dl className="divide-y divide-[#f0efed] border-b border-[#f0efed]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[190px_minmax(0,1fr)] gap-7 px-7 py-4">
          <dt className="text-[14px] font-normal leading-5 text-[var(--text-label)]">{label}</dt>
          <dd className="min-w-0 text-[15px] font-normal leading-6 text-[var(--text-primary)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type FieldKind = "segmented" | "chips" | "long" | "text";

type FieldSpec = {
  label: string;
  kind: FieldKind;
  options?: string[];
  suggestion: string | string[];
};

const LONG_LABELS = new Set([
  "Rationale",
  "Exec summary",
  "Rollback",
  "Variance",
  "Improvements",
  "Business problem",
  "Desired outcome",
  "Conditions",
  "Triage notes",
  "Board notes",
  "Assessment scope",
]);

function buildFieldSpec(label: string, value: string): FieldSpec {
  const options = choiceOptions(label, value);
  if (options) return { label, kind: "segmented", options, suggestion: value };

  const items = listItems(value);
  if (isChecklistField(label) && items.length > 1) {
    return { label, kind: "chips", options: items, suggestion: items };
  }

  if (value.length > 96 || LONG_LABELS.has(label)) return { label, kind: "long", suggestion: value };
  return { label, kind: "text", suggestion: value };
}

function isFilled(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value && value.trim());
}

// Live governance tier, recomputed from the Assess answers as the user fills them.
function computeRiskTier(values: Record<string, string | string[]>) {
  const risk = String(values["Hallucination risk"] ?? "");
  const dpia = String(values["DPIA required"] ?? "");

  if (risk === "High" || dpia === "Yes") return { tier: "Full", fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" };
  if (risk === "Medium") return { tier: "Standard", fg: "#a15c11", bg: "#f6f0e6", border: "#e6d4b8" };
  if (risk === "Low") return { tier: "Light", fg: "#15803d", bg: "#eef4ee", border: "#bfdcc7" };
  return null;
}

// Per-stage "read this first" guidance, ported from the reference prototype.
const STAGE_GUIDANCE: Record<string, string> = {
  Intake:
    "A strong idea names one painful problem and one measurable outcome. Don't solve it yet — pitch it. We'll draft the rest from your one-liner.",
  Screening:
    "These answers set your governance tier. We drafted the factual ones from your intake — confirm or correct them. The judgment calls are yours; the AI won't make them for you.",
  Prioritize:
    "Read the pack, score it against your function's portfolio, and make one call. Your rationale travels with the record to Triage.",
  Triage:
    "You're setting the governance depth for this use case. The suggested tier is computed from the R1 profile — accept it or override with a reason. Your call here shapes every stage that follows.",
  Assess:
    "Your workspace shows only the modules Triage scoped. Findings are pre-drafted from the record — your job is professional confirmation, correction, and conditions.",
  "Business case":
    "The case is assembled from the record. Confirm the numbers, lock the benefit — it will be reported against for the life of this use case — and make your recommendation.",
  GTAC:
    "Everything the board needs is on this page. Record the outcome, the funding, and acknowledge each condition explicitly — conditions become binding on delivery.",
  Plan: "You're converting an approval into commitments. Metrics you lock here are what Monitoring will hold this use case to.",
  Design:
    "Your constraints are already on the page — the R2 conditions and grounding controls are non-negotiable. Compose the blueprint around them.",
  Build:
    "The eval board reports against the metrics locked at Planning. Anything amber must be explicitly accepted or blocked — silence is not an option.",
  Deploy: "Nothing ships until every guardrail from Design is verified in the build. Then — one call.",
  Adopt: "Live adoption against the target locked at Planning. Your job: waves, interventions, and an honest risk read.",
  Monitor: "Every locked target you've seen since Intake lands here. Report honestly — variance with a narrative beats green theater.",
  Improve: "This is the idea you pitched. Here's what it delivered. Decide what it becomes next.",
};

function StageGuidance({
  fields,
  values,
  guidance,
}: {
  fields: FieldSpec[];
  values: Record<string, string | string[]>;
  guidance?: string;
}) {
  const keyFields = fields.slice(0, 4);

  return (
    <div className="mb-6 grid gap-x-10 gap-y-4 rounded-[10px] border border-[#ecebea] bg-[var(--surface-muted)] px-5 py-4 md:grid-cols-[200px_minmax(0,1fr)]">
      <div>
        <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Key fields</div>
        <ul className="space-y-2">
          {keyFields.map((field) => {
            const done = isFilled(values[field.label]);
            return (
              <li key={field.label} className="flex items-center gap-2.5 text-[12.5px]">
                <span
                  className={cn(
                    "grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full text-white",
                    done ? "bg-[#15803d]" : "border-[1.5px] border-[#d6d3d1]",
                  )}
                >
                  {done ? <Check size={9} strokeWidth={4} /> : null}
                </span>
                <span className={done ? "text-[var(--text-body)]" : "text-[var(--text-muted)]"}>{field.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {guidance ? (
        <div className="max-w-[560px]">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Guidance for success</div>
          <p className="font-display text-[15px] leading-[1.55] text-[var(--text-body)]">{guidance}</p>
        </div>
      ) : null}
    </div>
  );
}

// Editable generic stage: identity + toolbar (suggest / save / progress) merged
// into a single header bar, then the label-left field rows below.
function EditableStage({ stage, currentUser }: { stage: StageItem; currentUser: string }) {
  const fields = useMemo(() => stage.rows.map(([label, value]) => buildFieldSpec(label, value)), [stage]);
  const [values, setValues] = useState<Record<string, string | string[]>>(() =>
    Object.fromEntries(fields.map((field) => [field.label, field.kind === "chips" ? [] : ""])),
  );
  const saveState = useSaveStatus(JSON.stringify(values));

  const doneCount = fields.filter((field) => isFilled(values[field.label])).length;
  const riskTier = stage.name === "Assess" ? computeRiskTier(values) : null;
  const ownedByMe = stage.owner === currentUser;

  function setField(label: string, value: string | string[]) {
    setValues((current) => ({ ...current, [label]: value }));
  }

  function suggestAll() {
    setValues(Object.fromEntries(fields.map((field) => [field.label, field.suggestion])));
  }

  return (
    <>
      <div className="flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#ecebea] px-7 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="truncate text-[16px] font-medium leading-6 text-[var(--text-primary)]">{stage.name}</h2>
          <span className="h-3.5 w-px bg-[#e7e5e4]" aria-hidden />
          <PersonAvatar name={stage.owner} size={20} highlight={ownedByMe} />
          <span className="truncate text-[12px] text-[var(--text-label)]">{stage.owner}</span>
          {ownedByMe ? (
            <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">You</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {riskTier ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: riskTier.fg, background: riskTier.bg, borderColor: riskTier.border }}
            >
              <ShieldCheck size={11} />
              {riskTier.tier} tier
            </span>
          ) : null}
          <button
            type="button"
            onClick={suggestAll}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 text-[12px] font-medium text-[var(--accent-strong)] transition hover:bg-[#daedf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <Sparkles size={12} />
            Suggest all
          </button>
          <SaveStatus state={saveState} />
          <CompletionMeter done={doneCount} total={fields.length} className="w-[150px]" />
        </div>
      </div>

      <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-6 pt-4" aria-label={`${stage.name} stage form`}>
        <div className="px-7">
          <StageGuidance fields={fields} values={values} guidance={STAGE_GUIDANCE[stage.name]} />
        </div>
        <div className="pt-1">
          {fields.map((field) => (
            <div key={field.label} className="grid grid-cols-[176px_minmax(0,1fr)] gap-6 px-7 py-3">
              <label className="pt-2 text-[12px] font-medium leading-5 text-[var(--text-label)]">{field.label}</label>
              <div className="min-w-0">
                <StageField
                  spec={field}
                  value={values[field.label]}
                  onChange={(value) => setField(field.label, value)}
                  onSuggest={() => setField(field.label, field.suggestion)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function StageField({
  spec,
  value,
  onChange,
  onSuggest,
}: {
  spec: FieldSpec;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  onSuggest: () => void;
}) {
  if (spec.kind === "segmented") {
    return (
      <Segmented
        hideHeader
        label={spec.label}
        options={spec.options ?? []}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    );
  }

  if (spec.kind === "chips") {
    return (
      <ChipMultiSelect
        hideHeader
        label={spec.label}
        options={spec.options ?? []}
        values={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    );
  }

  if (spec.kind === "long") {
    return (
      <SmartTextarea
        hideHeader
        label={spec.label}
        maxLength={600}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        onSuggest={onSuggest}
      />
    );
  }

  return (
    <SmartText
      hideHeader
      label={spec.label}
      value={typeof value === "string" ? value : ""}
      onChange={onChange}
      onSuggest={onSuggest}
    />
  );
}

// ── Bespoke Plan stage (ported from reference: mandate, squad, milestones, metrics) ──

const SUGGESTED_SQUAD = [
  { name: "Noah R.", role: "Tech lead" },
  { name: "Sofia M.", role: "ML engineer" },
  { name: "Ada L.", role: "Designer" },
];

const PLAN_MILESTONES = [
  { name: "Design complete", date: "2026-07-15" },
  { name: "Build & eval", date: "2026-08-30" },
  { name: "Pre-deploy review (R4)", date: "2026-09-12" },
  { name: "Go-live", date: "2026-09-30" },
];

const PLAN_METRICS = [
  "Invoice triage time −60%",
  "Auto-routing accuracy ≥95%",
  "AP-team adoption ≥80% by go-live +60d",
];

// Plan is rendered in the same label-left row layout as the generic stage
// forms, so its bespoke widgets (squad, milestones, metrics) read as one system.
function PlanStageForm() {
  return (
    <div>
      <div className="px-7">
        <MandateBanner />
      </div>
      <div className="mt-5 divide-y divide-[#f0efed] border-t border-[#f0efed]">
        <PlanRow label="Squad" hint="AI-suggested trio · ≥ 3 required">
          <SquadPicker />
        </PlanRow>
        <PlanRow label="Milestones" hint="AI-drafted · dates editable">
          <MilestoneRail />
        </PlanRow>
        <PlanRow label="Success metrics" hint="Lock ≥ 2 — Monitoring reports against these">
          <LockableMetrics />
        </PlanRow>
        <PlanRow label="Delivery notes">
          <textarea
            aria-label="Delivery notes"
            rows={3}
            placeholder="Optional…"
            className="block w-full resize-none rounded-[8px] border border-[#e7e5e4] bg-white px-3 py-2.5 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition focus:border-[#8fc0cf] focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
        </PlanRow>
      </div>
    </div>
  );
}

function PlanRow({ label, hint, children }: { label: string; hint?: string; children: ReactElement }) {
  return (
    <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-6 px-7 py-4">
      <div className="pt-1">
        <div className="text-[13px] font-medium leading-5 text-[var(--text-label)]">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{hint}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MandateBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[10px] border border-[#ecebea] bg-[var(--surface-muted)] px-4 py-3.5">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Funded</div>
        <div className="font-display text-[20px] font-medium leading-6 text-[var(--text-primary)]">GBP 180k approved</div>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {["2 binding conditions", "Go-live Q3 2026", "Standard tier"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-[#ecebea] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)]"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function SquadPicker() {
  const [selected, setSelected] = useState<string[]>(SUGGESTED_SQUAD.map((member) => member.name));

  function toggle(name: string) {
    setSelected((current) => (current.includes(name) ? current.filter((n) => n !== name) : [...current, name]));
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {SUGGESTED_SQUAD.map((member) => {
          const on = selected.includes(member.name);

          return (
            <button
              key={member.name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(member.name)}
              className={cn(
                "flex items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                on
                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)]"
                  : "border-[#e7e5e4] bg-white hover:border-[var(--accent-border)] hover:bg-[var(--accent-hover-bg)]",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  on ? "bg-[var(--accent)] text-white" : "bg-[#f0efed] text-[var(--text-label)]",
                )}
              >
                {initials(member.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium leading-5 text-[var(--text-primary)]">{member.name}</span>
                <span className="block text-[12px] leading-4 text-[var(--text-muted)]">{member.role}</span>
              </span>
              {on ? (
                <Check size={16} strokeWidth={2.5} className="shrink-0 text-[var(--accent)]" />
              ) : (
                <span className="text-[18px] leading-none text-[var(--text-faint)]">+</span>
              )}
            </button>
          );
        })}
      </div>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-strong)]">
        <Sparkles size={12} /> matched to RAG pattern
      </span>
    </div>
  );
}

function MilestoneRail() {
  const [dates, setDates] = useState(PLAN_MILESTONES.map((milestone) => milestone.date));

  return (
    <div className="flex flex-col gap-2">
      {PLAN_MILESTONES.map((milestone, index) => (
        <div key={milestone.name} className="flex items-center gap-3 rounded-[8px] border border-[#e7e5e4] bg-white px-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f0efed] text-[11px] font-semibold text-[var(--text-label)]">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-primary)]">{milestone.name}</span>
          <input
            type="date"
            aria-label={`${milestone.name} date`}
            value={dates[index]}
            onChange={(event) => setDates((current) => current.map((date, j) => (j === index ? event.target.value : date)))}
            className="h-8 w-[150px] shrink-0 rounded-[6px] border border-[#e7e5e4] bg-white px-2.5 text-[13px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[#8fc0cf] focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
        </div>
      ))}
    </div>
  );
}

function LockableMetrics() {
  const [locked, setLocked] = useState<boolean[]>([true, true, false]);
  const lockedCount = locked.filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      {PLAN_METRICS.map((metric, index) => {
        const isLocked = locked[index];

        return (
          <div
            key={metric}
            className={cn(
              "flex items-center gap-3 rounded-[9px] border px-3.5 py-3 transition",
              isLocked ? "border-[#a9d9bc] bg-[#f2f8f4]" : "border-[#e7e5e4] bg-white",
            )}
          >
            <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-primary)]">{metric}</span>
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a9d9bc] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#15803d]">
                <Lock size={12} /> Locked
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setLocked((current) => current.map((value, j) => (j === index ? true : value)))}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <Lock size={12} /> Lock
              </button>
            )}
          </div>
        );
      })}
      <p className="mt-1 text-[12px] leading-4 text-[var(--text-muted)]">
        {lockedCount} of {PLAN_METRICS.length} locked · lock ≥ 2 before mobilizing
      </p>
    </div>
  );
}

function choiceOptions(label: string, value: string) {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes("decision") || lowerLabel === "outcome" || lowerLabel.includes("verdict")) return [value, "Revise", "Block"];
  if (lowerLabel.includes("risk")) return ["Low", "Medium", "High"];
  if (lowerLabel.includes("tier")) return ["Light", "Standard", "Full"];
  if (lowerLabel.includes("required")) return ["Yes", "No", "Not sure"];
  if (lowerLabel.includes("model") || lowerLabel.includes("architecture")) return [value, "Workflow", "Classification", "Extraction"];
  if (lowerLabel.includes("autonomy")) return ["Suggests to human", "Human approves", "Acts automatically"];
  if (lowerLabel.includes("pii")) return ["No", "Unsure", "Present"];
  if (lowerLabel.includes("readiness") || lowerLabel.includes("value to function")) return ["1/5", "2/5", "3/5", "4/5", "5/5"];
  if (lowerLabel.includes("delivery model")) return ["In-house squad", "Vendor", "Hybrid"];

  return null;
}

function isChecklistField(label: string) {
  const lowerLabel = label.toLowerCase();
  return ["controls", "conditions", "scope", "sources", "guardrails", "integrations", "evidence", "interventions", "metrics", "milestones", "improvements", "pipeline"].some((token) => lowerLabel.includes(token));
}

function listItems(value: string) {
  return value
    .split(/\s*(?:;|,|->)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function DetailPanel() {
  return (
    <div className="pb-1">
      <dl className="divide-y divide-[#ecebea]">
        {DETAIL_ITEMS.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-5 py-3.5">
            <dt className="text-[13px] font-normal leading-5 text-[var(--text-label)]">{label}</dt>
            <dd className="min-w-0 text-right text-[14px] font-medium leading-5 text-[var(--text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CommentsPanel() {
  return (
    <div>
      <div className="divide-y divide-[#ecebea]">
        {COMMENT_ITEMS.map((comment) => (
          <article key={`${comment.author}-${comment.date}`} className="px-5 py-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h3 className="min-w-0 text-[14px] font-medium leading-5 text-[var(--text-primary)]">{comment.author}</h3>
              <time className="shrink-0 text-[13px] font-normal leading-5 text-[var(--text-label)]">{comment.date}</time>
            </div>
            <p className="mt-1.5 text-[13px] font-normal leading-5 text-[var(--text-body)]">{comment.body}</p>
          </article>
        ))}
      </div>

      <div className="border-t border-[#ecebea] px-5 py-4">
        <div className="flex h-9 items-center gap-3">
          <input
            aria-label="Add comment"
            placeholder="Write a comment..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-normal leading-5 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            aria-label="Send comment"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--text-primary)] text-white transition hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityPanel() {
  return (
    <div className="pb-1">
      <ol className="divide-y divide-[#ecebea]">
        {ACTIVITY_ITEMS.map((activity) => {
          const Icon = activity.icon;

          return (
            <li key={activity.title} className="flex gap-3 px-5 py-4">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5 text-[var(--text-muted)]" aria-hidden="true">
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="min-w-0 text-[14px] font-medium leading-5 text-[var(--text-primary)]">{activity.title}</h3>
                <time className="mt-1 block text-[13px] font-normal leading-5 text-[var(--text-label)]">{activity.time}</time>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RecordHeader({ currentUser, onUserChange }: { currentUser: string; onUserChange: (name: string) => void }) {
  const metadata = [
    ["Use Case ID", USE_CASE.id],
    ["Use Case Owner", text(values.businessSponsor)],
  ];

  return (
    <header className="z-30 shrink-0 bg-white px-7 pb-5 pt-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] pr-2 text-[13px] font-medium text-[var(--text-label)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <ProfileSwitcher currentUser={currentUser} onUserChange={onUserChange} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h1 className="min-w-0 font-display text-[30px] leading-tight">{USE_CASE.name}</h1>

        <dl className="flex shrink-0 flex-wrap items-end justify-end gap-x-12 gap-y-3 text-right">
          {metadata.map(([label, value]) => (
            <div key={label} className="min-w-[92px]">
              <dt className="text-[11px] font-medium leading-4 text-[var(--text-muted)]">{label}</dt>
              <dd className="mt-1.5 truncate text-[14px] font-medium leading-5 text-[var(--text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function StagePath({
  activeIndex = defaultStageIndex,
  completedIndexes = [],
  isCurrentComplete = false,
  onMarkComplete,
  onStageChange,
}: {
  activeIndex?: number;
  completedIndexes?: number[];
  isCurrentComplete?: boolean;
  onMarkComplete?: () => void;
  onStageChange?: (index: number) => void;
}) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  return (
    <section className="shrink-0 bg-white px-7 py-3">
      <div className="flex items-center gap-2">
        <ol className="-ml-7 flex min-w-0 flex-1 items-center overflow-hidden pl-7">
          {STAGES.map((stage, index) => {
            const isCompleted = completedIndexes.includes(index);
            const isActive = index === activeIndex;
            const isPending = !isActive && !isCompleted;
            const isCollapsed = isCompleted && !isActive;
            const isFirst = index === 0;
            const isLast = index === STAGES.length - 1;
            const clipPath = "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%, 13px 50%)";
            const firstClipPath = "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%)";
            const lastClipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 13px 50%)";

            return (
              <li key={stage.name} className={cn("relative flex shrink-0", index > 0 && "-ml-3")}>
                <button
                  type="button"
                  onClick={() => onStageChange?.(index)}
                  aria-label={isCollapsed ? `${stage.name} · ${stage.owner}` : undefined}
                  aria-current={isActive ? "step" : undefined}
                  title={`${stage.name} · ${stage.owner}`}
                  style={{ clipPath: isFirst ? firstClipPath : isLast ? lastClipPath : clipPath }}
                  className={cn(
                    "group relative flex h-10 items-center justify-center gap-1.5 whitespace-nowrap text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2",
                    isCollapsed
                      ? isFirst
                        ? "w-[52px] rounded-l-[20px] pl-4 pr-5"
                        : "w-[54px] px-5"
                      : isFirst
                        ? "rounded-l-[20px] pl-5 pr-6"
                        : "px-6",
                    isLast && "rounded-r-[20px]",
                    isCompleted && !isActive && "bg-[var(--stage-past)] text-white hover:bg-[var(--stage-past-hover)]",
                    isCompleted && isActive && "bg-[var(--stage-past-active)] text-white hover:bg-[var(--stage-past-active-hover)]",
                    isActive && !isCompleted && "bg-[var(--stage-active)] text-white hover:bg-[var(--stage-active-hover)]",
                    isPending && "bg-[var(--stage-future)] text-[var(--stage-future-text)] hover:bg-[var(--stage-future-hover)]",
                  )}
                >
                  {isCompleted && <Check size={13} strokeWidth={3} className="shrink-0" />}
                  <span className={cn("whitespace-nowrap", isCollapsed && "sr-only")}>{stage.name}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex shrink-0 items-center gap-1.5 pl-3">
          <button
            type="button"
            onClick={onMarkComplete}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-semibold transition",
              isCurrentComplete
                ? "border border-[var(--border-input)] bg-white text-[var(--text-body)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--text-primary)]"
                : "bg-[var(--stage-action)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--stage-action-hover)]",
            )}
          >
            {isCurrentComplete ? <RotateCcw size={15} /> : <Check size={15} strokeWidth={3} />}
            {isCurrentComplete ? "Mark Incomplete" : "Mark Complete"}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsActionMenuOpen((isOpen) => !isOpen)}
              className="grid h-10 w-10 place-items-center rounded-[8px] border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--text-primary)]"
              aria-expanded={isActionMenuOpen}
              aria-haspopup="menu"
              aria-label="More stage actions"
            >
              <MoreHorizontal size={16} />
            </button>
            {isActionMenuOpen && <StageActionMenu onSelect={() => setIsActionMenuOpen(false)} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function StageActionMenu({ onSelect }: { onSelect: () => void }) {
  const actions = ["Follow", "New assessment", "Change owner"];

  return (
    <div className="absolute right-0 top-10 z-50 w-44 space-y-1 rounded-[8px] border border-[#e7e5e4] bg-white p-1.5 shadow-[var(--shadow-lg)]" role="menu" aria-label="Stage actions">
      {actions.map((label) => (
        <button
          key={label}
          type="button"
          onClick={onSelect}
          className="flex h-8 w-full items-center justify-start rounded-[6px] border border-transparent bg-white px-2.5 text-left text-[12px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          role="menuitem"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function text(value: FieldValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  return value?.trim() || "Not provided";
}
