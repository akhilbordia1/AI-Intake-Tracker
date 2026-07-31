"use client";

import { USE_CASE } from "@/data/document-workflow-form-schema";
import {
  GATE_TONE,
  OUTCOME_ROW,
  RECORD_ACTIVITY,
  SHORT_STAGE_LABELS,
  STAGE_INTROS,
  STAGES,
  firstName,
  gateForStage,
  type StageItem,
} from "@/data/lifecycle";
import { GateBadge, RecordDetailsSheet } from "@/components/document-record/record-details-sheet";
import { RecordSummary } from "@/components/document-record/record-summary";
import { MenuItem, MenuSurface, ProgressRing, StageIcon, VALUE_CHIP, titleCaseTag } from "@/components/ui/kit";
import { cn } from "@/lib/cn";
import {
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  FileText,
  Info,
  Lock,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

import { ChatHistoryButton, PastChatTranscript, useChatSessions, type ChatSession } from "@/components/chat/chat-history";
import { ChatComposer, ChatDock, ChatLine, ChatStarters, ChatTimeDivider, JumpToTop, formatChatTime } from "@/components/chat/chat-ui";
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";

import { PersonAvatar, ProfileSwitcher, initials } from "@/components/profile";
import { AppShell, ContentPanel, PanelBreadcrumb, RailHeader, TabBarToggle, shellButton, useRailMode } from "@/components/app-shell";
import { extractStageFields, isFieldEmpty } from "@/lib/stage-chat";

import {
  CardMultiSelect,
  ChipMultiSelect,
  ChipSelect,
  CurrencyField,
  DateField,
  LevelSlider,
  RadioGroup,
  RatingStepper,
  SearchableSelect,
  Segmented,
  SegmentedToggle,
} from "@/components/forms/fields";

// Hybrid: most stages use the generic editable form; a few high-value stages
// get bespoke widgets ported from the reference (squad picker, milestone rail,
// lockable success metrics). Keyed by stage name.
const BESPOKE_STAGE_FORMS: Record<string, () => ReactElement> = {
  "Plan & KPI": () => <PlanStageForm />,
};

const defaultStageIndex = STAGES.findIndex((stage) => stage.name === "Ideation");

type Kickback = { to: number; from: number; reason: string; by: string };
type Rejection = { index: number; reason: string; by: string };
type StatusNote = { kind: "returned"; reason: string; fromName: string; by: string } | { kind: "rejected"; reason: string; by: string };

export function DetailRecordPage({ initialStageIndex, initialIdea }: { initialStageIndex?: number; initialIdea?: string }) {
  // Deep link from the overview (`/detail?stage=n`): land on that stage with
  // everything before it already recorded. Without it the record starts fresh
  // at Ideation, which is what the guided flow demos.
  const deepLink = typeof initialStageIndex === "number" && initialStageIndex > 0 && initialStageIndex < STAGES.length ? initialStageIndex : null;
  const [stageIndex, setStageIndex] = useState(deepLink ?? defaultStageIndex);
  const [completedStageIndexes, setCompletedStageIndexes] = useState<number[]>(() =>
    deepLink === null ? [] : Array.from({ length: deepLink }, (_, index) => index),
  );
  // Stages that have ever been completed hold recorded data — so reopening one
  // shows its data (editable) rather than a blank form.
  // Ideation holds its recorded data from the start: the demo opens on a finished
  // intake — every detail captured, and the chat showing the exchange that
  // captured it.
  const [dataStageIndexes, setDataStageIndexes] = useState<number[]>(() =>
    deepLink === null ? [defaultStageIndex] : Array.from({ length: deepLink }, (_, index) => index),
  );
  const [currentUser, setCurrentUser] = useState("Priya N.");
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [kickbacks, setKickbacks] = useState<Kickback[]>([]);
  // Split layout: chat on the left drives the form on the right (always both
  // shown). A horizontal Journey bar up top navigates between stages.
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The record name stays hidden until the user has given some context — a
  // deep-linked stage already has that context.

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
    setCompletedStageIndexes((indexes) => (wasComplete ? indexes.filter((index) => index !== stageIndex) : [...indexes, stageIndex]));
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
    <>
      <SplitStageView
        key={currentStage.name}
        stage={currentStage}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        lockedOwner={lockedOwner}
        detailsOpen={detailsOpen}
        onOpenDetails={() => setDetailsOpen((v) => !v)}
        stageIndex={stageIndex}
        completedIndexes={completedStageIndexes}
        onSelectStage={selectStage}
        prefill={dataStageIndexes.includes(stageIndex)}
        isComplete={isCurrentComplete}
        onMarkComplete={toggleCurrentStageComplete}
        onEditBlocked={showToast}
        initialIdea={initialIdea}
        banner={statusNote ? <StageStatusBanner note={statusNote} canClear={canComplete} onClear={clearCurrentStatus} /> : null}
      />
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-[10px] bg-[var(--text-primary)] px-3.5 py-2.5 text-[13px] font-medium text-white ">
            <Lock size={14} className="shrink-0 opacity-80" />
            {toast}
          </div>
        </div>
      ) : null}
    </>
  );
}

function StageColumnHeader({ stage, currentUser, action }: { stage: StageItem; currentUser: string; action?: ReactNode }) {
  const ownedByMe = stage.owner === currentUser;
  const gate = gateForStage(stage.name);
  const owner = (
    <div className="flex items-center gap-2 text-[13px] leading-5">
      <span className="text-[var(--text-label)]">{gate ? "Prepared by" : "Stage Owner"}</span>
      <PersonAvatar name={stage.owner} size={20} highlight={ownedByMe} />
      <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{stage.owner}</span>
    </div>
  );
  const ownership = gate ? (
    <div className="flex flex-wrap items-center gap-3">
      {owner}
      <span className="h-4 w-px bg-[var(--border-default)]" aria-hidden />
      <GateBadge gate={gate} />
    </div>
  ) : (
    owner
  );

  return (
    <div
      className="flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--border-soft)] px-7 py-2"
      aria-label={`${stage.name} stage header`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="font-display min-w-0 truncate text-[20px] leading-7 text-[var(--text-primary)]">{stage.name}</h2>
        {action ? (
          <>
            <span className="h-4 w-px bg-[var(--border-default)]" aria-hidden />
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
    ? { fg: "var(--tone-danger-fg)", bg: "var(--tone-danger-bg)", border: "var(--tone-danger-border)", icon: <Ban size={18} /> }
    : { fg: "var(--tone-warning-fg)", bg: "var(--tone-warning-bg)", border: "var(--tone-warning-border)", icon: <CornerUpLeft size={18} /> };

  return (
    <div className="flex shrink-0 items-center gap-3 border-b px-7 py-3" style={{ background: palette.bg, borderColor: palette.border }}>
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
            <PersonAvatar name={note.by} size={20} />
            <span className="font-medium text-[var(--text-body)]">{note.by}</span>
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[var(--text-body)]">{note.reason}</p>
      </div>
      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-[8px] border bg-white/70 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white"
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
  if (/(block|reject|upheld|no-?go|blocked|fail|high|serious|critical)/.test(v))
    return { fg: "var(--tone-danger-fg)", bg: "var(--tone-danger-bg)", border: "var(--tone-danger-border)" };
  if (/(condition|watch|pending|partial|needs|revise|minor|standard|medium|reindex|re-index)/.test(v))
    return { fg: "var(--tone-warning-fg)", bg: "var(--tone-warning-bg)", border: "var(--tone-warning-border)" };
  if (/(go\b|approve|cleared|committed|continue|proceed|recommend|locked|full|resolved|ready|yes|confirmed|complete|low|spawned)/.test(v))
    return { fg: "var(--tone-success-fg)", bg: "var(--tone-success-bg)", border: "var(--tone-success-border)" };
  return { fg: "var(--text-body)", bg: "var(--surface-muted)", border: "var(--border-default)" };
}

const TAG_LABEL_RE =
  /(archetype|function|delivery|sensitivity|exposure|reversibility|basis|users|complexity|path|department|team|country|window|cohort)/i;

function ScaleReadValue({ value }: { value: string }) {
  const [score, total] = value.split("/").map(Number);
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} className={cn("h-1.5 w-1.5 rounded-full", index < score ? "bg-[var(--accent)]" : "bg-[var(--border-default)]")} />
        ))}
      </span>
      <span className="font-mono text-[14px] font-medium text-[var(--text-primary)]">{value}</span>
    </span>
  );
}

// Currency, percentages, scores, dates — anything whose shape matters.
const DATA_VALUE_RE = /^(?:[£$€]|~?\d)|\b\d{4}$|\d+\s*\/\s*\d+/;

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
          <span className="font-mono font-medium text-[var(--text-primary)]">{current}%</span>
          <span className="font-mono text-[12px] text-[var(--text-muted)]">
            target {target}% · {reached}% reached
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
          <div
            className={cn("h-full rounded-full", hit ? "bg-[var(--tone-success-fg)]" : "bg-[var(--accent)]")}
            style={{ width: `${Math.min(100, reached)}%` }}
          />
        </div>
      </div>
    );
  }

  // Multi-value → chips, in the pill shape the multi-select uses
  if (items.length > 1 && items.every((item) => item.length <= 32)) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={cn(VALUE_CHIP, "bg-[var(--surface-muted)] text-[var(--text-body)]")}>
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
        <PersonAvatar name={value} size={20} />
        <span className="text-[15px] font-medium text-[var(--text-primary)]">{value}</span>
      </span>
    );
  }

  // Currency amounts → distinct styled value
  if (CURRENCY_RE.test(value)) {
    return <span className="font-mono block text-[14px] font-medium text-[var(--text-primary)]">{value}</span>;
  }

  // Decisions / tiers / risk / PII / autonomy → colored status badge
  if (single && short && (STATUS_LABEL_RE.test(label) || /(pii|autonomy|oversight)/i.test(label))) {
    const tone = statusTone(value);
    return (
      <span className={cn(VALUE_CHIP)} style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
        {value}
      </span>
    );
  }

  // Short attribute fields → neutral tag, in the product's chip geometry
  if (single && short && TAG_LABEL_RE.test(label)) {
    return <span className={cn(VALUE_CHIP, "bg-[var(--surface-muted)] text-[var(--text-body)]")}>{value}</span>;
  }

  // Numbers, money and dates are data — they take the mono face.
  if (single && DATA_VALUE_RE.test(value)) {
    return <span className="font-mono block text-[14px] text-[var(--text-primary)]">{value}</span>;
  }

  // Prose → the panel's width, regular weight so a long answer reads as a
  // sentence rather than a heading.
  return <span className="block text-[15px] leading-[1.6] text-[var(--text-primary)]">{value}</span>;
}

