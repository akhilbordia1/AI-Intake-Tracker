"use client";

import { USE_CASE } from "@/data/document-workflow-form-schema";
import { cn } from "@/lib/cn";
import { ArrowLeft, Ban, Bell, Check, ChevronLeft, ChevronRight, CornerUpLeft, Lock, MoreHorizontal, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";

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

// Stages completed by the requester in the self-service portal — read-only here.
// ponytail: single list; confirm the exact set against the governance flow doc.
const PORTAL_STAGES = new Set(["Intake"]);

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
  const [dialogMode, setDialogMode] = useState<null | "reject" | "sendback">(null);

  const currentStage = STAGES[stageIndex] ?? STAGES[0];
  const isCurrentComplete = completedStageIndexes.includes(stageIndex);
  // Role-based: you can only edit / complete / decide on a stage your profile owns.
  const canComplete = currentStage.owner === currentUser;
  // The chat + form split renders for every open (non-complete) stage — owned or
  // not. Bespoke stages (e.g. Plan) keep their own form + the side panel.
  // When you don't own the stage, the form is read-only and the chat points you
  // to the owner (with a one-click profile switch).
  const isOpenStage = !isCurrentComplete && !BESPOKE_STAGE_FORMS[currentStage.name];
  const stageOwned = currentStage.owner === currentUser;

  const rejectedIndexes = rejections.map((rejection) => rejection.index);
  const returnedIndexes = kickbacks.map((kickback) => kickback.to);
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

  function confirmReject(reason: string) {
    setRejections((current) => [...current.filter((r) => r.index !== stageIndex), { index: stageIndex, reason, by: currentUser }]);
    setCompletedStageIndexes((current) => current.filter((index) => index !== stageIndex));
    setDialogMode(null);
  }

  // Send the record back to an earlier stage with a note. That stage reopens
  // (needs revision), the note rides along, and we jump the user there.
  function confirmSendBack(to: number, reason: string) {
    setKickbacks((current) => [...current.filter((k) => k.to !== to), { to, from: stageIndex, reason, by: currentUser }]);
    setCompletedStageIndexes((current) => current.filter((index) => index !== to));
    setRejections((current) => current.filter((rejection) => rejection.index !== to));
    setDialogMode(null);
    selectStage(to);
  }

  function clearCurrentStatus() {
    setKickbacks((current) => current.filter((kickback) => kickback.to !== stageIndex));
    setRejections((current) => current.filter((rejection) => rejection.index !== stageIndex));
  }

  const stagePath = (
    <StagePath
      activeIndex={stageIndex}
      completedIndexes={completedStageIndexes}
      rejectedIndexes={rejectedIndexes}
      returnedIndexes={returnedIndexes}
      isCurrentComplete={isCurrentComplete}
      canComplete={canComplete}
      canDecide={canComplete}
      activeOwner={currentStage.owner}
      onMarkComplete={toggleCurrentStageComplete}
      onStageChange={selectStage}
      onReject={() => setDialogMode("reject")}
      onSendBack={() => setDialogMode("sendback")}
    />
  );

  const rightHeader = (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Use Case ID</span>
        <span className="inline-block rounded-[6px] bg-[var(--accent-soft)] px-2 py-0.5 text-[13px] font-semibold tracking-[0.02em] text-[var(--accent-strong)]">
          {USE_CASE.id}
        </span>
      </div>
      <ProfileSwitcher currentUser={currentUser} onUserChange={setCurrentUser} />
    </div>
  );

  // Guided fill applies only to an open stage you own; every other stage still
  // renders the split (chat persists) but read-only / bespoke on the right.
  const guided = isOpenStage && stageOwned;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--surface-muted)] text-[var(--text-primary)]" style={RECORD_THEME}>
      {/* Chat (left, with doc title); the right column stacks the use-case bar,
          stage-path, stage header, and form. Present on every stage. */}
      <section
        className="grid min-h-0 flex-1 grid-cols-[minmax(0,400px)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] bg-white"
        aria-label="Use case content"
      >
        {guided ? (
          <ChatStageLayout
            key={currentStage.name}
            stage={currentStage}
            currentUser={currentUser}
            prefill={dataStageIndexes.includes(stageIndex)}
            statusNote={statusNote}
            canClear={canComplete}
            onClearStatus={clearCurrentStatus}
            stagePath={stagePath}
            rightHeader={rightHeader}
            canEdit={stageOwned}
            onSwitchToOwner={() => setCurrentUser(currentStage.owner)}
            onMarkComplete={toggleCurrentStageComplete}
          />
        ) : (
          <ReadOnlyStageSplit
            key={currentStage.name}
            stage={currentStage}
            currentUser={currentUser}
            isComplete={isCurrentComplete}
            prefill={dataStageIndexes.includes(stageIndex)}
            statusNote={statusNote}
            canClear={canComplete}
            onClearStatus={clearCurrentStatus}
            stagePath={stagePath}
            rightHeader={rightHeader}
            onSwitchToOwner={() => setCurrentUser(currentStage.owner)}
            onMarkComplete={toggleCurrentStageComplete}
          />
        )}
      </section>

      {dialogMode ? (
        <StageActionDialog
          mode={dialogMode}
          stageName={currentStage.name}
          priorStages={STAGES.slice(0, stageIndex).map((stage, index) => ({ index, name: stage.name }))}
          onCancel={() => setDialogMode(null)}
          onReject={confirmReject}
          onSendBack={confirmSendBack}
        />
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

// Editable stages own their identity + toolbar; complete / bespoke stages use
// the plain header + content pair.
function StageWorkspace({
  stage,
  currentUser,
  isComplete,
  prefill,
  statusNote,
  canClear,
  onClearStatus,
}: {
  stage: StageItem;
  currentUser: string;
  isComplete: boolean;
  prefill: boolean;
  statusNote: StatusNote | null;
  canClear: boolean;
  onClearStatus: () => void;
}) {
  // Owner reopened this stage (marked it incomplete) → editable again, even for
  // portal stages. Bespoke stages fall through to their own editable form.
  const editable = !isComplete && stage.owner === currentUser && !BESPOKE_STAGE_FORMS[stage.name];

  let body: ReactNode;
  if (editable) {
    body = <EditableStage key={stage.name} stage={stage} currentUser={currentUser} prefill={prefill} />;
  } else if (PORTAL_STAGES.has(stage.name)) {
    // Self-service portal stages are completed by the requester elsewhere.
    body = <PortalStage stage={stage} currentUser={currentUser} />;
  } else if (!isComplete && stage.owner !== currentUser) {
    // Role gate: an open stage you don't own is locked (read-only) for you.
    body = <LockedStage stage={stage} currentUser={currentUser} />;
  } else {
    body = (
      <>
        <StageColumnHeader stage={stage} currentUser={currentUser} />
        <StageContent isComplete={isComplete} stage={stage} />
      </>
    );
  }

  return (
    <>
      {statusNote ? <StageStatusBanner note={statusNote} canClear={canClear} onClear={onClearStatus} /> : null}
      {body}
    </>
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

function LockedStage({ stage, currentUser }: { stage: StageItem; currentUser: string }) {
  const fields = stage.rows.map(([label, value]) => buildFieldSpec(label, value));
  const noop = () => {};

  return (
    <>
      <StageColumnHeader
        stage={stage}
        currentUser={currentUser}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6d4b8] bg-[#f6f0e6] px-2.5 py-1 text-[11px] font-semibold text-[#a15c11]">
            <Lock size={11} />
            Locked
          </span>
        }
      />
      <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 pt-4" aria-label={`${stage.name} stage (locked)`}>
        <div className="pt-1">
          {fields.map((field) => {
            const singleLine = !["cards", "chips", "long"].includes(field.kind);
            const empty: string | string[] = field.kind === "cards" || field.kind === "chips" ? [] : "";
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
                <div className={cn("min-w-0", singleLine && "flex min-h-9 items-center")} aria-disabled>
                  <div className="pointer-events-none w-full min-w-0 opacity-55">
                    <StageField spec={field} value={empty} onChange={noop} onSuggest={noop} />
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

// Portal-owned stage: filled by the requester in the self-service portal, so
// this tool shows the submitted values read-only with a clear source note.
function PortalStage({ stage, currentUser }: { stage: StageItem; currentUser: string }) {
  return (
    <>
      <StageColumnHeader
        stage={stage}
        currentUser={currentUser}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-label)]">
            <Lock size={11} />
            Self-service portal · read-only
          </span>
        }
      />
      <StageContent isComplete stage={stage} />
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

// Editable stage header: Stage Owner + name (left); risk tier when it's yours,
// a Locked badge when it isn't (right).
function EditableStageHeader({ stage, currentUser, s, canEdit }: { stage: StageItem; currentUser: string; s: StageFieldsState; canEdit: boolean }) {
  const ownedByMe = stage.owner === currentUser;
  const riskTier = canEdit && stage.name === "Assess" ? computeRiskTier(s.values) : null;
  return (
    <div className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-[#ecebea] px-7 py-2">
      <div className="flex items-center gap-2 text-[13px] leading-5">
        <span className="text-[var(--text-label)]">Stage Owner</span>
        <PersonAvatar name={stage.owner} size={22} highlight={ownedByMe} />
        <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{stage.owner}</span>
      </div>
      {!canEdit ? (
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
      ) : null}
    </div>
  );
}

// Only free-text inputs show the "Generating…" loader; choice + currency fields just fill.
const LOADER_KINDS = new Set(["text", "long"]);

function StageFieldsGrid({ stage, s, readOnly = false }: { stage: StageItem; s: StageFieldsState; readOnly?: boolean }) {
  return (
    <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 pt-4" aria-label={`${stage.name} stage form`}>
      <div className="pt-1">
        {s.fields.map((field) => {
          const singleLine = !["cards", "chips", "long"].includes(field.kind);
          const loading = s.loadingFields.includes(field.label) && LOADER_KINDS.has(field.kind);
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
              <div className={cn("min-w-0", singleLine && "flex min-h-9 items-center")} aria-disabled={readOnly || undefined}>
                <div className={cn("relative w-full min-w-0", readOnly && "pointer-events-none opacity-55")}>
                  <StageField
                    spec={field}
                    value={s.values[field.label]}
                    onChange={(value) => s.setField(field.label, value)}
                    onSuggest={() => s.suggestField(field)}
                  />
                  {/* Overlay keeps the field's exact height, so it never resizes. */}
                  {loading ? <FieldGenerating tall={field.kind === "long"} /> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Identity header + field grid — the form half of an editable stage. Read-only
// when the current user doesn't own the stage.
function StageFormBody({ stage, currentUser, s, canEdit = true }: { stage: StageItem; currentUser: string; s: StageFieldsState; canEdit?: boolean }) {
  return (
    <>
      <EditableStageHeader stage={stage} currentUser={currentUser} s={s} canEdit={canEdit} />
      <StageFieldsGrid stage={stage} s={s} readOnly={!canEdit} />
    </>
  );
}

// Plain editable stage (no chat) — fallback path in StageWorkspace.
function EditableStage({ stage, currentUser, prefill = false }: { stage: StageItem; currentUser: string; prefill?: boolean }) {
  const s = useStageFields(stage, prefill);
  return <StageFormBody stage={stage} currentUser={currentUser} s={s} />;
}

// Left panel header: back link + doc title, then the stage + fill count.
// `s` is omitted for read-only stages, where the fill count doesn't apply.
function ChatHeader({ stage, s }: { stage: StageItem; s?: StageFieldsState }) {
  const filled = s ? s.fields.filter((field) => !isFieldEmpty(s.values[field.label])).length : 0;
  return (
    <>
      <div className="shrink-0 border-b border-[#ecebea] px-4 py-3">
        <Link
          href="/"
          className="inline-flex h-8 items-center gap-2 rounded-[8px] pr-3 text-[13px] font-medium text-[var(--text-label)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <p className="mt-1 font-display text-[24px] leading-tight text-[var(--text-primary)]">{USE_CASE.name}</p>
      </div>
      <div className="flex flex-1 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
          <Sparkles size={14} className="text-[var(--accent)]" />
          {stage.name}
        </div>
        {s ? (
          <span className="text-[11.5px] text-[var(--text-muted)]">
            {filled} / {s.fields.length} filled
          </span>
        ) : null}
      </div>
    </>
  );
}

// Shown in place of the guided chat when the stage isn't owned by the current
// user — points them to the owner, with a one-click switch.
function LockedChatPanel({ stage, onSwitchToOwner }: { stage: StageItem; onSwitchToOwner: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="max-w-[85%] rounded-[12px] border border-[#ecebea] bg-white px-3 py-2 text-[13px] leading-5 text-[var(--text-body)]">
          This stage is owned by <span className="font-semibold text-[var(--text-primary)]">{stage.owner}</span>. Switch to their profile to fill it in.
        </div>
        <button
          type="button"
          onClick={onSwitchToOwner}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--accent-strong)] transition hover:bg-[#daedf3]"
        >
          <PersonAvatar name={stage.owner} size={16} />
          Switch to {stage.owner}
        </button>
      </div>
      <div className="shrink-0 border-t border-[#ecebea] p-3">
        <div className="flex items-center gap-2 rounded-[10px] border border-[#e7e5e4] bg-[#f5f5f4] px-2.5 py-2 text-[13px] text-[var(--text-muted)]">
          Switch to {stage.owner} to chat
        </div>
      </div>
    </div>
  );
}

// Read-only info chat, shown for completed / bespoke stages where the guided
// fill flow doesn't apply — keeps the chat panel present across every stage.
// When the stage is active and yours, offers a Mark Complete action to proceed.
function InfoChatAside({ message, onMarkComplete }: { message: string; onMarkComplete?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="max-w-[85%] rounded-[12px] border border-[#ecebea] bg-white px-3 py-2 text-[13px] leading-5 text-[var(--text-body)]">
          {message}
        </div>
        {onMarkComplete ? (
          <button
            type="button"
            onClick={onMarkComplete}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#249a57] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#1f7a46]"
          >
            <Check size={14} />
            Mark complete &amp; go to next stage
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Picks the right left-panel chat for a non-guided stage.
function StageChatAside({ stage, isComplete, owned, onSwitchToOwner, onMarkComplete }: { stage: StageItem; isComplete: boolean; owned: boolean; onSwitchToOwner: () => void; onMarkComplete: () => void }) {
  if (!isComplete && !owned) return <LockedChatPanel stage={stage} onSwitchToOwner={onSwitchToOwner} />;
  const canComplete = owned && !isComplete;
  return (
    <InfoChatAside
      message={
        isComplete
          ? `The ${stage.name} stage is complete. Its recorded answers are shown on the right.`
          : `Review and edit the ${stage.name} details on the right, then mark it complete to move on.`
      }
      onMarkComplete={canComplete ? onMarkComplete : undefined}
    />
  );
}

// Non-guided stage in the same 2-col × 2-row split — chat aside (left), the
// stage's own read-only / bespoke content (right). Keeps the chat persistent.
function ReadOnlyStageSplit({
  stage,
  currentUser,
  isComplete,
  prefill,
  statusNote,
  canClear,
  onClearStatus,
  stagePath,
  rightHeader,
  onSwitchToOwner,
  onMarkComplete,
}: {
  stage: StageItem;
  currentUser: string;
  isComplete: boolean;
  prefill: boolean;
  statusNote: StatusNote | null;
  canClear: boolean;
  onClearStatus: () => void;
  stagePath: ReactNode;
  rightHeader: ReactNode;
  onSwitchToOwner: () => void;
  onMarkComplete: () => void;
}) {
  const owned = stage.owner === currentUser;
  return (
    <>
      <div className="flex min-w-0 flex-col border-b border-r border-[#ecebea] bg-[var(--surface-muted)]">
        <ChatHeader stage={stage} />
      </div>
      <div className="flex min-w-0 flex-col justify-center border-b border-[#ecebea] bg-white">
        {rightHeader}
        {stagePath}
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#ecebea] bg-[var(--surface-muted)]">
        <StageChatAside stage={stage} isComplete={isComplete} owned={owned} onSwitchToOwner={onSwitchToOwner} onMarkComplete={onMarkComplete} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white">
        <StageWorkspace
          stage={stage}
          currentUser={currentUser}
          isComplete={isComplete}
          prefill={prefill}
          statusNote={statusNote}
          canClear={canClear}
          onClearStatus={onClearStatus}
        />
      </div>
    </>
  );
}

// Editable stage split: full-bleed chat (left) fills the form (right). Rendered
// into a 2-col × 2-row grid so the header row's height is shared — the left and
// right header dividers land on the same line and connect at the vertical
// divider (matches the design). Both halves share one field-state instance.
// When the stage isn't owned, the form is read-only and the chat points to the owner.
function ChatStageLayout({
  stage,
  currentUser,
  prefill,
  statusNote,
  canClear,
  onClearStatus,
  stagePath,
  rightHeader,
  canEdit,
  onSwitchToOwner,
  onMarkComplete,
}: {
  stage: StageItem;
  currentUser: string;
  prefill: boolean;
  statusNote: StatusNote | null;
  canClear: boolean;
  onClearStatus: () => void;
  stagePath: ReactNode;
  rightHeader: ReactNode;
  canEdit: boolean;
  onSwitchToOwner: () => void;
  onMarkComplete: () => void;
}) {
  const s = useStageFields(stage, prefill);
  return (
    <>
      {/* row 1: headers (equal height) */}
      <div className="flex min-w-0 flex-col border-b border-r border-[#ecebea] bg-[var(--surface-muted)]">
        <ChatHeader stage={stage} s={s} />
      </div>
      <div className="flex min-w-0 flex-col justify-center border-b border-[#ecebea] bg-white">
        {rightHeader}
        {stagePath}
      </div>
      {/* row 2: bodies */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#ecebea] bg-[var(--surface-muted)]">
        {canEdit ? <ChatPanel stage={stage} s={s} onMarkComplete={onMarkComplete} /> : <LockedChatPanel stage={stage} onSwitchToOwner={onSwitchToOwner} />}
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white">
        {statusNote ? <StageStatusBanner note={statusNote} canClear={canClear} onClear={onClearStatus} /> : null}
        <StageFormBody stage={stage} currentUser={currentUser} s={s} canEdit={canEdit} />
      </div>
    </>
  );
}

function suggestionText(suggestion: string | string[]): string {
  return Array.isArray(suggestion) ? suggestion.join(", ") : suggestion;
}

const MULTI_KINDS = ["chips", "cards"];

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

// Lowercase a label for mid-sentence use, but keep acronyms (PII, DPIA) as-is.
function humanizeLabel(label: string): string {
  return label
    .split(" ")
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()))
    .join(" ");
}

// Short, conversational prompt for a field in chat.
function fieldPrompt(field: FieldSpec): string {
  const l = humanizeLabel(field.label);
  return field.options?.length ? `Which ${l}?` : `What's the ${l}?`;
}

// Option pills a field offers in chat: its own options for choice fields, else
// the single AI-suggested answer for free-text fields.
function fieldPills(field: FieldSpec): string[] {
  if (field.options?.length) return field.options;
  return [suggestionText(field.suggestion)];
}

type ChatMessage = { id: number; role: "assistant" | "user"; text: string; field?: FieldSpec };

// Monotonic ids for chat message keys — uniqueness is all that's needed.
let chatMsgId = 0;
const bump = () => (chatMsgId += 1);

// Scripted assistant that walks the stage's fields in order, offering each mock
// value as a click-to-fill chip. Free text is keyword-matched to fields (mocked
// extraction) and otherwise treated as the answer to the current field. Drives
// the same field-state instance as the form grid, so both stay in sync.
function ChatPanel({ stage, s, onMarkComplete }: { stage: StageItem; s: StageFieldsState; onMarkComplete: () => void }) {
  // Seed greeting + first question in the initializer (stage.name keys this
  // component, so it re-runs on every stage change). Avoids a setState effect.
  const initialHandled = s.fields.filter((field) => !isFieldEmpty(s.values[field.label])).map((field) => field.label);
  const initialRemaining = s.fields.filter((field) => !initialHandled.includes(field.label));

  // A ready-to-send example prefilled into the input. Choice fields get a real
  // "label option" value; if a stage has none, fall back to naming a few fields
  // (mentions keyword-match → their suggestions draft in). Every stage gets one.
  const choiceParts = initialRemaining
    .filter((field) => field.options?.length)
    .map((field) => `${humanizeLabel(field.label)} ${field.options![0].toLowerCase()}`);
  const describeExample = choiceParts.length
    ? choiceParts.join(", ")
    : initialRemaining.slice(0, 3).map((field) => humanizeLabel(field.label)).join(", ");

  const [handled, setHandled] = useState<string[]>(initialHandled);
  // Describe-first: no field is asked up front — the user describes the stage and
  // we batch-fill, then ask only about the gaps.
  const [asked, setAsked] = useState<string | null>(null);
  const [done, setDone] = useState(initialRemaining.length === 0);
  const [input, setInput] = useState(describeExample);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const intro: ChatMessage = {
      id: bump(),
      role: "assistant",
      text: STAGE_INTROS[stage.name] ?? `Let's fill in the ${stage.name} stage.`,
    };
    if (initialRemaining.length) {
      const text = describeExample
        ? "Describe it in a sentence — I've dropped an example below to send or edit. Or tap Draft everything to autofill."
        : "Describe it in a sentence or two and I'll fill what I can — or tap Draft everything to autofill.";
      return [intro, { id: bump(), role: "assistant", text }];
    }
    return [intro, { id: bump(), role: "assistant", text: "Everything's already filled — edit any field on the right." }];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushAssistant = (text: string, field?: FieldSpec) =>
    setMessages((current) => [...current, { id: bump(), role: "assistant", text, field }]);
  const pushUser = (text: string) => setMessages((current) => [...current, { id: bump(), role: "user", text }]);

  function ask(field: FieldSpec) {
    setAsked(field.label);
    pushAssistant(fieldPrompt(field), field);
  }

  function advance(handledNow: string[]) {
    const next = s.fields.find((field) => !handledNow.includes(field.label));
    if (next) ask(next);
    else {
      setAsked(null);
      setDone(true);
      pushAssistant("All fields filled.");
    }
  }

  function resolve(labels: string[]) {
    const next = [...handled, ...labels];
    setHandled(next);
    advance(next);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // One click: fields show their loader, then fill after ~2–3s; chat wraps up
  // once the fill finishes.
  function draftAll() {
    s.suggestAll();
    pushUser("Draft everything for me");
    pushAssistant("Drafting every field…");
    setHandled(s.fields.map((field) => field.label));
    setAsked(null);
    // ponytail: bare setTimeout — stage change remounts this panel (keyed by
    // stage name), so a late fire targets a dead instance and no-ops.
    setTimeout(() => {
      setDone(true);
      pushAssistant("Done — review on the right and tweak anything.");
    }, s.draftDurationMs);
  }

  // Single-select option (or the suggested answer) → fill and advance.
  function pickOption(field: FieldSpec, option: string) {
    s.setField(field.label, option);
    pushUser(option);
    resolve([field.label]);
  }

  // Multi-select option → toggle it in the field's array; don't advance yet.
  function toggleOption(field: FieldSpec, option: string) {
    const current = Array.isArray(s.values[field.label]) ? (s.values[field.label] as string[]) : [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    s.setField(field.label, next);
  }

  function confirmMulti(field: FieldSpec) {
    const current = Array.isArray(s.values[field.label]) ? (s.values[field.label] as string[]) : [];
    pushUser(current.length ? current.join(", ") : "None");
    resolve([field.label]);
  }

  function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    pushUser(text);

    // Gap mode: a typed answer fills the field currently being asked.
    if (asked) {
      const field = s.fields.find((f) => f.label === asked);
      s.setField(asked, field && MULTI_KINDS.includes(field.kind) ? text.split(/\s*[;,]\s*/).filter(Boolean) : text);
      resolve([asked]);
      return;
    }

    // Describe mode: batch-fill everything the description covers, then ask gaps.
    const fills = extractStageFields(text, s.fields, handled);
    if (fills.length) {
      fills.forEach((fill, index) => s.fillNow(fill.label, fill.value, 400 + index * 150));
      pushAssistant(`Filled ${fills.length} field${fills.length === 1 ? "" : "s"} — ${fills.map((f) => f.label).join(", ")}.`);
      resolve(fills.map((f) => f.label));
      return;
    }
    pushAssistant("Couldn't match that to a field — tap Draft everything, or answer the questions below.");
    advance(handled);
  }

  const activeField = !done && asked ? s.fields.find((f) => f.label === asked && !handled.includes(f.label)) : undefined;
  const activeMulti = activeField ? MULTI_KINDS.includes(activeField.kind) : false;
  const activeSelected = activeField && Array.isArray(s.values[activeField.label]) ? (s.values[activeField.label] as string[]) : [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {!done ? (
        <div className="shrink-0 px-4 pt-3">
          <button
            type="button"
            onClick={draftAll}
            className="flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[var(--accent-border)] bg-transparent px-2 py-2 text-[12px] font-medium text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            <Sparkles size={12} className="shrink-0" />
            Draft everything for me
          </button>
        </div>
      ) : null}
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-[12px] px-3 py-2 text-[13px] leading-5",
                message.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[#ecebea] bg-white text-[var(--text-body)]",
              )}
            >
              {message.text}
            </div>
          </div>
        ))}
        {done ? (
          <button
            type="button"
            onClick={onMarkComplete}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#249a57] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#1f7a46]"
          >
            <Check size={14} />
            Mark complete &amp; go to next stage
          </button>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[#ecebea] p-3">
        {activeField ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {fieldPills(activeField).map((option) => {
              const isOn = activeMulti && activeSelected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => (activeMulti ? toggleOption(activeField, option) : pickOption(activeField, option))}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-[8px] border px-2 py-1 text-left text-[11px] font-medium transition",
                    isOn
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:bg-[#daedf3]",
                  )}
                >
                  {isOn ? <Check size={10} className="shrink-0" /> : null}
                  <span className="truncate">{option}</span>
                </button>
              );
            })}
            {activeMulti ? (
              <button
                type="button"
                onClick={() => confirmMulti(activeField)}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[#249a57] bg-[#249a57] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[#1f7a46]"
              >
                <Check size={10} className="shrink-0" />
                Done
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-[10px] border border-[#e7e5e4] bg-white px-2.5 py-2 focus-within:border-[var(--accent-ring)]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={3}
            placeholder={asked ? "Type your answer…" : "Describe this stage…"}
            className="no-scrollbar max-h-40 min-h-[72px] flex-1 resize-none bg-transparent text-[13px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim()}
            aria-label="Send"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
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

function StagePath({
  activeIndex = defaultStageIndex,
  completedIndexes = [],
  rejectedIndexes = [],
  returnedIndexes = [],
  isCurrentComplete = false,
  canComplete = true,
  canDecide = false,
  activeOwner = "",
  onMarkComplete,
  onStageChange,
  onReject,
  onSendBack,
}: {
  activeIndex?: number;
  completedIndexes?: number[];
  rejectedIndexes?: number[];
  returnedIndexes?: number[];
  isCurrentComplete?: boolean;
  canComplete?: boolean;
  canDecide?: boolean;
  activeOwner?: string;
  onMarkComplete?: () => void;
  onStageChange?: (index: number) => void;
  onReject?: () => void;
  onSendBack?: () => void;
}) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const trailRef = useRef<HTMLOListElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasLess, setHasLess] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

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

  // Fixed-position tooltip so it isn't clipped by the scrolling trail and shows
  // instantly on hover (no native title delay).
  function showTip(el: HTMLElement, text: string) {
    const rect = el.getBoundingClientRect();
    setTip({ x: rect.left + rect.width / 2, y: rect.top - 8, text });
  }

  // Keep the (center-anchored) tooltip inside the viewport — edge chevrons would
  // otherwise push half of it off-screen.
  useEffect(() => {
    const el = tipRef.current;
    if (!el || !tip) return;
    const margin = 8;
    const half = el.offsetWidth / 2;
    const clamped = Math.max(margin + half, Math.min(tip.x, window.innerWidth - margin - half));
    el.style.left = `${clamped}px`;
  }, [tip]);

  return (
    <section className="shrink-0 bg-transparent px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <ol ref={trailRef} className="no-scrollbar flex min-w-0 items-center overflow-x-auto py-0.5">
          {STAGES.map((stage, index) => {
            const isCompleted = completedIndexes.includes(index);
            const isActive = index === activeIndex;
            const isRejected = rejectedIndexes.includes(index);
            const isReturned = !isRejected && returnedIndexes.includes(index);
            const isCollapsed = isCompleted && !isActive && !isRejected && !isReturned;
            const isFirst = index === 0;
            const isLast = index === STAGES.length - 1;
            const clipPath = "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%, 13px 50%)";
            const firstClipPath = "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%)";
            const lastClipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 13px 50%)";
            const statusLabel = isRejected
              ? "Rejected"
              : isReturned
                ? "Needs revision"
                : isCompleted
                  ? "Completed"
                  : isActive
                    ? "In progress"
                    : "Not started";
            const tipText = `${stage.name} · ${statusLabel} · ${stage.owner}`;
            // Precedence: rejected > active > returned > completed > pending.
            const toneClass = isRejected
              ? "bg-[var(--stage-rejected)] text-white hover:bg-[var(--stage-rejected-hover)]"
              : isActive
                ? isCompleted
                  ? "bg-[var(--stage-past-active)] text-white hover:bg-[var(--stage-past-active-hover)]"
                  : "bg-[var(--stage-active)] text-white hover:bg-[var(--stage-active-hover)]"
                : isReturned
                  ? "bg-[var(--stage-returned)] text-white hover:bg-[var(--stage-returned-hover)]"
                  : isCompleted
                    ? "bg-[var(--stage-past)] text-white hover:bg-[var(--stage-past-hover)]"
                    : "bg-[var(--stage-future)] text-[var(--stage-future-text)] hover:bg-[var(--stage-future-hover)]";

            return (
              <li key={stage.name} className={cn("relative flex shrink-0", index > 0 && "-ml-3")}>
                <button
                  type="button"
                  onClick={() => onStageChange?.(index)}
                  onMouseEnter={(event) => showTip(event.currentTarget, tipText)}
                  onMouseLeave={() => setTip(null)}
                  onFocus={(event) => showTip(event.currentTarget, tipText)}
                  onBlur={() => setTip(null)}
                  aria-label={isCollapsed ? tipText : undefined}
                  aria-current={isActive ? "step" : undefined}
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
                    toneClass,
                  )}
                >
                  {isRejected ? (
                    <Ban size={13} className="shrink-0" />
                  ) : isReturned ? (
                    <CornerUpLeft size={13} strokeWidth={2.5} className="shrink-0" />
                  ) : isCompleted ? (
                    <Check size={13} strokeWidth={3} className="shrink-0" />
                  ) : null}
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
          {canComplete ? (
            <button
              type="button"
              onClick={onMarkComplete}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-semibold transition",
                isCurrentComplete
                  ? "border border-[var(--border-input)] bg-white text-[var(--text-body)] hover:border-[var(--accent-ring)] hover:bg-[var(--accent-hover-bg)] hover:text-[var(--text-primary)]"
                  : "bg-[var(--stage-action)] text-white hover:bg-[var(--stage-action-hover)]",
              )}
            >
              {isCurrentComplete ? <RotateCcw size={15} /> : <Check size={15} strokeWidth={3} />}
              {isCurrentComplete ? "Mark Incomplete" : "Mark Complete"}
            </button>
          ) : (
            <span
              title={activeOwner ? `Only ${activeOwner} can complete this stage` : undefined}
              className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-[8px] border border-[var(--border-input)] bg-[var(--surface-muted)] px-3.5 text-[13px] font-semibold text-[var(--text-muted)]"
            >
              <Lock size={14} />
              Locked
            </span>
          )}
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
            {isActionMenuOpen ? (
              <StageActionMenu
                canDecide={canDecide}
                onSendBack={onSendBack}
                onReject={onReject}
                onSelect={() => setIsActionMenuOpen(false)}
              />
            ) : null}
          </div>
        </div>
      </div>

      {tip ? (
        <div
          ref={tipRef}
          role="tooltip"
          style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translate(-50%, -100%)" }}
          className="pointer-events-none z-[60] whitespace-nowrap rounded-[6px] bg-[var(--stage-active)] px-2.5 py-1 text-[11px] font-medium text-white"
        >
          {tip.text}
        </div>
      ) : null}
    </section>
  );
}

function StageActionMenu({
  canDecide,
  onSendBack,
  onReject,
  onSelect,
}: {
  canDecide: boolean;
  onSendBack?: () => void;
  onReject?: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="absolute right-0 top-11 z-50 w-56 rounded-[8px] border border-[#e7e5e4] bg-white p-1.5" role="menu" aria-label="Stage actions">
      <button
        type="button"
        onClick={onSelect}
        className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2.5 text-left text-[12px] font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-hover)]"
        role="menuitem"
      >
        <Bell size={14} className="text-[var(--text-muted)]" />
        Follow this record
      </button>

      {canDecide ? (
        <>
          <div className="my-1 border-t border-[var(--border-hairline)]" />
          <button
            type="button"
            onClick={() => {
              onSelect();
              onSendBack?.();
            }}
            className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2.5 text-left text-[12px] font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-hover)]"
            role="menuitem"
          >
            <CornerUpLeft size={14} className="text-[var(--text-muted)]" />
            Send back to a stage…
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect();
              onReject?.();
            }}
            className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2.5 text-left text-[12px] font-medium text-[#a5311f] transition hover:bg-[#fbeeec]"
            role="menuitem"
          >
            <Ban size={14} />
            Reject this stage…
          </button>
        </>
      ) : null}
    </div>
  );
}

// Modal for rejecting a stage or sending the record back to an earlier one,
// each with a required reason. Rendered in a portal to escape overflow clipping.
function StageActionDialog({
  mode,
  stageName,
  priorStages,
  onCancel,
  onReject,
  onSendBack,
}: {
  mode: "reject" | "sendback";
  stageName: string;
  priorStages: Array<{ index: number; name: string }>;
  onCancel: () => void;
  onReject: (reason: string) => void;
  onSendBack: (to: number, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState<number | null>(priorStages.length ? priorStages[priorStages.length - 1].index : null);
  const isReject = mode === "reject";
  const canSubmit = reason.trim().length > 0 && (isReject || target !== null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function submit() {
    if (!canSubmit) return;
    if (isReject) onReject(reason.trim());
    else if (target !== null) onSendBack(target, reason.trim());
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={isReject ? "Reject stage" : "Send back to a stage"}>
      <div className="absolute inset-0 bg-[rgba(28,25,23,0.35)]" onClick={onCancel} />
      <div className="relative w-full max-w-[460px] rounded-[14px] border border-[var(--border-default)] bg-white">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-full"
              style={isReject ? { background: "#fbeeec", color: "#a5311f" } : { background: "#f8f1e6", color: "#9c6519" }}
            >
              {isReject ? <Ban size={18} /> : <CornerUpLeft size={18} />}
            </span>
            <div>
              <h2 className="font-display text-[18px] leading-6 text-[var(--text-primary)]">
                {isReject ? "Reject this stage" : "Send back to a stage"}
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                {isReject ? `Blocks ${stageName} and records why.` : `Return the record to an earlier stage from ${stageName}.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {!isReject ? (
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--text-primary)]">Send back to</label>
              {priorStages.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {priorStages.map((stage) => (
                    <button
                      key={stage.index}
                      type="button"
                      onClick={() => setTarget(stage.index)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition",
                        target === stage.index
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                          : "border-[var(--border-input)] bg-white text-[var(--text-body)] hover:border-[var(--accent-border)]",
                      )}
                    >
                      {stage.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--text-muted)]">No earlier stages to send back to.</p>
              )}
            </div>
          ) : null}

          <div>
            <label htmlFor="stage-action-reason" className="mb-1.5 block text-[12px] font-medium text-[var(--text-primary)]">
              {isReject ? "Reason for rejection" : "Note for the owner"}
            </label>
            <textarea
              id="stage-action-reason"
              autoFocus
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={isReject ? "What must change before this can proceed?" : "What needs revisiting, and why?"}
              className="w-full resize-none rounded-[8px] border border-[var(--border-input)] bg-white px-3 py-2.5 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#8fc0cf] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-hairline)] px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-input)] bg-white px-3.5 text-[13px] font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-4 text-[13px] font-semibold transition",
              !canSubmit
                ? "cursor-not-allowed bg-[#ece9e7] text-[var(--text-muted)]"
                : isReject
                  ? "bg-[#c0392b] text-white hover:bg-[#a5311f]"
                  : "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
            )}
          >
            {isReject ? <Ban size={15} /> : <CornerUpLeft size={15} />}
            {isReject ? "Reject stage" : "Send back"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

