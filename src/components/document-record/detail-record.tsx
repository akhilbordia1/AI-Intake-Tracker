"use client";

import { USE_CASE } from "@/data/document-workflow-form-schema";
import { cn } from "@/lib/cn";
import { ArrowLeft, Ban, Check, ChevronDown, CornerUpLeft, FileText, ListChecks, Lock, Mic, Paperclip, Pencil, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject } from "react";

import { PersonAvatar, ProfileSwitcher, initials } from "@/components/profile";
import { extractStageFields, isFieldEmpty } from "@/lib/stage-chat";

import {
  CardMultiSelect,
  ChipMultiSelect,
  CurrencyField,
  DateField,
  LevelSlider,
  RatingStepper,
  SearchableSelect,
  SegmentedToggle,
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
  "--stage-rejected": "#c0392b",
  "--stage-rejected-hover": "#a5311f",
  "--stage-returned": "#b8791f",
  "--stage-returned-hover": "#9c6519",
} as CSSProperties;

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

// Lifecycle sections for the stage drawer list. Indexes into STAGES.
const STAGE_GROUPS: { title: string; indexes: number[] }[] = [
  { title: "Intake & Prioritization", indexes: [0, 1, 2, 3] },
  { title: "Governance, Risk & Tech Assessments", indexes: [4, 5, 6] },
  { title: "Delivery", indexes: [7, 8, 9, 10] },
  { title: "Operate & Improve", indexes: [11, 12, 13] },
];

// Hybrid: most stages use the generic editable form; a few high-value stages
// get bespoke widgets ported from the reference (squad picker, milestone rail,
// lockable success metrics). Keyed by stage name.
const BESPOKE_STAGE_FORMS: Record<string, () => ReactElement> = {
  Plan: () => <PlanStageForm />,
};