function StageReadOnlyRows({ rows }: { rows: StageItem["rows"] }) {
  return (
    <div>
      <dl className="divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)]">
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

type FieldKind = "toggle" | "tag" | "segmented" | "radio" | "select" | "scale" | "level" | "cards" | "chips" | "currency" | "date" | "long" | "text";

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

// Money is written both ways in the record ("USD 325,000", "250K-400K USD"), and
// both are the same field: an amount with a currency beside it.
const CURRENCY_RE = /^\s*(?:GBP|USD|EUR|£|\$|€)|\b(?:GBP|USD|EUR)\s*$/;

const CURRENCY_CODES = ["GBP", "USD", "EUR"];
const SYMBOL_TO_CODE: Record<string, string> = { "£": "GBP", $: "USD", "€": "EUR" };

// Split a written amount into its code and its number, whichever order it's in.
function splitCurrency(text: string): { currency: string; amount: string } {
  const leading = /^\s*(GBP|USD|EUR|£|\$|€)\s*(.*)$/.exec(text);
  if (leading) return { currency: SYMBOL_TO_CODE[leading[1]] ?? leading[1], amount: leading[2] };
  const trailing = /^(.*?)\s*(GBP|USD|EUR)\s*$/.exec(text);
  if (trailing) return { currency: trailing[2], amount: trailing[1] };
  return { currency: "GBP", amount: text };
}

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
    // Two-way choices are a toggle — one connected control, not a pair of radios.
    if (options.length === 2) return { label, kind: "toggle", options, suggestion: value };
    // A value the record shows as a tag is picked as one, so the control and the
    // read view are the same shape.
    if (TAG_LABEL_RE.test(label) || STATUS_LABEL_RE.test(label)) return { label, kind: "tag", options, suggestion: value };
    // Short enums fit a segmented row; wordier ones need radios to stay readable.
    if (options.every((option) => option.length <= 14)) return { label, kind: "segmented", options, suggestion: value };
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

  if (risk === "High") return { tier: "Full", fg: "var(--tone-danger-fg)", bg: "var(--tone-danger-bg)", border: "var(--tone-danger-border)" };
  if (risk === "Medium")
    return { tier: "Standard", fg: "var(--tone-warning-fg)", bg: "var(--tone-warning-bg)", border: "var(--tone-warning-border)" };
  if (risk === "Low") return { tier: "Light", fg: "var(--tone-success-fg)", bg: "var(--tone-success-bg)", border: "var(--tone-success-border)" };
  return null;
}

// Stages that can't be submitted until a checklist clears. Returns why it's
// blocked, or null when the stage is free to complete.
function stageGateReason(stageName: string, values: Record<string, string | string[]>): string | null {
  const done = /cleared|n\/?a|passed|complete|approved|deployed|done|go\b/i;
  if (stageName === "Assessment") {
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

// Choice controls that always show one option selected.
const SINGLE_CHOICE_KINDS = new Set<FieldKind>(["toggle", "tag", "segmented", "radio"]);

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
        if (SINGLE_CHOICE_KINDS.has(field.kind) && field.options?.length) return [field.label, field.options[0]];
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

// Fields the user types into. In read these keep their box's metrics but lose its
// lines and fill, so the value reads as text without the row changing height.
const INPUT_KINDS = new Set<FieldKind>(["text", "long", "select", "currency", "date"]);

// A record field. Read and edit render the *same* control — editing only makes it
// interactive — because a read view with its own shapes (a chip here, a dash there)
// resized and moved every answer the moment the form was saved. Input-like fields
// drop their box in read (`read-field`), so the value reads as a value while
// keeping the box's exact metrics.
function DocumentField({
  field,
  s,
  readOnly,
  onBlockedEdit,
  forceEdit = false,
}: {
  field: FieldSpec;
  s: StageFieldsState;
  readOnly: boolean;
  onBlockedEdit?: () => void;
  forceEdit?: boolean;
}) {
  const value = s.values[field.label];
  const loading = s.loadingFields.includes(field.label);
  const editing = !readOnly && forceEdit;
  // Every control starts at the column's left edge — a box, a pill row, a slider's
  // thumb and a radio's dot all line up under the label. Insetting the boxed ones to
  // align their *text* instead left them hanging left of everything else.
  const inset = "relative w-full min-w-0";

  const control = (
    <StageField
      spec={field}
      value={value}
      onChange={(next) => s.setField(field.label, next)}
      onSuggest={() => s.suggestField(field)}
    />
  );

  // The "Capturing…" overlay sits on top of the field rather than replacing it —
  // a field that swaps to a line of text while the chat fills it moves the page.
  const shimmer = loading ? <FieldGenerating tall={field.kind === "long"} /> : null;

  if (editing) {
    return (
      <div className={inset}>
        {control}
        {shimmer}
      </div>
    );
  }

  const read = (
    <fieldset disabled className={cn(inset, "pointer-events-none", INPUT_KINDS.has(field.kind) && "read-field")}>
      {control}
      {shimmer}
    </fieldset>
  );

  // Non-owners get a click that explains the block; owners edit from the header.
  // A div, not a button: the read view now contains the control's own buttons, and
  // a button inside a button is invalid HTML (it breaks hydration).
  if (readOnly && onBlockedEdit) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onBlockedEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onBlockedEdit();
          }
        }}
        className="w-full min-w-0 cursor-pointer text-left"
      >
        {read}
      </div>
    );
  }
  return read;
}

// A thin rule between metadata items — reads as one line of facts rather than
// several chips, and holds the eye better than a dot at this size.
function MetaDot() {
  return <span aria-hidden className="h-3 w-px shrink-0 bg-[var(--border-default)]" />;
}

// The stage's state, next to its title: a dot and a word. Gates and risk tiers are
// bordered tags because they're record facts; the stage's own state is lighter than
// that — a boxed pill made the header look like a row of badges.
function StageStatusPill({
  isComplete,
  canEdit,
  owner,
  blockedReason,
}: {
  isComplete: boolean;
  canEdit: boolean;
  owner: string;
  blockedReason: string | null;
}) {
  const state = isComplete
    ? { label: "Complete", colour: "var(--status-success)", title: undefined as string | undefined }
    : !canEdit
      ? { label: "Locked", colour: "var(--tone-warning-fg)", title: `${owner} owns this stage — switch profile to edit` }
      : blockedReason
        ? { label: "Blocked by gate", colour: "var(--tone-danger-fg)", title: blockedReason }
        : { label: "Active", colour: "var(--accent)", title: undefined };

  return (
    <span data-tip={state.title} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium" style={{ color: state.colour }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: state.colour }} />
      {titleCaseTag(state.label)}
    </span>
  );
}

