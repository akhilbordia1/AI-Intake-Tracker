"use client";

import { useEffect, useState } from "react";

import { MarkdownModal } from "@/components/document-record/markdown-modal";
import { USE_CASE } from "@/data/document-workflow-form-schema";
import { GATES, stageValue } from "@/data/lifecycle";
import { fillTemplate } from "@/lib/content";

// ── The risk summary ──
// What the record header's "AI Risk Insight" button opens: the assessment read as a
// written summary rather than six rows of ratings.
//
// The copy is not in this file. It's authored Markdown in `public/content/risk-summary.md`
// — served statically, fetched the first time the modal opens, so the wording can be
// rewritten and reloaded with no build step and nothing to re-run. What stays here is the
// list of values the copy interpolates, read from `lifecycle.ts` so the document and the
// rest of the record can't disagree.
// ai-upgrade: this is the seam. A model call replaces the fetch and returns the same
// Markdown shape; `values()` becomes the context you hand it.

const SOURCE = "/content/risk-summary.md";

// Values as the record writes them. Lower-cased where the copy uses them mid-sentence or
// in a table cell; left as recorded where a sentence starts with them.
function values() {
  const level = (label: string) => (stageValue("Assessment", label) ?? "—").toLowerCase();
  const gate = GATES.find((entry) => entry.status === "In review") ?? GATES[GATES.length - 1];

  return {
    overall: stageValue("Assessment", "Overall risk level") ?? "Unrated",
    tier: (stageValue("Triage", "Risk governance tier") ?? "Standard").toLowerCase(),
    modelRisk: level("Model risk level"),
    ethicalRisk: level("Ethical risk level"),
    hostingRisk: level("Data hosting risk level"),
    pii: stageValue("Assessment", "Personal data (PII) in scope") === "No" ? "none" : "in scope",
    gateId: gate.id,
    gateName: gate.name.toLowerCase(),
    gateStatus: gate.status.toLowerCase(),
    gateApprover: gate.approver,
    accuracyTarget: stageValue("Plan & KPI", "KPIs and measurement targets")?.match(/\d+%/)?.[0] ?? "95%",
  };
}

export function RiskSummaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [source, setSource] = useState("");

  // Fetched on first open, then kept — the copy doesn't change while the page is up, and
  // re-reading it every time the dialog opens would flash the loading line.
  useEffect(() => {
    if (!open || source) return;
    let live = true;
    fetch(SOURCE)
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} for ${SOURCE}`);
        return response.text();
      })
      .then((text) => {
        if (live) setSource(fillTemplate(text, values()));
      })
      .catch((error: Error) => {
        // Say which file and why, rather than opening an empty document: the failure a
        // reader can act on is "the copy is missing", not a blank dialog.
        if (live) setSource(`**The assessment copy could not be loaded.**\n\n\`${SOURCE}\` — ${error.message}`);
      });
    return () => {
      live = false;
    };
  }, [open, source]);

  return (
    <MarkdownModal
      open={open}
      onClose={onClose}
      title="Risk summary"
      subtitle={`${USE_CASE.name} · Assessment`}
      source={source || "*Reading the assessment…*"}
    />
  );
}
