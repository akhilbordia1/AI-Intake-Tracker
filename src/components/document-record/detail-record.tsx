"use client";

import { INITIAL_WORKFLOW_VALUES, USE_CASE, type FieldValue } from "@/data/document-workflow-form-schema";
import { cn } from "@/lib/cn";
import { Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, FileText, Lock, MessageSquare, MoreHorizontal, RefreshCcw, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";

import { PersonAvatar, ProfileSwitcher, initials } from "@/components/profile";

import {
  CardMultiSelect,
  ChipMultiSelect,
  CurrencyField,
  DateField,
  LevelSlider,
  RadioGroup,
  RatingStepper,
  SearchableSelect,
  Segmented,
  SmartText,
  SmartTextarea,
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
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--surface-muted)] text-[var(--text-primary)]" style={RECORD_THEME}>
      <RecordHeader currentUser={currentUser} onUserChange={setCurrentUser} />
      <StagePath
        activeIndex={stageIndex}
        completedIndexes={completedStageIndexes}
        isCurrentComplete={isCurrentComplete}
        onMarkComplete={toggleCurrentStageComplete}
        onStageChange={selectStage}
      />
      <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,384px)] gap-4 bg-[var(--surface-muted)] px-5 pb-5 pt-4" aria-label="Use case content">
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

