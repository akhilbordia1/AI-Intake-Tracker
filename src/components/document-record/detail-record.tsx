"use client";

import { USE_CASE } from "@/data/document-workflow-form-schema";
import { cn } from "@/lib/cn";
import { ArrowLeft, Ban, Check, ChevronLeft, ChevronRight, CornerUpLeft, FileText, Info, LoaderCircle, Lock, Mic, Pencil, Plus, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

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
    name: "Ideation",
    owner: "Priya N.",
    rows: [
      ["Idea name", "Protocol Digest Assistant"],
      ["Problem statement", "Medical writers spend days reading 200+ page clinical trial protocols to extract endpoints, dosing, and inclusion/exclusion criteria - slow and inconsistent."],
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

// Hybrid: most stages use the generic editable form; a few high-value stages
// get bespoke widgets ported from the reference (squad picker, milestone rail,
// lockable success metrics). Keyed by stage name.
const BESPOKE_STAGE_FORMS: Record<string, () => ReactElement> = {
  "Plan & KPI": () => <PlanStageForm />,
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
  { id: "R3", name: "Build review", afterStage: "Solutionise and Production", status: "In review", approver: "Noah R.", decided: null, artifacts: ["Eval report v3", "Red-team log"], conditions: [] },
  { id: "R5", name: "Post-deploy review", afterStage: "Monitoring and tracking", status: "Not started", approver: "Marco B.", decided: null, artifacts: [], conditions: [] },
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

// The use-case owner shown in the page header (distinct from per-stage owners).
const USE_CASE_OWNER = "Mira Kapoor";

// Record-level metadata shown in the Details modal (opened from the header).
const RECORD_DETAILS: [string, string][] = [
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

const RECORD_COMMENTS: { by: string; when: string; text: string }[] = [
  { by: "Lena Osei", when: "2d ago", text: "Flagged one compliance check (GxP/GCP CSV) — tracking to close before build." },
  { by: "Amara J.", when: "5d ago", text: "Business case looks solid; payback under a year. Recommending to GTAC." },
  { by: "Priya N.", when: "1w ago", text: "Intake looks complete — routing to full assessment given GxP relevance." },
];

const RECORD_ACTIVITY: { icon: "moved" | "approved" | "updated" | "recorded"; title: string; when: string }[] = [
  { icon: "moved", title: "Noah R. moved stage to Solutionise & Production", when: "Jul 6, 2026, 09:18" },
  { icon: "approved", title: "Lena Osei approved risk & compliance sign-off", when: "Jul 5, 2026, 16:24" },
  { icon: "updated", title: "Amara J. updated the business case", when: "Jul 3, 2026, 11:05" },
  { icon: "recorded", title: "Victor H. recorded GTAC approval", when: "Jun 28, 2026, 14:30" },
];

const ACTIVITY_ICON: Record<(typeof RECORD_ACTIVITY)[number]["icon"], ReactNode> = {
  moved: <Check size={16} />,
  approved: <ShieldCheck size={16} />,
  updated: <RotateCcw size={16} />,
  recorded: <FileText size={16} />,
};

const defaultStageIndex = STAGES.findIndex((stage) => stage.name === "Ideation");

type Kickback = { to: number; from: number; reason: string; by: string };
type Rejection = { index: number; reason: string; by: string };
type StatusNote =
  | { kind: "returned"; reason: string; fromName: string; by: string }
  | { kind: "rejected"; reason: string; by: string };

export function DetailRecordPage() {
  const [stageIndex, setStageIndex] = useState(defaultStageIndex);
  const [completedStageIndexes, setCompletedStageIndexes] = useState<number[]>([]);
  // Stages that have ever been completed hold recorded data — so reopening one
  // shows its data (editable) rather than a blank form.
  const [dataStageIndexes, setDataStageIndexes] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState("Priya N.");
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [kickbacks, setKickbacks] = useState<Kickback[]>([]);
  // Split layout: chat on the left drives the form on the right (always both
  // shown). A horizontal Journey bar up top navigates between stages.
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The record name stays hidden until the user has given some context.
  const [started, setStarted] = useState(false);

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
      {/* Two-row page header, then the chat + form cards. The Journey stepper
          lives inside the form card. */}
      <TopBar
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        lockedOwner={lockedOwner}
        detailsOpen={detailsOpen}
        onOpenDetails={() => setDetailsOpen((v) => !v)}
        recordName={started ? USE_CASE.name : null}
      />
      {/* Full-width stage path, below the header. */}
      <JourneyBar
        activeIndex={stageIndex}
        completedIndexes={completedStageIndexes}
        onSelect={(index) => selectStage(index)}
      />
      {statusNote ? <StageStatusBanner note={statusNote} canClear={canComplete} onClear={clearCurrentStatus} /> : null}
      {/* Chat card + form card; an optional record details sheet card slides in. */}
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3 p-3",
          detailsOpen
            ? "grid-cols-[minmax(0,1fr)_minmax(520px,1.4fr)_minmax(0,1fr)]"
            : "grid-cols-2",
        )}
      >
        <SplitStageView
          key={currentStage.name}
          stage={currentStage}
          currentUser={currentUser}
          prefill={dataStageIndexes.includes(stageIndex)}
          isComplete={isCurrentComplete}
          onMarkComplete={toggleCurrentStageComplete}
          onEditBlocked={showToast}
          onStarted={() => setStarted(true)}
        />
        {detailsOpen ? <RecordDetailsSheet onClose={() => setDetailsOpen(false)} /> : null}
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

  // KPI "current vs target" → progress meter + % reached.
  const kpi = /^(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)%/.exec(value);
  if (kpi) {
    const current = Number(kpi[1]);
    const target = Number(kpi[2]);
    const reached = target > 0 ? Math.round((current / target) * 100) : 0;
    const hit = reached >= 100;
    return (
      <div className="max-w-[280px]">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">{current}%</span>
          <span className="text-[12px] text-[var(--text-muted)] tabular-nums">target {target}% · {reached}% reached</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0efed]">
          <div className={cn("h-full rounded-full", hit ? "bg-[#15803d]" : "bg-[var(--accent)]")} style={{ width: `${Math.min(100, reached)}%` }} />
        </div>
      </div>
    );
  }

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

// Fixed compliance requirements — the field's value lists the cleared ones;
// ticking an item in the checklist marks it cleared.
const COMPLIANCE_REQS = ["HIPAA", "GDPR", "GxP/GCP", "21 CFR Part 11", "Responsible AI", "Information Security", "Architecture"];

function buildFieldSpec(label: string, value: string): FieldSpec {
  // Compliance checks → a tick-to-clear checklist (selected = cleared).
  if (label === "Compliance checks") {
    return { label, kind: "cards", options: COMPLIANCE_REQS, suggestion: listItems(value) };
  }
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
  // Take the overall rating if set, else the highest of the risk dimensions.
  const dims = ["Overall risk", "Model risk", "Ethical risk", "Data hosted risk"].map((k) => String(values[k] ?? ""));
  const risk = dims.includes("High") ? "High" : dims.includes("Medium") ? "Medium" : dims.includes("Low") ? "Low" : "";

  if (risk === "High") return { tier: "Full", fg: "#b32020", bg: "#f7eaea", border: "#e6c3c3" };
  if (risk === "Medium") return { tier: "Standard", fg: "#a15c11", bg: "#f6f0e6", border: "#e6d4b8" };
  if (risk === "Low") return { tier: "Light", fg: "#15803d", bg: "#eef4ee", border: "#bfdcc7" };
  return null;
}

// Stages that can't be submitted until a checklist clears. Returns why it's
// blocked, or null when the stage is free to complete.
function stageGateReason(stageName: string, values: Record<string, string | string[]>): string | null {
  const done = /cleared|n\/?a|passed|complete|approved|deployed|done|go\b/i;
  if (stageName === "Assessment - Risk & Compliance") {
    const cleared = Array.isArray(values["Compliance checks"]) ? (values["Compliance checks"] as string[]) : [];
    const stillOpen = COMPLIANCE_REQS.filter((req) => !cleared.includes(req));
    return stillOpen.length
      ? `${stillOpen.length} compliance check${stillOpen.length > 1 ? "s" : ""} still open. Tick them off below to finish the assessment.`
      : null;
  }
  if (stageName === "Solutionise and Production") {
    const labels = ["Build & configure", "Pilot (US & EU)", "CSV documentation", "Production deployment"];
    const pending = labels.filter((label) => {
      const v = String(values[label] ?? "");
      return v.trim() !== "" && !done.test(v);
    });
    return pending.length ? `Production checklist not done: ${pending.join(", ")}.` : null;
  }
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
// Brief highlight when a field's value changes (e.g. filled live from the chat).
function useFlashOnChange(value: string | string[]) {
  const key = Array.isArray(value) ? value.join("|") : value;
  const prev = useRef(key);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1000);
    return () => clearTimeout(timer);
  }, [key]);
  return flash;
}