function StageFieldsGrid({
  stage,
  s,
  currentUser,
  canEdit,
  isComplete = false,
  embedded = false,
  onBlockedEdit,
  editAll = false,
  heading,
}: {
  stage: StageItem;
  s: StageFieldsState;
  currentUser: string;
  canEdit: boolean;
  isComplete?: boolean;
  embedded?: boolean;
  onBlockedEdit?: () => void;
  editAll?: boolean;
  heading?: ReactNode;
}) {
  // editAll (whole form editable) is controlled by the action bar.
  const readOnly = !canEdit;
  const ownedByMe = stage.owner === currentUser;
  const riskTier = canEdit && stage.name === "Assessment" ? computeRiskTier(s.values) : null;
  const gate = gateForStage(stage.name);
  const gateTone = gate ? GATE_TONE[gate.status] : null;
  // A stage you own can still be held back by its own checklist (compliance
  // checks, production readiness) — that reads as blocked, not simply active.
  const blockedReason = canEdit ? stageGateReason(stage.name, s.values) : null;

  return (
    // embedded → a plain block inside a shared scroll (stacked stages); otherwise
    // its own scroll container.
    <section
      className={cn(embedded ? "px-6 pb-10 pt-5" : "no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-12 pt-6")}
      aria-label={`${stage.name} stage`}
    >
      {/* Stage header, one line: the stage (which opens the stage path) on the left,
          its state, people and last edit as one run of metadata on the right. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
        {heading ?? <h2 className="font-display text-[18px] leading-tight text-[var(--text-primary)]">{stage.name}</h2>}

        {/* Whose stage it is belongs with its name, not in the run of metadata —
            but outside the dropdown, so the trigger stays just the stage. */}
        <span
          data-tip={ownedByMe ? "You own this stage" : `${stage.owner} owns this stage`}
          className="ml-1.5 inline-flex shrink-0 items-center gap-2 text-[12px]"
        >
          <PersonAvatar name={stage.owner} size={20} highlight={ownedByMe} />
          <span className={cn("text-[var(--text-body)]", ownedByMe && "font-semibold text-[var(--text-primary)]")}>{stage.owner}</span>
        </span>

        <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1.5 text-[12px] text-[var(--text-muted)]">
          <StageStatusPill isComplete={isComplete} canEdit={canEdit} owner={stage.owner} blockedReason={blockedReason} />

          <MetaDot />
          <span className="shrink-0">
            Edited <span className="font-mono">{RECORD_ACTIVITY[0].when.split(",").slice(0, 2).join(",")}</span>
          </span>

          {gate && gateTone ? (
            <>
              <MetaDot />
              <span
                data-tip={`${gate.id} · ${gate.name} — approver ${gate.approver}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: gateTone.fg, background: gateTone.bg, borderColor: gateTone.border }}
              >
                <ShieldCheck size={11} />
                <span className="font-mono">{gate.id}</span> · {titleCaseTag(gate.status)}
              </span>
            </>
          ) : null}

          {riskTier ? (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: riskTier.fg, background: riskTier.bg, borderColor: riskTier.border }}
            >
              <ShieldCheck size={11} />
              {titleCaseTag(`${riskTier.tier} tier`)}
            </span>
          ) : null}
        </span>
      </div>

      {/* One column, on a reading measure: a two-up grid tied every row's height
          to its tallest cell and left long values fighting for half the width. */}
      <div className="mt-7 flex flex-col gap-y-6">
        {s.fields.map((field) => (
          // No reserved height, and no centring: read and edit render the same
          // control, so the row is exactly as tall in both — a min-height that
          // applied to only one of them was itself the shift it meant to prevent.
          <div key={field.label} className="min-w-0">
            <label className="block text-[13px] font-medium text-[var(--text-label)]">{field.label}</label>
            <div className="mt-1.5 min-w-0">
              <DocumentField field={field} s={s} readOnly={readOnly} onBlockedEdit={onBlockedEdit} forceEdit={editAll} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// The stage path, as a dropdown off the "Stage n/12" pill: one row per stage —
// done (green tick), active (accent), upcoming (hollow) — with its owner. Click a
// row to jump there.
function StagePathMenu({
  activeIndex,
  completedIndexes,
  onSelect,
  variant = "heading",
}: {
  activeIndex: number;
  completedIndexes: number[];
  onSelect: (index: number) => void;
  // "heading" is the stage header's title; "crumb" is the last breadcrumb step.
  variant?: "heading" | "crumb";
}) {
  // Anchored to the trigger and portaled to the body: the form panel scrolls and
  // clips, so an absolutely-positioned menu inside it gets cut off.
  const [anchor, setAnchor] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setAnchor(null);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function onScroll(event: Event) {
      // Scrolling the menu's own list must not dismiss it.
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    // Capture phase so scrolling the form panel closes it too.
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setAnchor(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const top = rect.bottom + 6;
    setAnchor({
      left: Math.min(rect.left, window.innerWidth - 348),
      top,
      // Fit the list to whatever room is left below the trigger, so the tail of
      // the stage path is always reachable by scrolling instead of clipped.
      maxHeight: Math.max(220, window.innerHeight - top - 16),
    });
  }

  return (
    <>
      {/* The stage name IS the path trigger — one unit, no separate pill. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-[8px] text-left transition",
          variant === "heading" ? "-mx-2 -my-1 gap-2 px-2 py-1" : "-mx-1 px-1 py-0.5",
          variant === "heading" && (open ? "bg-[var(--surface-strong)]" : "hover:bg-[var(--surface-hover)]"),
        )}
      >
        {variant === "heading" ? (
          <StageIcon
            stage={STAGES[activeIndex].name}
            size={15}
            className={cn("shrink-0", open ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}
          />
        ) : null}
        <span
          className={cn(
            variant === "heading" ? "font-display min-w-0 truncate text-[18px] leading-tight" : "whitespace-nowrap text-[14px] font-medium",
            open || variant === "crumb" ? "text-[var(--accent-strong)]" : "text-[var(--text-primary)]",
          )}
        >
          {STAGES[activeIndex].name}
        </span>
        {variant === "heading" ? (
          <span className="font-mono shrink-0 whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)]">
            {activeIndex + 1}/{STAGES.length}
          </span>
        ) : null}
        <ChevronDown size={variant === "heading" ? 14 : 13} className={cn("shrink-0 text-[var(--text-muted)] transition", open && "rotate-180")} />
      </button>

      {anchor
        ? createPortal(
            <MenuSurface
              ref={menuRef}
              role="menu"
              aria-label="Stage path"
              style={{ left: anchor.left, top: anchor.top, maxHeight: anchor.maxHeight, width: 336 }}
              className="no-scrollbar fixed z-[80] overflow-y-auto overscroll-contain"
            >
              {STAGES.map((stage, index) => {
                const complete = completedIndexes.includes(index);
                const current = index === activeIndex;
                return (
                  <MenuItem
                    key={stage.name}
                    aria-current={current ? "step" : undefined}
                    selected={current}
                    icon={<span className="w-[14px] font-mono text-right text-[11px]">{index + 1}</span>}
                    meta={
                      complete ? (
                        <span className="inline-flex items-center gap-1 text-[var(--tone-success-fg)]">
                          <Check size={12} strokeWidth={3} />
                          Done
                        </span>
                      ) : current ? (
                        <span className="inline-flex items-center gap-1 text-[var(--accent-strong)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                          Active
                        </span>
                      ) : (
                        "Not started"
                      )
                    }
                    onClick={() => {
                      onSelect(index);
                      setAnchor(null);
                    }}
                  >
                    {stage.name}
                  </MenuItem>
                );
              })}
            </MenuSurface>,
            document.body,
          )
        : null}
    </>
  );
}

// A hookless, read-only field state for a stage — its recorded values are the
// mock suggestions. Cheaper than useStageFields for read-only summaries.
function readOnlyStageState(stage: StageItem): StageFieldsState {
  const fields = stage.rows.map(([label, value]) => buildFieldSpec(label, value));
  const values = Object.fromEntries(fields.map((field) => [field.label, field.suggestion]));
  const noop = () => {};
  return {
    fields,
    values,
    loadingFields: [],
    setField: noop,
    suggestField: noop,
    suggestAll: noop,
    suggestingAll: false,
    draftDurationMs: 0,
    fillNow: noop,
  };
}

// Conversations already had on this record. Each one belongs to a stage that has
// been recorded, so they read as the history of how it got here.
const STAGE_CHAT_HISTORY: ChatSession[] = [
  {
    id: "chat-business-case",
    title: "Business Case",
    when: "Jul 3",
    turns: [
      { role: "user", text: "How were the savings estimated?", time: "11:02 AM" },
      {
        role: "assistant",
        text: "From today's volume and cost: 4,200 reviews a year at £38 each, with a projected 45% time saving — about £71k a year against a £120k investment.",
      },
      { role: "user", text: "Add that to the case.", time: "11:05 AM" },
      { role: "assistant", text: "4 details added to the form", activity: "Added" },
      { role: "assistant", text: "Recorded. Payback lands just under two years, which is what the board will debate." },
    ],
  },
  {
    id: "chat-assessment",
    title: "Assessment",
    when: "Jul 5",
    turns: [
      { role: "user", text: "What are the top risks?", time: "3:20 PM" },
      {
        role: "assistant",
        text: "• Overall risk — Medium\n• Model risk — Medium, mitigated by mandatory human review\n• Ethical risk — Low, no automated decisions about people",
      },
      { role: "user", text: "Any conditions to proceed?", time: "3:22 PM" },
      { role: "assistant", text: "One: the GxP/GCP CSV documentation has to close before production. Everything else cleared." },
    ],
  },
];

// Split stage view (artifact-style): the chat on the left drives the form on the
// right, which fills live as answers land (both share one field state). Returns a
// fragment of two columns so the parent grid lays them side by side. The owner
// can click any field on the right to edit it; non-owners see it read-only.
function SplitStageView({
  stage,
  currentUser,
  onUserChange,
  lockedOwner,
  detailsOpen,
  onOpenDetails,
  stageIndex,
  completedIndexes,
  onSelectStage,
  prefill,
  isComplete,
  onMarkComplete,
  onEditBlocked,
  initialIdea,
  banner,
}: {
  stage: StageItem;
  currentUser: string;
  onUserChange: (user: string) => void;
  lockedOwner: string | null;
  detailsOpen: boolean;
  onOpenDetails: () => void;
  stageIndex: number;
  completedIndexes: number[];
  onSelectStage: (index: number) => void;
  prefill: boolean;
  isComplete: boolean;
  onMarkComplete: () => void;
  onEditBlocked: (message: string) => void;
  // What the user described on the way in, used as the chat's opening message.
  initialIdea?: string;
  // Full-width notice under the top bar (a returned / rejected stage).
  banner?: ReactNode;
}) {
  const s = useStageFields(stage, prefill);
  const owned = stage.owner === currentUser;
  const bespoke = stage.name in BESPOKE_STAGE_FORMS;
  // Conversational fill runs only on an open stage you own that isn't bespoke.
  const guided = !isComplete && owned && !bespoke;
  // Whole-form edit mode, toggled from the action bar.
  const [editAll, setEditAll] = useState(false);
  // Chat header shows a divider once the conversation scrolls beneath it. The
  // conversation's scroll container lives inside the chat components, so we grab
  // it off the captured scroll event rather than duplicating a container here —
  // that's what "jump to first message" scrolls.
  const [chatScrolled, setChatScrolled] = useState(false);
  const chatScrollElement = useRef<HTMLElement | null>(null);
  // Put away / full width — one mode, so the two can't both be on.
  const railMode = useRailMode();
  // Past conversations on this record, plus a remount key for "new chat".
  const history = useChatSessions(STAGE_CHAT_HISTORY);
  const pastSession = history.sessions.find((session) => session.id === history.activeId) ?? null;
  // Form panel shows a loading bar while the guided Ideation flow is seeding.
  const [formBusy, setFormBusy] = useState(false);

  // Captured / total — used for submit readiness.
  const capturedDone = s.fields.filter((field) => !isFieldEmpty(s.values[field.label])).length;
  const capturedTotal = s.fields.length;

  // ---- The conversation. Guided stages run the fill flow; the rest keep
  // an open, ask-anything composer (locked / bespoke / completed). ----
  let chat: ReactNode;
  if (guided) {
    // Ideation uses the scripted question-card flow; other guided stages keep
    // the conversational paragraph flow.
    chat =
      stage.name === "Ideation" ? (
        <GuidedQuestions stage={stage} s={s} idea={initialIdea} replay={prefill} onBusyChange={setFormBusy} />
      ) : (
        <ChatPanel stage={stage} s={s} />
      );
  } else {
    let intro: string;
    let editNote: string | undefined;
    if (!isComplete && !owned) {
      intro =
        `${STAGE_BRIEFS[stage.name] ?? ""} ${stage.owner} owns this one, so recording changes needs their profile — but ask me anything about it.`.trim();
      editNote = `Switch to ${stage.owner} up top to edit.`;
    } else if (!isComplete) {
      intro = `Here's the ${stage.name} so far — set the details on the form to the right, then submit.`;
      editNote = "Fill it in on the form panel.";
    } else {
      intro = `${stage.name} is complete. ${STAGE_BRIEFS[stage.name] ?? ""} Ask me anything about what was captured.`.trim();
      editNote = owned ? "Reopen it on the form panel to make changes." : `${stage.owner} can reopen it to make changes.`;
    }
    chat = <AsideChat stage={stage} intro={intro} editNote={editNote} complete={isComplete} />;
  }

  // ---- The form/document, filling live. Completed stages show the
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
        heading={<StagePathMenu activeIndex={stageIndex} completedIndexes={completedIndexes} onSelect={onSelectStage} />}
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
  // Naming the next stage tells the user what submitting actually does. The long
  // stage names use their short label so the button stays one line.
  const nextStage = STAGES[stageIndex + 1];
  const submitLabel =
    stage.name === "GTAC"
      ? "Submit decision"
      : nextStage
        ? `Proceed to ${SHORT_STAGE_LABELS[stageIndex + 1] ?? nextStage.name}`
        : "Complete the record";
  let submitReady = true;
  let submitHint: string | undefined;
  if (guided) {
    const gate = stageGateReason(stage.name, s.values);
    const allFilled = capturedTotal > 0 && capturedDone === capturedTotal;
    submitReady = allFilled && !gate;
    submitHint = gate ?? (allFilled ? undefined : `${capturedTotal - capturedDone} of ${capturedTotal} details still to capture.`);
  }

  return (
    <AppShell
      banner={banner}
      railExpanded={railMode.expanded}
      railCollapsed={railMode.collapsed}
      railHeader={
        <RailHeader
          scrolled={chatScrolled}
          expanded={railMode.expanded}
          onToggleExpand={railMode.toggleExpand}
          collapsed={railMode.collapsed}
          onToggleCollapse={railMode.toggleCollapse}
          onNewChat={() => history.startNew([], "")}
          history={<ChatHistoryButton sessions={history.sessions} activeId={history.activeId} onOpen={history.open} />}
        />
      }
      rail={
        // Capture phase: scroll doesn't bubble, so listen on the way down.
        <div
          onScrollCapture={(event) => {
            const element = event.target as HTMLElement;
            chatScrollElement.current = element;
            setChatScrolled(element.scrollTop > 4);
          }}
          className="relative mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col overflow-hidden"
          key={history.liveKey}
        >
          <JumpToTop visible={chatScrolled} onClick={() => chatScrollElement.current?.scrollTo({ top: 0, behavior: "smooth" })} />
          {pastSession ? <PastChatTranscript session={pastSession} /> : chat}
        </div>
      }
      aside={detailsOpen ? <RecordDetailsSheet onClose={onOpenDetails} /> : undefined}
    >
      {/* Row 3 names the view and where in the lifecycle it sits; the stage's own
 title, status, progress, owner and gate live in the stage header below. */}
      <ContentPanel
        breadcrumb={
          <PanelBreadcrumb
            items={[
              { label: "All use cases", href: "/" },
              { label: USE_CASE.id, href: "/overview", icon: <FileText size={13} />, title: USE_CASE.name },
              {
                label: stage.name,
                node: <StagePathMenu activeIndex={stageIndex} completedIndexes={completedIndexes} onSelect={onSelectStage} variant="crumb" />,
              },
            ]}
          />
        }
        controls={
          <>
            <ProfileSwitcher currentUser={currentUser} onUserChange={onUserChange} lockedBy={lockedOwner ?? undefined} compact />
            <TabBarToggle label="Details" icon={<Info size={15} />} active={detailsOpen} onClick={onOpenDetails} />
          </>
        }
        scroll={false}
        footer={
          <>
            {submitHint ? (
              <span className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--text-muted)]">
                <ProgressRing ratio={capturedTotal > 0 ? capturedDone / capturedTotal : 0} size={18} stroke={2} />
                <span className="min-w-0 truncate">{submitHint}</span>
              </span>
            ) : null}
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {isComplete && owned ? (
                <button type="button" onClick={onMarkComplete} className={shellButton()}>
                  <RotateCcw size={13} />
                  Reopen
                </button>
              ) : guided ? (
                <button
                  type="button"
                  onClick={() => setEditAll((v) => !v)}
                  className={cn(shellButton(), editAll && "border-[var(--border-default)] bg-[var(--surface-hover)] text-[var(--accent-strong)]")}
                >
                  {editAll ? <Check size={13} /> : <Pencil size={13} />}
                  {editAll ? "Save" : "Edit"}
                </button>
              ) : null}
              {showSubmit ? (
                <button
                  type="button"
                  onClick={onMarkComplete}
                  disabled={!submitReady}
                  data-tip={submitReady ? undefined : submitHint}
                  className={shellButton("primary")}
                >
                  <Check size={13} />
                  {submitLabel}
                </button>
              ) : null}
            </span>
          </>
        }
      >
        {/* The record first, then the stage — the same block the overview opens
            with, so moving between the two doesn't lose where you are. */}
        <RecordSummary currentUser={currentUser} />
        {formBusy ? (
          <div className="h-[3px] w-full shrink-0 overflow-hidden bg-[var(--surface-muted)]">
            <div className="loadbar h-full w-1/3 rounded-full bg-[var(--accent)]" />
          </div>
        ) : null}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{form}</div>
      </ContentPanel>
    </AppShell>
  );
}

