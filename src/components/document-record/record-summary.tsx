"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PersonAvatar } from "@/components/profile";
import { RiskSummaryModal } from "@/components/document-record/risk-modal";
import { CHIP, Tag, type Tone } from "@/components/ui/kit";
import { USE_CASE } from "@/data/document-workflow-form-schema";
import { ACTIVE_STAGE_INDEX, RECORD_DETAILS, STAGES, gateForStage, stageValue, type Gate } from "@/data/lifecycle";
import { cn } from "@/lib/cn";

// ── The record's header block ──
// What the use case is and where it stands: shown at the top of both the overview
// and the workflow, so the record itself is always in view — the stage header
// below it only describes the stage you're in.

// A hairline between facts, quieter than a dot at this size.
function MetaRule() {
  return <span aria-hidden className="h-3 w-px shrink-0 bg-[var(--border-default)]" />;
}

const recordDetail = (label: string) => RECORD_DETAILS.find(([key]) => key === label)?.[1];

// Risk and gate wording map onto the product's four tones — no bespoke colours.
function riskTone(risk?: string): Tone {
  const value = (risk ?? "").toLowerCase();
  if (value.includes("high") || value.includes("critical")) return "danger";
  if (value.includes("medium")) return "warning";
  if (value.includes("low")) return "success";
  return "neutral";
}

function gateStatusTone(status: Gate["status"]): Tone {
  if (status === "Passed") return "success";
  if (status === "Blocked" || status === "Rejected") return "danger";
  if (status === "In review") return "warning";
  if (status === "Waived") return "waived";
  return "neutral";
}

// ── What the two status chips say on hover ──
// A chip has room for one fact; the hover is where the rest of the assessment
// lives, so the reader doesn't have to open the record's Details sheet to learn
// what "Medium risk" or "R3 · In review" is made of. `\n` renders as lines in the
// shared tooltip layer.
const first = (items: string[], keep: number) => {
  const shown = items.slice(0, keep).join(", ");
  return items.length > keep ? `${shown} +${items.length - keep}` : shown;
};

// First line is the heading; the rest are `Label: value` rows the tooltip layer
// sets as a small table.
const tipLines = (heading: string, rows: (readonly [string, string | undefined | null])[]) =>
  [heading, ...rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`)].join("\n");

function riskTip(tier: string, overallRisk?: string) {
  const checks = (stageValue("Assessment", "Compliance checks") ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return tipLines(`${tier} assessment tier`, [
    ["Overall risk", overallRisk],
    ["Model risk", stageValue("Assessment", "Model risk level")],
    ["Ethical risk", stageValue("Assessment", "Ethical risk level")],
    ["Data hosting", stageValue("Assessment", "Data hosting risk level")],
    ["Personal data", stageValue("Assessment", "Personal data (PII) in scope")],
    ["Checks", checks.length ? first(checks, 3) : null],
  ]);
}

function gateTip(gate: Gate) {
  return tipLines(`${gate.id} · ${gate.name}`, [
    ["Status", gate.status],
    ["Approver", gate.approver],
    ["Decided", gate.decided],
    ["Evidence", gate.artifacts.length ? first(gate.artifacts, 2) : null],
    ["Conditions", gate.conditions.length ? first(gate.conditions, 1) : null],
  ]);
}

// `divider` draws the rule beneath the block — the record page needs it, because
// the stage form scrolls under it. Where the next thing is a boxed table, the box
// is the edge and whitespace does the separating.
export function RecordSummary({ currentUser, divider = true }: { currentUser: string; divider?: boolean }) {
  const [riskOpen, setRiskOpen] = useState(false);
  const activeStage = STAGES[ACTIVE_STAGE_INDEX];
  const tier = stageValue("Triage", "Risk governance tier");
  const overallRisk = stageValue("Assessment", "Overall risk level");
  const gateOnActive = gateForStage(activeStage.name);
  const ownedByMe = activeStage.owner === currentUser;

  return (
    // The rule comes and goes (it appears once content scrolls under the block), so
    // the padding can't move with it — the block would grow as you scrolled.
    <div className={cn("border-b px-6 pb-4 pt-5", divider ? "border-[var(--border-hairline)]" : "border-transparent")}>
      <h2 className="font-display text-[28px] leading-tight text-[var(--text-primary)]">{USE_CASE.name}</h2>

      <p className="mt-2.5 max-w-[82ch] text-[14px] leading-6 text-[var(--text-body)]">{stageValue("Ideation", "Problem statement")}</p>

      {/* One meta line: facts on the left as plain text separated by rules, status
          on the right as chips. Four identical pills made the owner, a date and two
          different states all look like the same kind of thing. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[var(--text-muted)]">
        {/* Labelled like the date beside it: a name on its own didn't say whether
            it was the requester, the approver or whose turn it is. */}
        <span data-tip={`Owns the ${activeStage.name} stage`} className="inline-flex items-center gap-1.5">
          Owner
          <PersonAvatar name={activeStage.owner} size={20} highlight={ownedByMe} />
          <span className={cn("text-[var(--text-body)]", ownedByMe && "font-semibold text-[var(--text-primary)]")}>{activeStage.owner}</span>
        </span>

        <MetaRule />
        <span data-tip="Target go-live" className="inline-flex items-center gap-1.5">
          <CalendarDays size={12} />
          Go-live <span className="font-mono text-[var(--text-body)]">{recordDetail("Target go-live") ?? "—"}</span>
        </span>

        <MetaRule />
        <span className="flex shrink-0 items-center gap-1.5">
          {/* The one chip that opens something: the risk rating is the record fact
              people most often need explained, so it's the door to the summary. */}
          {tier ? (
            <button
              type="button"
              onClick={() => setRiskOpen(true)}
              data-tip={riskTip(tier, overallRisk)}
              className="rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            >
              <Tag tone={riskTone(overallRisk)} icon={<ShieldCheck size={11} />} className={cn(CHIP, "hover:brightness-[0.97]")}>
                {overallRisk ? `${overallRisk} risk` : `${tier} assessment`}
              </Tag>
            </button>
          ) : null}
          {gateOnActive ? (
            <Tag
              tone={gateStatusTone(gateOnActive.status)}
              icon={<ShieldCheck size={11} />}
              data-tip={gateTip(gateOnActive)}
              className={CHIP}
            >
              <span className="font-mono">{gateOnActive.id}</span> · {gateOnActive.status}
            </Tag>
          ) : null}
        </span>
      </div>

      <RiskSummaryModal open={riskOpen} onClose={() => setRiskOpen(false)} />
    </div>
  );
}