type Gate = {
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
const GATES: Gate[] = [
  { id: "R1", name: "Screening gate", afterStage: "Triage", status: "Passed", approver: "Priya N.", decided: "Jun 22, 2026", artifacts: ["Screening record", "Prohibited-use scan"], conditions: [] },
  { id: "R2", name: "Governance & investment", afterStage: "GTAC", status: "Passed", approver: "Victor H.", decided: "Jun 28, 2026", artifacts: ["Business case", "GTAC minutes", "Risk register"], conditions: ["PII redaction verified before deploy", "Multi-currency re-tested at R4"] },
  { id: "R3", name: "Build review", afterStage: "Build", status: "In review", approver: "Noah R.", decided: null, artifacts: ["Eval report v3", "Red-team log"], conditions: [] },
  { id: "R4", name: "Pre-deploy review", afterStage: "Deploy", status: "Not started", approver: "Lena Osei", decided: null, artifacts: [], conditions: [] },
  { id: "R5", name: "Post-deploy review", afterStage: "Monitor", status: "Not started", approver: "Marco B.", decided: null, artifacts: [], conditions: [] },
];

function gateForStage(stageName: string) {
  return GATES.find((gate) => gate.afterStage === stageName);
}

const GATE_TONE: Record<Gate["status"], { fg: string; bg: string; border: string }> = {
  "Not started": { fg: "var(--text-muted)", bg: "var(--surface-muted)", border: "var(--border-default)" },
  "In review": { fg: "#a15c11", bg: "#f6f0e6", border: "#e6d4b8" },
  Passed: { fg: "#15803d", bg: "#eef4ee", border: "#bfdcc7" },
  Blocked: { fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" },
  Rejected: { fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" },
};

const defaultStageIndex = STAGES.findIndex((stage) => stage.name === "Assess");

type Kickback = { to: number; from: number; reason: string; by: string };
type Rejection = { index: number; reason: string; by: string };
type StatusNote =
  | { kind: "returned"; reason: string; fromName: string; by: string }
  | { kind: "rejected"; reason: string; by: string };

export function DetailRecordPage() {
  const [stageIndex, setStageIndex] = useState(defaultStageIndex);
  const [completedStageIndexes, setCompletedStageIndexes] = useState<number[]>([0, 1, 2, 3]);
  // Stages that have ever been completed hold recorded data — so reopening one
  // shows its data (editable) rather than a blank form.
  const [dataStageIndexes, setDataStageIndexes] = useState<number[]>([0, 1, 2, 3]);
  const [currentUser, setCurrentUser] = useState("Lena Osei");
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [kickbacks, setKickbacks] = useState<Kickback[]>([]);
  // Chat-first: a header toggle switches between the agent (chat) and the form
  // (document) view; the stage list is a drawer. Both persist across stages.
  const [view, setView] = useState<"agent" | "form">("agent");
  const [stagesOpen, setStagesOpen] = useState(false);

  const currentStage = STAGES[stageIndex] ?? STAGES[0];
  const isCurrentComplete = completedStageIndexes.includes(stageIndex);
  // Role-based: you can only edit / complete / decide on a stage your profile owns.
  const canComplete = currentStage.owner === currentUser;
  // An open stage owned by someone else — surfaced as a header indicator.
  const lockedOwner = !isCurrentComplete && currentStage.owner !== currentUser ? currentStage.owner : null;

  // Transient toast (e.g. attempting to edit a field you can't).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function showToast(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const currentKickback = kickbacks.find((kickback) => kickback.to === stageIndex);
  const currentRejection = rejections.find((rejection) => rejection.index === stageIndex);

  const statusNote: StatusNote | null = currentRejection
    ? { kind: "rejected", reason: currentRejection.reason, by: currentRejection.by }
    : currentKickback
      ? {
          kind: "returned",
          reason: currentKickback.reason,
          fromName: STAGES[currentKickback.from]?.name ?? "a later stage",
          by: currentKickback.by,
        }
      : null;

  function selectStage(index: number) {
    setStageIndex(index);
  }

  // Toggle: completes the stage (and advances), or marks it incomplete again
  // when you go back to a done stage. Completing also clears any return/rejection.
  function toggleCurrentStageComplete() {
    if (!canComplete) return;
    const wasComplete = completedStageIndexes.includes(stageIndex);
    setCompletedStageIndexes((indexes) =>
      wasComplete ? indexes.filter((index) => index !== stageIndex) : [...indexes, stageIndex],
    );
    // Completing records data for this stage (kept even after reopening).
    if (!wasComplete) setDataStageIndexes((indexes) => (indexes.includes(stageIndex) ? indexes : [...indexes, stageIndex]));
    setKickbacks((current) => current.filter((kickback) => kickback.to !== stageIndex));
    setRejections((current) => current.filter((rejection) => rejection.index !== stageIndex));
    if (!wasComplete && stageIndex < STAGES.length - 1) selectStage(stageIndex + 1);
  }

  function clearCurrentStatus() {
    setKickbacks((current) => current.filter((kickback) => kickback.to !== stageIndex));
    setRejections((current) => current.filter((rejection) => rejection.index !== stageIndex));
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--surface-muted)] text-[var(--text-primary)]" style={RECORD_THEME}>
      {/* Chat-first: a full-width top bar (stage drawer trigger + current stage,
          an agent/form view toggle, profile), then the selected view.
          Completing a stage is confirmed in the chat. */}
      <TopBar
        stageName={currentStage.name}
        stagesDone={completedStageIndexes.length}
        stagesOpen={stagesOpen}
        onToggleStages={() => setStagesOpen((open) => !open)}
        view={view}
        onViewChange={setView}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        lockedOwner={lockedOwner}
      />
      {statusNote ? <StageStatusBanner note={statusNote} canClear={canComplete} onClear={clearCurrentStatus} /> : null}
      <div className="relative min-h-0 flex-1">
        <ChatFirstLayout
          key={currentStage.name}
          stage={currentStage}
          currentUser={currentUser}
          prefill={dataStageIndexes.includes(stageIndex)}
          isComplete={isCurrentComplete}
          view={view}
          stageIndex={stageIndex}
          completedIndexes={completedStageIndexes}
          onMarkComplete={toggleCurrentStageComplete}
          onOpenForm={() => setView("form")}
          onEditBlocked={showToast}
        />
        {stagesOpen ? (
          <StagesDrawer
            activeIndex={stageIndex}
            completedIndexes={completedStageIndexes}
            onClose={() => setStagesOpen(false)}
            onSelect={(index) => {
              selectStage(index);
              setStagesOpen(false);
            }}
          />
        ) : null}
      </div>
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-[10px] bg-[var(--text-primary)] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-lg">
            <Lock size={14} className="shrink-0 opacity-80" />
            {toast}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function GateBadge({ gate }: { gate: Gate }) {
  const tone = GATE_TONE[gate.status];
  return (
    <span className="flex items-center gap-2 text-[13px] leading-5">
      <span
        title={`${gate.id} · ${gate.name}`}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
        style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
      >
        <ShieldCheck size={11} />
        {gate.id} · {gate.status}
      </span>
      <span className="hidden items-center gap-1.5 text-[var(--text-label)] lg:flex">
        Approver
        <PersonAvatar name={gate.approver} size={20} />
        <span className="font-medium text-[var(--text-primary)]">{gate.approver}</span>
      </span>
    </span>
  );
}

function StageColumnHeader({ stage, currentUser, action }: { stage: StageItem; currentUser: string; action?: ReactNode }) {
  const ownedByMe = stage.owner === currentUser;
  const gate = gateForStage(stage.name);
  const owner = (
    <div className="flex items-center gap-2 text-[13px] leading-5">
      <span className="text-[var(--text-label)]">{gate ? "Prepared by" : "Stage Owner"}</span>
      <PersonAvatar name={stage.owner} size={22} highlight={ownedByMe} />
      <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{stage.owner}</span>
    </div>
  );
  const ownership = gate ? (
    <div className="flex flex-wrap items-center gap-3">
      {owner}
      <span className="h-4 w-px bg-[#e7e5e4]" aria-hidden />
      <GateBadge gate={gate} />
    </div>
  ) : (
    owner
  );

  return (
    <div className="flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#ecebea] px-7 py-2" aria-label={`${stage.name} stage header`}>
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="font-display min-w-0 truncate text-[19px] leading-7 text-[var(--text-primary)]">{stage.name}</h2>
        {action ? (
          <>
            <span className="h-4 w-px bg-[#e7e5e4]" aria-hidden />
            {ownership}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">{action ?? ownership}</div>
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

function StageStatusBanner({ note, canClear, onClear }: { note: StatusNote; canClear: boolean; onClear: () => void }) {
  const rejected = note.kind === "rejected";
  const palette = rejected
    ? { fg: "#a5311f", bg: "#fbeeec", border: "#eecbc4", icon: <Ban size={18} /> }
    : { fg: "#9c6519", bg: "#f8f1e6", border: "#ecd8b6", icon: <CornerUpLeft size={18} /> };

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b px-7 py-3"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white"
        style={{ borderColor: palette.border, color: palette.fg }}
      >
        {palette.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-semibold" style={{ color: palette.fg }}>
            {rejected ? "Stage rejected" : `Sent back from ${note.fromName}`}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
            by
            <PersonAvatar name={note.by} size={16} />
            <span className="font-medium text-[var(--text-body)]">{note.by}</span>
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[var(--text-body)]">{note.reason}</p>
      </div>
      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-[7px] border bg-white/70 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white"
          style={{ color: palette.fg, borderColor: palette.border }}
        >
          {rejected ? "Reopen" : "Dismiss"}
        </button>
      ) : null}
    </div>
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

function ScaleReadValue({ value }: { value: string }) {
  const [score, total] = value.split("/").map(Number);
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={cn("h-1.5 w-1.5 rounded-full", index < score ? "bg-[var(--accent)]" : "bg-[var(--border-default)]")}
          />
        ))}
      </span>
      <span className="text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
    </span>
  );
}

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

  // Rating scales (n/m) → one consistent meter, ignoring label wording
  if (single && /^\d+\/\d+$/.test(value)) {
    return <ScaleReadValue value={value} />;
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
  // Currency amounts get a dedicated control (currency dropdown + amount).
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

type StageFieldsState = {
  fields: FieldSpec[];
  values: Record<string, string | string[]>;
  loadingFields: string[];
  setField: (label: string, value: string | string[]) => void;
  suggestField: (field: FieldSpec) => void;
  suggestAll: () => void;
  suggestingAll: boolean;
  draftDurationMs: number;
  fillNow: (label: string, value: string | string[], delay: number) => void;
};

// Shared field state for an editable stage. Both the form grid and the chat
// panel drive the same instance, so they stay in sync.
function useStageFields(stage: StageItem, prefill: boolean): StageFieldsState {
  const fields = useMemo(() => stage.rows.map(([label, value]) => buildFieldSpec(label, value)), [stage]);
  const [values, setValues] = useState<Record<string, string | string[]>>(() =>
    Object.fromEntries(
      fields.map((field) => {
        // Reopened stage: show its recorded data, editable. Fresh stage: empty.
        if (prefill) return [field.label, field.suggestion];
        if (field.kind === "cards" || field.kind === "chips") return [field.label, []];
        // Toggles always show a selection — default to the first option.
        if ((field.kind === "segmented" || field.kind === "radio") && field.options?.length) return [field.label, field.options[0]];
        return [field.label, ""];
      }),
    ),
  );

  // AI-suggest is mocked, so we fake generation latency: fields shimmer, then
  // fill. "Suggest all" fills them one after another for a drafting feel.
  const [suggestingAll, setSuggestingAll] = useState(false);
  const [loadingFields, setLoadingFields] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function setField(label: string, value: string | string[]) {
    setValues((current) => ({ ...current, [label]: value }));
  }

  function fillAfter(label: string, value: string | string[], delay: number) {
    setLoadingFields((current) => (current.includes(label) ? current : [...current, label]));
    const timer = setTimeout(() => {
      setValues((current) => ({ ...current, [label]: value }));
      setLoadingFields((current) => current.filter((entry) => entry !== label));
    }, delay);
    timers.current.push(timer);
  }

  // Every field shows its loader for ~2s, then fills in a quick cascade.
  const draftDurationMs = 2000 + fields.length * 90 + 300;
  function suggestAll() {
    if (suggestingAll) return;
    setSuggestingAll(true);
    fields.forEach((field, index) => fillAfter(field.label, field.suggestion, 2000 + index * 90));
    const done = setTimeout(() => setSuggestingAll(false), draftDurationMs);
    timers.current.push(done);
  }

  function suggestField(field: FieldSpec) {
    if (loadingFields.includes(field.label)) return;
    fillAfter(field.label, field.suggestion, 950);
  }

  // Fill an arbitrary value with the shimmer (used by the "describe" batch fill).
  function fillNow(label: string, value: string | string[], delay: number) {
    fillAfter(label, value, delay);
  }

  return { fields, values, loadingFields, setField, suggestField, suggestAll, suggestingAll, draftDurationMs, fillNow };
}

// Only free-text inputs show the "Generating…" loader; choice + currency fields just fill.
const LOADER_KINDS = new Set(["text", "long"]);

// A document-style field: the value reads as prose (like the read-only record).
// Empty fields show a quiet placeholder — the value fills in once it's answered
// in the chat. Clicking a value swaps to the editable control.
function DocumentField({ field, s, readOnly, onBlockedEdit }: { field: FieldSpec; s: StageFieldsState; readOnly: boolean; onBlockedEdit?: () => void }) {
  const [editing, setEditing] = useState(false);
  const value = s.values[field.label];
  const loading = s.loadingFields.includes(field.label);
  const empty = isFieldEmpty(value);

  // Explicit edit only — the control never shows just because a field is empty.
  if (!readOnly && editing) {
    return (
      <div
        className="relative w-full min-w-0"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setEditing(false);
        }}
      >
        <StageField
          spec={field}
          value={value}
          onChange={(next) => s.setField(field.label, next)}
          onSuggest={() => s.suggestField(field)}
        />
        {loading && LOADER_KINDS.has(field.kind) ? <FieldGenerating tall={field.kind === "long"} /> : null}
      </div>
    );
  }

  // Being drafted → shimmer placeholder.
  if (loading) {
    return <span className="ai-field-loading inline-block h-4 w-40 rounded-[4px] bg-[var(--surface-muted)] align-middle" aria-label="Generating" />;
  }

  // Read-only + empty → a quiet "not provided" marker. Clicking (when there's a
  // blocked-edit handler) explains why it can't be edited.
  if (empty && readOnly) {
    return (
      <button
        type="button"
        disabled={!onBlockedEdit}
        onClick={onBlockedEdit}
        className="-mx-2 block rounded-[8px] px-2 py-1 text-left text-[15px] leading-6 text-[var(--text-muted)]/60 transition hover:bg-[var(--surface-muted)] disabled:pointer-events-none"
      >
        Not provided
      </button>
    );
  }

  // Empty → show the AI suggestion as a ghost preview. Click to accept it (then
  // it's editable like any filled value); the chat fills it too.
  if (empty) {
    const ghost = suggestionText(field.suggestion);
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => s.setField(field.label, field.suggestion)}
        title={readOnly ? undefined : "Click to accept this suggestion"}
        className="-mx-2 block max-w-[62ch] rounded-[8px] px-2 py-1 text-left text-[15px] italic leading-6 text-[var(--text-muted)]/60 transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-muted)] disabled:pointer-events-none"
      >
        {ghost || "Awaiting answer"}
      </button>
    );
  }

  const text = Array.isArray(value) ? value.join("; ") : value;
  return (
    <button
      type="button"
      disabled={readOnly && !onBlockedEdit}
      onClick={() => (readOnly ? onBlockedEdit?.() : setEditing(true))}
      className="-mx-2 block w-full rounded-[8px] px-2 py-1 text-left transition hover:bg-[var(--surface-muted)] disabled:pointer-events-none"
    >
      <ReadValue label={field.label} value={text} />
    </button>
  );
}

