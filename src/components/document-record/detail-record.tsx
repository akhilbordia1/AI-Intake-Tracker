"use client";

import { INITIAL_WORKFLOW_VALUES, USE_CASE, type FieldValue } from "@/data/document-workflow-form-schema";
import { cn } from "@/lib/cn";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, Lock, MoreHorizontal, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactElement } from "react";

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

const SUPPORTING_TABS = ["Details", "Comments", "Activity"] as const;

type SupportingTab = (typeof SUPPORTING_TABS)[number];

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
  const [activeSupportingTab, setActiveSupportingTab] = useState<SupportingTab>(SUPPORTING_TABS[0]);
  const [stageIndex, setStageIndex] = useState(defaultStageIndex);
  const [completedStageIndexes, setCompletedStageIndexes] = useState<number[]>([0, 1, 2, 3]);
  const currentStage = STAGES[stageIndex] ?? STAGES[0];

  function selectStage(index: number) {
    setStageIndex(index);
  }

  function markCurrentStageComplete() {
    setCompletedStageIndexes((indexes) => (indexes.includes(stageIndex) ? indexes : [...indexes, stageIndex]));

    if (stageIndex < STAGES.length - 1) {
      selectStage(stageIndex + 1);
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-white text-[var(--text-primary)]" style={RECORD_THEME}>
      <RecordHeader />
      <StagePath activeIndex={stageIndex} completedIndexes={completedStageIndexes} onMarkComplete={markCurrentStageComplete} onStageChange={selectStage} />
      <section className="mt-3 grid shrink-0 grid-cols-[minmax(0,3fr)_minmax(0,1fr)] border-t border-[#ecebea] bg-white">
        <StageColumnHeader stage={currentStage} />
        <aside className="min-w-0 border-b border-l border-[#ecebea] px-5" aria-label="Supporting detail tabs">
          <TabBar tabs={SUPPORTING_TABS} active={activeSupportingTab} onChange={(tab) => setActiveSupportingTab(tab as SupportingTab)} />
        </aside>
      </section>
      <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,1fr)] bg-white" aria-label="Use case content">
        <StageContent isComplete={completedStageIndexes.includes(stageIndex)} stage={currentStage} />
        <aside className="min-w-0 border-l border-[#ecebea]" aria-label="Supporting details">
          <SupportingPanel activeTab={activeSupportingTab} />
        </aside>
      </section>
    </main>
  );
}

function StageColumnHeader({ stage }: { stage: StageItem }) {
  return (
    <div className="flex h-12 min-w-0 items-center justify-between gap-4 border-b border-[#ecebea] px-7" aria-label={`${stage.name} stage header`}>
      <h2 className="min-w-0 truncate text-[17px] font-medium leading-6 text-[var(--text-primary)]">{stage.name}</h2>
      <p className="shrink-0 text-[13px] font-normal leading-5">
        <span className="text-[var(--text-label)]">Stage Owner</span>
        <span className="ml-2 text-[var(--text-primary)]">{stage.owner}</span>
      </p>
    </div>
  );
}

function SupportingPanel({ activeTab }: { activeTab: SupportingTab }) {
  return (
    <div className="h-full min-h-0">
      {activeTab === "Details" && <DetailPanel />}
      {activeTab === "Comments" && <CommentsPanel />}
      {activeTab === "Activity" && <ActivityPanel />}
    </div>
  );
}

function StageContent({ isComplete, stage }: { isComplete: boolean; stage: StageItem }) {
  const bespoke = !isComplete ? BESPOKE_STAGE_FORMS[stage.name] : undefined;

  return (
    <section className="no-scrollbar min-w-0 overflow-y-auto px-7 pb-6" aria-label={`${stage.name} stage content`}>
      <div className="max-w-5xl pt-2">
        {isComplete ? (
          <StageReadOnlyRows rows={stage.rows} />
        ) : bespoke ? (
          bespoke()
        ) : (
          <StageEditableForm key={stage.name} stage={stage} />
        )}
      </div>
    </section>
  );
}

