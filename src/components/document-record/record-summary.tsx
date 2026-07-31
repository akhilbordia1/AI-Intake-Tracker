"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";

import { PersonAvatar } from "@/components/profile";
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
  return "neutral";
}

// `divider` draws the rule beneath the block — the record page needs it, because
// the stage form scrolls under it. Where the next thing is a boxed table, the box
// is the edge and whitespace does the separating.
export function RecordSummary({ currentUser, divider = true }: { currentUser: string; divider?: boolean }) {
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
        <span className="inline-flex items-center gap-1.5">
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
          {tier ? (
            <Tag
              tone={riskTone(overallRisk)}
              icon={<ShieldCheck size={11} />}
              data-tip={`Risk tier — ${tier}${overallRisk ? `, ${overallRisk.toLowerCase()} overall risk` : ""}`}
              className={CHIP}
            >
              {overallRisk ? `${overallRisk} risk` : `${tier} assessment`}
            </Tag>
          ) : null}
          {gateOnActive ? (
            <Tag
              tone={gateStatusTone(gateOnActive.status)}
              icon={<ShieldCheck size={11} />}
              data-tip={`${gateOnActive.name} — approver ${gateOnActive.approver}`}
              className={CHIP}
            >
              <span className="font-mono">{gateOnActive.id}</span> · {gateOnActive.status}
            </Tag>
          ) : null}
        </span>
      </div>
    </div>
  );
}