function StageFieldsGrid({ stage, s, currentUser, canEdit, isComplete = false, embedded = false, onBlockedEdit, onReopen }: { stage: StageItem; s: StageFieldsState; currentUser: string; canEdit: boolean; isComplete?: boolean; embedded?: boolean; onBlockedEdit?: () => void; onReopen?: () => void }) {
  const stageNo = STAGES.findIndex((item) => item.name === stage.name) + 1;
  const readOnly = !canEdit;
  const ownedByMe = stage.owner === currentUser;
  const riskTier = canEdit && stage.name === "Assess" ? computeRiskTier(s.values) : null;
  const gate = gateForStage(stage.name);
  const gateTone = gate ? GATE_TONE[gate.status] : null;
  const statusBadge = isComplete ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfdcc7] bg-[#eef4ee] px-2.5 py-1 text-[11px] font-semibold text-[#15803d]">
      <Check size={11} />
      Complete
    </span>
  ) : !canEdit ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6d4b8] bg-[#f6f0e6] px-2.5 py-1 text-[11px] font-semibold text-[#a15c11]">
      <Lock size={11} />
      Locked
    </span>
  ) : riskTier ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: riskTier.fg, background: riskTier.bg, borderColor: riskTier.border }}
    >
      <ShieldCheck size={11} />
      {riskTier.tier} tier
    </span>
  ) : null;

  return (
    // embedded → a plain block inside a shared scroll (stacked stages); otherwise
    // its own scroll container.
    <section className={cn(embedded ? "px-8 pb-10 pt-6" : "no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-12 pt-6")} aria-label={`${stage.name} stage`}>
      {/* Section header — one clean left column: kicker + status, title,
          description, then a single compact meta line. */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-strong)]">
            Stage {String(stageNo).padStart(2, "0")}
          </p>
          {statusBadge}
          {onReopen ? (
            <button
              type="button"
              onClick={onReopen}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]"
            >
              <RotateCcw size={11} />
              Reopen to edit
            </button>
          ) : null}
        </div>
        <h2 className="mt-2 font-display text-[30px] leading-tight text-[var(--text-primary)]">{stage.name}</h2>
        {STAGE_INTROS[stage.name] ? (
          <p className="mt-2.5 max-w-[56ch] text-[15px] leading-6 text-[var(--text-muted)]">{STAGE_INTROS[stage.name]}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            {gate ? "Prepared by" : "Owner"}
            <PersonAvatar name={stage.owner} size={18} highlight={ownedByMe} />
            <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{stage.owner}</span>
          </span>
          {gate && gateTone ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                Gate
                <span className="font-medium" style={{ color: gateTone.fg }}>{gate.id} · {gate.status}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                Approver
                <PersonAvatar name={gate.approver} size={18} />
                <span className="text-[var(--text-primary)]">{gate.approver}</span>
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-x-12 gap-y-7 border-t border-[#ecebea] pt-7 md:grid-cols-2">
        {s.fields.map((field, index) => {
          // Long text and multi-selects need the full width; the rest pair up.
          const wide = ["long", "cards", "chips"].includes(field.kind);
          return (
            <div key={field.label} className={cn("min-w-0", wide && "md:col-span-2")}>
              <label className="flex items-baseline gap-2 text-[13.5px] font-semibold text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">{stageNo}.{index + 1}</span>
                {field.label}
              </label>
              <div className="mt-1.5 min-w-0">
                <DocumentField field={field} s={s} readOnly={readOnly} onBlockedEdit={onBlockedEdit} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Full-width top bar for the chat-first layout: home link + stage-drawer trigger
// + current-stage badge (left); use-case id, profile, document toggle, and stage
// actions (right).
function TopBar({
  stageName,
  stagesDone,
  stagesOpen,
  onToggleStages,
  view,
  onViewChange,
  currentUser,
  onUserChange,
  lockedOwner,
}: {
  stageName: string;
  stagesDone: number;
  stagesOpen: boolean;
  onToggleStages: () => void;
  view: "agent" | "form";
  onViewChange: (view: "agent" | "form") => void;
  currentUser: string;
  onUserChange: (user: string) => void;
  lockedOwner: string | null;
}) {
  const views: { value: "agent" | "form"; label: string; icon: ReactNode }[] = [
    { value: "agent", label: "Chat", icon: <Sparkles size={14} /> },
    { value: "form", label: "Form", icon: <FileText size={14} /> },
  ];
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-[#ecebea] bg-white px-4 py-2.5">
      {/* Left: back, then the ticket identity (id + name) with the current stage
          + progress. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href="/"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[var(--text-label)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          aria-label="Back to home"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{USE_CASE.name}</span>
          <span className="inline-block shrink-0 rounded-[6px] bg-[var(--surface-muted)] px-2 py-0.5 text-[12px] font-semibold tracking-[0.02em] text-[var(--text-body)]">
            {USE_CASE.id}
          </span>
        </div>
      </div>
      {/* Center: agent / form view toggle. */}
      <div className="inline-flex shrink-0 items-center rounded-[9px] border border-[var(--border-default)] bg-[var(--surface-muted)] p-0.5">
        {views.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onViewChange(option.value)}
            aria-pressed={view === option.value}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition",
              view === option.value
                ? "bg-white text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
      {/* Right: the stage cluster — an ownership hint (if the stage isn't yours),
          owner (profile), then the current stage + progress as the drawer
          trigger. */}
      <div className="flex flex-1 items-center justify-end gap-2">
        {/* A lock badge on the profile hints when the stage isn't yours. */}
        <ProfileSwitcher currentUser={currentUser} onUserChange={onUserChange} lockedBy={lockedOwner ?? undefined} />
        <span className="mx-0.5 h-5 w-px shrink-0 bg-[#ecebea]" />
        <button
          type="button"
          onClick={onToggleStages}
          aria-label="Toggle stages"
          aria-expanded={stagesOpen}
          title="Browse stages"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[8px] border pl-3 pr-2.5 transition",
            stagesOpen
              ? "border-[var(--accent-ring)] bg-[var(--accent-hover-bg)]"
              : "border-[var(--border-default)] bg-white hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]",
          )}
        >
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{stageName}</span>
          <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 tabular-nums text-[11px] font-medium text-[var(--accent-strong)]">
            {stagesDone}/{STAGES.length}
          </span>
          <ListChecks size={16} className="text-[var(--accent)]" />
        </button>
      </div>
    </header>
  );
}

// The lifecycle as a vertical timeline — connector line with status dots, each
// row showing the stage name and its owner; the current stage is marked Active.
// Fully-done sections collapse by default; click a header to expand.
function StagesList({ activeIndex, completedIndexes, onSelect }: { activeIndex: number; completedIndexes: number[]; onSelect: (index: number) => void }) {
  const groupDone = (group: (typeof STAGE_GROUPS)[number]) => group.indexes.every((index) => completedIndexes.includes(index));
  // Collapse completed sections by default; user can toggle any open/closed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STAGE_GROUPS.map((group) => [group.title, groupDone(group)])),
  );

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
      {STAGE_GROUPS.map((group, groupIndex) => {
        const done = group.indexes.filter((index) => completedIndexes.includes(index)).length;
        const isCollapsed = collapsed[group.title];
        const allDone = done === group.indexes.length;
        return (
          <div key={group.title} className={cn(groupIndex > 0 && "-mx-4 mt-3 border-t border-[#ecebea] px-4 pt-3")}>
            <button
              type="button"
              onClick={() => setCollapsed((current) => ({ ...current, [group.title]: !current[group.title] }))}
              className="mb-1 flex w-full items-center justify-between gap-2 rounded-[8px] px-1 py-1 text-left transition hover:bg-[var(--surface-muted)]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{group.title}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
                <span className={cn(allDone && "text-[var(--accent-strong)]")}>{done}/{group.indexes.length}</span>
                {allDone ? <Check size={12} className="text-[var(--accent)]" /> : null}
                <ChevronDown size={14} className={cn("transition", isCollapsed && "-rotate-90")} />
              </span>
            </button>
            {isCollapsed ? null : (
              <div>
                {group.indexes.map((index, i) => {
                  const stage = STAGES[index];
                  const complete = completedIndexes.includes(index);
                  const current = index === activeIndex;
                  const first = i === 0;
                  const last = i === group.indexes.length - 1;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onSelect(index)}
                      aria-current={current}
                      className="group flex w-full items-stretch gap-3 text-left"
                    >
                      {/* Rail: connector line above/below the status dot, dot aligned
                          to the stage-name line. */}
                      <div className="flex w-5 shrink-0 flex-col items-center">
                        <span className={cn("h-2.5 w-px", first ? "bg-transparent" : "bg-[#e5e3e1]")} />
                        {complete ? (
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">
                            <Check size={12} />
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 bg-white",
                              current ? "border-[var(--accent)]" : "border-[#d3d1cf]",
                            )}
                          >
                            {current ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
                          </span>
                        )}
                        <span className={cn("w-px flex-1", last ? "bg-transparent" : "bg-[#e5e3e1]")} />
                      </div>
                      <div
                        className={cn(
                          "mb-1 min-w-0 flex-1 rounded-[10px] px-2.5 py-1.5 transition",
                          current ? "bg-[var(--accent-soft)]" : "group-hover:bg-[var(--surface-muted)]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <p className={cn("min-w-0 flex-1 truncate text-[14px] leading-5 text-[var(--text-primary)]", current ? "font-semibold" : "font-medium")}>{stage.name}</p>
                          {current ? (
                            <span className="shrink-0 rounded-full border border-[var(--accent-border)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--accent-strong)]">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] leading-4 text-[var(--text-muted)]">
                          <span className="text-[var(--text-label)]/70">Owner · </span>
                          {stage.owner}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Stage navigation as a right slide-in drawer over the chat (chat-first layout).
function StagesDrawer({
  activeIndex,
  completedIndexes,
  onClose,
  onSelect,
}: {
  activeIndex: number;
  completedIndexes: number[];
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="Close stages" onClick={onClose} className="absolute inset-0 bg-black/20" />
      <div className="absolute right-0 top-0 flex h-full w-[320px] flex-col border-l border-[#ecebea] bg-[var(--surface-muted)] shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#ecebea] px-4 py-3">
          <span className="font-display text-[18px] text-[var(--text-primary)]">Stages</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--text-muted)] transition hover:bg-white hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
        <StagesList activeIndex={activeIndex} completedIndexes={completedIndexes} onSelect={onSelect} />
      </div>
    </div>
  );
}

// Labeled separator between stacked stages in the agent / form views.
function StageStackDivider({ index, name, current }: { index: number; name: string; current: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em]", current ? "text-[var(--accent-strong)]" : "text-[var(--text-muted)]")}>
        Stage {String(index + 1).padStart(2, "0")} · {name}
      </span>
      <span className="h-px flex-1 bg-[#ecebea]" />
    </div>
  );
}

// A hookless, read-only field state for a prior stage — its recorded values are
// the mock suggestions. Cheaper than useStageFields for the many history stages.
function readOnlyStageState(stage: StageItem): StageFieldsState {
  const fields = stage.rows.map(([label, value]) => buildFieldSpec(label, value));
  const values = Object.fromEntries(fields.map((field) => [field.label, field.suggestion]));
  const noop = () => {};
  return { fields, values, loadingFields: [], setField: noop, suggestField: noop, suggestAll: noop, suggestingAll: false, draftDurationMs: 0, fillNow: noop };
}

// A prior stage's recorded document, read-only, from its (prefilled) data.
function EmbeddedStageDoc({ stage, currentUser, onBlockedEdit }: { stage: StageItem; currentUser: string; onBlockedEdit?: () => void }) {
  return <StageFieldsGrid stage={stage} s={readOnlyStageState(stage)} currentUser={currentUser} canEdit={false} isComplete embedded onBlockedEdit={onBlockedEdit} />;
}

// The prior (completed) stages, shown above the current stage as a divider +
// the reconstructed conversation each — so the chat keeps its earlier messages.
function AgentHistory({ indexes }: { indexes: number[] }) {
  return (
    <>
      {indexes.map((index) => (
        <div key={index} className="space-y-3">
          <StageStackDivider index={index} name={STAGES[index].name} current={false} />
          <EmbeddedStageChat stage={STAGES[index]} />
        </div>
      ))}
    </>
  );
}

// Chat-first stage view. The header toggle switches between the agent (chat) and
// the form (document). Both scroll through every stage worked so far — completed
// stages first (read-only, divider-separated), then the current stage — so the
// history is never lost. The form has no fill controls; the chat fills it.
function ChatFirstLayout({
  stage,
  currentUser,
  prefill,
  isComplete,
  view,
  stageIndex,
  completedIndexes,
  onMarkComplete,
  onOpenForm,
  onEditBlocked,
}: {
  stage: StageItem;
  currentUser: string;
  prefill: boolean;
  isComplete: boolean;
  view: "agent" | "form";
  stageIndex: number;
  completedIndexes: number[];
  onMarkComplete: () => void;
  onOpenForm: () => void;
  onEditBlocked: (message: string) => void;
}) {
  const s = useStageFields(stage, prefill);
  const owned = stage.owner === currentUser;
  const bespoke = stage.name in BESPOKE_STAGE_FORMS;
  // Conversational fill runs only on an open stage you own that isn't bespoke.
  const guided = !isComplete && owned && !bespoke;

  // Chronological stack of stages with content: completed ones + the current
  // stage. Priors are everything except the current stage.
  const stack = Array.from(new Set([...completedIndexes, stageIndex])).sort((a, b) => a - b);
  const priorIndexes = stack.filter((index) => index !== stageIndex);

  // Open the form on the current stage (not scrolled up to the first one).
  const currentFormRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === "form") currentFormRef.current?.scrollIntoView({ block: "start" });
  }, [view]);
  // Locked / completed agent view: keep the newest content in view.
  const { scrollRef: nonGuidedScrollRef, contentRef: nonGuidedContentRef } = useBottomPinnedScroll();

  // ---- FORM VIEW: each stage as its own bounded card so starts / ends are
  // obvious; the current stage is highlighted. ----
  if (view === "form") {
    return (
      <div className="flex min-h-0 h-full flex-col bg-[var(--surface-muted)]">
        <div className="no-scrollbar mx-auto min-h-0 w-full max-w-[760px] flex-1 space-y-5 overflow-y-auto px-4 py-6">
          {stack.map((index) => {
            const st = STAGES[index];
            const isCurrent = index === stageIndex;
            return (
              <section
                key={index}
                ref={isCurrent ? currentFormRef : undefined}
                className={cn(
                  "scroll-mt-4 overflow-hidden rounded-[16px] border bg-white",
                  isCurrent ? "border-[var(--accent-border)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]" : "border-[#ecebea]",
                )}
              >
                {isCurrent && bespoke && !isComplete && owned ? (
                  <div className="px-8 pb-10 pt-6">
                    <StageColumnHeader stage={st} currentUser={currentUser} />
                    <StageContent isComplete={false} stage={st} />
                  </div>
                ) : isCurrent ? (
                  // Owner of an open stage can edit its fields directly (click a
                  // value or an empty field); otherwise editing is blocked with a
                  // toast explaining why.
                  <StageFieldsGrid
                    stage={st}
                    s={s}
                    currentUser={currentUser}
                    canEdit={guided}
                    isComplete={isComplete}
                    embedded
                    onReopen={isComplete && owned ? onMarkComplete : undefined}
                    onBlockedEdit={
                      guided
                        ? undefined
                        : () =>
                            onEditBlocked(
                              isComplete
                                ? `${st.name} is complete — use “Reopen to edit” to make changes.`
                                : `${st.name} is owned by ${st.owner}. Switch to their profile to edit.`,
                            )
                    }
                  />
                ) : (
                  <EmbeddedStageDoc
                    stage={st}
                    currentUser={currentUser}
                    onBlockedEdit={() => onEditBlocked(`${st.name} is complete — open it from Stages to reopen and edit.`)}
                  />
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- AGENT VIEW ----
  // Guided current stage: prior summaries ride along as the chat header, then the
  // live conversation (with its own docked input).
  if (guided) {
    return (
      <div className="flex min-h-0 h-full flex-col bg-[var(--surface-muted)]">
        <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col overflow-hidden">
          <ChatPanel
            stage={stage}
            s={s}
            onMarkComplete={onMarkComplete}
            onOpenForm={onOpenForm}
            header={
              <div className="space-y-4">
                {priorIndexes.length ? <AgentHistory indexes={priorIndexes} /> : null}
                <StageStackDivider index={stageIndex} name={stage.name} current />
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const header = (
    <div className="space-y-4">
      {priorIndexes.length ? <AgentHistory indexes={priorIndexes} /> : null}
      <StageStackDivider index={stageIndex} name={stage.name} current />
    </div>
  );

  // Current stage isn't yours → chat stays open, but filling is redirected to
  // switching owner (with a top-right indicator).
  if (!isComplete && !owned) {
    return (
      <div className="flex min-h-0 h-full flex-col bg-[var(--surface-muted)]">
        <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col overflow-hidden">
          <LockedChat stage={stage} header={header} />
        </div>
      </div>
    );
  }

  // Completed (revisiting) / bespoke owned → a scroll of prior summaries + the
  // current stage's block. No live input.
  const currentBlock = isComplete ? (
    // Owner can reopen a completed stage to edit it; otherwise it's read-only.
    <SummaryCard stage={stage} s={s} onReopen={owned ? onMarkComplete : undefined} />
  ) : (
    <div className="space-y-3">
      <div className="max-w-[85%] rounded-[12px] border border-[#ecebea] bg-white px-3 py-2 text-[13px] leading-5 text-[var(--text-body)]">
        Fill in the {stage.name} details in the Form view, then mark it complete to move on.
      </div>
      <button
        type="button"
        onClick={onMarkComplete}
        className="inline-flex items-center gap-2 rounded-[10px] bg-[#249a57] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#1f7a46]"
      >
        <Check size={14} />
        Mark complete &amp; go to next stage
      </button>
    </div>
  );

  return (
    <div className="flex min-h-0 h-full flex-col bg-[var(--surface-muted)]">
      <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col overflow-hidden">
        <div ref={nonGuidedScrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-32">
          <div ref={nonGuidedContentRef} className="space-y-4">
            {priorIndexes.length ? <AgentHistory indexes={priorIndexes} /> : null}
            <StageStackDivider index={stageIndex} name={stage.name} current />
            {currentBlock}
          </div>
        </div>
      </div>
    </div>
  );
}

function suggestionText(suggestion: string | string[]): string {
  return Array.isArray(suggestion) ? suggestion.join(", ") : suggestion;
}

// One-line explainer per stage, shown as the chat's opening message.
const STAGE_INTROS: Record<string, string> = {
  Intake: "Intake captures the core idea — the problem, the outcome you want, and who it's for.",
  Screening: "Screening does a quick scan for prohibited uses and sets a provisional risk tier.",
  Prioritize: "Prioritize weighs value against readiness to decide whether this moves forward now.",
  Triage: "Triage resolves any flags and routes the use case onto the right assessment path.",
  Assess: "Assess reviews data, privacy, and model risks, and sets the conditions to proceed.",
  "Business case": "The business case lays out cost, benefit, and the recommendation for the GTAC board.",
  GTAC: "GTAC records the board's funding decision and any binding conditions.",
  Plan: "Plan lines up the delivery squad, milestones, and the success metrics to lock.",
  Design: "Design defines the architecture, guardrails, and integrations.",
  Build: "Build captures the evidence and readiness needed for the pre-deploy review.",
  Deploy: "Deploy confirms guardrails, the rollout plan, and rollback before go-live.",
  Adopt: "Adopt drives the rollout waves and tracks how uptake is going.",
  Monitor: "Monitor tracks drift, value variance, and the post-deploy review.",
  Improve: "Improve records the outcome and the next round of improvements.",
};

// Fields grouped into themes so the chat asks them in batches with a short
// framing line per group (like a person would). Stages without an entry are
// asked ungrouped. Labels must match the stage's field labels + order.
const STAGE_FIELD_GROUPS: Record<string, { framing: string; labels: string[] }[]> = {
  Intake: [
    { framing: "Let's start with the business picture — what's going on and what you're hoping to get out of this.", labels: ["Business problem", "Desired outcome", "Expected value", "Sponsor", "Function"] },
    { framing: "Now the people side — who this touches and how far it reaches.", labels: ["Countries", "Affected users"] },
    { framing: "And the technical shape of it — the model and the data behind it.", labels: ["Model archetype", "Data sources", "PII", "Autonomy"] },
  ],
  Assess: [
    { framing: "Let's talk through privacy and data first — how personal information factors in here.", labels: ["PII", "Lawful basis", "DPIA required"] },
    { framing: "Now the model itself — where it might go wrong and what keeps it in check.", labels: ["Hallucination risk", "Grounding controls"] },
    { framing: "And finally, where this assessment lands.", labels: ["Risk register", "Outcome", "Conditions"] },
  ],
};

// A theme batch of fields the chat asks together, with a framing line.
type FieldGroup = { framing: string; labels: string[] };

// Lowercase a label for mid-sentence use, but keep acronyms (PII, DPIA) as-is.
function humanizeLabel(label: string): string {
  return label
    .split(" ")
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()))
    .join(" ");
}

// "a", "a and b", "a, b and c" — for naming fields in a sentence.
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Theme batches for a stage: its defined groups, or — for stages without a
// theme map — auto-chunked into small batches (~3 fields) so the chat never
// asks for a long list in one breath.
function stageGroupsFor(stage: StageItem, fields: FieldSpec[]): FieldGroup[] {
  const defined = STAGE_FIELD_GROUPS[stage.name];
  if (defined) return defined;
  const labels = fields.map((f) => f.label);
  const chunks: string[][] = [];
  for (let i = 0; i < labels.length; i += 3) chunks.push(labels.slice(i, i + 3));
  const intro = STAGE_INTROS[stage.name] ?? `Let's fill in the ${stage.name} stage.`;
  return chunks.map((chunk, index) => ({ framing: index === 0 ? intro : "A few more details.", labels: chunk }));
}

// The opening question for a group — an open, conversational ask.
function openingQuestion(framing: string, labels: string[]): string {
  const list = joinList(labels.map(humanizeLabel));
  if (labels.length === 1) return `${framing} Tell me a bit about the ${list}.`;
  return `${framing} Walk me through the ${list} in your own words — you can cover them together in a sentence or two, and I'll sort out the details.`;
}

// The acknowledgement after a group's fields land.
function ackFor(labels: string[]): string {
  return `Great — I've got the ${joinList(labels.map(humanizeLabel))} down.`;
}

// The prefilled reply for a set of fields: "Label: value; …".
function ghostFor(labels: string[], fieldByLabel: Map<string, FieldSpec>): string {
  return labels
    .map((label) => {
      const field = fieldByLabel.get(label);
      return field ? `${label}: ${suggestionText(field.suggestion)}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

type ChatMessage = { id: number; role: "assistant" | "user"; text: string };

// A chat bubble — assistant (left, bordered) or user (right, accent).
function MessageBubble({ role, text }: { role: "assistant" | "user"; text: string }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      {role === "user" ? (
        <div className="bubble-in-right max-w-[85%] whitespace-pre-line rounded-[12px] bg-[var(--accent)] px-3 py-2 text-[13px] leading-5 text-white">
          {text}
        </div>
      ) : (
        // Assistant messages read as plain text on the canvas — no bubble.
        <div className="bubble-in-left max-w-[92%] whitespace-pre-line py-1 text-[13px] leading-6 text-[var(--text-body)]">
          {text}
        </div>
      )}
    </div>
  );
}

// Keeps a scroll container pinned to the bottom as its content grows (new
// messages, or the tall prior-stage history laying out over several frames), so
// the newest message is always in view. A ResizeObserver only fires on size
// change, so a user reading history isn't yanked back down.
function useBottomPinnedScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Only auto-pin while the user is already near the bottom; if they scroll up
  // to read history, leave them there.
  const atBottom = useRef(true);
  useEffect(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content) return;
    const nearBottom = () => scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
    const onScroll = () => {
      atBottom.current = nearBottom();
    };
    const pin = () => {
      if (atBottom.current) scroll.scrollTop = scroll.scrollHeight;
    };
    pin();
    scroll.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(pin);
    observer.observe(content);
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);
  return { scrollRef, contentRef };
}

// The docked chat input: textarea + attach / voice / send. Presentational, so
// the live chat and the locked (read-only) view share one look.
function ChatComposer({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  placeholder,
  disabled = false,
  sendDisabled = false,
}: {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  sendDisabled?: boolean;
}) {
  return (
    <div className="shrink-0 p-3">
      <div className="rounded-[12px] border border-[#e7e5e4] bg-white px-2.5 pb-2 pt-2 focus-within:border-[var(--accent-ring)]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          className="no-scrollbar block max-h-40 min-h-[64px] w-full resize-none bg-transparent text-[13px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={disabled}
              aria-label="Add documents (coming soon)"
              title="Add documents — coming soon"
              className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-[8px] text-[var(--text-muted)]/70 transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label="Voice input (coming soon)"
              title="Voice input — coming soon"
              className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-[8px] text-[var(--text-muted)]/70 transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
            >
              <Mic size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={sendDisabled}
            aria-label="Send"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// A stage the current user doesn't own: the chat stays open (they can ask about
// it), but any attempt to fill it is redirected to switching owner. A top-right
// indicator hints at the ownership.
function LockedChat({ stage, header }: { stage: StageItem; header?: ReactNode }) {
  const { scrollRef, contentRef } = useBottomPinnedScroll();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

  const pushAssistant = (text: string) => setMessages((current) => [...current, { id: bump(), role: "assistant", text }]);
  const pushUser = (text: string) => setMessages((current) => [...current, { id: bump(), role: "user", text }]);
  const sayLines = (lines: string[]) =>
    lines.forEach((line, index) => timers.current.push(window.setTimeout(() => pushAssistant(line), 250 + index * 650)));

  useEffect(() => {
    sayLines([`This stage is owned by ${stage.owner}. I can walk you through ${stage.name}, but recording anything needs their profile — switch with the button up top.`]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text) return;
    pushUser(text);
    setInput("");
    sayLines([`To fill this in, switch to ${stage.owner} first — I can't record changes under your profile.`]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div ref={contentRef} className="space-y-3" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          {header ? <div className="mb-4 space-y-4">{header}</div> : null}
          {messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} text={message.text} />
          ))}
        </div>
      </div>
      <ChatComposer
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSend={() => send()}
        sendDisabled={!input.trim()}
        placeholder={`Ask about the ${stage.name} stage…`}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
      />
    </div>
  );
}

// A completed stage's conversation, reconstructed from its recorded values:
// intro, then per theme a question / reply / ack, and the summary at the end.
function EmbeddedStageChat({ stage }: { stage: StageItem }) {
  const s = readOnlyStageState(stage);
  const fieldByLabel = new Map(s.fields.map((f) => [f.label, f]));
  const groups = stageGroupsFor(stage, s.fields);
  const turns: { role: "assistant" | "user"; text: string }[] = [
    { role: "assistant", text: STAGE_INTROS[stage.name] ?? `Let's fill in the ${stage.name} stage.` },
  ];
  groups.forEach((group) => {
    const labels = group.labels.filter((label) => fieldByLabel.has(label));
    if (!labels.length) return;
    turns.push({ role: "assistant", text: openingQuestion(group.framing, labels) });
    turns.push({ role: "user", text: ghostFor(labels, fieldByLabel) });
    turns.push({ role: "assistant", text: ackFor(labels) });
  });
  return (
    <div className="space-y-3">
      {turns.map((turn, index) => (
        <MessageBubble key={index} role={turn.role} text={turn.text} />
      ))}
      <SummaryCard stage={stage} s={s} />
    </div>
  );
}

// Monotonic ids for chat message keys — uniqueness is all that's needed.
let chatMsgId = 0;
const bump = () => (chatMsgId += 1);

// Conversational assistant: asks a stage's fields in themed batches (one framing
// question per group), reads the user's paragraph reply, extracts the values it
// can (mocked keyword/option matching), then follows up only on the gaps. Drives
// the same field-state instance as the document, so both stay in sync.
function ChatPanel({ stage, s, onMarkComplete, onOpenForm, header }: { stage: StageItem; s: StageFieldsState; onMarkComplete: () => void; onOpenForm: () => void; header?: ReactNode }) {
  // Theme batches for the stage. Stages without a defined map are asked as one
  // batch (everything at once); gaps are followed up either way.
  const groups: FieldGroup[] = useMemo(() => {
    const defined = STAGE_FIELD_GROUPS[stage.name];
    if (defined) return defined;
    return [{ framing: STAGE_INTROS[stage.name] ?? `Let's fill in the ${stage.name} stage.`, labels: s.fields.map((f) => f.label) }];
  }, [stage.name, s.fields]);

  const fieldByLabel = useMemo(() => new Map(s.fields.map((f) => [f.label, f])), [s.fields]);

  // Fields already filled (a reopened stage) count as handled up front.
  const initialHandled = s.fields.filter((f) => !isFieldEmpty(s.values[f.label])).map((f) => f.label);

  // Remaining, still-askable labels of a group given what's handled.
  const groupRemaining = (group: FieldGroup, handledNow: string[]) =>
    group.labels.filter((label) => fieldByLabel.has(label) && !handledNow.includes(label));
  const firstOpenGroup = (handledNow: string[]) => groups.find((group) => groupRemaining(group, handledNow).length > 0);

  // The combined question for a group: the open opener, or a lighter follow-up
  // that invites covering the remaining fields in one reply.
  function groupQuestion(group: FieldGroup, remaining: string[], followup: boolean): string {
    if (!followup) return openingQuestion(group.framing, remaining);
    const list = joinList(remaining.map(humanizeLabel));
    return remaining.length === 1
      ? `That's helpful — just fill me in on the ${list} as well, whenever you're ready.`
      : `That's helpful — could you also cover the ${list}? A line on each is plenty.`;
  }

  const ghostReply = (labels: string[]) => ghostFor(labels, fieldByLabel);

  const [handled, setHandled] = useState<string[]>(initialHandled);
  const [done, setDone] = useState(() => !firstOpenGroup(initialHandled));
  const [input, setInput] = useState("");
  // Framing of the group we've already followed up on once — so an unparseable
  // reply escalates to auto-draft instead of looping forever.
  const followedUpRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const { scrollRef, contentRef } = useBottomPinnedScroll();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pushAssistant = (text: string) => setMessages((current) => [...current, { id: bump(), role: "assistant", text }]);
  const pushUser = (text: string) => setMessages((current) => [...current, { id: bump(), role: "user", text }]);

  // Emit assistant lines one after another (not all in one instant), so a reply
  // reads like a person typing successive messages. onDone fires after the last.
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);
  function sayLines(lines: string[], onDone?: () => void) {
    lines.forEach((line, index) => {
      timers.current.push(window.setTimeout(() => pushAssistant(line), 250 + index * 650));
    });
    if (onDone) timers.current.push(window.setTimeout(onDone, 250 + lines.length * 650));
  }

  // Opening lines — the intro and the first question — arrive staggered on mount.
  useEffect(() => {
    const first = firstOpenGroup(initialHandled);
    const intro = STAGE_INTROS[stage.name] ?? `Let's fill in the ${stage.name} stage.`;
    sayLines(first ? [intro, groupQuestion(first, groupRemaining(first, initialHandled), false)] : [intro, "Everything's already filled — open the document to review."]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send a reply — the typed input, or an override (the accepted ghost reply).
  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || done) return;
    const group = firstOpenGroup(handled);
    if (!group) return;
    pushUser(text);
    setInput("");

    // Parse the paragraph against this group's still-open fields.
    const openFields = groupRemaining(group, handled)
      .map((label) => fieldByLabel.get(label))
      .filter((field): field is FieldSpec => Boolean(field));
    const fills = extractStageFields(text, openFields, handled);
    fills.forEach((fill, index) => s.fillNow(fill.label, fill.value, 450 + index * 250));

    const filledLabels = fills.map((fill) => fill.label);
    const handledAfterFills = [...handled, ...filledLabels];
    const remaining = groupRemaining(group, handledAfterFills);
    const ack = filledLabels.length
      ? `Great — I've got the ${joinList(filledLabels.map(humanizeLabel))} down.`
      : "Thanks for that.";

    // Group finished → ack, then the next group's opener (or finish).
    if (remaining.length === 0) {
      setHandled(handledAfterFills);
      const next = firstOpenGroup(handledAfterFills);
      if (next) followedUpRef.current = null;
      sayLines(next ? [ack, groupQuestion(next, groupRemaining(next, handledAfterFills), false)] : [ack], next ? undefined : () => setDone(true));
      return;
    }

    // Already followed up once → draft the rest so the flow always progresses.
    if (followedUpRef.current === group.framing) {
      remaining.forEach((label, index) => {
        const field = fieldByLabel.get(label);
        if (field) s.fillNow(label, field.suggestion, 450 + (filledLabels.length + index) * 250);
      });
      const drafted = [...handledAfterFills, ...remaining];
      setHandled(drafted);
      const next = firstOpenGroup(drafted);
      if (next) followedUpRef.current = null;
      const draftLine = `${ack} I'll draft ${joinList(remaining.map(humanizeLabel))} from what we have — tweak it on the document if needed.`;
      sayLines(next ? [draftLine, groupQuestion(next, groupRemaining(next, drafted), false)] : [draftLine], next ? undefined : () => setDone(true));
      return;
    }

    // First gap → ack, then a follow-up on what's still missing.
    followedUpRef.current = group.framing;
    setHandled(handledAfterFills);
    sayLines([ack, groupQuestion(group, remaining, true)]);
  }

  // Prefilled reply for the current open group — shown greyed in the input,
  // accepted (and sent) with Tab / →.
  const activeGroup = done ? undefined : firstOpenGroup(handled);
  const ghost = activeGroup ? ghostReply(groupRemaining(activeGroup, handled)) : "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div ref={contentRef} className="space-y-3" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          {/* Prior stages ride along above the live conversation. */}
          {header ? <div className="mb-4 space-y-4">{header}</div> : null}
          {messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} text={message.text} />
          ))}
          {done ? <SummaryCard stage={stage} s={s} onSubmit={onMarkComplete} onEdit={onOpenForm} /> : null}
        </div>
      </div>

      <ChatComposer
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSend={() => send()}
        disabled={done}
        sendDisabled={!input.trim() || done}
        placeholder={done ? "All set — submit in the summary above." : ghost || "Describe it in your own words…"}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
            return;
          }
          // Accept the prefilled suggestion → send it straight away.
          if ((event.key === "Tab" || event.key === "ArrowRight") && input === "" && ghost && !done) {
            event.preventDefault();
            send(ghost);
          }
        }}
      />
    </div>
  );
}

// A tidy recap of everything captured for a stage, shown in the chat once the
// conversation is done (and for completed stages). Read-only — edits happen on
// the document panel.
function SummaryCard({ stage, s, onSubmit, onEdit, onReopen }: { stage: StageItem; s: StageFieldsState; onSubmit?: () => void; onEdit?: () => void; onReopen?: () => void }) {
  const hasActions = Boolean(onSubmit || onEdit || onReopen);
  return (
    <div className="rounded-[14px] border border-[#ecebea] bg-white p-4">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--accent-strong)]">
        <Sparkles size={13} />
        {stage.name} summary
      </div>
      <dl className="mt-3 space-y-2.5">
        {s.fields.map((field) => {
          const value = s.values[field.label];
          const text = Array.isArray(value) ? value.join(", ") : value;
          return (
            <div key={field.label} className="grid grid-cols-[minmax(0,150px)_1fr] gap-3">
              <dt className="text-[12px] leading-5 text-[var(--text-muted)]">{field.label}</dt>
              <dd className={cn("min-w-0 text-[13px] leading-5", isFieldEmpty(value) ? "text-[var(--text-muted)]/60" : "text-[var(--text-body)]")}>
                {isFieldEmpty(value) ? "—" : text}
              </dd>
            </div>
          );
        })}
      </dl>
      {hasActions ? (
        <div className="mt-4 flex items-center gap-2 border-t border-[#f2f1f0] pt-4">
          {onSubmit ? (
            <button
              type="button"
              onClick={onSubmit}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#249a57] px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-[#1f7a46]"
            >
              <Check size={14} />
              Submit &amp; continue
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]"
            >
              <Pencil size={14} />
              Edit
            </button>
          ) : null}
          {onReopen ? (
            <button
              type="button"
              onClick={onReopen}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]"
            >
              <RotateCcw size={14} />
              Reopen to edit
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Generating shimmer, overlaid on the real field (absolute inset-0) so the
// field keeps its exact height — no resize while the value fills in.
function FieldGenerating({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={cn(
        "ai-field-loading absolute inset-0 z-10 flex gap-2 rounded-[8px] bg-white px-3 pr-10 text-[13px] text-[var(--text-muted)]",
        tall ? "items-start py-2.5" : "items-center",
      )}
    >
      <span>Generating…</span>
      <span
        className={cn(
          "absolute right-2 grid h-6 w-6 place-items-center text-[var(--accent)]",
          tall ? "top-2" : "top-1/2 -translate-y-1/2",
        )}
      >
        <Sparkles size={13} className="animate-pulse" />
      </span>
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
        stepBy={10000}
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

  if (spec.kind === "segmented" || spec.kind === "radio") {
    return <SegmentedToggle hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
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
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#15803d] text-white">
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
                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)]"
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

  // A long value is descriptive prose, not a decision — let it fall through to a text field.
  if (lowerLabel.includes("decision") || lowerLabel === "outcome" || lowerLabel.includes("verdict"))
    return value.length > 40 ? null : [value, "Revise", "Block"];
  // "risk register" is a list, not a Low/Med/High level — exclude it.
  if (lowerLabel.includes("risk") && !lowerLabel.includes("register")) return ["Low", "Medium", "High"];
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