function DocumentField({ field, s, readOnly, onBlockedEdit, forceEdit = false }: { field: FieldSpec; s: StageFieldsState; readOnly: boolean; onBlockedEdit?: () => void; forceEdit?: boolean }) {
  const value = s.values[field.label];
  const loading = s.loadingFields.includes(field.label);
  const empty = isFieldEmpty(value);
  const flash = useFlashOnChange(value);

  // Controls only appear once the whole form is put into edit mode (the header
  // "Edit" toggle) — individual fields aren't click-to-edit.
  if (!readOnly && forceEdit) {
    return (
      <div className="relative w-full min-w-0">
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
    return (
      <span className="inline-flex items-center gap-1.5 text-[14px] text-[var(--text-muted)]" aria-label="Capturing from chat">
        <Sparkles size={13} className="animate-pulse text-[var(--accent)]" />
        Capturing…
      </span>
    );
  }

  // Read-only display. Non-owners get a click that explains the block; owners
  // just see the value (editing happens via the header "Edit").
  const text = empty ? null : Array.isArray(value) ? value.join("; ") : value;
  if (readOnly && onBlockedEdit) {
    return (
      <button
        type="button"
        onClick={onBlockedEdit}
        className={cn("-mx-2 inline-block max-w-full rounded-[8px] px-2 py-1 text-left transition hover:bg-[var(--surface-muted)]", empty && "text-[15px] leading-6 text-[var(--text-muted)]/50", flash && "field-flash")}
      >
        {empty ? "—" : <ReadValue label={field.label} value={text!} />}
      </button>
    );
  }
  return (
    <div className={cn("inline-block max-w-full rounded-[8px]", empty && "text-[15px] leading-6 text-[var(--text-muted)]/50", flash && "field-flash")}>
      {empty ? "—" : <ReadValue label={field.label} value={text!} />}
    </div>
  );
}

function StageFieldsGrid({ stage, s, currentUser, canEdit, isComplete = false, embedded = false, onBlockedEdit, editAll = false }: { stage: StageItem; s: StageFieldsState; currentUser: string; canEdit: boolean; isComplete?: boolean; embedded?: boolean; onBlockedEdit?: () => void; editAll?: boolean }) {
  // editAll (whole form editable) is controlled by the form card header.
  const stageNo = STAGES.findIndex((item) => item.name === stage.name) + 1;
  const readOnly = !canEdit;
  const ownedByMe = stage.owner === currentUser;
  const riskTier = canEdit && stage.name === "Assessment - Risk & Compliance" ? computeRiskTier(s.values) : null;
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
    <section className={cn(embedded ? "px-8 pb-10 pt-3" : "no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-12 pt-6")} aria-label={`${stage.name} stage`}>
      {/* Body header: short description + a compact meta line (owner / gate /
          status). The title + Edit/Submit live in the form card header. */}
      <div className="min-w-0">
        {STAGE_INTROS[stage.name] ? (
          <p className={cn("leading-6 text-[var(--text-muted)]", embedded ? "text-[14px]" : "max-w-[60ch] text-[15px]")}>{STAGE_INTROS[stage.name]}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[var(--text-muted)]">
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
          {statusBadge}
        </div>
      </div>

      {/* CSS multi-column so fields pack tightly without row-height coupling —
          short values don't leave a gap under their taller row-mate. Long text /
          multi-selects span the full width. */}
      <div className={cn("mt-8 sm:columns-2", embedded ? "gap-x-8" : "gap-x-12")}>
        {s.fields.map((field, index) => {
          // Long text and multi-selects need the full width; the rest pack in columns.
          const wide = ["long", "cards", "chips"].includes(field.kind);
          // Reserve each control's height so switching read ↔ edit doesn't change
          // the row height. The slider (level) is taller than toggles/inputs.
          const reserve = wide ? undefined : field.kind === "level" ? 50 : 40;
          return (
            <div key={field.label} className={cn("min-w-0 break-inside-avoid", wide ? "[column-span:all] pt-2 pb-14" : "mb-10")}>
              <label className="flex items-baseline gap-2 text-[13.5px] font-semibold text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">{stageNo}.{index + 1}</span>
                {field.label}
              </label>
              <div className={cn("mt-2 min-w-0", reserve && !editAll && "flex items-center")} style={reserve && !editAll ? { minHeight: reserve } : undefined}>
                <DocumentField field={field} s={s} readOnly={readOnly} onBlockedEdit={onBlockedEdit} forceEdit={editAll} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Record details modal — the use case's metadata, gates, comments, and activity.
function RecordDetailsSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"details" | "gates" | "comments" | "activity">("details");
  // ponytail: comment list is local prototype state — no persistence.
  const [comments, setComments] = useState(RECORD_COMMENTS);
  const [draft, setDraft] = useState("");
  const addComment = () => {
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [{ by: "You", when: "just now", text }, ...prev]);
    setDraft("");
  };
  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: "details", label: "Details" },
    { key: "gates", label: "Gates", count: GATES.length },
    { key: "comments", label: "Comments", count: comments.length },
    { key: "activity", label: "Activity", count: RECORD_ACTIVITY.length },
  ];
  return (
    <aside className="sheet-in-right flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#ecebea] bg-white">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#ecebea] pl-4 pr-2 pt-2.5">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition",
                  tab === t.key ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {t.label}
                {t.count != null ? (
                  <span
                    className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold tabular-nums"
                    style={tab === t.key
                      ? { background: "color-mix(in srgb, var(--accent) 12%, white)", color: "var(--accent)" }
                      : { background: "var(--surface-muted)", color: "var(--text-muted)" }}
                  >
                    {t.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {tab === "details" ? (
            <dl className="divide-y divide-[#f0efed]">
              {RECORD_DETAILS.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-6 px-5 py-3">
                  <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
                  <dd className="text-right text-[14px] font-semibold text-[var(--text-primary)]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {tab === "gates" ? (
            <div className="divide-y divide-[#f0efed]">
              {GATES.map((gate) => {
                const tone = GATE_TONE[gate.status];
                return (
                  <div key={gate.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
                        <span className="text-[var(--accent)]">{gate.id}</span> {gate.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                        <PersonAvatar name={gate.approver} size={18} /> {gate.approver}
                        <span>·</span>
                        {gate.decided ?? "Pending"}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
                      {gate.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
          {tab === "comments" ? (
            <div className="flex min-h-full flex-col">
              <div className="flex-1 divide-y divide-[#f0efed]">
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-3 px-5 py-3">
                    <PersonAvatar name={c.by} size={26} />
                    <div className="min-w-0">
                      <p className="text-[13px]"><span className="font-semibold text-[var(--text-primary)]">{c.by}</span> <span className="text-[var(--text-muted)]">· {c.when}</span></p>
                      <p className="mt-0.5 text-[13px] leading-5 text-[var(--text-body)]">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 flex min-h-[64px] items-center gap-2 border-t border-[#ecebea] bg-white px-4 py-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  rows={1}
                  placeholder="Add a comment…"
                  className="no-scrollbar max-h-24 min-h-9 flex-1 resize-none rounded-[10px] border border-[#ecebea] bg-[var(--surface-muted)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={addComment}
                  disabled={!draft.trim()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--accent)] text-white transition disabled:opacity-40"
                  aria-label="Post comment"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          ) : null}
          {tab === "activity" ? (
            <div className="divide-y divide-[#f0efed]">
              {RECORD_ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#ecebea] text-[var(--text-muted)]">
                    {ACTIVITY_ICON[a.icon]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{a.title}</p>
                    <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{a.when}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
    </aside>
  );
}

// Two-row page header: back link + profile (top), then the use-case title with
// its ID + owner meta and a details toggle (bottom).
function TopBar({
  currentUser,
  onUserChange,
  lockedOwner,
  onOpenDetails,
  detailsOpen,
  recordName,
}: {
  currentUser: string;
  onUserChange: (user: string) => void;
  detailsOpen?: boolean;
  lockedOwner: string | null;
  onOpenDetails: () => void;
  recordName: string | null;
}) {
  return (
    <header className="flex shrink-0 items-center gap-4 px-5 py-3">
      <Link
        href="/"
        aria-label="Back to home"
        title="Back to home"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[var(--text-label)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={17} />
      </Link>
      <h1 className={cn("font-display min-w-0 flex-1 truncate text-[22px] leading-tight", recordName ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
        {recordName ?? "Untitled use case"}
      </h1>
      <div className="flex shrink-0 items-center gap-6">
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-label)]">Use case ID</div>
          <span className="mt-0.5 inline-block rounded-[6px] bg-[var(--accent-soft)] px-2 py-0.5 text-[12px] font-semibold text-[var(--accent-strong)]">{USE_CASE.id}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-label)]">Use case owner</div>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
            <PersonAvatar name={USE_CASE_OWNER} size={18} /> {USE_CASE_OWNER}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenDetails}
          aria-pressed={detailsOpen}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-[13px] font-medium transition",
            detailsOpen
              ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]",
          )}
        >
          <Info size={15} />
          Details
        </button>
        <ProfileSwitcher currentUser={currentUser} onUserChange={onUserChange} lockedBy={lockedOwner ?? undefined} compact />
      </div>
    </header>
  );
}

// Short chevron labels for the stage path (index-aligned with STAGES).
const SHORT_STAGE_LABELS = [
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

// Horizontal stage path: a chevron/arrow strip, one segment per stage. Completed
// = green (with a check), current = dark, upcoming = light grey. Click to jump.
// Scrolls horizontally inside the form card when it overflows.
function JourneyBar({
  activeIndex,
  completedIndexes,
  onSelect,
}: {
  activeIndex: number;
  completedIndexes: number[];
  onSelect: (index: number) => void;
}) {
  const notch = 14; // arrow depth in px
  // Tooltip is portaled to the body so it isn't clipped by (or scroll-forced on)
  // the horizontally-scrolling strip.
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  return (
    <div className="shrink-0 overflow-hidden border-b border-[#ecebea] px-3 py-2.5">
      <div className="flex items-stretch">
        {STAGES.map((stage, i) => {
          const complete = completedIndexes.includes(i);
          const current = i === activeIndex;
          const first = i === 0;
          const last = i === STAGES.length - 1;
          const leftNotch = first ? 0 : notch;
          const clipPath = last
            ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${leftNotch}px 50%)`
            : `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%, ${leftNotch}px 50%)`;
          const background = complete ? "#1f9d57" : current ? "var(--text-primary)" : "#edefed";
          const color = complete || current ? "#ffffff" : "var(--text-muted)";
          const state = complete ? "Completed" : current ? "Active" : "Upcoming";
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setTip({ text: `${stage.name} · ${state} · ${stage.owner}`, x: Math.max(12, r.left), y: r.bottom });
              }}
              onMouseLeave={() => setTip(null)}
              aria-current={current}
              aria-label={`${stage.name} · ${state} · ${stage.owner}`}
              className={cn(
                "flex h-10 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[13px] font-semibold transition hover:brightness-[0.97]",
                "justify-center",
                complete ? "shrink-0 pr-4" : "min-w-0 flex-1 pr-7",
                first ? "rounded-l-[20px] pl-5" : "-ml-[11px] pl-7",
                last && "rounded-r-[20px]",
              )}
              style={{ clipPath, background, color }}
            >
              {complete ? <Check size={15} strokeWidth={2.5} /> : (SHORT_STAGE_LABELS[i] ?? stage.name)}
            </button>
          );
        })}
        <span aria-hidden className="w-2 shrink-0" />
      </div>
      {tip
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[80] whitespace-nowrap rounded-[8px] bg-[var(--text-primary)] px-3 py-1.5 text-[12px] font-medium text-white shadow-md"
              style={{ left: tip.x, top: tip.y + 8 }}
            >
              {tip.text}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}


// A hookless, read-only field state for a stage — its recorded values are the
// mock suggestions. Cheaper than useStageFields for read-only summaries.
function readOnlyStageState(stage: StageItem): StageFieldsState {
  const fields = stage.rows.map(([label, value]) => buildFieldSpec(label, value));
  const values = Object.fromEntries(fields.map((field) => [field.label, field.suggestion]));
  const noop = () => {};
  return { fields, values, loadingFields: [], setField: noop, suggestField: noop, suggestAll: noop, suggestingAll: false, draftDurationMs: 0, fillNow: noop };
}

// Split stage view (artifact-style): the chat on the left drives the form on the
// right, which fills live as answers land (both share one field state). Returns a
// fragment of two columns so the parent grid lays them side by side. The owner
// can click any field on the right to edit it; non-owners see it read-only.
function SplitStageView({
  stage,
  currentUser,
  prefill,
  isComplete,
  onMarkComplete,
  onEditBlocked,
  onStarted,
}: {
  stage: StageItem;
  currentUser: string;
  prefill: boolean;
  isComplete: boolean;
  onMarkComplete: () => void;
  onEditBlocked: (message: string) => void;
  onStarted?: () => void;
}) {
  const s = useStageFields(stage, prefill);
  const owned = stage.owner === currentUser;
  const bespoke = stage.name in BESPOKE_STAGE_FORMS;
  // Conversational fill runs only on an open stage you own that isn't bespoke.
  const guided = !isComplete && owned && !bespoke;
  // Whole-form edit mode, toggled from the form card header.
  const [editAll, setEditAll] = useState(false);
  // The stage title sits above the description at the top; it collapses into the
  // form header once the form is scrolled.
  const [scrolled, setScrolled] = useState(false);
  // Form panel shows a loading bar while the guided Ideation flow is seeding.
  const [formBusy, setFormBusy] = useState(false);

  // Captured / total — used for submit readiness.
  const capturedDone = s.fields.filter((field) => !isFieldEmpty(s.values[field.label])).length;
  const capturedTotal = s.fields.length;

  // ---- LEFT: the conversation. Guided stages run the fill flow; the rest keep
  // an open, ask-anything composer (locked / bespoke / completed). ----
  let chat: ReactNode;
  if (guided) {
    // Ideation uses the scripted question-card flow; other guided stages keep
    // the conversational paragraph flow.
    chat = stage.name === "Ideation" ? <GuidedQuestions stage={stage} s={s} onStarted={onStarted} onBusyChange={setFormBusy} /> : <ChatPanel stage={stage} s={s} />;
  } else {
    let intro: string;
    let editNote: string | undefined;
    if (!isComplete && !owned) {
      intro = `Hi — I can walk you through the ${stage.name} stage. It's owned by ${stage.owner}, so recording changes needs their profile, but ask me anything about it.`;
      editNote = `Switch to ${stage.owner} up top to edit.`;
    } else if (!isComplete) {
      intro = `Here's the ${stage.name} so far — set the details on the form to the right, then submit.`;
      editNote = "Fill it in on the form panel.";
    } else {
      intro = `The ${stage.name} stage is complete — here's what was captured. Ask me anything about it.`;
      editNote = owned ? "Reopen it on the form panel to make changes." : `${stage.owner} can reopen it to make changes.`;
    }
    chat = <AsideChat stage={stage} intro={intro} editNote={editNote} />;
  }

  // ---- RIGHT: the form/document, filling live. Completed stages show the
  // summary card; owned bespoke stages their custom widgets; else the field grid. ----
  let form: ReactNode;
  if (bespoke && owned && !isComplete) {
    form = (
      <div className="pb-10">
        <StageColumnHeader stage={stage} currentUser={currentUser} />
        <StageContent isComplete={false} stage={stage} />
      </div>
    );
  } else {
    // Open (owned → editable, else locked) OR complete (read-only, reopenable by
    // the owner) — the same field grid, just in the right state.
    form = (
      <StageFieldsGrid
        stage={stage}
        s={s}
        currentUser={currentUser}
        canEdit={guided}
        isComplete={isComplete}
        embedded
        editAll={editAll}
        onBlockedEdit={
          guided
            ? undefined
            : () =>
                onEditBlocked(
                  !owned
                    ? `${stage.name} is owned by ${stage.owner}. Switch to their profile to edit.`
                    : `${stage.name} is complete — use “Reopen to edit” to make changes.`,
                )
        }
      />
    );
  }

  // Submit (owner, open stages). For guided stages it unlocks once every detail
  // is captured and any gate is cleared.
  const showSubmit = owned && !isComplete;
  let submitReady = true;
  let submitHint: string | undefined;
  if (guided) {
    const gate = stageGateReason(stage.name, s.values);
    const allFilled = capturedTotal > 0 && capturedDone === capturedTotal;
    submitReady = allFilled && !gate;
    submitHint = gate ?? (allFilled ? undefined : `${capturedTotal - capturedDone} of ${capturedTotal} details still to capture.`);
  }
  const stageNo = STAGES.findIndex((item) => item.name === stage.name) + 1;

  return (
    <>
      {/* Chat card. */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#ecebea] bg-white">
        <div className="flex min-h-[53px] shrink-0 items-center gap-2 border-b border-[#ecebea] px-4 py-2">
          <Sparkles size={15} className="text-[var(--accent)]" />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">Agent</span>
        </div>
        <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col overflow-hidden">
          {chat}
        </div>
      </section>
      {/* Form card — header carries the stage title + Edit / Submit actions. */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#ecebea] bg-white">
        <div className="flex min-h-[53px] shrink-0 items-center gap-3 border-b border-[#ecebea] px-5 py-2">
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--accent-strong)]">Stage {String(stageNo).padStart(2, "0")}</span>
            {scrolled ? (
              <>
                <span className="mx-1.5 text-[var(--text-muted)]">·</span>
                {stage.name}
              </>
            ) : null}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {isComplete && owned ? (
              <button
                type="button"
                onClick={onMarkComplete}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]"
              >
                <RotateCcw size={13} />
                Reopen
              </button>
            ) : guided ? (
              <button
                type="button"
                onClick={() => setEditAll((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold transition",
                  editAll
                    ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]",
                )}
              >
                {editAll ? <Check size={13} /> : <Pencil size={13} />}
                {editAll ? "Done" : "Edit"}
              </button>
            ) : null}
            {showSubmit ? (
              <button
                type="button"
                onClick={onMarkComplete}
                disabled={!submitReady}
                title={submitReady ? undefined : submitHint}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                <Check size={13} />
                Submit {stage.name === "GTAC" ? "decision" : "stage"}
              </button>
            ) : null}
          </div>
        </div>
        {formBusy ? (
          <div className="h-[3px] w-full shrink-0 overflow-hidden bg-[var(--surface-muted)]">
            <div className="loadbar h-full w-1/3 rounded-full bg-[var(--accent)]" />
          </div>
        ) : null}
        <div
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 12)}
        >
          <h2 className="px-8 pt-6 font-display text-[24px] leading-tight text-[var(--text-primary)]">{stage.name}</h2>
          {form}
        </div>
      </aside>
    </>
  );
}

function suggestionText(suggestion: string | string[]): string {
  return Array.isArray(suggestion) ? suggestion.join(", ") : suggestion;
}

// One-line explainer per stage, shown as the chat's opening message.
const STAGE_INTROS: Record<string, string> = {
  Ideation: "Ideation captures the core idea — the problem, the outcome you want, and who it's for.",
  Qualification: "Qualification does a quick scan for prohibited uses and sets a provisional risk tier.",
  Prioritisation: "Prioritisation weighs value against readiness to decide whether this moves forward now.",
  Triage: "Triage resolves any flags and routes the use case onto the right assessment path.",
  "Assessment - Risk & Compliance": "This assessment reviews data, privacy, and model risks, and sets the conditions to proceed.",
  "Business Case": "The business case lays out cost, benefit, and the recommendation for the GTAC board.",
  GTAC: "GTAC records the board's funding decision and any binding conditions.",
  "Plan & KPI": "Plan & KPI lines up the delivery squad, milestones, and the success metrics to lock.",
  "Solution blue print": "The solution blueprint defines the architecture, guardrails, and integrations.",
  "Solutionise and Production": "Solutionise & Production captures the build evidence and readiness for review.",
  "Monitoring and tracking": "Monitoring & tracking follows drift, value variance, and the post-deploy review.",
  Adoption: "Adoption drives the rollout waves and tracks how uptake is going.",
};

// Fields grouped into themes so the chat asks them in batches with a short
// framing line per group (like a person would). Stages without an entry are
// asked ungrouped. Labels must match the stage's field labels + order.
// Stages auto-chunk their fields into small batches (see stageGroupsFor); no
// hand-tuned theme groups, so new fields are always covered.
const STAGE_FIELD_GROUPS: Record<string, { framing: string; labels: string[] }[]> = {};

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

// Same, but with "or" — for offering choices in prose.
function orList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

// Single-choice fields answer well as pills above the input; multi-selects read
// better woven into the question text.
const SINGLE_OPTION_KINDS = new Set(["level", "segmented", "radio", "select"]);
const MULTI_OPTION_KINDS = new Set(["chips", "cards"]);

// Theme batches for a stage: its defined groups, or — for stages without a
// theme map — auto-chunked into small batches (~3 fields) so the chat never
// asks for a long list in one breath.
function stageGroupsFor(stage: StageItem, fields: FieldSpec[]): FieldGroup[] {
  const defined = STAGE_FIELD_GROUPS[stage.name];
  if (defined) return defined;
  const labels = fields.map((f) => f.label);
  const chunks: string[][] = [];
  for (let i = 0; i < labels.length; i += 3) chunks.push(labels.slice(i, i + 3));
  // The stage intro is already shown as its own opening message, so the first
  // batch needs no framing; later batches get a short connector.
  return chunks.map((chunk, index) => ({ framing: index === 0 ? "" : "Next,", labels: chunk }));
}

// The opening question for a group — a single conversational line (framing +
// the ask). The option hint, if any, is added on its own line by the caller.
function openingQuestion(framing: string, labels: string[]): string {
  const list = joinList(labels.map(humanizeLabel));
  const ask = labels.length === 1 ? `What's the ${list}?` : `Tell me about the ${list} — a sentence or two is plenty.`;
  return framing ? `${framing} ${ask}` : ask;
}

// Varied openers so acknowledgements don't all read "Great — …".
const ACK_OPENERS = ["Got it", "Noted", "Perfect", "Thanks", "Great", "Nice", "Makes sense"];

// The acknowledgement after a group's fields land; `seq` rotates the opener.
function ackFor(labels: string[], seq = 0): string {
  return `${ACK_OPENERS[seq % ACK_OPENERS.length]} — I've got the ${joinList(labels.map(humanizeLabel))} down.`;
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

type ChatMessage = { id: number; role: "assistant" | "user"; text: string; recap?: boolean };

// A chat bubble — assistant (plain text, left), user (accent bubble, right), or a
// recap (a neutral grey block spanning the width, for a Q&A summary).
function MessageBubble({ role, text, recap = false }: { role: "assistant" | "user"; text: string; recap?: boolean }) {
  if (recap) {
    return (
      <div className="bubble-in-left max-w-[85%] whitespace-pre-line py-1 text-[14px] leading-6 text-[var(--text-body)]">
        {text}
      </div>
    );
  }
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      {role === "user" ? (
        <div className="bubble-in-right max-w-[85%] whitespace-pre-line rounded-[12px] bg-[var(--accent)] px-3.5 py-2 text-[14.5px] leading-6 text-white">
          {text}
        </div>
      ) : (
        <div className="bubble-in-left max-w-[92%] whitespace-pre-line py-1 text-[14.5px] leading-6 text-[var(--text-body)]">
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
          rows={2}
          disabled={disabled}
          placeholder={placeholder}
          className="no-scrollbar block max-h-32 min-h-[40px] w-full resize-none bg-transparent text-[14.5px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
        />
        <div className="mt-1 flex items-center justify-between">
          <button
            type="button"
            disabled={disabled}
            aria-label="Add documents (coming soon)"
            title="Add documents — coming soon"
            className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
          {/* One trailing control: mic when empty (coming soon), send once typed. */}
          {value.trim() ? (
            <button
              type="button"
              onClick={onSend}
              disabled={sendDisabled}
              aria-label="Send"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              aria-label="Voice input (coming soon)"
              title="Voice input — coming soon"
              className="grid h-8 w-8 shrink-0 cursor-not-allowed place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
            >
              <Mic size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// A non-guided stage chat (locked / bespoke / completed): the chat stays open so
// every stage keeps its composer. It opens with `intro`, shows an optional
// `footer` (summary / actions), and answers any message with a canned `reply`.
function AsideChat({ stage, intro, editNote, footer }: { stage: StageItem; intro: string; editNote?: string; footer?: ReactNode }) {
  const { scrollRef, contentRef } = useBottomPinnedScroll();
  const data = useMemo(() => readOnlyStageState(stage), [stage]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);
  const replySeq = useRef(0);
  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

  const pushAssistant = (text: string) => setMessages((current) => [...current, { id: bump(), role: "assistant", text }]);
  const pushUser = (text: string) => setMessages((current) => [...current, { id: bump(), role: "user", text }]);
  const sayLines = (lines: string[]) =>
    lines.forEach((line, index) => timers.current.push(window.setTimeout(() => pushAssistant(line), 250 + index * 650)));

  useEffect(() => {
    sayLines([intro]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conversational (read-only) responder: answer about a mentioned field, else a
  // rotating helper line. Editing stays gated (the note explains how).
  function respond(text: string): string {
    const lower = text.toLowerCase();
    const field = data.fields.find((f) =>
      f.label.toLowerCase().split(/[^a-z0-9]+/).some((w) => w.length >= 4 && lower.includes(w)),
    );
    if (field && !isFieldEmpty(data.values[field.label])) {
      const v = data.values[field.label];
      return `${field.label}: ${Array.isArray(v) ? v.join(", ") : v}.${editNote ? ` ${editNote}` : ""}`;
    }
    const generic = [
      `Happy to talk through the ${stage.name} stage — ask about any field and I'll pull it up.`,
      `Here's what I can help with on ${stage.name}: any of its captured details. What would you like to know?`,
      `Ask me anything about ${stage.name}.${editNote ? ` ${editNote}` : ""}`,
    ];
    return generic[replySeq.current++ % generic.length];
  }

  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text) return;
    pushUser(text);
    setInput("");
    sayLines([respond(text)]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div ref={contentRef} className="space-y-3" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          {/* Summary / recap sits on top; the conversation flows below it. */}
          {footer ? <div className="pb-1">{footer}</div> : null}
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

// Monotonic ids for chat message keys — uniqueness is all that's needed.
let chatMsgId = 0;
const bump = () => (chatMsgId += 1);

// ── Scripted, one-question-at-a-time guided flow (used for Ideation) ──

type ScriptQuestion = { text: string; field: string; answer: string };

// The Ideation intake script (from the Figma flow) — each question maps to an
// Ideation field it fills, and carries an example answer (prefilled, editable).
const IDEATION_SCRIPT: ScriptQuestion[] = [
  { text: "Who is the business owner for this idea? Could you share their full name and title?", field: "Business owner", answer: "Dr. Sarah Mitchell — Senior Director, Clinical Operations" },
  { text: "Roughly how many people would be using this day-to-day, and in which teams?", field: "Target users", answer: "~450 users globally — Clinical Operations Managers, CRAs, Clinical Project Managers, and Medical Writers." },
  { text: "Would this roll out at a single site, across a specific region, or globally?", field: "Geography", answer: "Globally." },
  { text: "Where do the source documents currently live — a document management system, shared drive, or somewhere else?", field: "Data sources", answer: "Enterprise CTMS and a document management system (Veeva Vault), plus some legacy protocols on secure SharePoint." },
  { text: "Do these documents contain any patient-level, genomic, or personally identifiable information, or are they document-level content only?", field: "Data sensitivity", answer: "Primarily document-level content only — no patient-level data or PII, though some sensitive study design details need secure handling." },
  { text: "What's the core AI capability you're expecting — summarization, retrieval Q&A, classification?", field: "AI capability", answer: "LLM summarization with retrieval Q&A over the protocol documents." },
  { text: "Could the outputs ever feed into a regulated or compliance-critical process — such as a GxP submission or regulatory review?", field: "GxP impact", answer: "Yes — they support GxP-regulated clinical operations, so human review and approval are mandatory before any compliance-critical use." },
  { text: "Do you have a target timeline in mind for delivery?", field: "Timeline", answer: "Around 6 months." },
  { text: "And is there a budget envelope for this work?", field: "Budget", answer: "~$750K." },
];

// Opening exchange shown before the follow-up questions (Ideation): the idea the
// user described on the Create page, then the AI's bridge into the follow-ups.
const IDEATION_SEED: { role: "assistant" | "user"; text: string }[] = [
  { role: "user", text: "We want to build an AI assistant that helps our Clinical Operations team summarize clinical trial protocols. Today the team manually reads long protocol documents to pull out objectives, eligibility criteria, endpoints and safety information — hours per protocol, and often inconsistent. The solution should generate a concise summary and let users ask follow-up questions. The idea is called Clinical Trial Protocol Summarizer." },
  { role: "assistant", text: "That's really helpful — just a few more things to round this out!\n\nA few quick follow-ups:" },
];
// Fields the opening idea description already establishes (filled up front) —
// including the ones the follow-up questions don't cover, so the stage can be
// submitted once the flow is done.
const IDEATION_SEED_FIELDS = ["Idea name", "Problem statement", "Objective", "AI capability", "Business function"];

// The question script for a stage: Ideation's hand-authored flow, otherwise one
// question per still-relevant field.
function scriptFor(stage: StageItem, fields: FieldSpec[]): ScriptQuestion[] {
  if (stage.name === "Ideation") return IDEATION_SCRIPT.filter((q) => fields.some((f) => f.label === q.field));
  return fields.map((f) => ({ text: `What's the ${humanizeLabel(f.label)}?`, field: f.label, answer: suggestionText(f.suggestion) }));
}

// The follow-up question card (replaces the free-text composer for guided
// stages): the current question, a pager, and an inline answer + Skip.
function QuestionCard({
  question,
  index,
  total,
  value,
  onChange,
  onSubmit,
  onSkip,
  onPrev,
  onNext,
  onClose,
}: {
  question: string;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div className="shrink-0 p-3">
      <div className="rounded-[14px] border border-[#e7e5e4] bg-white p-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold leading-6 text-[var(--text-primary)]">{question}</p>
          <div className="flex shrink-0 items-center gap-1 text-[13px] font-medium tabular-nums text-[var(--text-muted)]">
            <button type="button" onClick={onPrev} disabled={index === 0} aria-label="Previous question" className="grid h-6 w-6 place-items-center rounded-[6px] transition hover:bg-[var(--surface-muted)] disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            {index + 1} of {total}
            <button type="button" onClick={onNext} disabled={index === total - 1} aria-label="Next question" className="grid h-6 w-6 place-items-center rounded-[6px] transition hover:bg-[var(--surface-muted)] disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="ml-0.5 grid h-6 w-6 place-items-center rounded-[6px] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[var(--surface-muted)] px-2.5 py-1.5">
          <Pencil size={14} className="shrink-0 text-[var(--text-muted)]" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Write answer here"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          {value.trim() ? (
            <button type="button" onClick={onSubmit} className="shrink-0 rounded-[8px] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-strong)]">
              Save
            </button>
          ) : (
            <button type="button" onClick={onSkip} className="shrink-0 rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)]">
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Guided flow driven by a question script: asks one question at a time in a
// QuestionCard, records each answer into the shared field state, and keeps a
// running transcript above. Once through (or dismissed), it hands off to a plain
// composer so the user can still tweak details conversationally.
function GuidedQuestions({ stage, s, onStarted, onBusyChange }: { stage: StageItem; s: StageFieldsState; onStarted?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const questions = useMemo(() => scriptFor(stage, s.fields), [stage, s.fields]);
  const fieldByLabel = useMemo(() => new Map(s.fields.map((f) => [f.label, f])), [s.fields]);

  const [idx, setIdx] = useState(0);
  // Answers prefilled with each question's example — editable, or Skip to clear.
  const [answers, setAnswers] = useState<Record<number, string>>(() => Object.fromEntries(questions.map((q, i) => [i, q.answer])));
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // seed = opening exchange (normal composer); questions = the card flow; done = wrap-up.
  const [phase, setPhase] = useState<"seed" | "questions" | "done">("seed");
  const done = phase === "done";
  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useBottomPinnedScroll();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pushAssistant = (text: string) => setMessages((m) => [...m, { id: bump(), role: "assistant", text }]);
  const pushUser = (text: string) => setMessages((m) => [...m, { id: bump(), role: "user", text }]);

  // The agent "thinks" between the user's idea and its bridge reply.
  const [thinking, setThinking] = useState(false);

  // Show the user's idea, then a thinking beat, then the bridge into the
  // follow-ups; finally fill the fields the description already establishes.
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  useEffect(() => {
    onBusyChange?.(true);
    // 1. the idea the user described (from Create) appears first.
    timers.current.push(window.setTimeout(() => setMessages((cur) => [...cur, { id: bump(), role: "user", text: IDEATION_SEED[0].text }]), 300));
    // 2. the agent thinks…
    timers.current.push(window.setTimeout(() => setThinking(true), 600));
    // 3. …then replies with the bridge into the follow-ups.
    timers.current.push(
      window.setTimeout(() => {
        setThinking(false);
        setMessages((cur) => [...cur, { id: bump(), role: "assistant", text: IDEATION_SEED[1].text }]);
      }, 1900),
    );
    // 4. fill the fields the idea establishes + start the question flow.
    timers.current.push(
      window.setTimeout(() => {
        onStarted?.();
        IDEATION_SEED_FIELDS.forEach((label, i) => {
          const f = fieldByLabel.get(label);
          if (f) s.fillNow(label, f.suggestion, 200 + i * 200);
        });
        setPhase("questions");
        onBusyChange?.(false);
      }, 2100),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-question Q&A stays hidden until every question is done, then appends
  // below the seed exchange.
  function finish(nextAnswers: Record<number, string>, nextSkipped: Record<number, boolean>) {
    // All answered Q&A in one recap message.
    const recap = questions
      .map((q, i) => (nextSkipped[i] || !(nextAnswers[i] ?? "").trim() ? null : `Q: ${q.text}\nA: ${nextAnswers[i].trim()}`))
      .filter(Boolean)
      .join("\n\n");
    const transcript: ChatMessage[] = [];
    if (recap) transcript.push({ id: bump(), role: "user", text: recap });
    transcript.push({ id: bump(), role: "assistant", text: "That's everything — take a look at the form on the right and hit Submit when it's ready." });
    setMessages((m) => [...m, ...transcript]);
    setPhase("done");
  }

  function advance(nextAnswers: Record<number, string>, nextSkipped: Record<number, boolean>) {
    if (idx >= questions.length - 1) finish(nextAnswers, nextSkipped);
    else setIdx(idx + 1);
  }

  function saveCurrent() {
    const q = questions[idx];
    const answer = (answers[idx] ?? "").trim();
    if (!answer) return;
    onStarted?.();
    if (fieldByLabel.has(q.field)) s.fillNow(q.field, answer, 300);
    const nextSkipped = { ...skipped, [idx]: false };
    setSkipped(nextSkipped);
    advance(answers, nextSkipped);
  }

  function skipCurrent() {
    const nextSkipped = { ...skipped, [idx]: true };
    setSkipped(nextSkipped);
    advance(answers, nextSkipped);
  }

  // Post-flow: free-text edits, re-parsed into fields (same as the old chat).
  function sendEdit() {
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setInput("");
    const fills = extractStageFields(text, s.fields, []);
    fills.forEach((fill, i) => s.fillNow(fill.label, fill.value, 300 + i * 200));
    pushAssistant(
      fills.length
        ? `Done — updated the ${joinList(fills.map((f) => humanizeLabel(f.label)))}. Anything else, or submit on the form.`
        : "Sure — tell me the field and the new value, or edit it on the form. Submit when it looks right.",
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <div ref={contentRef} className="space-y-3" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          {messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} text={message.text} recap={message.recap} />
          ))}
          {thinking ? (
            <div className="bubble-in-left flex items-center gap-2 py-1">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)]">
                <LoaderCircle size={14} className="animate-spin text-[var(--accent)]" />
              </span>
              <span className="text-[14px] font-medium text-[var(--text-muted)]">Thinking…</span>
            </div>
          ) : null}
        </div>
      </div>
      {phase === "questions" ? (
        <QuestionCard
          question={questions[idx].text}
          index={idx}
          total={questions.length}
          value={answers[idx] ?? ""}
          onChange={(v) => setAnswers((a) => ({ ...a, [idx]: v }))}
          onSubmit={saveCurrent}
          onSkip={skipCurrent}
          onPrev={() => setIdx((i) => Math.max(0, i - 1))}
          onNext={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
          onClose={() => {
            setPhase("done");
            pushAssistant("No problem — fill in whatever's left on the form and submit when ready.");
          }}
        />
      ) : (
        <ChatComposer
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSend={sendEdit}
          sendDisabled={!input.trim()}
          placeholder={done ? "Ask me to change any detail, or submit on the form…" : "Type a message…"}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendEdit();
            }
          }}
        />
      )}
    </div>
  );
}

// Conversational assistant: asks a stage's fields in themed batches (one framing
// question per group), reads the user's paragraph reply, extracts the values it
// can (mocked keyword/option matching), then follows up only on the gaps. Drives
// the same field-state instance as the document, so both stay in sync.
function ChatPanel({ stage, s }: { stage: StageItem; s: StageFieldsState }) {
  // Theme batches for the stage. Stages without a defined map are asked as one
  // batch (everything at once); gaps are followed up either way.
  const groups: FieldGroup[] = useMemo(() => stageGroupsFor(stage, s.fields), [stage, s.fields]);

  const fieldByLabel = useMemo(() => new Map(s.fields.map((f) => [f.label, f])), [s.fields]);

  // Fields already filled (a reopened stage) count as handled up front.
  const initialHandled = s.fields.filter((f) => !isFieldEmpty(s.values[f.label])).map((f) => f.label);

  // Remaining, still-askable labels of a group given what's handled.
  const groupRemaining = (group: FieldGroup, handledNow: string[]) =>
    group.labels.filter((label) => fieldByLabel.has(label) && !handledNow.includes(label));
  const firstOpenGroup = (handledNow: string[]) => groups.find((group) => groupRemaining(group, handledNow).length > 0);

  // Option sets read as a hint on their own line — no pills/tags.
  function optionHint(remaining: string[]): string {
    const field = remaining
      .map((label) => fieldByLabel.get(label))
      .find((f) => f && (SINGLE_OPTION_KINDS.has(f.kind) || MULTI_OPTION_KINDS.has(f.kind)) && f.options?.length);
    if (!field?.options) return "";
    const verb = MULTI_OPTION_KINDS.has(field.kind) ? "mention any of" : "go with";
    return `\nFor the ${humanizeLabel(field.label)}, you can ${verb} ${orList(field.options)}.`;
  }

  // The combined question for a group: the open opener, or a lighter follow-up.
  // Option choices are woven in as a hint on their own line (no pills).
  function groupQuestion(group: FieldGroup, remaining: string[], followup: boolean): string {
    const list = joinList(remaining.map(humanizeLabel));
    const base = !followup ? openingQuestion(group.framing, remaining) : `Thanks. Now the ${list}.`;
    return base + optionHint(remaining);
  }

  const ghostReply = (labels: string[]) => ghostFor(labels, fieldByLabel);

  const [handled, setHandled] = useState<string[]>(initialHandled);
  const [done, setDone] = useState(() => !firstOpenGroup(initialHandled));
  // When the conversation ends but a checklist still gates the stage, we pause
  // in a conversational "gating" state instead of showing the summary.
  const [gating, setGating] = useState(false);
  const [input, setInput] = useState("");
  // Framing of the group we've already followed up on once — so an unparseable
  // reply escalates to auto-draft instead of looping forever.
  const followedUpRef = useRef<string | null>(null);
  // Rotates acknowledgement openers so replies don't all start with "Great".
  const ackSeq = useRef(0);

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

  // Wrap up — but if a checklist still gates the stage, ask the user to clear it
  // conversationally first (no widget) rather than showing the summary.
  function finish() {
    const g = stageGateReason(stage.name, s.values);
    if (g) {
      setGating(true);
      pushAssistant(`${g}\nTell me which ones are signed off, or say "all cleared".`);
    } else {
      sayLines(["That's everything I need. Take a quick look at the form on the right — everything should be filled in. When it looks right, hit Submit at the bottom."], () => setDone(true));
    }
  }

  // Open with the first question (the stage intro already shows in the header /
  // summary, so the chat doesn't repeat it).
  useEffect(() => {
    const first = firstOpenGroup(initialHandled);
    sayLines([first ? groupQuestion(first, groupRemaining(first, initialHandled), false) : "Everything's already filled — open the document to review."]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send a reply — the typed input, or an override (the accepted ghost reply).
  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text) return;

    // Post-finish: the flow is done but the chat stays open so the user can
    // still tweak details here. Re-parse against every field and update matches.
    if (done) {
      pushUser(text);
      setInput("");
      const fills = extractStageFields(text, s.fields, []);
      fills.forEach((fill, index) => s.fillNow(fill.label, fill.value, 450 + index * 250));
      sayLines([
        fills.length
          ? `Done — updated the ${joinList(fills.map((fill) => humanizeLabel(fill.label)))}. Anything else, or submit on the form when it's ready.`
          : "Sure — tell me the field and the new value, or edit it directly on the form. Submit on the right when it looks right.",
      ]);
      return;
    }

    // Gating reply: clear compliance checks conversationally.
    if (gating) {
      pushUser(text);
      setInput("");
      const lower = text.toLowerCase();
      const already = Array.isArray(s.values["Compliance checks"]) ? (s.values["Compliance checks"] as string[]) : [];
      const clearAll = /\ball\b|everything|every|both|done|cleared|sign(ed)?[- ]?off|proceed|good to go/.test(lower);
      const named = COMPLIANCE_REQS.filter((req) => lower.includes(req.toLowerCase()) || lower.includes(req.split("/")[0].toLowerCase()));
      const cleared = clearAll ? [...COMPLIANCE_REQS] : Array.from(new Set([...already, ...named]));
      s.setField("Compliance checks", cleared);
      const stillOpen = COMPLIANCE_REQS.filter((req) => !cleared.includes(req));
      if (stillOpen.length) {
        sayLines([`Thanks. Still open: ${joinList(stillOpen)}. Let me know once those are signed off.`]);
      } else {
        setGating(false);
        sayLines(["Perfect — every compliance check is cleared. Review the form on the right and hit Submit when it looks right."], () => setDone(true));
      }
      return;
    }

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
    const ack = filledLabels.length ? ackFor(filledLabels, ackSeq.current++) : "Thanks for that.";

    // Group finished → ack, then the next group's opener (or finish).
    if (remaining.length === 0) {
      setHandled(handledAfterFills);
      const next = firstOpenGroup(handledAfterFills);
      if (next) followedUpRef.current = null;
      sayLines(next ? [ack, groupQuestion(next, groupRemaining(next, handledAfterFills), false)] : [ack], next ? undefined : finish);
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
      sayLines(next ? [draftLine, groupQuestion(next, groupRemaining(next, drafted), false)] : [draftLine], next ? undefined : finish);
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
  const ghost = !gating && activeGroup ? ghostReply(groupRemaining(activeGroup, handled)) : "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div ref={contentRef} className="space-y-3" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
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
        placeholder={done ? "Ask me to change any detail, or submit on the form…" : gating ? "Reply to clear the remaining checks…" : ghost || "Describe it in your own words…"}
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
      <span>Capturing…</span>
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

  if (spec.kind === "date") {
    return <DateField hideHeader label={spec.label} value={text} onChange={onChange} />;
  }

  // Single-select option fields (dropdowns, toggles, radios) all edit as one
  // consistent single-line dropdown — no wrapping, matching read-value height.
  if (spec.kind === "select" || spec.kind === "segmented" || spec.kind === "radio") {
    return <SearchableSelect hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
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
    <div className="px-7 py-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[13.5px] font-semibold leading-5 text-[var(--text-primary)]">{label}</span>
        {hint ? <span className="text-[11.5px] leading-4 text-[var(--text-muted)]">{hint}</span> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MandateBanner() {
  return (
    <div className="rounded-[10px] border border-[#cfe6d8] bg-gradient-to-r from-[#eef6f0] to-[#f6faf7] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#15803d] text-white">
          <Check size={19} strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#15803d]">Funded · GTAC approved</div>
          <div className="font-display text-[21px] leading-6 text-[var(--text-primary)]">GBP 180k approved</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["2 binding conditions", "Go-live Q3 2026", "Standard tier"].map((chip) => (
          <span
            key={chip}
            className="whitespace-nowrap rounded-full border border-[#cfe6d8] bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#25603f]"
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
  // New field vocabulary.
  if (lowerLabel.includes("business value") || lowerLabel.includes("feasibility") || lowerLabel.includes("strategic alignment")) return ["1/5", "2/5", "3/5", "4/5", "5/5"];
  if (lowerLabel.includes("complexity")) return ["Low", "Medium", "High"];
  if (lowerLabel.includes("oversight")) return ["Always", "On exceptions", "None"];
  if (lowerLabel.includes("sensitivity")) return ["Public", "Internal", "Confidential", "Restricted"];
  if (lowerLabel.includes("decision impact")) return ["Informational", "Influences decisions", "Makes decisions"];
  if (lowerLabel.includes("duplication")) return ["Not a duplicate", "Possible overlap", "Duplicate"];
  if (lowerLabel.includes("go / no-go") || lowerLabel.includes("recommendation")) return value.length > 40 ? null : ["GO", "Conditional GO", "NO-GO"];

  return null;
}

function isChecklistField(label: string) {
  const lowerLabel = label.toLowerCase();
  return ["controls", "conditions", "scope", "sources", "guardrails", "integrations", "evidence", "interventions", "metrics", "milestones", "improvements", "pipeline", "compliance checks"].some((token) => lowerLabel.includes(token));
}

function listItems(value: string) {
  return value
    .split(/\s*(?:;|,|->)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

