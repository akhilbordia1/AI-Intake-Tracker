"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
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

// ── What the gate chip says on hover ──
// A chip has room for one fact; the hover is where the rest of the gate lives, so the
// reader doesn't have to open the record's Details sheet to learn what "R3 · In review"
// is made of. `\n` renders as lines in the shared tooltip layer.
//
// The risk chip used to carry the same kind of hover (a `riskTip` listing the model,
// ethical, hosting and PII levels). It doesn't any more: those six ratings are the first
// section of the written summary, and the summary now has its own labelled button, so a
// hover that half-answered the question was competing with the thing that fully answers
// it — on a chip that no longer clicks.
const first = (items: string[], keep: number) => {
  const shown = items.slice(0, keep).join(", ");
  return items.length > keep ? `${shown} +${items.length - keep}` : shown;
};

// First line is the heading; the rest are `Label: value` rows the tooltip layer
// sets as a small table.
const tipLines = (heading: string, rows: (readonly [string, string | undefined | null])[]) =>
  [heading, ...rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`)].join("\n");

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
export function RecordSummary({
  currentUser,
  divider = true,
  blank = false,
}: {
  currentUser: string;
  divider?: boolean;
  // A record with nothing captured. Its header can't claim a name, a problem, a risk
  // rating or a gate — none of that has been recorded — so it says what it is and shows
  // the owner of the stage it's sitting in. Every chip and the Risk Insight button drop
  // out on their own, because each one is guarded on a value that no longer exists.
  blank?: boolean;
}) {
  const [riskOpen, setRiskOpen] = useState(false);
  const activeStage = blank ? STAGES[0] : STAGES[ACTIVE_STAGE_INDEX];
  const tier = blank ? undefined : stageValue("Triage", "Risk governance tier");
  const overallRisk = blank ? undefined : stageValue("Assessment", "Overall risk level");
  const gateOnActive = blank ? undefined : gateForStage(activeStage.name);
  const ownedByMe = activeStage.owner === currentUser;

  return (
    // The rule comes and goes (it appears once content scrolls under the block), so
    // the padding can't move with it — the block would grow as you scrolled.
    <div className={cn("border-b px-6 pb-4 pt-5", divider ? "border-[var(--border-hairline)]" : "border-transparent")}>
      <h2 className="font-display text-[28px] leading-tight text-[var(--text-primary)]">{blank ? "Untitled use case" : USE_CASE.name}</h2>

      {/* The same serif italic the empty fields use, so a record with no problem
          statement reads as "not captured yet" rather than as a record about nothing. */}
      {blank ? (
        <p className="font-serif-body mt-2.5 max-w-[82ch] text-[14px] italic leading-6 text-[var(--text-faint)]">
          Nothing captured yet — the problem statement is the first thing Ideation asks for.
        </p>
      ) : (
        <p className="mt-2.5 max-w-[82ch] text-[14px] leading-6 text-[var(--text-body)]">{stageValue("Ideation", "Problem statement")}</p>
      )}

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
        {/* No calendar glyph: the word "Go-live" already says it's a date, and the row
            has to fit an owner, two states and a control on one line. */}
        <span data-tip="Target go-live" className="inline-flex items-center gap-1.5">
          Go-live <span className="font-mono text-[var(--text-body)]">{(blank ? undefined : recordDetail("Target go-live")) ?? "—"}</span>
        </span>

        <MetaRule />
        <span className="flex shrink-0 items-center gap-1.5">
          {/* Both chips are now what a chip is: a state, not a control. The risk chip used
              to be the door to the written summary, which meant the one clickable thing on
              the record looked exactly like the tag beside it that does nothing. */}
          {tier ? (
            <Tag tone={riskTone(overallRisk)} icon={<ShieldCheck size={11} />} className={CHIP}>
              {overallRisk ? `${overallRisk} risk` : `${tier} assessment`}
            </Tag>
          ) : null}
          {/* The gate chip drops the shield the risk chip carries: two identical glyphs
              side by side read as one badge split in half, and `R3` is already this
              chip's identity. */}
          {gateOnActive ? (
            <Tag tone={gateStatusTone(gateOnActive.status)} data-tip={gateTip(gateOnActive)} className={CHIP}>
              <span className="font-mono">{gateOnActive.id}</span> · {gateOnActive.status}
            </Tag>
          ) : null}

          {/* The door to the summary, labelled, and inside the status group rather than
              after another rule — it's about the risk chip next to it, and the button's own
              border is already a divider. A written assessment is something the assistant
              produced, so it takes the Sparkles glyph and the accent, the same pairing
              every other AI read on this record uses. */}
          {tier ? (
            <button
              type="button"
              onClick={() => setRiskOpen(true)}
              className="ml-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)] outline-none transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              <Sparkles size={12} className="text-[var(--accent)]" />
              Risk Insight
            </button>
          ) : null}
        </span>
      </div>

      {/* Not rendered on a blank record: there is no assessment to summarise, and the
          dialog would otherwise sit in the markup carrying the seeded record's name. */}
      {blank ? null : <RiskSummaryModal open={riskOpen} onClose={() => setRiskOpen(false)} />}
    </div>
  );
}
