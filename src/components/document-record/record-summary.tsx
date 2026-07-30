"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";

import { PersonAvatar } from "@/components/profile";
import { Tag, type Tone } from "@/components/ui/kit";
import { USE_CASE } from "@/data/document-workflow-form-schema";
import { ACTIVE_STAGE_INDEX, RECORD_DETAILS, STAGES, gateForStage, stageValue, type Gate } from "@/data/lifecycle";
import { cn } from "@/lib/cn";

// ── The record's header block ──
// What the use case is and where it stands: shown at the top of both the overview
// and the workflow, so the record itself is always in view — the stage header
// below it only describes the stage you're in.

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

export function RecordSummary({ currentUser }: { currentUser: string }) {
  const activeStage = STAGES[ACTIVE_STAGE_INDEX];
  const tier = stageValue("Triage", "Risk governance tier");
  const overallRisk = stageValue("Assessment - Risk & Compliance", "Overall risk");
  const gateOnActive = gateForStage(activeStage.name);
  const ownedByMe = activeStage.owner === currentUser;

  return (
    <div className="border-b border-[var(--border-hairline)] px-6 pb-5 pt-5">
      <h2 className="font-display text-[20px] leading-tight text-[var(--text-primary)]">{USE_CASE.name}</h2>

      <p className="mt-3 max-w-[82ch] text-[14px] leading-6 text-[var(--text-body)]">{stageValue("Ideation", "Problem statement")}</p>

      {/* Facts as chips: an icon carries the label, so the row reads at a glance
 instead of as three `label · value` pairs. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] py-1 pl-1 pr-2.5 text-[13px]">
          <PersonAvatar name={activeStage.owner} size={20} highlight={ownedByMe} />
          <span className={cn("text-[var(--text-primary)]", ownedByMe && "font-semibold")}>{activeStage.owner}</span>
        </span>

        {tier ? (
          <Tag
            tone={riskTone(overallRisk)}
            icon={<ShieldCheck size={12} />}
            title={`Risk tier — ${tier}${overallRisk ? `, ${overallRisk.toLowerCase()} overall risk` : ""}`}
            className="px-2.5 py-1 text-[12px]"
          >
            {overallRisk ? `${overallRisk} risk` : `${tier} assessment`}
          </Tag>
        ) : null}

        <span
          data-tip="Target go-live"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-2.5 py-1 text-[13px] text-[var(--text-primary)]"
        >
          <CalendarDays size={12} className="text-[var(--text-muted)]" />
          {recordDetail("Target go-live") ?? "—"}
        </span>

        {gateOnActive ? (
          <Tag tone={gateStatusTone(gateOnActive.status)} icon={<ShieldCheck size={12} />} className="px-2.5 py-1 text-[12px]">
            {gateOnActive.id} · {gateOnActive.status}
          </Tag>
        ) : null}
      </div>

      <p className="mt-3 text-[12px] text-[var(--text-muted)]">
        Raised by {recordDetail("Created by")} on {recordDetail("Created on")}.
      </p>
    </div>
  );
}
