/** Intake field keys + labels aligned with `/intake` (New use case) step 2. */

export type IntakeFieldValue = string | string[];

export type IntakeFieldDef = {
  key: string;
  label: string;
  type: "text" | "long";
  wide?: boolean;
  required?: boolean;
  hint?: string;
};

export type IntakeSectionDef = {
  title: string;
  fields: IntakeFieldDef[];
};

export const INTAKE_FORM_SECTIONS: IntakeSectionDef[] = [
  {
    title: "Use case details",
    fields: [
      { key: "name", label: "Use case name", type: "text", required: true },
      {
        key: "oneLineDescription",
        label: "One-line description",
        type: "text",
        required: true,
        wide: true,
        hint: "How you'd explain this to a colleague in one sentence",
      },
      { key: "businessProblem", label: "Business problem", type: "long", required: true, wide: true },
      { key: "desiredOutcome", label: "Desired outcome", type: "long", required: true, wide: true },
      { key: "kpis", label: "KPIs", type: "long", wide: true, hint: "Baseline and target for productivity, customer experience, and adoption" },
      { key: "alternatives", label: "Alternatives considered", type: "long", wide: true },
      { key: "targetUsers", label: "Target users", type: "text", wide: true },
    ],
  },
  {
    title: "Scope of solution",
    fields: [
      { key: "modelArchetype", label: "Model archetype", type: "text", required: true },
      { key: "scopeIn", label: "In scope", type: "long", wide: true },
      { key: "scopeOut", label: "Out of scope", type: "long", wide: true },
    ],
  },
  {
    title: "Organization",
    fields: [
      { key: "department", label: "Department", type: "text", required: true },
      { key: "functionArea", label: "Function", type: "text" },
      { key: "team", label: "Team", type: "text" },
      { key: "country", label: "Country", type: "text" },
    ],
  },
  {
    title: "Technical details",
    fields: [
      { key: "needsExternalSupport", label: "Need external technical support?", type: "text", required: true },
      { key: "technicalDescription", label: "Technical description", type: "long", wide: true },
    ],
  },
  {
    title: "Data",
    fields: [
      { key: "dataSources", label: "Data sources", type: "long", required: true, wide: true, hint: "Source, data type, and lawful basis for each" },
      { key: "dqaAvailable", label: "Data quality assessment available", type: "text" },
      { key: "dqaPercentage", label: "DQA percentage", type: "text" },
      { key: "piiPresent", label: "PII present?", type: "text", required: true },
      { key: "residency", label: "Data residency", type: "text", required: true },
      { key: "retention", label: "Data retention", type: "text", required: true },
    ],
  },
  {
    title: "Autonomy",
    fields: [
      { key: "humanInLoop", label: "Is there a human in the loop?", type: "text", required: true },
      { key: "autonomy", label: "Autonomy level", type: "text", required: true, wide: true },
    ],
  },
  {
    title: "Ownership",
    fields: [
      { key: "businessSponsor", label: "Business sponsor", type: "text", required: true },
      { key: "goLiveDate", label: "Target go-live date", type: "text" },
    ],
  },
];

/** Demo intake for UC-142 — Support Ticket Response Agent (matches New use case form fields). */
export const UC_142_INTAKE_DATA: Record<string, IntakeFieldValue> = {
  name: "Support Ticket Response Agent",
  oneLineDescription: "AI agent that drafts first-line replies to tier-1 support tickets from approved knowledge base articles.",
  businessProblem:
    "Tier-1 agents spend too long drafting repetitive first responses to common support tickets, slowing handle times and creating inconsistent tone across regions.",
  desiredOutcome:
    "Agents review and send AI-drafted replies in seconds — first-response time drops while quality stays aligned with approved knowledge.",
  kpis: [
    "Productivity (Hours saved per agent per day): 6 → 18",
    "Customer experience (CSAT %): 68 → 85",
    "Adoption (% of eligible tickets using draft): 40 → 80",
  ].join("\n"),
  alternatives: "Continue fully manual drafting; expand static template library without AI; outsource tier-1 responses to BPO.",
  targetUsers: "Tier-1 customer support agents (~120 agents across EU, UK, and US queues)",
  modelArchetype: "Agent",
  scopeIn: "Draft first-line responses to tier-1 tickets using approved knowledge base articles; suggest routing labels for edge cases.",
  scopeOut: "Direct customer sends without agent review; billing disputes; escalated complaints; social-channel responses.",
  department: "Support",
  functionArea: "Customer Experience",
  team: "Tier-1 Operations",
  country: "Global / multi-country",
  needsExternalSupport: "No",
  technicalDescription:
    "Uses existing Zendesk integration and internal knowledge-base retrieval API; platform-native drafting pattern is available — retrieval wiring still being validated with CX ops.",
  dataSources: [
    "Source 1: Zendesk — ticket metadata & customer contact",
    "  Data type: Customer PII · Lawful basis: Contract",
    "",
    "Source 2: Knowledge Base — approved support articles",
    "  Data type: Operational data · Lawful basis: Legitimate interest",
  ].join("\n"),
  dqaAvailable: "Yes",
  dqaPercentage: "72",
  piiPresent: "Yes",
  residency: "EU and US processing; EU customer data remains in EU region.",
  retention: "Ticket inputs and AI drafts retained 30 days, then purged.",
  humanInLoop: "Yes",
  autonomy: "Semi-autonomous — human reviews before action",
  businessSponsor: "Nora Singh",
  goLiveDate: "Jun 15, 2026",
};

export function formatIntakeKpis(form: {
  productivityMetric: string;
  productivityBaseline: string;
  productivityTarget: string;
  customerExpMetric: string;
  customerExpBaseline: string;
  customerExpTarget: string;
  adoptionBaseline: string;
  adoptionTarget: string;
}): string {
  return [
    `Productivity (${form.productivityMetric}): ${form.productivityBaseline} → ${form.productivityTarget}`,
    `Customer experience (${form.customerExpMetric}): ${form.customerExpBaseline} → ${form.customerExpTarget}`,
    `Adoption: ${form.adoptionBaseline}% → ${form.adoptionTarget}%`,
  ].join("\n");
}

export function formatIntakeDataSources(sources: { source: string; dataType: string; lawfulBasis: string }[]): string {
  return sources
    .filter((row) => row.source.trim() || row.dataType.trim() || row.lawfulBasis.trim())
    .map((row, index) => {
      const lines = [`Source ${index + 1}: ${row.source.trim() || "—"}`];
      if (row.dataType.trim() || row.lawfulBasis.trim()) {
        lines.push(`  Data type: ${row.dataType.trim() || "—"} · Lawful basis: ${row.lawfulBasis.trim() || "—"}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatIntakeGoLiveDate(dateStr: string): string {
  if (!dateStr.trim()) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr.trim();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Read helpers for downstream journey logic (no inference — reads stored values only). */
export function intakeText(data: Record<string, IntakeFieldValue>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

export function intakeHasPii(data: Record<string, IntakeFieldValue>): boolean {
  if (intakeText(data, "piiPresent") === "Yes") return true;
  const sources = intakeText(data, "dataSources").toLowerCase();
  return sources.includes("pii") || sources.includes("personal");
}

export function intakeModelArchetype(data: Record<string, IntakeFieldValue>): string {
  return intakeText(data, "modelArchetype") || intakeText(data, "type");
}

export function intakeObjective(data: Record<string, IntakeFieldValue>): string {
  return intakeText(data, "businessProblem") || intakeText(data, "objective") || intakeText(data, "oneLineDescription");
}
