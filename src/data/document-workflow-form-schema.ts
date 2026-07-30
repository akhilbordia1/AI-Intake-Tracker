import { INTAKE_FORM_SECTIONS, UC_142_INTAKE_DATA } from "@/data/intake-form-schema";

export type FieldType = "text" | "long" | "select" | "radio" | "multi" | "file" | "number";
export type FieldValue = string | string[];

export type WorkflowFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  hint?: string;
  placeholder?: string;
  required?: boolean;
  def?: FieldValue;
  wide?: boolean;
  currencyKey?: string;
  amountSuffix?: string;
  hidden?: boolean;
};

export type WorkflowSectionDef = {
  title: string;
  fields: WorkflowFieldDef[];
};

export type WorkflowStageDef = {
  id: string;
  circleLabel: string;
  title: string;
  owner: string;
  sections: WorkflowSectionDef[];
};

export const USE_CASE = {
  id: "UC-142",
  name: "Support Ticket Response Agent",
};

export const CURRENCY_CODES = ["EUR", "USD", "GBP"];
export const CURRENCY_OPTIONS = [
  { code: "EUR", label: "EUR" },
  { code: "USD", label: "USD" },
  { code: "GBP", label: "GBP" },
];

const FUNCTIONAL_ASSESSORS = ["Dr. Anja Bauer", "Priya Rao", "Marco Vidal", "James Okonkwo", "Elena Vasquez", "Lina Martin"];

const GOVERNANCE_PATH_OPTIONS = ["Full", "Standard", "Lightweight"];

const intakeSections: WorkflowSectionDef[] = INTAKE_FORM_SECTIONS.map((section) => ({
  title: section.title,
  fields: section.fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    wide: field.wide,
    required: field.required,
    hint: field.hint,
  })),
}));