function suggestionText(suggestion: string | string[]): string {
  return Array.isArray(suggestion) ? suggestion.join(", ") : suggestion;
}

// Fuller, conversational version of each stage's purpose — what it decides and
// what it feeds. The form shows the one-line STAGE_INTROS; the chat opens with
// this so the two panels don't read as the same sentence twice.
const STAGE_BRIEFS: Record<string, string> = {
  Ideation:
    "Let's shape the idea properly: the problem worth solving, the outcome you want, who'd use it, and the data it would touch. Everything downstream — risk tier, business case, funding — reads from what we capture here.",
  Qualification:
    "This is the screening pass. I'll check the idea against the prohibited-use list, confirm a human stays in the loop on every output, and set a provisional risk tier. That tier decides how much assessment comes later — it doesn't commit any budget yet.",
  Prioritisation:
    "Here the idea competes for attention. We score business value against how feasible it is to build, factor in cost and strategic fit, and that produces the priority score the portfolio uses to sequence work.",
  Triage:
    "Triage turns the risk signals from Qualification into a route. I'll confirm the governance tier, decide whether a full risk and compliance assessment is required, and note anything the assessors should look at first.",
  Assessment:
    "The deep review. We work through what data the model touches, where it's hosted, how it could fail, and the ethical exposure — then land an overall risk rating and the conditions that have to hold before anything gets built.",
  "Business Case":
    "Time for the numbers. We take today's review volume and cost, project what the assistant saves, and set that against the investment. Payback and three-year value are what the GTAC board will actually debate.",
  GTAC: "The board decision. I'll record the go/no-go, the recommendation it rests on, and any conditions attached to the funding. This is the gate that releases delivery.",
  "Plan & KPI":
    "Funding's approved, so now we line up delivery: the squad, the milestones, and the KPIs we'll be held to. Locking targets here is what monitoring measures against once it's live.",
  "Solution blue print":
    "The technical shape. We define the capability, where a human checks the output, how access is controlled and audited, and how often the model is retrained — these are the guardrails auditors ask about.",
  "Solutionise and Production":
    "Build evidence. I'll capture how it was configured, how the US and EU pilot went, whether validation documentation is complete, and where production deployment stands.",
  "Monitoring and tracking":
    "The post-launch reality check. We track review-time reduction against the locked target, summary accuracy, and how users rate it. Variance here is what triggers the post-deploy review.",
  Adoption:
    "Rollout and uptake. We follow training completion, the comms going out to each wave, the support model behind it, and the feedback loop that feeds improvements back into the backlog.",
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

// Prose list that stays short — names a few and trails off. Deliberately no
// count: "and 7 more" reads like a chore list in conversation.
function listWithMore(items: string[], max: number): string {
  if (items.length <= max) return joinList(items);
  return `${items.slice(0, max).join(", ")} and a few others`;
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

type ChatMessage = { id: number; role: "assistant" | "user"; text: string; recap?: boolean; time?: string; activity?: string; running?: boolean };

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

// A non-guided stage chat (locked / bespoke / completed): the chat stays open so
// every stage keeps its composer. It opens with `intro`, shows an optional
// `footer` (summary / actions), and answers any message with a canned `reply`.
function AsideChat({
  stage,
  intro,
  editNote,
  footer,
  complete = false,
}: {
  stage: StageItem;
  intro: string;
  editNote?: string;
  footer?: ReactNode;
  complete?: boolean;
}) {
  const { scrollRef, contentRef } = useBottomPinnedScroll();
  const data = useMemo(() => readOnlyStageState(stage), [stage]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);
  const replySeq = useRef(0);
  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

  const pushAssistant = (text: string) => setMessages((current) => [...current, { id: bump(), role: "assistant", text }]);
  const pushUser = (text: string) => setMessages((current) => [...current, { id: bump(), role: "user", text, time: formatChatTime() }]);
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
      f.label
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .some((w) => w.length >= 4 && lower.includes(w)),
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
    setShowStarters(false);
    pushUser(text);
    setInput("");
    sayLines([respond(text)]);
  }

  // Browsing / locked / completed starters: read the stage rather than fill it,
  // worded from this stage — its name, its owner, its headline field.
  const [showStarters, setShowStarters] = useState(true);
  const short = shortStageName(stage.name);
  const previous = previousStageName(stage.name);
  const signature = signatureField(data.fields);
  const starters: Starter[] = [
    // The stage's own questions first, then the role-aware and catch-up chips.
    ...specStarters(
      STAGE_STARTERS[stage.name]?.viewer ?? [{ icon: "doc", label: `What's in ${short}?`, read: data.fields.map((f) => f.label).slice(0, 5) }],
    ),
    complete
      ? { id: "signoff", icon: <ShieldCheck size={13} />, label: `Who signed off ${short}?` }
      : { id: "open", icon: <Info size={13} />, label: `What's left for ${firstName(stage.owner)}?` },
    previous
      ? { id: "recap", icon: <CornerUpLeft size={13} />, label: `What happened in ${previous}?` }
      : { id: "why", icon: <CornerUpLeft size={13} />, label: `Why does ${short} matter?` },
  ];

  function pickStarter(item: Starter) {
    setShowStarters(false);
    pushUser(item.label);
    if (item.spec?.read?.length) {
      sayLines([`${capturedAnswer(item.spec.read, data.values)}${editNote ? `\n\n${editNote}` : ""}`]);
      return;
    }
    if (item.spec?.reply) {
      sayLines([item.spec.reply]);
      return;
    }
    if (item.id === "recap") {
      sayLines([priorStagesRecap(stage.name)]);
      return;
    }
    if (item.id === "why") {
      sayLines([
        `${STAGE_BRIEFS[stage.name] ?? STAGE_INTROS[stage.name] ?? `${stage.name} is the first step in the lifecycle.`} ${stage.owner} owns it.${editNote ? ` ${editNote}` : ""}`,
      ]);
      return;
    }
    if (item.id === "signoff") {
      const headline =
        signature && !isFieldEmpty(data.values[signature.label])
          ? ` The ${humanizeLabel(signature.label)} was ${suggestionText(data.values[signature.label])}.`
          : "";
      sayLines([`${stage.name} was completed by ${stage.owner} and signed off at its gate.${headline}${editNote ? ` ${editNote}` : ""}`]);
      return;
    }
    const open = data.fields.filter((f) => isFieldEmpty(data.values[f.label]));
    sayLines([
      open.length
        ? `Still open on ${stage.name}: ${joinList(open.map((f) => humanizeLabel(f.label)))}. ${stage.owner} records them.${editNote ? ` ${editNote}` : ""}`
        : `Everything's filled on ${stage.name} — it's ready to submit.${editNote ? ` ${editNote}` : ""}`,
    ]);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-40 pt-2">
        <div ref={contentRef} className="space-y-4" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          <ChatTimeDivider />
          {/* Summary / recap sits on top; the conversation flows below it. */}
          {footer ? <div className="pb-1">{footer}</div> : null}
          {messages.map((message) => (
            <ChatLine key={message.id} {...message} />
          ))}
        </div>
      </div>
      <ChatDock>
        {showStarters ? <ChatStarters items={starters} onPick={pickStarter} /> : null}
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
      </ChatDock>
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
  {
    text: "Who is the business owner for this idea? Could you share their full name and title?",
    field: "Business owner",
    answer: "Dr. Sarah Mitchell — Senior Director, Clinical Operations",
  },
  {
    text: "Roughly how many people would be using this day-to-day, and in which teams?",
    field: "Target users",
    answer: "~450 users globally — Clinical Operations Managers, CRAs, Clinical Project Managers, and Medical Writers.",
  },
  { text: "Would this roll out at a single site, across a specific region, or globally?", field: "Geography", answer: "Globally." },
  {
    text: "Where do the source documents currently live — a document management system, shared drive, or somewhere else?",
    field: "Data sources",
    answer: "Enterprise CTMS and a document management system (Veeva Vault), plus some legacy protocols on secure SharePoint.",
  },
  {
    text: "Do these documents contain any patient-level, genomic, or personally identifiable information, or are they document-level content only?",
    field: "Data sensitivity",
    answer: "Primarily document-level content only — no patient-level data or PII, though some sensitive study design details need secure handling.",
  },
  {
    text: "What's the core AI capability you're expecting — summarization, retrieval Q&A, classification?",
    field: "AI capability",
    answer: "LLM summarization with retrieval Q&A over the protocol documents.",
  },
  {
    text: "Could the outputs ever feed into a regulated or compliance-critical process — such as a GxP submission or regulatory review?",
    field: "GxP impact",
    answer: "Yes — they support GxP-regulated clinical operations, so human review and approval are mandatory before any compliance-critical use.",
  },
  { text: "Do you have a target timeline in mind for delivery?", field: "Timeline", answer: "Around 6 months." },
  { text: "And is there a budget envelope for this work?", field: "Budget", answer: "~$750K." },
];

// Opening exchange shown before the follow-up questions (Ideation): the idea the
// user described on the Create page, then the AI's bridge into the follow-ups.
const IDEATION_SEED: { role: "assistant" | "user"; text: string }[] = [
  {
    role: "user",
    text: "We want to build an AI assistant that helps our Clinical Operations team summarize clinical trial protocols. Today the team manually reads long protocol documents to pull out objectives, eligibility criteria, endpoints and safety information — hours per protocol, and often inconsistent. The solution should generate a concise summary and let users ask follow-up questions. The idea is called Clinical Trial Protocol Summarizer.",
  },
  { role: "assistant", text: "That's really helpful — just a few more things to round this out!\n\nSome quick follow-ups:" },
];
// Fields the opening idea description already establishes (filled up front) —
// including the ones the follow-up questions don't cover, so the stage can be
// submitted once the flow is done.
const IDEATION_SEED_FIELDS = ["Idea name", "Problem statement", "Objective", "AI capability", "Business function"];
// Anything that reads as a "go ahead" when the agent asks to confirm a fill.
const YES_RE = /\b(yes|yep|yeah|yup|confirm|go ahead|do it|sure|ok|okay|proceed|fill|please)\b/i;

// Trim a value to one readable line in chat (the form shows it in full).
function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,.;:\s]+$/, "")}…`;
}

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
    <div className="shrink-0 pt-1.5">
      {/* Built like the composer it replaces — same box, same insets — so the
 guided flow doesn't introduce a second input shape. */}
      <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] px-2 pb-1.5 pt-2">
        <div className="flex items-center gap-0.5 px-1 font-mono text-[11px] font-medium text-[var(--text-muted)]">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            aria-label="Previous question"
            className="grid h-5 w-5 place-items-center rounded-[6px] transition hover:bg-[var(--surface-hover)] disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          {index + 1} of {total}
          <button
            type="button"
            onClick={onNext}
            disabled={index === total - 1}
            aria-label="Next question"
            className="grid h-5 w-5 place-items-center rounded-[6px] transition hover:bg-[var(--surface-hover)] disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the questions"
            className="ml-auto grid h-5 w-5 place-items-center rounded-[6px] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>

        <p className="mt-1 px-1 text-[13px] font-semibold leading-[1.45] text-[var(--text-primary)]">{question}</p>

        {/* The answer is typed straight into the card — no inset field, so the
 card reads as one input rather than a form. */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={1}
          placeholder="Write your answer"
          className="field-sizing-content no-scrollbar mt-1.5 block max-h-28 w-full resize-none bg-transparent px-1 text-[13px] leading-[19px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />

        <div className="mt-1 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onSkip}
            className="h-7 rounded-[8px] px-2 text-[12px] font-medium text-[var(--text-label)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim()}
            className="h-7 rounded-[8px] bg-[var(--accent)] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// The finished Ideation exchange, laid out in order: the idea, what was read from
// it, the confirmation, the follow-ups and their answers, then the wrap-up.
function replayTranscript({ idea, seedSummary, questions }: { idea?: string; seedSummary: string; questions: ScriptQuestion[] }): ChatMessage[] {
  const at = formatChatTime();
  const transcript: ChatMessage[] = [
    { id: bump(), role: "user", text: idea?.trim() || IDEATION_SEED[0].text, time: at },
    { id: bump(), role: "assistant", text: seedSummary },
    { id: bump(), role: "assistant", text: "Shall I add these to the form on the right? Reply “yes” to confirm." },
    { id: bump(), role: "user", text: "Yes, add them.", time: at },
    { id: bump(), role: "assistant", text: `${IDEATION_SEED_FIELDS.length} details added to the form`, activity: "Added" },
    { id: bump(), role: "assistant", text: IDEATION_SEED[1].text },
  ];
  questions.forEach((question) => {
    transcript.push({ id: bump(), role: "assistant", text: question.text });
    transcript.push({ id: bump(), role: "user", text: question.answer, time: at });
  });
  transcript.push({
    id: bump(),
    role: "assistant",
    text: `Got it — that covers the ${joinList(questions.map((question) => humanizeLabel(question.field)))}.`,
  });
  transcript.push({ id: bump(), role: "assistant", text: `${questions.length} answers added to the form`, activity: "Added" });
  transcript.push({
    id: bump(),
    role: "assistant",
    text: "Every detail is captured, so this stage is ready to submit — or tell me what to change and I'll update it.",
  });
  return transcript;
}

// Guided flow driven by a question script: asks one question at a time in a
// QuestionCard, records each answer into the shared field state, and keeps a
// running transcript above. Once through (or dismissed), it hands off to a plain
// composer so the user can still tweak details conversationally.
function GuidedQuestions({
  stage,
  s,
  idea,
  replay = false,
  onBusyChange,
}: {
  stage: StageItem;
  s: StageFieldsState;
  idea?: string;
  // The stage already holds its data: show the finished conversation rather than
  // running the capture live.
  replay?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const questions = useMemo(() => scriptFor(stage, s.fields), [stage, s.fields]);
  const fieldByLabel = useMemo(() => new Map(s.fields.map((f) => [f.label, f])), [s.fields]);

  // What the opening description already establishes, as a "here's what I read"
  // list the user confirms before any of it lands on the form.
  const seedSummary = useMemo(() => {
    const lines = IDEATION_SEED_FIELDS.map((label) => {
      const f = fieldByLabel.get(label);
      return f ? `• ${label} — ${clip(suggestionText(f.suggestion), 68)}` : null;
    }).filter(Boolean);
    return `Here's what I picked up from your description:\n\n${lines.join("\n")}`;
  }, [fieldByLabel]);

  const [idx, setIdx] = useState(0);
  // Answers prefilled with each question's example — editable, or Skip to clear.
  const [answers, setAnswers] = useState<Record<number, string>>(() => Object.fromEntries(questions.map((q, i) => [i, q.answer])));
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  // Already captured: the conversation that captured it *is* the initial state —
  // nothing is typed and nothing fills, the record is simply at this point.
  const [messages, setMessages] = useState<ChatMessage[]>(() => (replay ? replayTranscript({ idea, seedSummary, questions }) : []));
  // seed = opening exchange; confirmSeed = await the user's yes on what was
  // extracted from their description; questions = the card flow; confirm = recap
  // + await the yes before filling the answers; done = wrap-up.
  const [phase, setPhase] = useState<"seed" | "confirmSeed" | "questions" | "confirm" | "done">(replay ? "done" : "seed");
  const done = phase === "done";
  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useBottomPinnedScroll();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pushAssistant = (text: string) => setMessages((m) => [...m, { id: bump(), role: "assistant", text }]);
  const pushUser = (text: string) => setMessages((m) => [...m, { id: bump(), role: "user", text, time: formatChatTime() }]);
  const pushActivity = (activity: string, text: string) => setMessages((m) => [...m, { id: bump(), role: "assistant", text, activity }]);

  // The agent "thinks" between the user's idea and its bridge reply.
  const [thinking, setThinking] = useState(false);

  // Show the user's idea, then a thinking beat, then the summary of what was
  // extracted — nothing reaches the form until the user confirms it.
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  useEffect(() => {
    // A replayed stage has its transcript already; only the live flow animates.
    if (replay) return;

    // 1. the idea the user described (from Create) appears first.
    timers.current.push(
      window.setTimeout(
        () => setMessages((cur) => [...cur, { id: bump(), role: "user", text: idea?.trim() || IDEATION_SEED[0].text, time: formatChatTime() }]),
        300,
      ),
    );
    // 2. the agent thinks…
    timers.current.push(window.setTimeout(() => setThinking(true), 600));
    // 3. …then recaps what it extracted and asks to confirm.
    timers.current.push(
      window.setTimeout(() => {
        setThinking(false);
        setMessages((cur) => [
          ...cur,
          { id: bump(), role: "assistant", text: seedSummary },
          { id: bump(), role: "assistant", text: "Shall I add these to the form on the right? Reply “yes” to confirm." },
        ]);
        setPhase("confirmSeed");
      }, 1900),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Captured answers are held until the user confirms — only then is the form
  // written to.
  const resultRef = useRef<{ answers: Record<number, string>; skipped: Record<number, boolean> }>({ answers: {}, skipped: {} });

  // All questions answered → recap the Q&A, summarise, and ask to confirm before
  // touching the form.
  function finish(nextAnswers: Record<number, string>, nextSkipped: Record<number, boolean>) {
    resultRef.current = { answers: nextAnswers, skipped: nextSkipped };
    const recap = questions
      .map((q, i) => (nextSkipped[i] || !(nextAnswers[i] ?? "").trim() ? null : `Q: ${q.text}\nA: ${nextAnswers[i].trim()}`))
      .filter(Boolean)
      .join("\n\n");
    const answered = questions.filter((_, i) => !nextSkipped[i] && (nextAnswers[i] ?? "").trim());
    const transcript: ChatMessage[] = [];
    if (recap) transcript.push({ id: bump(), role: "user", text: recap, time: formatChatTime() });
    transcript.push({
      id: bump(),
      role: "assistant",
      text: `Got it — that covers the ${joinList(answered.map((q) => humanizeLabel(q.field)))}.`,
    });
    transcript.push({ id: bump(), role: "assistant", text: "Want me to fill these into the form on the right? Reply “yes” to confirm." });
    setMessages((m) => [...m, ...transcript]);
    setPhase("confirm");
  }

  function advance(nextAnswers: Record<number, string>, nextSkipped: Record<number, boolean>) {
    if (idx >= questions.length - 1) finish(nextAnswers, nextSkipped);
    else setIdx(idx + 1);
  }

  // Answers are only recorded locally here — the form is written after confirm.
  function saveCurrent() {
    const answer = (answers[idx] ?? "").trim();
    if (!answer) return;
    const nextSkipped = { ...skipped, [idx]: false };
    setSkipped(nextSkipped);
    advance(answers, nextSkipped);
  }

  function skipCurrent() {
    const nextSkipped = { ...skipped, [idx]: true };
    setSkipped(nextSkipped);
    advance(answers, nextSkipped);
  }

  // Confirmed the extracted details → write those fields, then move into the
  // follow-up questions for what the description didn't cover.
  function fillSeed() {
    onBusyChange?.(true);
    let d = 0;
    IDEATION_SEED_FIELDS.forEach((label) => {
      const f = fieldByLabel.get(label);
      if (f) s.fillNow(label, f.suggestion, 300 + d++ * 200);
    });
    timers.current.push(window.setTimeout(() => onBusyChange?.(false), 300 + d * 200 + 400));
    pushActivity("Adding", `${IDEATION_SEED_FIELDS.length} details to the form`);
    pushAssistant(IDEATION_SEED[1].text);
    setPhase("questions");
  }

  // On confirmation, write every captured answer into the form, with the
  // loading state.
  function fillForm() {
    onBusyChange?.(true);
    let d = 0;
    questions.forEach((q, i) => {
      if (resultRef.current.skipped[i]) return;
      const a = (resultRef.current.answers[i] ?? "").trim();
      if (a && fieldByLabel.has(q.field)) s.fillNow(q.field, a, 300 + d++ * 200);
    });
    timers.current.push(window.setTimeout(() => onBusyChange?.(false), 300 + d * 200 + 400));
    const filled = new Set([
      ...IDEATION_SEED_FIELDS,
      ...questions.filter((_, i) => !resultRef.current.skipped[i] && (resultRef.current.answers[i] ?? "").trim()).map((q) => q.field),
    ]);
    const stillOpen = s.fields.filter((f) => isFieldEmpty(s.values[f.label]) && !filled.has(f.label));
    pushActivity("Adding", "your answers to the form");
    if (stillOpen.length) {
      pushAssistant(
        `Done — it's on the form now. Still to capture: ${listWithMore(
          stillOpen.map((f) => humanizeLabel(f.label)),
          4,
        )}. Tell me and I'll add them.`,
      );
    } else {
      pushAssistant("Every detail is captured — submit the stage when it looks right.");
    }
    setPhase("done");
  }

  // Composer send: confirm the fill, or (post-fill) apply free-text edits.
  function handleSend() {
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setInput("");
    if (phase === "confirmSeed" || phase === "confirm") {
      if (YES_RE.test(text)) {
        if (phase === "confirmSeed") fillSeed();
        else fillForm();
      } else {
        pushAssistant("No problem — tell me what to change, or say “yes” when you're ready to fill the form.");
      }
      return;
    }
    // Post-fill free-text edits.
    const fills = extractStageFields(text, s.fields, []);
    fills.forEach((fill, i) => s.fillNow(fill.label, fill.value, 300 + i * 200));
    pushAssistant(
      fills.length
        ? `Done — updated the ${joinList(fills.map((f) => humanizeLabel(f.label)))}. Anything else, or submit on the form.`
        : "Sure — tell me the field and the new value, or edit it on the form. Submit when it looks right.",
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-40 pt-2">
        <div ref={contentRef} className="space-y-4" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          <ChatTimeDivider />
          {messages.map((message) => (
            <ChatLine key={message.id} {...message} />
          ))}
          {thinking ? <ChatLine activity="Reading" text="your description for the details it already covers" running /> : null}
        </div>
      </div>
      <ChatDock>
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
            onSend={handleSend}
            sendDisabled={!input.trim()}
            placeholder={
              phase === "confirmSeed" || phase === "confirm"
                ? "“Yes” to confirm, or say what to change…"
                : done
                  ? "Ask me to change any detail, or submit on the form…"
                  : "Type a message…"
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
        )}
      </ChatDock>
    </div>
  );
}

// Rows that read as an earlier stage's outcome — used for the catch-up recap and
// to pick the field a stage is best known by.

// ── Per-stage conversation starters ──
// Each stage gets its own openers, because the work differs: Triage sets a tier,
// Business Case runs numbers, Adoption chases training. `fill` does the stage's
// work (writes those fields), `read` answers from what's captured, `reply` is a
// canned explanation. Owner sets act; viewer sets ask.
type StarterSpec = { icon: "spark" | "info" | "shield" | "doc"; label: string; fill?: string[]; read?: string[]; reply?: string };

const STARTER_ICONS: Record<StarterSpec["icon"], ReactNode> = {
  spark: <Sparkles size={13} />,
  info: <Info size={13} />,
  shield: <ShieldCheck size={13} />,
  doc: <FileText size={13} />,
};

const STAGE_STARTERS: Record<string, { owner: StarterSpec[]; viewer: StarterSpec[] }> = {
  Ideation: {
    owner: [
      { icon: "spark", label: "Sketch the problem and objective", fill: ["Problem statement", "Objective"] },
      { icon: "info", label: "Who would use this?", fill: ["Target users", "Geography"] },
    ],
    viewer: [
      { icon: "info", label: "What problem does this solve?", read: ["Problem statement", "Objective"] },
      { icon: "doc", label: "Who's it for?", read: ["Target users", "Business function"] },
    ],
  },
  Qualification: {
    owner: [
      {
        icon: "shield",
        label: "Is this a prohibited use?",
        reply:
          "No — it's document summarisation with a human reviewing every output, so it stays inside policy. Nothing here is an automated decision about a person.",
      },
      { icon: "spark", label: "Set oversight and decision impact", fill: ["Human oversight", "Decision impact", "Data sensitivity"] },
    ],
    viewer: [
      { icon: "shield", label: "Why did this pass screening?", read: ["Human oversight", "Decision impact"] },
      { icon: "doc", label: "Was anything similar built already?", read: ["Duplication check"] },
    ],
  },
  Prioritisation: {
    owner: [
      { icon: "spark", label: "Score value against feasibility", fill: ["Business value", "Technical feasibility", "Complexity"] },
      { icon: "info", label: "Work out the priority score", fill: ["Cost", "Strategic alignment", "Priority score"] },
    ],
    viewer: [
      { icon: "info", label: "How was the priority score set?", read: ["Priority score", "Business value", "Technical feasibility"] },
      { icon: "doc", label: "Does it fit the strategy?", read: ["Strategic alignment"] },
    ],
  },
  Triage: {
    owner: [
      { icon: "shield", label: "Which risk tier applies?", fill: ["Risk governance tier"] },
      { icon: "spark", label: "Does it need a full assessment?", fill: ["Compliance assessment required", "Triage notes"] },
    ],
    viewer: [
      { icon: "shield", label: "Why this risk tier?", read: ["Risk governance tier", "Triage notes"] },
      { icon: "info", label: "Is a compliance assessment needed?", read: ["Compliance assessment required"] },
    ],
  },
  Assessment: {
    owner: [
      { icon: "shield", label: "Assess PII and data hosting", fill: ["PII", "Data hosted risk"] },
      { icon: "spark", label: "Rate model and ethical risk", fill: ["Model risk", "Ethical risk", "Overall risk"] },
    ],
    viewer: [
      { icon: "shield", label: "What are the top risks?", read: ["Overall risk", "Model risk", "Ethical risk"] },
      { icon: "doc", label: "Which checks are cleared?", read: ["Compliance checks"] },
    ],
  },
  "Business Case": {
    owner: [
      {
        icon: "spark",
        label: "Estimate the savings",
        fill: ["Current annual volume", "Current cost per review", "Projected time savings", "Projected annual savings"],
      },
      { icon: "info", label: "Work out the payback", fill: ["Investment", "Payback period", "3-year net value"] },
    ],
    viewer: [
      { icon: "info", label: "What's the payback?", read: ["Payback period", "Investment", "3-year net value"] },
      { icon: "doc", label: "How were savings estimated?", read: ["Current annual volume", "Projected time savings", "Projected annual savings"] },
    ],
  },
  GTAC: {
    owner: [
      { icon: "spark", label: "Record the board's decision", fill: ["Go / No-Go", "Recommendation"] },
      { icon: "shield", label: "Risk versus return?", fill: ["ROI payback", "Overall risk"] },
    ],
    viewer: [
      { icon: "shield", label: "What did the board decide?", read: ["Go / No-Go", "Recommendation"] },
      { icon: "doc", label: "Any conditions attached?", read: ["Board notes"] },
    ],
  },
  "Plan & KPI": {
    owner: [
      { icon: "spark", label: "Draft the delivery plan", fill: ["Project plan"] },
      { icon: "info", label: "Which KPIs do we lock?", fill: ["KPIs", "Targets locked"] },
    ],
    viewer: [
      { icon: "info", label: "What are the KPIs?", read: ["KPIs", "Targets locked"] },
      { icon: "doc", label: "What's the delivery plan?", read: ["Project plan"] },
    ],
  },
  "Solution blue print": {
    owner: [
      { icon: "shield", label: "Set the guardrails", fill: ["Human checkpoint", "Access control", "Audit trail"] },
      { icon: "spark", label: "How often do we retrain?", fill: ["Capability", "Retraining cadence"] },
    ],
    viewer: [
      { icon: "shield", label: "What are the guardrails?", read: ["Human checkpoint", "Access control", "Audit trail"] },
      { icon: "info", label: "How often is it retrained?", read: ["Retraining cadence"] },
    ],
  },
  "Solutionise and Production": {
    owner: [
      { icon: "spark", label: "Log the pilot results", fill: ["Build & configure", "Pilot (US & EU)"] },
      { icon: "shield", label: "Is validation documented?", fill: ["CSV documentation", "Production deployment"] },
    ],
    viewer: [
      { icon: "info", label: "How did the pilot go?", read: ["Pilot (US & EU)"] },
      { icon: "shield", label: "Is it validated and live?", read: ["CSV documentation", "Production deployment"] },
    ],
  },
  "Monitoring and tracking": {
    owner: [
      { icon: "spark", label: "Log the latest metrics", fill: ["Review time reduction", "Summary accuracy", "Writer satisfaction (CSAT)"] },
      { icon: "info", label: "Where's adoption at?", fill: ["Adoption rate"] },
    ],
    viewer: [
      { icon: "info", label: "Is it hitting its targets?", read: ["Review time reduction", "Summary accuracy"] },
      { icon: "doc", label: "How do users rate it?", read: ["Writer satisfaction (CSAT)", "Adoption rate"] },
    ],
  },
  Adoption: {
    owner: [
      { icon: "spark", label: "Who still needs training?", fill: ["Training completed"] },
      { icon: "doc", label: "Plan comms and support", fill: ["Change management comms", "Support model", "Feedback loop"] },
    ],
    viewer: [
      { icon: "info", label: "How's uptake going?", read: ["Training completed", "Change management comms"] },
      { icon: "doc", label: "How do users get help?", read: ["Support model", "Feedback loop"] },
    ],
  },
};

// Short, stage-aware bits used to word the starter chips per stage.
const shortStageName = (name: string) => SHORT_STAGE_LABELS[STAGES.findIndex((item) => item.name === name)] ?? name;
const previousStageName = (name: string) => {
  const index = STAGES.findIndex((item) => item.name === name);
  return index > 0 ? shortStageName(STAGES[index - 1].name) : "";
};
// The field a stage reads as being *about* — its outcome row, else its first.
const signatureField = (fields: FieldSpec[]) => fields.find((f) => OUTCOME_ROW.test(f.label)) ?? fields[0];

// "What happened before this stage" — one headline per earlier stage, taken from
// its outcome-ish row (or its first row as a fallback).
function priorStagesRecap(stageName: string): string {
  const index = STAGES.findIndex((item) => item.name === stageName);
  const prior = STAGES.slice(0, Math.max(0, index));
  if (!prior.length) return "This is the first stage — nothing has happened before it yet.";
  const lines = prior.map((item) => {
    const row = item.rows.find(([label]) => OUTCOME_ROW.test(label)) ?? item.rows[0];
    return `• ${item.name} — ${clip(row[1], 64)} (${item.owner})`;
  });
  return `Here's where things got to before this stage:\n\n${lines.join("\n")}`;
}

// Tap-to-send openers, shown while a stage's chat has no user input yet so
// there's always an obvious way in. Compact chips that wrap — they sit above the
// composer without eating the conversation's space.
type Starter = { id: string; icon: ReactNode; label: string; spec?: StarterSpec };

// Turn a stage's authored specs into chips.
const specStarters = (specs: StarterSpec[] = []): Starter[] =>
  specs.map((spec, index) => ({ id: `spec-${index}`, icon: STARTER_ICONS[spec.icon], label: spec.label, spec }));

// Answer a "what's the X?" starter from what the stage has captured.
function capturedAnswer(labels: string[], values: Record<string, string | string[]>): string {
  return labels
    .map((label) => {
      const value = values[label] ?? "";
      return isFieldEmpty(value) ? `• ${label} — not recorded yet` : `• ${label} — ${suggestionText(value)}`;
    })
    .join("\n");
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
  const pushUser = (text: string) => setMessages((current) => [...current, { id: bump(), role: "user", text, time: formatChatTime() }]);

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
      sayLines(
        [
          "That's everything I need. Take a quick look at the form on the right — everything should be filled in. When it looks right, hit Submit at the bottom.",
        ],
        () => setDone(true),
      );
    }
  }

  // Openers, shown until the user says (or picks) something.
  const [showStarters, setShowStarters] = useState(true);

  const openLabels = () => s.fields.filter((f) => isFieldEmpty(s.values[f.label])).map((f) => f.label);

  // Open with a brief — what this stage is for and what it still needs — then the
  // first question. Starters below cover the "how do I begin" case.
  useEffect(() => {
    const first = firstOpenGroup(initialHandled);
    const needs = openLabels();
    const brief = [
      STAGE_BRIEFS[stage.name] ?? STAGE_INTROS[stage.name],
      needs.length ? `To get through it I need the ${listWithMore(needs.map(humanizeLabel), 4)}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    sayLines(
      [
        brief,
        first
          ? groupQuestion(first, groupRemaining(first, initialHandled), false)
          : "Everything's already filled — review the form and submit when it looks right.",
      ].filter(Boolean),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft every still-open field from the earlier stages, then wrap up.
  function draftEverything() {
    const open = s.fields.filter((f) => !handled.includes(f.label) && isFieldEmpty(s.values[f.label]));
    open.forEach((field, index) => s.fillNow(field.label, field.suggestion, 450 + index * 250));
    const drafted = [...handled, ...open.map((f) => f.label)];
    setHandled(drafted);
    sayLines(
      [
        `I've drafted the ${listWithMore(
          open.map((f) => humanizeLabel(f.label)),
          4,
        )} from what the earlier stages recorded — check the form and tweak anything that's off.`,
      ],
      finish,
    );
  }

  // Owner starters, worded from this stage: what it's called, what it's about,
  // what came before. On an already-filled (prefilled) stage they read/revise
  // instead of fill.
  const short = shortStageName(stage.name);
  const previous = previousStageName(stage.name);
  const recapStarter: Starter = previous
    ? { id: "recap", icon: <CornerUpLeft size={13} />, label: `What happened in ${previous}?` }
    : { id: "why", icon: <CornerUpLeft size={13} />, label: `Why does ${short} matter?` };
  // Stage-authored openers: act on an open stage, read on a filled one. Stages
  // without authored copy fall back to the generic draft/needs pair.
  const authored = STAGE_STARTERS[stage.name];
  const authoredSpecs = done ? authored?.viewer : authored?.owner;
  const starters: Starter[] = authoredSpecs?.length
    ? [...specStarters(authoredSpecs), recapStarter]
    : done
      ? [{ id: "captured", icon: <FileText size={13} />, label: `What's in ${short}?` }, recapStarter]
      : [
          { id: "draft", icon: <Sparkles size={13} />, label: "Draft it from what we know" },
          { id: "needs", icon: <Info size={13} />, label: `What does ${short} need?` },
          recapStarter,
        ];

  // Run an authored starter: fill the stage's fields, read them back, or explain.
  function runSpec(spec: StarterSpec) {
    if (spec.fill?.length) {
      const targets = spec.fill.map((label) => fieldByLabel.get(label)).filter((f): f is FieldSpec => Boolean(f));
      const toFill = targets.filter((f) => isFieldEmpty(s.values[f.label]));
      if (!toFill.length) {
        sayLines([
          `Already recorded:\n\n${capturedAnswer(
            targets.map((f) => f.label),
            s.values,
          )}`,
        ]);
        return;
      }
      toFill.forEach((field, index) => s.fillNow(field.label, field.suggestion, 450 + index * 250));
      const drafted = [...handled, ...toFill.map((f) => f.label)];
      setHandled(drafted);
      const stillOpen = s.fields.filter((f) => !drafted.includes(f.label) && isFieldEmpty(s.values[f.label]));
      sayLines(
        [
          `Set the ${joinList(toFill.map((f) => humanizeLabel(f.label)))} on the form — tweak anything that's off.${
            stillOpen.length
              ? ` Still open: ${listWithMore(
                  stillOpen.map((f) => humanizeLabel(f.label)),
                  3,
                )}.`
              : ""
          }`,
        ],
        stillOpen.length ? undefined : finish,
      );
      return;
    }
    if (spec.read?.length) {
      sayLines([capturedAnswer(spec.read, s.values)]);
      return;
    }
    if (spec.reply) sayLines([spec.reply]);
  }

  function pickStarter(item: Starter) {
    setShowStarters(false);
    pushUser(item.label);
    if (item.spec) {
      runSpec(item.spec);
      return;
    }
    if (item.id === "draft") {
      draftEverything();
      return;
    }
    if (item.id === "captured") {
      const filled = s.fields.filter((f) => !isFieldEmpty(s.values[f.label]));
      sayLines([
        filled.length
          ? `${stage.name} has:\n\n${filled.map((f) => `• ${f.label} — ${clip(suggestionText(s.values[f.label]), 64)}`).join("\n")}`
          : `Nothing's captured on ${stage.name} yet.`,
      ]);
      return;
    }
    if (item.id === "why") {
      sayLines([
        `${STAGE_BRIEFS[stage.name] ?? STAGE_INTROS[stage.name] ?? `${stage.name} is the first step in the lifecycle.`} You own it, so it's yours to record.`,
      ]);
      return;
    }
    if (item.id === "needs") {
      const needs = openLabels();
      sayLines([
        needs.length
          ? `${stage.name} needs the ${joinList(needs.map(humanizeLabel))} — you own it, and it goes to the gate once submitted.\nAnswer in your own words and I'll fill the form as we go.`
          : "Nothing's outstanding — review the form on the right and submit when it looks right.",
      ]);
      return;
    }
    sayLines([priorStagesRecap(stage.name)]);
  }

  // Send a reply — the typed input, or an override (the accepted ghost reply).
  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text) return;
    setShowStarters(false);

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
        sayLines(["Perfect — every compliance check is cleared. Review the form on the right and hit Submit when it looks right."], () =>
          setDone(true),
        );
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
    <div className="relative flex h-full min-h-0 flex-col bg-transparent">
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-40 pt-2">
        <div ref={contentRef} className="space-y-4" role="log" aria-live="polite" aria-label={`${stage.name} conversation`}>
          <ChatTimeDivider />
          {messages.map((message) => (
            <ChatLine key={message.id} {...message} />
          ))}
        </div>
      </div>

      <ChatDock>
        {showStarters ? <ChatStarters items={starters} onPick={pickStarter} /> : null}
        <ChatComposer
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSend={() => send()}
          sendDisabled={!input.trim()}
          placeholder={
            done
              ? "Ask me to change any detail, or submit on the form…"
              : gating
                ? "Reply to clear the remaining checks…"
                : ghost || "Describe it in your own words…"
          }
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
      </ChatDock>
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
      <span className={cn("absolute right-2 grid h-6 w-6 place-items-center text-[var(--accent)]", tall ? "top-2" : "top-1/2 -translate-y-1/2")}>
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
  // A multi-select's value can arrive from the chat as one written line
  // ("Pilot; CSV documentation"), so read it back as its items either way.
  const selected = Array.isArray(value) ? value : listItems(text);

  if (spec.kind === "scale") {
    return <RatingStepper hideHeader label={spec.label} max={spec.max ?? 5} value={text} onChange={onChange} />;
  }

  if (spec.kind === "level") {
    return <LevelSlider hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "currency") {
    const { currency, amount } = splitCurrency(text);
    return (
      <CurrencyField
        hideHeader
        label={spec.label}
        amount={amount}
        currency={currency}
        currencies={CURRENCY_CODES}
        stepBy={10000}
        onAmount={(next) => onChange(`${currency} ${next}`.trim())}
        onCurrency={(next) => onChange(`${next} ${amount}`.trim())}
      />
    );
  }

  if (spec.kind === "date") {
    return <DateField hideHeader label={spec.label} value={text} onChange={onChange} />;
  }

  // Choice fields deliberately don't share one control: a two-way choice is a
  // toggle, a tag-shaped value is a pill row, a short enum a segmented row, a
  // wordy one a radio list, and a long list a searchable dropdown.
  if (spec.kind === "toggle") {
    return <SegmentedToggle hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "tag") {
    return <ChipSelect hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "segmented") {
    return <Segmented hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "radio") {
    return <RadioGroup hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />;
  }

  if (spec.kind === "select") {
    return (
      <div className="max-w-[360px]">
        <SearchableSelect hideHeader label={spec.label} options={spec.options ?? []} value={text} onChange={onChange} />
      </div>
    );
  }

  if (spec.kind === "cards") {
    return (
      <CardMultiSelect hideHeader label={spec.label} options={spec.options ?? []} values={selected} onChange={onChange} />
    );
  }

  if (spec.kind === "chips") {
    return (
      <ChipMultiSelect hideHeader label={spec.label} options={spec.options ?? []} values={selected} onChange={onChange} />
    );
  }

  // Free text (short or long) uses the growing editor so nothing truncates and
  // the box keeps the read view's metrics. A short answer gets a short box —
  // a two-word value in a column-wide field reads as a field that failed to fill.
  return (
    <div className={textBoxWidth(spec)}>
      <GrowText value={text} onChange={onChange} onSuggest={onSuggest} label={spec.label} />
    </div>
  );
}