function StageReadOnlyRows({ rows }: { rows: StageItem["rows"] }) {
  return (
    <dl className="divide-y divide-[#ecebea] border-b border-[#ecebea]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[190px_minmax(0,1fr)] gap-7 px-0 py-4">
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

function StageEditableForm({ stage }: { stage: StageItem }) {
  const fields = useMemo(() => stage.rows.map(([label, value]) => buildFieldSpec(label, value)), [stage]);
  const [values, setValues] = useState<Record<string, string | string[]>>(() =>
    Object.fromEntries(fields.map((field) => [field.label, field.kind === "chips" ? [] : ""])),
  );
  const saveState = useSaveStatus(JSON.stringify(values));

  const doneCount = fields.filter((field) => isFilled(values[field.label])).length;
  const riskTier = stage.name === "Assess" ? computeRiskTier(values) : null;

  function setField(label: string, value: string | string[]) {
    setValues((current) => ({ ...current, [label]: value }));
  }

  function suggestAll() {
    setValues(Object.fromEntries(fields.map((field) => [field.label, field.suggestion])));
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={suggestAll}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 text-[12px] font-medium text-[var(--accent-strong)] transition hover:bg-[#daedf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <Sparkles size={13} />
            Suggest all fields
          </button>
          {riskTier ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold"
              style={{ color: riskTier.fg, background: riskTier.bg, borderColor: riskTier.border }}
            >
              <ShieldCheck size={12} />
              {riskTier.tier} tier
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <SaveStatus state={saveState} />
          <CompletionMeter done={doneCount} total={fields.length} className="w-[170px]" />
        </div>
      </div>

      <div className="space-y-5">
        {fields.map((field) => (
          <StageField
            key={field.label}
            spec={field}
            value={values[field.label]}
            onChange={(value) => setField(field.label, value)}
            onSuggest={() => setField(field.label, field.suggestion)}
          />
        ))}
      </div>
    </div>
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
  { name: "Design complete", date: "15 Jul" },
  { name: "Build & eval", date: "30 Aug" },
  { name: "Pre-deploy review (R4)", date: "12 Sep" },
  { name: "Go-live", date: "30 Sep" },
];

const PLAN_METRICS = [
  "Invoice triage time −60%",
  "Auto-routing accuracy ≥95%",
  "AP-team adoption ≥80% by go-live +60d",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PlanStageForm() {
  return (
    <div>
      <MandateBanner />
      <SectionLabel index="01" title="Squad" hint="AI-suggested trio · ≥ 3 required" />
      <SquadPicker />
      <SectionLabel index="02" title="Milestones" hint="AI-drafted · dates editable" />
      <MilestoneRail />
      <SectionLabel index="03" title="Success metrics" hint="lock ≥ 2 — Monitoring reports against these" />
      <LockableMetrics />
      <SectionLabel index="04" title="Delivery notes" />
      <textarea
        aria-label="Delivery notes"
        rows={3}
        placeholder="Optional…"
        className="block w-full resize-none rounded-[8px] border border-[#e7e5e4] bg-white px-3 py-2.5 text-[15px] leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-ring)] focus:ring-2 focus:ring-[var(--accent-ring)]"
      />
    </div>
  );
}

function SectionLabel({ index, title, hint }: { index: string; title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[11px] font-semibold tabular-nums text-[var(--accent-strong)]">
        {index}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-medium leading-5 text-[var(--text-primary)]">{title}</h3>
        {hint ? <p className="mt-0.5 text-[12px] leading-4 text-[var(--text-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

function MandateBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[10px] border border-[#ecebea] bg-[#f9f8f6] px-4 py-3.5">
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
            aria-label={`${milestone.name} date`}
            value={dates[index]}
            onChange={(event) => setDates((current) => current.map((date, j) => (j === index ? event.target.value : date)))}
            className="h-8 w-28 rounded-[6px] border border-[#e7e5e4] bg-white px-2.5 text-right text-[13px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-ring)] focus:ring-2 focus:ring-[var(--accent-ring)]"
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
    <div className="no-scrollbar h-full overflow-y-auto pb-5">
      <dl className="divide-y divide-[#ecebea] border-b border-[#ecebea]">
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-5">
        <div className="divide-y divide-[#ecebea] border-b border-[#ecebea]">
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
    <div className="no-scrollbar h-full overflow-y-auto pb-5">
      <ol className="divide-y divide-[#ecebea] border-b border-[#ecebea]">
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

function RecordHeader() {
  const metadata = [
    ["Use Case ID", USE_CASE.id],
    ["Use Case Owner", text(values.businessSponsor)],
  ];

  return (
    <header className="z-30 shrink-0 bg-white px-7 py-4">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] pr-2 text-[13px] font-medium text-[var(--text-label)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              <ArrowLeft size={15} />
              Back to home
            </Link>
          </div>
          <h1 className="mt-1 font-display text-[28px] leading-tight">{USE_CASE.name}</h1>
        </div>

        <dl className="flex shrink-0 flex-wrap items-end justify-end gap-x-10 gap-y-3 text-right">
          {metadata.map(([label, value]) => (
            <div key={label} className="min-w-[92px]">
              <dt className="text-[11px] font-medium leading-4 text-[var(--text-muted)]">{label}</dt>
              <dd className="mt-1 truncate text-[14px] font-medium leading-5 text-[var(--text-primary)]">{value}</dd>
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
  onMarkComplete,
  onStageChange,
}: {
  activeIndex?: number;
  completedIndexes?: number[];
  onMarkComplete?: () => void;
  onStageChange?: (index: number) => void;
}) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  return (
    <section className="shrink-0 bg-white px-7 py-3">
      <div className="flex items-center">
        <div className="relative -ml-7 min-w-0 flex-1">
          <div className="no-scrollbar min-w-0 overflow-x-auto pl-7 pr-12">
            <ol className="flex min-w-max items-center">
              {STAGES.map((stage, index) => {
                const isCompleted = completedIndexes.includes(index);
                const isActive = index === activeIndex;
                const isPending = !isActive && !isCompleted;
                const isCollapsed = isCompleted && !isActive;
                const isFirst = index === 0;
                const isLast = index === STAGES.length - 1;
                const clipPath = "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)";
                const firstClipPath = "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)";
                const lastClipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 18px 50%)";

                return (
                  <li key={stage.name} className={cn("relative flex", index > 0 && "-ml-3")}>
                    <button
                      type="button"
                      onClick={() => onStageChange?.(index)}
                      aria-label={isCollapsed ? stage.name : undefined}
                      aria-current={isActive ? "step" : undefined}
                      title={stage.name}
                      style={{ clipPath: isFirst ? firstClipPath : isLast ? lastClipPath : clipPath }}
                      className={cn(
                        "group relative flex h-9 items-center justify-center gap-2 whitespace-nowrap text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2",
                        isCollapsed ? (isFirst ? "w-[62px] rounded-l-[18px] pl-4 pr-6" : "w-[62px] px-6") : isFirst ? "rounded-l-[18px] py-0 pl-4 pr-7" : "px-7",
                        isLast && "rounded-r-[18px]",
                        isCompleted && !isActive && "bg-[var(--stage-past)] text-white hover:bg-[var(--stage-past-hover)]",
                        isCompleted && isActive && "bg-[var(--stage-past-active)] text-white hover:bg-[var(--stage-past-active-hover)]",
                        isActive && !isCompleted && "bg-[var(--stage-active)] text-white hover:bg-[var(--stage-active-hover)]",
                        isPending && "bg-[var(--stage-future)] text-[var(--stage-future-text)] hover:bg-[var(--stage-future-hover)]",
                      )}
                    >
                      {isCompleted && <Check size={15} strokeWidth={3} />}
                      <span className={cn("whitespace-nowrap", isCollapsed && "sr-only")}>{stage.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[#d6d3d1] shadow-[-10px_0_18px_rgba(28,25,23,0.14)]" />
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-2">
          <button
            type="button"
            onClick={onMarkComplete}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[var(--stage-action)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--stage-action-hover)]"
          >
            <Check size={15} strokeWidth={3} />
            Mark Stage as Complete
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsActionMenuOpen((isOpen) => !isOpen)}
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--border-input)] bg-white text-[var(--text-muted)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--text-primary)]"
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

function TabBar({ active, onChange, tabs }: {
  active: string;
  onChange?: (tab: string) => void;
  tabs: readonly string[];
}) {
  return (
    <div className="flex min-w-0 items-center gap-5 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange?.(tab)}
          className={cn(
            "h-12 shrink-0 border-b-2 px-0.5 text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2",
            tab === active
              ? "border-[var(--accent)] text-[var(--accent-strong)]"
              : "border-transparent text-[var(--text-label)] hover:border-[#d6d3d1] hover:text-[var(--text-primary)]",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function text(value: FieldValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  return value?.trim() || "Not provided";
}
