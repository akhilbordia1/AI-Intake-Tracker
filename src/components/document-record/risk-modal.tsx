"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Markdown } from "@/components/document-record/markdown";
import { USE_CASE } from "@/data/document-workflow-form-schema";
import { GATES, stageValue } from "@/data/lifecycle";

// ── The risk summary ──
// What the risk chip on the record header opens: the assessment read as a written
// summary rather than six rows of ratings. The whole thing is one Markdown string,
// rendered by `Markdown` — so the copy can come from a model or an .md file, and
// every bit of structure it needs (a pulled-out verdict, a table of dimensions,
// numbered escalations, a footnote) is available as syntax rather than as layout
// code here.
// ai-upgrade: replace `summary()` with the model call; keep the Markdown shape.

function summary() {
  // Values read as the record writes them ("Medium", "Full"); lower-casing is fine
  // mid-sentence, never at the start of one.
  const level = (label: string) => (stageValue("Assessment", label) ?? "—").toLowerCase();
  const tier = (stageValue("Triage", "Risk governance tier") ?? "Standard").toLowerCase();
  const overall = stageValue("Assessment", "Overall risk level") ?? "Unrated";
  const pii = stageValue("Assessment", "Personal data (PII) in scope") === "No" ? "None" : "In scope";
  const gate = GATES.find((entry) => entry.status === "In review") ?? GATES[GATES.length - 1];
  const accuracy = stageValue("Plan & KPI", "KPIs and measurement targets")?.match(/\d+%/)?.[0] ?? "95%";

  return `**${overall} risk**, on the ${tier} assessment path.

> The exposure is accuracy, not autonomy: the assistant summarises, a writer signs every summary, and nothing reaches a regulator unreviewed.

## What drives it

| Dimension | Level | Why |
| --- | --- | --- |
| Model | ${level("Model risk level")} | 200+ page protocols; a missed endpoint or dosing detail isn't always obvious on review |
| Ethical | ${level("Ethical risk level")} | No decisions about people, no profiling, nothing published unreviewed |
| Data hosting | ${level("Data hosting risk level")} | Enterprise tenancy behind existing SSO; nothing leaves the estate |
| Personal data | ${pii.toLowerCase()} | Document-level protocol content only |

## What holds it there

- Writer review and **sign-off** before a summary is used — the control the rating leans on most
- Every summary and edit logged for \`21 CFR Part 11\`
- Access through the existing identity provider; no separate credential store
- Quarterly performance review, retraining only on detected drift

## What would raise it

1. Patient-identifiable data entering scope
2. Removing the writer sign-off
3. Output reaching a submitted document without CSV re-validation
4. Accuracy falling below the \`${accuracy}\` target for two consecutive months

---

*\`${gate.id}\` · ${gate.name.toLowerCase()} is ${gate.status.toLowerCase()} with ${gate.approver}.*`;
}

export function RiskSummaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // A native dialog, so Escape, the backdrop and focus containment come for free
  // rather than as three more effects.
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop hits the dialog element itself; a click inside lands
      // on a child, so this closes on the backdrop without a second listener.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="risk-summary-title"
      className="m-auto max-h-[82vh] w-[min(620px,calc(100vw-32px))] overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-0 text-[var(--text-primary)] backdrop:bg-[rgba(12,10,9,0.38)]"
    >
      <div className="flex max-h-[82vh] flex-col">
        <header className="flex shrink-0 items-start gap-2 border-b border-[var(--border-hairline)] px-6 pb-3.5 pt-4">
          <span className="min-w-0 flex-1">
            <h2 id="risk-summary-title" className="font-display text-[18px] leading-tight">
              Risk summary
            </h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.07em] text-[var(--text-muted)]">{USE_CASE.name} · Assessment</p>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={15} />
          </button>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-4">
          <Markdown source={summary()} />
        </div>
      </div>
    </dialog>
  );
}