// How wide a free-text box should be, from the length of the answer it holds.
function textBoxWidth(spec: FieldSpec) {
  if (spec.kind === "long") return "w-full";
  const length = typeof spec.suggestion === "string" ? spec.suggestion.length : 96;
  if (length <= 24) return "max-w-[300px]";
  if (length <= 56) return "max-w-[460px]";
  return "w-full";
}

// Record free-text editor: grows with its content (never truncates a value to one
// clipped line) and carries the same font, padding and inset as the read view, so
// toggling Edit doesn't move anything on the page.
function GrowText({ value, onChange, onSuggest, label }: { value: string; onChange: (value: string) => void; onSuggest: () => void; label: string }) {
  return (
    <div className="relative w-full min-w-0">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={1}
        aria-label={label}
        // ponytail: field-sizing handles the auto-grow; older browsers scroll instead.
        // The floor matches one line of text plus the box: `field-sizing: content`
        // collapses an empty field, and it collapses further once disabled, which
        // made a blank answer shorter when read than when edited.
        className="field-sizing-content min-h-[38px] w-full resize-none rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 pr-9 text-[15px] leading-[1.6] text-[var(--text-primary)] outline-none transition focus:border-[var(--border-input)]"
      />
      <button
        type="button"
        onClick={onSuggest}
        aria-label={`Suggest ${label}`}
        data-tip="Suggest"
        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-[8px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-strong)]"
      >
        <Sparkles size={14} />
      </button>
    </div>
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

const PLAN_METRICS = ["Invoice triage time −60%", "Auto-routing accuracy ≥95%", "AP-team adoption ≥80% by go-live +60d"];

// Plan is rendered in the same label-left row layout as the generic stage
// forms, so its bespoke widgets (squad, milestones, metrics) read as one system.
function PlanStageForm() {
  return (
    <div>
      <div className="px-7 pt-1">
        <MandateBanner />
      </div>
      <div className="mt-5 divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)]">
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
            className="block w-full resize-none rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-2.5 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-input)] focus:ring-2 focus:ring-[var(--accent-soft)]"
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
        <span className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">{label}</span>
        {hint ? <span className="text-[11px] leading-4 text-[var(--text-muted)]">{hint}</span> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MandateBanner() {
  return (
    <div className="rounded-[10px] border border-[var(--tone-success-border)] bg-gradient-to-r from-[#eef6f0] to-[#f6faf7] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--tone-success-fg)] text-white">
          <Check size={19} strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tone-success-fg)]">Funded · GTAC approved</div>
          <div className="font-display text-[20px] leading-6 text-[var(--text-primary)]">GBP 180k approved</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["2 binding conditions", "Go-live Q3 2026", "Standard tier"].map((chip) => (
          <span
            key={chip}
            className="whitespace-nowrap rounded-full border border-[var(--tone-success-border)] bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#25603f]"
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
                  ? "border-[var(--border-default)] bg-[var(--surface-hover)]"
                  : "border-[var(--border-default)] bg-white hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]",
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
                  on ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-strong)] text-[var(--text-label)]",
                )}
              >
                {initials(member.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold leading-5 text-[var(--text-primary)]">{member.name}</span>
                <span className="block truncate text-[11px] leading-4 text-[var(--text-muted)]">{member.role}</span>
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
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--border-default)] bg-[var(--surface-hover)] text-[11px] font-semibold text-[var(--accent-strong)]">
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
                isLocked ? "border-[var(--tone-success-border)] bg-[var(--tone-success-bg)]" : "border-[var(--border-default)] bg-white",
              )}
            >
              <span className="text-[13px] font-medium leading-5 text-[var(--text-primary)]">{metric}</span>
              {isLocked ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#a9d9bc] bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--tone-success-fg)]">
                  <Lock size={12} /> Locked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setLocked((current) => current.map((value, j) => (j === index ? true : value)))}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)] transition hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
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
  if (lowerLabel.includes("business value") || lowerLabel.includes("feasibility") || lowerLabel.includes("strategic alignment"))
    return ["1/5", "2/5", "3/5", "4/5", "5/5"];
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
  return [
    "controls",
    "conditions",
    "scope",
    "sources",
    "guardrails",
    "integrations",
    "evidence",
    "interventions",
    "metrics",
    "milestones",
    "improvements",
    "pipeline",
    "compliance checks",
  ].some((token) => lowerLabel.includes(token));
}

function listItems(value: string) {
  return value
    .split(/\s*(?:;|,|->)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}