export const WORKFLOW_STAGES: WorkflowStageDef[] = [
  {
    id: "intake",
    circleLabel: "Stage 1",
    title: "Intake & Submission",
    owner: "Mira Kapoor",
    sections: intakeSections,
  },
  {
    id: "screening",
    circleLabel: "Stage 2",
    title: "Initial Screening",
    owner: "Mira Kapoor",
    sections: [
      {
        title: "Viability check",
        fields: [
          {
            key: "scr_problem",
            label: "Is the problem clearly defined?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Roughly", "Not yet"],
            def: "Yes",
          },
          {
            key: "scr_sponsor",
            label: "Is an executive sponsor committed?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Identified, not confirmed", "No"],
            def: "Yes",
          },
          {
            key: "scr_feasibility",
            label: "Is technical feasibility confirmed with what's available today?",
            type: "radio",
            wide: true,
            options: ["Yes - we have what we need", "Partially - gaps to close first", "Not yet - needs capabilities we don't have"],
            def: "Partially - gaps to close first",
          },
          {
            key: "scr_data",
            label: "Is the data needed available and accessible?",
            type: "radio",
            wide: true,
            options: ["Yes", "Partially", "Not yet"],
            def: "Partially",
          },
          {
            key: "scr_notes",
            label: "Screening notes",
            type: "long",
            wide: true,
            hint: "Anything that helps the portfolio lead prioritize.",
            def: "Clear sponsor; knowledge-base access being confirmed with CX ops; platform drafting pattern is available but retrieval wiring still needs validation.",
          },
        ],
      },
    ],
  },
  {
    id: "prioritization",
    circleLabel: "Stage 3",
    title: "Functional Prioritization",
    owner: "Dr. Anja Bauer",
    sections: [
      {
        title: "Value & readiness",
        fields: [
          {
            key: "pri_value",
            label: "Expected business outcome",
            type: "select",
            wide: true,
            options: ["Transformational", "High", "Moderate", "Incremental"],
            def: "High",
          },
          {
            key: "pri_readiness",
            label: "Functional readiness",
            type: "select",
            wide: true,
            options: ["Ready now", "Ready this quarter", "Needs groundwork"],
            def: "Ready this quarter",
          },
          {
            key: "pri_strategic",
            label: "Strategic alignment",
            type: "long",
            wide: true,
            hint: "How does this map to the function's priorities?",
            def: "Directly supports the Global Medical Affairs goal of faster, compliant field response.",
          },
          {
            key: "pri_rank",
            label: "Priority within the function's portfolio",
            type: "select",
            wide: true,
            required: true,
            options: ["Critical", "High", "Medium", "Low", "Deprioritise"],
            def: "High",
          },
          {
            key: "pri_sponsorConfirm",
            label: "Sponsor confirmed at VP level?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Pending"],
            def: "Yes",
          },
        ],
      },
      {
        title: "Investment economics",
        fields: [
          { key: "pri_currency", label: "Currency", type: "select", options: CURRENCY_CODES, def: "EUR", hidden: true },
          {
            key: "pri_opexCurrent",
            label: "Current annual cost of operation",
            type: "text",
            wide: true,
            required: true,
            currencyKey: "pri_currency",
            amountSuffix: "million",
            hint: "What this process costs today without AI.",
            def: "1.4",
            placeholder: "1.4",
          },
          {
            key: "pri_benefit",
            label: "Quantified annual benefit",
            type: "text",
            wide: true,
            required: true,
            currencyKey: "pri_currency",
            amountSuffix: "million",
            hint: "Expected savings or value per year once live.",
            def: "0.9",
            placeholder: "0.9",
          },
          {
            key: "pri_capex",
            label: "Estimated CAPEX (build)",
            type: "text",
            wide: true,
            required: true,
            currencyKey: "pri_currency",
            amountSuffix: "thousand",
            hint: "One-time build and implementation.",
            def: "180",
            placeholder: "180",
          },
          {
            key: "pri_opex",
            label: "Estimated OPEX (annual run)",
            type: "text",
            wide: true,
            required: true,
            currencyKey: "pri_currency",
            amountSuffix: "thousand",
            hint: "Recurring run cost once in production.",
            def: "60",
            placeholder: "60",
          },
          {
            key: "pri_payback",
            label: "Payback period",
            type: "select",
            wide: true,
            required: true,
            options: ["< 6 months", "6-12 months", "12-24 months", "> 24 months"],
            def: "6-12 months",
          },
          {
            key: "pri_portfolioFit",
            label: "Enterprise portfolio fit",
            type: "text",
            wide: true,
            hint: "Why this pattern scales beyond this one use case.",
            def: "Reusable CX drafting pattern across Med Info and PV intake",
          },
        ],
      },
    ],
  },
  {
    id: "triage",
    circleLabel: "Stage 4",
    title: "Triage",
    owner: "Rohan Desai",
    sections: [
      {
        title: "Assessment scope",
        fields: [
          {
            key: "tri_complexity",
            label: "Technical complexity",
            type: "select",
            wide: true,
            required: true,
            options: ["Low", "Medium", "High"],
            def: "Medium",
          },
          {
            key: "tri_governancePath",
            label: "Governance path required",
            type: "radio",
            wide: true,
            required: true,
            options: GOVERNANCE_PATH_OPTIONS,
            hint: "Full - every gate, every check. Standard - core gates only. Lightweight - light-touch review.",
            def: "Full",
          },
          {
            key: "tri_assessments",
            label: "Assessments required",
            type: "multi",
            wide: true,
            required: true,
            options: [
              "Detailed risk (R2)",
              "Data protection (DPIA)",
              "Security review",
              "Model risk",
              "Legal / regulatory",
              "Vendor due diligence",
              "Fundamental Rights Impact Assessment (FRIA)",
              "Conformity assessment",
            ],
            def: ["Detailed risk (R2)", "Data protection (DPIA)", "Security review"],
          },
          {
            key: "tri_owner",
            label: "Assigned functional assessor",
            type: "select",
            wide: true,
            options: FUNCTIONAL_ASSESSORS,
            hint: "Portfolio lead who will run the detailed risk assessment.",
            def: "Dr. Anja Bauer",
          },
          {
            key: "tri_notes",
            label: "Triage notes",
            type: "long",
            wide: true,
            def: "Customer-facing drafting agent - route through standard governed delivery with full detailed risk assessment.",
          },
        ],
      },
    ],
  },
  {
    id: "definition",
    circleLabel: "Stage 5",
    title: "Detailed Risk Assessment",
    owner: "Dr. Anja Bauer",
    sections: [
      {
        title: "Risk assessment",
        fields: [
          {
            key: "highRisk",
            label: "Is this a high-risk AI use case?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "No", "Not sure - ask GTAC"],
            hint: "Think about impact on people's safety, rights, or access to services.",
            def: "No",
          },
          {
            key: "prohibitedListCheck",
            label: "Has this use case been checked against the prohibited or high-risk list?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes, checked & confirmed not high-risk", "Yes, confirmed high-risk", "Not checked yet"],
            def: "Yes, checked & confirmed not high-risk",
          },
          {
            key: "purpose",
            label: "What does this AI do, and in what context?",
            type: "long",
            required: true,
            wide: true,
            hint: "Plain language - what it does day to day.",
            def: "It drafts replies to customer support tickets for an agent to check before sending.",
          },
          {
            key: "affectedPeople",
            label: "Who could be harmed if this goes wrong, and how?",
            type: "long",
            required: true,
            wide: true,
            hint: "Name the actual group, not just customers.",
            def: "Customers who submit support tickets, around 120k a year - they could get an inaccurate or badly-worded reply if the agent doesn't catch it first.",
          },
          {
            key: "risks",
            label: "What's the worst realistic thing that could go wrong?",
            type: "long",
            required: true,
            wide: true,
            hint: "Think safety, fairness, and misuse - not just technical bugs.",
            def: "An agent stops reading drafts carefully and just sends them, or the AI pulls an outdated answer from the knowledge base and it goes to a customer.",
          },
          {
            key: "unmitigatedHarm",
            label: "What would the harm actually be if no human review or safety net existed?",
            type: "long",
            required: true,
            wide: true,
            hint: "Describe the raw risk, before any mitigations are applied.",
            def: "Inaccurate or misleading replies could go directly to customers - wrong refund amounts, incorrect policy guidance, or tone-deaf responses on sensitive issues.",
          },
          {
            key: "oversight",
            label: "Can a person step in and override it before it causes harm?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes, always", "Sometimes", "No - it acts on its own"],
            def: "Yes, always",
          },
          {
            key: "accuracyThreshold",
            label: "What level of accuracy is acceptable, and how will it be measured?",
            type: "long",
            required: true,
            wide: true,
            hint: "Example: percent of outputs approved without edit, error rate threshold. Must be defined before build starts.",
            def: "90% or more of drafts approved without material edit; factual error rate below 3% on a weekly spot-check sample of 200 tickets.",
          },
          {
            key: "dataReady",
            label: "Is the data it uses relevant, representative, and checked for bias?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Mostly, with some gaps", "Not checked yet"],
            def: "Mostly, with some gaps",
          },
        ],
      },
    ],
  },
  {
    id: "businesscase",
    circleLabel: "Stage 6",
    title: "Business Case Review",
    owner: "Lena Fischer",
    sections: [
      {
        title: "GTAC submission",
        fields: [
          { key: "bc_fundingCurrency", label: "Currency", type: "select", options: CURRENCY_CODES, def: "EUR", hidden: true },
          {
            key: "bc_fundingRequired",
            label: "Funding required",
            type: "text",
            wide: true,
            required: true,
            currencyKey: "bc_fundingCurrency",
            amountSuffix: "million",
            hint: "Total year-one investment ask in millions - build plus first-year run.",
            def: "0.24",
          },
          {
            key: "bc_strategyFit",
            label: "How this fits the AI Core Team strategy",
            type: "long",
            wide: true,
            hint: "How this use case advances the enterprise AI portfolio and roadmap - not just this function's backlog.",
            def: "",
          },
        ],
      },
    ],
  },
  {
    id: "gtac",
    circleLabel: "Stage 7",
    title: "GTAC Approval",
    owner: "Nora Singh",
    sections: [
      {
        title: "Council decision",
        fields: [
          {
            key: "gt_recommendation",
            label: "Council recommendation",
            type: "radio",
            wide: true,
            options: ["Approve", "Approve with conditions", "Defer", "Reject"],
            def: "Approve",
          },
          { key: "gt_approvedCurrency", label: "Currency", type: "select", options: CURRENCY_CODES, def: "EUR", hidden: true },
          {
            key: "gt_approvedAmount",
            label: "Approved budget",
            type: "text",
            wide: true,
            currencyKey: "gt_approvedCurrency",
            amountSuffix: "million",
            hint: "Council-approved year-one budget - adjust if approving a different amount.",
            def: "0.24",
          },
          {
            key: "gt_conditions",
            label: "Conditions on approval",
            type: "long",
            wide: true,
            hint: "Anything that must be true before deployment.",
            def: "Confirm rollback plan and complete DPIA sign-off before R4.",
          },
          {
            key: "gt_riskAccept",
            label: "Residual risk accepted by",
            type: "text",
            wide: true,
            def: "GTAC, on behalf of the Global AI Risk Committee",
          },
          {
            key: "gt_rationale",
            label: "Decision rationale",
            type: "long",
            wide: true,
            def: "Clear value, contained blast radius with human-in-the-loop; conditions address data-minimization and rollback gaps.",
          },
        ],
      },
    ],
  },
  {
    id: "planning",
    circleLabel: "Stage 8",
    title: "Project Planning & Mobilization",
    owner: "Rohan Desai",
    sections: [
      {
        title: "Delivery mobilization",
        fields: [
          {
            key: "pl_model",
            label: "Delivery model",
            type: "select",
            wide: true,
            required: true,
            options: ["Internal build", "External vendor", "Platform", "Hybrid"],
            def: "Platform",
          },
          {
            key: "pl_squad",
            label: "Delivery squad",
            type: "long",
            wide: true,
            required: true,
            hint: "Named roles for the delivery team.",
            def: "Delivery lead, platform engineer, QA reviewer, CX SME (0.5 FTE).",
          },
          { key: "pl_start", label: "Mobilization date", type: "text", wide: true, def: "Within 2 weeks of GTAC approval" },
          {
            key: "pl_milestones",
            label: "Roadmap milestones",
            type: "long",
            wide: true,
            required: true,
            def: "Build & integrate (3 wks) - internal test (2 wks) - pilot (2 wks) - staged rollout.",
          },
          {
            key: "pl_risks",
            label: "Mobilization risks",
            type: "long",
            wide: true,
            def: "Knowledge-base coverage gaps could slow the build; SME time is the main dependency.",
          },
        ],
      },
    ],
  },
  {
    id: "development",
    circleLabel: "Stage 9",
    title: "Analysis & Design",
    owner: "Tomas Ortiz",
    sections: [
      {
        title: "Solution blueprint",
        fields: [
          {
            key: "model",
            label: "AI model(s) used",
            type: "text",
            required: true,
            wide: true,
            hint: "Name, version, and provider.",
            def: "GPT-4.1 (Azure OpenAI)",
          },
          {
            key: "blueprint",
            label: "Solution blueprint",
            type: "file",
            required: true,
            wide: true,
            hint: "Design document - components, data flow, integrations, and human review.",
            placeholder: "PDF or DOC - solution design blueprint",
          },
          {
            key: "tools",
            label: "Tools & integrations",
            type: "multi",
            wide: true,
            options: ["Zendesk", "Salesforce", "Knowledge base", "Customer profile service", "SAP", "Email"],
            def: ["Zendesk", "Knowledge base", "Customer profile service"],
          },
        ],
      },
      {
        title: "Technical risk assessment",
        fields: [
          {
            key: "dataReadiness",
            label: "How ready is the data for build?",
            type: "radio",
            wide: true,
            required: true,
            hint: "Quality, completeness, and access rights for training and retrieval.",
            options: ["Ready - quality and access confirmed", "Gaps to close before build", "Not ready"],
            def: "Gaps to close before build",
          },
          {
            key: "piiIncluded",
            label: "Does retrieval or training include PII?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Masked only", "No"],
            def: "Masked only",
          },
          {
            key: "dataHosting",
            label: "Is data locally hosted or approved for use?",
            type: "radio",
            wide: true,
            required: true,
            hint: "Where training and retrieval data lives, and whether use is approved.",
            options: ["Yes - locally hosted", "Cloud-approved", "Not confirmed"],
            def: "Yes - locally hosted",
          },
          {
            key: "integrationReadiness",
            label: "Can we connect to everything this needs?",
            type: "radio",
            wide: true,
            required: true,
            hint: "Zendesk, knowledge base, customer profile APIs, and other feeds.",
            options: ["Yes - APIs confirmed", "Partly - dependencies still open", "No - blocked"],
            def: "Partly - dependencies still open",
          },
        ],
      },
    ],
  },
  {
    id: "predeployment",
    circleLabel: "Stage 10",
    title: "Build & Validate",
    owner: "Tomas Ortiz",
    sections: [
      {
        title: "Validation evidence",
        fields: [
          {
            key: "kpiMet",
            label: "Did testing meet the locked KPI targets?",
            type: "radio",
            wide: true,
            required: true,
            hint: "Accuracy, deflection, or other KPIs locked at definition.",
            options: ["Yes - with evidence", "Partially - gaps documented", "Not yet"],
            def: "Yes - with evidence",
          },
          {
            key: "validationReport",
            label: "Validation report",
            type: "file",
            wide: true,
            hint: "Test results, KPI performance, and evaluation summary.",
          },
          {
            key: "biasAssessed",
            label: "Were outputs tested for fairness across segments?",
            type: "radio",
            wide: true,
            required: true,
            hint: "Customer segments, languages, or other groups where disparity matters.",
            options: ["Yes - no concerns", "Yes - mitigations in place", "Not yet"],
            def: "Yes - no concerns",
          },
          {
            key: "securityCleared",
            label: "Is the security review complete?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Completed", "Pending"],
            def: "Completed",
          },
          {
            key: "privacyCleared",
            label: "Is the privacy assessment (DPIA/PIA) complete?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Completed", "Pending", "N/A"],
            def: "Completed",
          },
        ],
      },
      {
        title: "Go-live controls",
        fields: [
          {
            key: "rollout",
            label: "Rollout approach",
            type: "select",
            options: ["Pilot (specific group)", "Staged rollout", "Full production"],
            def: "Pilot (specific group)",
          },
          {
            key: "rollback",
            label: "Rollback plan",
            type: "long",
            required: true,
            wide: true,
            def: "Feature flag disables drafting instantly; 4-hour recovery target with named owner.",
          },
          {
            key: "humanOversight",
            label: "Is a human in the loop before outputs reach users?",
            type: "radio",
            wide: true,
            required: true,
            hint: "Every draft requires explicit agent approval before it is sent.",
            options: ["Yes", "No"],
            def: "Yes",
          },
          {
            key: "monitoringReady",
            label: "Is production monitoring configured?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Pending"],
            def: "Yes",
          },
          {
            key: "incidentReady",
            label: "Is incident response documented?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "No"],
            def: "Yes",
          },
          { key: "incidentRunbook", label: "Incident response runbook", type: "file", wide: true },
        ],
      },
      {
        title: "Sign-offs",
        fields: [
          {
            key: "legalSignoff",
            label: "Legal / Privacy (DPO) approval",
            type: "radio",
            wide: true,
            options: ["Approved", "Pending", "Not required"],
            def: "Approved",
          },
          { key: "securitySignoff", label: "Security approval", type: "radio", wide: true, options: ["Approved", "Pending"], def: "Approved" },
          { key: "ownerSignoff", label: "Business owner approval", type: "radio", wide: true, options: ["Approved", "Pending"], def: "Approved" },
        ],
      },
    ],
  },
  {
    id: "deployment",
    circleLabel: "Stage 11",
    title: "Deployment",
    owner: "Tomas Ortiz",
    sections: [
      {
        title: "Go-live",
        fields: [
          { key: "dep_window", label: "Go-live window", type: "text", wide: true, def: "Pilot cohort, week commencing - staged thereafter" },
          { key: "dep_cohort", label: "Initial production cohort", type: "text", wide: true, def: "12 support agents, EU region" },
          { key: "dep_monitoring", label: "Production monitoring live?", type: "radio", wide: true, options: ["Yes", "Pending"], def: "Yes" },
          { key: "dep_rollbackTested", label: "Rollback tested in production?", type: "radio", wide: true, options: ["Yes", "Pending"], def: "Yes" },
          { key: "dep_signoff", label: "Final release sign-off by", type: "text", wide: true, def: "AI CoE Delivery lead + Business owner" },
          {
            key: "dep_comms",
            label: "Go-live communications",
            type: "long",
            wide: true,
            def: "Pilot agents briefed; CX leadership and IT risk notified at switch-on.",
          },
        ],
      },
    ],
  },
  {
    id: "adoption",
    circleLabel: "Stage 12",
    title: "Adoption & Training",
    owner: "Dr. Anja Bauer & Rohan Desai",
    sections: [
      {
        title: "Enablement & readiness",
        fields: [
          {
            key: "trainingPlan",
            label: "Training plan",
            type: "long",
            required: true,
            wide: true,
            hint: "Who gets trained, how, and by when.",
            def: "Live walkthrough for all support agents plus a recorded session for new hires, run by CX ops leads over the rollout week.",
          },
          { key: "materials", label: "Enablement materials", type: "file", wide: true, hint: "Quick-start guide, FAQ, or training deck." },
          {
            key: "supportReadiness",
            label: "Is the support and escalation path ready?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Partially", "Not yet"],
            def: "Yes",
          },
          {
            key: "userReadiness",
            label: "Are users ready to rely on this?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Yes", "Mostly", "No"],
            def: "Yes",
          },
          {
            key: "changeMgmtSignoff",
            label: "Change management sign-off",
            type: "radio",
            wide: true,
            required: true,
            options: ["Signed off", "Pending", "Not required"],
            def: "Signed off",
          },
        ],
      },
    ],
  },
  {
    id: "production",
    circleLabel: "Stage 13",
    title: "Monitoring & Tracking",
    owner: "Dr. Anja Bauer & Rohan Desai",
    sections: [
      {
        title: "Performance & adoption",
        fields: [
          {
            key: "kpiActual",
            label: "KPI actual",
            type: "number",
            required: true,
            amountSuffix: "%",
            hint: "Primary locked KPI result this period.",
            def: "33",
          },
          {
            key: "kpiTarget",
            label: "KPI target",
            type: "number",
            required: true,
            amountSuffix: "%",
            hint: "Target locked at definition.",
            def: "35",
          },
          { key: "adoptionRate", label: "Adoption rate in review period", type: "number", required: true, amountSuffix: "%", def: "86" },
        ],
      },
      {
        title: "Post-deployment review",
        fields: [
          {
            key: "drift",
            label: "Any model or bias drift since go-live?",
            type: "radio",
            wide: true,
            required: true,
            options: ["No", "Minor - monitored", "Yes - action taken"],
            def: "No",
          },
          {
            key: "safetyIncidents",
            label: "Safety incidents or escalations this period?",
            type: "radio",
            wide: true,
            required: true,
            options: ["None", "Minor - resolved", "Serious - action taken"],
            def: "Minor - resolved",
          },
          { key: "scopeOk", label: "Still within approved scope?", type: "radio", wide: true, required: true, options: ["Yes", "No"], def: "Yes" },
          {
            key: "continue",
            label: "Should this continue in production?",
            type: "radio",
            wide: true,
            required: true,
            options: ["Continue", "Continue with changes", "Retire"],
            def: "Continue",
          },
          {
            key: "monitoringExport",
            label: "Monitoring & incident-log export",
            type: "file",
            wide: true,
            hint: "Optional evidence for GTAC review.",
          },
        ],
      },
    ],
  },
  {
    id: "improvement",
    circleLabel: "Stage 14",
    title: "Continuous Improvement",
    owner: "Mira Kapoor & Rohan Desai",
    sections: [
      {
        title: "Feedback & lessons learned",
        fields: [
          {
            key: "userFeedback",
            label: "User feedback summary",
            type: "long",
            required: true,
            wide: true,
            def: "Agents like the speed but want more citation detail; a few flagged repetitive phrasing on edge-case tickets.",
          },
          {
            key: "lessonsLearned",
            label: "Lessons learned",
            type: "long",
            wide: true,
            def: "Knowledge-base coverage gaps had more impact on draft quality than expected - worth closing before the next expansion.",
          },
          { key: "issuesLogged", label: "Issues logged this period", type: "text", def: "4 minor, 0 major" },
        ],
      },
      {
        title: "Improvement backlog",
        fields: [
          {
            key: "backlogItems",
            label: "Improvement backlog",
            type: "long",
            wide: true,
            def: "Add multi-language citation support; expand knowledge-base coverage for billing tickets; tune tone for escalated cases.",
          },
          {
            key: "nextIteration",
            label: "Next iteration type",
            type: "select",
            wide: true,
            options: ["Minor enhancement", "Major upgrade", "Model retrain", "None planned"],
            def: "Minor enhancement",
          },
          {
            key: "retrainSchedule",
            label: "Retraining / refresh schedule",
            type: "text",
            wide: true,
            def: "Knowledge base refresh monthly; model refresh evaluated quarterly.",
          },
        ],
      },
      {
        title: "Roadmap decision",
        fields: [
          {
            key: "roadmapDecision",
            label: "Roadmap decision",
            type: "radio",
            wide: true,
            options: ["Continue as-is", "Iterate", "Expand scope", "Sunset"],
            def: "Iterate",
          },
          {
            key: "roadmapNotes",
            label: "Notes",
            type: "long",
            wide: true,
            def: "Proceed with the citation and knowledge-base improvements before considering scope expansion to chat channels.",
          },
        ],
      },
    ],
  },
];

export const INITIAL_WORKFLOW_VALUES = buildInitialWorkflowValues();

function buildInitialWorkflowValues(): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = { ...UC_142_INTAKE_DATA };

  WORKFLOW_STAGES.forEach((stage) => {
    stage.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (values[field.key] !== undefined) return;
        values[field.key] = field.def ?? (field.type === "multi" || field.type === "file" ? [] : "");
      });
    });
  });

  return values;
}