function StageColumnHeader({ stage, currentUser, action }: { stage: StageItem; currentUser: string; action?: ReactNode }) {
  const ownedByMe = stage.owner === currentUser;
  const owner = (
    <div className="flex items-center gap-2 text-[13px] leading-5">
      <span className="text-[var(--text-label)]">Stage Owner</span>
      <PersonAvatar name={stage.owner} size={22} highlight={ownedByMe} />
      <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{stage.owner}</span>
    </div>
  );

  return (
    <div className="flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#ecebea] px-7 py-2" aria-label={`${stage.name} stage header`}>
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="font-display min-w-0 truncate text-[19px] leading-7 text-[var(--text-primary)]">{stage.name}</h2>
        {action ? (
          <>
            <span className="h-4 w-px bg-[#e7e5e4]" aria-hidden />
            {owner}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">{action ?? owner}</div>
    </div>
  );
}

const SUPPORTING_TABS = [
  { key: "Details", icon: FileText, meta: undefined, render: () => <DetailPanel /> },
  { key: "Comments", icon: MessageSquare, meta: String(COMMENT_ITEMS.length), render: () => <CommentsPanel /> },
  { key: "Activity", icon: Activity, meta: String(ACTIVITY_ITEMS.length), render: () => <ActivityPanel /> },
] as const;

function SupportingTabs() {
  const [active, setActive] = useState<(typeof SUPPORTING_TABS)[number]["key"]>("Details");
  const current = SUPPORTING_TABS.find((tab) => tab.key === active) ?? SUPPORTING_TABS[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#ecebea] px-5">
        <div className="flex items-center gap-5" role="tablist" aria-label="Supporting details">
          {SUPPORTING_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
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
                <Icon size={13} className={cn(tab.key === active ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
                {tab.key}
                {tab.meta ? <span className="text-[12px] font-normal text-[var(--text-muted)]">{tab.meta}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{current.render()}</div>
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

const PERSON_LABEL_RE = /(assessor|sponsor|owner|lead|created by)/i;
const STATUS_LABEL_RE = /(decision|outcome|verdict|recommendation|tier|ready|sign-off|resolution|board|drift|risk$|impact$)/i;

function statusTone(value: string) {
  const v = value.toLowerCase();
  if (/(block|reject|upheld|no-?go|blocked|fail|high|serious|critical)/.test(v)) return { fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" };
  if (/(condition|watch|pending|partial|needs|revise|minor|standard|medium|reindex|re-index)/.test(v)) return { fg: "#a15c11", bg: "#f6f0e6", border: "#e6d4b8" };
  if (/(go\b|approve|cleared|committed|continue|proceed|recommend|locked|full|resolved|ready|yes|confirmed|complete|low|spawned)/.test(v)) return { fg: "#15803d", bg: "#eef4ee", border: "#bfdcc7" };
  return { fg: "var(--text-body)", bg: "var(--surface-muted)", border: "var(--border-default)" };
}

const TAG_LABEL_RE = /(archetype|function|delivery|sensitivity|exposure|reversibility|basis|users|complexity|path|department|team|country|window|cohort)/i;

function ReadValue({ label, value }: { label: string; value: string }) {
  const items = listItems(value);
  const single = items.length === 1;
  const short = value.length <= 30;

  // Multi-value → chips
  if (items.length > 1 && items.every((item) => item.length <= 32)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#e7e5e4] bg-[var(--surface-muted)] px-2.5 py-1 text-[12.5px] font-medium text-[var(--text-body)]"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  // People → avatar + name
  if (single && short && PERSON_LABEL_RE.test(label) && /^[A-Z]/.test(value)) {
    return (
      <span className="inline-flex items-center gap-2">
        <PersonAvatar name={value} size={22} />
        <span className="text-[14px] font-medium text-[var(--text-primary)]">{value}</span>
      </span>
    );
  }

  // Currency amounts → distinct styled value
  if (CURRENCY_RE.test(value)) {
    return (
      <span className="inline-block rounded-[6px] bg-[var(--surface-muted)] px-2.5 py-1 text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
    );
  }

  // Decisions / tiers / risk / PII / autonomy → colored status badge
  if (single && short && (STATUS_LABEL_RE.test(label) || /(pii|autonomy|oversight)/i.test(label))) {
    const tone = statusTone(value);
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold"
        style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
        {value}
      </span>
    );
  }

  // Short attribute fields → neutral tag
  if (single && short && TAG_LABEL_RE.test(label)) {
    return (
      <span className="inline-block rounded-full border border-[var(--border-default)] bg-white px-2.5 py-1 text-[13px] font-medium text-[var(--text-body)]">
        {value}
      </span>
    );
  }

  // Prose → capped measure for readability
  return <span className="block max-w-[62ch] text-[15px] leading-6 text-[var(--text-primary)]">{value}</span>;
}

function StageReadOnlyRows({ rows }: { rows: StageItem["rows"] }) {
  return (
    <div>
      <dl className="divide-y divide-[#f0efed] border-b border-[#f0efed]">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[190px_minmax(0,1fr)] gap-7 px-7 py-4">
            <dt className="pt-1 text-[14px] font-medium leading-5 text-[var(--text-label)]">{label}</dt>
            <dd className="min-w-0">
              <ReadValue label={label} value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type FieldKind = "segmented" | "radio" | "select" | "scale" | "level" | "cards" | "chips" | "currency" | "date" | "long" | "text";

// Multi-selects that render as tile cards; the rest stay as pill chips.
const CARD_FIELDS = new Set(["Pipeline", "Grounding controls"]);

type FieldSpec = {
  label: string;
  kind: FieldKind;
  options?: string[];
  suggestion: string | string[];
  max?: number;
};

// Ordinal option sets render as a labeled slider rather than a picker.
const ORDINAL_SETS = [
  ["Low", "Medium", "High"],
  ["Light", "Standard", "Full"],
];

function isOrdinalSet(options: string[]) {
  return ORDINAL_SETS.some((set) => set.length === options.length && set.every((item, index) => options[index] === item));
}

const CURRENCY_RE = /^\s*(GBP|USD|EUR|£|\$|€)/;

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
  // Currency amounts get a dedicated control (currency dropdown + amount)
  if (CURRENCY_RE.test(value)) return { label, kind: "currency", suggestion: value };

  const options = choiceOptions(label, value);
  if (options) {
    // N/M rating scales → numbered stepper
    if (options.every((option) => /^\d+\/\d+$/.test(option))) {
      return { label, kind: "scale", suggestion: value, max: Number(options[0].split("/")[1]) };
    }
    // Low/Medium/High, Light/Standard/Full → labeled slider
    if (isOrdinalSet(options)) return { label, kind: "level", options, suggestion: value };
    // long option lists read better as a dropdown
    if (options.length > 5) return { label, kind: "select", options, suggestion: value };
    // short enums → segmented pill toggle; longer-label enums → radios
    if (options.every((option) => option.length <= 10)) return { label, kind: "segmented", options, suggestion: value };
    return { label, kind: "radio", options, suggestion: value };
  }

  const items = listItems(value);
  if (isChecklistField(label) && items.length > 1) {
    return { label, kind: CARD_FIELDS.has(label) ? "cards" : "chips", options: items, suggestion: items };
  }

  if (value.length > 96 || LONG_LABELS.has(label)) return { label, kind: "long", suggestion: value };
  return { label, kind: "text", suggestion: value };
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

// Editable generic stage: identity header, then a guidance strip (with the
// suggest-all action + live risk tier) above the label-left field rows.
function EditableStage({ stage, currentUser }: { stage: StageItem; currentUser: string }) {
  const fields = useMemo(() => stage.rows.map(([label, value]) => buildFieldSpec(label, value)), [stage]);
  const [values, setValues] = useState<Record<string, string | string[]>>(() =>
    Object.fromEntries(fields.map((field) => [field.label, field.kind === "cards" || field.kind === "chips" ? [] : ""])),
  );
  const riskTier = stage.name === "Assess" ? computeRiskTier(values) : null;

  function setField(label: string, value: string | string[]) {
    setValues((current) => ({ ...current, [label]: value }));
  }

  function suggestAll() {
    setValues(Object.fromEntries(fields.map((field) => [field.label, field.suggestion])));
  }

  return (
    <>
      <StageColumnHeader
        stage={stage}
        currentUser={currentUser}
        action={
          <>
            {riskTier ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{ color: riskTier.fg, background: riskTier.bg, borderColor: riskTier.border }}
              >
                <ShieldCheck size={11} />
                {riskTier.tier} tier
              </span>
            ) : null}
            <button
              type="button"
              onClick={suggestAll}
              title="Draft all fields"
              className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] pl-2 pr-2.5 text-[11.5px] font-medium text-[var(--accent-strong)] transition hover:bg-[#daedf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              <Sparkles size={11} />
              Suggest
            </button>
          </>
        }
      />

      <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 pt-4" aria-label={`${stage.name} stage form`}>
        <div className="pt-1">
          {fields.map((field) => {
            const singleLine = !["cards", "chips", "long"].includes(field.kind);
            return (
              <div key={field.label} className="grid grid-cols-[184px_minmax(0,1fr)] gap-8 px-7 py-[18px]">
                <label
                  className={cn(
                    "text-[13.5px] font-medium leading-5 text-[var(--text-label)]",
                    singleLine ? "flex min-h-9 items-center" : "pt-1.5",
                  )}
                >
                  {field.label}
                </label>
                <div className={cn("min-w-0", singleLine && "flex min-h-9 items-center")}>
                  <div className="w-full min-w-0">
                    <StageField
                      spec={field}
                      value={values[field.label]}
                      onChange={(value) => setField(field.label, value)}
                      onSuggest={() => setField(field.label, field.suggestion)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
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
  const text = typeof value === "string" ? value : "";

  if (spec.kind === "scale") {
    return <RatingStepper hideHeader label={spec.label} max={spec.max ?? 5} value={text} onChange={onChange} />;
  }

  if (spec.kind === "level") {
    return <LevelSlider hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "currency") {
    const match = /^\s*(GBP|USD|EUR|£|\$|€)\s*(.*)$/.exec(text);
    const symbolToCode: Record<string, string> = { "£": "GBP", $: "USD", "€": "EUR" };
    const currency = match ? symbolToCode[match[1]] ?? match[1] : "GBP";
    const amount = match ? match[2] : text;
    return (
      <CurrencyField
        hideHeader
        label={spec.label}
        amount={amount}
        currency={currency}
        currencies={["GBP", "USD", "EUR"]}
        onAmount={(next) => onChange(`${currency} ${next}`.trim())}
        onCurrency={(next) => onChange(`${next} ${amount}`.trim())}
      />
    );
  }

  if (spec.kind === "select") {
    return <SearchableSelect hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "date") {
    return <DateField hideHeader label={spec.label} value={text} onChange={onChange} />;
  }

  if (spec.kind === "segmented") {
    return <Segmented hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "radio") {
    return <RadioGroup hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "cards") {
    return (
      <CardMultiSelect
        hideHeader
        label={spec.label}
        options={spec.options ?? []}
        values={Array.isArray(value) ? value : []}
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
    return <SmartTextarea hideHeader label={spec.label} maxLength={600} value={text} onChange={onChange} onSuggest={onSuggest} />;
  }

  return <SmartText hideHeader label={spec.label} value={text} onChange={onChange} onSuggest={onSuggest} />;
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
      <div className="px-7 pt-1">
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
    <div className="grid grid-cols-[184px_minmax(0,1fr)] gap-6 px-7 py-4">
      <div className="pt-1">
        <div className="text-[13.5px] font-medium leading-5 text-[var(--text-label)]">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{hint}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MandateBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[10px] border border-[#cfe6d8] bg-gradient-to-r from-[#eef6f0] to-[#f6faf7] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#15803d] text-white shadow-[0_1px_2px_rgba(21,128,61,0.3)]">
          <Check size={19} strokeWidth={2.5} />
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#15803d]">Funded · GTAC approved</div>
          <div className="font-display text-[21px] leading-6 text-[var(--text-primary)]">GBP 180k approved</div>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {["2 binding conditions", "Go-live Q3 2026", "Standard tier"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-[#cfe6d8] bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#25603f]"
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
      <div className="grid gap-2.5 sm:grid-cols-3">
        {SUGGESTED_SQUAD.map((member) => {
          const on = selected.includes(member.name);

          return (
            <button
              key={member.name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(member.name)}
              className={cn(
                "relative flex flex-col items-start gap-2.5 rounded-[10px] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                on
                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)] shadow-[0_1px_2px_rgba(12,10,9,0.04)]"
                  : "border-[#e7e5e4] bg-white hover:border-[var(--accent-border)] hover:bg-[var(--accent-hover-bg)]",
              )}
            >
              <span className="absolute right-2.5 top-2.5">
                {on ? (
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--accent)] text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="block h-[18px] w-[18px] rounded-full border-[1.5px] border-[var(--border-input)]" />
                )}
              </span>
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                  on ? "bg-[var(--accent)] text-white" : "bg-[#f0efed] text-[var(--text-label)]",
                )}
              >
                {initials(member.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold leading-5 text-[var(--text-primary)]">{member.name}</span>
                <span className="block truncate text-[11.5px] leading-4 text-[var(--text-muted)]">{member.role}</span>
              </span>
            </button>
          );
        })}
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--accent-strong)]">
        <Sparkles size={12} /> matched to RAG pattern
      </span>
    </div>
  );
}

function MilestoneRail() {
  const [dates, setDates] = useState(PLAN_MILESTONES.map((milestone) => milestone.date));

  return (
    <div className="flex flex-col">
      {PLAN_MILESTONES.map((milestone, index) => {
        const isLast = index === PLAN_MILESTONES.length - 1;
        return (
          <div key={milestone.name} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--accent-border)] bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent-strong)]">
                {index + 1}
              </span>
              {isLast ? null : <span className="w-px flex-1 bg-[var(--border-default)]" />}
            </div>
            <div className={cn("flex flex-1 items-center justify-between gap-3", isLast ? "pb-0.5" : "pb-4")}>
              <span className="text-[14px] font-medium text-[var(--text-primary)]">{milestone.name}</span>
              <div className="w-[176px] shrink-0">
                <DateField
                  hideHeader
                  label={`${milestone.name} date`}
                  value={dates[index]}
                  onChange={(next) => setDates((current) => current.map((date, j) => (j === index ? next : date)))}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LockableMetrics() {
  const [locked, setLocked] = useState<boolean[]>([true, true, false]);
  const lockedCount = locked.filter(Boolean).length;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PLAN_METRICS.map((metric, index) => {
          const isLocked = locked[index];

          return (
            <div
              key={metric}
              className={cn(
                "flex flex-col justify-between gap-3 rounded-[10px] border p-3.5 transition",
                isLocked ? "border-[#a9d9bc] bg-[#f2f8f4]" : "border-[#e7e5e4] bg-white",
              )}
            >
              <span className="text-[13px] font-medium leading-5 text-[var(--text-primary)]">{metric}</span>
              {isLocked ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#a9d9bc] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#15803d]">
                  <Lock size={12} /> Locked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setLocked((current) => current.map((value, j) => (j === index ? true : value)))}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                >
                  <Lock size={12} /> Lock
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[12px] leading-4 text-[var(--text-muted)]">
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
  if (lowerLabel.includes("pii")) return ["Present", "No", "Not sure"];
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
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
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
      </div>

      <div className="shrink-0 border-t border-[#ecebea] p-3">
        <div className="flex items-end gap-2 rounded-[10px] border border-[var(--border-input)] bg-white px-3 py-2 transition focus-within:border-[#8fc0cf] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
          <textarea
            aria-label="Add comment"
            placeholder="Write a comment…"
            rows={2}
            className="no-scrollbar max-h-24 min-h-[36px] min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-[13px] font-normal leading-5 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
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
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
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
  const ownerName = text(values.businessSponsor);

  return (
    <header className="z-30 shrink-0 border-b border-[#ecebea] bg-[var(--surface-muted)] px-7 pb-5 pt-5">
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

        <div className="flex shrink-0 items-center gap-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Use Case ID</div>
            <span className="mt-1.5 inline-block rounded-[6px] bg-[var(--accent-soft)] px-2 py-0.5 text-[13px] font-semibold tracking-[0.02em] text-[var(--accent-strong)]">
              {USE_CASE.id}
            </span>
          </div>
          <span className="h-9 w-px bg-[#ecebea]" aria-hidden />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Use Case Owner</div>
            <div className="mt-1 flex items-center gap-2">
              <PersonAvatar name={ownerName} size={24} />
              <span className="text-[14px] font-medium leading-5 text-[var(--text-primary)]">{ownerName}</span>
            </div>
          </div>
        </div>
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
  const trailRef = useRef<HTMLOListElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasLess, setHasLess] = useState(false);

  useEffect(() => {
    const trail = trailRef.current;
    if (!trail) return;
    const update = () => {
      setHasMore(trail.scrollLeft + trail.clientWidth < trail.scrollWidth - 2);
      setHasLess(trail.scrollLeft > 2);
    };
    update();
    trail.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(trail);
    return () => {
      trail.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function scrollTrail(direction: 1 | -1) {
    trailRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  return (
    <section className="shrink-0 bg-[var(--surface-muted)] px-7 py-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <ol ref={trailRef} className="no-scrollbar flex min-w-0 items-center overflow-x-auto py-0.5">
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
                        ? "rounded-l-[20px] pl-6 pr-8"
                        : "px-8",
                    isLast && "rounded-r-[20px]",
                    isCompleted && !isActive && "bg-[var(--stage-past)] text-white hover:bg-[var(--stage-past-hover)]",
                    isCompleted && isActive && "bg-[var(--stage-past-active)] text-white hover:bg-[var(--stage-past-active-hover)]",
                    isActive && !isCompleted && "bg-[var(--stage-active)] text-white hover:bg-[var(--stage-active-hover)]",
                    isPending && "bg-[var(--stage-future)] text-[var(--stage-future-text)] hover:bg-[var(--stage-future-hover)]",
                  )}
                >
                  {isCompleted && <Check size={13} strokeWidth={3} className="shrink-0" />}
                  <span className={cn("max-w-[130px] truncate", isCollapsed && "sr-only")}>{stage.name}</span>
                </button>
              </li>
            );
          })}
          </ol>

          {hasLess ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-[var(--surface-muted)] via-[var(--surface-muted)] to-transparent pl-0.5 pr-12">
              <button
                type="button"
                onClick={() => scrollTrail(-1)}
                aria-label="Scroll stages left"
                className="pointer-events-auto grid h-8 w-8 place-items-center text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          ) : null}

          {hasMore ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-l from-[var(--surface-muted)] via-[var(--surface-muted)] to-transparent pl-12 pr-0.5">
              <button
                type="button"
                onClick={() => scrollTrail(1)}
                aria-label="Scroll stages right"
                className="pointer-events-auto grid h-8 w-8 place-items-center text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ) : null}
        </div>

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
